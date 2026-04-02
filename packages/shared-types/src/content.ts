import type { Cuid, Difficulty } from './common';
import type { Badge, Course, CourseProgress, Lesson } from './entities';

/** Query params accepted by the course listing endpoint. */
export interface CourseListQuery {
  difficulty?: Difficulty;
  search?: string;
  page?: number;
  limit?: number;
}

/** Data returned by the course catalog endpoint. */
export interface CourseListResponseData {
  courses: Course[];
}

/** Data returned by the course detail endpoint. */
export interface CourseDetailResponseData {
  course: Course;
}

/** Data returned after a user enrolls in a course. */
export interface EnrollCourseResponseData {
  enrollmentId: Cuid;
  courseId: Cuid;
}

/** Data returned when querying progress for a course. */
export interface CourseProgressResponseData {
  progress: CourseProgress;
}

/** Data returned by the lesson content endpoint. */
export interface LessonResponseData {
  lesson: Lesson;
}

/** Navigation target used after completing a lesson. */
export interface NextLessonReference {
  id: Cuid;
  title: string;
}

/** Result returned when a lesson is marked as complete. */
export interface CompleteLessonResponseData {
  xpEarned: number;
  totalXp: number;
  levelUp: boolean;
  badgesEarned: Badge[];
  nextLesson: NextLessonReference | null;
}
