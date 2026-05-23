/**
 * PageHeader.tsx
 *
 * Consistent page header with title, subtitle, and optional action buttons.
 * Used by Projects, Profile, Settings, Courses pages.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon:      LucideIcon;
  title:     string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="w-full hw-border-b bg-white dark:bg-[#000000] p-6 lg:p-10 flex flex-col md:flex-row md:items-end justify-between shrink-0">
      <div>
        <div className="font-mono text-xs text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
            <Icon size={12} />
          </div>
          {subtitle ?? 'SYSTEM_MODULE'}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase leading-none text-slate-900 dark:text-white">
          {title}
        </h1>
      </div>
      {children && (
        <div className="mt-6 md:mt-0 flex gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
