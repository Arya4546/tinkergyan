import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  GraduationCap,
  FolderCode,
  User,
  TerminalSquare,
  Settings2,
  Globe,
  Trophy,
  Award,
  X,
  ChevronDown,
  ChevronRight,
  Cpu,
  MonitorPlay,
} from 'lucide-react';
import { useUIStore } from '../../stores/ui.store';
import { NewProjectDialog } from '../ui/NewProjectDialog';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: Home, href: '/dashboard' },
  { label: 'Courses', icon: GraduationCap, href: '/courses' },
  { label: 'My Projects', icon: FolderCode, href: '/projects' },
  { label: 'Gallery', icon: Globe, href: '/gallery' },
  // Engine is handled specially
  { label: 'Leaderboard', icon: Trophy, href: '/leaderboard' },
  { label: 'Achievements', icon: Award, href: '/badges' },
];

export function Sidebar() {
  const location = useLocation();
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const isEngineActive = location.pathname.startsWith('/editor');
  const [engineExpanded, setEngineExpanded] = useState(isEngineActive);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'software' | 'hardware' | null>(null);

  return (
    <>
      {/* Mobile overlay background */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 sm:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
        fixed sm:relative top-0 left-0 h-full z-40 
        w-64 
        bg-white dark:bg-[#0B1121] text-slate-700 dark:text-slate-200
        border-r border-slate-200 dark:border-slate-800/80
        shadow-[2px_0_12px_rgba(0,0,0,0.03)] dark:shadow-[2px_0_20px_rgba(0,0,0,0.4)]
        flex-col transition-all duration-300
        ${mobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full hidden sm:flex sm:translate-x-0'}
        shrink-0 overflow-y-auto pb-4
      `}
      >
        {/* Mobile Close Header */}
        <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/60 sm:hidden">
          <span className="font-heading font-black text-lg text-playful-primary dark:text-playful-highlight">
            Menu
          </span>
          <button
            className="text-slate-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Keys */}
        <nav className="flex-1 flex flex-col px-3 gap-1.5 mt-4 sm:mt-6">
          {/* Inject Engine at its original position */}
          {NAV_ITEMS.map((item, index) => {
            const renderItem = (i: typeof item) => {
              const isActive =
                (location.pathname.startsWith(i.href) && i.href !== '/dashboard') ||
                (i.href === '/dashboard' && location.pathname === '/dashboard');
              const Icon = i.icon;

              return (
                <Link
                  key={i.href}
                  to={i.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`h-11 w-full flex items-center px-4 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-playful-highlight font-bold border-l-4 border-purple-600 dark:border-playful-highlight shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  <span className="text-sm tracking-wide ml-3.5">{i.label}</span>
                </Link>
              );
            };

            const elements = [];
            if (index === 4) {
              // original Engine position
              elements.push(
                <div key="engine-menu" className="flex flex-col gap-1 w-full">
                  <button
                    onClick={() => setEngineExpanded(!engineExpanded)}
                    className={`h-11 w-full flex items-center justify-between px-4 rounded-xl transition-all duration-200 ${
                      isEngineActive
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-playful-highlight font-bold border-l-4 border-purple-600 dark:border-playful-highlight shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm'
                    }`}
                  >
                    <div className="flex items-center w-full">
                      <TerminalSquare
                        size={20}
                        strokeWidth={isEngineActive ? 2.5 : 2}
                        className="shrink-0"
                      />
                      <span className="text-sm tracking-wide ml-3.5">Editor</span>
                    </div>
                    <div className="text-slate-400">
                      {engineExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>
                  {engineExpanded && (
                    <div className="flex flex-col gap-1 pl-10 pr-2 w-full">
                      <button
                        onClick={() => {
                          setSelectedCategory('hardware');
                          setNewProjectOpen(true);
                          setMobileMenuOpen(false);
                        }}
                        className={`h-9 w-full flex items-center px-3 rounded-lg transition-all duration-200 ${location.search.includes('engine=hardware') ? 'bg-purple-100/70 dark:bg-purple-900/40 text-purple-700 dark:text-playful-highlight font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'}`}
                      >
                        <Cpu size={16} className="shrink-0 mr-2.5 text-purple-500" />
                        <span className="text-xs font-semibold">Hardware</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCategory('software');
                          setNewProjectOpen(true);
                          setMobileMenuOpen(false);
                        }}
                        className={`h-9 w-full flex items-center px-3 rounded-lg transition-all duration-200 ${location.search.includes('engine=software') ? 'bg-purple-100/70 dark:bg-purple-900/40 text-purple-700 dark:text-playful-highlight font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'}`}
                      >
                        <MonitorPlay size={16} className="shrink-0 mr-2.5 text-blue-500" />
                        <span className="text-xs font-semibold">Software</span>
                      </button>
                    </div>
                  )}
                </div>,
              );
            }
            elements.push(renderItem(item));
            return elements;
          })}
        </nav>

        <div className="mt-auto px-3 flex flex-col gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <Link
            to="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="h-11 w-full flex items-center px-4 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
          >
            <User size={20} className="shrink-0" />
            <span className="text-sm tracking-wide ml-3.5">Profile</span>
          </Link>
          <Link
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className="h-11 w-full flex items-center px-4 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-sm"
          >
            <Settings2 size={20} className="shrink-0" />
            <span className="text-sm tracking-wide ml-3.5">Settings</span>
          </Link>
        </div>
      </aside>

      <NewProjectDialog
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        preSelectedCategory={selectedCategory}
      />
    </>
  );
}
