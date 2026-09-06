import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, GitFork, Blocks, Code2, Search } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Loader } from '../components/ui/Loader';
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
        <Loader message="Exploring community builds..." />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col font-playful bg-transparent">
      <PageHeader icon={Globe} title="Gallery" subtitle="Browse and remix community projects" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-transparent">
        {/* Search */}
        <div className="relative mb-6 max-w-2xl">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or creators..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#141824] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-playful-primary transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/40 text-playful-primary dark:text-playful-highlight border border-purple-200/60 dark:border-purple-800/60 rounded-3xl flex items-center justify-center mb-4">
              <Globe size={28} />
            </div>
            <p className="font-heading font-black text-xl text-tg-dark dark:text-white mb-1">
              No projects found
            </p>
            <p className="text-sm font-medium text-slate-400">
              Published projects from the community will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bg-white/80 dark:bg-[#141824]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 flex flex-col hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-500/40 hover:-translate-y-1 transition-all"
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      p.type === 'BLOCK'
                        ? 'bg-purple-100 dark:bg-purple-950/50 text-playful-primary dark:text-playful-highlight'
                        : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {p.type === 'BLOCK' ? <Blocks size={18} /> : <Code2 size={18} />}
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {p.type === 'BLOCK' ? 'Block Logic' : 'C++ Code'} &bull;{' '}
                    {p.boardTarget.split(':').pop()}
                  </span>
                </div>

                <h3 className="font-heading font-black text-lg text-tg-dark dark:text-white mb-1 line-clamp-2">
                  {p.title}
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-5">
                  by {p.user.name}
                </p>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <GitFork size={13} /> {p.forkCount} forks
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/editor/${p.id}${p.boardTarget === 'software' ? '?engine=software' : '?engine=hardware'}`}
                      className="text-xs font-extrabold text-playful-primary dark:text-playful-highlight hover:underline transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => {
                        void fork(p.id);
                      }}
                      disabled={forking === p.id}
                      className="text-xs font-black px-4 py-2 bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary text-white rounded-xl shadow-xs hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {forking === p.id ? '...' : 'Remix 🛠️'}
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
