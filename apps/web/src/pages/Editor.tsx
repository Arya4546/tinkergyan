/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-argument, no-console */
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
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MoreVertical,
  Terminal,
  Save,
  Play,
  Square,
  LayoutGrid,
  Code2,
  Loader2,
  Plus,
  Minus,
  FileCode,
  Download,
  Undo,
  Redo,
  Copy,
  Globe,
  Usb,
  Upload,
  PanelRight,
  Zap,
  Star,
  Gamepad2,
  Home,
  AlertTriangle,
  Cpu,
  ChevronDown,
  Check,
  Brain,
} from 'lucide-react';

import { CompileConsole } from '../components/editor/CompileConsole';
import { SerialMonitor } from '../components/editor/SerialMonitor';
import { SimulatorOutput } from '../components/editor/simulator/SimulatorOutput';
import {
  arduinoSimEngine,
  runArduinoSketchFromWorkspace,
} from '../components/editor/simulator/ArduinoSimEngine';
import { useArduinoSimStore } from '../stores/arduino-sim.store';
import { startHardwareBinding } from '../components/editor/simulator/hardware-binding';
import { StagePanel } from '../components/editor/simulator/StagePanel';
import { AITrainerModal } from '../components/editor/AITrainerModal';
import { WebSerialFlasher } from '../lib/web-serial-flasher';
import type { FlashBoard } from '../lib/web-serial-flasher';
import confetti from 'canvas-confetti';

import {
  BlocklyWorkspace,
  type BlocklyWorkspaceHandle,
} from '../components/editor/BlocklyWorkspace';
import { MonacoEditor, type MonacoEditorHandle } from '../components/editor/MonacoEditor';
import { Button } from '../components/ui/Button';
import { useEditorStore, STARTER_TEMPLATES, type StarterTemplate } from '../stores/editor.store';
import { useUIStore } from '../stores/ui.store';
import { useUser } from '../stores/auth.store';
import { useSimulatorStore } from '../stores/simulator.store';
import { scratchEngine } from '../components/editor/simulator/ScratchEngine';
import { workspaceToScratchCode } from '../components/editor/scratch-generator';
import { Tooltip } from '../components/ui/Tooltip';
import { BOARDS, getBoardLabel } from '../lib/boards';

// ─── Template Picker Modal ────────────────────────────────────────────────────
function TemplatePicker({
  onSelect,
  onClose,
}: {
  onSelect: (t: StarterTemplate) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-100 dark:border-dark-border shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-dark-border flex justify-between items-center">
          <h2 className="font-sans font-bold text-base text-slate-800 dark:text-white">
            Choose a starter
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-dark-border transition-colors focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
          {STARTER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onSelect(t);
                onClose();
              }}
              className="text-left p-4 rounded-xl border border-slate-100 dark:border-dark-border bg-slate-50 dark:bg-dark-bg hover:border-primary-500 hover:shadow-md transition-all group focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileCode size={14} className="text-primary-500" />
                <span className="font-sans font-semibold text-sm text-slate-800 dark:text-white">
                  {t.title}
                </span>
              </div>
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Conversion Error Modal ──────────────────────────────────────────────────
function ConversionErrorModal({
  error,
  onClose,
}: {
  error: { message: string; line?: number; col?: number };
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-dark-surface rounded-2xl border border-rose-100 dark:border-rose-950/30 shadow-2xl max-w-md w-full animate-pop overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-rose-50 dark:border-rose-950/20 bg-rose-50/50 dark:bg-rose-950/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <h2 className="font-sans font-bold text-base text-rose-700 dark:text-rose-400">
              Conversion Failed
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-dark-border transition-colors focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          <p className="font-sans text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            We couldn't convert your C++ code back to blocks because of a syntax error or
            unsupported structure.
          </p>
          <div className="bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl p-4 mb-5 font-mono text-xs text-rose-600 dark:text-rose-400 break-words max-h-48 overflow-y-auto leading-normal">
            {error.line !== undefined && (
              <span className="font-sans font-bold text-slate-400 dark:text-slate-500 block mb-1">
                Line {error.line}, Column {error.col}:
              </span>
            )}
            {error.message}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Go Back to Editor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Board Selector Dropdown ──────────────────────────────────────────
// Replaces the native <select> whose popup list can't be styled.
function BoardSelect({ value, onChange }: { value: string; onChange: (fqbn: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Capture phase so it fires even when Blockly stops event propagation.
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open]);

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <Tooltip content="Select Target Microcontroller Board" position="bottom">
        <button
          onClick={() => setOpen(!open)}
          className="h-9 pl-3 pr-2.5 rounded-full font-sans text-sm font-bold flex items-center gap-1.5 bg-white/20 text-white hover:bg-white/30 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none shadow-sm"
        >
          <Cpu size={16} className="text-white shrink-0" />
          <span className="max-w-[130px] truncate">{getBoardLabel(value)}</span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-white/80 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </Tooltip>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl shadow-xl p-1.5 z-50 animate-pop">
          <p className="px-3 pt-1.5 pb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Choose your board
          </p>
          {BOARDS.map((b) => (
            <button
              key={b.fqbn}
              onClick={() => {
                onChange(b.fqbn);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg font-sans text-sm text-left transition-colors ${
                value === b.fqbn
                  ? 'bg-primary-500/10 text-primary-500 font-semibold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate">{b.label}</span>
              {value === b.fqbn && <Check size={15} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Editor() {
  const { id: routeProjectId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const engineMode = (searchParams.get('engine') as 'hardware' | 'software') || 'hardware';
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hardwarePort, setHardwarePort] = useState<any>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashMessage, setFlashMessage] = useState('');
  const [showSerialMonitor, setShowSerialMonitor] = useState(false);
  const [showAITrainer, setShowAITrainer] = useState(false);
  const [showCodePanel, setShowCodePanel] = useState(
    () => searchParams.get('engine') === 'software',
  );
  const [showSimulator, setShowSimulator] = useState(
    () => searchParams.get('engine') === 'software',
  );
  const [terminalWidth, setTerminalWidth] = useState(() => (window.innerWidth < 1024 ? 340 : 420));
  const [conversionError, setConversionError] = useState<{
    message: string;
    line?: number;
    col?: number;
  } | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    // Capture-phase pointerdown: fires even when the click lands on the Blockly
    // canvas, which stops propagation and never lets a document 'click' bubble.
    const handlePointerDown = (e: PointerEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [showMoreMenu]);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../lib/cpp-to-blocks.worker.ts', import.meta.url), {
        type: 'module',
      });
    }
    return workerRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const isResizing = useRef(false);

  const blocklyRef = useRef<BlocklyWorkspaceHandle>(null);
  const monacoRef = useRef<MonacoEditorHandle>(null);

  const {
    mode,
    setMode,
    generatedCode,
    setGeneratedCode,
    manualCode,
    setManualCode,
    board,
    setBoard,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    isCompiling,
    compileResult,
    compile,
    clearResult,
    stdinInput,
    setStdinInput,
    projectTitle,
    setProjectTitle,
    isSaving,
    saveProject,
    loadProject,
    resetEditor,
    loadTemplate,
    projectId,
    isLoading,
    isDirty,
    blockXml,
    scheduleAutoSave,
    duplicateProject,
    isPublic,
    togglePublic,
  } = useEditorStore();

  const isRunning = useSimulatorStore((s) => s.isRunning);

  const boardLabel = getBoardLabel(board);
  const addToast = useUIStore((s: any) => s.addToast);
  const user = useUser();

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleNavigateHome = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // ── Resizer Effect ───────────────────────────────────────────────────
  useEffect(() => {
    let animationFrameId: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      let newWidth = window.innerWidth - e.clientX;
      newWidth = Math.max(200, Math.min(newWidth, window.innerWidth - 400));
      setTerminalWidth(newWidth);

      // Request animation frame for smooth resize
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.dispatchEvent(new Event('resize'));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ── Notify Blockly when panels mount/unmount ──────────────────────────
  // The flex container reflows correctly, but Blockly caches its container
  // dimensions and needs an explicit resize call. The ResizeObserver in
  // BlocklyWorkspace.tsx handles this automatically, but we also dispatch
  // a window resize event as a belt-and-suspenders fallback.
  useEffect(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }, [showCodePanel, showSimulator]);

  // ── Sync URL with newly created project ──────────────────────────────
  useEffect(() => {
    if (projectId && routeProjectId !== projectId) {
      navigate(`/editor/${projectId}?engine=${engineMode}`, { replace: true });
    }
  }, [projectId, routeProjectId, navigate, engineMode]);

  // ── Sync URL query param to loaded project's board target ────────────────
  useEffect(() => {
    if (routeProjectId && projectId === routeProjectId) {
      const currentEngine = searchParams.get('engine');
      const targetEngine = board === 'software' ? 'software' : 'hardware';
      if (currentEngine !== targetEngine) {
        navigate(`/editor/${projectId}?engine=${targetEngine}`, { replace: true });
      }
    }
  }, [projectId, routeProjectId, board, searchParams, navigate]);

  // ── Load project on mount if URL has an ID ─────────────────────────────
  useEffect(() => {
    if (routeProjectId) {
      if (projectId !== routeProjectId) {
        loadProject(routeProjectId).catch((err: any) => {
          console.error('Failed to load project:', err);
        });
        useSimulatorStore.getState().resetSimulator();
      }
    } else {
      resetEditor();
      useSimulatorStore.getState().resetSimulator();
      const targetBoard = engineMode === 'software' ? 'software' : 'arduino:avr:uno';
      useEditorStore.setState({ board: targetBoard });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProjectId, engineMode]);

  // ── Software projects have no C++ concept — the Blocks/C++ toggle is
  // hidden entirely in software mode, so guard against ever being stuck in
  // code mode with no way back (e.g. a project saved while `mode` was 'code'
  // from a template, or from before this project's engine was software).
  useEffect(() => {
    if (engineMode === 'software' && mode === 'code') {
      setMode('block');
    }
  }, [engineMode, mode, setMode]);

  // ── Reset editor store when leaving the Editor page ───────────────────
  useEffect(() => {
    return () => {
      resetEditor();
      useSimulatorStore.getState().resetSimulator();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load blockXml into Blockly after project loads ─────────────────────
  const hasLoadedProjectXml = useRef<string | null>(null);

  useEffect(() => {
    if (blockXml && blocklyRef.current && !isLoading) {
      if (hasLoadedProjectXml.current !== projectId) {
        blocklyRef.current.loadXml(blockXml);
        hasLoadedProjectXml.current = projectId;
      }
    }
  }, [blockXml, isLoading, projectId]);

  // ── Auto-save on changes ───────────────────────────────────────────────
  useEffect(() => {
    if (isDirty) {
      scheduleAutoSave(() => blocklyRef.current?.getXml() ?? '');
    }
  }, [isDirty, generatedCode, manualCode, projectTitle, board, scheduleAutoSave]);

  // ── Confetti Gamification ───────────────────────────────────────────────
  useEffect(() => {
    if (compileResult?.success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#F59E0B', '#3B82F6'],
      });
      // Ensure the code panel is visible so the user can see the output
      setShowCodePanel(true);
    }
  }, [compileResult]);

  const greenFlagCount = useSimulatorStore((s) => s.greenFlagCount);

  // ── Scratch Engine Integration ───────────────────────────────────────────
  /**
   * Compiles the current blocks into the engine without running anything.
   *
   * The engine used to receive the script only at green-flag time, which meant
   * "when key pressed" and "when this sprite clicked" were dead until the user
   * pressed Go — the hats simply weren't registered yet. Real Scratch fires
   * those the moment the script exists, so we keep the engine in sync with the
   * canvas instead and let each hat decide when it runs.
   */
  const syncScratchProgram = useCallback(() => {
    if (engineMode !== 'software') return;
    try {
      const workspace = (window as any).Blockly?.getMainWorkspace?.();
      if (workspace) scratchEngine.loadCode(workspaceToScratchCode(workspace));
    } catch (err) {
      console.error('Failed to compile Scratch script:', err);
    }
  }, [engineMode]);

  useEffect(() => {
    if (mode === 'block') syncScratchProgram();
  }, [mode, syncScratchProgram]);

  useEffect(() => {
    if (isRunning && mode === 'block') {
      // Recompile first: the flag must always run what is on the canvas right
      // now, even if the last change event was missed.
      syncScratchProgram();
      scratchEngine.triggerGreenFlag();
    } else if (!isRunning) {
      scratchEngine.stop();
    }
  }, [isRunning, greenFlagCount, mode, syncScratchProgram]);

  // ── Mode switching ─────────────────────────────────────────────────────
  const switchToCode = useCallback(() => {
    if (mode === 'block') setManualCode(generatedCode);
    clearResult();
    setMode('code');
  }, [mode, generatedCode, setManualCode, clearResult, setMode]);

  const switchToBlock = useCallback(() => {
    if (mode === 'code' && manualCode !== generatedCode) {
      const ok = window.confirm(
        'Switching back to Block mode will discard manual code edits. Continue?',
      );
      if (!ok) return;
    }
    clearResult();
    setMode('block');
  }, [mode, manualCode, generatedCode, clearResult, setMode]);

  // ── Reset Project (Software mode) ───────────────────────────────────────
  // Wipes all blocks/code and sprites back to a blank slate, same as a brand
  // new project — but keeps the current project id/title, so it still saves
  // over the existing project instead of creating a new one.
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetProject = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const confirmResetProject = useCallback(() => {
    setShowResetConfirm(false);
    // Kill the running scripts *before* clearing the canvas. Reset used to rely
    // on resetSimulator() flipping isRunning to false and the effect above
    // noticing — which does nothing when isRunning is already false, and left
    // the compiled scripts registered either way. The result was a wiped
    // workspace with a sprite still moving.
    scratchEngine.reset();
    // Same treatment for the hardware simulator, for exactly the same reason.
    // Without it, resetting a hardware project wiped the canvas while the
    // sketch carried on running — LED still blinking, stale Serial output still
    // on screen — which is the "blocks reset but it's still going" report all
    // over again, just on the other engine.
    arduinoSimEngine.stop();
    useArduinoSimStore.getState().reset();
    blocklyRef.current?.clearWorkspace();
    setManualCode('');
    useSimulatorStore.getState().resetSimulator();
    clearResult();
  }, [setManualCode, clearResult]);

  const handleConvertCodeToBlocks = useCallback(() => {
    const code = monacoRef.current?.getValue() ?? manualCode;
    setIsConverting(true);
    setConversionError(null);
    clearResult();

    const worker = getWorker();

    const handleWorkerMessage = (event: MessageEvent) => {
      worker.removeEventListener('message', handleWorkerMessage);
      worker.removeEventListener('error', handleWorkerError);
      setIsConverting(false);

      const res = event.data;
      if (res.success) {
        if (blocklyRef.current) {
          blocklyRef.current.loadXml(res.xml);
        }
        setGeneratedCode(code);
        setManualCode(code);
        setMode('block');
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#8B5CF6', '#6366F1', '#10B981'],
        });
        addToast({
          type: 'success',
          title: 'Blocks Updated! 🧩',
          message: 'Successfully converted C++ code to visual blocks.',
        });
      } else {
        console.error('[C++ to Blocks Conversion Failed]', res.error);
        setConversionError({
          message: res.error.message || 'Unknown parser error',
          line: res.error.line,
          col: res.error.col,
        });
      }
    };

    const handleWorkerError = (err: ErrorEvent) => {
      worker.removeEventListener('message', handleWorkerMessage);
      worker.removeEventListener('error', handleWorkerError);
      setIsConverting(false);
      console.error('[Worker Error]', err);
      setConversionError({
        message: err.message || 'Worker runtime error during parsing',
      });
    };

    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', handleWorkerError);
    worker.postMessage({ code });
  }, [manualCode, getWorker, setGeneratedCode, setManualCode, setMode, clearResult, addToast]);

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const xml = blocklyRef.current?.getXml() ?? '';
    try {
      await saveProject(xml);
      addToast({ type: 'success', title: 'Saved! 💾', message: 'Your project is saved.' });
    } catch {
      addToast({
        type: 'error',
        title: 'Oops — save failed',
        message: 'Could not save. Try again in a moment.',
      });
    }
  }, [saveProject, addToast]);

  const handleDuplicate = useCallback(async () => {
    try {
      if (isDirty) await handleSave();
      const newId = await duplicateProject();
      navigate(`/editor/${newId}?engine=${engineMode}`, { replace: true });
      addToast({
        type: 'success',
        title: 'Project copied!',
        message: 'A new copy has been created.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Could not copy',
        message: 'Something went wrong. Try again.',
      });
    }
  }, [duplicateProject, navigate, addToast, isDirty, handleSave, engineMode]);

  const handleTogglePublic = useCallback(async () => {
    try {
      const newState = await togglePublic();
      addToast({
        type: 'success',
        title: newState ? 'Shared to Gallery 🌍' : 'Now private',
        message: newState
          ? 'Your project is visible in the Gallery.'
          : 'Your project is now private.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Could not change visibility',
        message: 'Try again in a moment.',
      });
    }
  }, [togglePublic, addToast]);

  const handleConnectHardware = async () => {
    if (!('serial' in navigator)) {
      addToast({
        type: 'info',
        title: 'Use Chrome or Edge for hardware',
        message: `Connecting to your ${boardLabel} needs Chrome or Edge. You can still build and save your project here!`,
      });
      return;
    }

    try {
      if (hardwarePort) {
        try {
          await hardwarePort.close();
        } catch {
          /* may already be closed */
        }
        setHardwarePort(null);
        setShowSerialMonitor(false);
        addToast({ type: 'info', title: 'Disconnected', message: `${boardLabel} disconnected.` });
        return;
      }

      const port = await (navigator as any).serial.requestPort();
      // Don't open yet — let Serial Monitor or Flasher open with the right baud
      setHardwarePort(port);

      const info = port.getInfo();
      addToast({
        type: 'success',
        title: `${boardLabel} connected! 🎉`,
        message: `Device ready (VID: ${info.usbVendorId || 'Unknown'})`,
      });

      // Listen for disconnect
      (navigator as any).serial.addEventListener('disconnect', (e: any) => {
        if (e.target === port) {
          setHardwarePort(null);
          setShowSerialMonitor(false);
          addToast({
            type: 'warning',
            title: 'Cable disconnected',
            message: 'Check your USB cable and reconnect.',
          });
        }
      });
    } catch (err: any) {
      if (err.name === 'NotFoundError') return; // User cancelled
      addToast({
        type: 'error',
        title: "Couldn't connect",
        message: err.message || 'Check the USB cable and try again.',
      });
    }
  };

  // ── Upload to Hardware ───────────────────────────────────────────────────
  const handleUploadToHardware = useCallback(async () => {
    if (!hardwarePort) {
      addToast({
        type: 'error',
        title: 'No board connected',
        message: `Connect your ${boardLabel} first.`,
      });
      return;
    }

    const code =
      mode === 'block'
        ? (blocklyRef.current?.getCode() ?? generatedCode)
        : (monacoRef.current?.getValue() ?? manualCode);

    if (!code.trim()) {
      addToast({
        type: 'info',
        title: 'Nothing to upload yet',
        message: 'Add some blocks first, then try again.',
      });
      return;
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setFlashMessage('Compiling firmware...');
    setShowSerialMonitor(false); // Close serial monitor during flash
    setShowCodePanel(true);

    try {
      // Step 1: Compile for firmware (uses arduino-cli on server)
      addToast({
        type: 'info',
        title: 'Building your code...',
        message: `Compiling for your ${boardLabel} — hang tight!`,
      });
      const { data } = await (
        await import('../services/api')
      ).api.post('/compile', {
        code,
        board,
        stdin: '',
        target: 'firmware',
      });

      const firmwareResult = data.data.result;

      if (!firmwareResult.success || !firmwareResult.hexBase64) {
        const errMsg =
          firmwareResult.errors?.[0]?.message ||
          firmwareResult.stderr ||
          'Firmware compilation failed';
        addToast({ type: 'error', title: 'Build error', message: errMsg });
        setIsFlashing(false);
        setFlashProgress(0);
        setFlashMessage('');
        return;
      }

      setFlashMessage('Uploading to board...');
      setFlashProgress(10);

      // Step 2: Flash the compiled firmware to the board
      const flasher = new WebSerialFlasher(hardwarePort);
      await flasher.flash(firmwareResult.hexBase64, {
        board: board as FlashBoard,
        onProgress: (percent, message) => {
          setFlashProgress(percent);
          setFlashMessage(message);
        },
        onLog: (msg) => console.log('[Flash]', msg),
      });

      addToast({
        type: 'success',
        title: `Done! Uploaded to your ${boardLabel} 🚀`,
        message: 'Your code is running on the board!',
      });
      setShowSerialMonitor(true); // Auto-open serial monitor after flash
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err.message || 'Upload failed.';
      addToast({ type: 'error', title: 'Upload error', message });
    } finally {
      setIsFlashing(false);
      setFlashProgress(0);
      setFlashMessage('');
    }
  }, [hardwarePort, board, boardLabel, mode, generatedCode, manualCode, addToast]);

  // ── Run ────────────────────────────────────────────────────────────────
  const isSimRunning = useArduinoSimStore((s) => s.isRunning);

  const handleCompile = useCallback(async () => {
    const code =
      mode === 'block'
        ? (blocklyRef.current?.getCode() ?? generatedCode)
        : (monacoRef.current?.getValue() ?? manualCode);

    if (!code.trim()) {
      addToast({
        type: 'info',
        title: 'Nothing to run yet',
        message: 'Add some blocks, then hit Run!',
      });
      return;
    }

    /**
     * Block mode runs entirely in the browser — no server, no wait.
     *
     * We know what every block means, so we can execute it directly instead of
     * shipping C++ to a compiler to find out. That makes Run instant, correct
     * (real delays, real `loop()`, board-accurate ADC), and immune to the
     * compile service being down — which is what broke this feature for a full
     * day. The server round-trip stays for the C++ tab, where we genuinely do
     * need a compiler.
     */
    if (engineMode === 'hardware' && mode === 'block') {
      clearResult(); // Drop any stale compile output so panels don't disagree.
      // Shared with the green flag above the stage so the two Run affordances
      // cannot diverge.
      runArduinoSketchFromWorkspace();
      return;
    }

    setShowCodePanel(true);
    setShowSerialMonitor(false);
    await compile(code, 'simulate');
  }, [mode, engineMode, generatedCode, manualCode, compile, clearResult, addToast]);

  const handleStopSim = useCallback(() => {
    arduinoSimEngine.stop();
  }, []);

  // Show the simulator panel once a sketch has actually run, and keep it up
  // after Stop so students can read the output they just produced.
  const simHasOutput = useArduinoSimStore(
    (s) => s.serial.length > 0 || Object.keys(s.pins).length > 0 || s.error !== null,
  );
  const showSimOutput =
    engineMode === 'hardware' && mode === 'block' && (isSimRunning || simHasOutput);

  // Leaving block mode or switching boards must not leave a sketch running
  // against state it no longer matches.
  useEffect(() => {
    if (!(engineMode === 'hardware' && mode === 'block')) arduinoSimEngine.stop();
  }, [engineMode, mode]);

  // Connect the stage components to the running sketch — an LED wired to pin 13
  // lights when the code writes HIGH to 13, and pressing a button on the stage
  // is visible to digitalRead. Live for the whole hardware session, not just
  // while running, so wiring a component updates the sketch's view of its
  // inputs even before Run is pressed.
  useEffect(() => {
    if (engineMode !== 'hardware') return;
    return startHardwareBinding();
  }, [engineMode]);

  /**
   * Every real edit to the canvas, regardless of engine.
   *
   * Keeps the Scratch engine's compiled copy of the script current, so hats
   * fire against what is actually on screen. Previously this rode on
   * `onCodeChange`, which never fires in software mode because the Arduino
   * generator throws on Scratch blocks — so changing a "when [key] pressed"
   * dropdown left the engine still listening for the old key, and a freshly
   * dropped block (which defaults to "any") kept matching every key until the
   * green flag was pressed again.
   */
  const handleWorkspaceChange = useCallback(() => {
    syncScratchProgram();
  }, [syncScratchProgram]);

  // ── Blockly code change → also schedule auto-save ──────────────────────
  const handleBlocklyCodeChange = useCallback(
    (code: string) => {
      setGeneratedCode(code);
      // Keep the Scratch engine's copy of the script current on every edit, so
      // key/sprite-click hats fire against what is actually on the canvas.
      // Cheap: this only re-registers callbacks, it never starts anything.
      syncScratchProgram();
      // Editing the blocks makes the last run's output stale, so drop it —
      // which also hands the panel back to the C++ preview. Without this the
      // simulator claimed the panel permanently after the first Run and there
      // was no way to see the generated code again. Skipped while a sketch is
      // running so tweaking blocks mid-run doesn't wipe live output.
      if (!useArduinoSimStore.getState().isRunning) {
        useArduinoSimStore.getState().reset();
      }
      // Note: Do NOT call setBlockXml here. Updating the store's blockXml on every change
      // triggers the loadXml effect which forcefully recreates blocks and interrupts dragging.
      // Auto-save and manual save fetch the XML on-demand via blocklyRef.current.getXml().
    },
    [setGeneratedCode, syncScratchProgram],
  );

  // ── Download .ino file ─────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const code =
      mode === 'block'
        ? (blocklyRef.current?.getCode() ?? generatedCode)
        : (monacoRef.current?.getValue() ?? manualCode);

    if (!code.trim()) {
      addToast({
        type: 'info',
        title: 'Nothing to download yet',
        message: 'Add some blocks first!',
      });
      return;
    }

    const sanitized = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitized}.ino`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      title: 'Downloaded!',
      message: `${sanitized}.ino saved to your downloads.`,
    });
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
      // Ctrl+Enter → Compile & Run (hardware) or ▶ Run (software's green flag)
      if (ctrl && e.key === 'Enter') {
        e.preventDefault();
        if (engineMode === 'hardware') {
          handleCompile();
        } else {
          useSimulatorStore.getState().startSimulation();
        }
      }
      // Ctrl+Shift+D → Download (hardware .ino download only)
      if (ctrl && e.shiftKey && (e.key === 'd' || e.key === 'D') && engineMode === 'hardware') {
        e.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleCompile, handleDownload, engineMode]);

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background dark:bg-dark-bg">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-primary-500 mx-auto mb-4" />
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
            Loading your project...
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#11141E] font-sans overflow-hidden">
      {/* ── Top Control Bar ─────────────────────────────────────── */}
      <div className="shrink-0 w-full h-[72px] flex justify-between items-center z-30 px-4 sm:px-6 gap-2 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 dark:from-[#3D1A00] dark:via-[#7A3300] dark:to-[#994D00] shadow-[0_8px_30px_-4px_rgba(249,115,22,0.4)] dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)]">
        {/* Left: Back + project title + dirty indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <Tooltip content="Dashboard" position="bottom">
            <button
              onClick={handleNavigateHome}
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 hover:scale-105 active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none shadow-sm backdrop-blur-sm"
            >
              <Home size={20} strokeWidth={2.5} />
            </button>
          </Tooltip>

          <input
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleSave();
                e.currentTarget.blur();
              }
            }}
            className="font-sans font-extrabold text-lg sm:text-xl text-white bg-transparent border-none outline-none w-32 sm:w-64 truncate hover:bg-white/10 focus:bg-white/20 rounded-xl px-3 py-1.5 transition-all placeholder-white/70"
            spellCheck={false}
            placeholder="Untitled Project"
          />
          {isDirty && (
            <Tooltip content="Unsaved Changes" position="bottom">
              <div className="w-2.5 h-2.5 rounded-full bg-warning-400 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            </Tooltip>
          )}

          {/* Gamification surface */}
          {user && (
            <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-white/10 rounded-full border border-white/20 ml-2 shadow-sm">
              <Tooltip content={`${user.streak} day streak!`} position="bottom">
                <div className="flex items-center gap-1.5 text-warning-400">
                  <Zap size={14} fill="currentColor" />
                  <span className="font-sans font-bold text-xs text-white">{user.streak}</span>
                </div>
              </Tooltip>
              <div className="w-px h-3 bg-white/30" />
              <Tooltip content={`Level ${user.level}`} position="bottom">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Star size={14} fill="currentColor" />
                  <span className="font-sans font-bold text-xs text-white">Lvl {user.level}</span>
                </div>
              </Tooltip>
            </div>
          )}
        </div>

        {engineMode === 'hardware' && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-white/20 rounded-xl p-1 shadow-inner backdrop-blur-md">
              <Tooltip content="Visual Block Editor" position="bottom">
                <button
                  onClick={switchToBlock}
                  className={`flex items-center gap-2 h-9 px-5 rounded-lg font-sans font-bold text-[14px] transition-all focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none ${
                    mode === 'block'
                      ? 'bg-white text-orange-500 shadow-sm scale-105'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  <LayoutGrid size={18} strokeWidth={2.5} />{' '}
                  <span className="hidden sm:inline">Blocks</span>
                </button>
              </Tooltip>
              <Tooltip content="C++ Text Code Editor" position="bottom">
                <button
                  onClick={switchToCode}
                  className={`flex items-center gap-2 h-9 px-4 rounded-lg font-sans font-extrabold text-[14px] transition-all focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none ${
                    mode === 'code'
                      ? 'bg-white text-orange-600 shadow-sm scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/20'
                  }`}
                >
                  <Code2 size={16} /> <span className="hidden sm:inline">C++</span>
                </button>
              </Tooltip>
            </div>
            {mode === 'code' && (
              <Tooltip content="Translate C++ code back to Blockly blocks" position="bottom">
                <button
                  onClick={handleConvertCodeToBlocks}
                  disabled={isConverting}
                  className="h-12 px-5 rounded-2xl font-sans font-bold text-sm flex items-center gap-2 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 shadow-[0_4px_0_#D97706] hover:shadow-[0_2px_0_#D97706] hover:translate-y-[2px] transition-all active:shadow-none active:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed border-2 border-amber-500/50"
                >
                  {isConverting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LayoutGrid size={16} />
                  )}
                  <span className="hidden md:inline">
                    {isConverting ? 'Converting...' : 'Convert to Blocks'}
                  </span>
                  <span className="inline md:hidden">{isConverting ? '...' : 'Convert'}</span>
                </button>
              </Tooltip>
            )}
          </div>
        )}

        {/* Right: Board + controls + primary actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {engineMode === 'hardware' && <BoardSelect value={board} onChange={setBoard} />}

          {/* Font size controls (code mode only) */}
          {mode === 'code' && (
            <div className="flex items-center bg-white/20 rounded-full overflow-hidden shadow-inner border border-white/10">
              <Tooltip content="Decrease Font Size" position="bottom">
                <button
                  onClick={decreaseFontSize}
                  className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <Minus size={14} />
                </button>
              </Tooltip>
              <span className="w-6 h-9 flex items-center justify-center font-sans text-xs font-bold text-white">
                {fontSize}
              </span>
              <Tooltip content="Increase Font Size" position="bottom">
                <button
                  onClick={increaseFontSize}
                  className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <Plus size={14} />
                </button>
              </Tooltip>
            </div>
          )}

          {/* Undo/Redo (block mode only) */}
          {mode === 'block' && (
            <div className="flex items-center gap-1">
              <Tooltip content="Undo (Ctrl+Z)" position="bottom">
                <button
                  onClick={() => blocklyRef.current?.undo()}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white bg-white/10 hover:bg-white/20 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <Undo size={15} />
                </button>
              </Tooltip>
              <Tooltip content="Redo (Ctrl+Y)" position="bottom">
                <button
                  onClick={() => blocklyRef.current?.redo()}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white bg-white/10 hover:bg-white/20 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <Redo size={15} />
                </button>
              </Tooltip>
            </div>
          )}

          {/* Secondary actions group -> Moved to More Menu */}
          <div className="relative" ref={moreMenuRef}>
            <Tooltip content="More Options" position="bottom">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <MoreVertical size={18} />
              </button>
            </Tooltip>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-ed-raised border border-ed-line rounded-xl shadow-lg flex flex-col p-1 z-50">
                <button
                  onClick={() => {
                    setShowTemplates(true);
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ed-hi hover:bg-ed-panel rounded-lg text-left"
                >
                  <FileCode size={16} className="shrink-0" />
                  <span>Templates</span>
                </button>
                <button
                  onClick={() => {
                    handleDownload();
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ed-hi hover:bg-ed-panel rounded-lg text-left"
                >
                  <Download size={16} className="shrink-0" />
                  <span>Download .ino</span>
                </button>
                <button
                  onClick={() => {
                    handleSave();
                    setShowMoreMenu(false);
                  }}
                  disabled={isSaving}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ed-hi hover:bg-ed-panel rounded-lg text-left disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin shrink-0" />
                  ) : (
                    <Save size={16} className="shrink-0" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Project'}</span>
                </button>
                {projectId && (
                  <>
                    <div className="h-px bg-ed-line my-1" />
                    <button
                      onClick={() => {
                        handleDuplicate();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ed-hi hover:bg-ed-panel rounded-lg text-left"
                    >
                      <Copy size={16} className="shrink-0" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      onClick={() => {
                        handleTogglePublic();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ed-hi hover:bg-ed-panel rounded-lg text-left"
                    >
                      <Globe
                        size={16}
                        className={`shrink-0 ${isPublic ? 'text-accent-500' : ''}`}
                      />
                      <span>{isPublic ? 'Make Private' : 'Share to Gallery'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Hardware connection and control buttons */}
          {engineMode === 'hardware' && (
            <>
              {/* Connect Board — second-highest prominence */}
              <Tooltip
                content={
                  hardwarePort
                    ? 'Disconnect Hardware Board'
                    : `Connect ${boardLabel} via Web Serial`
                }
                position="bottom"
              >
                <button
                  onClick={handleConnectHardware}
                  className={`h-9 px-4 rounded-full font-sans font-bold text-sm flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none shadow-sm ${
                    hardwarePort
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                      : 'bg-white text-[#6366F1] hover:bg-white/90'
                  }`}
                >
                  <Usb size={15} />
                  <span className="hidden sm:inline">{hardwarePort ? 'Connected' : 'Connect'}</span>
                </button>
              </Tooltip>

              {/* Upload firmware — visible only when board connected */}
              {hardwarePort && (
                <Tooltip content={`Compile & Upload firmware to ${boardLabel}`} position="bottom">
                  <button
                    onClick={handleUploadToHardware}
                    disabled={isFlashing || isCompiling}
                    className="h-9 px-4 rounded-full font-sans font-bold text-sm flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none shadow-sm disabled:opacity-50"
                  >
                    {isFlashing ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Upload size={15} />
                    )}
                    <span className="hidden sm:inline">
                      {isFlashing ? `${flashProgress}%` : 'Upload'}
                    </span>
                  </button>
                </Tooltip>
              )}

              {/* Serial Monitor toggle — visible when board connected */}
              {hardwarePort && (
                <Tooltip content="Toggle Hardware Serial Monitor Log" position="bottom">
                  <button
                    onClick={() => setShowSerialMonitor(!showSerialMonitor)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
                      showSerialMonitor
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Terminal size={15} />
                  </button>
                </Tooltip>
              )}
            </>
          )}

          {/* Code Panel Toggle */}
          {engineMode === 'hardware' && (
            <Tooltip
              content={showCodePanel ? 'Hide C++ Code Preview' : 'Show C++ Code Preview'}
              position="bottom"
            >
              <button
                onClick={() => {
                  setShowCodePanel(!showCodePanel);
                  if (showSimulator && showCodePanel) setShowSimulator(false);
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none hidden sm:flex ${
                  showCodePanel && !showSimulator
                    ? 'bg-white text-[#6366F1] shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <PanelRight size={15} />
              </button>
            </Tooltip>
          )}

          {/* AI Studio Button */}
          <Tooltip content="Open AI Model Studio" position="bottom">
            <button
              onClick={() => setShowAITrainer(true)}
              className="h-9 px-4 rounded-full font-sans font-bold text-sm flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none bg-white/20 text-white hover:bg-white/30 shadow-sm"
            >
              <Brain size={15} />
              <span className="hidden md:inline">AI Studio</span>
            </button>
          </Tooltip>

          {/* Stage toggle (software mode only) */}
          {engineMode === 'software' && (
            <Tooltip
              content={showSimulator ? 'Hide Stage Simulator' : 'Show Stage Simulator'}
              position="bottom"
            >
              <button
                onClick={() => {
                  const nextState = !showSimulator;
                  setShowSimulator(nextState);
                  if (nextState) {
                    setShowCodePanel(true);
                  } else if (engineMode === 'software') {
                    setShowCodePanel(false);
                  }
                }}
                className={`h-9 px-4 rounded-full font-sans font-bold text-sm items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none hidden sm:flex ${
                  showSimulator
                    ? 'bg-white text-emerald-600 shadow-md'
                    : 'text-white bg-white/20 hover:bg-white/30'
                }`}
              >
                <Gamepad2 size={15} />
                <span className="hidden md:inline">Stage</span>
              </button>
            </Tooltip>
          )}

          {/* Run / Stop Button */}
          {engineMode === 'hardware' && (
            <Tooltip
              content={isSimRunning ? 'Stop the running program' : 'Run Code (Ctrl+Enter)'}
              position="bottom"
            >
              <button
                onClick={isSimRunning ? handleStopSim : handleCompile}
                disabled={isCompiling || isFlashing}
                className={`h-10 px-6 rounded-full font-sans font-bold text-sm flex items-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none shadow-md ${
                  isSimRunning
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-[#10B981] hover:bg-[#059669] text-white'
                }`}
              >
                {isCompiling ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isSimRunning ? (
                  <Square size={15} fill="currentColor" />
                ) : (
                  <Play size={15} fill="currentColor" />
                )}
                <span>{isCompiling ? 'Running...' : isSimRunning ? 'Stop' : 'Run'}</span>
              </button>
            </Tooltip>
          )}
        </div>

        {/* Flash progress bar */}
        {isFlashing && (
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-ed-panel">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${flashProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Main Canvas (Seamless Full-Bleed) ────────────────────────────────── */}
      <div className="flex-1 w-full overflow-hidden relative">
        <div className="flex w-full h-full bg-white dark:bg-[#11141E] overflow-hidden relative">
          {/* ── Editor Pane ─────────────────────────────────────────────── */}

          <div className="flex-1 relative overflow-hidden">
            {/* Blockly canvas */}
            <div
              className={`absolute inset-0 transition-opacity duration-150 ${mode === 'block' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
              <BlocklyWorkspace
                ref={blocklyRef}
                engineMode={engineMode}
                onCodeChange={handleBlocklyCodeChange}
                onWorkspaceChange={handleWorkspaceChange}
                className="w-full h-full"
              />
            </div>

            {/* Monaco editor */}
            <div
              className={`absolute inset-0 bg-ed-well transition-opacity duration-150 ${mode === 'code' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
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

          {/* ── Resizer ─────────────────────────────────────────────────── */}
          {showCodePanel && (
            <div className="py-4 flex flex-col justify-center bg-transparent">
              <div
                className="w-1.5 h-16 bg-slate-200 hover:bg-primary-400 cursor-col-resize transition-colors shrink-0 z-10 mx-2 rounded-full"
                onMouseDown={() => {
                  isResizing.current = true;
                  document.body.style.cursor = 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
              />
            </div>
          )}

          {/* ── Output / Compiler Terminal Pane ─────────────────────────── */}
          {showCodePanel && (
            <div style={{ width: terminalWidth }} className="flex flex-col shrink-0 py-4 pr-4">
              <div
                className={`flex-1 flex flex-col rounded-[32px] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] border-[6px] transition-all duration-300 relative ${
                  showSimulator
                    ? 'border-white/80 dark:border-slate-800 bg-white dark:bg-[#151821]'
                    : 'border-slate-800/80 dark:border-slate-700/80 bg-[#0A0A0A]'
                }`}
              >
                {/* Simulator Stage Panel */}
                {showSimulator ? (
                  <StagePanel onReset={handleResetProject} />
                ) : (
                  <>
                    {/* Serial Monitor (when active and hardware connected) */}
                    {showSerialMonitor && hardwarePort && !isFlashing ? (
                      <SerialMonitor
                        port={hardwarePort}
                        onDisconnect={() => {
                          setHardwarePort(null);
                          setShowSerialMonitor(false);
                        }}
                        onClose={() => setShowSerialMonitor(false)}
                      />
                    ) : (
                      <>
                        {/* C++ preview header (block mode) */}
                        {mode === 'block' &&
                          engineMode === 'hardware' &&
                          !isCompiling &&
                          !compileResult &&
                          !isFlashing && (
                            <div className="border-b border-white/10 bg-[#1A1D24] px-4 py-2.5 flex items-center gap-2 shrink-0">
                              <div className="flex gap-1.5 mr-3">
                                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"></div>
                              </div>
                              <Code2 size={13} className="text-slate-400" />
                              <span className="font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                                Generated_Cpp_Preview.cpp
                              </span>
                            </div>
                          )}

                        {/* Stdin input for programs that need cin/scanf */}
                        {mode === 'code' && !isFlashing && (
                          <div className="border-b border-ed-term-line bg-ed-term-surface shrink-0">
                            <div className="px-3 py-1.5 flex items-center gap-2">
                              <span className="font-sans text-xs text-ed-mid">📥 Stdin input</span>
                            </div>
                            <textarea
                              value={stdinInput}
                              onChange={(e) => setStdinInput(e.target.value)}
                              placeholder="Enter input here (for cin/scanf programs)..."
                              spellCheck={false}
                              className="w-full bg-ed-term-surface text-ed-term-text font-mono text-[11px] px-3 py-2 outline-none resize-none border-none h-16 placeholder:text-ed-hi"
                            />
                          </div>
                        )}

                        {/* Flash progress overlay */}
                        {isFlashing && (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-white dark:bg-[#11141E]">
                            <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 animate-pulse pointer-events-none" />
                            <div className="w-20 h-20 rounded-[24px] bg-white dark:bg-[#1A1D24] border border-blue-100 dark:border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.3)] flex items-center justify-center mb-6 z-10 relative">
                              <Upload
                                size={36}
                                className="text-blue-500 dark:text-blue-400 animate-bounce"
                              />
                            </div>
                            <p className="font-sans font-bold text-lg text-slate-800 dark:text-blue-400 mb-4 z-10">
                              Uploading to {boardLabel}...
                            </p>
                            <div className="w-full max-w-[240px] h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden mb-3 border border-slate-200 dark:border-slate-700/50 shadow-inner z-10 relative">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-400 transition-all duration-300 ease-out rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)]"
                                style={{ width: `${flashProgress}%` }}
                              />
                            </div>
                            <p className="font-sans font-medium text-xs text-slate-500 dark:text-blue-200/60 text-center z-10">
                              {flashMessage || 'Establishing connection...'}
                            </p>
                          </div>
                        )}

                        {/* Simulator output wins the panel whenever a sketch has
                          run locally — it is live state, so it must not be
                          hidden behind a stale compile result. */}
                        {!isFlashing && showSimOutput ? <SimulatorOutput /> : null}

                        {/* Console (has compile result or is compiling) OR code preview */}
                        {!isFlashing &&
                          !showSimOutput &&
                          (isCompiling || compileResult ? (
                            <CompileConsole
                              isCompiling={isCompiling}
                              compileResult={compileResult}
                            />
                          ) : (
                            <div className="flex-1 overflow-y-auto p-4">
                              {mode === 'block' &&
                                engineMode === 'hardware' &&
                                (generatedCode ? (
                                  <pre className="font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap">
                                    {generatedCode}
                                  </pre>
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-slate-700">
                                    <Code2 size={36} className="mb-4 opacity-20" />
                                    <p className="font-sans text-sm font-semibold text-slate-500 text-center">
                                      Drag a block to get started
                                    </p>
                                    <p className="font-sans text-xs text-slate-600 text-center mt-1">
                                      Drop blocks on the canvas to preview C++ output
                                    </p>
                                  </div>
                                ))}
                              {mode === 'code' && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-700">
                                  <Play size={36} className="mb-4 opacity-20" />
                                  <p className="font-sans text-sm font-semibold text-slate-500 text-center">
                                    Hit Run to compile!
                                  </p>
                                  <p className="font-sans text-xs text-slate-600 text-center mt-1">
                                    Press Run in the toolbar to compile and run your code
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Template Picker Overlay ─────────────────────────────────────── */}
      {showTemplates && (
        <TemplatePicker onSelect={loadTemplate} onClose={() => setShowTemplates(false)} />
      )}

      {/* ── Conversion Error Overlay ───────────────────────────────────── */}
      {conversionError && (
        <ConversionErrorModal error={conversionError} onClose={() => setConversionError(null)} />
      )}

      {/* ── Reset Project Confirmation ───────────────────────────────────── */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="bg-white dark:bg-dark-surface rounded-2xl border border-rose-100 dark:border-rose-950/30 shadow-2xl max-w-md w-full animate-pop overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-rose-50 dark:border-rose-950/20 bg-rose-50/50 dark:bg-rose-950/10 flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-500 shrink-0" />
              <h2 className="font-sans font-bold text-base text-rose-700 dark:text-rose-400">
                Reset Project
              </h2>
            </div>
            <div className="p-6">
              <p className="font-sans text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                This will permanently remove all blocks, code, and sprites, and start this project
                over from a blank slate. This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={confirmResetProject}
                  className="h-9 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-sans font-bold text-sm shadow-md transition-all duration-200 active:scale-[0.98]"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Unsaved Changes Blocker Overlay ──────────────────────────────── */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl max-w-md w-full shadow-2xl animate-pop p-6 relative flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unsaved Changes</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                You have unsaved changes in this project. What would you like to do before leaving?
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  const xml = blocklyRef.current?.getXml() ?? '';
                  try {
                    await saveProject(xml);
                    navigate('/dashboard');
                  } catch {
                    addToast({
                      type: 'error',
                      title: 'Save failed',
                      message: 'Could not save project. Navigation cancelled.',
                    });
                    setShowLeaveConfirm(false);
                  }
                }}
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                Save & Exit
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/dashboard');
                }}
                className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-sans font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                }}
                className="w-full h-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-sans font-semibold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Model Studio Modal */}
      <AITrainerModal isOpen={showAITrainer} onClose={() => setShowAITrainer(false)} />
    </div>
  );
}
