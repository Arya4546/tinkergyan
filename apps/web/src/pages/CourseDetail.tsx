/**
 * CourseDetail.tsx
 *
 * Single course view with module/lesson tree, progress bar,
 * enrollment CTA, and navigation to individual lessons.
 */
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  ChevronLeft,
  Users,
  Zap,
  CheckCircle2,
  Circle,
  Code2,
  FileText,
  Loader2,
} from 'lucide-react';

import { courseService, type CourseDetail as CourseDetailType } from '../services/course.service';
import { useUIStore } from '../stores/ui.store';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';

const LESSON_TYPE_ICON = {
  READING: FileText,
  CODING: Code2,
  QUIZ: Zap,
} as const;

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s: any) => s.addToast);

  const [course, setCourse] = useState<CourseDetailType | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isEnrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const data = await courseService.get(slug);
        setCourse(data);
      } catch {
        addToast({ type: 'error', title: 'LOAD_FAILED', message: 'Course not found.' });
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, navigate, addToast]);

  const handleEnroll = async () => {
    if (!course) return;
    setEnrolling(true);
    try {
      await courseService.enroll(course.id);
      setCourse((prev) =>
        prev ? { ...prev, isEnrolled: true, enrollmentCount: prev.enrollmentCount + 1 } : null,
      );
      addToast({ type: 'success', title: 'ENROLLED', message: `Welcome to ${course.title}!` });
    } catch {
      addToast({ type: 'error', title: 'ENROLL_FAILED', message: 'Could not enroll. Try again.' });
    } finally {
      setEnrolling(false);
    }
  };

  // Find the first incomplete lesson for "Continue" button
  const nextLesson = course?.modules.flatMap((m) => m.lessons).find((l) => !l.completed);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader message="LOADING_COURSE..." />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      {/* Hero Header */}
      <div className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#000000] p-6 lg:p-10 shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Courses
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold mb-4 ${
                  course.difficulty === 'BEGINNER'
                    ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                    : course.difficulty === 'INTERMEDIATE'
                      ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30'
                      : 'bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/30'
                }`}
              >
                <Zap size={12} /> {course.difficulty}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
                {course.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                {course.description}
              </p>
            </div>

            <div className="flex gap-3 shrink-0">
              {!course.isEnrolled ? (
                <Button
                  variant="primary"
                  className="h-12 px-6 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                >
                  {isEnrolling ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <GraduationCap size={16} className="mr-2" />
                  )}
                  <span>{isEnrolling ? 'Enrolling...' : 'Enroll Now'}</span>
                </Button>
              ) : nextLesson ? (
                <Link
                  to={`/courses/${course.slug}/lessons/${nextLesson.id}`}
                  className="h-12 px-6 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <BookOpen size={16} />
                  <span>Continue</span>
                </Link>
              ) : (
                <div className="h-12 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-500 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 flex items-center gap-2 font-bold">
                  <CheckCircle2 size={16} />
                  <span>Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <BookOpen size={16} /> {course.modules.length} modules
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <GraduationCap size={16} /> {course.totalLessons} lessons
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <Users size={16} /> {course.enrollmentCount} enrolled
            </div>
            {course.isEnrolled && (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-500 dark:text-emerald-400">
                <Zap size={16} /> {course.progressPct}% complete
              </div>
            )}
          </div>

          {/* Progress bar */}
          {course.isEnrolled && (
            <div className="mt-4 w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${course.progressPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Module / Lesson Tree */}
      <div className="flex-1 p-6 lg:p-10 bg-slate-50 dark:bg-[#0A0A0A]">
        <div className="max-w-4xl mx-auto space-y-6">
          {course.modules.map((mod, mi) => (
            <div
              key={mod.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111111] overflow-hidden shadow-sm"
            >
              {/* Module header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-[#111111] flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {mi + 1}
                </div>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {mod.title}
                </span>
                <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {mod.lessons.filter((l) => l.completed).length}/{mod.lessons.length} completed
                </span>
              </div>

              {/* Lessons */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {mod.lessons.map((lesson) => {
                  const TypeIcon = LESSON_TYPE_ICON[lesson.type] || FileText;
                  const isComplete = lesson.completed;

                  return (
                    <Link
                      key={lesson.id}
                      to={course.isEnrolled ? `/courses/${course.slug}/lessons/${lesson.id}` : '#'}
                      onClick={(e) => {
                        if (!course.isEnrolled) {
                          e.preventDefault();
                          addToast({
                            type: 'info',
                            title: 'ENROLL_FIRST',
                            message: 'Enroll to access lessons.',
                          });
                        }
                      }}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors group ${
                        course.isEnrolled
                          ? 'hover:bg-slate-50 dark:hover:bg-[#1A1D24] cursor-pointer'
                          : 'opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* Status icon */}
                      {isComplete ? (
                        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Circle
                          size={20}
                          className="text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-emerald-400 transition-colors"
                        />
                      )}

                      {/* Type icon */}
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <TypeIcon size={16} className="text-slate-500 dark:text-slate-400" />
                      </div>

                      {/* Title */}
                      <span
                        className={`text-sm font-semibold flex-1 ${
                          isComplete
                            ? 'text-slate-500 line-through'
                            : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}
                      >
                        {lesson.title}
                      </span>

                      {/* Type badge */}
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 hidden sm:block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {lesson.type}
                      </span>

                      {/* XP */}
                      <span className="text-xs font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-md">
                        <Zap size={12} className="fill-current" /> {lesson.xpReward} XP
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
