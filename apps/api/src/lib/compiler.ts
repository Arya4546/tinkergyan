/**
 * compiler.ts
 *
 * Three-tier compilation strategy:
 *   1. WANDBOX  — Remote C++ compile + execute via Wandbox API (default, no setup)
 *   2. ARDUINO  — Local Arduino CLI compile (when ARDUINO_CLI_PATH is set)
 *   3. MOCK     — Fake results for offline dev (when COMPILER_MODE=mock)
 *
 * The compile() function auto-selects the strategy based on env config.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { readdir, readFile } from 'node:fs/promises';

/**
 * Fixed, persistent cache dir for arduino-cli's precompiled core (core.a).
 * Must stay outside the per-compile mkdtemp dir below — arduino-cli keys its
 * cache off the build path, so a fresh random path every request means every
 * compile rebuilds the whole ESP8266 SDK from scratch instead of reusing it.
 */
const ARDUINO_BUILD_CACHE_PATH = process.env.ARDUINO_DIRECTORIES_DATA
  ? path.join(process.env.ARDUINO_DIRECTORIES_DATA, 'build-cache')
  : path.join(os.tmpdir(), 'tinkergyan-arduino-build-cache');

const _dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
import { env } from '../env';
import { logger } from './logger';
import { prepareForWandbox, adjustLineNumbers } from './arduino-shim';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompileError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface CompileResult {
  success: boolean;
  stdout: string;
  stderr: string;
  errors: CompileError[];
  durationMs: number;
  /** Which engine was used for this compile. */
  engine: 'wandbox' | 'arduino' | 'mock';
  /** The compiled firmware binary (if available) */
  hexBase64?: string;
}

// ─── GCC error parser ─────────────────────────────────────────────────────────

const GCC_ERROR_RE = /prog\.cc?:(\d+):(\d+):\s*(error|warning|fatal error):\s*(.+)/gm;

function parseGccErrors(stderr: string): CompileError[] {
  const results: CompileError[] = [];
  let match: RegExpExecArray | null;
  const pattern = new RegExp(GCC_ERROR_RE.source, GCC_ERROR_RE.flags);
  while ((match = pattern.exec(stderr)) !== null) {
    results.push({
      line: parseInt(match[1]!, 10),
      column: parseInt(match[2]!, 10),
      severity: match[3]!.includes('error') ? 'error' : 'warning',
      message: match[4]!.trim(),
    });
  }
  return results;
}

// ─── Arduino CLI error parser ─────────────────────────────────────────────────

const ARDUINO_ERROR_RE = /^(?:[^:]+):(\d+):(\d+):\s*(error|warning):\s*(.+)$/gm;

function parseArduinoErrors(stderr: string, sketchFile: string): CompileError[] {
  const results: CompileError[] = [];
  const escapedName = path.basename(sketchFile).replace('.', '\\.');
  const pattern = new RegExp(`${escapedName}:(\\d+):(\\d+):\\s*(error|warning):\\s*(.+)`, 'gm');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(stderr)) !== null) {
    results.push({
      line: parseInt(match[1]!, 10),
      column: parseInt(match[2]!, 10),
      severity: match[3] as 'error' | 'warning',
      message: match[4]!.trim(),
    });
  }
  if (results.length === 0) {
    let generic: RegExpExecArray | null;
    while ((generic = ARDUINO_ERROR_RE.exec(stderr)) !== null) {
      results.push({
        line: parseInt(generic[1]!, 10),
        column: parseInt(generic[2]!, 10),
        severity: generic[3] as 'error' | 'warning',
        message: generic[4]!.trim(),
      });
    }
  }
  return results;
}

// ─── 1. Wandbox (remote C++ compile + run) ────────────────────────────────────

const WANDBOX_COMPILE_URL = 'https://wandbox.org/api/compile.json';
const WANDBOX_TIMEOUT_MS = 30_000;
const WANDBOX_MAX_RETRIES = 2;
const WANDBOX_RETRY_DELAY = 1_000;

interface WandboxResponse {
  status?: string;
  signal?: string;
  compiler_output?: string;
  compiler_error?: string;
  compiler_message?: string;
  program_output?: string;
  program_error?: string;
  program_message?: string;
}

/**
 * Wandbox could not run the code at all — the service is down, overloaded, or
 * unreachable. Distinct from "your code failed to compile", which is a normal
 * result. Thrown so compile() can fall back to the local toolchain instead of
 * handing the student a server error they can do nothing about.
 */
class WandboxUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'WandboxUnavailableError';
  }
}

async function compileWandbox(code: string, stdin?: string): Promise<CompileResult> {
  const start = Date.now();

  // Detect Arduino sketch and prepend compatibility shim
  const { code: finalCode, isArduino } = prepareForWandbox(code);
  logger.info({ isArduino, codeLength: finalCode.length }, 'wandbox.prepare');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= WANDBOX_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      logger.warn({ attempt }, 'wandbox.retry');
      await new Promise((r) => setTimeout(r, WANDBOX_RETRY_DELAY * attempt));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WANDBOX_TIMEOUT_MS);

    try {
      const res = await fetch(WANDBOX_COMPILE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: finalCode,
          stdin: stdin || '',
          compiler: 'gcc-13.2.0',
          options: 'warning',
          'compiler-option-raw': '-std=c++17\n-Wall\n-Wextra',
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Wandbox returned ${res.status}: ${text}`);
      }

      const data = (await res.json()) as WandboxResponse;

      // Detect OCI/container runtime errors — Wandbox server overload
      const allOutput = [data.program_output, data.program_error, data.compiler_error]
        .filter(Boolean)
        .join(' ');
      if (allOutput.includes('OCI runtime error') || allOutput.includes('crun:')) {
        // Retry on container errors
        if (attempt < WANDBOX_MAX_RETRIES) {
          logger.warn({ attempt }, 'wandbox.oci_error.retry');
          continue;
        }
        // Not a compile failure — Wandbox's sandbox never started. Hand it to
        // the caller so the local toolchain can pick it up.
        throw new WandboxUnavailableError('Wandbox sandbox unavailable (OCI runtime error)');
      }

      const compilerStderr = [data.compiler_error, data.compiler_message]
        .filter(Boolean)
        .join('\n')
        .trim();
      const programOutput = data.program_output?.trim() ?? '';
      const programError = data.program_error?.trim() ?? '';

      // Parse errors and adjust line numbers for Arduino shim offset
      const rawErrors = parseGccErrors(compilerStderr);
      const errors = adjustLineNumbers(rawErrors, isArduino);
      const hasError =
        errors.some((e) => e.severity === 'error') ||
        compilerStderr.toLowerCase().includes('error:');

      const programRan = data.status === '0';
      const compileSuccess = !hasError;

      let stdout = '';
      if (compileSuccess && programOutput) {
        stdout = programOutput;
      } else if (compileSuccess) {
        stdout = data.compiler_output?.trim() ?? '';
      }

      let stderr = '';
      if (compileSuccess && !programRan && data.status !== undefined) {
        stderr = friendlyExitMessage(data.status, data.signal, programError);
      } else if (!compileSuccess) {
        stderr = compilerStderr;
      }

      return {
        success: compileSuccess && (programRan || data.status === undefined),
        stdout,
        stderr,
        errors,
        durationMs: Date.now() - start,
        engine: 'wandbox',
      };
    } catch (err) {
      // Our own "service is down" signal — must not be mistaken for a network
      // blip and retried, and must not be flattened into a compile result.
      if (err instanceof WandboxUnavailableError) throw err;
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;
      if (attempt < WANDBOX_MAX_RETRIES) {
        continue; // Retry on timeout or 5xx server errors
      }
      break; // Retries exhausted
    } finally {
      clearTimeout(timer);
    }
  }

  // All retries exhausted
  if (lastError?.name === 'AbortError') {
    return {
      success: false,
      stdout: '',
      stderr: 'Compilation timed out (30s limit). Try simplifying your code.',
      errors: [
        {
          line: 0,
          column: 0,
          severity: 'error',
          message: 'COMPILE_TIMEOUT: Execution exceeded 30s',
        },
      ],
      durationMs: Date.now() - start,
      engine: 'wandbox',
    };
  }

  // Unreachable, 5xx, DNS failure, TLS error — every retry is spent and none of
  // it is the student's fault. Same treatment as the OCI case above. (The
  // timeout branch stays a real result: that one *is* about their code.)
  logger.error({ err: lastError }, 'wandbox.request.failed');
  throw new WandboxUnavailableError(lastError?.message ?? 'Wandbox unreachable');
}

// ─── Friendly exit/signal messages ────────────────────────────────────────────

function friendlyExitMessage(status: string, signal?: string, programError?: string): string {
  const code = parseInt(status, 10);
  const sigName = signal || '';

  // Map common signals/exit codes to human-readable messages
  if (sigName === 'SIGSEGV' || code === 139) {
    return (
      "Segmentation fault (SIGSEGV). Your program tried to access memory it shouldn't. " +
      'Common causes: reading from stdin without input, array out of bounds, or null pointer dereference. ' +
      'If your code uses cin/scanf, provide input in the "stdin" field below the editor.'
    );
  }
  if (sigName === 'SIGABRT' || code === 134) {
    return (
      'Program aborted (SIGABRT). This usually means an assertion failed, ' +
      'or the program called abort() due to an unrecoverable error like double-free or out-of-memory.'
    );
  }
  if (sigName === 'SIGKILL' || code === 137) {
    return (
      'Program killed (SIGKILL). The program exceeded memory or time limits. ' +
      'Try reducing the size of arrays or optimizing your algorithm.'
    );
  }
  if (sigName === 'SIGFPE' || code === 136) {
    return 'Floating point exception (SIGFPE). Division by zero or invalid arithmetic operation detected.';
  }
  if (sigName === 'SIGXCPU') {
    return 'CPU time limit exceeded. Your program took too long. Check for infinite loops or optimize your algorithm.';
  }
  if (code === 1) {
    return programError || 'Program exited with an error (exit code 1). Check your logic.';
  }

  let msg = programError || `Program exited with status ${status}`;
  if (sigName) msg += ` (signal: ${sigName})`;
  return msg;
}

// ─── 2. Arduino CLI (local compile) ───────────────────────────────────────────

/**
 * Pick the flashable firmware artifact from an arduino-cli build directory.
 *
 * AVR boards (Uno/Nano/Mega) emit a .hex — skip the with_bootloader variant.
 * ESP32 emits several .bin files; only the merged image (bootloader +
 * partitions + app) boots when flashed at offset 0x0, so it must win over
 * the app-only, bootloader, and partition binaries. ESP8266 emits a single
 * complete .bin flashed at 0x0.
 */
function pickFirmwareFile(files: string[]): string | undefined {
  return (
    files.find((f) => f.endsWith('.hex') && !f.includes('with_bootloader')) ||
    files.find((f) => f.endsWith('.merged.bin')) ||
    files.find((f) => f.endsWith('.bin') && !f.includes('bootloader') && !f.includes('partitions'))
  );
}

/**
 * Removes arduino-cli's complaints about *our* command line from output shown
 * to students.
 *
 * A child saw "The flag --build-cache-path has been deprecated" in their
 * console, highlighted it, and reported it as the reason their LED would not
 * light. They were right to: it is the only red-looking text on the screen and
 * it is completely unactionable, because the flag is one we pass, not anything
 * they wrote. Deliberately narrow — this strips notices about the invocation
 * itself and nothing else, so real compiler warnings about their code still
 * reach them.
 */
function stripToolchainNotices(stderr: string): string {
  const NOTICE = /^.*\bflag\b.*\bhas been deprecated\b.*$/gim;
  return stderr
    .replace(NOTICE, '')
    .replace(/^\s*Please use just --build-path alone.*$/gim, '')
    .replace(/^\s*the build cache path in the Arduino CLI\s*$/gim, '')
    .replace(/^\s*settings\.\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function compileArduino(
  code: string,
  board: string,
  timeoutMs: number,
): Promise<CompileResult> {
  const start = Date.now();
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'tinkergyan-'));
  const sketchDir = path.join(tmpDir, 'sketch');
  const buildDir = path.join(tmpDir, 'build');
  const sketchFile = path.join(sketchDir, 'sketch.ino');

  try {
    await mkdir(sketchDir, { recursive: true });
    await mkdir(buildDir, { recursive: true });
    await mkdir(ARDUINO_BUILD_CACHE_PATH, { recursive: true });
    await writeFile(sketchFile, code, 'utf8');

    const cliPath = resolveArduinoCliPath();
    const args = [
      'compile',
      '--fqbn',
      board,
      '--format',
      'text',
      '--output-dir',
      buildDir,
      '--build-cache-path',
      ARDUINO_BUILD_CACHE_PATH,
      '--jobs',
      '1',
      sketchDir,
    ];
    const { stdout, stderr: rawStderr } = await spawnWithTimeout(cliPath, args, timeoutMs);
    const stderr = stripToolchainNotices(rawStderr);
    const errors = parseArduinoErrors(stderr, sketchFile);
    const hasError =
      errors.some((e) => e.severity === 'error') || stderr.toLowerCase().includes('error:');

    let hexBase64: string | undefined;
    if (!hasError) {
      try {
        const files = await readdir(buildDir);
        const binFile = pickFirmwareFile(files);
        if (binFile) {
          const binData = await readFile(path.join(buildDir, binFile));
          hexBase64 = binData.toString('base64');
          logger.info({ board, size: binData.length, file: binFile }, 'compiler.hex_extracted');
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to read compiled firmware');
      }
    }

    return {
      success: !hasError,
      stdout,
      stderr,
      errors,
      durationMs: Date.now() - start,
      engine: 'arduino',
      ...(hexBase64 ? { hexBase64 } : {}),
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch((e) => {
      logger.warn({ err: e, tmpDir }, 'Failed to clean compile temp dir');
    });
  }
}

function spawnWithTimeout(
  cmd: string,
  args: string[],
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let didTimeout = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      didTimeout = true;
      controller.abort();
      reject(new Error('COMPILE_TIMEOUT'));
    }, timeoutMs);

    const child = spawn(cmd, args, { signal: controller.signal });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout.on('data', (d: Buffer) => stdoutChunks.push(d));
    child.stderr.on('data', (d: Buffer) => stderrChunks.push(d));
    child.on('close', () => {
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
      });
    });
    child.on('error', (err: Error) => {
      clearTimeout(timer);
      if (didTimeout || err.name === 'AbortError') {
        reject(new Error('COMPILE_TIMEOUT'));
      } else {
        reject(err);
      }
    });
  });
}

// ─── 3. Mock mode ─────────────────────────────────────────────────────────────

async function compileMock(code: string): Promise<CompileResult> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

  const errors: CompileError[] = [];
  const lines = code.split('\n');

  const openBraces = (code.match(/\{/g) ?? []).length;
  const closeBraces = (code.match(/\}/g) ?? []).length;
  if (openBraces !== closeBraces) {
    errors.push({
      line: lines.length,
      column: 1,
      severity: 'error',
      message: "Expected '}' at end of input",
    });
  }

  const openParens = (code.match(/\(/g) ?? []).length;
  const closeParens = (code.match(/\)/g) ?? []).length;
  if (openParens !== closeParens) {
    errors.push({ line: 1, column: 1, severity: 'error', message: 'Unbalanced parentheses ()' });
  }

  const success = errors.length === 0;
  return {
    success,
    stdout: success
      ? '[MOCK] Compilation successful. Output simulation not available in mock mode.'
      : '',
    stderr: success
      ? ''
      : errors.map((e) => `prog.cc:${e.line}:${e.column}: error: ${e.message}`).join('\n'),
    errors,
    durationMs: Date.now() - start,
    engine: 'mock',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type CompilerMode = 'wandbox' | 'arduino' | 'mock';

/**
 * Note the deliberate asymmetry with resolveArduinoCliPath(): that function
 * searches half a dozen install locations, this one only honours an explicit
 * ARDUINO_CLI_PATH. So a box with arduino-cli installed but no env var — which
 * is what production is — uploads through arduino-cli while Run still goes to
 * Wandbox. That is on purpose: Wandbox *executes* the sketch, and arduino-cli
 * cannot, so silently preferring the local toolchain would quietly delete the
 * Serial output that Run exists to show. Set COMPILER_MODE=arduino to force it.
 */
export function getCompilerMode(): CompilerMode {
  if (env.COMPILER_MODE === 'mock') return 'mock';
  if (env.COMPILER_MODE === 'arduino') return 'arduino';
  if (env.ARDUINO_CLI_PATH && existsSync(env.ARDUINO_CLI_PATH)) return 'arduino';
  return 'wandbox';
}

/**
 * Compile (and optionally execute) C++ source code.
 * Strategy auto-selected based on environment config.
 */
export async function compile(
  code: string,
  board: string,
  timeoutMs = env.MAX_COMPILE_TIMEOUT,
  stdin?: string,
): Promise<CompileResult> {
  const mode = getCompilerMode();
  logger.info({ mode, board }, 'compile.start');

  switch (mode) {
    case 'arduino':
      return compileArduino(code, board, timeoutMs);
    case 'mock':
      return compileMock(code);
    case 'wandbox':
    default: {
      // Don't re-dial a service we already know is down — see the circuit
      // breaker below. Only skip if we actually have somewhere else to go.
      if (isWandboxCircuitOpen() && (await isArduinoCliAvailable(timeoutMs))) {
        logger.info({ openForMs: wandboxRetryAt - Date.now() }, 'wandbox.circuit_open.skipped');
        return compileWithoutWandbox(
          new WandboxUnavailableError('circuit open — Wandbox failed recently'),
          code,
          board,
          timeoutMs,
        );
      }
      try {
        const result = await compileWandbox(code, stdin);
        noteWandboxOutcome(true);
        return result;
      } catch (err) {
        if (!(err instanceof WandboxUnavailableError)) throw err;
        noteWandboxOutcome(false);
        return compileWithoutWandbox(err, code, board, timeoutMs);
      }
    }
  }
}

/**
 * Circuit breaker around Wandbox.
 *
 * The fallback alone is correct but slow: every Run would still burn ~6.5s on
 * three doomed round-trips before giving up. During a class that is 6.5s of
 * dead air per click, per student — and worse, thirty students clicking Run
 * sends ninety requests into a host that is failing *because* it is out of
 * capacity. We would be feeding the outage we are stuck in.
 *
 * So after a failure we stop calling Wandbox for a while and go straight to
 * arduino-cli. The window backs off as failures repeat (a blip costs one
 * student one slow compile; a multi-hour outage costs almost nobody) and
 * resets the moment a compile succeeds, so recovery needs no intervention.
 */
const WANDBOX_COOLDOWN_MS = 60_000;
const WANDBOX_COOLDOWN_MAX_MS = 15 * 60_000;
let wandboxRetryAt = 0;
let wandboxFailureStreak = 0;

function isWandboxCircuitOpen(): boolean {
  return Date.now() < wandboxRetryAt;
}

function noteWandboxOutcome(ok: boolean): void {
  if (ok) {
    if (wandboxFailureStreak > 0) logger.info('wandbox.circuit_closed');
    wandboxFailureStreak = 0;
    wandboxRetryAt = 0;
    return;
  }
  wandboxFailureStreak++;
  const cooldown = Math.min(
    WANDBOX_COOLDOWN_MS * 2 ** (wandboxFailureStreak - 1),
    WANDBOX_COOLDOWN_MAX_MS,
  );
  wandboxRetryAt = Date.now() + cooldown;
  logger.warn({ streak: wandboxFailureStreak, cooldownMs: cooldown }, 'wandbox.circuit_opened');
}

/**
 * What to do when Wandbox is down.
 *
 * Wandbox both compiles *and runs* the sketch, which is how Run shows Serial
 * output. arduino-cli can only do the first half — but "your code compiles" is
 * most of what Run is for, and the box already has a working arduino-cli
 * (that's what every Upload uses). Checking the code is strictly better than
 * showing a student "Server busy" and leaving them stuck, so fall back and say
 * plainly which half they got.
 */
async function compileWithoutWandbox(
  cause: WandboxUnavailableError,
  code: string,
  board: string,
  timeoutMs: number,
): Promise<CompileResult> {
  if (!(await isArduinoCliAvailable(timeoutMs))) {
    logger.error({ reason: cause.reason }, 'wandbox.unavailable.no_fallback');
    return {
      success: false,
      stdout: '',
      stderr:
        'The online compile service is temporarily unavailable. Your code has not been checked — ' +
        'please try again in a few minutes. Uploading to a connected board still works.',
      errors: [
        {
          line: 0,
          column: 0,
          severity: 'error',
          message: 'Compile service unavailable — this is not a problem with your code',
        },
      ],
      durationMs: 0,
      engine: 'wandbox',
    };
  }

  logger.warn({ reason: cause.reason, board }, 'wandbox.unavailable.fallback_arduino');
  const result = await compileArduino(code, board, timeoutMs);

  if (!result.success) return result; // Real compile errors — show them as-is.

  return {
    ...result,
    stdout:
      'Your code compiled successfully.\n\n' +
      'Note: the online simulator is temporarily unavailable, so the program was checked ' +
      'but not run — no output to show this time. Upload to your board to see it work.',
  };
}

/**
 * Whether a usable arduino-cli exists on this machine.
 *
 * Actually runs `arduino-cli version` rather than trusting the path search:
 * resolveArduinoCliPath() falls back to the bare binary name, meaning "hope
 * it's on PATH", and a fallback that silently isn't there would turn one
 * upstream outage into a confusing second failure. Cached — the answer cannot
 * change while the process lives.
 */
let arduinoCliProbe: Promise<boolean> | null = null;
function isArduinoCliAvailable(timeoutMs: number): Promise<boolean> {
  arduinoCliProbe ??= spawnWithTimeout(resolveArduinoCliPath(), ['version'], timeoutMs)
    .then(() => true)
    .catch(() => false);
  return arduinoCliProbe;
}

/**
 * Resolve the arduino-cli binary path.
 * Checks env.ARDUINO_CLI_PATH first, then common install locations.
 */
function resolveArduinoCliPath(): string {
  if (env.ARDUINO_CLI_PATH && existsSync(env.ARDUINO_CLI_PATH)) return env.ARDUINO_CLI_PATH;

  // Common locations on Linux (Render, Docker)
  const candidates = [
    '/usr/local/bin/arduino-cli',
    '/usr/bin/arduino-cli',
    path.join(_dirname, '..', '..', '..', '..', 'bin', 'arduino-cli'), // Robust path relative to source file
    path.join(process.cwd(), 'bin', 'arduino-cli'),
    path.join(process.cwd(), '..', '..', 'bin', 'arduino-cli'), // If process.cwd() is inside apps/api
    path.join(os.homedir(), 'bin', 'arduino-cli'),
    path.join(os.homedir(), '.local', 'bin', 'arduino-cli'),
  ];

  // On Windows dev
  if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Arduino CLI\\arduino-cli.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Arduino15', 'arduino-cli.exe'),
    );
  }

  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) return candidate;
    } catch {
      /* skip */
    }
  }

  return 'arduino-cli'; // Fall back to PATH lookup
}

/**
 * Compile for firmware output (always uses arduino-cli).
 * Called when frontend requests target='firmware' for hardware upload.
 * This bypasses the env-based strategy selection.
 */
export async function compileForFirmware(
  code: string,
  board: string,
  timeoutMs = env.MAX_COMPILE_TIMEOUT,
): Promise<CompileResult> {
  logger.info({ board }, 'compileForFirmware.start');
  return compileArduino(code, board, timeoutMs);
}
