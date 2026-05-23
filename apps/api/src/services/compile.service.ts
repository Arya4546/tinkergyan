/**
 * compile.service.ts
 *
 * Orchestrates the compilation pipeline:
 *   1. Acquire semaphore slot (backpressure)
 *   2. Delegate to compiler (wandbox / arduino / mock)
 *   3. Release slot in finally — guaranteed, no deadlocks
 */
import { compile, getCompilerMode } from '../lib/compiler';
import { compileSemaphore } from '../lib/compile-semaphore';
import { AppError } from '../errors/app-error';
import { env } from '../env';
import { logger } from '../lib/logger';
import type { CompileResult } from '../lib/compiler';

export type { CompileResult };

export const SUPPORTED_BOARDS = [
  'arduino:avr:uno',
  'arduino:avr:mega',
  'esp8266:esp8266:nodemcuv2',
] as const;

export type BoardFqbn = (typeof SUPPORTED_BOARDS)[number];

export interface CompileRequest {
  code:   string;
  board:  BoardFqbn;
  stdin?: string;
}

export class CompileService {
  static async compile(
    userId: string,
    request: CompileRequest,
  ): Promise<CompileResult> {
    const mode = getCompilerMode();
    logger.info({ userId, board: request.board, mode }, 'compile.service.start');

    const release = await compileSemaphore.acquire();

    try {
      const result = await compile(
        request.code,
        request.board,
        env.MAX_COMPILE_TIMEOUT,
        request.stdin,
      );

      logger.info(
        { userId, success: result.success, engine: result.engine, durationMs: result.durationMs },
        'compile.service.done',
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

      logger.error({ err, userId }, 'compile.service.error');
      throw new AppError('COMPILE_ERROR', 'Compilation failed unexpectedly', 500);
    } finally {
      release();
    }
  }
}
