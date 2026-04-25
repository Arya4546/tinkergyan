import { useAuthStore } from '../stores/auth.store';
import { useProjectStore } from '../stores/project.store';
import { TerminalSquare, Play, FolderCode, Beaker, Zap, Activity, Cpu, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader } from '../components/ui/Loader';

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyProjects() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 hw-border bg-slate-50 dark:bg-[#111111] flex items-center justify-center mb-4 opacity-40">
        <FolderCode size={28} />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-6">
        NO_LOCAL_DISKS_FOUND<br />
        <span className="text-[10px] opacity-60">Create your first project to get started</span>
      </p>
      <Link
        to="/editor"
        className="h-10 px-6 hw-key bg-yellow-400 text-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 flex items-center gap-2 text-xs"
      >
        <Plus size={14} /> NEW_PROJECT
      </Link>
    </div>
  );
}

function ProjectCard({
  project,
  onDelete,
}: {
  project: ReturnType<typeof useProjectStore.getState>['projects'][number];
  onDelete: (id: string) => void;
}) {
  const isBlock = project.type === 'BLOCK';
  const accentColor = isBlock ? 'pink' : 'blue';

  return (
    <div className="hw-border bg-slate-50 dark:bg-[#111111] p-4 flex flex-col group hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-colors">
      <div className="flex justify-between items-start mb-6">
        <div className={`w-10 h-10 border-2 border-${accentColor}-400 bg-${accentColor}-500/10 flex items-center justify-center shrink-0`}>
          {isBlock
            ? <Beaker size={20} className={`text-${accentColor}-500`} />
            : <TerminalSquare size={20} className={`text-${accentColor}-500`} />
          }
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-400 uppercase">
            {isBlock ? 'BLOCK_MODE' : 'C_CPP_MODE'}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); onDelete(project.id); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-red-400"
            title="Delete project"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <h3 className="font-bold text-base leading-tight uppercase truncate group-hover:text-white dark:group-hover:text-slate-900 mb-1">
        {project.title}
      </h3>
      <p className="font-mono text-[10px] text-slate-400 group-hover:text-slate-300 dark:group-hover:text-slate-600 mb-4">
        {project.boardTarget} · {new Date(project.updatedAt).toLocaleDateString()}
      </p>

      <div className="mt-auto pt-4 hw-border-t flex justify-end group-hover:border-slate-800 dark:group-hover:border-slate-200">
        <Link
          to={`/editor/${project.id}`}
          className={`flex items-center gap-2 font-mono text-xs font-bold group-hover:text-${accentColor}-400 uppercase hover:underline`}
        >
          OPEN <Play size={12} className="fill-current" />
        </Link>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const user         = useAuthStore((s) => s.user);
  const { projects, isLoading, error, hasFetched, fetchProjects, removeProject } = useProjectStore();

  useEffect(() => {
    if (!hasFetched) fetchProjects();
  }, [hasFetched, fetchProjects]);

  return (
    <div className="w-full h-full flex flex-col font-sans">

      {/* Top Banner */}
      <div className="w-full hw-border-b bg-white dark:bg-[#000000] p-6 lg:p-10 flex flex-col md:flex-row md:items-end justify-between shrink-0">
        <div>
          <div className="font-mono text-xs text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 mr-1" />
            User Identified
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none text-slate-900 dark:text-white">
            Welcome,<br className="md:hidden" /> {user?.name?.split(' ')[0] || 'Maker'}
          </h1>
        </div>
        <div className="mt-6 md:mt-0 flex gap-4">
          <Link
            to="/editor"
            className="h-12 px-6 hw-key bg-yellow-400 text-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 flex items-center gap-2"
          >
            <Zap size={16} /> NEW_PROJECT
          </Link>
          <Link
            to="/courses"
            className="h-12 px-6 hw-key bg-white dark:bg-[#000000] text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 hidden sm:flex items-center gap-2"
          >
            <TerminalSquare size={16} /> QUEST_LOG
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Left: Stats + Projects */}
        <div className="flex-1 hw-border-r flex flex-col overflow-y-auto">

          {/* Stats LED Strip */}
          <div className="grid grid-cols-3 hw-border-b bg-slate-50 dark:bg-[#0a0a0a] shrink-0">
            <div className="hw-border-r p-6 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={100} />
              </div>
              <span className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-1">XP_LEVEL</span>
              <span className="font-mono text-4xl font-bold text-slate-900 dark:text-white tracking-tighter">
                {user?.xp ?? '0000'}
              </span>
            </div>
            <div className="hw-border-r p-6 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap size={100} />
              </div>
              <span className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-1">STREAK</span>
              <span className="font-mono text-4xl font-bold text-slate-900 dark:text-white tracking-tighter">
                {user?.streak ?? '00'}
              </span>
            </div>
            <div className="p-6 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity">
                <Cpu size={100} />
              </div>
              <span className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-1">RANK</span>
              <span className="font-mono text-4xl font-bold text-emerald-500 tracking-tighter">
                {user?.level ?? '01'}
              </span>
            </div>
          </div>

          {/* Projects */}
          <div className="flex-1 p-6 lg:p-10 bg-white dark:bg-[#0A0A0A]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-bold text-xl uppercase tracking-tight flex items-center gap-3">
                <div className="w-6 h-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                  <FolderCode size={12} />
                </div>
                Local Disks
              </h2>
              <button
                onClick={() => fetchProjects()}
                className="font-mono text-xs font-bold hover:underline underline-offset-4 uppercase tracking-widest text-slate-500"
              >
                REFRESH()
              </button>
            </div>

            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader message="LOADING_PROJECTS..." />
              </div>
            )}

            {!isLoading && error && (
              <p className="font-mono text-xs text-red-400 uppercase tracking-widest">{error}</p>
            )}

            {!isLoading && !error && projects.length === 0 && <EmptyProjects />}

            {!isLoading && !error && projects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} onDelete={removeProject} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Quest Console (static for now, Phase 3 will pull real data) */}
        <div className="w-full lg:w-[400px] xl:w-[500px] bg-slate-900 dark:bg-[#000000] text-slate-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">TRANSMISSION_TX</span>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>

          <div className="flex-1 p-6 md:p-10 flex flex-col justify-center">
            <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 font-mono text-[10px] font-bold uppercase tracking-widest mb-6 self-start">
              ACTIVE_DIRECTORY
            </div>
            <h3 className="text-3xl font-bold tracking-tight uppercase leading-tight mb-4 text-white">
              Arduino Basics <br />& Memory Loops
            </h3>
            <p className="text-sm font-mono text-slate-400 leading-relaxed mb-10 border-l-2 border-emerald-500 pl-4">
              // Objective: Initialize LED matrix array and author your first C++ control structure.
            </p>
            <div className="w-full bg-slate-800 h-2 mb-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-emerald-500 w-[25%]" />
            </div>
            <div className="flex justify-between font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-10">
              <span>MEM_LOAD</span>
              <span className="text-emerald-500">25%</span>
            </div>
            <Link
              to="/courses/arduino-basics"
              className="hw-key bg-emerald-500 text-slate-900 border-none h-14 hover:bg-white"
            >
              COMPILE_AND_RESUME
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
