import { Router } from 'express';
import {
  createProject,
  createProjectSchema,
  deleteProject,
  getProject,
  listProjects,
  projectIdSchema,
  updateProject,
  updateProjectSchema,
  getPublicProjects,
  forkProject,
} from '../controllers/project.controller';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Public
router.get('/gallery', optionalAuth, getPublicProjects);

// Authenticated
router.use(requireAuth);
router.get('/',       listProjects);
router.post('/',      validate(createProjectSchema), createProject);
router.get('/:id',    validate(projectIdSchema),     getProject);
router.patch('/:id',  validate(updateProjectSchema), updateProject);
router.delete('/:id', validate(projectIdSchema),     deleteProject);
router.post('/:id/fork', validate(projectIdSchema),  forkProject);

export { router as projectRouter };
