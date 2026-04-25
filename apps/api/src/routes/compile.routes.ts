import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { compileCode, compileSchema } from '../controllers/compile.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

/**
 * Per-user compile rate limit: 10 compilations per minute.
 * keyGenerator uses the authenticated user's ID (set by requireAuth).
 */
const compileLimiter = rateLimit({
  windowMs:        60 * 1000, // 1 minute
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.user?.id ?? req.ip ?? 'anonymous',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code:    'RATE_LIMITED',
        message: 'Too many compile requests — please wait a moment',
      },
    });
  },
});

router.post(
  '/',
  requireAuth,
  compileLimiter,
  validate(compileSchema),
  compileCode,
);

export { router as compileRouter };
