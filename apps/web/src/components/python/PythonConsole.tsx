/**
 * PythonConsole.tsx — where a Python program's output, questions and errors appear.
 */
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  CornerDownLeft,
  Eraser,
  Lightbulb,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Square,
  ChevronDown,
} from 'lucide-react';
import type { PythonRunState } from '../../lib/python/use-python-run';
import { END_OF_INPUT } from '../../lib/python/protocol';

/** One block of output. Memoised: only the block that changed is laid out again. */
const Chunk = memo(function Chunk({ text }: { text: string }) {
  // content-visibility skips layout and paint for blocks scrolled out of view.
  return (
    <div className="[content-visibility:auto] [contain-intrinsic-block-size:auto_120px]">
      {text}
    </div>
  );
});

interface Props {
  run: PythonRunState;
  /** Jump to a line of the code (shown on error cards). */
  onGoToLine?: (line: number) => void;
  /** Label for the go-to-line button, e.g. "Show line 3" or "Show line 3 in Python". */
  goToLineLabel?: (line: number) => string;
  className?: string;
}

const STATUS: Record<PythonRunState['status'], { text: string; cls: string } | null> = {
  idle: null,
  running: { text: 'Running…', cls: 'bg-emerald-500/15 text-emerald-300' },
  waiting: { text: 'Waiting for your answer', cls: 'bg-sky-500/15 text-sky-300' },
  finished: { text: 'Finished', cls: 'bg-emerald-500/15 text-emerald-300' },
  stopped: { text: 'Stopped', cls: 'bg-amber-500/15 text-amber-300' },
  error: { text: 'Error', cls: 'bg-red-500/15 text-red-300' },
};

export function PythonConsole({ run, onGoToLine, goToLineLabel, className = '' }: Props) {
  const { status, chunks, hasOutput, truncated, prompt, error } = run;
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [showRaw, setShowRaw] = useState(false);

  // Follow new output unless the student has scrolled up to read something.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [chunks, status, error]);

  useEffect(() => {
    if (status === 'waiting') stickToBottom.current = true;
  }, [status, prompt]);

  // A new error starts with the raw message folded away.
  const [rawFor, setRawFor] = useState(error);
  if (rawFor !== error) {
    setRawFor(error);
    setShowRaw(false);
  }

  const pill = STATUS[status];

  return (
    <div
      className={`flex flex-col min-h-0 bg-ed-term-bg text-ed-term-text rounded-2xl border border-ed-term-line overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="h-10 shrink-0 flex items-center gap-2 px-3 border-b border-ed-term-line bg-ed-term-surface">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ed-term-dim">
          Output
        </span>
        {pill && (
          <span
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${pill.cls}`}
            aria-live="polite"
          >
            {status === 'running' && <Loader2 size={11} className="animate-spin" />}
            {status === 'finished' && <CheckCircle2 size={11} />}
            {status === 'stopped' && <Square size={9} fill="currentColor" />}
            {status === 'error' && <AlertTriangle size={11} />}
            {pill.text}
          </span>
        )}
        <button
          type="button"
          onClick={run.clear}
          disabled={!hasOutput && !error}
          className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-ed-term-dim hover:text-ed-term-text disabled:opacity-40 disabled:hover:text-ed-term-dim px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Clear output"
        >
          <Eraser size={13} /> Clear
        </button>
      </div>

      {/* Output + question + error */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 font-mono text-[13px] leading-relaxed"
      >
        {truncated && (
          <p className="text-ed-term-dim text-[11px] italic mb-1">
            … earlier output hidden to keep things fast
          </p>
        )}
        {!hasOutput && status === 'idle' && !error && (
          <p className="text-ed-term-dim font-sans text-sm">
            Press <span className="font-bold text-emerald-400">▶ Run</span> and anything your
            program prints will show up here.
          </p>
        )}
        {(hasOutput || status !== 'idle') && (
          <pre role="log" className="whitespace-pre-wrap break-words m-0 font-mono">
            {chunks.map((c) => (
              <Chunk key={c.id} text={c.text} />
            ))}
          </pre>
        )}
        {status === 'finished' && !hasOutput && (
          <p className="text-ed-term-dim font-sans text-sm">
            Your program finished without printing anything. Try adding a print block or print(...).
            If it only makes a function or a class, it also needs a line that uses it, like
            print(my_function(5)).
          </p>
        )}

        {error && (
          <div
            className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 font-sans text-sm"
            role="alert"
          >
            <p className="font-bold text-red-300 flex items-center gap-1.5">
              <AlertTriangle size={15} className="shrink-0" /> {error.title}
            </p>
            <p className="text-ed-term-text/90 mt-1 leading-snug">{error.explanation}</p>
            {error.hint && (
              <p className="mt-2 flex gap-1.5 text-amber-200 leading-snug">
                <Lightbulb size={15} className="shrink-0 mt-0.5" /> {error.hint}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {error.line && onGoToLine && (
                <button
                  type="button"
                  onClick={() => onGoToLine(error.line!)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors"
                >
                  {goToLineLabel ? goToLineLabel(error.line) : `Show line ${error.line}`}
                </button>
              )}
              {error.raw.name !== 'StartError' && (
                <button
                  type="button"
                  onClick={() => setShowRaw((v) => !v)}
                  aria-expanded={showRaw}
                  className="text-xs font-semibold px-2 py-1.5 rounded-lg text-ed-term-dim hover:text-ed-term-text flex items-center gap-1"
                >
                  <ChevronDown
                    size={13}
                    className={`transition-transform ${showRaw ? 'rotate-180' : ''}`}
                  />
                  What Python said
                </button>
              )}
            </div>
            {showRaw && (
              <pre className="mt-2 whitespace-pre-wrap break-words text-[12px] text-ed-term-dim font-mono">
                {error.raw.name}
                {error.raw.message ? `: ${error.raw.message}` : ''}
                {error.raw.line ? `  (line ${error.raw.line})` : ''}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Answer box for input(). Mounted fresh for each question. */}
      {status === 'waiting' && (
        <AnswerBox prompt={prompt} onSubmit={run.answer} endsInput={run.inputEnds} />
      )}
      {/* A board reads typing at any time: one box for the whole run. */}
      {status === 'running' && run.interactive && (
        <AnswerBox prompt="" onSubmit={run.answer} keep />
      )}
    </div>
  );
}

function AnswerBox({
  prompt,
  onSubmit,
  keep = false,
  endsInput = false,
}: {
  prompt: string;
  onSubmit: (text: string) => void;
  /** Stays for the whole run (a board): clear after sending, don't grab focus. */
  keep?: boolean;
  /** The program reads sys.stdin: an empty answer ends the input. */
  endsInput?: boolean;
}) {
  const [answer, setAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (keep) return;
    // preventScroll: on phones, focusing must not jump the whole page.
    inputRef.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() =>
      inputRef.current?.scrollIntoView({ block: 'nearest' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [keep]);

  return (
    <form
      className="shrink-0 flex items-center gap-2 p-2 border-t border-sky-500/40 bg-sky-500/10"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(answer);
        if (keep) setAnswer('');
      }}
    >
      <label htmlFor="py-answer" className="sr-only">
        {keep ? 'Send to your board' : prompt ? `Answer: ${prompt}` : 'Type your answer'}
      </label>
      <input
        id="py-answer"
        ref={inputRef}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl+D ends the input, as in a terminal (input() then raises EOFError).
          if (!keep && e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            onSubmit(END_OF_INPUT);
          }
        }}
        onPaste={(e) => {
          // A one-line box would join pasted lines into one ("3 4" + "1 2" →
          // "3 41 2"). Send them as separate answers instead.
          const pasted = e.clipboardData.getData('text');
          if (!/[\r\n]/.test(pasted)) return;
          e.preventDefault();
          const el = e.currentTarget;
          const start = el.selectionStart ?? answer.length;
          const end = el.selectionEnd ?? answer.length;
          onSubmit(answer.slice(0, start) + pasted + answer.slice(end));
          if (keep) setAnswer('');
        }}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        placeholder={
          keep
            ? 'Type here and press Enter to send'
            : endsInput
              ? 'Type or paste input. Empty + Enter = done'
              : prompt.trim()
                ? `${prompt.trim()} — type here`
                : 'Type your answer here'
        }
        className="flex-1 min-w-0 h-10 rounded-xl bg-ed-term-surface border border-sky-500/40 px-3 font-mono text-sm text-ed-term-text placeholder:text-ed-term-dim outline-none focus:ring-2 focus:ring-sky-400/60"
      />
      <button
        type="submit"
        className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm flex items-center gap-1.5 shrink-0 transition-colors"
      >
        <CornerDownLeft size={15} /> Enter
      </button>
    </form>
  );
}
