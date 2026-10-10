import { useAuthStore } from '../stores/auth.store';
import { useProjectStore } from '../stores/project.store';
import { FolderCode, Plus, TrendingUp, Zap, Award, Cpu, Play, Brain } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NewProjectDialog } from '../components/ui/NewProjectDialog';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { projects, fetchProjects } = useProjectStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(
    () => searchParams.get('new') === 'true',
  );
  const [newProjectCategory, setNewProjectCategory] = useState<
    'hardware' | 'software' | 'ai' | null
  >(null);

  const openNewProject = (category: 'hardware' | 'software' | 'ai' | null) => {
    setNewProjectCategory(category);
    setIsNewProjectOpen(true);
  };

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
          onClick={() => openNewProject(null)}
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

          {/* Start a new project. This is a create-only launcher — it never
              lists existing projects. Browse or open what you already have
              from "My Projects" in the sidebar instead. */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              What are you working on today?
            </h2>
            <Link
              to="/projects"
              className="text-xs font-semibold text-playful-primary dark:text-playful-highlight hover:underline shrink-0"
            >
              View my projects →
            </Link>
          </div>

          <div className="flex flex-col items-center w-full max-w-4xl mx-auto py-4">
            <p className="text-sm text-slate-500 mb-8 text-center">
              Pick a workspace to start a new project.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
              <button
                onClick={() => openNewProject('hardware')}
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
                onClick={() => openNewProject('software')}
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
              <button
                onClick={() => openNewProject('ai')}
                className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-[#FF6F61]/50 bg-white dark:bg-[#1A1D24] hover:bg-[#FFEDEA]/30 dark:hover:bg-[#FF6F61]/5 hover:shadow-lg transition-all duration-300 group cursor-pointer"
              >
                <div className="w-20 h-20 bg-[#FFEDEA] dark:bg-[#FF6F61]/15 text-[#FF6F61] rounded-2xl flex items-center justify-center transition-colors">
                  <Brain size={36} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-xl text-slate-900 dark:text-white mb-1.5">
                    AI
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Train an image, sound, or pose model
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions / Info Panel */}
        <div className="w-full lg:w-72 xl:w-80 px-6 py-8 shrink-0 flex flex-col gap-6">
          <div>
            <h2 className="font-heading font-black text-xs text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => openNewProject(null)}
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
      <NewProjectDialog
        open={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        preSelectedCategory={newProjectCategory}
      />
    </div>
  );
}
