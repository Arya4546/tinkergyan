import { Router } from 'express';

import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { projectRouter } from './project.routes';
import { compileRouter } from './compile.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth',     authRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/compile',  compileRouter);
