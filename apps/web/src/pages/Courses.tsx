/**
 * Courses.tsx
 *
 * Course catalog page with difficulty badges, enrollment status,
 * and lesson counts.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, BookOpen, Users, ChevronRight,
  Zap, Loader2, CheckCircle2,
} from 'lucide-react';

import { courseService, type CourseSummary } from '../services/course.service';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Loader } from '../components/ui/Loader';

const DIFFICULTY_STYLES = {
  BEGINNER:     { label: 'BEGINNER',     bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  INTERMEDIATE: { label: 'INTERMEDIATE', bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/30' },
  ADVANCED:     { label: 'ADVANCED',     bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30' },
} as const;

export default function Courses() {
  const [courses, setCourses]   = useState<CourseSummary[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

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
      <PageHeader icon={GraduationCap} title="Quest Log" subtitle="LEARNING_MODULES" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-white dark:bg-[#0A0A0A]">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader message="LOADING_COURSES..." />
          </div>
        )}

        {!isLoading && error && (
          <div className="font-mono text-xs text-red-400 uppercase tracking-widest text-center py-12">{error}</div>
        )}

        {!isLoading && !error && courses.length === 0 && (
          <EmptyState
            icon={GraduationCap}
            title="NO_COURSES_AVAILABLE"
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
                  className="hw-border bg-slate-50 dark:bg-[#111111] flex flex-col group hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-colors overflow-hidden"
                >
                  {/* Gradient accent bar */}
                  <div className={`h-1.5 w-full ${
                    course.difficulty === 'BEGINNER' ? 'bg-emerald-500' :
                    course.difficulty === 'INTERMEDIATE' ? 'bg-yellow-400' : 'bg-red-500'
                  }`} />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Header: difficulty + enrolled */}
                    <div className="flex justify-between items-start mb-4">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${diff.bg} ${diff.text} border ${diff.border}`}>
                        <Zap size={8} /> {diff.label}
                      </div>
                      {course.isEnrolled && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          <CheckCircle2 size={8} /> ENROLLED
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-lg uppercase tracking-tight leading-tight mb-2 group-hover:text-white dark:group-hover:text-slate-900">
                      {course.title}
                    </h3>

                    {/* Description */}
                    <p className="font-mono text-[10px] text-slate-400 group-hover:text-slate-300 dark:group-hover:text-slate-600 leading-relaxed mb-4 line-clamp-3">
                      {course.description}
                    </p>

                    {/* Stats */}
                    <div className="mt-auto flex items-center gap-4 pt-4 hw-border-t group-hover:border-slate-800 dark:group-hover:border-slate-200">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 uppercase">
                        <BookOpen size={10} /> {course.moduleCount} modules
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 uppercase">
                        <GraduationCap size={10} /> {course.lessonCount} lessons
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 uppercase">
                        <Users size={10} /> {course.enrollmentCount}
                      </div>
                      <ChevronRight size={12} className="ml-auto text-slate-400 group-hover:text-white dark:group-hover:text-slate-900" />
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
