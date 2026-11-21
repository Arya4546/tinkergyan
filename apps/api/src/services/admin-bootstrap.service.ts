/**
 * admin-bootstrap.service.ts
 *
 * Makes sure the super admin account described by ADMIN_EMAIL /
 * ADMIN_FULL_NAME / ADMIN_PASSWORD exists. Runs on every server start and is
 * safe to run any number of times, and from several instances at once.
 *
 *  - no such user            → create it with role SUPER_ADMIN
 *  - already SUPER_ADMIN     → leave it alone (never resets a changed password)
 *  - exists as a normal user → promote it ONLY if ADMIN_PASSWORD is that
 *                              account's password. Registration is open, so
 *                              otherwise anyone could register the admin email
 *                              first and be handed super-admin rights.
 */
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { env } from '../env';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

export type AdminBootstrapResult = 'skipped' | 'created' | 'exists' | 'promoted' | 'conflict';

export async function ensureSuperAdmin(): Promise<AdminBootstrapResult> {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  const name = env.ADMIN_FULL_NAME?.trim() || 'Super Admin';

  if (!email || !password) {
    logger.info('Super admin not configured (ADMIN_EMAIL / ADMIN_PASSWORD unset) — skipping');
    return 'skipped';
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role === 'SUPER_ADMIN') {
      logger.info({ email }, 'Super admin already exists');
      return 'exists';
    }
    if (await bcrypt.compare(password, existing.passwordHash)) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'SUPER_ADMIN' } });
      logger.info({ email }, 'Existing account promoted to super admin');
      return 'promoted';
    }
    logger.warn(
      { email },
      'ADMIN_EMAIL belongs to a regular account with a different password — NOT promoting it',
    );
    return 'conflict';
  }

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'SUPER_ADMIN',
        preferences: { create: {} },
      },
    });
    logger.info({ email }, 'Super admin created');
    return 'created';
  } catch (err) {
    // Another instance created it between our lookup and insert.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      logger.info({ email }, 'Super admin already exists');
      return 'exists';
    }
    throw err;
  }
}
