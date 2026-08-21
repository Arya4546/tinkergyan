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
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  INTERMEDIATE: {
    label: 'INTERMEDIATE',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
  ADVANCED: {
    label: 'ADVANCED',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
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
    <div className="w-full h-full flex flex-col">
      <PageHeader icon={GraduationCap} title="Quest Log" subtitle="Learning Modules" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-white dark:bg-[#0A0A0A]">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader message="Loading courses..." />
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
            subtitle="Courses are being prepared. Check back soon!"
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
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111111] flex flex-col group hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-md transition-all overflow-hidden relative"
                >
                  {/* Gradient accent bar */}
                  <div
                    className={`h-1.5 w-full ${
                      course.difficulty === 'BEGINNER'
                        ? 'bg-emerald-500'
                        : course.difficulty === 'INTERMEDIATE'
                          ? 'bg-yellow-400'
                          : 'bg-red-500'
                    }`}
                  />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Header: difficulty + enrolled */}
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${diff.bg} ${diff.text} border ${diff.border}`}
                      >
                        <Zap size={12} /> {diff.label}
                      </div>
                      {course.isEnrolled && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/30">
                          <CheckCircle2 size={12} /> Enrolled
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {course.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-3">
                      {course.description}
                    </p>

                    {/* Stats */}
                    <div className="mt-auto flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <BookOpen size={14} /> {course.moduleCount} modules
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <GraduationCap size={14} /> {course.lessonCount} lessons
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <Users size={14} /> {course.enrollmentCount}
                      </div>
                      <ChevronRight
                        size={16}
                        className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors"
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
