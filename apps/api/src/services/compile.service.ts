/**
 * compile.service.ts
 *
 * Orchestrates the compilation pipeline:
 *   1. Acquire a semaphore slot (backpressure)
 *   2. Delegate to the compiler (mock or real)
 *   3. Release the slot in a finally block — guaranteed, no deadlocks
 *
 * Keeping this as a thin orchestration layer means the compiler.ts
 * module stays independently testable.
 */
import { compile, isMockMode } from '../lib/compiler';
import { compileSemaphore } from '../lib/compile-semaphore';
import { AppError } from '../errors/app-error';
import { env } from '../env';
import { logger } from '../lib/logger';
import type { CompileResult } from '../lib/compiler';

export type { CompileResult };

// Supported boards (mirrors the Zod enum in compile.controller.ts)
export const SUPPORTED_BOARDS = [
  'arduino:avr:uno',
  'arduino:avr:mega',
  'esp8266:esp8266:nodemcuv2',
] as const;

export type BoardFqbn = (typeof SUPPORTED_BOARDS)[number];

export interface CompileRequest {
  code:    string;
  board:   BoardFqbn;
}

export class CompileService {
  /**
   * Compile user-submitted Arduino C++ code.
   *
   * The semaphore slot is ALWAYS released via finally — if the compiler
   * throws (timeout, spawn error, etc.) the slot is freed automatically.
   */
  static async compile(
    userId: string,
    request: CompileRequest,
  ): Promise<CompileResult> {
    if (isMockMode()) {
      logger.info({ userId, board: request.board }, 'compile.mock');
    } else {
      logger.info({ userId, board: request.board }, 'compile.start');
    }

    // acquire() rejects immediately with RATE_LIMITED if the queue is full
    const release = await compileSemaphore.acquire();

    try {
      const result = await compile(
        request.code,
        request.board,
        env.MAX_COMPILE_TIMEOUT,
      );

      logger.info(
        { userId, success: result.success, durationMs: result.durationMs },
        'compile.done',
      );

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (message === 'COMPILE_TIMEOUT') {
        throw new AppError(
          'COMPILE_TIMEOUT',
          `Compilation timed out after ${env.MAX_COMPILE_TIMEOUT / 1000}s`,
          408,
        );
      }

      logger.error({ err, userId }, 'compile.error');
      throw new AppError('COMPILE_ERROR', 'Compilation failed unexpectedly', 500);
    } finally {
      // This block executes whether compile() resolved, rejected, or timed out.
      release();
    }
  }
}
