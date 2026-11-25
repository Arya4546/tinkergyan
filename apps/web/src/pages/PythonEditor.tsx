/**
 * PythonEditor.tsx — the editor for Python projects (boardTarget 'python' or
 * 'python-esp32…', see lib/python/targets.ts).
 *
 * Students build with blocks and see the real Python they make, or type
 * Python directly. Programs run in the browser on MicroPython (see
 * lib/python), so nothing is installed and nothing is sent to a server — or
 * on an ESP32 board running MicroPython, over USB (lib/python/board).
 *
 * Saving reuses the editor store: `generatedCode` is the Python from blocks,
 * `manualCode` the typed Python, and `mode` which of the two is in use.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Home,
  Play,
  Square,
  Undo,
  Redo,
  Download,
  Save,
  Blocks,
  Keyboard,
  BookOpen,
  Loader2,
  AlertTriangle,
  Code2,
  Terminal,
  Check,
  MoreVertical,
  Brain,
} from 'lucide-react';
import {
  BlocklyWorkspace,
  type BlocklyWorkspaceHandle,
} from '../components/editor/BlocklyWorkspace';
import {
  PythonCodeEditor,
  type PythonCodeEditorHandle,
} from '../components/python/PythonCodeEditor';
import { PythonConsole } from '../components/python/PythonConsole';
import { ExamplesDialog } from '../components/python/ExamplesDialog';
import { usePythonRun, type RunOptions } from '../lib/python/use-python-run';
import { usePythonBoard } from '../lib/python/board/use-python-board';
import { RunOnBar, InstallDialog } from '../components/python/BoardControls';
import { AIWebcamOverlay } from '../components/editor/AIWebcamOverlay';
import { startAiCamera, stopAiCamera } from '../lib/python/ai-bridge';
import { publishAiState } from '../lib/python/python-runner';
import { isPythonBoardTarget, isPythonTarget, type PythonTarget } from '../lib/python/targets';
import { STARTER_CODE, type PythonExample } from '../lib/python/examples';
import { useEditorStore } from '../stores/editor.store';
import { useUIStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { useMediaQuery } from '../lib/use-media-query';
import { applyEditorTokens } from '../lib/editor-tokens';
import { Tooltip } from '../components/ui/Tooltip';

type MobileTab = 'program' | 'python' | 'output';

/** Symbols that are hard to find on a phone keyboard. */
const SYMBOLS: Array<{ label: string; text: string; aria?: string }> = [
  { label: '⇥', text: '    ', aria: 'Indent (4 spaces)' },
  { label: ':', text: ':' },
  { label: '( )', text: '()', aria: 'Brackets' },
  { label: '"', text: '"', aria: 'Quote' },
  { label: '=', text: '=' },
  { label: '==', text: ' == ', aria: 'Is equal to' },
  { label: '[ ]', text: '[]', aria: 'Square brackets' },
  { label: '<', text: '<' },
  { label: '>', text: '>' },
  { label: '+', text: '+' },
  { label: '-', text: '-' },
  { label: '*', text: '*' },
  { label: '/', text: '/' },
  { label: '#', text: '#', aria: 'Comment' },
];

function useResolvedDark(): boolean {
  const theme = useUIStore((s) => s.theme);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  return theme === 'dark' || (theme === 'system' && systemDark);
}

const safeFileName = (title: string) =>
  (title.trim() || 'my_program')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'my_program';

export default function PythonEditor() {
  const { id: routeProjectId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const isWide = useMediaQuery('(min-width: 1024px)');
  const isTouch = useMediaQuery('(pointer: coarse)');
  const dark = useResolvedDark();

  const projectId = useEditorStore((s) => s.projectId);
  const projectTitle = useEditorStore((s) => s.projectTitle);
  const setProjectTitle = useEditorStore((s) => s.setProjectTitle);
  const mode = useEditorStore((s) => s.mode);
  const board = useEditorStore((s) => s.board);
  const generatedCode = useEditorStore((s) => s.generatedCode);
  const manualCode = useEditorStore((s) => s.manualCode);
  const blockXml = useEditorStore((s) => s.blockXml);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const isLoading = useEditorStore((s) => s.isLoading);

  const blocklyRef = useRef<BlocklyWorkspaceHandle>(null);
  const codeRef = useRef<PythonCodeEditorHandle>(null);
  const previewRef = useRef<PythonCodeEditorHandle>(null);
  const run = usePythonRun();
  const isRunning = run.status === 'running' || run.status === 'waiting';
  const target: PythonTarget = isPythonTarget(board) ? (board as PythonTarget) : 'python';
  const boardTarget = isPythonBoardTarget(target) ? target : null;
  const hw = usePythonBoard(boardTarget);
  const [showInstall, setShowInstall] = useState(false);

  const [mobileTab, setMobileTab] = useState<MobileTab>('program');
  const [showExamples, setShowExamples] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [confirm, setConfirm] = useState<null | 'to-code' | 'to-blocks' | 'leave'>(null);
  const [blocklyReady, setBlocklyReady] = useState(false);
  const loadedXmlFor = useRef<string | null>(null);

  // ── Theme tokens (the panels use them even when Blockly is not on screen) ──
  useEffect(() => applyEditorTokens(dark ? 'dark' : 'light'), [dark]);

  // ── Load / reset ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (routeProjectId) {
      if (useEditorStore.getState().projectId !== routeProjectId) {
        loadedXmlFor.current = null;
        useEditorStore
          .getState()
          .loadProject(routeProjectId)
          .catch(() => {
            if (!useAuthStore.getState().accessToken) return;
            addToast({
              type: 'error',
              title: "Couldn't open project",
              message: 'Please reload the page. Nothing was saved, so your project is unchanged.',
            });
          });
      }
    } else {
      useEditorStore.getState().resetEditor();
      useEditorStore.setState({
        board: 'python',
        mode: 'block',
        projectTitle: 'My Python Program',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProjectId]);

  useEffect(
    () => () => {
      useEditorStore.getState().resetEditor();
    },
    [],
  );

  // A project that isn't a Python project belongs to another editor.
  useEffect(() => {
    if (!routeProjectId || projectId !== routeProjectId || isPythonTarget(board)) return;
    if (board === 'ai') navigate(`/ai-trainer/${projectId}`, { replace: true });
    else
      navigate(`/editor/${projectId}?engine=${board === 'software' ? 'software' : 'hardware'}`, {
        replace: true,
      });
  }, [routeProjectId, projectId, board, navigate]);

  // First save of a new project gives it an id: put it in the URL.
  useEffect(() => {
    if (projectId && routeProjectId !== projectId) {
      navigate(`/editor/${projectId}?engine=python`, { replace: true });
    }
  }, [projectId, routeProjectId, navigate]);

  // ── Blocks: put the saved program on the canvas once both are ready ──────
  useEffect(() => {
    if (mode !== 'block' || !blocklyReady || isLoading) return;
    const key = `${projectId ?? 'new'}`;
    if (loadedXmlFor.current === key) return;
    // A new project just got its id from its first save: the canvas already
    // holds the program, so reloading it would only interrupt the student.
    if (loadedXmlFor.current === 'new' && projectId) {
      loadedXmlFor.current = key;
      return;
    }
    if (blockXml && !blocklyRef.current?.loadXml(blockXml)) return;
    loadedXmlFor.current = key;
    // Loading is not an edit, so this must not mark the project changed.
    useEditorStore.setState({ generatedCode: blocklyRef.current?.getCode() ?? '' });
  }, [mode, blocklyReady, isLoading, blockXml, projectId]);

  // A project made with "Typing code" starts with a tiny program, not a blank page.
  useEffect(() => {
    if (isLoading || mode !== 'code') return;
    if (!useEditorStore.getState().manualCode.trim())
      useEditorStore.setState({ manualCode: STARTER_CODE });
  }, [isLoading, mode, projectId]);

  const handleBlocksCode = useCallback((code: string) => {
    // Only the code; the "unsaved" flag comes from real edits (below).
    if (useEditorStore.getState().generatedCode !== code)
      useEditorStore.setState({ generatedCode: code });
  }, []);
  const handleBlocksEdit = useCallback(() => {
    if (!useEditorStore.getState().isLoading) useEditorStore.getState().markDirty();
  }, []);

  // ── Saving ────────────────────────────────────────────────────────────────
  const currentXml = useCallback(
    () =>
      mode === 'block' ? (blocklyRef.current?.getXml() ?? '') : useEditorStore.getState().blockXml,
    [mode],
  );

  const save = useCallback(
    async (quiet = false) => {
      try {
        await useEditorStore.getState().saveProject(currentXml());
        if (!quiet)
          addToast({ type: 'success', title: 'Saved! 💾', message: 'Your project is saved.' });
        return true;
      } catch {
        addToast({
          type: 'error',
          title: 'Oops — save failed',
          message: 'Could not save. Try again in a moment.',
        });
        return false;
      }
    },
    [currentXml, addToast],
  );

  useEffect(() => {
    if (isLoading || (routeProjectId && projectId !== routeProjectId)) return;
    if (isDirty) useEditorStore.getState().scheduleAutoSave(currentXml);
  }, [
    isDirty,
    generatedCode,
    manualCode,
    projectTitle,
    isLoading,
    routeProjectId,
    projectId,
    currentXml,
  ]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!useEditorStore.getState().isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // ── Run ───────────────────────────────────────────────────────────────────
  const currentCode = useCallback(
    () => (mode === 'block' ? (blocklyRef.current?.getCode() ?? generatedCode) : manualCode),
    [mode, generatedCode, manualCode],
  );

  // ── AI camera (ai.start_camera() in a program) ───────────────────────────
  const aiTargetRef = useRef<'browser' | 'board'>('browser');
  const onAiCamera = useCallback(
    (on: boolean) => {
      const where = aiTargetRef.current;
      if (!on) {
        stopAiCamera();
        publishAiState(null);
        return;
      }
      void startAiCamera((snap) => {
        if (where === 'board') hw.sendAi(snap);
        else publishAiState(JSON.stringify(snap));
      }).then((problem) => {
        if (problem) run.note(problem);
      });
    },
    [hw, run],
  );

  // The camera never outlives the program that turned it on.
  useEffect(() => {
    if (isRunning) return;
    stopAiCamera();
    publishAiState(null);
  }, [isRunning]);
  useEffect(
    () => () => {
      stopAiCamera();
      publishAiState(null);
    },
    [],
  );

  /** Run on wherever the project runs; on a board, connect first if needed. */
  const startRun = useCallback(
    (kind: 'run' | 'upload') => {
      const go = (onBoard: boolean) => {
        const options: RunOptions = { onAiCamera };
        aiTargetRef.current = onBoard ? 'board' : 'browser';
        if (onBoard) {
          options.backend = kind === 'upload' ? hw.saveBackend : hw.backend;
          options.interactive = true;
        }
        run.run(currentCode(), options);
        if (!isWide) setMobileTab('output');
      };
      if (!boardTarget) return go(false);
      switch (hw.status) {
        case 'connected':
          return go(true);
        case 'unsupported':
          addToast({
            type: 'error',
            title: 'Can’t reach the board',
            message: hw.unsupportedMessage,
          });
          return;
        case 'needs-micropython':
          setShowInstall(true);
          return;
        case 'disconnected':
          // Connect first; the program starts once the board answers. Nothing
          // is left waiting if the student cancels the picker.
          void hw.connect().then((result) => {
            if (result === 'connected') go(true);
            else if (result === 'needs-micropython') setShowInstall(true);
          });
          return;
        default:
          // connecting / installing: the button press is ignored for now.
          return;
      }
    },
    [boardTarget, hw, onAiCamera, run, currentCode, isWide, addToast],
  );

  // A different board (or none) from now on: let go of the one connected.
  const prevBoardTarget = useRef(boardTarget);
  useEffect(() => {
    if (prevBoardTarget.current === boardTarget) return;
    prevBoardTarget.current = boardTarget;
    if (!boardTarget) void hw.disconnect();
  }, [boardTarget, hw]);

  const handleRun = useCallback(() => {
    if (isRunning) {
      run.stop();
      return;
    }
    startRun('run');
  }, [isRunning, run, startRun]);

  const changeTarget = (t: PythonTarget) => {
    if (isRunning) return;
    useEditorStore.getState().setBoard(t);
    run.clear();
  };

  const removeSavedProgram = async () => {
    try {
      const removed = await hw.removeProgram();
      addToast({
        type: 'success',
        title: removed ? 'Removed' : 'Nothing to remove',
        message: removed
          ? 'The board no longer runs a program by itself.'
          : 'There was no saved program on the board.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Couldn’t remove it',
        message: 'Check the board is still plugged in, then try again.',
      });
    }
  };

  const goToLine = useCallback(
    (line: number) => {
      if (mode === 'code') {
        if (!isWide) setMobileTab('program');
        requestAnimationFrame(() => codeRef.current?.goToLine(line));
      } else {
        if (!isWide) setMobileTab('python');
        requestAnimationFrame(() => previewRef.current?.goToLine(line));
      }
    },
    [mode, isWide],
  );

  // ── Switching between blocks and typing ──────────────────────────────────
  const switchToCode = () => {
    const code = blocklyRef.current?.getCode() ?? generatedCode;
    const xml = blocklyRef.current?.getXml() ?? blockXml;
    useEditorStore.setState({
      blockXml: xml,
      manualCode: code.trim() ? code : STARTER_CODE,
      mode: 'code',
      isDirty: true,
    });
    setConfirm(null);
    setMobileTab('program');
  };

  const switchToBlocks = () => {
    loadedXmlFor.current = null;
    setBlocklyReady(false);
    useEditorStore.setState({ mode: 'block', isDirty: true });
    setConfirm(null);
    setMobileTab('program');
  };

  const requestMode = (next: 'block' | 'code') => {
    if (next === mode) return;
    setConfirm(next === 'code' ? 'to-code' : 'to-blocks');
  };

  // ── Examples ──────────────────────────────────────────────────────────────
  const openExample = (ex: PythonExample) => {
    setShowExamples(false);
    run.clear();
    if (mode === 'block' && ex.blocks) {
      if (blocklyRef.current?.loadJson(ex.blocks)) {
        useEditorStore.getState().markDirty();
      }
    } else {
      useEditorStore.getState().setManualCode(ex.code);
    }
    if (!isWide) setMobileTab('program');
  };

  // ── Download .py ──────────────────────────────────────────────────────────
  const download = () => {
    const blob = new Blob([currentCode()], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName(projectTitle)}.py`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const undo = () => (mode === 'block' ? blocklyRef.current?.undo() : codeRef.current?.undo());
  const redo = () => (mode === 'block' ? blocklyRef.current?.redo() : codeRef.current?.redo());

  // ── Keyboard: Ctrl/Cmd+Enter runs, Ctrl/Cmd+S saves ──────────────────────
  // Capture phase, so the code editor's own Ctrl+Enter (new line) never sees it.
  const shortcuts = useRef({ handleRun, save });
  shortcuts.current = { handleRun, save };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        shortcuts.current.handleRun();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        void shortcuts.current.save();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // AI Studio trains the model for THIS project (the same saved project), so
  // save first: it reloads the project from the server, and so does coming back.
  const openAiStudio = async () => {
    if (isRunning) run.stop();
    const st = useEditorStore.getState();
    if (st.isDirty || !st.projectId) {
      if (!(await save(true))) return;
    }
    const id = routeProjectId ?? useEditorStore.getState().projectId;
    if (id) navigate(`/ai-trainer/${id}?engine=python`);
  };

  const goHome = () =>
    useEditorStore.getState().isDirty ? setConfirm('leave') : navigate('/dashboard');

  // ── Pieces ────────────────────────────────────────────────────────────────
  const runButton = (
    <button
      type="button"
      onClick={handleRun}
      aria-label={isRunning ? 'Stop the program' : 'Run the program'}
      title={isRunning ? 'Stop (Ctrl+Enter)' : 'Run (Ctrl+Enter)'}
      className={`h-10 px-4 sm:px-5 rounded-xl font-heading font-black text-sm text-white flex items-center gap-2 shrink-0 shadow-md active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none ${
        isRunning ? 'bg-red-500 hover:bg-red-400' : 'bg-emerald-500 hover:bg-emerald-400'
      }`}
    >
      {isRunning ? (
        <Square size={14} fill="currentColor" />
      ) : (
        <Play size={15} fill="currentColor" />
      )}
      <span>{isRunning ? 'Stop' : 'Run'}</span>
    </button>
  );

  const modeToggle = (
    <div
      className="flex items-center p-1 bg-black/20 rounded-xl shrink-0"
      role="radiogroup"
      aria-label="How to write your program"
    >
      {(
        [
          { id: 'block', label: 'Blocks', icon: Blocks },
          { id: 'code', label: 'Python', icon: Keyboard },
        ] as const
      ).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={mode === id}
          onClick={() => requestMode(id)}
          className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            mode === id
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-white/85 hover:text-white hover:bg-white/10'
          }`}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );

  const iconButton = (label: string, onClick: () => void, icon: React.ReactNode, extra = '') => (
    <Tooltip content={label} position="bottom">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none ${extra}`}
      >
        {icon}
      </button>
    </Tooltip>
  );

  const saveState = isSaving ? (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-white/80 shrink-0">
      <Loader2 size={12} className="animate-spin" /> Saving…
    </span>
  ) : isDirty ? (
    <Tooltip content="Not saved yet" position="bottom">
      <span className="w-2.5 h-2.5 rounded-full bg-warning-400 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
    </Tooltip>
  ) : projectId ? (
    <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-white/70 shrink-0">
      <Check size={12} /> Saved
    </span>
  ) : null;

  const blocksView = (
    <BlocklyWorkspace
      ref={blocklyRef}
      engineMode="python"
      onCodeChange={handleBlocksCode}
      onWorkspaceChange={handleBlocksEdit}
      onReady={() => setBlocklyReady(true)}
      className="w-full h-full"
    />
  );

  const codeView = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0">
        <PythonCodeEditor
          ref={codeRef}
          value={manualCode}
          onChange={(v) => useEditorStore.getState().setManualCode(v)}
          dark={dark}
          fontSize={isWide ? 15 : 14}
          errorLine={run.error?.line ?? null}
          ariaLabel="Your Python program"
        />
      </div>
      {isTouch && (
        <div
          className="shrink-0 flex gap-1.5 overflow-x-auto px-2 py-1.5 border-t border-ed-line bg-ed-panel"
          aria-label="Symbols"
        >
          {SYMBOLS.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-label={s.aria ?? s.label}
              // Keep the keyboard open: don't let the tap steal focus from the editor.
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              onClick={() => codeRef.current?.insert(s.text)}
              className="h-9 min-w-[2.5rem] px-2 rounded-lg bg-ed-raised border border-ed-line text-ed-hi font-mono text-sm font-bold shrink-0 active:bg-ed-accent active:text-white"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const previewView = (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-ed-line overflow-hidden bg-ed-well">
      <div className="h-10 shrink-0 flex items-center gap-2 px-3 border-b border-ed-line bg-ed-panel">
        <Code2 size={14} className="text-amber-500" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-ed-mid">
          Your blocks in Python
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <PythonCodeEditor
          ref={previewRef}
          value={generatedCode}
          readOnly
          dark={dark}
          fontSize={13}
          errorLine={run.error?.line ?? null}
          ariaLabel="Python made from your blocks"
          wrap
        />
      </div>
    </div>
  );

  const consoleView = (
    <div className="relative h-full">
      <PythonConsole
        run={run}
        onGoToLine={goToLine}
        goToLineLabel={(l) => (mode === 'block' ? `Show line ${l} in Python` : `Show line ${l}`)}
        className="h-full"
      />
      <div className="absolute top-12 right-2 z-10 pointer-events-none [&>*]:pointer-events-auto">
        <AIWebcamOverlay />
      </div>
    </div>
  );

  const runOnBar = (
    <RunOnBar
      target={target}
      onTargetChange={changeTarget}
      board={hw}
      busy={isRunning}
      onInstall={() => setShowInstall(true)}
      onUpload={() => startRun('upload')}
      onRemoveProgram={() => void removeSavedProgram()}
      compact={!isWide}
    />
  );

  const loadingOverlay = isLoading && (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-ed-well/80">
      <Loader2 className="animate-spin text-ed-accent" size={28} aria-label="Opening project" />
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-ed-well font-playful overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="shrink-0 w-full h-14 lg:h-16 flex items-center gap-2 px-2 sm:px-4 z-30 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-[0_8px_30px_-4px_rgba(79,70,229,0.35)]">
        {iconButton('Dashboard', goHome, <Home size={19} strokeWidth={2.5} />)}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="hidden md:flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-300 shrink-0">
            <Code2 size={14} /> Python
          </span>
          <input
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void save();
                e.currentTarget.blur();
              }
            }}
            maxLength={100}
            aria-label="Project name"
            spellCheck={false}
            placeholder="Untitled Project"
            className="font-sans font-extrabold text-base sm:text-lg text-white bg-transparent border-none outline-none min-w-0 w-full lg:max-w-xs truncate hover:bg-white/10 focus:bg-white/20 rounded-xl px-2 py-1.5 transition-all placeholder-white/70"
          />
          {saveState}
        </div>

        {modeToggle}

        <div className="hidden sm:flex items-center gap-1.5">
          {iconButton('Undo', undo, <Undo size={17} />)}
          {iconButton('Redo', redo, <Redo size={17} />)}
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <Tooltip content="Train an AI model for this project" position="bottom">
            <button
              type="button"
              onClick={() => void openAiStudio()}
              className="h-10 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95 focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none"
            >
              <Brain size={16} />
              <span className="hidden xl:inline">AI Studio</span>
              <span className="xl:hidden sr-only">AI Studio</span>
            </button>
          </Tooltip>
          {iconButton('Examples', () => setShowExamples(true), <BookOpen size={17} />)}
          {iconButton('Download .py file', download, <Download size={17} />)}
          {iconButton('Save (Ctrl+S)', () => void save(), <Save size={17} />)}
        </div>
        {runButton}
      </header>

      {/* ── Phone/tablet: secondary toolbar + tabs ─────────────────── */}
      {!isWide && (
        <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-b border-ed-line bg-ed-panel">
          <div
            className="flex items-center p-0.5 rounded-xl bg-ed-raised border border-ed-line"
            role="tablist"
          >
            {(
              [
                {
                  id: 'program',
                  label: mode === 'block' ? 'Blocks' : 'Code',
                  icon: mode === 'block' ? Blocks : Keyboard,
                },
                ...(mode === 'block' ? [{ id: 'python', label: 'Python', icon: Code2 }] : []),
                { id: 'output', label: 'Output', icon: Terminal },
              ] as Array<{ id: MobileTab; label: string; icon: typeof Blocks }>
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mobileTab === id}
                onClick={() => setMobileTab(id)}
                className={`relative h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  mobileTab === id ? 'bg-ed-accent text-white' : 'text-ed-mid hover:text-ed-hi'
                }`}
              >
                <Icon size={13} /> {label}
                {id === 'output' &&
                  mobileTab !== 'output' &&
                  (run.status === 'waiting' || run.status === 'error') && (
                    <span
                      className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${run.status === 'error' ? 'bg-red-500' : 'bg-sky-500 animate-pulse'}`}
                    />
                  )}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            {[
              { label: 'Undo', onClick: undo, icon: <Undo size={16} /> },
              { label: 'Redo', onClick: redo, icon: <Redo size={16} /> },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                aria-label={b.label}
                title={b.label}
                onClick={b.onClick}
                className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg text-ed-mid hover:text-ed-hi hover:bg-ed-raised active:scale-95"
              >
                {b.icon}
              </button>
            ))}
            {/* Examples / download / save: in the header from md up, in this menu below. */}
            <div className="relative md:hidden">
              <button
                type="button"
                aria-label="More"
                aria-haspopup="menu"
                aria-expanded={showMore}
                onClick={() => setShowMore((v) => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-ed-mid hover:text-ed-hi hover:bg-ed-raised active:scale-95"
              >
                <MoreVertical size={17} />
              </button>
              {showMore && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 z-50 w-52 py-1.5 rounded-2xl border border-ed-line bg-ed-raised shadow-xl"
                  >
                    {[
                      {
                        label: 'Examples',
                        onClick: () => setShowExamples(true),
                        icon: <BookOpen size={16} />,
                      },
                      {
                        label: 'AI Studio',
                        onClick: () => void openAiStudio(),
                        icon: <Brain size={16} />,
                      },
                      {
                        label: 'Download .py file',
                        onClick: download,
                        icon: <Download size={16} />,
                      },
                      { label: 'Save now', onClick: () => void save(), icon: <Save size={16} /> },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowMore(false);
                          item.onClick();
                        }}
                        className="w-full h-11 px-4 flex items-center gap-3 text-sm font-semibold text-ed-hi hover:bg-ed-line-soft text-left"
                      >
                        <span className="text-ed-mid">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!isWide && (
        <div className="shrink-0 px-2 py-1.5 border-b border-ed-line bg-ed-panel">{runOnBar}</div>
      )}

      {/* ── Body ────────────────────────────────────────────────────── */}
      {isWide ? (
        <main className="flex-1 min-h-0 flex gap-3 p-3">
          <section className="relative flex-1 min-w-0 rounded-2xl border border-ed-line overflow-hidden bg-ed-well">
            {mode === 'block' ? blocksView : codeView}
            {loadingOverlay}
          </section>
          <aside className="w-[min(420px,36vw)] shrink-0 flex flex-col gap-3 min-h-0">
            <div className="shrink-0 rounded-2xl border border-ed-line bg-ed-panel px-2.5 py-2">
              {runOnBar}
            </div>
            {mode === 'block' && <div className="h-[38%] min-h-[160px]">{previewView}</div>}
            <div className="flex-1 min-h-0">{consoleView}</div>
          </aside>
        </main>
      ) : (
        <main className="relative flex-1 min-h-0">
          {/* Keep the program mounted while other tabs show, so Blockly and the
              code editor keep their state (scroll, undo history). */}
          <div
            className={`absolute inset-0 ${mobileTab === 'program' ? '' : 'invisible pointer-events-none'}`}
            aria-hidden={mobileTab !== 'program'}
          >
            {mode === 'block' ? blocksView : codeView}
          </div>
          {mode === 'block' && mobileTab === 'python' && (
            <div className="absolute inset-0 p-2">{previewView}</div>
          )}
          {mobileTab === 'output' && <div className="absolute inset-0 p-2">{consoleView}</div>}
          {loadingOverlay}
        </main>
      )}

      <InstallDialog open={showInstall} board={hw} onClose={() => setShowInstall(false)} />

      <ExamplesDialog
        open={showExamples}
        target={target}
        mode={mode}
        onPick={openExample}
        onClose={() => setShowExamples(false)}
      />

      {confirm && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-playful"
          onClick={() => setConfirm(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="py-confirm-title"
            className="bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full shadow-2xl p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                {confirm === 'to-code' ? (
                  <Keyboard size={26} />
                ) : confirm === 'to-blocks' ? (
                  <Blocks size={26} />
                ) : (
                  <AlertTriangle size={26} />
                )}
              </div>
              <h3
                id="py-confirm-title"
                className="text-xl font-heading font-black text-slate-900 dark:text-white"
              >
                {confirm === 'to-code'
                  ? 'Start typing Python?'
                  : confirm === 'to-blocks'
                    ? 'Go back to blocks?'
                    : 'Unsaved changes'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {confirm === 'to-code'
                  ? 'Your blocks will turn into Python code that you can type and change. Your blocks are kept, but things you type won’t turn back into blocks.'
                  : confirm === 'to-blocks'
                    ? 'Typed Python can’t be turned into blocks, so you’ll go back to your blocks and the code you typed will be lost.'
                    : 'You have changes that are not saved yet. What would you like to do?'}
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {confirm === 'leave' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void save(true).then((saved) => {
                        if (saved) navigate('/dashboard');
                        else setConfirm(null);
                      });
                    }}
                    className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-heading font-black text-sm rounded-xl shadow-md active:scale-[0.98]"
                  >
                    Save & Exit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      useEditorStore.setState({ isDirty: false });
                      navigate('/dashboard');
                    }}
                    className="w-full h-11 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-heading font-black text-sm rounded-xl"
                  >
                    Leave without saving
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  autoFocus
                  onClick={confirm === 'to-code' ? switchToCode : switchToBlocks}
                  className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-heading font-black text-sm rounded-xl shadow-md active:scale-[0.98]"
                >
                  {confirm === 'to-code' ? 'Yes, switch to Python' : 'Yes, go back to blocks'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="w-full h-11 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-heading font-black text-sm rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
