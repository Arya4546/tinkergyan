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
  { label: 'Learning Plan', icon: Home, href: '/dashboard' },
  { label: 'Events', icon: GraduationCap, href: '/courses' },
  { label: 'Workspace', icon: FolderCode, href: '/projects' },
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
        fixed sm:relative top-0 left-0 h-full z-50 
        w-64 sm:w-[72px] lg:w-64 
        bg-slate-50 dark:bg-[#0A0A0A] text-slate-600 dark:text-slate-400
        flex-col transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full hidden sm:flex sm:translate-x-0'}
        shrink-0 overflow-y-auto pb-4
      `}
      >
        {/* Mobile Close Header */}
        <div className="h-20 shrink-0 flex items-center justify-end px-4 sm:hidden">
          <button
            className="text-slate-400 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Keys */}
        <nav className="flex-1 flex flex-col px-3 gap-2 mt-4 sm:mt-8">
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
                  className={`h-12 w-full flex items-center justify-center lg:justify-start px-0 lg:px-4 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white dark:bg-[#1A1D24] text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-800'
                      : 'hover:bg-slate-200/50 dark:hover:bg-[#1A1D24] hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  <span
                    className={`font-medium text-sm tracking-wide ml-3 sm:hidden lg:block ${isActive ? 'font-bold' : ''}`}
                  >
                    {i.label}
                  </span>
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
                    className={`h-12 w-full flex items-center justify-between px-0 lg:px-4 rounded-xl transition-all duration-200 ${
                      isEngineActive
                        ? 'bg-white dark:bg-[#1A1D24] text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-800'
                        : 'hover:bg-slate-200/50 dark:hover:bg-[#1A1D24] hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-center lg:justify-start w-full">
                      <TerminalSquare
                        size={20}
                        strokeWidth={isEngineActive ? 2.5 : 2}
                        className="shrink-0"
                      />
                      <span
                        className={`font-medium text-sm tracking-wide ml-3 sm:hidden lg:block ${isEngineActive ? 'font-bold' : ''}`}
                      >
                        Engine
                      </span>
                    </div>
                    <div className="hidden lg:block text-slate-400">
                      {engineExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </button>
                  {engineExpanded && (
                    <div className="flex flex-col gap-1 lg:pl-11 pl-0 w-full">
                      <button
                        onClick={() => {
                          setSelectedCategory('hardware');
                          setNewProjectOpen(true);
                          setMobileMenuOpen(false);
                        }}
                        className={`h-10 w-full flex items-center justify-center lg:justify-start px-0 lg:px-3 rounded-lg transition-all duration-200 ${location.search.includes('engine=hardware') ? 'bg-slate-200/50 dark:bg-[#1A1D24] text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A1D24]'}`}
                      >
                        <Cpu size={16} className="shrink-0 lg:mr-2" />
                        <span className="hidden lg:block text-xs font-semibold">Hardware</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCategory('software');
                          setNewProjectOpen(true);
                          setMobileMenuOpen(false);
                        }}
                        className={`h-10 w-full flex items-center justify-center lg:justify-start px-0 lg:px-3 rounded-lg transition-all duration-200 ${location.search.includes('engine=software') ? 'bg-slate-200/50 dark:bg-[#1A1D24] text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A1D24]'}`}
                      >
                        <MonitorPlay size={16} className="shrink-0 lg:mr-2" />
                        <span className="hidden lg:block text-xs font-semibold">Software</span>
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

        <div className="mt-auto px-3 flex flex-col gap-2">
          <Link
            to="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="h-12 w-full flex items-center justify-center lg:justify-start px-0 lg:px-4 rounded-xl transition-all duration-200 hover:bg-slate-200/50 dark:hover:bg-[#1A1D24] hover:text-slate-900 dark:hover:text-slate-200"
          >
            <User size={20} className="shrink-0" />
            <span className="font-medium text-sm tracking-wide ml-3 sm:hidden lg:block">
              Profile
            </span>
          </Link>
          <Link
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className="h-12 w-full flex items-center justify-center lg:justify-start px-0 lg:px-4 rounded-xl transition-all duration-200 hover:bg-slate-200/50 dark:hover:bg-[#1A1D24] hover:text-slate-900 dark:hover:text-slate-200"
          >
            <Settings2 size={20} className="shrink-0" />
            <span className="font-medium text-sm tracking-wide ml-3 sm:hidden lg:block">
              Settings
            </span>
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
