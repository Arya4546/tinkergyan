import PrismaPkg from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaPkg.PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaPkg.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
