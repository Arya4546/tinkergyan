import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '../../stores/ui.store';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

export const EditorToast = () => {
  const toasts = useUIStore((s: any) => s.toasts);

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 pointer-events-none p-4">
      <AnimatePresence>
        {toasts.map((t: any) => {
          let Icon = Info;
          let color = 'text-primary-500';
          let border = 'border-slate-100 dark:border-dark-border';

          if (t.type === 'success') {
            Icon = CheckCircle2;
            color = 'text-emerald-500';
            border = 'border-emerald-200 dark:border-emerald-900/50';
          } else if (t.type === 'error') {
            Icon = XCircle;
            color = 'text-red-500';
            border = 'border-red-200 dark:border-red-900/50';
          } else if (t.type === 'warning') {
            Icon = AlertCircle;
            color = 'text-warning-500';
            border = 'border-warning-200 dark:border-warning-900/50';
          }

          return (
            <motion.div
              layout
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`flex items-start gap-3 p-4 min-w-[280px] max-w-sm rounded-2xl shadow-xl border bg-white dark:bg-dark-surface ${border} pointer-events-auto`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${color}`} />
              <div className="flex-1 flex flex-col gap-1 mt-0.5">
                <span className="font-sans font-bold text-sm text-slate-800 dark:text-white">
                  {t.title}
                </span>
                {t.message && (
                  <span className="font-sans text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t.message}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
