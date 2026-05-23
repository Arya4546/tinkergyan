/**
 * Gallery.tsx
 *
 * Public project showcase. Browse published projects and fork them.
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe, GitFork, LayoutGrid, Code2, Search, Loader2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../services/api';

interface GalleryProject {
  id: string;
  title: string;
  type: 'BLOCK' | 'CODE';
  boardTarget: string;
  forkCount: number;
  createdAt: string;
  user: { name: string; avatar: string | null };
}

export default function Gallery() {
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [forking, setForking]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/projects/gallery');
      setProjects(data.data.projects);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fork = async (id: string) => {
    setForking(id);
    try {
      await api.post(`/projects/${id}/fork`);
      await load(); // refresh fork counts
    } catch { /* empty */ }
    setForking(null);
  };

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.user.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Gallery"
        subtitle={`${projects.length} published projects`}
        icon={Globe}
      />

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects or creators..."
          className="w-full h-10 pl-9 pr-4 font-mono text-xs bg-white dark:bg-[#0a0a0a] hw-border outline-none placeholder:text-slate-400"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No projects yet"
          subtitle="Published projects from the community will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="hw-border bg-white dark:bg-[#0a0a0a] flex flex-col transition-colors hover:border-emerald-500"
            >
              {/* Header */}
              <div className="p-4 flex-1">
                <div className="flex items-center gap-2 mb-3">
                  {p.type === 'BLOCK'
                    ? <LayoutGrid size={14} className="text-yellow-500" />
                    : <Code2 size={14} className="text-blue-500" />
                  }
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {p.type} • {p.boardTarget.split(':').pop()}
                  </span>
                </div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white mb-2">
                  {p.title}
                </h3>
                <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                  by {p.user.name}
                </p>
              </div>

              {/* Footer */}
              <div className="hw-border-t flex items-center justify-between px-4 py-2">
                <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                  <GitFork size={10} /> {p.forkCount}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/editor/${p.id}`}
                    className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => fork(p.id)}
                    disabled={forking === p.id}
                    className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {forking === p.id ? '...' : 'Remix'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
