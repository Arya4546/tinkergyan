/**
 * compile-semaphore.ts
 *
 * An in-process Promise-based semaphore that caps concurrent compilations.
 * Configured via env.COMPILE_CONCURRENCY (default 5).
 *
 * Design:
 *  - acquire() returns a release function. The caller MUST invoke it in a
 *    finally block to guarantee the slot is always freed — no deadlocks.
 *  - If the wait queue grows beyond MAX_QUEUE_SIZE, the request is rejected
 *    immediately with a RATE_LIMITED error instead of waiting indefinitely.
 */
import { AppError } from '../errors/app-error';
import { env } from '../env';

const MAX_QUEUE_SIZE = 20;

class Semaphore {
  private current = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  /**
   * Acquire a compilation slot.
   * @returns A release function — ALWAYS call this in a finally block.
   * @throws AppError RATE_LIMITED when the queue is full.
   */
  acquire(): Promise<() => void> {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      return Promise.reject(
        new AppError('RATE_LIMITED', 'Compilation queue is full — try again shortly', 429),
      );
    }

    return new Promise<() => void>((resolve) => {
      const tryAcquire = () => {
        if (this.current < this.limit) {
          this.current++;
          resolve(() => this.release());
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  private release(): void {
    this.current = Math.max(0, this.current - 1);
    const next = this.queue.shift();
    if (next) next();
  }

  /** Current number of active compilation slots in use. */
  get activeCount(): number {
    return this.current;
  }
}

export const compileSemaphore = new Semaphore(env.COMPILE_CONCURRENCY);
