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
} from '../controllers/project.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// All project routes require authentication
router.use(requireAuth);

router.get('/',     listProjects);
router.post('/',    validate(createProjectSchema), createProject);
router.get('/:id',  validate(projectIdSchema),     getProject);
router.patch('/:id', validate(updateProjectSchema), updateProject);
router.delete('/:id', validate(projectIdSchema),    deleteProject);

export { router as projectRouter };
