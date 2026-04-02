import type { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodTypeAny, ZodError } from 'zod';
import { AppError } from '../errors/app-error';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        return next(new AppError('VALIDATION_ERROR', 'Validation failed', 400, details));
      }
      return next(error);
    }
  };
};
