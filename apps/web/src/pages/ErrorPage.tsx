import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { RotateCcw, Home, AlertCircle } from 'lucide-react';

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  let errorMessage = 'An unexpected error occurred.';
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || String(error.data);
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen bg-playful-light-bg dark:bg-[#050B14] font-playful flex items-center justify-center p-6 transition-colors duration-300 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-playful-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/85 dark:bg-[#0B1121]/90 border border-slate-200/80 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col items-center text-center relative overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-purple-500 to-playful-highlight block absolute top-0 left-0" />

          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200/60 dark:border-rose-800/60 rounded-3xl flex items-center justify-center mb-5">
            <AlertCircle size={32} strokeWidth={2} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-black tracking-wide mb-3">
            <span>CIRCUIT MALFUNCTION</span>
          </div>

          <h1 className="font-heading font-black text-2xl sm:text-3xl text-tg-dark dark:text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
            An error occurred while running the workbench or loading instructions.
          </p>

          <div className="w-full bg-slate-50 dark:bg-[#11141E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 mb-8">
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 text-left break-all">
              {errorMessage}
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <RotateCcw size={15} /> Try Again
            </button>
            <Link
              to="/"
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <Home size={15} /> Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
