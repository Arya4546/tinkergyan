import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../lib/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  
  logger.error({ err, req }, 'Unexpected error');
  
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
};
