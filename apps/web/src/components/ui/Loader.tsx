import { Terminal, Loader2 } from 'lucide-react';

interface LoaderProps {
  fullPage?: boolean;
  message?: string;
}

export function Loader({ fullPage = false, message = "LOADING_SYS_MODULES..." }: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 gap-6">
      <div className="relative w-24 h-24 bg-white dark:bg-[#111111] hw-border flex items-center justify-center">
        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 animate-pulse"></div>
        <Terminal size={32} className="text-slate-900 dark:text-white" strokeWidth={2} />
        <div className="absolute -bottom-3 -right-3 bg-white dark:bg-black hw-border p-1">
          <Loader2 size={16} className="text-slate-900 dark:text-white animate-spin" strokeWidth={2} />
        </div>
      </div>
      <div className="text-center mt-2">
        <p className="font-mono text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">{message}</p>
        <div className="flex gap-1 justify-center mt-3">
          <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-white animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-white animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-white animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-[#0A0A0A] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-dot-matrix opacity-50 pointer-events-none"></div>
        
        <div className="absolute top-6 left-6 font-mono text-[10px] text-slate-400 uppercase tracking-widest">
           [ T-SYS_v2.1_BETA ]<br/>STATUS: BOOTING
        </div>

        <div className="z-10 bg-white dark:bg-[#111111] hw-border p-6 shadow-2xl relative">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
