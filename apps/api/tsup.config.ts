import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  // Mark Prisma as external to prevent 'Dynamic require of fs' errors
  external: ['@prisma/client'],
  onSuccess: 'prisma generate',
});
