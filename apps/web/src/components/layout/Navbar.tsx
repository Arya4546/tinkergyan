import { Moon, Sun, Menu, ChevronDown, LogOut, Settings, UserIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useUIStore } from '../../stores/ui.store';
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
    <header className="h-20 shrink-0 flex items-stretch border-b border-slate-900 dark:border-slate-800 bg-white dark:bg-[#000000] z-30 sticky top-0">
      
      {/* Mobile Menu Button */}
      <div className="flex items-center sm:hidden border-r border-slate-900 dark:border-slate-800">
        <button type="button" className="w-20 h-full flex items-center justify-center hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors">
          <Menu size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Title / Breadcrumb Area */}
      <div className="flex-1 flex items-center px-6">
         <span className="font-mono text-sm tracking-widest uppercase text-slate-500 hidden sm:block">PATH :: <span className="text-slate-900 dark:text-white font-bold">/HOME</span></span>
      </div>
      
      <div className="flex items-stretch">
        
        {/* Theme Toggle Key */}
        <button 
          onClick={toggleTheme}
          type="button"
          className="w-20 h-full border-l border-slate-900 dark:border-slate-800 flex items-center justify-center hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors focus:outline-none"
          aria-label="Toggle dark mode"
        >
           {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        {/* User Menu Key */}
        <div className="relative flex" ref={dropdownRef}>
          <button 
            type="button"
            className="flex items-center gap-4 px-6 h-full border-l border-slate-900 dark:border-slate-800 bg-slate-50 dark:bg-[#111111] hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors focus:outline-none group"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="h-8 w-8 bg-slate-900 dark:bg-white rounded-sm flex items-center justify-center text-white dark:text-slate-900 font-mono font-bold text-sm">
              {user?.avatar ? (
                 <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                 user?.name?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            
            <div className="flex-col items-start hidden sm:flex text-left font-mono">
              <span className="text-xs font-bold leading-tight uppercase">{user?.name?.split(' ')[0] || 'Maker'}</span>
            </div>
            
            <ChevronDown size={16} className={`transition-transform duration-100 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Dropdown Grid */}
          {dropdownOpen && (
            <div className="absolute right-0 top-20 w-64 bg-white dark:bg-[#000000] border-l border-b border-slate-900 dark:border-slate-800 flex flex-col z-50">
              <div className="p-4 border-b border-slate-900 dark:border-slate-800 bg-slate-50 dark:bg-[#111111]">
                <p className="font-mono text-sm font-bold uppercase truncate">{user?.name}</p>
                <p className="font-mono text-[10px] text-slate-500 truncate mt-1">{user?.email}</p>
              </div>
              
              <Link to="/profile" className="px-4 py-4 font-mono text-xs font-bold uppercase hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 border-b border-slate-900 dark:border-slate-800 flex items-center gap-3 transition-colors" onClick={() => setDropdownOpen(false)}>
                <UserIcon size={16} /> USER_DATA
              </Link>
              
              <Link to="/settings" className="px-4 py-4 font-mono text-xs font-bold uppercase hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 border-b border-slate-900 dark:border-slate-800 flex items-center gap-3 transition-colors" onClick={() => setDropdownOpen(false)}>
                <Settings size={16} /> CONFIG
              </Link>
              
              <button 
                type="button"
                onClick={() => { setDropdownOpen(false); logout(); }}
                className="w-full text-left px-4 py-4 font-mono text-xs font-bold uppercase text-red-500 hover:bg-red-500 hover:text-white flex items-center gap-3 transition-colors"
              >
                <LogOut size={16} /> TERMINATE_SESSION
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
