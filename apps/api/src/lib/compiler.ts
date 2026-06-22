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
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { readdir, readFile } from 'node:fs/promises';
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
        return {
          success: false,
          stdout: '',
          stderr:
            'The compile server is temporarily overloaded. Please try again in a few seconds.',
          errors: [
            {
              line: 0,
              column: 0,
              severity: 'error',
              message: 'Server busy — please retry in a moment',
            },
          ],
          durationMs: Date.now() - start,
          engine: 'wandbox',
        };
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

  logger.error({ err: lastError }, 'wandbox.request.failed');
  return {
    success: false,
    stdout: '',
    stderr: `Compiler service error: ${lastError?.message ?? 'Unknown'}`,
    errors: [
      { line: 0, column: 0, severity: 'error', message: lastError?.message ?? 'Unknown error' },
    ],
    durationMs: Date.now() - start,
    engine: 'wandbox',
  };
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
    await (await import('node:fs/promises')).mkdir(sketchDir, { recursive: true });
    await (await import('node:fs/promises')).mkdir(buildDir, { recursive: true });
    await writeFile(sketchFile, code, 'utf8');

    const cliPath = env.ARDUINO_CLI_PATH!;
    const args = [
      'compile',
      '--fqbn',
      board,
      '--format',
      'text',
      '--output-dir',
      buildDir,
      sketchDir,
    ];
    const { stdout, stderr } = await spawnWithTimeout(cliPath, args, timeoutMs);
    const errors = parseArduinoErrors(stderr, sketchFile);
    const hasError =
      errors.some((e) => e.severity === 'error') || stderr.toLowerCase().includes('error:');

    let hexBase64: string | undefined;
    if (!hasError) {
      try {
        const files = await readdir(buildDir);
        const binFile =
          files.find((f) => f.endsWith('.hex') && !f.includes('with_bootloader')) ||
          files.find((f) => f.endsWith('.bin'));
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
    const controller = new AbortController();
    const timer = setTimeout(() => {
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
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
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
    default:
      return compileWandbox(code, stdin);
  }
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
  const cliPath = resolveArduinoCliPath();
  logger.info({ board, cliPath }, 'compileForFirmware.start');

  const start = Date.now();
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'tinkergyan-fw-'));
  const sketchDir = path.join(tmpDir, 'sketch');
  const buildDir = path.join(tmpDir, 'build');
  const sketchFile = path.join(sketchDir, 'sketch.ino');

  try {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(sketchDir, { recursive: true });
    await mkdir(buildDir, { recursive: true });
    await writeFile(sketchFile, code, 'utf8');

    const args = ['compile', '--fqbn', board, '--output-dir', buildDir, sketchDir];
    const { stdout, stderr } = await spawnWithTimeout(cliPath, args, timeoutMs);
    const errors = parseArduinoErrors(stderr, sketchFile);
    const hasError =
      errors.some((e) => e.severity === 'error') || stderr.toLowerCase().includes('error:');

    // Extract hex/bin firmware
    let hexBase64: string | undefined;
    if (!hasError) {
      try {
        const files = await readdir(buildDir);
        // Prefer .hex for AVR, .bin for ESP, but exclude the with_bootloader variant
        const binFile =
          files.find((f) => f.endsWith('.hex') && !f.includes('with_bootloader')) ||
          files.find((f) => f.endsWith('.bin'));
        if (binFile) {
          const binData = await readFile(path.join(buildDir, binFile));
          hexBase64 = binData.toString('base64');
          logger.info(
            { board, size: binData.length, file: binFile },
            'compileForFirmware.hex_extracted',
          );
        } else {
          logger.warn({ buildFiles: files }, 'compileForFirmware.no_hex_found');
        }
      } catch (err) {
        logger.warn({ err }, 'compileForFirmware.read_hex_failed');
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
      logger.warn({ err: e, tmpDir }, 'Failed to clean firmware temp dir');
    });
  }
}
