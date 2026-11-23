import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().optional().or(z.literal('')),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [];
      return val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    })
    .default(''),
  MAX_COMPILE_TIMEOUT: z.coerce.number().default(180_000),
  COMPILE_CONCURRENCY: z.coerce.number().default(5),
  /** Path to the arduino-cli binary. Required only when COMPILER_MODE=arduino. */
  ARDUINO_CLI_PATH: z.string().optional(),
  /**
   * Super admin account, created on server start when it does not exist yet.
   * All three must be set for that to happen; otherwise it is skipped.
   */
  ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
  ADMIN_FULL_NAME: z.string().max(50).optional(),
  ADMIN_PASSWORD: z.string().min(8).optional().or(z.literal('')),
  /** Compiler strategy: 'wandbox' (default, remote C++ executor), 'arduino' (local CLI), 'mock' (offline dev). */
  COMPILER_MODE: z.enum(['wandbox', 'arduino', 'mock']).default('wandbox'),
});

export type Env = z.infer<typeof envSchema>;

export const env = (() => {
  try {
    return envSchema.parse(process.env);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const missingVars = err.errors.map((e) => e.path.join('.')).join(', ');
      console.error('❌ [DEPLOY_ERROR] Invalid Environment Variables:', missingVars);
      // In production, we want a hard crash to prevent running in invalid states
      process.exit(1);
    }
    throw err;
  }
})();
