/**
 * Projects.tsx
 *
 * Full project management page with search, filter, grid view,
 * and delete with confirmation dialog.
 */
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderCode, Search, Plus, Trash2, Play, Beaker,
  TerminalSquare, Filter, Zap,
} from 'lucide-react';

import { useProjectStore } from '../stores/project.store';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Loader } from '../components/ui/Loader';

type FilterType = 'ALL' | 'BLOCK' | 'CODE';

export default function Projects() {
  const { projects, isLoading, error, hasFetched, fetchProjects, removeProject } = useProjectStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFetched) fetchProjects();
  }, [hasFetched, fetchProjects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (filter !== 'ALL') list = list.filter((p) => p.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    return list;
  }, [projects, filter, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeProject(deleteTarget);
    setDeleteTarget(null);
  };

  const deleteProjectTitle = projects.find((p) => p.id === deleteTarget)?.title ?? '';

  return (
    <div className="w-full h-full flex flex-col">
      <PageHeader icon={FolderCode} title="Projects" subtitle="LOCAL_STORAGE">
        <Link
          to="/editor"
          className="h-12 px-6 hw-key bg-yellow-400 text-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 flex items-center gap-2"
        >
          <Plus size={16} /> NEW_PROJECT
        </Link>
      </PageHeader>

      {/* Search + Filter Bar */}
      <div className="hw-border-b bg-slate-50 dark:bg-[#0a0a0a] px-6 lg:px-10 py-4 flex flex-col sm:flex-row gap-3 shrink-0">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full h-10 pl-9 pr-4 hw-border bg-white dark:bg-[#111111] font-mono text-xs uppercase tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center hw-border divide-x divide-slate-900 dark:divide-slate-800 shrink-0">
          {(['ALL', 'BLOCK', 'CODE'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-10 px-4 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${
                filter === f
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-[#000000] text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f === 'ALL' && <Filter size={10} />}
              {f === 'BLOCK' && <Beaker size={10} />}
              {f === 'CODE' && <TerminalSquare size={10} />}
              {f}
            </button>
          ))}
        </div>

        {/* Count */}
        <div className="h-10 px-4 hw-border bg-white dark:bg-[#111111] flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {filtered.length} / {projects.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-white dark:bg-[#0A0A0A]">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader message="LOADING_PROJECTS..." />
          </div>
        )}

        {!isLoading && error && (
          <div className="font-mono text-xs text-red-400 uppercase tracking-widest text-center py-12">{error}</div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <EmptyState
            icon={FolderCode}
            title={search || filter !== 'ALL' ? 'NO_RESULTS_FOUND' : 'NO_PROJECTS_YET'}
            subtitle={search || filter !== 'ALL' ? 'Try adjusting your search or filter' : 'Create your first project to get started'}
          >
            {!search && filter === 'ALL' && (
              <Link
                to="/editor"
                className="h-10 px-6 hw-key bg-yellow-400 text-slate-900 hover:bg-slate-900 hover:text-white flex items-center gap-2 text-xs mt-4"
              >
                <Plus size={14} /> NEW_PROJECT
              </Link>
            )}
          </EmptyState>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const isBlock = project.type === 'BLOCK';
              return (
                <div
                  key={project.id}
                  className="hw-border bg-slate-50 dark:bg-[#111111] p-5 flex flex-col group hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-colors"
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className={`w-10 h-10 border-2 ${isBlock ? 'border-pink-400 bg-pink-500/10' : 'border-blue-400 bg-blue-500/10'} flex items-center justify-center shrink-0`}>
                      {isBlock
                        ? <Beaker size={20} className="text-pink-500" />
                        : <TerminalSquare size={20} className="text-blue-500" />
                      }
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 uppercase">
                        {isBlock ? 'BLOCK' : 'C++'}
                      </span>
                      <button
                        onClick={() => setDeleteTarget(project.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-400"
                        title="Delete project"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-base leading-tight uppercase truncate mb-1 group-hover:text-white dark:group-hover:text-slate-900">
                    {project.title}
                  </h3>
                  <p className="font-mono text-[10px] text-slate-400 group-hover:text-slate-300 dark:group-hover:text-slate-600 mb-4">
                    {project.boardTarget} · {new Date(project.updatedAt).toLocaleDateString()}
                  </p>

                  {project.isPublic && (
                    <div className="inline-flex self-start items-center gap-1 px-2 py-0.5 mb-3 font-mono text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <Zap size={8} /> PUBLIC
                    </div>
                  )}

                  <div className="mt-auto pt-4 hw-border-t flex justify-end group-hover:border-slate-800 dark:group-hover:border-slate-200">
                    <Link
                      to={`/editor/${project.id}`}
                      className={`flex items-center gap-2 font-mono text-xs font-bold uppercase hover:underline ${isBlock ? 'group-hover:text-pink-400' : 'group-hover:text-blue-400'}`}
                    >
                      OPEN <Play size={12} className="fill-current" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="DELETE_PROJECT"
        message={`Are you sure you want to permanently delete "${deleteProjectTitle}"? This cannot be undone.`}
        confirmLabel="DELETE"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
