import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, GitFork, Blocks, Code2, Search, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [forking, setForking] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchGallery() {
      try {
        const response = await api.get<{
          success: boolean;
          data: { projects: GalleryProject[] };
        }>('/projects/gallery');
        if (active) {
          setProjects(response.data.data.projects);
        }
      } catch {
        /* empty */
      }
      if (active) {
        setLoading(false);
      }
    }
    void fetchGallery();
    return () => {
      active = false;
    };
  }, [reloadTrigger]);

  const fork = async (id: string) => {
    setForking(id);
    try {
      await api.post(`/projects/${id}/fork`);
      setReloadTrigger((prev) => prev + 1);
    } catch {
      /* empty */
    }
    setForking(null);
  };

  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.user.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={28} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <PageHeader icon={Globe} title="Gallery" subtitle="Browse and remix community projects" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-white dark:bg-[#111111]">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or creators..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a1a1a] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Globe size={24} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
              No projects found
            </p>
            <p className="text-sm text-slate-400">
              Published projects from the community will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.type === 'BLOCK' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600'}`}
                  >
                    {p.type === 'BLOCK' ? <Blocks size={16} /> : <Code2 size={16} />}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {p.type === 'BLOCK' ? 'Block Logic' : 'C++ Code'} &bull;{' '}
                    {p.boardTarget.split(':').pop()}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 line-clamp-2">
                  {p.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">by {p.user.name}</p>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <GitFork size={12} /> {p.forkCount} forks
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/editor/${p.id}${p.boardTarget === 'software' ? '?engine=software' : '?engine=hardware'}`}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => {
                        void fork(p.id);
                      }}
                      disabled={forking === p.id}
                      className="text-xs font-semibold px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50"
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
    </div>
  );
}
