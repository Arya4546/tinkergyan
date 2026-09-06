import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderCode,
  Search,
  Plus,
  Trash2,
  Play,
  Blocks,
  TerminalSquare,
  Zap,
  Cpu,
  SlidersHorizontal,
} from 'lucide-react';
import { useProjectStore } from '../stores/project.store';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { NewProjectDialog } from '../components/ui/NewProjectDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { Tooltip } from '../components/ui/Tooltip';
import { Loader } from '../components/ui/Loader';
import { BOARDS, getBoardLabel } from '../lib/boards';

type FilterType = 'ALL' | 'BLOCK' | 'CODE';
type CategoryFilterType = 'ALL' | 'HARDWARE' | 'SOFTWARE';

export default function Projects() {
  const { projects, isLoading, error, fetchProjects, removeProject } = useProjectStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('ALL');
  const [boardFilter, setBoardFilter] = useState<string>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const params = {
      search: search.trim() || undefined,
      type: filter === 'ALL' ? undefined : filter,
      category: categoryFilter === 'ALL' ? undefined : categoryFilter,
      boardTarget: boardFilter === 'ALL' ? undefined : boardFilter,
    };

    // Fetch immediately on mount; debounce subsequent filter changes
    if (isFirstRender.current) {
      isFirstRender.current = false;
      void fetchProjects(params);
      return;
    }

    const timer = setTimeout(() => {
      void fetchProjects(params);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, filter, categoryFilter, boardFilter, fetchProjects]);

  const filtered = projects.filter((_p) => {
    if (categoryFilter === 'HARDWARE' && boardFilter === 'ALL') return false;
    return true;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    void (async () => {
      await removeProject(deleteTarget);
      setDeleteTarget(null);
    })();
  };

  const deleteProjectTitle = projects.find((p) => p.id === deleteTarget)?.title ?? '';

  return (
    <div className="w-full h-full flex flex-col font-playful bg-transparent">
      <PageHeader
        icon={FolderCode}
        title="My Projects"
        subtitle={`${projects.length} maker projects`}
      >
        <button
          onClick={() => setIsNewProjectOpen(true)}
          className="h-10 px-5 bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary text-white text-xs font-black rounded-xl transition-all shadow-[0_4px_12px_rgba(108,92,231,0.3)] flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
        >
          <Plus size={16} strokeWidth={2.5} /> New Project
        </button>
      </PageHeader>

      {/* Search + Filter Bar */}
      <div className="border-b border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-[#0B1121]/60 backdrop-blur-md px-6 lg:px-10 py-4 flex flex-col lg:flex-row gap-3 shrink-0">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#141824] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-playful-primary transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Category Tabs: Hardware | Software */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#141824] border border-slate-200/80 dark:border-slate-800 rounded-xl h-10">
            <button
              onClick={() => {
                setCategoryFilter('ALL');
                setBoardFilter('ALL');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setCategoryFilter('HARDWARE');
                setBoardFilter('ALL');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                categoryFilter === 'HARDWARE'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Cpu size={13} /> Hardware
            </button>
            <button
              onClick={() => {
                setCategoryFilter('SOFTWARE');
                setBoardFilter('ALL');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                categoryFilter === 'SOFTWARE'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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

          {/* Software Engine Indicator */}
          {categoryFilter === 'SOFTWARE' && (
            <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-1.5 text-xs font-bold text-playful-secondary">
              <SlidersHorizontal size={12} /> Engine: Scratch
            </div>
          )}

          {/* Code/Block Filter */}
          <div className="flex gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-2">
            {(['ALL', 'BLOCK', 'CODE'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-10 px-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border ${
                  filter === f
                    ? 'bg-playful-primary text-white border-transparent shadow-xs'
                    : 'bg-white dark:bg-[#141824] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {f === 'BLOCK' && <Blocks size={12} />}
                {f === 'CODE' && <TerminalSquare size={12} />}
                {f === 'ALL' ? 'All Formats' : f === 'BLOCK' ? 'Blocks' : 'Code'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-transparent">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader message="Loading your projects..." />
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 w-full">
            {categoryFilter === ('SHOW_WIZARD' as any) ? (
              <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  What are you working on?
                </h3>
                <p className="text-sm text-slate-500 mb-8">
                  Choose an environment to view or create projects.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                  <button
                    onClick={() => {
                      setCategoryFilter('HARDWARE');
                      setBoardFilter('ALL');
                    }}
                    className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/50 bg-white dark:bg-[#1a1a1a] hover:bg-purple-50/50 dark:hover:bg-purple-500/5 hover:shadow-lg transition-all duration-300 group cursor-pointer"
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
                    className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 bg-white dark:bg-[#1a1a1a] hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 hover:shadow-lg transition-all duration-300 group cursor-pointer"
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
                  Select a Hardware Board
                </h3>
                <p className="text-sm text-slate-500 mb-8">
                  Choose the microcontroller you are working with.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-4xl">
                  {BOARDS.map((b) => (
                    <button
                      key={b.fqbn}
                      onClick={() => setBoardFilter(b.fqbn)}
                      className="flex flex-col items-center gap-4 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#1a1a1a] hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-md transition-all duration-300 group cursor-pointer"
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
                  {search || filter !== 'ALL' ? 'No results found' : 'No projects yet'}
                </p>
                <p className="text-sm text-slate-400 mb-6">
                  {search || filter !== 'ALL'
                    ? 'Try adjusting your search or filter.'
                    : 'Create your first project to get started.'}
                </p>
                {!search && filter === 'ALL' && (
                  <button
                    onClick={() => setIsNewProjectOpen(true)}
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <Plus size={16} /> Create Project
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const isBlock = project.type === 'BLOCK';
              const boardLabel = getBoardLabel(project.boardTarget);
              return (
                <div
                  key={project.id}
                  className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 flex flex-col hover:border-purple-300 dark:hover:border-purple-500/40 shadow-2xs hover:shadow-lg hover:-translate-y-1 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        isBlock
                          ? 'bg-purple-100 dark:bg-purple-950/50 text-playful-primary dark:text-playful-highlight'
                          : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isBlock ? <Blocks size={20} /> : <TerminalSquare size={20} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${
                          project.boardTarget === 'software'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-playful-secondary border border-rose-200/60 dark:border-rose-800/40'
                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-playful-highlight border border-purple-200/60 dark:border-purple-800/40'
                        }`}
                      >
                        {project.boardTarget === 'software'
                          ? 'Software • Scratch'
                          : `Hardware • ${boardLabel}`}
                      </span>
                      {project.isPublic && (
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 rounded-full flex items-center gap-1">
                          <Zap size={10} className="fill-current" /> Public
                        </span>
                      )}
                      <Tooltip content="Delete Project" position="top">
                        <button
                          onClick={() => setDeleteTarget(project.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <h3 className="font-heading font-black text-lg text-tg-dark dark:text-white leading-tight mb-1 line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
                    {project.boardTarget === 'software'
                      ? 'Software Coding (Scratch)'
                      : `Hardware (${boardLabel})`}{' '}
                    &bull; {isBlock ? 'Block Logic' : 'C++ Code'} &bull;{' '}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
                    <Tooltip content="Open in Workspace Editor" position="top">
                      <Link
                        to={`/editor/${project.id}${project.boardTarget === 'software' ? '?engine=software' : '?engine=hardware'}`}
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-playful-primary dark:text-playful-highlight hover:underline transition-all"
                      >
                        Open <Play size={12} className="fill-current" />
                      </Link>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${deleteProjectTitle}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <NewProjectDialog open={isNewProjectOpen} onClose={() => setIsNewProjectOpen(false)} />
    </div>
  );
}
