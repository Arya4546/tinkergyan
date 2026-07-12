import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  // Mark Prisma as external so native .node binaries aren't bundled
  external: ['@prisma/client'],
  onSuccess: 'prisma generate',
});
