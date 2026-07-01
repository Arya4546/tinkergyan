import { Moon, Sun, Menu, ChevronDown, LogOut, Settings, UserIcon, Rocket } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useUIStore } from '../../stores/ui.store';
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const applyDarkClass = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyDarkClass();
    mq.addEventListener('change', applyDarkClass);
    return () => mq.removeEventListener('change', applyDarkClass);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 lg:px-8 bg-white dark:bg-[#111111] border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white z-30 relative transition-colors duration-300">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center shrink-0">
            <Rocket size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight hidden sm:block">Tinkergyan</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle Key */}
        <button
          onClick={toggleTheme}
          type="button"
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Menu Key */}
        <div className="relative flex" ref={dropdownRef}>
          <button
            type="button"
            className="flex items-center gap-2 h-9 pl-2 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1D24] hover:bg-slate-50 dark:hover:bg-[#252A34] transition-colors group"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="h-6 w-6 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase() || 'U'
              )}
            </div>

            <span className="text-sm font-semibold leading-tight hidden sm:block">
              {user?.name?.split(' ')[0] || 'Maker'}
            </span>

            <ChevronDown
              size={14}
              strokeWidth={2.5}
              className={`transition-transform duration-100 text-slate-400 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* User Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-60 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1.5 flex flex-col z-50">
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
              </div>

              <Link
                to="/profile"
                className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <UserIcon size={16} /> My Profile
              </Link>

              <Link
                to="/settings"
                className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings size={16} /> Settings
              </Link>

              <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    void logout();
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
