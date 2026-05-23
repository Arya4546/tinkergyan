/**
 * course.routes.ts
 *
 * Routes for course browsing, enrollment, and lesson progress.
 * Course listing is public; enrollment and completion require auth.
 */
import { Router } from 'express';
import {
  listCourses,
  getCourse,
  courseSlugSchema,
  getLesson,
  lessonIdSchema,
  enrollCourse,
  enrollSchema,
  completeLesson,
} from '../controllers/course.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Public (with optional auth for enrollment status)
router.get('/',           optionalAuth, listCourses);
router.get('/:slug',      optionalAuth, validate(courseSlugSchema), getCourse);

// Auth required
router.post('/enroll',           requireAuth, validate(enrollSchema), enrollCourse);
router.get('/lessons/:lessonId', requireAuth, validate(lessonIdSchema), getLesson);
router.post('/lessons/:lessonId/complete', requireAuth, validate(lessonIdSchema), completeLesson);

export { router as courseRouter };
