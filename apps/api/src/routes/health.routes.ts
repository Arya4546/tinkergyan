import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export const healthRouter = Router();

const handleHealthCheck = async () => {
  const services: Record<string, 'ok' | 'error'> = {
    database: 'ok',
    redis: 'ok',
    docker: 'ok',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    services.database = 'error';
  }

  try {
    await redis.ping();
  } catch {
    services.redis = 'error';
  }

  return {
    status: 'ok',
    version: '0.1.0',
    services,
    uptime: Math.floor(process.uptime()),
  };
};

healthRouter.get('/health', (_req, res, next) => {
  void handleHealthCheck()
    .then((payload) => res.json(payload))
    .catch(next);
});
