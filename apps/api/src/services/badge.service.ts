/**
 * badge.service.ts
 *
 * Badge listing and automatic award logic.
 */
import { prisma } from '../lib/prisma';
import type { Badge, UserBadge, BadgeTriggerType } from '@prisma/client';

export class BadgeService {
  /**
   * List all badges, marking which ones the user has earned.
   */
  static async getAll(userId?: string) {
    const badges: Badge[] = await prisma.badge.findMany({ orderBy: { triggerType: 'asc' } });

    if (!userId) {
      return badges.map((b: Badge) => ({ ...b, earned: false, earnedAt: null as Date | null }));
    }

    const earned: UserBadge[] = await prisma.userBadge.findMany({ where: { userId } });
    const earnedMap = new Map<string, Date>(earned.map((ub: UserBadge) => [ub.badgeId, ub.earnedAt]));

    return badges.map((b: Badge) => ({
      ...b,
      earned:   earnedMap.has(b.id),
      earnedAt: earnedMap.get(b.id) ?? null,
    }));
  }

  /**
   * Check if user qualifies for badges of this trigger type and award them.
   * Returns any newly earned badges (empty array if none).
   * Designed to be fire-and-forget — never throws.
   */
  static async tryAward(userId: string, triggerType: BadgeTriggerType) {
    try {
      const badges: Badge[] = await prisma.badge.findMany({ where: { triggerType } });
      if (!badges.length) return [];

      const already = await prisma.userBadge.findMany({
        where: { userId, badgeId: { in: badges.map((b: Badge) => b.id) } },
        select: { badgeId: true },
      });
      const earnedIds = new Set(already.map((a: { badgeId: string }) => a.badgeId));
      const unearned  = badges.filter((b: Badge) => !earnedIds.has(b.id));
      if (!unearned.length) return [];

      const awarded: Badge[] = [];
      for (const badge of unearned) {
        await prisma.userBadge.create({ data: { userId, badgeId: badge.id } })
          .then(() => awarded.push(badge))
          .catch(() => {}); // swallow unique-constraint race
      }
      return awarded;
    } catch {
      return []; // never break the parent flow
    }
  }
}
