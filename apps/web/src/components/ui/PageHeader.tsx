import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111111] px-6 lg:px-10 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </div>
  );
}
