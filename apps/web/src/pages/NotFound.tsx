import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CartoonRocket } from '@/components/illustrations/CartoonRocket';
import { useIsAuthenticated } from '../stores/auth.store';

export default function NotFound() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <div className="min-h-screen flex items-center justify-center bg-playful-light-bg dark:bg-[#050B14] p-6 text-center font-playful relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-playful-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-playful-highlight/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full bg-white/85 dark:bg-[#0B1121]/90 backdrop-blur-2xl rounded-[2.5rem] border border-slate-200/80 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col relative overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-playful-primary via-purple-500 to-playful-highlight block absolute top-0 left-0" />

        <div className="p-8 sm:p-10 flex flex-col items-center">
          {/* Animated Rocket Container */}
          <div className="w-24 h-24 relative flex items-center justify-center mb-5">
            <div className="absolute inset-0 rounded-full bg-playful-primary/10 dark:bg-playful-primary/20 blur-lg animate-pulse" />
            <CartoonRocket className="w-20 h-20 animate-bounce-gentle drop-shadow-md" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/60 text-purple-700 dark:text-playful-highlight text-xs font-black tracking-wide mb-3">
            <span>LOST IN ORBIT &bull; 404</span>
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-4xl text-tg-dark dark:text-white mb-2 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            We couldn't locate that sector or circuit. The coordinates might have moved or don't
            exist.
          </p>

          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="w-full h-12 bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary text-white rounded-2xl font-black text-sm flex items-center justify-center transition-all shadow-[0_4px_16px_rgba(108,92,231,0.35)] hover:-translate-y-0.5"
          >
            <ArrowLeft size={16} className="mr-2" />
            {isAuthenticated ? 'Return to Workbench' : 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
