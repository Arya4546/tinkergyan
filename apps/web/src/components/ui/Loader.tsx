import { Loader2, Sparkles } from 'lucide-react';

interface LoaderProps {
  fullPage?: boolean;
  message?: string;
}

export function Loader({ fullPage = false, message = 'Getting things ready...' }: LoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 gap-5">
      {/* Icon + spinner */}
      <div className="relative flex items-center justify-center w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-primary-500/10 animate-pulse" />
        <Sparkles size={36} className="text-primary-500" strokeWidth={1.5} />
        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-dark-surface rounded-full p-1 shadow-sm">
          <Loader2 size={16} className="text-primary-500 animate-spin" strokeWidth={2.5} />
        </div>
      </div>

      {/* Message */}
      <div className="text-center">
        <p className="font-sans font-semibold text-sm text-slate-600 dark:text-slate-300">
          {message}
        </p>
        {/* Bouncing dots */}
        <div className="flex gap-1.5 justify-center mt-3">
          <div
            className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[100] bg-background dark:bg-dark-bg flex flex-col items-center justify-center overflow-hidden">
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl border border-slate-100 dark:border-dark-border p-4">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
