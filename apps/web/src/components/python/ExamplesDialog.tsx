import { useEffect, useMemo } from 'react';
import { X, Blocks, Keyboard } from 'lucide-react';
import { PYTHON_EXAMPLES, type PythonExample } from '../../lib/python/examples';
import { aiExamples, boardExamples } from '../../lib/python/board-examples';
import { isPythonBoardTarget, pythonBoardInfo, type PythonTarget } from '../../lib/python/targets';

interface Props {
  open: boolean;
  /** Where the project runs: board examples are made for that board's pins. */
  target: PythonTarget;
  mode: 'block' | 'code';
  onPick: (example: PythonExample) => void;
  onClose: () => void;
}

export function ExamplesDialog({ open, target, mode, onPick, onClose }: Props) {
  const groups = useMemo(() => {
    const board = isPythonBoardTarget(target) ? target : null;
    const usable = (list: PythonExample[]) =>
      mode === 'block' ? list.filter((e) => e.blocks) : list;
    return [
      ...(board
        ? [
            {
              title: `Your ${pythonBoardInfo(board)?.label} board`,
              list: usable(boardExamples(board)),
            },
          ]
        : []),
      { title: 'AI (uses your model from AI Studio)', list: usable(aiExamples(board)) },
      { title: 'Python basics', list: usable(PYTHON_EXAMPLES) },
    ].filter((g) => g.list.length > 0);
  }, [target, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 font-playful"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="py-examples-title"
        className="bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 pb-3 shrink-0">
          <div className="flex-1 min-w-0">
            <h2
              id="py-examples-title"
              className="font-heading font-black text-xl text-slate-900 dark:text-white flex items-center gap-2"
            >
              Examples
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 inline-flex items-center gap-1">
                {mode === 'block' ? <Blocks size={11} /> : <Keyboard size={11} />}
                {mode === 'block' ? 'Blocks' : 'Python'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Opening an example replaces your current program. Press Undo to get yours back.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close examples"
            className="p-2 -m-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-5 flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {group.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.list.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => onPick(ex)}
                    className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:border-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-500/10 text-left transition-colors active:scale-[0.99]"
                  >
                    <span className="text-2xl leading-none shrink-0" aria-hidden="true">
                      {ex.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-sm text-slate-900 dark:text-white">
                        {ex.title}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                        {ex.blurb}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
