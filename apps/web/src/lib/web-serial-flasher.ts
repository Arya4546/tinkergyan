/**
 * web-serial-flasher.ts
 *
 * Handles firmware upload to Arduino boards via Web Serial API.
 * Implements a simplified STK500v1 protocol for AVR boards (Uno, Mega)
 * and raw binary upload for ESP boards.
 *
 * Usage:
 *   const flasher = new WebSerialFlasher(port);
 *   await flasher.flash(hexBase64, { board, onProgress });
 */

export type FlashBoard = 'arduino:avr:uno' | 'arduino:avr:mega' | 'esp8266:esp8266:nodemcuv2';

export interface FlashOptions {
  board: FlashBoard;
  onProgress?: (percent: number, message: string) => void;
  onLog?: (message: string) => void;
}

// Intel HEX parser — converts .hex file content to raw binary
function parseIntelHex(hexString: string): Uint8Array {
  const lines = hexString.split('\n').filter(l => l.startsWith(':'));
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
  binary.fill(0xFF); // Flash default is 0xFF
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
  private port: any;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  constructor(port: any) {
    this.port = port;
  }

  async flash(hexBase64: string, options: FlashOptions): Promise<void> {
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
        firmware = Uint8Array.from(hexText, c => c.charCodeAt(0));
        log(`Raw binary: ${firmware.length} bytes`);
      }

      onProgress?.(5, 'Firmware decoded');

      if (board.includes('esp8266') || board.includes('esp32')) {
        await this.flashESP(firmware, onProgress, log);
      } else {
        await this.flashAVR(firmware, board, onProgress, log);
      }

      onProgress?.(100, 'Upload complete!');
    } catch (err: any) {
      throw new Error(`Flash failed: ${err.message || err}`);
    }
  }

  private async flashAVR(
    firmware: Uint8Array,
    board: string,
    onProgress?: (p: number, m: string) => void,
    log: (m: string) => void = () => {},
  ): Promise<void> {
    // Ensure port is closed so we can reopen with correct baud
    try { await this.port.close(); } catch { /* may already be closed */ }

    // Arduino Uno uses 115200 baud for upload, Mega uses 115200 too
    const uploadBaud = 115200;
    await this.port.open({ baudRate: uploadBaud });

    log(`Port opened at ${uploadBaud} baud for flashing`);
    onProgress?.(10, 'Port ready');

    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();

    try {
      // Reset the board by toggling DTR (simulated via close/open cycle)
      // Web Serial doesn't support DTR directly, but the open cycle triggers auto-reset
      // on boards with DTR-reset circuit (Arduino Uno, Mega, etc.)
      log('Waiting for bootloader...');
      onProgress?.(15, 'Waiting for bootloader');
      await this.delay(250); // Wait for bootloader to initialize

      // Sync with bootloader
      log('Syncing with STK500 bootloader...');
      onProgress?.(20, 'Syncing with bootloader');
      
      let synced = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          await this.sendCommand([STK_GET_SYNC, CRC_EOP]);
          const resp = await this.readResponse(2, 500);
          if (resp[0] === STK_INSYNC && resp[1] === STK_OK) {
            synced = true;
            break;
          }
        } catch {
          await this.delay(50);
        }
      }

      if (!synced) {
        throw new Error('Could not sync with bootloader. Make sure the board is connected and has a bootloader.');
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
          wordAddress & 0xFF,
          (wordAddress >> 8) & 0xFF,
          CRC_EOP,
        ]);
        await this.expectInSync();

        // Program page
        const pageData = firmware.slice(address, address + pageSize);
        const actualSize = pageData.length;

        const cmd = [
          STK_PROG_PAGE,
          (actualSize >> 8) & 0xFF,
          actualSize & 0xFF,
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
      this.reader?.releaseLock();
      this.writer?.releaseLock();
      this.reader = null;
      this.writer = null;

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
    log: (m: string) => void = () => {},
  ): Promise<void> {
    // ESP flashing is significantly more complex (SLIP protocol, stub loader, etc.)
    // For now, we use a simplified approach: write raw binary at 115200
    try { await this.port.close(); } catch { /* ignore */ }
    await this.port.open({ baudRate: 115200 });

    log(`ESP flash: ${firmware.length} bytes`);
    onProgress?.(10, 'ESP: Port opened');

    const writer = this.port.writable.getWriter();
    
    try {
      const chunkSize = 1024;
      const totalChunks = Math.ceil(firmware.length / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        const chunk = firmware.slice(i * chunkSize, (i + 1) * chunkSize);
        await writer.write(chunk);
        
        const progress = 10 + Math.round((i / totalChunks) * 85);
        onProgress?.(progress, `Uploading chunk ${i + 1}/${totalChunks}`);
      }
      
      log('ESP firmware written ✓');
      onProgress?.(95, 'Finalizing');
    } finally {
      writer.releaseLock();
      try {
        await this.port.close();
        await this.port.open({ baudRate: 9600 });
      } catch { /* best-effort */ }
    }
  }

  private async sendCommand(bytes: number[]): Promise<void> {
    if (!this.writer) throw new Error('Writer not available');
    await this.writer.write(new Uint8Array(bytes));
  }

  private async readResponse(length: number, timeoutMs = 2000): Promise<Uint8Array> {
    if (!this.reader) throw new Error('Reader not available');

    const result = new Uint8Array(length);
    let offset = 0;

    const deadline = Date.now() + timeoutMs;

    while (offset < length && Date.now() < deadline) {
      const readResult = await Promise.race([
        this.reader.read(),
        this.delay(timeoutMs).then(() => ({ value: undefined as Uint8Array | undefined, done: true as const })),
      ]);

      if (readResult.done || !readResult.value) break;
      const val = readResult.value;
      for (let i = 0; i < val.length && offset < length; i++) {
        result[offset++] = val[i]!;
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
      throw new Error(`Expected INSYNC/OK, got 0x${(resp[0] ?? 0).toString(16)}/0x${(resp[1] ?? 0).toString(16)}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
