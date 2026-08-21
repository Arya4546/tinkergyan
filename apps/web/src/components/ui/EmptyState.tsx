/**
 * EmptyState.tsx
 *
 * Generic empty-state component for pages with no data.
 * Consistent visual language across Projects, Courses, etc.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, subtitle, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#111111] flex items-center justify-center mb-6 text-slate-400">
        <Icon size={28} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      {subtitle && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
