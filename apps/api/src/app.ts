import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import path from 'path';

import { env } from './env';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './lib/logger';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');

  const clientDistPath = path.join(__dirname, '../../web/dist');
  app.use(express.static(clientDistPath));

  app.use(
    cors({
      credentials: true,
      origin: env.FRONTEND_URL.length > 0 ? env.FRONTEND_URL : true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use('/api', apiRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });
  app.use(errorHandler);

  app.get(/(.*)/, (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  return app;
};
