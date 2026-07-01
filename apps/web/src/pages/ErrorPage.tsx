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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] font-sans flex items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle size={28} className="text-red-500" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            An error occurred while loading this page.
          </p>

          <div className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-8">
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 text-left break-all">
              {errorMessage}
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 h-10 inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors"
            >
              <RotateCcw size={15} /> Try Again
            </button>
            <Link
              to="/"
              className="flex-1 h-10 inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Home size={15} /> Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
