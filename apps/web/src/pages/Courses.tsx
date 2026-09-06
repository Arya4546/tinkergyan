/**
 * Courses.tsx
 *
 * Course catalog page with difficulty badges, enrollment status,
 * and lesson counts.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Users, ChevronRight, Zap, CheckCircle2 } from 'lucide-react';

import { courseService, type CourseSummary } from '../services/course.service';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Loader } from '../components/ui/Loader';

const DIFFICULTY_STYLES = {
  BEGINNER: {
    label: 'BEGINNER',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/80 dark:border-emerald-800/60',
    gradient: 'from-emerald-400 to-teal-500',
  },
  INTERMEDIATE: {
    label: 'INTERMEDIATE',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/80 dark:border-amber-800/60',
    gradient: 'from-amber-400 to-orange-500',
  },
  ADVANCED: {
    label: 'ADVANCED',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200/80 dark:border-rose-800/60',
    gradient: 'from-rose-500 to-purple-600',
  },
} as const;

export default function Courses() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await courseService.list();
        setCourses(data);
      } catch {
        setError('Failed to load courses.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="w-full h-full flex flex-col font-playful bg-transparent">
      <PageHeader
        icon={GraduationCap}
        title="Quest Log"
        subtitle="Explore maker pathways from beginner electronics to advanced coding"
      />

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-transparent">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader message="Loading quests..." />
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {!isLoading && !error && courses.length === 0 && (
          <EmptyState
            icon={GraduationCap}
            title="No Courses Available"
            subtitle="Courses are being prepared by makers. Check back soon!"
          />
        )}

        {!isLoading && !error && courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {courses.map((course) => {
              const diff = DIFFICULTY_STYLES[course.difficulty];
              return (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#141824]/90 backdrop-blur-md flex flex-col group hover:border-purple-300 dark:hover:border-purple-500/40 shadow-2xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden relative"
                >
                  {/* Gradient accent bar */}
                  <div className={`h-2 w-full bg-gradient-to-r ${diff.gradient}`} />

                  <div className="p-6 flex flex-col flex-1">
                    {/* Header: difficulty + enrolled */}
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide ${diff.bg} ${diff.text} border ${diff.border}`}
                      >
                        <Zap size={12} className="fill-current" /> {diff.label}
                      </div>
                      {course.isEnrolled && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-50 dark:bg-purple-950/50 text-playful-primary dark:text-playful-highlight border border-purple-200/80 dark:border-purple-800/60">
                          <CheckCircle2 size={12} /> Enrolled
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-heading font-black text-xl text-tg-dark dark:text-white leading-snug mb-2 group-hover:text-playful-primary dark:group-hover:text-playful-highlight transition-colors">
                      {course.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-3">
                      {course.description}
                    </p>

                    {/* Stats */}
                    <div className="mt-auto flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <BookOpen size={14} /> {course.moduleCount} modules
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <GraduationCap size={14} /> {course.lessonCount} lessons
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <Users size={14} /> {course.enrollmentCount}
                      </div>
                      <ChevronRight
                        size={18}
                        className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-playful-primary dark:group-hover:text-playful-highlight group-hover:translate-x-1 transition-all"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
