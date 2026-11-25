/**
 * mp-board.ts — talk to a board running MicroPython over its USB serial port.
 *
 * This speaks MicroPython's "raw REPL" protocol, the same one the official
 * `mpremote` tool and the Thonny editor use (see MicroPython's
 * shared/runtime/pyexec.c and tools/mpremote/transport_serial.py, v1.29):
 *
 *   Ctrl-C            stop whatever is running
 *   Ctrl-A            enter raw REPL   → "raw REPL; CTRL-B to exit\r\n>"
 *   Ctrl-D (empty)    soft reset       → "OK\r\n" … "soft reboot\r\n" … banner
 *   Ctrl-E 'A' Ctrl-A raw-paste mode   → "R\x01" + window size (u16 LE), then
 *                                        the board grants more room with \x01
 *   <code> Ctrl-D     run it           → program output, \x04, error text, \x04, ">"
 *
 * While a program runs, anything sent to the board is its keyboard input
 * (input() reads it), except Ctrl-C, which raises KeyboardInterrupt.
 *
 * One operation runs at a time (`lock`). A running program holds the lock
 * until it ends, so a second Run can never interleave with the first.
 */
import { onHardwareDisconnect, type HardwarePort } from '../../usb-serial';
import { parseTraceback } from '../traceback';
import type { PythonErrorInfo } from '../protocol';
import { targetFromMachine, type PythonBoardTarget } from '../targets';
import { OutputFilter, TracebackHolder } from './output-filter';

const CTRL_A = 0x01;
const CTRL_B = 0x02;
const CTRL_C = 0x03;
const CTRL_D = 0x04;
const CTRL_E = 0x05;

const enc = new TextEncoder();
const RAW_BANNER = enc.encode('raw REPL; CTRL-B to exit\r\n>');
const SOFT_REBOOT = enc.encode('soft reboot\r\n');

export class NoMicroPythonError extends Error {
  constructor() {
    super(
      "Your board didn't answer like a MicroPython board. If it has never had MicroPython (or it was last used with Arduino/C++), install MicroPython on it.",
    );
    this.name = 'NoMicroPythonError';
  }
}

export class BoardDisconnectedError extends Error {
  constructor() {
    super('The board was unplugged or stopped answering. Plug it in and press Connect.');
    this.name = 'BoardDisconnectedError';
  }
}

export interface BoardInfo {
  /** MicroPython version, e.g. "1.29.0". */
  version: string;
  /** e.g. "Generic ESP32S3 module with ESP32S3". */
  machine: string;
  /** The Python target this chip is, or null for a chip we don't support. */
  target: PythonBoardTarget | null;
}

export type BoardRunResult =
  | { status: 'ok' }
  | { status: 'stopped' }
  | { status: 'error'; error: PythonErrorInfo }
  | { status: 'disconnected' };

export interface BoardRunHandlers {
  onOutput: (text: string) => void;
  onDone: (result: BoardRunResult) => void;
}

export interface BoardRun {
  /** Send what the student typed (input() on the board reads it). */
  send: (text: string) => void;
  /** Send one line to the program's stdin without echoing anything locally. */
  sendLine: (line: string) => void;
  stop: () => void;
}

/** Control characters: typed into a program they'd stop or confuse it. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

// ── Byte helpers ───────────────────────────────────────────────────────────
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function indexOf(hay: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = Math.max(0, from); i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** A Python bytes literal for `data`: b'...' with everything unsafe escaped. */
export function pyBytes(data: Uint8Array): string {
  let s = "b'";
  for (const b of data) {
    if (b >= 0x20 && b < 0x7f && b !== 0x27 && b !== 0x5c) s += String.fromCharCode(b);
    else s += '\\x' + b.toString(16).padStart(2, '0');
  }
  return s + "'";
}

// ── Receive buffer ─────────────────────────────────────────────────────────
class Rx {
  private buf: Uint8Array = new Uint8Array(0);
  private wake: (() => void) | null = null;
  closed = false;

  push(data: Uint8Array) {
    this.buf = concat(this.buf, data);
    this.notify();
  }
  close() {
    this.closed = true;
    this.notify();
  }
  /** Wake anyone waiting (used to cancel a wait). */
  notify() {
    const w = this.wake;
    this.wake = null;
    w?.();
  }
  get length() {
    return this.buf.length;
  }
  take(): Uint8Array {
    const b = this.buf;
    this.buf = new Uint8Array(0);
    return b;
  }
  unshift(data: Uint8Array) {
    if (data.length) this.buf = concat(data, this.buf);
  }
  /** Resolve when data arrives, the link closes, notify() is called, or `ms` passes. */
  wait(ms: number): Promise<void> {
    if (this.buf.length || this.closed) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.wake === done) this.wake = null;
        resolve();
      }, ms);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      this.wake = done;
    });
  }
}

/** Turn board output (CRLF line endings, split UTF-8) into text for the console. */
class TextStream {
  private decoder = new TextDecoder();
  private pendingCR = false;
  push(bytes: Uint8Array): string {
    let text = this.decoder.decode(bytes, { stream: true });
    if (this.pendingCR) text = '\r' + text;
    this.pendingCR = text.endsWith('\r');
    if (this.pendingCR) text = text.slice(0, -1);
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }
  end(): string {
    const t = this.decoder.decode() + (this.pendingCR ? '\n' : '');
    this.pendingCR = false;
    return t;
  }
}

// ── The board ──────────────────────────────────────────────────────────────
export class MicroPythonBoard {
  readonly port: HardwarePort;
  info: BoardInfo = { version: '', machine: '', target: null };

  private rx = new Rx();
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private readLoopDone: Promise<void> = Promise.resolve();
  private writeChain: Promise<void> = Promise.resolve();
  private lockChain: Promise<void> = Promise.resolve();
  private closeListeners = new Set<() => void>();
  private stopWatchingUnplug: () => void = () => {};
  private _closed = false;
  /** True while a program is running (Run or a started main.py). */
  private _running = false;
  /** True once we know we are sitting at the raw REPL ">" prompt. */
  private atRawPrompt = false;
  private usePaste = true;

  private constructor(port: HardwarePort) {
    this.port = port;
  }

  get closed() {
    return this._closed;
  }
  get running() {
    return this._running;
  }

  /**
   * Open the port and check that MicroPython answers. Throws NoMicroPythonError
   * when it doesn't (the port is closed again in that case).
   */
  static async open(port: HardwarePort, onLog?: (line: string) => void): Promise<MicroPythonBoard> {
    const board = new MicroPythonBoard(port);
    await board.openPort();
    try {
      await board.withLock(async () => {
        await board.enterRawRepl(false, onLog);
        const { out } = await board.execCapture(
          'import os\nu=os.uname()\nprint(u.release+"|"+u.machine)',
          8000,
        );
        const [version = '', machine = ''] = out.trim().split('|');
        board.info = { version, machine, target: targetFromMachine(machine) };
      });
    } catch (err) {
      await board.close();
      throw err;
    }
    return board;
  }

  onClose(cb: () => void): () => void {
    this.closeListeners.add(cb);
    return () => this.closeListeners.delete(cb);
  }

  // ── Port ─────────────────────────────────────────────────────────────────
  private async openPort() {
    try {
      await this.port.open({ baudRate: 115200 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/already open/i.test(msg)) {
        // A previous session in this tab left it open: close and try once more.
        try {
          await this.port.close();
        } catch {
          /* ignore */
        }
        await this.port.open({ baudRate: 115200 });
      } else {
        throw new Error(
          "Couldn't open the board's USB port. Close any other tab or program using the board (Arduino IDE, Thonny, a Serial Monitor), then try again.",
        );
      }
    }
    // Both lines idle = the auto-reset circuit leaves the chip running normally.
    try {
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
    } catch {
      /* not every adapter supports this; harmless */
    }
    if (!this.port.readable || !this.port.writable) throw new BoardDisconnectedError();
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
    this.readLoopDone = this.readLoop();
    this.stopWatchingUnplug = onHardwareDisconnect(this.port, () => void this.close());
  }

  private async readLoop() {
    const reader = this.reader!;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value?.length) this.rx.push(value);
      }
    } catch {
      /* cable pulled, or cancelled by close() */
    }
    this.rx.close();
    if (!this._closed) void this.close();
  }

  private write(data: Uint8Array | string): Promise<void> {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    const next = this.writeChain.then(async () => {
      if (this._closed || !this.writer) throw new BoardDisconnectedError();
      await this.writer.write(bytes);
    });
    // Keep the chain alive after a failure; the caller still sees the error.
    this.writeChain = next.catch(() => {});
    return next;
  }

  async close(): Promise<void> {
    if (this._closed) return;
    this._closed = true;
    this._running = false;
    this.stopWatchingUnplug();
    this.rx.close();
    try {
      await this.reader?.cancel();
    } catch {
      /* ignore */
    }
    await Promise.race([this.readLoopDone, sleep(1000)]);
    try {
      this.reader?.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      this.writer?.releaseLock();
    } catch {
      /* ignore */
    }
    this.reader = null;
    this.writer = null;
    for (let i = 0; i < 10; i++) {
      if (!this.port.readable && !this.port.writable) break;
      try {
        await this.port.close();
        break;
      } catch {
        // Worth waiting only while a stream is still being let go of; an
        // unplugged port can't be closed at all.
        if (!this.port.readable?.locked && !this.port.writable?.locked) break;
        await sleep(200);
      }
    }
    for (const cb of this.closeListeners) {
      try {
        cb();
      } catch {
        /* a listener's problem is not ours */
      }
    }
    this.closeListeners.clear();
  }

  // ── Locking ──────────────────────────────────────────────────────────────
  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lockChain.then(() => {
      if (this._closed) throw new BoardDisconnectedError();
      return fn();
    });
    this.lockChain = run.then(
      () => {},
      () => {},
    );
    return run;
  }

  // ── Receiving ────────────────────────────────────────────────────────────
  /** Read until `token` has arrived. Returns everything up to and including it. */
  private async readUntil(token: Uint8Array, timeoutMs: number): Promise<Uint8Array> {
    const deadline = Date.now() + timeoutMs;
    let acc: Uint8Array = new Uint8Array(0);
    for (;;) {
      const chunk = this.rx.take();
      if (chunk.length) {
        const searchFrom = Math.max(0, acc.length - token.length + 1);
        acc = concat(acc, chunk);
        const i = indexOf(acc, token, searchFrom);
        if (i >= 0) {
          this.rx.unshift(acc.slice(i + token.length));
          return acc.slice(0, i + token.length);
        }
        // Never hold more than we need to find the token in a flood of output.
        if (acc.length > 65536) acc = acc.slice(acc.length - 4096);
      }
      if (this.rx.closed) throw new BoardDisconnectedError();
      const left = deadline - Date.now();
      if (left <= 0) throw new Error('timeout');
      await this.rx.wait(left);
    }
  }

  private async readBytes(n: number, timeoutMs: number): Promise<Uint8Array> {
    const deadline = Date.now() + timeoutMs;
    let acc: Uint8Array = new Uint8Array(0);
    while (acc.length < n) {
      acc = concat(acc, this.rx.take());
      if (acc.length >= n) break;
      if (this.rx.closed) throw new BoardDisconnectedError();
      const left = deadline - Date.now();
      if (left <= 0) throw new Error('timeout');
      await this.rx.wait(left);
    }
    this.rx.unshift(acc.slice(n));
    return acc.slice(0, n);
  }

  /** Throw away input until the board has been quiet for `quietMs`. */
  private async drain(quietMs: number, maxMs: number) {
    const end = Date.now() + maxMs;
    for (;;) {
      this.rx.take();
      if (this.rx.closed) throw new BoardDisconnectedError();
      if (Date.now() >= end) return;
      await this.rx.wait(Math.min(quietMs, end - Date.now()));
      if (!this.rx.length) return;
    }
  }

  // ── Raw REPL ─────────────────────────────────────────────────────────────
  /**
   * Stop whatever runs and get to the raw REPL prompt. With `softReset`, the
   * board is also soft-reset first, so every Run starts clean (no variables,
   * PWM or timers left from last time) — as `mpremote run` does.
   */
  private async enterRawRepl(softReset: boolean, onLog?: (line: string) => void) {
    this.atRawPrompt = false;
    // A board that was just plugged in or reset is still booting for ~1 s, and
    // a saved main.py may be running. Ctrl-C (twice: once for the program, once
    // more in case it catches the first) and try a few times.
    let ok = false;
    // (A board running an Arduino sketch never answers; ~6 s in all.)
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      await this.write(new Uint8Array([0x0d, CTRL_C, CTRL_C]));
      await this.drain(attempt === 0 ? 150 : 300, 700);
      await this.write(new Uint8Array([0x0d, CTRL_A]));
      try {
        await this.readUntil(RAW_BANNER, attempt === 0 ? 1200 : 1800);
        ok = true;
      } catch (err) {
        if (err instanceof BoardDisconnectedError) throw err;
        onLog?.(`No answer from MicroPython (attempt ${attempt + 1})`);
      }
    }
    if (!ok) throw new NoMicroPythonError();
    if (softReset) {
      await this.write(new Uint8Array([CTRL_D]));
      try {
        await this.readUntil(SOFT_REBOOT, 6000);
        // boot.py runs here; its output (if any) is discarded.
        await this.readUntil(RAW_BANNER, 10000);
      } catch (err) {
        if (err instanceof BoardDisconnectedError) throw err;
        throw new Error(
          "The board didn't restart properly. Press the board's reset (EN/RST) button, or unplug it and plug it back in, then try again.",
        );
      }
    }
    this.atRawPrompt = true;
  }

  /** Send code at the raw REPL prompt and start it. The board is then running it. */
  private async sendCode(code: string) {
    if (!this.atRawPrompt) await this.enterRawRepl(false);
    this.atRawPrompt = false;
    const bytes = enc.encode(code);
    if (this.usePaste) {
      await this.write(new Uint8Array([CTRL_E, 0x41, CTRL_A]));
      const reply = await this.readBytes(2, 3000);
      if (reply[0] === 0x52 && reply[1] === 0x01) {
        await this.pasteWrite(bytes);
        return;
      }
      this.usePaste = false;
      if (reply[0] === 0x52 && reply[1] === 0x00) {
        // Understood but not supported: the board prints a fresh ">" prompt.
        await this.readUntil(enc.encode('>'), 3000);
      } else {
        // A board too old to know Ctrl-E: the Ctrl-A reset its raw REPL.
        this.rx.unshift(reply);
        await this.readUntil(RAW_BANNER, 3000);
      }
    }
    // Plain raw REPL: the board's UART buffer is small, so send it in slices.
    for (let i = 0; i < bytes.length; i += 256) {
      await this.write(bytes.subarray(i, i + 256));
      await sleep(10);
    }
    await this.write(new Uint8Array([CTRL_D]));
    const ok = await this.readBytes(2, 5000);
    if (ok[0] !== 0x4f || ok[1] !== 0x4b) throw new Error('The board did not accept the program.');
  }

  /** Raw-paste: send within the window the board grants, then Ctrl-D. */
  private async pasteWrite(bytes: Uint8Array) {
    const head = await this.readBytes(2, 3000);
    const window = head[0]! | (head[1]! << 8);
    if (!window) throw new Error('The board sent a bad reply. Unplug it and try again.');
    let remain = window;
    let i = 0;
    while (i < bytes.length) {
      // Collect flow-control bytes: \x01 = another window free, \x04 = stop.
      while (remain === 0 || this.rx.length) {
        const b = (await this.readBytes(1, 10000))[0];
        if (b === CTRL_A) remain += window;
        else if (b === CTRL_D) {
          // The board ended the paste early (e.g. a SyntaxError in a long program).
          await this.write(new Uint8Array([CTRL_D]));
          return;
        } else throw new Error('The board sent something unexpected while receiving the program.');
      }
      const end = Math.min(i + remain, bytes.length);
      await this.write(bytes.subarray(i, end));
      remain -= end - i;
      i = end;
    }
    await this.write(new Uint8Array([CTRL_D]));
    // The board answers the end of data with \x04, then compiles and runs.
    await this.readUntil(new Uint8Array([CTRL_D]), 10000);
  }

  /**
   * Read a running program's output to the end: normal output, \x04, error
   * text, \x04, ">". `onStdout` gets the output as it arrives.
   */
  private async follow(
    onStdout: (bytes: Uint8Array) => void,
    cancelled: () => boolean,
  ): Promise<{ err: Uint8Array; cancelled: boolean }> {
    // Normal output, streamed.
    for (;;) {
      const chunk = this.rx.take();
      if (chunk.length) {
        const i = chunk.indexOf(CTRL_D);
        if (i >= 0) {
          if (i > 0) onStdout(chunk.subarray(0, i));
          this.rx.unshift(chunk.slice(i + 1));
          break;
        }
        onStdout(chunk);
      }
      if (this.rx.closed) throw new BoardDisconnectedError();
      if (cancelled()) return { err: new Uint8Array(0), cancelled: true };
      if (!chunk.length) await this.rx.wait(1000);
    }
    // Error output, collected.
    let err: Uint8Array = new Uint8Array(0);
    for (;;) {
      const chunk = this.rx.take();
      const i = chunk.indexOf(CTRL_D);
      if (i >= 0) {
        err = concat(err, chunk.subarray(0, i));
        this.rx.unshift(chunk.slice(i + 1));
        break;
      }
      err = concat(err, chunk);
      if (this.rx.closed) throw new BoardDisconnectedError();
      if (cancelled()) return { err, cancelled: true };
      await this.rx.wait(1000);
    }
    await this.readUntil(enc.encode('>'), 3000);
    this.atRawPrompt = true;
    return { err, cancelled: false };
  }

  /** Run a short helper command and return its output (throws on a Python error). */
  private async execCapture(code: string, timeoutMs = 10000): Promise<{ out: string }> {
    await this.sendCode(code);
    const outParts: Uint8Array[] = [];
    const deadline = Date.now() + timeoutMs;
    const res = await this.follow(
      (b) => outParts.push(b.slice()),
      () => Date.now() > deadline,
    );
    if (res.cancelled) {
      this.atRawPrompt = false;
      throw new Error(
        'The board took too long to answer. Unplug it, plug it back in and try again.',
      );
    }
    const out = new TextDecoder().decode(outParts.reduce(concat, new Uint8Array(0)));
    const errText = new TextDecoder().decode(res.err).trim();
    if (errText) {
      const e = new Error(parseTraceback(errText).message || errText);
      (e as Error & { traceback?: string }).traceback = errText;
      throw e;
    }
    return { out: out.replace(/\r\n/g, '\n') };
  }

  // ── Files ────────────────────────────────────────────────────────────────
  /**
   * Write a text file on the board. Written to a temporary name and renamed,
   * so a cable pulled half-way never leaves a broken main.py behind.
   */
  private async writeFileLocked(path: string, text: string) {
    const data = enc.encode(text);
    const tmp = '/_tg_upload.tmp';
    await this.execCapture(`_tg_f=open('${tmp}','wb')\n_tg_w=_tg_f.write`);
    // ~1 KB of file per command keeps each command small for the board.
    for (let i = 0; i < data.length; i += 1024) {
      const lines: string[] = [];
      for (let j = i; j < Math.min(i + 1024, data.length); j += 128) {
        lines.push(`_tg_w(${pyBytes(data.subarray(j, Math.min(j + 128, i + 1024, data.length)))})`);
      }
      await this.execCapture(lines.join('\n'));
    }
    const { out } = await this.execCapture(
      [
        '_tg_f.close()',
        'import os',
        'try:',
        `  os.remove('${path}')`,
        'except OSError:',
        '  pass',
        `os.rename('${tmp}','${path}')`,
        `print(os.stat('${path}')[6])`,
        'del _tg_f,_tg_w',
      ].join('\n'),
    );
    if (Number(out.trim()) !== data.length) {
      throw new Error("The program didn't save completely on the board. Try again.");
    }
  }

  // ── Public operations ────────────────────────────────────────────────────
  /**
   * Run a program now (it is not saved on the board). `files` are helper
   * modules (e.g. ai.py) written to the board first.
   */
  run(code: string, handlers: BoardRunHandlers, files: Record<string, string> = {}): BoardRun {
    let stopRequested = false;
    let gaveUp = false;
    let finished = false;
    const text = new TextStream();
    const finish = (result: BoardRunResult) => {
      if (finished) return;
      finished = true;
      this._running = false;
      const tail = text.end();
      if (tail) handlers.onOutput(tail);
      handlers.onDone(result);
    };

    this._running = true;
    void this.withLock(async () => {
      try {
        await this.enterRawRepl(true);
        if (stopRequested) return finish({ status: 'stopped' });
        for (const [path, content] of Object.entries(files)) {
          await this.writeFileLocked(path, content);
          if (stopRequested) return finish({ status: 'stopped' });
        }
        await this.sendCode(code);
        const res = await this.follow(
          (bytes) => {
            const t = text.push(bytes);
            if (t) handlers.onOutput(t);
          },
          () => gaveUp,
        );
        if (res.cancelled) {
          this.atRawPrompt = false;
          return finish({ status: 'stopped' });
        }
        const errText = new TextDecoder().decode(res.err).trim();
        if (!errText) return finish({ status: 'ok' });
        const error = parseTraceback(errText);
        if (stopRequested && error.name === 'KeyboardInterrupt')
          return finish({ status: 'stopped' });
        if (error.name === 'SystemExit') return finish({ status: 'ok' });
        finish({ status: 'error', error });
      } catch (err) {
        this.atRawPrompt = false;
        if (err instanceof BoardDisconnectedError || this._closed) {
          finish({ status: 'disconnected' });
          return;
        }
        finish({
          status: 'error',
          error: {
            name: 'BoardError',
            message: err instanceof Error ? err.message : String(err),
            line: null,
            traceback: '',
          },
        });
      }
    }).catch(() => finish({ status: 'disconnected' }));

    return {
      send: (answer: string) => {
        if (finished) return;
        // Control characters would stop or confuse the program; Enter is \r.
        const clean = answer.replace(CONTROL_CHARS, '');
        void this.write(clean + '\r').catch(() => {});
      },
      sendLine: (line: string) => {
        if (finished) return;
        void this.write(line.replace(CONTROL_CHARS, '') + '\n').catch(() => {});
      },
      stop: () => {
        if (finished || stopRequested) return;
        stopRequested = true;
        void this.write(new Uint8Array([CTRL_C, CTRL_C])).catch(() => {});
        // A program stuck where Ctrl-C can't reach it: ask again, then stop
        // waiting for it. The next Run interrupts it again before starting.
        setTimeout(() => {
          if (!finished) void this.write(new Uint8Array([CTRL_C])).catch(() => {});
        }, 1200);
        setTimeout(() => {
          if (!finished) {
            gaveUp = true;
            this.rx.notify();
          }
        }, 4000);
      },
    };
  }

  /** Save `code` as main.py so the board runs it by itself whenever it starts. */
  saveProgram(code: string, files: Record<string, string> = {}): Promise<void> {
    return this.withLock(async () => {
      await this.enterRawRepl(false);
      for (const [path, content] of Object.entries(files)) {
        await this.writeFileLocked(path, content);
      }
      await this.writeFileLocked('/main.py', code);
    });
  }

  /** Delete main.py, so the board no longer runs a program when it starts. */
  removeProgram(): Promise<boolean> {
    return this.withLock(async () => {
      await this.enterRawRepl(false);
      const { out } = await this.execCapture(
        "import os\ntry:\n  os.remove('/main.py')\n  print('removed')\nexcept OSError:\n  print('none')",
      );
      return out.trim() === 'removed';
    });
  }

  /**
   * Restart the board's MicroPython the way it starts on its own, so the
   * saved main.py runs, and stream what it prints. Stop = Ctrl-C.
   */
  startSavedProgram(handlers: BoardRunHandlers): BoardRun {
    let finished = false;
    let stopRequested = false;
    const text = new TextStream();
    let seen = '';
    // MicroPython prints its banner and a ">>> " prompt when the program ends;
    // the student only needs to see what their program printed.
    const banner = /^(MicroPython v\d|Type "help\(\)" for more information\.)/;
    const filter = new OutputFilter({
      isControl: (l) => banner.test(l),
      mightBeControl: (p) =>
        banner.test(p) ||
        ['MicroPython v', 'Type "help()" for more information.', '>>> '].some((m) =>
          m.startsWith(p),
        ),
    });
    // A traceback right before the banner is the program's error: the
    // console explains it instead of showing it.
    const tracebacks = new TracebackHolder((l) => banner.test(l) || l.startsWith('>>> '));
    const finish = (result: BoardRunResult) => {
      if (finished) return;
      finished = true;
      this._running = false;
      this.rx.notify();
      handlers.onDone(result);
    };
    this._running = true;
    void this.withLock(async () => {
      try {
        await this.enterRawRepl(false);
        this.atRawPrompt = false;
        // Ctrl-B: normal REPL. Ctrl-D there: soft reset → boot.py, then main.py.
        await this.write(new Uint8Array([CTRL_B]));
        await this.readUntil(enc.encode('>>> '), 4000);
        await this.write(new Uint8Array([CTRL_D]));
        await this.readUntil(SOFT_REBOOT, 6000);
        for (;;) {
          const chunk = this.rx.take();
          if (chunk.length) {
            const t = text.push(chunk);
            seen = (seen + t).slice(-4000);
            // The normal REPL prompt after the program means it has ended.
            const end = seen.lastIndexOf('\n>>> ');
            const ended = end >= 0 && seen.endsWith('>>> ');
            const visible = filter.push(tracebacks.push(t));
            if (visible) handlers.onOutput(visible);
            if (ended) {
              tracebacks.end();
              if (tracebacks.fatal) {
                const error = parseTraceback(tracebacks.fatal);
                if (stopRequested && error.name === 'KeyboardInterrupt')
                  finish({ status: 'stopped' });
                else finish({ status: 'error', error });
              } else finish(stopRequested ? { status: 'stopped' } : { status: 'ok' });
              return;
            }
          }
          if (this.rx.closed) throw new BoardDisconnectedError();
          if (finished) return;
          if (!chunk.length) await this.rx.wait(1000);
        }
      } catch (err) {
        if (err instanceof BoardDisconnectedError || this._closed)
          finish({ status: 'disconnected' });
        else
          finish({
            status: 'error',
            error: {
              name: 'BoardError',
              message: err instanceof Error ? err.message : String(err),
              line: null,
              traceback: '',
            },
          });
      }
    }).catch(() => finish({ status: 'disconnected' }));
    return {
      send: (answer: string) => {
        if (!finished) void this.write(answer.replace(CONTROL_CHARS, '') + '\r').catch(() => {});
      },
      sendLine: (line: string) => {
        if (!finished) void this.write(line.replace(CONTROL_CHARS, '') + '\n').catch(() => {});
      },
      stop: () => {
        if (finished || stopRequested) return;
        stopRequested = true;
        void this.write(new Uint8Array([CTRL_C, CTRL_C])).catch(() => {});
        setTimeout(() => {
          if (!finished) finish({ status: 'stopped' });
        }, 4000);
      },
    };
  }
}
