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
  Loader2,
  Cpu,
  SlidersHorizontal,
} from 'lucide-react';
import { useProjectStore } from '../stores/project.store';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { NewProjectDialog } from '../components/ui/NewProjectDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { Tooltip } from '../components/ui/Tooltip';
import { BOARDS, getBoardLabel } from '../lib/boards';

type FilterType = 'ALL' | 'BLOCK' | 'CODE';
type CategoryFilterType = 'NONE' | 'HARDWARE' | 'SOFTWARE';

export default function Projects() {
  const { projects, isLoading, error, fetchProjects, removeProject } = useProjectStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('NONE');
  const [boardFilter, setBoardFilter] = useState<string>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const params = {
      search: search.trim() || undefined,
      type: filter === 'ALL' ? undefined : filter,
      category: categoryFilter === 'NONE' ? undefined : categoryFilter,
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
    if (categoryFilter === 'NONE') return false;
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
    <div className="w-full h-full flex flex-col">
      <PageHeader icon={FolderCode} title="My Projects" subtitle={`${projects.length} projects`}>
        <button
          onClick={() => setIsNewProjectOpen(true)}
          className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> New Project
        </button>
      </PageHeader>

      {/* Search + Filter Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0a0a] px-6 lg:px-10 py-4 flex flex-col lg:flex-row gap-3 shrink-0">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Category Tabs: Hardware | Software */}
          <div className="flex items-center p-1 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-700 rounded-xl h-10">
            <button
              onClick={() => {
                setCategoryFilter('HARDWARE');
                setBoardFilter('ALL');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                categoryFilter === 'SOFTWARE'
                  ? 'bg-emerald-600 text-white shadow-sm'
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
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <SlidersHorizontal size={12} /> Engine: Scratch
            </div>
          )}

          {/* All Category Environment Selector Removed (Handled by strict typing now) */}

          {/* Code/Block Filter */}
          <div className="flex gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-2">
            {(['ALL', 'BLOCK', 'CODE'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-10 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border ${
                  filter === f
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                    : 'bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
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
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-white dark:bg-[#111111]">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-emerald-500" size={28} />
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <FolderCode size={24} className="text-slate-400" />
            </div>
            {categoryFilter === 'NONE' ? (
              <>
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select a Coding Mode
                </p>
                <p className="text-sm text-slate-400 mb-6">
                  Please select Hardware or Software to view your projects.
                </p>
              </>
            ) : categoryFilter === 'HARDWARE' && boardFilter === 'ALL' ? (
              <>
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select a Board
                </p>
                <p className="text-sm text-slate-400 mb-6">
                  Please select a specific board (like ESP32) to view its projects.
                </p>
              </>
            ) : (
              <>
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
              </>
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
                  className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isBlock ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600'}`}
                    >
                      {isBlock ? <Blocks size={18} /> : <TerminalSquare size={18} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          project.boardTarget === 'software'
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                            : 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400'
                        }`}
                      >
                        {project.boardTarget === 'software'
                          ? 'Software • Scratch'
                          : `Hardware • ${boardLabel}`}
                      </span>
                      {project.isPublic && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1">
                          <Zap size={10} /> Public
                        </span>
                      )}
                      <Tooltip content="Delete Project" position="top">
                        <button
                          onClick={() => setDeleteTarget(project.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {project.boardTarget === 'software'
                      ? 'Software Coding (Scratch)'
                      : `Hardware (${boardLabel})`}{' '}
                    &bull; {isBlock ? 'Block Logic' : 'C++ Code'} &bull;{' '}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Tooltip content="Open in Workspace Editor" position="top">
                      <Link
                        to={`/editor/${project.id}${project.boardTarget === 'software' ? '?engine=software' : '?engine=hardware'}`}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
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
