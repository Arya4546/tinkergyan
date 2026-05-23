import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateProfileSchema,
  getPreferences,
  upsertPreferences,
  upsertPreferencesSchema,
  getLeaderboard,
  getBadges,
} from '../controllers/user.controller';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Public
router.get('/leaderboard', optionalAuth, getLeaderboard);

// Authenticated
router.use(requireAuth);
router.get('/profile',                                    getProfile);
router.patch('/profile',  validate(updateProfileSchema),  updateProfile);
router.get('/preferences',                                getPreferences);
router.put('/preferences', validate(upsertPreferencesSchema), upsertPreferences);
router.get('/badges',                                     getBadges);

export { router as userRouter };
