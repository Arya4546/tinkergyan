/**
 * Editor.tsx
 *
 * The main canvas page. Supports two modes:
 *   BLOCK — Blockly drag-and-drop editor generating Arduino C++
 *   CODE  — Monaco text editor for direct C/C++ editing
 *
 * Features:
 *   - Load existing projects from URL param (/editor/:projectId)
 *   - Auto-save every 30s when dirty
 *   - Starter templates for new projects
 *   - Font size controls for Monaco
 *   - Compile + run via Wandbox
 */
import { useRef, useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Terminal, Save, Play, ChevronLeft, LayoutGrid,
  Code2, Loader2,
  Plus, Minus, FileCode, Download,
  Undo, Redo, Copy, Globe,
} from 'lucide-react';

import { CompileConsole } from '../components/editor/CompileConsole';

import { BlocklyWorkspace, type BlocklyWorkspaceHandle } from '../components/editor/BlocklyWorkspace';
import { MonacoEditor, type MonacoEditorHandle } from '../components/editor/MonacoEditor';
import { Button } from '../components/ui/Button';
import {
  useEditorStore,
  STARTER_TEMPLATES, type StarterTemplate,
} from '../stores/editor.store';
import { useUIStore } from '../stores/ui.store';

// ─── Board dropdown options ───────────────────────────────────────────────────
const BOARDS = [
  { fqbn: 'arduino:avr:uno',              label: 'Arduino Uno'     },
  { fqbn: 'arduino:avr:mega',             label: 'Arduino Mega'    },
  { fqbn: 'esp8266:esp8266:nodemcuv2',    label: 'NodeMCU (ESP8266)' },
] as const;

// ─── Template Picker Modal ────────────────────────────────────────────────────
function TemplatePicker({ onSelect, onClose }: {
  onSelect: (t: StarterTemplate) => void;
  onClose:  () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#111111] hw-border max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 hw-border-b flex justify-between items-center">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">
            STARTER_TEMPLATES
          </h2>
          <button onClick={onClose} className="font-mono text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white">
            [ESC]
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
          {STARTER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { onSelect(t); onClose(); }}
              className="text-left p-4 hw-border bg-slate-50 dark:bg-[#0a0a0a] hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileCode size={14} className="text-emerald-500" />
                <span className="font-mono text-xs font-bold uppercase tracking-widest">{t.title}</span>
              </div>
              <p className="font-mono text-[10px] text-slate-400 group-hover:text-slate-300 dark:group-hover:text-slate-600 uppercase">
                {t.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Editor() {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const [showTemplates, setShowTemplates] = useState(false);

  const blocklyRef = useRef<BlocklyWorkspaceHandle>(null);
  const monacoRef  = useRef<MonacoEditorHandle>(null);

  const {
    mode, setMode,
    generatedCode, setGeneratedCode,
    manualCode, setManualCode,
    board, setBoard,
    fontSize, increaseFontSize, decreaseFontSize,
    isCompiling, compileResult, compile, clearResult,
    stdinInput, setStdinInput,
    projectTitle, setProjectTitle,
    isSaving, saveProject, loadProject, resetEditor, loadTemplate,
    projectId, isLoading, isDirty, blockXml, setBlockXml,
    scheduleAutoSave, duplicateProject,
    isPublic, togglePublic,
  } = useEditorStore();

  const addToast = useUIStore((s: any) => s.addToast);

  // ── Load project on mount if URL has an ID ─────────────────────────────
  useEffect(() => {
    if (routeProjectId && routeProjectId !== projectId) {
      loadProject(routeProjectId);
    } else if (!routeProjectId && projectId) {
      resetEditor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProjectId]);

  // ── Load blockXml into Blockly after project loads ─────────────────────
  useEffect(() => {
    if (blockXml && blocklyRef.current && !isLoading) {
      blocklyRef.current.loadXml(blockXml);
    }
  }, [blockXml, isLoading]);

  // ── Auto-save on changes ───────────────────────────────────────────────
  useEffect(() => {
    if (isDirty) {
      scheduleAutoSave(() => blocklyRef.current?.getXml() ?? '');
    }
  }, [isDirty, generatedCode, manualCode, projectTitle, board, scheduleAutoSave]);

  // ── Mode switching ─────────────────────────────────────────────────────
  const switchToCode = useCallback(() => {
    if (mode === 'block') setManualCode(generatedCode);
    clearResult();
    setMode('code');
  }, [mode, generatedCode, setManualCode, clearResult, setMode]);

  const switchToBlock = useCallback(() => {
    if (mode === 'code' && manualCode !== generatedCode) {
      const ok = window.confirm('Switching back to Block mode will discard manual code edits. Continue?');
      if (!ok) return;
    }
    clearResult();
    setMode('block');
  }, [mode, manualCode, generatedCode, clearResult, setMode]);

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const xml = blocklyRef.current?.getXml() ?? '';
    try {
      await saveProject(xml);
      addToast({ type: 'success', title: 'SYS_SAVE', message: 'Project saved.' });
    } catch {
      addToast({ type: 'error', title: 'SAVE_FAILED', message: 'Could not save project.' });
    }
  }, [saveProject, addToast]);

  const handleDuplicate = useCallback(async () => {
    try {
      if (isDirty) await handleSave();
      const newId = await duplicateProject();
      navigate(`/editor/${newId}`, { replace: true });
      addToast({ type: 'success', title: 'DUPLICATED', message: 'Project copied successfully.' });
    } catch {
      addToast({ type: 'error', title: 'FAILED', message: 'Could not duplicate project.' });
    }
  }, [duplicateProject, navigate, addToast, isDirty, handleSave]);

  const handleTogglePublic = useCallback(async () => {
    try {
      const newState = await togglePublic();
      addToast({
        type: 'success',
        title: newState ? 'PUBLIC' : 'PRIVATE',
        message: newState ? 'Project is now visible in the Gallery.' : 'Project is now private.'
      });
    } catch {
      addToast({ type: 'error', title: 'FAILED', message: 'Could not change visibility.' });
    }
  }, [togglePublic, addToast]);

  // ── Compile ────────────────────────────────────────────────────────────
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

  // ── Blockly code change → also schedule auto-save ──────────────────────
  const handleBlocklyCodeChange = useCallback((code: string) => {
    setGeneratedCode(code);
    setBlockXml(blocklyRef.current?.getXml() ?? '');
  }, [setGeneratedCode, setBlockXml]);

  // ── Download .ino file ─────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const code = mode === 'block'
      ? (blocklyRef.current?.getCode() ?? generatedCode)
      : (monacoRef.current?.getValue() ?? manualCode);

    if (!code.trim()) {
      addToast({ type: 'info', title: 'EMPTY_SKETCH', message: 'No code to export.' });
      return;
    }

    const sanitized = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = new Blob([code], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${sanitized}.ino`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'EXPORTED', message: `${sanitized}.ino downloaded.` });
  }, [mode, generatedCode, manualCode, projectTitle, addToast]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+S → Save
      if (ctrl && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+Enter → Compile & Run
      if (ctrl && e.key === 'Enter') {
        e.preventDefault();
        handleCompile();
      }
      // Ctrl+Shift+D → Download
      if (ctrl && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleCompile, handleDownload]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0A0A0A]">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-yellow-400 mx-auto mb-4" />
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">LOADING_PROJECT...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0A0A0A] font-sans overflow-hidden bg-dot-matrix">
      <div className="flex w-full h-full p-2 sm:p-4">
        <div className="flex w-full h-full hw-panel shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden relative">

          {/* ── Top Control Bar ─────────────────────────────────────────── */}
          <div className="absolute top-0 left-0 w-full h-14 hw-border-b bg-white dark:bg-[#000000] flex justify-between items-center z-10 px-4 gap-3">

            {/* Left: Back + project title + dirty indicator */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/dashboard"
                className="w-8 h-8 shrink-0 flex items-center justify-center hw-key bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-900 dark:border-slate-800"
              >
                <ChevronLeft size={16} strokeWidth={3} />
              </Link>

              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="font-mono text-[11px] font-bold uppercase tracking-widest text-slate-900 dark:text-white bg-transparent border-none outline-none w-36 truncate"
                spellCheck={false}
              />
              {isDirty && (
                <div className="w-2 h-2 bg-yellow-400 shrink-0" title="Unsaved changes" />
              )}
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

            {/* Right: Board + Font size + Templates + Save + Execute */}
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

              {/* Font size controls (code mode only) */}
              {mode === 'code' && (
                <div className="flex items-center hw-border divide-x divide-slate-900 dark:divide-slate-800">
                  <button onClick={decreaseFontSize} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white" title="Decrease font">
                    <Minus size={12} />
                  </button>
                  <span className="w-8 h-8 flex items-center justify-center font-mono text-[10px] font-bold text-slate-500">{fontSize}</span>
                  <button onClick={increaseFontSize} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white" title="Increase font">
                    <Plus size={12} />
                  </button>
                </div>
              )}

              {/* Blockly Undo/Redo controls (block mode only) */}
              {mode === 'block' && (
                <div className="flex items-center hw-border divide-x divide-slate-900 dark:divide-slate-800">
                  <button onClick={() => blocklyRef.current?.undo()} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white" title="Undo (Ctrl+Z)">
                    <Undo size={14} />
                  </button>
                  <button onClick={() => blocklyRef.current?.redo()} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white" title="Redo (Ctrl+Y)">
                    <Redo size={14} />
                  </button>
                </div>
              )}

              {/* Templates button */}
              <Button
                variant="outline"
                className="h-8 px-3 rounded-none border border-slate-900 dark:border-slate-800"
                onClick={() => setShowTemplates(true)}
              >
                <FileCode size={12} className="mr-1" />
                <span className="font-mono text-[10px] font-bold uppercase hidden sm:inline">Templates</span>
              </Button>

              {/* Download .ino */}
              <Button
                variant="outline"
                className="h-8 px-3 rounded-none border border-slate-900 dark:border-slate-800"
                onClick={handleDownload}
                title="Download as .ino (Ctrl+Shift+D)"
              >
                <Download size={12} className="mr-1" />
                <span className="font-mono text-[10px] font-bold uppercase hidden sm:inline">.ino</span>
              </Button>

              {/* Duplicate Project */}
              {projectId && (
                <div className="flex items-center hw-border divide-x divide-slate-900 dark:divide-slate-800">
                  <Button
                    variant="outline"
                    className="h-8 px-3 rounded-none border-none hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={handleDuplicate}
                    title="Duplicate this project"
                  >
                    <Copy size={12} className="mr-1" />
                    <span className="font-mono text-[10px] font-bold uppercase hidden sm:inline">Fork</span>
                  </Button>

                  <Button
                    variant="outline"
                    className={`h-8 px-3 rounded-none border-none transition-colors ${
                      isPublic 
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    onClick={handleTogglePublic}
                    title={isPublic ? "Make Private" : "Make Public"}
                  >
                    <Globe size={12} className="mr-1" />
                    <span className="font-mono text-[10px] font-bold uppercase hidden sm:inline">
                      {isPublic ? 'Public' : 'Private'}
                    </span>
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                className="h-8 px-4 rounded-none border border-slate-900 dark:border-slate-800"
                onClick={handleSave}
                disabled={isSaving}
                title="Save project (Ctrl+S)"
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
                title="Compile & Run (Ctrl+Enter)"
              >
                {isCompiling
                  ? <Loader2 size={12} className="animate-spin mr-2" />
                  : <Play size={12} className="mr-2" />
                }
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
                  {isCompiling ? 'Running' : 'Execute'}
                </span>
              </Button>
            </div>
          </div>

          {/* ── Main Area (below toolbar) ────────────────────────────────── */}
          <div className="flex w-full h-full pt-14">

            {/* ── Editor Pane ─────────────────────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden">
              {/* Blockly canvas */}
              <div className={`absolute inset-0 transition-opacity duration-150 ${mode === 'block' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <BlocklyWorkspace
                  ref={blocklyRef}
                  onCodeChange={handleBlocklyCodeChange}
                  className="w-full h-full"
                />
              </div>

              {/* Monaco editor */}
              <div className={`absolute inset-0 bg-[#1e1e1e] transition-opacity duration-150 ${mode === 'code' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <MonacoEditor
                  ref={monacoRef}
                  value={manualCode}
                  onChange={setManualCode}
                  errorDecorations={compileResult?.errors ?? []}
                  fontSize={fontSize}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* ── Output / Compiler Terminal Pane ─────────────────────────── */}
            <div className="w-[340px] lg:w-[420px] hw-border-l bg-[#050505] flex flex-col shrink-0">
              {/* C++ preview header (block mode) */}
              {mode === 'block' && !isCompiling && !compileResult && (
                <div className="hw-border-b bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 shrink-0">
                  <Code2 size={12} className="text-slate-500" />
                  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                    Generated C++ Preview
                  </span>
                </div>
              )}

              {/* Stdin input for programs that need cin/scanf */}
              {mode === 'code' && (
                <div className="hw-border-b bg-[#0a0a0a] shrink-0">
                  <div className="px-3 py-1.5 flex items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">📥 stdin input</span>
                  </div>
                  <textarea
                    value={stdinInput}
                    onChange={(e) => setStdinInput(e.target.value)}
                    placeholder="Enter input here (for cin/scanf programs)..."
                    spellCheck={false}
                    className="w-full bg-[#0a0a0a] text-slate-300 font-mono text-[11px] px-3 py-2 outline-none resize-none border-none h-16 placeholder:text-slate-700"
                  />
                </div>
              )}

              {/* Console (has compile result or is compiling) OR code preview */}
              {(isCompiling || compileResult) ? (
                <CompileConsole isCompiling={isCompiling} compileResult={compileResult} />
              ) : (
                <div className="flex-1 overflow-y-auto p-4">
                  {mode === 'block' && (
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
                  {mode === 'code' && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-700">
                      <Play size={40} className="mb-4 opacity-20" />
                      <p className="font-mono text-xs uppercase tracking-widest text-center leading-loose">
                        READY_TO_COMPILE<br />
                        <span className="text-[10px] opacity-60">
                          Press Execute to compile and run your code
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Template Picker Overlay ─────────────────────────────────────── */}
      {showTemplates && (
        <TemplatePicker
          onSelect={loadTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
