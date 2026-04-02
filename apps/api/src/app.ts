import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { env } from './env';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './lib/logger';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      credentials: true,
      origin: env.FRONTEND_URL 
        ? [env.FRONTEND_URL] 
        : true, // Reflect origin for initial demo
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use('/api', apiRouter);
  app.use(errorHandler);

  return app;
};
