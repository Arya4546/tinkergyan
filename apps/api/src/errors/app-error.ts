import type { ErrorCode } from './error-codes';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown[];

  constructor(code: ErrorCode, message: string, statusCode: number, details?: unknown[]) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
  }
}
