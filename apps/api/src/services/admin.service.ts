/**
 * admin.service.ts
 *
 * Read-only views of everything on the platform, for the super admin portal.
 * Nothing here ever selects passwordHash or refresh-token fields.
 */
import type { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';
import { prisma } from '../lib/prisma';

export type ProjectKind = 'ai' | 'software' | 'hardware';

export const projectKind = (boardTarget: string): ProjectKind =>
  boardTarget === 'ai' ? 'ai' : boardTarget === 'software' ? 'software' : 'hardware';

const kindWhere = (kind: ProjectKind): Prisma.ProjectWhereInput =>
  kind === 'hardware' ? { boardTarget: { notIn: ['ai', 'software'] } } : { boardTarget: kind };

const pageOf = (page: number, pageSize: number) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

const DAY = 24 * 60 * 60 * 1000;

export interface ListUsersQuery {
  search?: string | undefined;
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | undefined;
  sort: 'newest' | 'oldest' | 'xp' | 'active' | 'name';
  page: number;
  pageSize: number;
}

export interface ListProjectsQuery {
  search?: string | undefined;
  kind?: ProjectKind | undefined;
  userId?: string | undefined;
  visibility?: 'public' | 'private' | undefined;
  page: number;
  pageSize: number;
}

export class AdminService {
  // ── Overview ───────────────────────────────────────────────────────────────

  static async getStats() {
    const now = Date.now();
    const d7 = new Date(now - 7 * DAY);
    const d30 = new Date(now - 30 * DAY);
    const d14 = new Date(now - 14 * DAY);

    const [
      totalUsers,
      newUsers7,
      newUsers30,
      activeUsers7,
      totalProjects,
      publicProjects,
      aiProjects,
      softwareProjects,
      publishedCourses,
      totalCourses,
      enrollments,
      completedLessons,
      recentSignups,
      recentUsers,
      recentProjects,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: d7 } } }),
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: d30 } } }),
      prisma.user.count({ where: { role: 'USER', lastActiveAt: { gte: d7 } } }),
      prisma.project.count(),
      prisma.project.count({ where: { isPublic: true } }),
      prisma.project.count({ where: kindWhere('ai') }),
      prisma.project.count({ where: kindWhere('software') }),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.lessonProgress.count({ where: { completed: true } }),
      prisma.user.findMany({
        where: { role: 'USER', createdAt: { gte: d14 } },
        select: { createdAt: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          boardTarget: true,
          updatedAt: true,
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Sign-ups per day for the last 14 days (oldest first, zeros included).
    const perDay = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      perDay.set(new Date(now - i * DAY).toISOString().slice(0, 10), 0);
    }
    for (const u of recentSignups) {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }

    return {
      users: { total: totalUsers, new7d: newUsers7, new30d: newUsers30, active7d: activeUsers7 },
      projects: {
        total: totalProjects,
        public: publicProjects,
        ai: aiProjects,
        software: softwareProjects,
        hardware: totalProjects - aiProjects - softwareProjects,
      },
      learning: {
        publishedCourses,
        totalCourses,
        enrollments,
        completedLessons,
      },
      signupsByDay: [...perDay.entries()].map(([date, count]) => ({ date, count })),
      recentUsers,
      recentProjects: recentProjects.map((p) => ({ ...p, kind: projectKind(p.boardTarget) })),
    };
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  static async listUsers(q: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      ...(q.role && { role: q.role }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { email: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };
    const orderBy: Prisma.UserOrderByWithRelationInput =
      q.sort === 'oldest'
        ? { createdAt: 'asc' }
        : q.sort === 'xp'
          ? { xp: 'desc' }
          : q.sort === 'active'
            ? { lastActiveAt: 'desc' }
            : q.sort === 'name'
              ? { name: 'asc' }
              : { createdAt: 'desc' };

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        ...pageOf(q.page, q.pageSize),
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
          xp: true,
          level: true,
          streak: true,
          lastActiveAt: true,
          createdAt: true,
          _count: { select: { projects: true, enrollments: true, userBadges: true } },
        },
      }),
    ]);

    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      users: rows.map(({ _count, ...u }) => ({
        ...u,
        projectCount: _count.projects,
        enrollmentCount: _count.enrollments,
        badgeCount: _count.userBadges,
      })),
    };
  }

  static async getUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        xp: true,
        level: true,
        streak: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        preferences: true,
        projects: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            type: true,
            boardTarget: true,
            isPublic: true,
            forkCount: true,
            forkedFrom: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        enrollments: {
          orderBy: { enrolledAt: 'desc' },
          select: {
            enrolledAt: true,
            course: {
              select: {
                id: true,
                slug: true,
                title: true,
                difficulty: true,
                modules: { select: { _count: { select: { lessons: true } } } },
              },
            },
          },
        },
        userBadges: {
          orderBy: { earnedAt: 'desc' },
          select: {
            earnedAt: true,
            badge: { select: { id: true, slug: true, title: true, description: true, icon: true } },
          },
        },
      },
    });
    if (!user) throw new AppError('RESOURCE_NOT_FOUND', 'User not found', 404);

    // Lessons this user finished, tallied per course.
    const done = await prisma.lessonProgress.findMany({
      where: { userId: id, completed: true },
      select: { lesson: { select: { module: { select: { courseId: true } } } } },
    });
    const doneByCourse = new Map<string, number>();
    for (const d of done) {
      const cid = d.lesson.module.courseId;
      doneByCourse.set(cid, (doneByCourse.get(cid) ?? 0) + 1);
    }

    const { projects, enrollments, userBadges, ...profile } = user;
    return {
      ...profile,
      projects: projects.map((p) => ({ ...p, kind: projectKind(p.boardTarget) })),
      enrollments: enrollments.map((e) => {
        const totalLessons = e.course.modules.reduce((n, m) => n + m._count.lessons, 0);
        const completed = doneByCourse.get(e.course.id) ?? 0;
        return {
          enrolledAt: e.enrolledAt,
          course: {
            id: e.course.id,
            slug: e.course.slug,
            title: e.course.title,
            difficulty: e.course.difficulty,
          },
          totalLessons,
          completedLessons: completed,
          percent: totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100),
        };
      }),
      badges: userBadges.map((b) => ({ earnedAt: b.earnedAt, ...b.badge })),
      totals: {
        projects: projects.length,
        completedLessons: done.length,
        badges: userBadges.length,
      },
    };
  }

  // ── Projects ───────────────────────────────────────────────────────────────

  static async listProjects(q: ListProjectsQuery) {
    const where: Prisma.ProjectWhereInput = {
      ...(q.kind && kindWhere(q.kind)),
      ...(q.userId && { userId: q.userId }),
      ...(q.visibility && { isPublic: q.visibility === 'public' }),
      ...(q.search && {
        OR: [
          { title: { contains: q.search, mode: 'insensitive' } },
          { user: { name: { contains: q.search, mode: 'insensitive' } } },
          { user: { email: { contains: q.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, rows] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        ...pageOf(q.page, q.pageSize),
        select: {
          id: true,
          title: true,
          type: true,
          boardTarget: true,
          isPublic: true,
          forkCount: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      projects: rows.map((p) => ({ ...p, kind: projectKind(p.boardTarget) })),
    };
  }

  /** One project with its full contents (code and block/AI data). */
  static async getProject(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        type: true,
        code: true,
        blockState: true,
        boardTarget: true,
        isPublic: true,
        forkCount: true,
        forkedFrom: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!project) throw new AppError('RESOURCE_NOT_FOUND', 'Project not found', 404);
    return { ...project, kind: projectKind(project.boardTarget) };
  }
}
