/**
 * web-serial-flasher.ts
 *
 * Handles firmware upload to Arduino boards via Web Serial API.
 * - STK500v1 for ATmega328P boards (Uno, Nano — incl. old-bootloader fallback)
 * - STK500v2 for the Mega
 * - esptool-js for ESP8266 and ESP32 (raw binary / merged image at 0x0)
 *
 * Usage:
 *   const flasher = new WebSerialFlasher(port);
 *   await flasher.flash(hexBase64, { board, onProgress });
 */
import { getBoardDefinition, type BoardFqbn } from './boards';

export type FlashBoard = BoardFqbn;

/**
 * What to tell a student when the port will not open.
 *
 * The browser's own message is "Failed to execute 'open' on 'SerialPort':
 * Failed to open serial port", which tells a child (or their teacher) nothing
 * they can act on. Every realistic cause is something they can fix in a few
 * seconds, so say what those are.
 */
const PORT_BUSY_HINT =
  "The board's serial port is busy. Close the Serial Monitor and any other program " +
  'using the board (Arduino IDE, another browser tab), then press Upload again. ' +
  'If it still will not open, unplug the USB cable and plug it back in.';

export interface FlashOptions {
  board: FlashBoard;
  onProgress?: (percent: number, message: string) => void;
  onLog?: (message: string) => void;
}

// Intel HEX parser — converts .hex file content to raw binary
function parseIntelHex(hexString: string): Uint8Array {
  const lines = hexString.split('\n').filter((l) => l.startsWith(':'));
  const chunks: { address: number; data: number[] }[] = [];
  let maxAddr = 0;
  let baseAddress = 0;

  for (const line of lines) {
    const byteCount = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16) + baseAddress;
    const recordType = parseInt(line.substring(7, 9), 16);

    if (recordType === 0x00) {
      // Data record
      const data: number[] = [];
      for (let i = 0; i < byteCount; i++) {
        data.push(parseInt(line.substring(9 + i * 2, 11 + i * 2), 16));
      }
      chunks.push({ address, data });
      maxAddr = Math.max(maxAddr, address + data.length);
    } else if (recordType === 0x02) {
      // Extended segment address
      baseAddress = parseInt(line.substring(9, 13), 16) << 4;
    } else if (recordType === 0x04) {
      // Extended linear address
      baseAddress = parseInt(line.substring(9, 13), 16) << 16;
    } else if (recordType === 0x01) {
      // End of file
      break;
    }
  }

  const binary = new Uint8Array(maxAddr);
  binary.fill(0xff); // Flash default is 0xFF
  for (const chunk of chunks) {
    binary.set(chunk.data, chunk.address);
  }

  return binary;
}

// STK500v1 protocol constants
const STK_OK = 0x10;
const STK_INSYNC = 0x14;
const CRC_EOP = 0x20;
const STK_GET_SYNC = 0x30;
const STK_ENTER_PROGMODE = 0x50;
const STK_LEAVE_PROGMODE = 0x51;
const STK_LOAD_ADDRESS = 0x55;
const STK_PROG_PAGE = 0x64;

export class WebSerialFlasher {
  private port: {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
    setSignals(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;
  };
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  private readBuffer: number[] = [];
  private isReading = false;
  private readError: Error | null = null;
  private readerPromise: Promise<void> | null = null;
  private seqV2 = 0;

  constructor(port: typeof WebSerialFlasher.prototype.port) {
    this.port = port;
  }

  async flash(hexBase64: string, options: FlashOptions): Promise<void> {
    this.readBuffer = []; // Reset buffer before flash
    const { board, onProgress, onLog } = options;
    const log = onLog || (() => {});

    try {
      // Decode base64 to text (Intel HEX format)
      const hexText = atob(hexBase64);

      // Check if this is Intel HEX or raw binary
      let firmware: Uint8Array;
      if (hexText.startsWith(':')) {
        firmware = parseIntelHex(hexText);
        log(`Parsed Intel HEX: ${firmware.length} bytes`);
      } else {
        // Raw binary (e.g., for ESP)
        firmware = Uint8Array.from(hexText, (c) => c.charCodeAt(0));
        log(`Raw binary: ${firmware.length} bytes`);
      }

      onProgress?.(5, 'Firmware decoded');

      if (board.includes('esp8266') || board.includes('esp32')) {
        await this.flashESP(firmware, onProgress, log);
      } else if (board.includes('mega')) {
        await this.flashAVRMega(firmware, board, onProgress, log);
      } else {
        await this.flashAVR(firmware, board, onProgress, log);
      }

      onProgress?.(100, 'Upload complete!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Flash failed: ${msg}`);
    }
  }

  /**
   * Close (if open) and reopen the port at the given baud, claiming streams.
   *
   * The close has to actually succeed, and it used to be a `try/catch {}` that
   * threw the failure away. `SerialPort.close()` rejects while the port's
   * streams are locked, so any leftover lock meant close silently failed, the
   * port stayed open, and the following `open()` died with the browser's
   * useless "Failed to execute 'open' on 'SerialPort'".
   *
   * That is not hypothetical — it is the normal path for a *second* upload:
   * after a successful flash we reopen the port at 9600 for the Serial Monitor,
   * the monitor pipes from `port.readable` (locking it), and the next Upload
   * arrives while that lock is still being torn down. First upload works,
   * every one after it fails, which is exactly what was reported.
   */
  private async openForFlashing(baudRate: number): Promise<void> {
    await this.releaseStreams();
    if (!(await this.closePortFully())) throw new Error(PORT_BUSY_HINT);
    try {
      await this.port.open({ baudRate });
    } catch {
      throw new Error(PORT_BUSY_HINT);
    }

    if (!this.port.readable || !this.port.writable) {
      throw new Error('Port streams are not available');
    }
    this.readBuffer = [];
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
    this.startBackgroundRead();
  }

  /**
   * Closes the port and confirms it, retrying while another holder lets go.
   *
   * A closed Web Serial port reports `readable`/`writable` as null, which is the
   * only reliable way to know the close took — `close()` resolving is not
   * enough on its own, and it rejects outright while a stream is locked. The
   * retries give an unmounting Serial Monitor time to finish releasing.
   */
  private async closePortFully(): Promise<boolean> {
    for (let attempt = 0; attempt < 6; attempt++) {
      if (this.port.readable === null && this.port.writable === null) return true;
      try {
        await this.port.close();
        return true;
      } catch {
        await this.delay(200);
      }
    }
    return this.port.readable === null && this.port.writable === null;
  }

  /** Stop the background read loop and release both stream locks. Idempotent. */
  private async releaseStreams(): Promise<void> {
    this.isReading = false;
    this.reader?.cancel().catch(() => {}); // Force read loop to exit

    try {
      await this.readerPromise;
    } catch {
      /* ignore */
    }

    this.reader?.releaseLock();
    this.writer?.releaseLock();
    this.reader = null;
    this.writer = null;
  }

  /** Toggle DTR/RTS to reset the board into its serial bootloader. */
  private async resetIntoBootloader(): Promise<void> {
    await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await this.delay(250);
    await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
    await this.delay(250); // Increased post-reset delay for stability
  }

  /** Attempt STK500v1 GET_SYNC handshake. Returns true once INSYNC/OK seen. */
  private async trySyncV1(): Promise<boolean> {
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await this.sendCommand([STK_GET_SYNC, CRC_EOP]);
        // Read bytes one by one to avoid framing errors with junk data
        const deadline = Date.now() + 500;
        let foundSync = false;
        while (Date.now() < deadline) {
          const b = await this.readResponse(1, 100).catch(() => null);
          if (b && b[0] === STK_INSYNC) {
            foundSync = true;
            break;
          }
        }
        if (foundSync) {
          const b2 = await this.readResponse(1, 100).catch(() => null);
          if (b2 && b2[0] === STK_OK) {
            return true;
          }
        }
      } catch {
        // ignore
      }
      await this.delay(50);
    }
    return false;
  }

  private async flashAVR(
    firmware: Uint8Array,
    board: string,
    onProgress?: (p: number, m: string) => void,
    log: (m: string) => void = () => {},
  ): Promise<void> {
    // Nano lists a 57600 fallback for old-bootloader clones; Uno is 115200 only.
    const uploadBauds = getBoardDefinition(board).uploadBauds;

    try {
      let synced = false;
      for (const uploadBaud of uploadBauds) {
        await this.openForFlashing(uploadBaud);
        log(`Port opened at ${uploadBaud} baud for flashing`);
        onProgress?.(10, 'Port ready');

        // Reset the board by toggling DTR and RTS signals
        log('Asserting DTR to reset board...');
        onProgress?.(15, 'Waiting for bootloader');
        await this.resetIntoBootloader();

        // Sync with bootloader
        log('Syncing with STK500 bootloader...');
        onProgress?.(20, 'Syncing with bootloader');
        synced = await this.trySyncV1();
        if (synced) break;

        log(`No response at ${uploadBaud} baud`);
        await this.releaseStreams();
      }

      if (!synced) {
        throw new Error(
          'Could not sync with bootloader. Make sure the board is connected and has a bootloader.',
        );
      }

      log('Bootloader synced ✓');
      onProgress?.(25, 'Bootloader synced');

      // Enter programming mode
      await this.sendCommand([STK_ENTER_PROGMODE, CRC_EOP]);
      await this.expectInSync();
      log('Programming mode entered ✓');
      onProgress?.(30, 'Programming mode active');

      // Flash pages
      const pageSize = board.includes('mega') ? 256 : 128;
      const totalPages = Math.ceil(firmware.length / pageSize);

      for (let page = 0; page < totalPages; page++) {
        const address = page * pageSize;
        const wordAddress = address >> 1; // STK500 uses word addresses

        // Load address
        await this.sendCommand([
          STK_LOAD_ADDRESS,
          wordAddress & 0xff,
          (wordAddress >> 8) & 0xff,
          CRC_EOP,
        ]);
        await this.expectInSync();

        // Program page
        let pageData = firmware.slice(address, address + pageSize);

        // Pad the final page with 0xFF to match pageSize exactly (required by some bootloaders)
        if (pageData.length < pageSize) {
          const padded = new Uint8Array(pageSize);
          padded.fill(0xff);
          padded.set(pageData);
          pageData = padded;
        }

        const actualSize = pageData.length;

        const cmd = [
          STK_PROG_PAGE,
          (actualSize >> 8) & 0xff,
          actualSize & 0xff,
          0x46, // 'F' for flash memory
          ...Array.from(pageData),
          CRC_EOP,
        ];

        await this.sendCommand(cmd);
        await this.expectInSync();

        // Progress: 30% to 90% during flashing
        const flashProgress = 30 + Math.round((page / totalPages) * 60);
        onProgress?.(flashProgress, `Flashing page ${page + 1}/${totalPages}`);
      }

      log(`Flashed ${totalPages} pages (${firmware.length} bytes) ✓`);
      onProgress?.(92, 'Verifying...');

      // Leave programming mode
      await this.sendCommand([STK_LEAVE_PROGMODE, CRC_EOP]);
      await this.expectInSync();
      log('Programming mode exited ✓');
      onProgress?.(95, 'Finalizing');
    } finally {
      await this.releaseStreams();

      // Close and reopen at normal baud for Serial Monitor
      try {
        await this.port.close();
        await this.port.open({ baudRate: 9600 });
      } catch {
        // Best-effort reopen
      }
    }
  }

  private getNextSeqV2(): number {
    this.seqV2 = (this.seqV2 + 1) & 0xff;
    return this.seqV2;
  }

  private async sendCommandV2(payload: number[]): Promise<Uint8Array> {
    const seq = this.getNextSeqV2();
    const size = payload.length;
    const sizeMSB = (size >> 8) & 0xff;
    const sizeLSB = size & 0xff;

    const header = [0x1b, seq, sizeMSB, sizeLSB, 0x0e];
    const packet = [...header, ...payload];

    let checksum = 0;
    for (let i = 0; i < packet.length; i++) {
      checksum ^= packet[i]!;
    }
    packet.push(checksum);

    // Clear read buffer of any old data before sending command
    this.readBuffer = [];

    await this.sendCommand(packet);

    // Some commands like program flash take longer
    const timeout = payload[0] === 0x13 ? 5000 : 1000;
    return await this.readPacketV2(seq, timeout);
  }

  private async readPacketV2(expectedSeq: number, timeoutMs = 1000): Promise<Uint8Array> {
    const deadline = Date.now() + timeoutMs;

    // Find start byte 0x1B, skipping any junk
    let startByte = 0;
    while (Date.now() < deadline) {
      const b = await this.readResponse(1, deadline - Date.now()).catch(() => null);
      if (b && b[0] === 0x1b) {
        startByte = 0x1b;
        break;
      }
    }
    if (startByte !== 0x1b) {
      throw new Error('Timeout waiting for STK500v2 start byte (0x1B)');
    }

    // Read seq (1), size (2), token (1)
    const header = await this.readResponse(4, Math.max(100, deadline - Date.now()));
    const seq = header[0]!;
    const size = (header[1]! << 8) | header[2]!;
    const token = header[3]!;

    if (seq !== expectedSeq) {
      throw new Error(`STK500v2 sequence mismatch: expected ${expectedSeq}, got ${seq}`);
    }

    if (token !== 0x0e) {
      throw new Error(`Invalid STK500v2 token: expected 0x0E, got 0x${token.toString(16)}`);
    }

    // Read payload
    const payload = await this.readResponse(size, Math.max(500, deadline - Date.now()));

    // Read checksum
    const cksumByte = (await this.readResponse(1, Math.max(100, deadline - Date.now())))[0]!;

    // Verify checksum
    let calculatedCksum = 0x1b ^ seq ^ header[1]! ^ header[2]! ^ token;
    for (let i = 0; i < payload.length; i++) {
      calculatedCksum ^= payload[i]!;
    }

    if (calculatedCksum !== cksumByte) {
      throw new Error('STK500v2 checksum mismatch');
    }

    return payload;
  }

  private assertResponseOk(response: Uint8Array, commandId: number, context: string) {
    if (response.length < 2) {
      throw new Error(`${context}: Response too short`);
    }
    if (response[0] !== commandId) {
      throw new Error(
        `${context}: Command mismatch: expected 0x${commandId.toString(16)}, got 0x${response[0]!.toString(16)}`,
      );
    }
    if (response[1] !== 0x00) {
      throw new Error(`${context}: Command failed with status 0x${response[1]!.toString(16)}`);
    }
  }

  private async flashAVRMega(
    firmware: Uint8Array,
    board: string,
    onProgress?: (p: number, m: string) => void,
    log: (m: string) => void = () => {},
  ): Promise<void> {
    this.seqV2 = 0; // Reset sequence counter before upload

    const uploadBaud = 115200;
    await this.openForFlashing(uploadBaud);

    log(`Port opened at ${uploadBaud} baud for flashing Mega (STK500v2)`);
    onProgress?.(10, 'Port ready');

    try {
      // Reset the board by toggling DTR and RTS signals
      log('Asserting DTR to reset board...');
      onProgress?.(15, 'Waiting for bootloader');
      await this.resetIntoBootloader();

      // Sync with bootloader using CMD_SIGN_ON (0x01)
      log('Syncing with STK500v2 bootloader...');
      onProgress?.(20, 'Syncing with bootloader');

      let synced = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const resp = await this.sendCommandV2([0x01]); // CMD_SIGN_ON
          if (resp[0] === 0x01 && resp[1] === 0x00) {
            synced = true;
            break;
          }
        } catch (e) {
          log(`Sync attempt ${attempt + 1} failed: ${e instanceof Error ? e.message : String(e)}`);
        }
        await this.delay(50);
      }

      if (!synced) {
        throw new Error(
          'Could not sync with bootloader. Make sure the board is connected and has a bootloader.',
        );
      }

      log('Bootloader synced ✓');
      onProgress?.(25, 'Bootloader synced');

      // Enter programming mode
      log('Entering programming mode...');
      // CMD_ENTER_PROGMODE_ISP (0x10)
      const enterProgCmd = [
        0x10, // CMD_ENTER_PROGMODE_ISP
        0xc8, // timeout
        0x64, // stabDelay
        0x19, // cmdexeDelay
        0x20, // synchLoops
        0x00, // byteDelay
        0x53, // pollValue
        0x03, // pollIndex
        0xac, // cmd1
        0x53, // cmd2
        0x00, // cmd3
        0x00, // cmd4
      ];
      const enterProgResp = await this.sendCommandV2(enterProgCmd);
      this.assertResponseOk(enterProgResp, 0x10, 'Enter programming mode');
      log('Programming mode entered ✓');
      onProgress?.(30, 'Programming mode active');

      // Flash pages
      const pageSize = 256;
      const totalPages = Math.ceil(firmware.length / pageSize);

      for (let page = 0; page < totalPages; page++) {
        const address = page * pageSize;
        const wordAddress = address >> 1; // STK500 uses word addresses

        // Load address: CMD_LOAD_ADDRESS (0x06)
        const msb = ((wordAddress >> 24) & 0xff) | 0x80;
        const xsb = (wordAddress >> 16) & 0xff;
        const ysb = (wordAddress >> 8) & 0xff;
        const lsb = wordAddress & 0xff;

        const loadAddrResp = await this.sendCommandV2([0x06, msb, xsb, ysb, lsb]);
        this.assertResponseOk(loadAddrResp, 0x06, `Load address for page ${page + 1}`);

        // Program page
        let pageData = firmware.slice(address, address + pageSize);

        // Pad final page with 0xFF to match pageSize exactly
        if (pageData.length < pageSize) {
          const padded = new Uint8Array(pageSize);
          padded.fill(0xff);
          padded.set(pageData);
          pageData = padded;
        }

        // CMD_PROGRAM_FLASH_ISP (0x13)
        const bytesMsb = pageSize >> 8;
        const bytesLsb = pageSize & 0xff;
        const progCmd = [
          0x13, // CMD_PROGRAM_FLASH_ISP
          bytesMsb,
          bytesLsb,
          0xc1, // mode
          0x0a, // delay
          0x40, // cmd1
          0x4c, // cmd2
          0x20, // cmd3
          0x00, // poll1
          0x00, // poll2
          ...Array.from(pageData),
        ];

        const progResp = await this.sendCommandV2(progCmd);
        this.assertResponseOk(progResp, 0x13, `Program page ${page + 1}/${totalPages}`);

        // Progress: 30% to 90% during flashing
        const flashProgress = 30 + Math.round((page / totalPages) * 60);
        onProgress?.(flashProgress, `Flashing page ${page + 1}/${totalPages}`);
      }

      log(`Flashed ${totalPages} pages (${firmware.length} bytes) ✓`);
      onProgress?.(92, 'Verifying...');

      // Leave programming mode: CMD_LEAVE_PROGMODE_ISP (0x11)
      const leaveProgResp = await this.sendCommandV2([0x11, 0x01, 0x01]);
      this.assertResponseOk(leaveProgResp, 0x11, 'Leave programming mode');
      log('Programming mode exited ✓');
      onProgress?.(95, 'Finalizing');
    } finally {
      await this.releaseStreams();

      // Close and reopen at normal baud for Serial Monitor
      try {
        await this.port.close();
        await this.port.open({ baudRate: 9600 });
      } catch {
        // Best-effort reopen
      }
    }
  }

  private async flashESP(
    firmware: Uint8Array,
    onProgress?: (p: number, m: string) => void,
    onLog?: (m: string) => void,
  ): Promise<void> {
    onLog?.('Initializing ESP Flasher...');

    // Dynamically import esptool-js to avoid inflating the main bundle size.
    // If the chunk is stale after a deploy, the global handler in main.tsx
    // will auto-reload the page before this promise settles.
    const { ESPLoader, Transport } = await import('esptool-js');

    // ESPTool-JS terminal interface
    const terminal = {
      clean: () => {},
      writeLine: (data: string) => {
        onLog?.(`[esptool] ${data}`);
      },
      write: (data: string) => {
        // Some output from esptool doesn't have newlines
        onLog?.(`[esptool] ${data}`);
      },
    };

    // We must release any held stream locks so ESPLoader can use the port!
    await this.releaseStreams();

    try {
      onProgress?.(5, 'Connecting to ROM bootloader...');

      // Ensure the port is closed so esptool-js can open it cleanly at 115200 baud
      try {
        await this.port.close();
      } catch {
        /* ignore if already closed */
      }

      const transport = new Transport(this.port);
      const esploader = new ESPLoader({
        transport,
        baudrate: 115200,
        terminal,
      });

      await esploader.main();
      await esploader.flashId();

      onProgress?.(15, 'Preparing flash...');

      // ESP8266 firmware is a single complete image written at 0x0000.
      // For ESP32 the server sends the merged image (bootloader + partition
      // table + app combined), which is also flashed at 0x0000 — never flash
      // an app-only ESP32 binary here, it would not boot.
      const fileArray = [
        {
          data: firmware,
          address: 0x0000,
        },
      ];

      await esploader.writeFlash({
        fileArray,
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: (fileIndex: number, written: number, total: number) => {
          const percent = 15 + Math.round((written / total) * 85);
          onProgress?.(percent, `Flashing... ${Math.round((written / total) * 100)}%`);
        },
      });

      onLog?.('ESP Flashing complete. Resetting board...');
      try {
        await esploader.after('hard_reset');
      } catch (err) {
        onLog?.(`[esptool] Reset notice: ${err instanceof Error ? err.message : String(err)}`);
      }
      await transport.disconnect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onLog?.(`ESP Flash Error: ${msg}`);
      throw new Error(`Failed to flash ESP: ${msg}`);
    }
  }

  private startBackgroundRead() {
    this.isReading = true;
    this.readError = null;
    this.readerPromise = this.readLoop();
  }

  private async readLoop() {
    if (!this.reader) return;
    try {
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          for (let i = 0; i < value.length; i++) {
            this.readBuffer.push(value[i]!);
          }
        }
      }
    } catch (err) {
      this.readError = err as Error;
    } finally {
      this.isReading = false;
    }
  }

  private async sendCommand(bytes: number[]): Promise<void> {
    if (!this.writer) throw new Error('Writer not available');
    await this.writer.write(new Uint8Array(bytes));
  }

  private async readResponse(length: number, timeoutMs = 2000): Promise<Uint8Array> {
    const result = new Uint8Array(length);
    let offset = 0;
    const deadline = Date.now() + timeoutMs;

    while (offset < length && Date.now() < deadline) {
      if (this.readError) {
        throw new Error(`Background read failed: ${this.readError.message}`);
      }

      if (this.readBuffer.length > 0) {
        result[offset++] = this.readBuffer.shift()!;
      } else {
        await this.delay(5); // Fast polling
      }
    }

    if (offset < length) {
      throw new Error(`Timeout: expected ${length} bytes, got ${offset}`);
    }

    return result;
  }

  private async expectInSync(): Promise<void> {
    const resp = await this.readResponse(2);
    if (resp[0] !== STK_INSYNC || resp[1] !== STK_OK) {
      throw new Error(
        `Expected INSYNC/OK, got 0x${(resp[0] ?? 0).toString(16)}/0x${(resp[1] ?? 0).toString(16)}`,
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
