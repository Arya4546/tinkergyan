import { useEffect, useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useProjectStore } from '../stores/project.store';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

type FilterType = 'ALL' | 'BLOCK' | 'CODE';

export default function Projects() {
  const { projects, isLoading, error, hasFetched, fetchProjects, removeProject } =
    useProjectStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFetched) void fetchProjects();
  }, [hasFetched, fetchProjects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (filter !== 'ALL') list = list.filter((p) => p.type === filter);
    if (search.trim())
      list = list.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [projects, filter, search]);

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
        <Link
          to="/editor"
          className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> New Project
        </Link>
      </PageHeader>

      {/* Search + Filter Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0a0a] px-6 lg:px-10 py-4 flex flex-col sm:flex-row gap-3 shrink-0">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          {(['ALL', 'BLOCK', 'CODE'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-10 px-4 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 border ${filter === f ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              {f === 'BLOCK' && <Blocks size={13} />}
              {f === 'CODE' && <TerminalSquare size={13} />}
              {f === 'ALL' ? 'All' : f === 'BLOCK' ? 'Blocks' : 'Code'}
            </button>
          ))}
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
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {search || filter !== 'ALL' ? 'No results found' : 'No projects yet'}
            </p>
            <p className="text-sm text-slate-400 mb-6">
              {search || filter !== 'ALL'
                ? 'Try adjusting your search or filter.'
                : 'Create your first project to get started.'}
            </p>
            {!search && filter === 'ALL' && (
              <Link
                to="/editor"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <Plus size={16} /> Create Project
              </Link>
            )}
          </div>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const isBlock = project.type === 'BLOCK';
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
                      {project.isPublic && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1">
                          <Zap size={10} /> Public
                        </span>
                      )}
                      <button
                        onClick={() => setDeleteTarget(project.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {project.boardTarget} &bull; {isBlock ? 'Block Logic' : 'C++ Code'} &bull;{' '}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Link
                      to={`/editor/${project.id}`}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      Open <Play size={12} className="fill-current" />
                    </Link>
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
    </div>
  );
}
