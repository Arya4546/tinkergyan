import { Link, useLocation } from 'react-router-dom';
import { Home, GraduationCap, FolderCode, User, TerminalSquare } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'HQ', icon: Home, href: '/dashboard', activeColor: 'bg-primary-500 text-white' },
  { label: 'Quests', icon: GraduationCap, href: '/courses', activeColor: 'bg-emerald-500 text-white' },
  { label: 'Toybox', icon: FolderCode, href: '/projects', activeColor: 'bg-yellow-400 text-slate-900' },
  { label: 'Engine', icon: TerminalSquare, href: '/editor', activeColor: 'bg-blue-500 text-white' },
  { label: 'ID Card', icon: User, href: '/profile', activeColor: 'bg-pink-500 text-white' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[80px] lg:w-64 bg-slate-50 dark:bg-[#000000] hw-border-r flex-col hidden sm:flex shrink-0">
      
      {/* Brand Header */}
      <div className="h-20 shrink-0 flex items-center justify-center lg:justify-start lg:px-6 hw-border-b bg-white dark:bg-[#111111]">
        <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-sm flex items-center justify-center shrink-0">
            <span className="font-mono font-bold text-white dark:text-slate-900 text-base">TG</span>
        </div>
        <span className="text-xl font-bold font-mono tracking-tighter uppercase ml-3 hidden lg:block text-slate-900 dark:text-white">SYS_CTRL</span>
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
              className={`h-20 hw-border-b flex items-center justify-center lg:justify-start lg:px-8 transition-colors ${
                isActive 
                  ? item.activeColor
                  : 'bg-white dark:bg-[#000000] text-slate-500 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900'
              }`}
            >
              <Icon size={24} strokeWidth={2} className="shrink-0" />
              <span className="font-mono font-bold tracking-widest uppercase ml-4 hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Status LED Panel */}
      <div className="h-32 hw-border-t bg-slate-900 dark:bg-[#111111] p-4 hidden lg:flex flex-col justify-end">
         <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-emerald-500 font-mono uppercase tracking-widest leading-none">SYS_ONLINE</span>
         </div>
         <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">v2.1.04 // OK</p>
      </div>
    </aside>
  );
}
