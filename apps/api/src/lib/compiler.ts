/**
 * compiler.ts
 *
 * Thin wrapper around Arduino CLI. When ARDUINO_CLI_PATH is not set in the
 * environment, the compiler runs in MOCK mode — returning a realistic fake
 * result so the entire UI pipeline can be developed and tested without a CLI.
 *
 * Real mode: shells out to arduino-cli via child_process.spawn.
 * Mock mode:  simulates a 1.5s compilation and returns success or parse errors.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { env } from '../env';
import { logger } from './logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompileError {
  /** 1-based line number in the source file, or 0 if unknown. */
  line:     number;
  /** 1-based column number, or 0 if unknown. */
  column:   number;
  message:  string;
  severity: 'error' | 'warning';
}

export interface CompileResult {
  success:    boolean;
  stdout:     string;
  stderr:     string;
  errors:     CompileError[];
  durationMs: number;
}

// ─── Error parser ─────────────────────────────────────────────────────────────

const ARDUINO_ERROR_RE =
  /^(?:[^:]+):(\d+):(\d+):\s*(error|warning):\s*(.+)$/gm;

/**
 * Parse Arduino CLI stderr into structured CompileError objects.
 */
function parseErrors(stderr: string, sketchFile: string): CompileError[] {
  const results: CompileError[] = [];
  const pattern = new RegExp(
    `${path.basename(sketchFile).replace('.', '\\.')}:(\\d+):(\\d+):\\s*(error|warning):\\s*(.+)`,
    'gm',
  );

  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = pattern.exec(stderr)) !== null) {
    results.push({
      line:     parseInt(match[1]!, 10),
      column:   parseInt(match[2]!, 10),
      severity: match[3] as 'error' | 'warning',
      message:  match[4]!.trim(),
    });
  }

  // Fallback: generic parse if no filename-matched errors were found
  if (results.length === 0) {
    let generic: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((generic = ARDUINO_ERROR_RE.exec(stderr)) !== null) {
      results.push({
        line:     parseInt(generic[1]!, 10),
        column:   parseInt(generic[2]!, 10),
        severity: generic[3] as 'error' | 'warning',
        message:  generic[4]!.trim(),
      });
    }
  }

  return results;
}

// ─── Mock mode ────────────────────────────────────────────────────────────────

const MOCK_SUCCESS_STDOUT = [
  'Sketch uses 924 bytes (2%) of program storage space. Max is 32256 bytes.',
  'Global variables use 9 bytes (0%) of dynamic memory, leaving 2039 bytes for local variables. Max is 2048 bytes.',
].join('\n');

/**
 * Simulate compilation locally.
 * Only checks for obvious syntax issues like unbalanced braces to avoid rejecting valid code.
 */
async function compileMock(code: string): Promise<CompileResult> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));

  const errors: CompileError[] = [];

  // Very basic heuristic: unbalanced braces
  const openBraces  = (code.match(/\{/g) ?? []).length;
  const closeBraces = (code.match(/\}/g) ?? []).length;
  if (openBraces !== closeBraces) {
    errors.push({ line: code.split('\\n').length, column: 1, severity: 'error', message: 'Expected \'}\' at end of input (unbalanced braces)' });
  }

  const openParens  = (code.match(/\(/g) ?? []).length;
  const closeParens = (code.match(/\)/g) ?? []).length;
  if (openParens !== closeParens) {
    errors.push({ line: 1, column: 1, severity: 'error', message: 'Unbalanced parentheses () detected' });
  }

  const success = errors.length === 0;

  // Add a helpful note if they are trying to run standard C++ in mock mode
  let stdout = success ? MOCK_SUCCESS_STDOUT : '';
  if (success && code.includes('#include <iostream>')) {
    stdout += '\n\n[SYSTEM NOTE]: You are running in Mock Mode without a local C++ compiler.\nYour standard C++ code syntax looks correct, but it was not executed.\nTo see terminal output (stdout), configure a real compiler in your environment.';
  }

  return {
    success,
    stdout,
    stderr: success ? '' : errors.map((e) => `sketch.ino:${e.line}:${e.column}: error: ${e.message}`).join('\n'),
    errors,
    durationMs: Date.now() - start,
  };
}

// ─── Real mode ────────────────────────────────────────────────────────────────

/**
 * Compile code using the real Arduino CLI.
 * Writes code to a temp sketch directory, runs the CLI, cleans up.
 */
async function compileReal(
  code: string,
  board: string,
  timeoutMs: number,
): Promise<CompileResult> {
  const start = Date.now();

  // Arduino CLI requires the sketch file to be named after its directory
  const tmpDir    = await mkdtemp(path.join(os.tmpdir(), 'tinkergyan-'));
  const sketchDir = path.join(tmpDir, 'sketch');
  const sketchFile = path.join(sketchDir, 'sketch.ino');

  try {
    await (await import('node:fs/promises')).mkdir(sketchDir, { recursive: true });
    await writeFile(sketchFile, code, 'utf8');

    const cliPath = env.ARDUINO_CLI_PATH!;
    const args = [
      'compile',
      '--fqbn',  board,
      '--format', 'text',
      sketchDir,
    ];

    const { stdout, stderr } = await spawnWithTimeout(cliPath, args, timeoutMs);
    const errors  = parseErrors(stderr, sketchFile);
    const hasErrors = errors.some((e) => e.severity === 'error') ||
      stderr.toLowerCase().includes('error:');

    return {
      success:    !hasErrors,
      stdout,
      stderr,
      errors,
      durationMs: Date.now() - start,
    };
  } finally {
    // Always clean up temp files — never leak
    await rm(tmpDir, { recursive: true, force: true }).catch((err) => {
      logger.warn({ err, tmpDir }, 'Failed to clean up compile temp directory');
    });
  }
}

// ─── Process helper ───────────────────────────────────────────────────────────

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

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns true when running in mock mode (no CLI configured). */
export const isMockMode = (): boolean => !env.ARDUINO_CLI_PATH;

/**
 * Compile Arduino C++ source code.
 * Automatically selects mock vs real mode based on ARDUINO_CLI_PATH.
 */
export async function compile(
  code: string,
  board: string,
  timeoutMs = env.MAX_COMPILE_TIMEOUT,
): Promise<CompileResult> {
  if (isMockMode()) {
    logger.debug('Compiler running in MOCK mode');
    return compileMock(code);
  }
  return compileReal(code, board, timeoutMs);
}
