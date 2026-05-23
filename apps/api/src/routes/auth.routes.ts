import { Router } from 'express';
import { getMe, login, loginSchema, logout, refresh, register, registerSchema, changePassword, changePasswordSchema } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', requireAuth, logout);
router.post('/refresh', refresh);
router.get('/me', requireAuth, getMe);
router.patch('/password', requireAuth, validate(changePasswordSchema), changePassword);

export { router as authRouter };
