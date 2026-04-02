import pkg from '../generated/client/index.js';
const { PrismaClient } = pkg;

const globalForPrisma = globalThis as unknown as { prisma: any | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
