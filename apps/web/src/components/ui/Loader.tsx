import { Loader2, Rocket } from 'lucide-react';

interface LoaderProps {
  fullPage?: boolean;
  message?: string;
}

export function Loader({ fullPage = false, message = "Charging the Lab..." }: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 gap-6 animate-fade-in">
      <div className="relative">
        <div className="w-24 h-24 bg-primary-400 border-4 border-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-[6px_6px_0_#0f172a] transform rotate-12 animate-pulse">
           <Rocket size={48} className="text-slate-900 fill-slate-900" />
        </div>
        <div className="absolute -top-4 -right-4">
           <Loader2 size={32} className="text-slate-900 animate-spin" strokeWidth={3} />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-widest italic">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none"></div>
        {content}
      </div>
    );
  }

  return content;
}
