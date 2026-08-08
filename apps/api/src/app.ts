import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';

const _dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

import { env } from './env';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './lib/logger';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');

  const clientDistPath = path.join(_dirname, '../../web/dist');

  // ── Static assets (/assets/*) ───────────────────────────────────────────
  // Vite produces content-hashed filenames (e.g. index-Cxs4AR43.js).
  // Serve with immutable caching — browsers cache forever and never re-validate.
  // If a file is missing (old chunk after re-deploy), return a clean 404
  // instead of falling through to the SPA catch-all (which would serve
  // index.html as JavaScript, causing a parse error).
  app.use(
    '/assets',
    express.static(path.join(clientDistPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: false, // Return 404 immediately if the file doesn't exist
    }),
  );

  // Other root-level static files (favicon, manifest, robots.txt, etc.)
  app.use(express.static(clientDistPath, { index: false }));

  // ── Middleware ───────────────────────────────────────────────────────────
  app.use(
    cors({
      credentials: true,
      origin: env.FRONTEND_URL.length > 0 ? env.FRONTEND_URL : true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  // ── API routes ──────────────────────────────────────────────────────────
  app.use('/api', apiRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });
  app.use(errorHandler);

  // ── SPA catch-all ───────────────────────────────────────────────────────
  // Never cache index.html so browsers always load the latest build manifest
  // on navigation. This is what triggers loading the new hashed chunk files.
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  return app;
};
