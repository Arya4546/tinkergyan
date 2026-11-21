import { Router } from 'express';
import {
  getProject,
  getStats,
  getUser,
  idParamSchema,
  listProjects,
  listProjectsSchema,
  listUsers,
  listUsersSchema,
} from '../controllers/admin.controller';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Everything below is super-admin only, and read-only.
router.use(requireAuth, requireSuperAdmin);

router.get('/stats', getStats);
router.get('/users', validate(listUsersSchema), listUsers);
router.get('/users/:id', validate(idParamSchema), getUser);
router.get('/projects', validate(listProjectsSchema), listProjects);
router.get('/projects/:id', validate(idParamSchema), getProject);

export { router as adminRouter };
