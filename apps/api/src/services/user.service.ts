/**
 * user.service.ts
 *
 * Business logic for user profile and preferences.
 */
import { AppError } from '../errors/app-error';
import { prisma } from '../lib/prisma';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface UpdateProfileDto {
  name?: string;
  avatar?: string;
}

export interface UpsertPreferencesDto {
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';
  editorFontSize?: number;
  defaultBoard?: string;
  autoSave?: boolean;
  codeCompletion?: boolean;
  emailNotifications?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

export class UserService {
  /**
   * Get user profile with stats.
   */
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        xp: true,
        level: true,
        streak: true,
        lastActiveAt: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            enrollments: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('RESOURCE_NOT_FOUND', 'User not found', 404);
    }

    return {
      ...user,
      projectCount: user._count.projects,
      enrollmentCount: user._count.enrollments,
      _count: undefined,
    };
  }

  /**
   * Update user profile fields (name, avatar).
   */
  static async updateProfile(userId: string, dto: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        xp: true,
        level: true,
        streak: true,
      },
    });
  }

  /**
   * Get user preferences, creating defaults if they don't exist.
   */
  static async getPreferences(userId: string) {
    const prefs = await prisma.userPreferences.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return prefs;
  }

  /**
   * Upsert user preferences.
   */
  static async upsertPreferences(userId: string, dto: UpsertPreferencesDto) {
    return prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });
  }

  /**
   * Top 50 users ranked by XP.
   */
  static async getLeaderboard() {
    return prisma.user.findMany({
      orderBy: { xp: 'desc' },
      take: 50,
      select: { id: true, name: true, avatar: true, xp: true, level: true },
    });
  }
}
