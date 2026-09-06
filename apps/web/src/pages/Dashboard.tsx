import { useAuthStore } from '../stores/auth.store';
import { useProjectStore } from '../stores/project.store';
import {
  Play,
  FolderCode,
  Plus,
  Trash2,
  Beaker,
  TerminalSquare,
  TrendingUp,
  Zap,
  Award,
  Cpu,
  SlidersHorizontal,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Loader } from '../components/ui/Loader';
import { NewProjectDialog } from '../components/ui/NewProjectDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BOARDS, getBoardLabel } from '../lib/boards';

function ProjectCard({
  project,
  onDelete,
  index,
}: {
  project: ReturnType<typeof useProjectStore.getState>['projects'][number];
  onDelete: (id: string) => void | Promise<void>;
  index: number;
}) {
  const isBlock = project.type === 'BLOCK';
  const pastelBgs = [
    'bg-white/85 dark:bg-[#141824]/90 border-slate-200/80 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/40',
    'bg-white/85 dark:bg-[#141824]/90 border-slate-200/80 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-500/40',
    'bg-white/85 dark:bg-[#141824]/90 border-slate-200/80 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-500/40',
    'bg-white/85 dark:bg-[#141824]/90 border-slate-200/80 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/40',
  ];
  const iconBgs = [
    'bg-purple-100 dark:bg-purple-950/50 text-playful-primary dark:text-playful-highlight',
    'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
    'bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400',
    'bg-rose-100 dark:bg-rose-950/50 text-playful-secondary',
  ];
  const bg = pastelBgs[index % pastelBgs.length];
  const iconBg = iconBgs[index % iconBgs.length];

  const boardLabel = getBoardLabel(project.boardTarget);

  return (
    <div
      className={`rounded-3xl border p-6 flex flex-col gap-4 shadow-2xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${bg}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {isBlock ? <Beaker size={20} /> : <TerminalSquare size={20} />}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${
              project.boardTarget === 'software'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-playful-secondary border border-rose-200/60 dark:border-rose-800/40'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-playful-highlight border border-purple-200/60 dark:border-purple-800/40'
            }`}
          >
            {project.boardTarget === 'software' ? 'Software • Scratch' : `Hardware • ${boardLabel}`}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              void onDelete(project.id);
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete project"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white leading-snug mb-1 line-clamp-2">
          {project.title}
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {project.boardTarget === 'software'
            ? 'Software Coding (Scratch)'
            : `Hardware (${boardLabel})`}{' '}
          &bull; {isBlock ? 'Block Logic' : 'C++ Code'} &bull; Updated{' '}
          {new Date(project.updatedAt).toLocaleDateString()}
        </p>
      </div>

      <Link
        to={`/editor/${project.id}${project.boardTarget === 'software' ? '?engine=software' : '?engine=hardware'}`}
        className="inline-flex items-center gap-2 text-xs font-extrabold text-playful-primary dark:text-playful-highlight hover:underline transition-all"
      >
        <Play size={13} className="fill-current" /> Open in Editor
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { projects, isLoading, error, fetchProjects, removeProject } = useProjectStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(
    () => searchParams.get('new') === 'true',
  );
  const [categoryFilter, setCategoryFilter] = useState<'SHOW_WIZARD' | 'HARDWARE' | 'SOFTWARE'>(
    'SHOW_WIZARD',
  );
  const [boardFilter, setBoardFilter] = useState<string>('ALL');

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (isNewProjectOpen && searchParams.has('new')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('new');
      setSearchParams(newParams, { replace: true });
    }
  }, [isNewProjectOpen, searchParams, setSearchParams]);

  const filteredProjects = useMemo(() => {
    if (categoryFilter === 'SHOW_WIZARD') return [];

    return projects.filter((p) => {
      if (categoryFilter === 'HARDWARE' && boardFilter === 'ALL') return false;

      if (categoryFilter === 'HARDWARE' && p.boardTarget === 'software') return false;
      if (categoryFilter === 'SOFTWARE' && p.boardTarget !== 'software') return false;

      if (boardFilter !== 'ALL') {
        if (boardFilter === 'software') {
          if (p.boardTarget !== 'software') return false;
        } else {
          if (p.boardTarget !== boardFilter) return false;
        }
      }

      return true;
    });
  }, [projects, categoryFilter, boardFilter]);

  return (
    <div className="w-full h-full flex flex-col font-playful overflow-y-auto relative bg-transparent">
      {/* Background ambient glow for Dark Mode */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 hidden dark:block">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-playful-highlight/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      {/* Page Header */}
      <div className="px-6 md:px-10 pt-8 pb-6 border-b border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 dark:bg-[#0B1121]/70 backdrop-blur-xl shrink-0 sticky top-0 z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/60 text-purple-700 dark:text-playful-highlight text-xs font-black tracking-wide mb-2">
            <span>MAKER WORKBENCH</span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-tg-dark dark:text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Maker'} 👋
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Here's what's happening with your projects and circuits today.
          </p>
        </div>
        <button
          onClick={() => setIsNewProjectOpen(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary shadow-[0_4px_16px_rgba(108,92,231,0.35)] text-white text-sm font-black px-6 py-3 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shrink-0 cursor-pointer"
        >
          <Plus size={16} strokeWidth={3} /> New Project
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Main: Projects */}
        <div className="flex-1 px-6 md:px-10 py-8 overflow-y-auto border-r border-slate-200/80 dark:border-white/10">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-2xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/50 text-playful-primary dark:text-playful-highlight rounded-2xl flex items-center justify-center mb-3">
                <FolderCode size={20} />
              </div>
              <p className="font-heading font-black text-2xl text-tg-dark dark:text-white">
                {projects.length}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Projects Built</p>
            </div>
            <div className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-2xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-3">
                <TrendingUp size={20} />
              </div>
              <p className="font-heading font-black text-2xl text-tg-dark dark:text-white">
                {user?.xp ?? 0}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">XP Earned</p>
            </div>
            <div className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-2xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-950/50 text-playful-secondary rounded-2xl flex items-center justify-center mb-3">
                <Zap size={20} />
              </div>
              <p className="font-heading font-black text-2xl text-tg-dark dark:text-white">
                {user?.streak ?? 0}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Day Streak</p>
            </div>
          </div>

          {/* Projects Section Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">My Projects</h2>
              <span className="text-xs text-slate-400 font-medium">
                ({filteredProjects.length} shown)
              </span>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-1 bg-slate-100 dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-xl">
                <button
                  onClick={() => {
                    setCategoryFilter('SHOW_WIZARD');
                    setBoardFilter('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    categoryFilter === 'SHOW_WIZARD'
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    setCategoryFilter('HARDWARE');
                    setBoardFilter('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    categoryFilter === 'HARDWARE'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Cpu size={13} /> Hardware
                </button>
                <button
                  onClick={() => {
                    setCategoryFilter('SOFTWARE');
                    setBoardFilter('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    categoryFilter === 'SOFTWARE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Play size={13} className="fill-current" /> Software
                </button>
              </div>

              {/* Hardware Board Filter */}
              {categoryFilter === 'HARDWARE' && (
                <CustomSelect
                  value={boardFilter}
                  onChange={setBoardFilter}
                  labelPrefix="Board:"
                  options={[
                    { value: 'ALL', label: 'All Hardware Boards' },
                    ...BOARDS.map((b) => ({ value: b.fqbn, label: b.label })),
                  ]}
                />
              )}

              {/* Software Mode Indicator */}
              {categoryFilter === 'SOFTWARE' && (
                <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <SlidersHorizontal size={12} /> Engine: Scratch
                </div>
              )}
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader message="Loading projects..." />
            </div>
          )}

          {!isLoading && error && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!isLoading && !error && filteredProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 w-full">
              {categoryFilter === ('SHOW_WIZARD' as any) ? (
                <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Select Workspace View
                  </h3>
                  <p className="text-sm text-slate-500 mb-8">
                    Filter your dashboard to view your existing projects.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                    <button
                      onClick={() => {
                        setCategoryFilter('HARDWARE');
                        setBoardFilter('ALL');
                      }}
                      className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/50 bg-white dark:bg-[#1A1D24] hover:bg-purple-50/50 dark:hover:bg-purple-500/5 hover:shadow-lg transition-all duration-300 group cursor-pointer"
                    >
                      <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center transition-colors">
                        <Cpu size={36} strokeWidth={1.5} />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-xl text-slate-900 dark:text-white mb-1.5">
                          Hardware
                        </h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                          Arduino, ESP32, and custom boards
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setCategoryFilter('SOFTWARE');
                        setBoardFilter('software');
                      }}
                      className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 bg-white dark:bg-[#1A1D24] hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 hover:shadow-lg transition-all duration-300 group cursor-pointer"
                    >
                      <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center transition-colors">
                        <Play size={36} className="fill-current" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-xl text-slate-900 dark:text-white mb-1.5">
                          Software
                        </h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                          Scratch, Animations, and Games
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : categoryFilter === 'HARDWARE' && boardFilter === 'ALL' ? (
                <div className="flex flex-col items-center w-full mx-auto">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Filter by Hardware Board
                  </h3>
                  <p className="text-sm text-slate-500 mb-8">
                    Choose a microcontroller to view its projects.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-4xl">
                    {BOARDS.map((b) => (
                      <button
                        key={b.fqbn}
                        onClick={() => setBoardFilter(b.fqbn)}
                        className="flex flex-col items-center gap-4 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#1A1D24] hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-md transition-all duration-300 group cursor-pointer"
                      >
                        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center group-hover:text-slate-700 dark:group-hover:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-700 transition-colors duration-300">
                          <Cpu size={28} strokeWidth={1.5} />
                        </div>
                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300 text-center leading-tight">
                          {b.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                    <FolderCode size={24} className="text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    No matching projects found
                  </p>
                  <p className="text-sm text-slate-400 mb-6">
                    Try selecting a different category or board filter, or create a new one.
                  </p>
                  <button
                    onClick={() => setIsNewProjectOpen(true)}
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <Plus size={16} /> Create Project
                  </button>
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjects.map((p, i) => (
                <ProjectCard key={p.id} project={p} onDelete={removeProject} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Actions / Info Panel */}
        <div className="w-full lg:w-72 xl:w-80 px-6 py-8 shrink-0 flex flex-col gap-6">
          <div>
            <h2 className="font-heading font-black text-xs text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setIsNewProjectOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-purple-300 dark:hover:border-purple-500/50 hover:text-playful-primary dark:hover:text-playful-highlight transition-all text-left shadow-2xs group"
              >
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-950/50 text-playful-primary dark:text-playful-highlight rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Plus size={16} strokeWidth={2.5} />
                </div>
                <span>New Project</span>
              </button>
              <Link
                to="/courses"
                className="flex items-center gap-3 px-4 py-3.5 bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-purple-300 dark:hover:border-purple-500/50 hover:text-playful-primary dark:hover:text-playful-highlight transition-all shadow-2xs group"
              >
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Award size={16} strokeWidth={2.5} />
                </div>
                <span>Browse Courses</span>
              </Link>
              <Link
                to="/leaderboard"
                className="flex items-center gap-3 px-4 py-3.5 bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-amber-300 dark:hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400 transition-all shadow-2xs group"
              >
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingUp size={16} strokeWidth={2.5} />
                </div>
                <span>Leaderboard</span>
              </Link>
            </div>
          </div>

          {user?.level !== undefined && (
            <div>
              <h2 className="font-heading font-black text-xs text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">
                Your Progress
              </h2>
              <div className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-heading font-bold text-xs text-slate-600 dark:text-slate-300">
                    Level {user.level}
                  </span>
                  <span className="font-heading font-black text-xs text-playful-primary dark:text-playful-highlight">
                    {user.xp ?? 0} XP
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-playful-primary via-purple-500 to-playful-highlight rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((user.xp ?? 0) % 100, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] font-semibold text-slate-400 mt-2.5">
                  {100 - ((user.xp ?? 0) % 100)} XP to next level
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <NewProjectDialog open={isNewProjectOpen} onClose={() => setIsNewProjectOpen(false)} />
    </div>
  );
}
