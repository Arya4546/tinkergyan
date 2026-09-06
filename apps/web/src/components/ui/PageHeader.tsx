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
    <div className="w-full border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl px-6 lg:px-10 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 transition-colors">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/60 dark:to-purple-900/40 text-playful-primary dark:text-playful-highlight rounded-2xl border border-purple-200/60 dark:border-purple-800/60 shadow-2xs flex items-center justify-center shrink-0">
          <Icon size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="font-heading font-black text-2xl tracking-tight text-tg-dark dark:text-white leading-none">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </div>
  );
}
