/**
 * course.service.ts
 *
 * Business logic for courses, enrollment, and lesson progress.
 * All ownership and authorization checks happen here.
 */
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
      where:   { isPublished: true },
      orderBy: { order: 'asc' },
      select: {
        id:          true,
        slug:        true,
        title:       true,
        description: true,
        thumbnail:   true,
        difficulty:  true,
        order:       true,
        createdAt:   true,
        _count:      { select: { modules: true, enrollments: true } },
        modules:     {
          orderBy: { order: 'asc' },
          select:  {
            _count: { select: { lessons: true } },
          },
        },
      },
    });

    // Calculate total lessons and check enrollment for user
    let enrolledSlugs: Set<string> = new Set();
    if (userId) {
      const enrollments = await prisma.enrollment.findMany({
        where:  { userId },
        select: { course: { select: { slug: true } } },
      });
      enrolledSlugs = new Set(enrollments.map((e: { course: { slug: string } }) => e.course.slug));
    }

    return courses.map((c: typeof courses[number]) => ({
      id:              c.id,
      slug:            c.slug,
      title:           c.title,
      description:     c.description,
      thumbnail:       c.thumbnail,
      difficulty:      c.difficulty,
      moduleCount:     c._count.modules,
      enrollmentCount: c._count.enrollments,
      lessonCount:     c.modules.reduce((sum: number, m: { _count: { lessons: number } }) => sum + m._count.lessons, 0),
      isEnrolled:      enrolledSlugs.has(c.slug),
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
                id:          true,
                title:       true,
                type:        true,
                order:       true,
                xpReward:    true,
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
        const allLessonIds = course.modules.flatMap((m: { lessons: { id: string }[] }) => m.lessons.map((l: { id: string }) => l.id));
        const progress = await prisma.lessonProgress.findMany({
          where: { userId, lessonId: { in: allLessonIds } },
          select: { lessonId: true, completed: true },
        });
        lessonProgress = Object.fromEntries(
          progress.map((p: { lessonId: string; completed: boolean }) => [p.lessonId, p.completed]),
        );
      }
    }

    const totalLessons     = course.modules.reduce((s: number, m: { lessons: unknown[] }) => s + m.lessons.length, 0);
    const completedLessons = Object.values(lessonProgress).filter(Boolean).length;

    return {
      id:              course.id,
      slug:            course.slug,
      title:           course.title,
      description:     course.description,
      thumbnail:       course.thumbnail,
      difficulty:      course.difficulty,
      enrollmentCount: course._count.enrollments,
      isEnrolled:      !!enrollment,
      totalLessons,
      completedLessons,
      progressPct:     totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      modules: course.modules.map((m: any) => ({
        id:    m.id,
        title: m.title,
        order: m.order,
        lessons: m.lessons.map((l: any) => ({
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
      id:          lesson.id,
      title:       lesson.title,
      content:     lesson.content,
      type:        lesson.type,
      starterCode: lesson.starterCode,
      order:       lesson.order,
      xpReward:    lesson.xpReward,
      completed,
      module: {
        id:    lesson.module.id,
        title: lesson.module.title,
      },
      course: {
        id:   lesson.module.course.id,
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
      where:  { userId_courseId: { userId, courseId } },
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

    // Check if already completed
    const existing = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    if (existing?.completed) {
      return { alreadyCompleted: true, xpAwarded: 0, levelUp: false, newLevel: 0 };
    }

    // Mark complete + award XP atomically
    await prisma.$transaction([
      prisma.lessonProgress.upsert({
        where:  { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId, completed: true, completedAt: new Date() },
        update: { completed: true, completedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data:  { xp: { increment: lesson.xpReward } },
      }),
    ]);

    // Calculate new level and update if changed
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, lastActiveAt: true },
    });

    const newLevel = CourseService.calculateLevel(user!.xp);
    const levelUp  = newLevel > user!.level;

    // Update level + streak in one call
    const now      = new Date();
    const lastDate = user!.lastActiveAt;
    const dayDiff  = Math.floor((now.getTime() - lastDate.getTime()) / 86_400_000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        level:        newLevel,
        lastActiveAt: now,
        // If last active yesterday, increment streak. If today, keep. Otherwise reset to 1.
        streak: dayDiff === 1 ? { increment: 1 } : dayDiff === 0 ? undefined : 1,
      },
    });

    return {
      alreadyCompleted: false,
      xpAwarded:        lesson.xpReward,
      levelUp,
      newLevel,
    };
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
