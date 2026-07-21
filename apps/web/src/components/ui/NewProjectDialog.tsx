import { Play, Cpu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services/project.service';
import { useProjectStore } from '../../stores/project.store';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  preSelectedCategory?: 'software' | 'hardware' | null;
}

export function NewProjectDialog({ open, onClose, preSelectedCategory }: NewProjectDialogProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'software' | 'hardware' | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Reset dialog state when opened/closed
  useEffect(() => {
    if (open) {
      setTitle('');
      setCategory(preSelectedCategory || null);
      setError(null);
      setIsCreating(false);
    }
  }, [open, preSelectedCategory]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project name is required');
      return;
    }
    if (!category) {
      setError('Please select a coding mode');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const boardTarget = category === 'software' ? 'software' : 'arduino:avr:uno';
      const project = await projectService.create({
        title: title.trim(),
        type: 'BLOCK',
        boardTarget,
      });

      // Optimistically add to store projects list
      useProjectStore.getState().addProject(project);

      navigate(`/editor/${project.id}?engine=${category}`);
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ?? 'Failed to create project. Please try again.';
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 relative flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
          title="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Title / Description */}
        <div className="text-center pt-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {preSelectedCategory
              ? `Create New ${preSelectedCategory.charAt(0).toUpperCase() + preSelectedCategory.slice(1)} Project`
              : 'Create New Project'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {preSelectedCategory
              ? `Give your new ${preSelectedCategory} workspace a name.`
              : 'Configure your new workspace environment.'}
          </p>
        </div>

        {/* Project Name Input */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. My Smart Home LED"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isCreating}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#16181D] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Category / Mode Selection */}
        {!preSelectedCategory && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Choose Coding Mode <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Software Coding Card */}
              <button
                type="button"
                onClick={() => setCategory('software')}
                disabled={isCreating}
                className={`flex flex-col items-center text-center p-5 rounded-2xl border bg-slate-50 dark:bg-[#16181D] hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-200 group ${
                  category === 'software'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Play size={22} className="fill-current" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                  Software Coding
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Code using blockly logic or text and run/test inside the interactive browser
                  simulator.
                </p>
              </button>

              {/* Hardware Coding Card */}
              <button
                type="button"
                onClick={() => setCategory('hardware')}
                disabled={isCreating}
                className={`flex flex-col items-center text-center p-5 rounded-2xl border bg-slate-50 dark:bg-[#16181D] hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-200 group ${
                  category === 'hardware'
                    ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Cpu size={22} />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                  Hardware Coding
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Code using blocks or C++ text and compile/upload directly to real Arduino & ESP
                  boards.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && <div className="text-sm font-medium text-red-500 text-center">{error}</div>}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isCreating || !title.trim() || !category}
          className={`w-full h-11 rounded-xl text-white font-sans font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            category === 'software'
              ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
              : category === 'hardware'
                ? 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/10'
                : 'bg-slate-500'
          }`}
        >
          {isCreating ? 'Creating Project...' : 'Create Project'}
        </button>
      </form>
    </div>
  );
}
