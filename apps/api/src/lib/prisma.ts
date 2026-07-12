import type { PrismaClient as PrismaClientType } from '@prisma/client';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientType | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new (PrismaClient as any)({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
