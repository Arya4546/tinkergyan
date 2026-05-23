/**
 * EmptyState.tsx
 *
 * Generic empty-state component for pages with no data.
 * Consistent visual language across Projects, Courses, etc.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon:       LucideIcon;
  title:      string;
  subtitle?:  string;
  children?:  ReactNode;
}

export function EmptyState({ icon: Icon, title, subtitle, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 hw-border bg-slate-50 dark:bg-[#111111] flex items-center justify-center mb-4 opacity-40">
        <Icon size={28} />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-2">
        {title}
      </p>
      {subtitle && (
        <p className="font-mono text-[10px] text-slate-400 opacity-60 mb-6">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
