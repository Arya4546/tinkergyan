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
      <div className="w-20 h-20 rounded-3xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/50 flex items-center justify-center mb-5 text-playful-primary dark:text-playful-highlight shadow-sm">
        <Icon size={32} strokeWidth={1.8} />
      </div>
      <h3 className="font-heading font-black text-xl text-tg-dark dark:text-white mb-2">{title}</h3>
      {subtitle && (
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
