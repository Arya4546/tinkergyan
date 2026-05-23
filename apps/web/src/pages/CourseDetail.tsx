/**
 * CourseDetail.tsx
 *
 * Single course view with module/lesson tree, progress bar,
 * enrollment CTA, and navigation to individual lessons.
 */
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  GraduationCap, BookOpen, ChevronLeft, Users, Zap,
  CheckCircle2, Circle, Code2, FileText, Loader2,
} from 'lucide-react';

import { courseService, type CourseDetail as CourseDetailType } from '../services/course.service';
import { useUIStore } from '../stores/ui.store';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';

const LESSON_TYPE_ICON = {
  READING: FileText,
  CODING:  Code2,
  QUIZ:    Zap,
} as const;

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s: any) => s.addToast);

  const [course, setCourse]       = useState<CourseDetailType | null>(null);
  const [isLoading, setLoading]   = useState(true);
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
      setCourse((prev) => prev ? { ...prev, isEnrolled: true, enrollmentCount: prev.enrollmentCount + 1 } : null);
      addToast({ type: 'success', title: 'ENROLLED', message: `Welcome to ${course.title}!` });
    } catch {
      addToast({ type: 'error', title: 'ENROLL_FAILED', message: 'Could not enroll. Try again.' });
    } finally {
      setEnrolling(false);
    }
  };

  // Find the first incomplete lesson for "Continue" button
  const nextLesson = course?.modules
    .flatMap((m) => m.lessons)
    .find((l) => !l.completed);

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
      <div className="w-full hw-border-b bg-white dark:bg-[#000000] p-6 lg:p-10 shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 dark:hover:text-white mb-4"
          >
            <ChevronLeft size={12} /> QUEST_LOG
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest mb-3 ${
                course.difficulty === 'BEGINNER' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                course.difficulty === 'INTERMEDIATE' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
                'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                <Zap size={8} /> {course.difficulty}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase leading-none text-slate-900 dark:text-white mb-3">
                {course.title}
              </h1>
              <p className="font-mono text-xs text-slate-500 leading-relaxed max-w-lg">
                {course.description}
              </p>
            </div>

            <div className="flex gap-3 shrink-0">
              {!course.isEnrolled ? (
                <Button
                  variant="primary"
                  className="h-12 px-6 rounded-none"
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                >
                  {isEnrolling
                    ? <Loader2 size={14} className="animate-spin mr-2" />
                    : <GraduationCap size={14} className="mr-2" />
                  }
                  <span className="font-mono text-[10px] font-bold uppercase">
                    {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
                  </span>
                </Button>
              ) : nextLesson ? (
                <Link
                  to={`/courses/${course.slug}/lessons/${nextLesson.id}`}
                  className="h-12 px-6 hw-key bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 flex items-center gap-2"
                >
                  <BookOpen size={14} />
                  <span className="font-mono text-[10px] font-bold uppercase">Continue</span>
                </Link>
              ) : (
                <div className="h-12 px-6 hw-key bg-slate-800 text-emerald-400 border-slate-700 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  <span className="font-mono text-[10px] font-bold uppercase">Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-6 mt-6 pt-4 hw-border-t">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 uppercase">
              <BookOpen size={10} /> {course.modules.length} modules
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 uppercase">
              <GraduationCap size={10} /> {course.totalLessons} lessons
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 uppercase">
              <Users size={10} /> {course.enrollmentCount} enrolled
            </div>
            {course.isEnrolled && (
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 uppercase">
                <Zap size={10} /> {course.progressPct}% complete
              </div>
            )}
          </div>

          {/* Progress bar */}
          {course.isEnrolled && (
            <div className="mt-3 w-full h-2 bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${course.progressPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Module / Lesson Tree */}
      <div className="flex-1 p-6 lg:p-10 bg-white dark:bg-[#0A0A0A]">
        <div className="max-w-4xl mx-auto space-y-6">
          {course.modules.map((mod, mi) => (
            <div key={mod.id} className="hw-border bg-slate-50 dark:bg-[#111111] overflow-hidden">
              {/* Module header */}
              <div className="px-5 py-4 bg-slate-900 dark:bg-white flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-slate-700 dark:border-slate-300 flex items-center justify-center font-mono text-xs font-bold text-white dark:text-slate-900">
                  {mi + 1}
                </div>
                <span className="font-mono text-sm font-bold uppercase tracking-widest text-white dark:text-slate-900">
                  {mod.title}
                </span>
                <span className="ml-auto font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase">
                  {mod.lessons.filter((l) => l.completed).length}/{mod.lessons.length} done
                </span>
              </div>

              {/* Lessons */}
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
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
                          addToast({ type: 'info', title: 'ENROLL_FIRST', message: 'Enroll to access lessons.' });
                        }
                      }}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors group ${
                        course.isEnrolled
                          ? 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                          : 'opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* Status icon */}
                      {isComplete
                        ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        : <Circle size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                      }

                      {/* Type icon */}
                      <TypeIcon size={14} className="text-slate-400 shrink-0" />

                      {/* Title */}
                      <span className={`font-mono text-xs font-bold uppercase tracking-widest flex-1 ${
                        isComplete ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'
                      }`}>
                        {lesson.title}
                      </span>

                      {/* Type badge */}
                      <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest hidden sm:block">
                        {lesson.type}
                      </span>

                      {/* XP */}
                      <span className="font-mono text-[10px] font-bold text-yellow-400 uppercase flex items-center gap-1">
                        <Zap size={8} /> {lesson.xpReward}xp
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
