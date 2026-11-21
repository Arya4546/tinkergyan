import { useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FolderCode,
  LayoutDashboard,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useUIStore } from '../../stores/ui.store';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/projects', label: 'Projects', icon: FolderCode, end: false },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      document.documentElement.classList.toggle(
        'dark',
        theme === 'dark' || (theme === 'system' && mq.matches),
      );
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 h-10 px-3.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-playful-highlight'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-white font-playful flex flex-col">
      <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 bg-white/90 dark:bg-[#0B1121]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30">
        <Link to="/admin" className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
            <ShieldCheck size={19} />
          </span>
          <span className="font-heading font-black text-lg tracking-tight truncate">
            Admin Portal
          </span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="hidden md:block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[14rem]">
            {user?.email}
          </span>
          <Link
            to="/dashboard"
            className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <ArrowLeft size={15} /> <span className="hidden sm:inline">Back to app</span>
          </Link>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle dark mode"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={() => {
              void logout().finally(() => navigate('/login', { replace: true }));
            }}
            className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <LogOut size={15} /> <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-w-0">
        <nav className="md:w-56 shrink-0 flex md:flex-col gap-1 p-3 md:p-4 overflow-x-auto border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#0B1121]">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={link}>
              <n.icon size={17} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
