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
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Loader } from '../components/ui/Loader';
import { NewProjectDialog } from '../components/ui/NewProjectDialog';
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
    'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30',
    'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30',
    'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30',
    'bg-sky-50 dark:bg-sky-900/10 border-sky-100 dark:border-sky-900/30',
  ];
  const iconBgs = [
    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400',
  ];
  const bg = pastelBgs[index % pastelBgs.length];
  const iconBg = iconBgs[index % iconBgs.length];

  const boardLabel = getBoardLabel(project.boardTarget);

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-4 hover:shadow-md transition-shadow ${bg}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {isBlock ? <Beaker size={18} /> : <TerminalSquare size={18} />}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              project.boardTarget === 'software'
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                : 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400'
            }`}
          >
            {project.boardTarget === 'software' ? 'Software • Scratch' : `Hardware • ${boardLabel}`}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              void onDelete(project.id);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete project"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-base text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2">
          {project.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {project.boardTarget === 'software'
            ? 'Software Coding (Scratch)'
            : `Hardware (${boardLabel})`}{' '}
          &bull; {isBlock ? 'Block Logic' : 'C++ Code'} &bull; Updated{' '}
          {new Date(project.updatedAt).toLocaleDateString()}
        </p>
      </div>

      <Link
        to={`/editor/${project.id}${project.boardTarget === 'software' ? '?engine=software' : '?engine=hardware'}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <Play size={12} className="fill-current" /> Open in Editor
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { projects, isLoading, error, fetchProjects, removeProject } = useProjectStore();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'HARDWARE' | 'SOFTWARE'>('ALL');
  const [boardFilter, setBoardFilter] = useState<string>('ALL');

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
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
    <div className="w-full h-full flex flex-col font-sans overflow-y-auto">
      {/* Page Header */}
      <div className="px-6 md:px-10 pt-8 pb-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111111] shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Maker'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Here's what's happening with your workspace.
          </p>
        </div>
        <button
          onClick={() => setIsNewProjectOpen(true)}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Main: Projects */}
        <div className="flex-1 px-6 md:px-10 py-8 overflow-y-auto border-r border-slate-200 dark:border-slate-800">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-3">
                <FolderCode size={16} />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{projects.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Projects</p>
            </div>
            <div className="bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp size={16} />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{user?.xp ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">XP Earned</p>
            </div>
            <div className="bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center mb-3">
                <Zap size={16} />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {user?.streak ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Day Streak</p>
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
              {/* Category Filter Tabs */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-xl">
                <button
                  onClick={() => {
                    setCategoryFilter('ALL');
                    setBoardFilter('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    categoryFilter === 'ALL'
                      ? 'bg-white dark:bg-[#252932] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All
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
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
                  <Filter size={12} className="text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Board:
                  </span>
                  <select
                    value={boardFilter}
                    onChange={(e) => setBoardFilter(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white outline-none cursor-pointer py-0.5"
                  >
                    <option
                      value="ALL"
                      className="bg-white dark:bg-[#1A1D24] text-slate-900 dark:text-white"
                    >
                      All Hardware Boards
                    </option>
                    {BOARDS.map((b) => (
                      <option
                        key={b.fqbn}
                        value={b.fqbn}
                        className="bg-white dark:bg-[#1A1D24] text-slate-900 dark:text-white"
                      >
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Software Mode Indicator */}
              {categoryFilter === 'SOFTWARE' && (
                <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <SlidersHorizontal size={12} /> Engine: Scratch
                </div>
              )}

              {/* All Category Environment Selector */}
              {categoryFilter === 'ALL' && (
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
                  <Filter size={12} className="text-slate-400 shrink-0" />
                  <select
                    value={boardFilter}
                    onChange={(e) => setBoardFilter(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white outline-none cursor-pointer py-0.5"
                  >
                    <option
                      value="ALL"
                      className="bg-white dark:bg-[#1A1D24] text-slate-900 dark:text-white"
                    >
                      All Boards & Engines
                    </option>
                    <option
                      value="software"
                      className="bg-white dark:bg-[#1A1D24] text-slate-900 dark:text-white"
                    >
                      Software (Scratch)
                    </option>
                    {BOARDS.map((b) => (
                      <option
                        key={b.fqbn}
                        value={b.fqbn}
                        className="bg-white dark:bg-[#1A1D24] text-slate-900 dark:text-white"
                      >
                        {b.label} (Hardware)
                      </option>
                    ))}
                  </select>
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <FolderCode size={24} className="text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No matching projects found
              </p>
              <p className="text-sm text-slate-400 mb-6">
                Try selecting a different category or board filter.
              </p>
              <button
                onClick={() => setIsNewProjectOpen(true)}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <Plus size={16} /> Create Project
              </button>
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
        <div className="w-full lg:w-72 xl:w-80 px-6 py-8 bg-slate-50 dark:bg-[#0A0A0A] shrink-0 flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsNewProjectOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-800 hover:text-slate-900 dark:hover:text-white transition-all text-left"
              >
                <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                  <Plus size={14} />
                </div>
                New Project
              </button>
              <Link
                to="/courses"
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-800 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <div className="w-7 h-7 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center shrink-0">
                  <Award size={14} />
                </div>
                Browse Courses
              </Link>
              <Link
                to="/leaderboard"
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-amber-300 dark:hover:border-amber-800 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <div className="w-7 h-7 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp size={14} />
                </div>
                Leaderboard
              </Link>
            </div>
          </div>

          {user?.level !== undefined && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                Your Progress
              </h2>
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Level {user.level}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {user.xp ?? 0} XP
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((user.xp ?? 0) % 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
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
