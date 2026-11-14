import {
  Play,
  Cpu,
  Brain,
  X,
  Check,
  Camera,
  Mic,
  PersonStanding,
  Type as TypeIcon,
  Table2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services/project.service';
import { useProjectStore } from '../../stores/project.store';
import { BOARDS } from '../../lib/boards';
import type { AITrainerTab } from '../../stores/ai.store';

type ProjectCategory = 'software' | 'hardware' | 'ai';

const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  software: 'Software',
  hardware: 'Hardware',
  ai: 'AI',
};

/**
 * An AI project is created for exactly one modality. AI Studio then opens only
 * that trainer, which is what stops one project's image/audio/pose data and
 * "already trained" flags from showing up in another.
 */
/**
 * One row per coding mode. These used to be three vertical cards in a
 * three-column grid inside a 512px dialog, which left each card ~145px wide —
 * the titles wrapped mid-phrase and the blurbs stretched into seven-line
 * ribbons. A full-width row fits the icon, the name and a one-line blurb at
 * any dialog width.
 */
const MODES: Array<{
  id: ProjectCategory;
  label: string;
  blurb: string;
  icon: typeof Play;
  tint: { icon: string; active: string; check: string };
}> = [
  {
    id: 'software',
    label: 'Software Coding',
    blurb: 'Blocks or text, run in the browser simulator.',
    icon: Play,
    tint: {
      icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      active:
        'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10',
      check: 'text-emerald-500',
    },
  },
  {
    id: 'hardware',
    label: 'Hardware Coding',
    blurb: 'Blocks or C++, upload to Arduino & ESP boards.',
    icon: Cpu,
    tint: {
      icon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      active: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10',
      check: 'text-purple-500',
    },
  },
  {
    id: 'ai',
    label: 'AI Model Training',
    blurb: 'Train a model from your own examples.',
    icon: Brain,
    tint: {
      icon: 'bg-[#FFEDEA] dark:bg-[#FF6F61]/20 text-[#FF6F61]',
      active: 'border-[#FF6F61] ring-2 ring-[#FF6F61]/20 bg-[#FFEDEA]/40 dark:bg-[#FF6F61]/10',
      check: 'text-[#FF6F61]',
    },
  },
];

const AI_KINDS: Array<{ id: AITrainerTab; label: string; icon: typeof Camera }> = [
  { id: 'image', label: 'Image / Video', icon: Camera },
  { id: 'audio', label: 'Audio', icon: Mic },
  { id: 'pose', label: 'Pose', icon: PersonStanding },
  { id: 'text', label: 'Text', icon: TypeIcon },
  { id: 'numbers', label: 'Numbers', icon: Table2 },
];

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  preSelectedCategory?: ProjectCategory | null;
}

export function NewProjectDialog({ open, onClose, preSelectedCategory }: NewProjectDialogProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [board, setBoard] = useState<string>(BOARDS[0]!.fqbn);
  const [aiKind, setAiKind] = useState<AITrainerTab>('audio');
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
      setBoard(BOARDS[0]!.fqbn);
      setAiKind('audio');
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
      const boardTarget = category === 'hardware' ? board : category;
      const project = await projectService.create({
        title: title.trim(),
        type: 'BLOCK',
        boardTarget,
        // Stamp the chosen modality into the project's own saved state at
        // creation, so every later open (direct URL, Projects list, Gallery)
        // knows which single trainer to show without guessing.
        ...(category === 'ai'
          ? { blockState: JSON.stringify({ blockXml: '', aiKind, aiTab: aiKind }) }
          : {}),
      });

      // Optimistically add to store projects list
      useProjectStore.getState().addProject(project);

      navigate(
        category === 'ai'
          ? `/ai-trainer/${project.id}?kind=${aiKind}`
          : `/editor/${project.id}?engine=${category}`,
      );
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
        className="bg-white dark:bg-[#15152b] border border-slate-200 dark:border-white/10 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative flex flex-col gap-5"
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
              ? `Create New ${CATEGORY_LABELS[preSelectedCategory]} Project`
              : 'Create New Project'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {preSelectedCategory
              ? `Give your new ${CATEGORY_LABELS[preSelectedCategory]} workspace a name.`
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
            className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1b1b33] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Category / Mode Selection */}
        {!preSelectedCategory && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Choose Coding Mode <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              {MODES.map(({ id, label, blurb, icon: Icon, tint }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  disabled={isCreating}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left bg-slate-50 dark:bg-[#1b1b33] hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.99] transition-all duration-150 ${
                    category === id ? tint.active : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  <span
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${tint.icon}`}
                  >
                    <Icon size={19} className={id === 'software' ? 'fill-current' : ''} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-sm text-slate-900 dark:text-white">
                      {label}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 leading-snug">
                      {blurb}
                    </span>
                  </span>
                  {category === id && <Check size={17} className={`shrink-0 ${tint.check}`} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Model Type (AI only) — required, mirrors the Board step below. */}
        {category === 'ai' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              What does this model learn from? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              This tab opens first. You can still use all the other model types inside the project.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AI_KINDS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAiKind(id)}
                  disabled={isCreating}
                  className={`flex items-center gap-2 h-11 px-3 rounded-xl border text-left transition-all duration-150 ${
                    aiKind === id
                      ? 'border-[#FF6F61] ring-2 ring-[#FF6F61]/20 bg-[#FFEDEA]/40 dark:bg-[#FF6F61]/10'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1b1b33] hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon
                    size={15}
                    className={`shrink-0 ${aiKind === id ? 'text-[#FF6F61]' : 'text-slate-400'}`}
                  />
                  <span
                    className={`text-sm font-semibold truncate ${
                      aiKind === id ? 'text-[#FF6F61]' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {label}
                  </span>
                  {aiKind === id && <Check size={14} className="ml-auto shrink-0 text-[#FF6F61]" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Board Selection (Hardware only) */}
        {category === 'hardware' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Choose Board <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BOARDS.map((b) => (
                <button
                  key={b.fqbn}
                  type="button"
                  onClick={() => setBoard(b.fqbn)}
                  disabled={isCreating}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold text-left transition-all duration-150 ${
                    board === b.fqbn
                      ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10 text-purple-600 dark:text-purple-400'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1b1b33] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{b.label}</span>
                  {board === b.fqbn && <Check size={14} className="shrink-0" />}
                </button>
              ))}
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
                : category === 'ai'
                  ? 'bg-[#FF6F61] hover:bg-[#E8584A] shadow-[#FF6F61]/20'
                  : 'bg-slate-500'
          }`}
        >
          {isCreating ? 'Creating Project...' : 'Create Project'}
        </button>
      </form>
    </div>
  );
}
