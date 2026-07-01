import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUIStore } from '../stores/ui.store';
import {
  Moon,
  Sun,
  Rocket,
  Blocks,
  TerminalSquare,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] font-sans text-slate-900 dark:text-white transition-colors duration-300 flex flex-col">
      {/* Navbar */}
      <header className="h-16 flex items-center justify-between px-6 md:px-12 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0A0A0A] sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Rocket size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Tinkergyan</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-2"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-6 md:px-12 py-20 md:py-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-semibold rounded-full border border-emerald-100 dark:border-emerald-900/40 mb-8">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Now Available
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Learn to code.
              <br />
              <span className="text-slate-400 dark:text-slate-500">Build real things.</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-lg">
              Tinkergyan is an interactive platform for learning hardware programming. Write code,
              snap blocks together, and test circuits — all in your browser.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold px-6 py-3 rounded-xl hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors"
              >
                Start Learning <ChevronRight size={16} />
              </Link>
              <Link
                to="/editor"
                className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-6 py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Try the Editor
              </Link>
            </div>
          </div>

          {/* Right: Feature Cards */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex gap-5 items-start hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <Blocks size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1">Block-Based Coding</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Drag and snap logic blocks to build programs visually. Perfect for beginners.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex gap-5 items-start hover:border-purple-300 dark:hover:border-purple-800 transition-colors">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0">
                <TerminalSquare size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1">Virtual Simulator</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Test your code in a simulated environment before flashing it to real hardware.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex gap-5 items-start hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                <GraduationCap size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1">Guided Courses</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Follow step-by-step lessons from basic circuits to advanced robotics projects.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
