import { Link, useLocation } from 'react-router-dom';
import { Home, GraduationCap, FolderCode, User, TerminalSquare, Settings2, Globe, Trophy, Award, X } from 'lucide-react';
import { useUIStore } from '../../stores/ui.store';

const NAV_ITEMS = [
  { label: 'HQ', icon: Home, href: '/dashboard', activeColor: 'bg-primary-500 text-white' },
  { label: 'Quests', icon: GraduationCap, href: '/courses', activeColor: 'bg-emerald-500 text-white' },
  { label: 'Toybox', icon: FolderCode, href: '/projects', activeColor: 'bg-yellow-400 text-slate-900' },
  { label: 'Gallery', icon: Globe, href: '/gallery', activeColor: 'bg-violet-500 text-white' },
  { label: 'Engine', icon: TerminalSquare, href: '/editor', activeColor: 'bg-blue-500 text-white' },
  { label: 'Ranks', icon: Trophy, href: '/leaderboard', activeColor: 'bg-amber-500 text-white' },
  { label: 'Badges', icon: Award, href: '/badges', activeColor: 'bg-rose-500 text-white' },
  { label: 'ID Card', icon: User, href: '/profile', activeColor: 'bg-pink-500 text-white' },
  { label: 'Config', icon: Settings2, href: '/settings', activeColor: 'bg-slate-500 text-white' },
];

export function Sidebar() {
  const location = useLocation();
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);

  return (
    <>
      {/* Mobile overlay background */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed sm:relative top-0 left-0 h-full z-50 
        w-64 sm:w-[80px] lg:w-64 
        bg-slate-50 dark:bg-[#000000] hw-border-r 
        flex-col transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full hidden sm:flex sm:translate-x-0'}
        shrink-0
      `}>
        
        {/* Brand Header */}
        <div className="h-20 shrink-0 flex items-center justify-between px-6 lg:justify-start hw-border-b bg-white dark:bg-[#111111]">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-sm flex items-center justify-center shrink-0">
                <span className="font-mono font-bold text-white dark:text-slate-900 text-base">TG</span>
            </div>
            <span className="text-xl font-bold font-mono tracking-tighter uppercase ml-3 sm:hidden lg:block text-slate-900 dark:text-white">SYS_CTRL</span>
          </div>
          
          <button 
            className="sm:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

      {/* Nav Keys */}
      <nav className="flex-1 flex flex-col">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.href) && item.href !== '/dashboard' || (item.href === '/dashboard' && location.pathname === '/dashboard');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`h-20 hw-border-b flex items-center px-8 lg:justify-start transition-colors ${
                isActive 
                  ? item.activeColor
                  : 'bg-white dark:bg-[#000000] text-slate-500 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900'
              }`}
            >
              <Icon size={24} strokeWidth={2} className="shrink-0" />
              <span className="font-mono font-bold tracking-widest uppercase ml-4 sm:hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Status LED Panel */}
      <div className="h-32 hw-border-t bg-slate-900 dark:bg-[#111111] p-4 sm:hidden lg:flex flex-col justify-end">
         <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-emerald-500 font-mono uppercase tracking-widest leading-none">SYS_ONLINE</span>
         </div>
         <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">v2.1.04 // OK</p>
      </div>
    </aside>
    </>
  );
}
