/**
 * course.service.ts (frontend)
 *
 * API client for course browsing, enrollment, and lesson progress.
 */
import { api } from './api';

export interface CourseSummary {
  id:              string;
  slug:            string;
  title:           string;
  description:     string;
  thumbnail:       string | null;
  difficulty:      'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  moduleCount:     number;
  enrollmentCount: number;
  lessonCount:     number;
  isEnrolled:      boolean;
}

export interface LessonSummary {
  id:        string;
  title:     string;
  type:      'READING' | 'CODING' | 'QUIZ';
  order:     number;
  xpReward:  number;
  completed: boolean;
}

export interface ModuleDetail {
  id:      string;
  title:   string;
  order:   number;
  lessons: LessonSummary[];
}

export interface CourseDetail {
  id:              string;
  slug:            string;
  title:           string;
  description:     string;
  thumbnail:       string | null;
  difficulty:      'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  enrollmentCount: number;
  isEnrolled:      boolean;
  totalLessons:    number;
  completedLessons: number;
  progressPct:     number;
  modules:         ModuleDetail[];
}

export interface LessonDetail {
  id:          string;
  title:       string;
  content:     string;
  type:        'READING' | 'CODING' | 'QUIZ';
  starterCode: string | null;
  order:       number;
  xpReward:    number;
  completed:   boolean;
  module:      { id: string; title: string };
  course:      { id: string; slug: string; title: string };
}

export const courseService = {
  async list(): Promise<CourseSummary[]> {
    const { data } = await api.get('/courses');
    return data.data.courses as CourseSummary[];
  },

  async get(slug: string): Promise<CourseDetail> {
    const { data } = await api.get(`/courses/${slug}`);
    return data.data.course as CourseDetail;
  },

  async getLesson(lessonId: string): Promise<LessonDetail> {
    const { data } = await api.get(`/courses/lessons/${lessonId}`);
    return data.data.lesson as LessonDetail;
  },

  async enroll(courseId: string): Promise<void> {
    await api.post('/courses/enroll', { courseId });
  },

  async completeLesson(lessonId: string): Promise<{ alreadyCompleted: boolean; xpAwarded: number }> {
    const { data } = await api.post(`/courses/lessons/${lessonId}/complete`);
    return data.data;
  },
};
