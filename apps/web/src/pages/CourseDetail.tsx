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
    <div className="w-full h-full flex flex-col font-playful overflow-y-auto bg-transparent">
      {/* Hero Header */}
      <div className="w-full border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl p-6 lg:p-10 shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-playful-primary dark:hover:text-playful-highlight mb-4 transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />{' '}
            Back to Courses
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide mb-3 ${
                  course.difficulty === 'BEGINNER'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                    : course.difficulty === 'INTERMEDIATE'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60'
                }`}
              >
                <Zap size={12} className="fill-current" /> {course.difficulty}
              </div>
              <h1 className="font-heading font-black text-3xl md:text-4xl tracking-tight text-tg-dark dark:text-white mb-3">
                {course.title}
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                {course.description}
              </p>
            </div>

            <div className="flex gap-3 shrink-0">
              {!course.isEnrolled ? (
                <button
                  className="h-12 px-7 rounded-2xl bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary text-white font-black text-sm transition-all shadow-[0_4px_16px_rgba(108,92,231,0.35)] flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                >
                  {isEnrolling ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <GraduationCap size={18} />
                  )}
                  <span>{isEnrolling ? 'Enrolling...' : 'Enroll Now'}</span>
                </button>
              ) : nextLesson ? (
                <Link
                  to={`/courses/${course.slug}/lessons/${nextLesson.id}`}
                  className="h-12 px-7 rounded-2xl bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary text-white font-black text-sm transition-all shadow-[0_4px_16px_rgba(108,92,231,0.35)] flex items-center gap-2 hover:-translate-y-0.5"
                >
                  <BookOpen size={18} />
                  <span>Continue Quest</span>
                </Link>
              ) : (
                <div className="h-12 px-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 font-black text-sm">
                  <CheckCircle2 size={18} />
                  <span>Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-8 pt-6 border-t border-slate-200/80 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              <BookOpen size={16} /> {course.modules.length} modules
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              <GraduationCap size={16} /> {course.totalLessons} lessons
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              <Users size={16} /> {course.enrollmentCount} makers enrolled
            </div>
            {course.isEnrolled && (
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-playful-primary dark:text-playful-highlight">
                <Zap size={16} className="fill-current" /> {course.progressPct}% complete
              </div>
            )}
          </div>

          {/* Progress bar */}
          {course.isEnrolled && (
            <div className="mt-4 w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-playful-primary via-purple-500 to-playful-highlight rounded-full transition-all duration-500"
                style={{ width: `${course.progressPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Module / Lesson Tree */}
      <div className="flex-1 p-6 lg:p-10 bg-transparent">
        <div className="max-w-4xl mx-auto space-y-6">
          {course.modules.map((mod, mi) => (
            <div
              key={mod.id}
              className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#141824]/90 backdrop-blur-md overflow-hidden shadow-2xs"
            >
              {/* Module header */}
              <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-[#11141E]/70 flex items-center gap-4">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-xs font-black text-playful-primary dark:text-playful-highlight border border-purple-200/60 dark:border-purple-800/60">
                  {mi + 1}
                </div>
                <span className="font-heading font-black text-base text-tg-dark dark:text-white">
                  {mod.title}
                </span>
                <span className="ml-auto text-xs font-bold text-slate-400 dark:text-slate-500">
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
                      className={`flex items-center gap-4 px-6 py-4.5 transition-colors group ${
                        course.isEnrolled
                          ? 'hover:bg-purple-50/40 dark:hover:bg-white/5 cursor-pointer'
                          : 'opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* Status icon */}
                      {isComplete ? (
                        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Circle
                          size={20}
                          className="text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-playful-primary transition-colors"
                        />
                      )}

                      {/* Type icon */}
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <TypeIcon size={16} className="text-slate-500 dark:text-slate-400" />
                      </div>

                      {/* Title */}
                      <span
                        className={`text-sm font-bold flex-1 ${
                          isComplete
                            ? 'text-slate-400 line-through'
                            : 'text-slate-700 dark:text-slate-200 group-hover:text-playful-primary dark:group-hover:text-playful-highlight'
                        }`}
                      >
                        {lesson.title}
                      </span>

                      {/* Type badge */}
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 hidden sm:block bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                        {lesson.type}
                      </span>

                      {/* XP */}
                      <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 px-2.5 py-1 rounded-lg">
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
