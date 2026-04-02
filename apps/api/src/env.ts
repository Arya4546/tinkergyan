import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().min(1),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().optional(),
  DOCKER_SOCKET: z.string().default('/var/run/docker.sock'),
  MAX_COMPILE_TIMEOUT: z.coerce.number().default(30_000),
  COMPILE_CONCURRENCY: z.coerce.number().default(5),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
