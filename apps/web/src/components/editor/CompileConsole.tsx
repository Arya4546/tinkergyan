/**
 * CompileConsole.tsx
 *
 * Motivational compile console with tabs: Output / Quick Hints / History.
 * Uses rotating child-friendly messages for success, error, warning, timeout.
 */
import { useState, useEffect, useRef } from 'react';
import { Terminal, CheckCircle2, Clock, Loader2, BookOpen, History, Lightbulb } from 'lucide-react';
import type { CompileError } from '../../stores/editor.store';
import {
  getSuccessMessage,
  getErrorMessage,
  getWarningMessage,
  getTimeoutMessage,
  getFriendlyHint,
  QUICK_HINTS,
  COMPILE_STEPS,
} from '../../utils/console-messages';

interface CompileResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  errors: CompileError[];
  durationMs: number;
  engine?: string;
}

interface HistoryEntry {
  run: number;
  success: boolean;
  hasWarnings: boolean;
  isTimeout: boolean;
  time: string;
}

interface CompileConsoleProps {
  isCompiling: boolean;
  compileResult: CompileResult | null;
}

type Tab = 'output' | 'hints' | 'history';

export function CompileConsole({ isCompiling, compileResult }: CompileConsoleProps) {
  const [tab, setTab] = useState<Tab>('output');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [compileStep, setCompileStep] = useState(0);
  const runCount = useRef(0);

  // Animate compile steps
  useEffect(() => {
    if (!isCompiling) {
      setCompileStep(0);
      return;
    }
    setTab('output');
    let step = 0;
    setCompileStep(0);
    const interval = setInterval(() => {
      step++;
      if (step >= COMPILE_STEPS.length) {
        clearInterval(interval);
        return;
      }
      setCompileStep(step);
    }, 550);
    return () => clearInterval(interval);
  }, [isCompiling]);

  // Add to history when compile finishes
  useEffect(() => {
    if (!compileResult) return;
    runCount.current++;
    const isTimeout = compileResult.durationMs >= 29000;
    const hasWarnings = compileResult.errors.some((e: CompileError) => e.severity === 'warning');
    setHistory((h) => [
      {
        run: runCount.current,
        success: compileResult.success,
        hasWarnings,
        isTimeout,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...h.slice(0, 49),
    ]);
  }, [compileResult]);

  const tabs: { key: Tab; label: string; icon: typeof Terminal }[] = [
    { key: 'output', label: 'Output', icon: Terminal },
    { key: 'hints', label: 'Quick Hints', icon: Lightbulb },
    { key: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="h-10 border-b border-slate-800 bg-[#111111] flex items-center px-2 gap-1 shrink-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans font-semibold text-xs transition-colors focus-visible:ring-1 focus-visible:ring-primary-500 focus-visible:outline-none ${
                active
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={12} />
              {t.label}
              {t.key === 'history' && history.length > 0 && (
                <span className="text-[9px] text-slate-600 ml-1">({history.length})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ── OUTPUT TAB ─────────────────────────────────────── */}
        {tab === 'output' && (
          <>
            {/* Compiling animation */}
            {isCompiling && (
              <div className="space-y-3">
                {COMPILE_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3 rounded-sm font-mono text-xs transition-all duration-300 ${
                      i <= compileStep
                        ? 'bg-[#111111] border border-slate-800 opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-4'
                    }`}
                  >
                    <span className="text-lg">{step.icon}</span>
                    <span className="flex-1 text-slate-300 uppercase tracking-widest">
                      {step.label}
                    </span>
                    {i < compileStep ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : i === compileStep ? (
                      <Loader2 size={14} className="animate-spin text-yellow-400" />
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* Result display */}
            {!isCompiling && compileResult && <ResultCard result={compileResult} />}

            {/* Idle state */}
            {!isCompiling && !compileResult && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">🚀</span>
                </div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Ready to launch your code!
                </p>
                <p className="font-mono text-[10px] text-slate-600 max-w-[280px] leading-relaxed">
                  Click the Run button above and let's see what your Arduino does. Every great
                  inventor starts with that first click!
                </p>
              </div>
            )}
          </>
        )}

        {/* ── QUICK HINTS TAB ──────────────────────────────── */}
        {tab === 'hints' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={14} className="text-violet-400" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-violet-400">
                Common Fixes & Tips
              </span>
            </div>
            {QUICK_HINTS.map((h, i) => (
              <div key={i} className="border-l-2 border-violet-500/30 pl-3 py-2">
                <p className="font-mono text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                  {h.title}
                </p>
                <p className="font-mono text-[10px] text-slate-500 mt-1">{h.tip}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTORY TAB ──────────────────────────────────── */}
        {tab === 'history' && (
          <div className="space-y-1">
            {history.length === 0 ? (
              <p className="font-mono text-[10px] text-slate-600 text-center py-8 uppercase tracking-widest">
                No runs yet this session
              </p>
            ) : (
              history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 font-mono text-[11px] bg-[#0a0a0a] border border-slate-800/50"
                >
                  <span
                    className={
                      h.success
                        ? 'text-emerald-400'
                        : h.isTimeout
                          ? 'text-pink-400'
                          : 'text-red-400'
                    }
                  >
                    {h.success ? '✓' : h.isTimeout ? '⏱' : '✗'}
                  </span>
                  <span className="text-slate-400 flex-1">Run #{h.run}</span>
                  <span
                    className={`uppercase tracking-widest text-[10px] ${
                      h.success
                        ? 'text-emerald-500'
                        : h.isTimeout
                          ? 'text-pink-500'
                          : 'text-red-500'
                    }`}
                  >
                    {h.success
                      ? h.hasWarnings
                        ? 'Warning'
                        : 'Compiled'
                      : h.isTimeout
                        ? 'Timeout'
                        : 'Error'}
                  </span>
                  <span className="text-slate-600 text-[10px]">{h.time}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: CompileResult }) {
  const isTimeout = result.durationMs >= 29000;
  const hasWarnings = result.errors.some((e: CompileError) => e.severity === 'warning');
  const hasErrors = result.errors.some((e: CompileError) => e.severity === 'error');

  // Pick the right message set
  const msg = isTimeout
    ? {
        ...getTimeoutMessage(),
        footnote: 'Infinite loops are a rite of passage for every coder 🌀',
      }
    : hasErrors
      ? getErrorMessage()
      : hasWarnings
        ? {
            ...getWarningMessage(),
            footnote: 'Warnings are just the compiler being extra helpful ✨',
          }
        : getSuccessMessage();

  const cardBg = isTimeout
    ? 'bg-pink-500/5 border-pink-500/20'
    : hasErrors
      ? 'bg-orange-500/5 border-orange-500/20'
      : hasWarnings
        ? 'bg-amber-500/5 border-amber-500/20'
        : 'bg-emerald-500/5 border-emerald-500/20';

  const titleColor = isTimeout
    ? 'text-pink-400'
    : hasErrors
      ? 'text-orange-400'
      : hasWarnings
        ? 'text-amber-400'
        : 'text-emerald-400';

  return (
    <div className="space-y-4">
      {/* Main message card */}
      <div className={`border p-5 ${cardBg}`}>
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">{msg.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className={`font-mono text-sm font-bold uppercase tracking-wide ${titleColor}`}>
              {msg.title}
            </h3>
            <p className="font-mono text-[11px] text-slate-400 mt-2 leading-relaxed">
              {msg.message}
            </p>
          </div>
        </div>

        {/* Stats row for success */}
        {result.success && !isTimeout && (
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-800/50">
            <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
              <Clock size={10} /> {result.durationMs}ms
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              ⚡ {result.engine ?? 'wandbox'}
            </span>
          </div>
        )}
      </div>

      {/* Error details with friendly hints */}
      {hasErrors && (
        <div className="space-y-2">
          {result.errors
            .filter((e: CompileError) => e.severity === 'error')
            .map((e: CompileError, i: number) => {
              const hint = getFriendlyHint(e.message);
              return (
                <div key={i}>
                  <div className="text-[11px] font-mono p-3 border-l-2 border-orange-500 bg-orange-500/5 text-orange-300">
                    {e.line > 0 && (
                      <span className="text-slate-500 mr-2">
                        Line {e.line}:{e.column}
                      </span>
                    )}
                    {e.message}
                  </div>
                  {hint && (
                    <div className="text-[11px] font-mono p-3 border-l-2 border-violet-500 bg-violet-500/5 text-violet-300 mt-1">
                      <span className="text-[9px] text-violet-500 uppercase tracking-widest block mb-1">
                        💡 What this means:
                      </span>
                      {hint}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Warning details */}
      {hasWarnings && (
        <div className="space-y-2">
          {result.errors
            .filter((e: CompileError) => e.severity === 'warning')
            .map((e: CompileError, i: number) => (
              <div
                key={i}
                className="text-[11px] font-mono p-3 border-l-2 border-amber-500 bg-amber-500/5 text-amber-300"
              >
                {e.line > 0 && <span className="text-slate-500 mr-2">Line {e.line}</span>}
                {e.message}
              </div>
            ))}
        </div>
      )}

      {/* Timeout hint box */}
      {isTimeout && (
        <div className="text-[11px] font-mono p-3 border-l-2 border-pink-500 bg-pink-500/5 text-pink-300">
          <span className="text-[9px] text-pink-500 uppercase tracking-widest block mb-1">
            🔧 Quick fix idea:
          </span>
          Inside your loop(), add a delay(1000); — it gives the Arduino breathing room between
          cycles.
        </div>
      )}

      {/* Stdout */}
      {result.stdout && (
        <pre className="font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap opacity-80 bg-[#0a0a0a] p-3 border border-slate-800/50">
          {result.stdout}
        </pre>
      )}

      {/* Stderr (if no structured errors) */}
      {result.stderr && !hasErrors && (
        <pre className="font-mono text-xs text-red-400 leading-relaxed whitespace-pre-wrap opacity-80 bg-[#0a0a0a] p-3 border border-slate-800/50">
          {result.stderr}
        </pre>
      )}

      {/* Footnote */}
      {'footnote' in msg && (
        <p className="font-mono text-[10px] text-slate-600 italic text-center mt-4">
          {(msg as { footnote: string }).footnote}
        </p>
      )}
    </div>
  );
}
