import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { env } from '../env';
import { AppError } from '../errors/app-error';
import { prisma } from '../lib/prisma';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Missing token', 401);
    }

    const secret = new TextEncoder().encode(env.JWT_SECRET);
    
    try {
      const { payload } = await jwtVerify(token, secret);
      
      if (!payload.sub) {
        throw new Error('No user ID in token');
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new AppError('UNAUTHORIZED', 'User no longer exists', 401);
      }

      req.user = user;
      next();
    } catch (e) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
    }
  } catch (error) {
    next(error);
  }
};
