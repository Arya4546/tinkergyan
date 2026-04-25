/**
 * Editor.tsx
 *
 * The main canvas page. Supports two modes:
 *   BLOCK — Blockly drag-and-drop editor generating Arduino C++
 *   CODE  — Monaco text editor for direct C/C++ editing
 *
 * Switching Block → Code auto-copies generated C++ into Monaco.
 * Switching Code → Block warns that manual edits will be discarded.
 *
 * The Execute button hits the real /api/compile endpoint (mock mode on Render
 * until Arduino CLI is configured). Output and inline errors are shown live.
 */
import { useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Terminal, Save, Play, ChevronLeft, LayoutGrid,
  Code2, AlertTriangle, CheckCircle2, Clock, Loader2,
} from 'lucide-react';

import { BlocklyWorkspace, type BlocklyWorkspaceHandle } from '../components/editor/BlocklyWorkspace';
import { MonacoEditor, type MonacoEditorHandle } from '../components/editor/MonacoEditor';
import { Button } from '../components/ui/Button';
import { useEditorStore, type CompileError } from '../stores/editor.store';
import { useUIStore } from '../stores/ui.store';

// ─── Board dropdown options ───────────────────────────────────────────────────
const BOARDS = [
  { fqbn: 'arduino:avr:uno',              label: 'Arduino Uno'     },
  { fqbn: 'arduino:avr:mega',             label: 'Arduino Mega'    },
  { fqbn: 'esp8266:esp8266:nodemcuv2',    label: 'NodeMCU (ESP8266)' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────

export default function Editor() {
  // Route param — present when editing a saved project
  const { projectId: _routeProjectId } = useParams<{ projectId?: string }>();

  const blocklyRef = useRef<BlocklyWorkspaceHandle>(null);
  const monacoRef  = useRef<MonacoEditorHandle>(null);

  const {
    mode, setMode,
    generatedCode, setGeneratedCode,
    manualCode, setManualCode,
    board, setBoard,
    isCompiling, compileResult, compile, clearResult,
    projectTitle, setProjectTitle,
    isSaving, saveProject,
  } = useEditorStore();

  const addToast = useUIStore((s: any) => s.addToast);

  // ── Mode switching ──────────────────────────────────────────────────────────
  const switchToCode = useCallback(() => {
    // Seed Monaco with current generated code when first switching
    if (mode === 'block') {
      setManualCode(generatedCode);
    }
    clearResult();
    setMode('code');
  }, [mode, generatedCode, setManualCode, clearResult, setMode]);

  const switchToBlock = useCallback(() => {
    if (mode === 'code' && manualCode !== generatedCode) {
      const ok = window.confirm(
        'Switching back to Block mode will discard manual code edits. Continue?'
      );
      if (!ok) return;
    }
    clearResult();
    setMode('block');
  }, [mode, manualCode, generatedCode, clearResult, setMode]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const xml = blocklyRef.current?.getXml() ?? '';
    try {
      await saveProject(xml);
      addToast({ type: 'success', title: 'SYS_SAVE', message: 'Project saved to database.' });
    } catch {
      addToast({ type: 'error', title: 'SAVE_FAILED', message: 'Could not save project.' });
    }
  }, [saveProject, addToast]);

  // ── Compile ────────────────────────────────────────────────────────────────
  const handleCompile = useCallback(async () => {
    const code = mode === 'block'
      ? (blocklyRef.current?.getCode() ?? generatedCode)
      : (monacoRef.current?.getValue() ?? manualCode);

    if (!code.trim()) {
      addToast({ type: 'info', title: 'EMPTY_SKETCH', message: 'Add blocks or code first.' });
      return;
    }
    await compile(code);
  }, [mode, generatedCode, manualCode, compile, addToast]);

  // ── Compile output panel status ────────────────────────────────────────────
  const statusIcon = () => {
    if (isCompiling) return <Loader2 size={14} className="animate-spin text-yellow-400" />;
    if (!compileResult) return <div className="w-2 h-2 bg-slate-600" />;
    return compileResult.success
      ? <CheckCircle2 size={14} className="text-emerald-400" />
      : <AlertTriangle size={14} className="text-red-400" />;
  };

  const statusText = () => {
    if (isCompiling) return 'COMPILING...';
    if (!compileResult) return 'AWAITING_EXECUTE';
    return compileResult.success ? 'BUILD_OK' : 'BUILD_FAILED';
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0A0A0A] font-sans overflow-hidden bg-dot-matrix">
      <div className="flex w-full h-full p-2 sm:p-4">
        <div className="flex w-full h-full hw-panel shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden relative">

          {/* ── Top Control Bar ─────────────────────────────────────────── */}
          <div className="absolute top-0 left-0 w-full h-14 hw-border-b bg-white dark:bg-[#000000] flex justify-between items-center z-10 px-4 gap-3">

            {/* Left: Back + project title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/dashboard"
                className="w-8 h-8 shrink-0 flex items-center justify-center hw-key bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-900 dark:border-slate-800"
              >
                <ChevronLeft size={16} strokeWidth={3} />
              </Link>

              {/* Editable project title */}
              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="font-mono text-[11px] font-bold uppercase tracking-widest text-slate-900 dark:text-white bg-transparent border-none outline-none w-36 truncate"
                spellCheck={false}
              />
            </div>

            {/* Centre: Mode toggle */}
            <div className="flex items-center hw-border divide-x divide-slate-900 dark:divide-slate-800 shrink-0">
              <button
                onClick={switchToBlock}
                className={`flex items-center gap-2 h-8 px-4 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  mode === 'block'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-white dark:bg-[#000000] text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid size={12} /> BLOCKS
              </button>
              <button
                onClick={switchToCode}
                className={`flex items-center gap-2 h-8 px-4 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  mode === 'code'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-white dark:bg-[#000000] text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Code2 size={12} /> C++
              </button>
            </div>

            {/* Right: Board selector + Save + Execute */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="h-8 px-2 font-mono text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-[#111111] text-slate-900 dark:text-white hw-border outline-none cursor-pointer"
              >
                {BOARDS.map((b) => (
                  <option key={b.fqbn} value={b.fqbn}>{b.label}</option>
                ))}
              </select>

              <Button
                variant="outline"
                className="h-8 px-4 rounded-none border border-slate-900 dark:border-slate-800"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving
                  ? <Loader2 size={12} className="animate-spin mr-2" />
                  : <Save size={12} className="mr-2" />
                }
                <span className="font-mono text-[10px] font-bold uppercase">
                  {isSaving ? 'Saving...' : 'Save'}
                </span>
              </Button>

              <Button
                variant="primary"
                className="h-8 px-5 rounded-none bg-emerald-500 border-emerald-600 hover:bg-emerald-600"
                onClick={handleCompile}
                disabled={isCompiling}
              >
                {isCompiling
                  ? <Loader2 size={12} className="animate-spin mr-2" />
                  : <Play size={12} className="mr-2" />
                }
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
                  {isCompiling ? 'Compiling' : 'Execute'}
                </span>
              </Button>
            </div>
          </div>

          {/* ── Main Area (below toolbar) ────────────────────────────────── */}
          <div className="flex w-full h-full pt-14">

            {/* ── Editor Pane ─────────────────────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden">
              {/* Blockly canvas — hidden (not unmounted) when in code mode */}
              <div className={`absolute inset-0 transition-opacity duration-150 ${mode === 'block' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <BlocklyWorkspace
                  ref={blocklyRef}
                  onCodeChange={setGeneratedCode}
                  className="w-full h-full"
                />
              </div>

              {/* Monaco editor — hidden when in block mode */}
              <div className={`absolute inset-0 bg-[#1e1e1e] dark:bg-[#1e1e1e] transition-opacity duration-150 ${mode === 'code' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <MonacoEditor
                  ref={monacoRef}
                  value={manualCode}
                  onChange={setManualCode}
                  errorDecorations={compileResult?.errors ?? []}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* ── Output / Compiler Terminal Pane ─────────────────────────── */}
            <div className="w-[340px] lg:w-[420px] hw-border-l bg-[#050505] flex flex-col shrink-0">

              {/* Terminal header */}
              <div className="h-10 hw-border-b bg-[#111111] flex items-center px-4 gap-3 shrink-0">
                <Terminal size={14} className="text-emerald-500" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 flex-1">
                  {statusText()}
                </span>
                {statusIcon()}
              </div>

              {/* C++ preview header (block mode) */}
              {mode === 'block' && (
                <div className="hw-border-b bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 shrink-0">
                  <Code2 size={12} className="text-slate-500" />
                  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                    Generated C++ Preview
                  </span>
                </div>
              )}

              {/* Compile output / code preview */}
              <div className="flex-1 overflow-y-auto p-4">
                {isCompiling && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-600">
                    <Loader2 size={32} className="animate-spin text-yellow-400" />
                    <p className="font-mono text-xs uppercase tracking-widest text-yellow-400">
                      COMPILING_SKETCH...
                    </p>
                  </div>
                )}

                {!isCompiling && compileResult && (
                  <div className="space-y-4">
                    {/* Status badge */}
                    <div className={`inline-flex items-center gap-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
                      compileResult.success
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}>
                      {compileResult.success ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {compileResult.success ? 'BUILD_SUCCESS' : 'BUILD_FAILED'}
                      <span className="text-slate-500 ml-1 flex items-center gap-1">
                        <Clock size={10} /> {compileResult.durationMs}ms
                      </span>
                    </div>

                    {/* Errors */}
                    {compileResult.errors.length > 0 && (
                      <div className="space-y-2">
                        {compileResult.errors.map((e: CompileError, i: number) => (
                          <div key={i} className={`text-[11px] font-mono p-3 border-l-2 ${
                            e.severity === 'error'
                              ? 'border-red-500 bg-red-500/5 text-red-300'
                              : 'border-yellow-500 bg-yellow-500/5 text-yellow-300'
                          }`}>
                            {e.line > 0 && (
                              <span className="text-slate-500 mr-2">Line {e.line}:{e.column}</span>
                            )}
                            {e.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stdout (success info: binary size, etc.) */}
                    {compileResult.stdout && (
                      <pre className="font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap opacity-80">
                        {compileResult.stdout}
                      </pre>
                    )}
                  </div>
                )}

                {/* Block mode: show C++ code preview when not compiling */}
                {!isCompiling && !compileResult && mode === 'block' && (
                  generatedCode ? (
                    <pre className="font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap">
                      {generatedCode}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-700">
                      <Terminal size={40} className="mb-4 opacity-20" />
                      <p className="font-mono text-xs uppercase tracking-widest text-center leading-loose">
                        AWAITING_LOGIC_BLOCKS<br />
                        <span className="text-[10px] opacity-60">
                          Drop blocks on the canvas to preview C++ output
                        </span>
                      </p>
                    </div>
                  )
                )}

                {!isCompiling && !compileResult && mode === 'code' && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-700">
                    <Play size={40} className="mb-4 opacity-20" />
                    <p className="font-mono text-xs uppercase tracking-widest text-center leading-loose">
                      READY_TO_COMPILE<br />
                      <span className="text-[10px] opacity-60">
                        Press Execute to compile your sketch
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
