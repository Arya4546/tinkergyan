/**
 * course.controller.ts
 *
 * HTTP handlers for course browsing, enrollment, and lesson progress.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CourseService } from '../services/course.service';
import { BadgeService } from '../services/badge.service';
import { catchAsync } from '../utils/catchAsync';

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const courseSlugSchema = z.object({
  params: z.object({ slug: z.string().min(1) }),
});

export const lessonIdSchema = z.object({
  params: z.object({ lessonId: z.string().min(1) }),
});

export const enrollSchema = z.object({
  body: z.object({ courseId: z.string().min(1) }),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

/** List all published courses (auth optional for enrollment status) */
export const listCourses = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const courses = await CourseService.listCourses(userId);
  res.status(200).json({ success: true, data: { courses } });
});

/** Get single course detail with modules/lessons/progress */
export const getCourse = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const course = await CourseService.getCourseBySlug(req.params.slug!, userId);
  res.status(200).json({ success: true, data: { course } });
});

/** Get a single lesson with full content */
export const getLesson = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const lesson = await CourseService.getLesson(req.params.lessonId!, userId);
  res.status(200).json({ success: true, data: { lesson } });
});

/** Enroll in a course */
export const enrollCourse = catchAsync(async (req: Request, res: Response) => {
  const result = await CourseService.enroll(req.user!.id, req.body.courseId);
  res.status(200).json({ success: true, data: result });
});

/** Mark lesson as completed */
export const completeLesson = catchAsync(async (req: Request, res: Response) => {
  const result = await CourseService.completeLesson(req.user!.id, req.params.lessonId!);
  // Fire-and-forget badge checks
  BadgeService.tryAward(req.user!.id, 'COURSE_COMPLETE');
  BadgeService.tryAward(req.user!.id, 'XP_100');
  res.status(200).json({ success: true, data: result });
});
