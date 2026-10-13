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

// The esp32:esp32 core (installed in full by setup-arduino-cli.sh) ships board
// defs for every chip in the family, not just the classic one — so adding a
// new ESP32 variant here is just adding its FQBN, no new core install needed.
// Keep this in sync with KnownBoardTarget in packages/shared-types and with
// WebSerialFlasher.detectChip's chip-name-to-FQBN map, which picks one of
// these automatically from the chip actually connected over Web Serial.
export const SUPPORTED_BOARDS = [
  'arduino:avr:uno',
  'arduino:avr:nano',
  'arduino:avr:mega',
  'esp8266:esp8266:nodemcuv2',
  'esp32:esp32:esp32',
  'esp32:esp32:esp32s3',
  'esp32:esp32:esp32c3',
] as const;

export type BoardFqbn = (typeof SUPPORTED_BOARDS)[number];

export interface CompileRequest {
  code: string;
  board: BoardFqbn;
  stdin?: string;
  target?: 'simulate' | 'firmware';
}

export class CompileService {
  static async compile(userId: string, request: CompileRequest): Promise<CompileResult> {
    const isFirmware = request.target === 'firmware';
    const mode = isFirmware ? 'arduino' : getCompilerMode();
    logger.info(
      { userId, board: request.board, mode, target: request.target },
      'compile.service.start',
    );

    const release = await compileSemaphore.acquire();

    try {
      let result: CompileResult;

      if (isFirmware) {
        // Force arduino-cli for firmware builds
        const { compileForFirmware } = await import('../lib/compiler');
        result = await compileForFirmware(request.code, request.board, env.MAX_COMPILE_TIMEOUT);
      } else {
        result = await compile(request.code, request.board, env.MAX_COMPILE_TIMEOUT, request.stdin);
      }

      logger.info(
        {
          userId,
          success: result.success,
          engine: result.engine,
          durationMs: result.durationMs,
          hasHex: !!result.hexBase64,
        },
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
      throw new AppError('COMPILE_ERROR', `Compilation failed unexpectedly: ${message}`, 500);
    } finally {
      release();
    }
  }
}
