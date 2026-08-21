import { Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { useIsAuthenticated } from '../stores/auth.store';

export default function NotFound() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0A0A0A] p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white dark:bg-[#111111] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-400 block absolute top-0 left-0"></div>

        <div className="p-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search size={24} strokeWidth={2} className="text-slate-400" />
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            We couldn't find the page you're looking for. It might have been moved or doesn't exist.
          </p>

          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center transition-colors shadow-lg shadow-emerald-500/20"
          >
            <ArrowLeft size={16} className="mr-2" />
            {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
