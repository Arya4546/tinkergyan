/**
 * BoardControls.tsx — where a Python program runs, and the board it runs on.
 *
 *   RunOnBar        "Runs on: 💻 This computer ▾" plus the board's connection
 *                   (Connect / Install MicroPython / Upload …)
 *   InstallDialog   explains, then installs MicroPython with a progress bar
 */
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Cpu,
  Laptop,
  Plug,
  Unplug,
  Loader2,
  Upload,
  Trash2,
  Download,
  AlertTriangle,
  Check,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { PYTHON_BOARDS, pythonBoardInfo, type PythonTarget } from '../../lib/python/targets';
import type { PythonBoardState } from '../../lib/python/board/use-python-board';

interface RunOnBarProps {
  target: PythonTarget;
  onTargetChange: (t: PythonTarget) => void;
  board: PythonBoardState;
  /** A program is running (the target can't change then). */
  busy: boolean;
  onInstall: () => void;
  onUpload: () => void;
  onRemoveProgram: () => void;
  compact?: boolean;
}

const MENU_ITEM =
  'w-full min-h-11 px-3 py-2 flex items-center gap-3 text-sm font-semibold text-ed-hi hover:bg-ed-line-soft text-left disabled:opacity-50 disabled:cursor-not-allowed';

function useCloseOnOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

export function RunOnBar({
  target,
  onTargetChange,
  board,
  busy,
  onInstall,
  onUpload,
  onRemoveProgram,
  compact = false,
}: RunOnBarProps) {
  const [pickOpen, setPickOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pickRef = useCloseOnOutside(pickOpen, () => setPickOpen(false));
  const moreRef = useCloseOnOutside(moreOpen, () => setMoreOpen(false));
  const info = pythonBoardInfo(target);
  const onBoard = !!info;
  const { status } = board;

  const detected = board.info?.target ?? null;
  const mismatch = onBoard && status === 'connected' && detected && detected !== target;

  const choices: Array<{ id: PythonTarget; label: string; hint: string }> = [
    { id: 'python', label: 'This computer', hint: 'Runs in the browser. Nothing to plug in.' },
    ...PYTHON_BOARDS.map((b) => ({
      id: b.target,
      label: `${b.label} board`,
      hint: 'Runs on your board with MicroPython. Plug it in with USB.',
    })),
  ];

  const statusPill = (() => {
    if (!onBoard) return null;
    switch (status) {
      case 'unsupported':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-300 min-w-0">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="truncate" title={board.unsupportedMessage}>
              {compact ? "Can't connect in this browser" : board.unsupportedMessage}
            </span>
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ed-mid">
            <Loader2 size={14} className="animate-spin" /> Connecting…
          </span>
        );
      case 'installing':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ed-mid">
            <Loader2 size={14} className="animate-spin" /> Installing MicroPython…{' '}
            {board.install ? `${Math.round(board.install.percent)}%` : ''}
          </span>
        );
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
            <span
              className="truncate"
              title={`${pythonBoardInfo(board.info?.target)?.label ?? 'Board'} · MicroPython ${board.info?.version ?? ''}`}
            >
              Connected
            </span>
          </span>
        );
      case 'needs-micropython':
        return (
          <span className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={onInstall}
              className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-black flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <Download size={14} /> Install MicroPython
            </button>
            <button
              type="button"
              onClick={() => void board.connect()}
              aria-label="Connect a different board"
              title="Connect a different board"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ed-mid hover:text-ed-hi hover:bg-ed-raised shrink-0"
            >
              <Plug size={15} />
            </button>
          </span>
        );
      default:
        return (
          <button
            type="button"
            onClick={() => void board.connect()}
            className="h-8 px-3 rounded-lg bg-ed-accent hover:brightness-110 text-white text-xs font-black flex items-center gap-1.5 shrink-0 active:scale-95"
          >
            <Plug size={14} /> Connect board
          </button>
        );
    }
  })();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {/* Where it runs */}
        <div className="relative shrink-0" ref={pickRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={pickOpen}
            aria-label={`Runs on: ${info ? `${info.label} board` : 'this computer'}. Change`}
            disabled={busy}
            title={busy ? 'Stop the program to change this' : 'Choose where your program runs'}
            onClick={() => setPickOpen((v) => !v)}
            className="h-8 pl-2 pr-1.5 rounded-lg bg-ed-raised border border-ed-line text-ed-hi text-xs font-bold flex items-center gap-1.5 hover:border-ed-accent disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {onBoard ? (
              <Cpu size={14} className="text-emerald-500" />
            ) : (
              <Laptop size={14} className="text-sky-500" />
            )}
            {!compact && <span className="text-ed-mid font-semibold">Runs on</span>}
            <span>{info ? info.label : 'Computer'}</span>
            <ChevronDown size={14} className="text-ed-mid" />
          </button>
          {pickOpen && (
            <div
              role="listbox"
              aria-label="Where your program runs"
              className="absolute left-0 top-full mt-1 z-50 w-72 max-w-[calc(100vw-2rem)] py-1.5 rounded-2xl border border-ed-line bg-ed-raised shadow-xl"
            >
              {choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={c.id === target}
                  onClick={() => {
                    setPickOpen(false);
                    if (c.id !== target) onTargetChange(c.id);
                  }}
                  className={`${MENU_ITEM} items-start`}
                >
                  <span className="mt-0.5 text-ed-mid">
                    {c.id === 'python' ? <Laptop size={16} /> : <Cpu size={16} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block">{c.label}</span>
                    <span className="block text-[11px] font-medium text-ed-mid">{c.hint}</span>
                  </span>
                  {c.id === target && <Check size={16} className="text-ed-accent mt-0.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex items-center">{statusPill}</div>

        {onBoard && status === 'connected' && (
          <>
            <button
              type="button"
              onClick={onUpload}
              disabled={busy}
              title="Save the program on the board, so it also runs without the computer"
              className="h-8 px-2.5 rounded-lg bg-ed-raised border border-ed-line text-ed-hi text-xs font-bold flex items-center gap-1.5 shrink-0 hover:border-ed-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={14} />
              {!compact && <span>Upload</span>}
              <span className="sr-only">Upload to the board</span>
            </button>
            <div className="relative shrink-0" ref={moreRef}>
              <button
                type="button"
                aria-label="More board options"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ed-mid hover:text-ed-hi hover:bg-ed-raised"
              >
                <MoreHorizontal size={16} />
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 z-50 w-64 py-1.5 rounded-2xl border border-ed-line bg-ed-raised shadow-xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    className={MENU_ITEM}
                    onClick={() => {
                      setMoreOpen(false);
                      onRemoveProgram();
                    }}
                  >
                    <Trash2 size={16} className="text-ed-mid" /> Remove saved program
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    className={MENU_ITEM}
                    onClick={() => {
                      setMoreOpen(false);
                      onInstall();
                    }}
                  >
                    <Download size={16} className="text-ed-mid" /> Reinstall MicroPython
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    className={MENU_ITEM}
                    onClick={() => {
                      setMoreOpen(false);
                      void board.disconnect();
                    }}
                  >
                    <Unplug size={16} className="text-ed-mid" /> Disconnect
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {mismatch && (
        <div className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-200">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1 min-w-0">
            This board is an {pythonBoardInfo(detected)?.label}, but the project is set to{' '}
            {info?.label}.
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => onTargetChange(detected)}
            className="h-7 px-2 rounded-md bg-amber-500 text-white font-bold shrink-0 disabled:opacity-50"
          >
            Use {pythonBoardInfo(detected)?.label}
          </button>
        </div>
      )}

      {onBoard && board.problem && (
        <div
          role="status"
          className="flex items-start gap-2 text-xs rounded-lg px-2.5 py-1.5 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-200"
        >
          <AlertTriangle size={14} className="shrink-0 mt-px" />
          <span className="flex-1 min-w-0 break-words">{board.problem}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={board.clearProblem}
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Install MicroPython ─────────────────────────────────────────────────────

export function InstallDialog({
  open,
  board,
  onClose,
}: {
  open: boolean;
  board: PythonBoardState;
  onClose: () => void;
}) {
  const installing = board.status === 'installing';
  if (!open) return null;
  const pct = Math.max(0, Math.min(100, Math.round(board.install?.percent ?? 0)));

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-playful"
      onClick={() => !installing && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mp-install-title"
        className="bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full shadow-2xl p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            {installing ? <Loader2 size={26} className="animate-spin" /> : <Cpu size={26} />}
          </div>
          <h3
            id="mp-install-title"
            className="text-xl font-heading font-black text-slate-900 dark:text-white"
          >
            {installing ? 'Installing MicroPython…' : 'Put MicroPython on your board?'}
          </h3>
          {!installing ? (
            <ul className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed text-left space-y-1.5">
              <li>🐍 MicroPython lets your board run Python. You only do this once.</li>
              <li>
                🧹 It replaces whatever is on the board now (like an Arduino program). You can
                always upload an Arduino program again later.
              </li>
              <li>⏱️ It takes about a minute. Keep the board plugged in until it finishes.</li>
            </ul>
          ) : (
            <div className="mt-4" aria-live="polite">
              <div
                className="h-3 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                {board.install?.message ?? 'Getting ready…'} ({pct}%)
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-2 font-semibold">
                Don’t unplug the board or close this page.
              </p>
            </div>
          )}
        </div>
        {!installing && (
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              autoFocus
              // Closes when done: connected again, or the problem shows under "Runs on".
              onClick={() => void board.installMicroPython().finally(onClose)}
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-heading font-black text-sm rounded-xl shadow-md active:scale-[0.98]"
            >
              Install MicroPython
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-heading font-black text-sm rounded-xl"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
