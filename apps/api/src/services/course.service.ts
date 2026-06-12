/**
 * course.service.ts
 *
 * Business logic for courses, enrollment, and lesson progress.
 * All ownership and authorization checks happen here.
 */
import type { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';
import { prisma } from '../lib/prisma';

// ─── Public Course Listing ────────────────────────────────────────────────────

export class CourseService {
  /**
   * List all published courses with enrollment count.
   * Optionally includes the requesting user's enrollment status.
   */
  static async listCourses(userId?: string) {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        thumbnail: true,
        difficulty: true,
        order: true,
        createdAt: true,
        _count: { select: { modules: true, enrollments: true } },
        modules: {
          orderBy: { order: 'asc' },
          select: {
            _count: { select: { lessons: true } },
          },
        },
      },
    });

    // Calculate total lessons and check enrollment for user
    let enrolledSlugs: Set<string> = new Set();
    if (userId) {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        select: { course: { select: { slug: true } } },
      });
      enrolledSlugs = new Set(enrollments.map((e: { course: { slug: string } }) => e.course.slug));
    }

    return courses.map((c: (typeof courses)[number]) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      thumbnail: c.thumbnail,
      difficulty: c.difficulty,
      moduleCount: c._count.modules,
      enrollmentCount: c._count.enrollments,
      lessonCount: c.modules.reduce(
        (sum: number, m: { _count: { lessons: number } }) => sum + m._count.lessons,
        0,
      ),
      isEnrolled: enrolledSlugs.has(c.slug),
    }));
  }

  /**
   * Get a single course with full module/lesson tree.
   * Includes the user's progress for each lesson if enrolled.
   */
  static async getCourseBySlug(slug: string, userId?: string) {
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                order: true,
                xpReward: true,
                // content is heavy — only fetched in getLesson()
              },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course || !course.isPublished) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Course not found', 404);
    }

    // Check enrollment
    let enrollment = null;
    let lessonProgress: Record<string, boolean> = {};

    if (userId) {
      enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
      });

      if (enrollment) {
        const allLessonIds = course.modules.flatMap((m: { lessons: { id: string }[] }) =>
          m.lessons.map((l: { id: string }) => l.id),
        );
        const progress = await prisma.lessonProgress.findMany({
          where: { userId, lessonId: { in: allLessonIds } },
          select: { lessonId: true, completed: true },
        });
        lessonProgress = Object.fromEntries(
          progress.map((p: { lessonId: string; completed: boolean }) => [p.lessonId, p.completed]),
        );
      }
    }

    const totalLessons = course.modules.reduce(
      (s: number, m: { lessons: unknown[] }) => s + m.lessons.length,
      0,
    );
    const completedLessons = Object.values(lessonProgress).filter(Boolean).length;

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      difficulty: course.difficulty,
      enrollmentCount: course._count.enrollments,
      isEnrolled: !!enrollment,
      totalLessons,
      completedLessons,
      progressPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      modules: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        order: m.order,
        lessons: m.lessons.map((l) => ({
          ...l,
          completed: lessonProgress[l.id] ?? false,
        })),
      })),
    };
  }

  /**
   * Get a single lesson with full content.
   */
  static async getLesson(lessonId: string, userId?: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            course: {
              select: { id: true, slug: true, title: true, isPublished: true },
            },
          },
        },
      },
    });

    if (!lesson || !lesson.module.course.isPublished) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Lesson not found', 404);
    }

    // Get completion status
    let completed = false;
    if (userId) {
      const progress = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
      });
      completed = progress?.completed ?? false;
    }

    return {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      type: lesson.type,
      starterCode: lesson.starterCode,
      order: lesson.order,
      xpReward: lesson.xpReward,
      completed,
      module: {
        id: lesson.module.id,
        title: lesson.module.title,
      },
      course: {
        id: lesson.module.course.id,
        slug: lesson.module.course.slug,
        title: lesson.module.course.title,
      },
    };
  }

  /**
   * Enroll the user in a course.
   */
  static async enroll(userId: string, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true },
    });

    if (!course || !course.isPublished) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Course not found', 404);
    }

    // Upsert to be idempotent
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
    });

    return { enrolled: true };
  }

  /**
   * Mark a lesson as completed and award XP.
   * Automatically handles level-up if XP crosses a threshold.
   */
  static async completeLesson(userId: string, lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, xpReward: true },
    });

    if (!lesson) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Lesson not found', 404);
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Lock the user row to serialize all lesson completions for this user
      const users = await tx.$queryRaw<{ xp: number; level: number; lastActiveAt: Date }[]>`
        SELECT xp, level, "lastActiveAt" FROM users WHERE id = ${userId} FOR UPDATE
      `;

      if (!users || users.length === 0) {
        throw new AppError('UNAUTHORIZED', 'User not found', 401);
      }

      const user = users[0];
      if (!user) {
        throw new AppError('UNAUTHORIZED', 'User not found', 401);
      }

      // 2. Check if progress exists and is completed inside the transaction
      const existing = await tx.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
      });

      if (existing?.completed) {
        return { alreadyCompleted: true };
      }

      // 3. Mark complete
      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId, completed: true, completedAt: new Date() },
        update: { completed: true, completedAt: new Date() },
      });

      // 4. Calculate level and streak changes
      const newXp = user.xp + lesson.xpReward;
      const newLevel = CourseService.calculateLevel(newXp);
      const levelUp = newLevel > user.level;

      const now = new Date();
      const lastDate = new Date(user.lastActiveAt);
      const dayDiff = Math.floor((now.getTime() - lastDate.getTime()) / 86_400_000);

      // 5. Update user atomically inside transaction
      const updateData: Prisma.UserUpdateInput = {
        xp: newXp,
        level: newLevel,
        lastActiveAt: now,
      };

      if (dayDiff === 1) {
        updateData.streak = { increment: 1 };
      } else if (dayDiff !== 0) {
        updateData.streak = 1;
      }

      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      return {
        alreadyCompleted: false,
        xpAwarded: lesson.xpReward,
        levelUp,
        newLevel,
      };
    });

    if (result.alreadyCompleted) {
      return { alreadyCompleted: true, xpAwarded: 0, levelUp: false, newLevel: 0 };
    }

    return result;
  }

  /**
   * Level formula: floor(sqrt(xp / 25)) + 1
   * XP  0-24  → Level 1
   * XP  25-99 → Level 2
   * XP 100-224 → Level 3
   * XP 225-399 → Level 4
   * ...and so on
   */
  static calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 25)) + 1;
  }
}
