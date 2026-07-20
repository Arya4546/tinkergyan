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
import { Link, useParams, useNavigate, useSearchParams, useBlocker } from 'react-router-dom';
import {
  MoreVertical,
  Terminal,
  Save,
  Play,
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
} from 'lucide-react';

import { CompileConsole } from '../components/editor/CompileConsole';
import { SerialMonitor } from '../components/editor/SerialMonitor';
import { StagePanel } from '../components/editor/simulator/StagePanel';
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

// ─── Board dropdown options ───────────────────────────────────────────────────
const BOARDS = [
  { fqbn: 'arduino:avr:uno', label: 'Arduino Uno' },
  { fqbn: 'arduino:avr:mega', label: 'Arduino Mega' },
  { fqbn: 'esp8266:esp8266:nodemcuv2', label: 'NodeMCU (ESP8266)' },
] as const;

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
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

  const boardLabel = BOARDS.find((b) => b.fqbn === board)?.label || 'Board';
  const addToast = useUIStore((s: any) => s.addToast);
  const user = useUser();

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

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
      const paddingRight = window.innerWidth < 640 ? 8 : 16;
      let newWidth = window.innerWidth - e.clientX - paddingRight;
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
        loadProject(routeProjectId);
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
  useEffect(() => {
    if (isRunning && mode === 'block') {
      try {
        const workspace = (window as any).Blockly.getMainWorkspace();
        if (workspace) {
          const jsCode = workspaceToScratchCode(workspace);
          scratchEngine.loadCode(jsCode);
          scratchEngine.triggerGreenFlag();
        } else {
          console.error('No workspace found');
        }
      } catch (err) {
        console.error('Failed to run Scratch script:', err);
      }
    } else if (!isRunning) {
      scratchEngine.stop();
    }
  }, [isRunning, greenFlagCount, mode]);

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

  // ── Compile ────────────────────────────────────────────────────────────
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

    // Always simulate on Execute — firmware build only happens on Upload
    await compile(code, 'simulate');
  }, [mode, generatedCode, manualCode, compile, addToast]);

  // ── Blockly code change → also schedule auto-save ──────────────────────
  const handleBlocklyCodeChange = useCallback(
    (code: string) => {
      setGeneratedCode(code);
      // Note: Do NOT call setBlockXml here. Updating the store's blockXml on every change
      // triggers the loadXml effect which forcefully recreates blocks and interrupts dragging.
      // Auto-save and manual save fetch the XML on-demand via blocklyRef.current.getXml().
    },
    [setGeneratedCode],
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
    <div className="flex h-screen bg-background dark:bg-dark-bg font-sans overflow-hidden">
      <div className="flex w-full h-full p-2 sm:p-4">
        <div className="flex w-full h-full bg-white dark:bg-dark-surface rounded-2xl shadow-xl overflow-hidden relative border border-slate-100 dark:border-dark-border">
          {/* ── Top Control Bar ─────────────────────────────────────── */}
          <div className="absolute top-0 left-0 w-full h-16 border-b border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface flex justify-between items-center z-30 px-3 sm:px-4 gap-2">
            {/* Left: Back + project title + dirty indicator */}
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to="/dashboard"
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-dark-border text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                title="Go back to Dashboard"
              >
                <Home size={18} strokeWidth={2.5} />
              </Link>

              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleSave();
                    e.currentTarget.blur();
                  }
                }}
                className="font-sans font-semibold text-sm text-slate-800 dark:text-white bg-transparent border-none outline-none w-32 sm:w-44 truncate focus-visible:ring-2 focus-visible:ring-primary-500 rounded px-1"
                spellCheck={false}
              />
              {isDirty && (
                <div
                  className="w-2 h-2 rounded-full bg-warning-500 shrink-0"
                  title="Unsaved changes"
                />
              )}

              {/* Gamification surface */}
              {user && (
                <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-slate-100 dark:bg-dark-surface rounded-full border border-slate-200 dark:border-dark-border ml-2">
                  <div
                    className="flex items-center gap-1.5 text-warning-500"
                    title={`${user.streak} day streak!`}
                  >
                    <Zap size={14} fill="currentColor" />
                    <span className="font-sans font-bold text-xs">{user.streak}</span>
                  </div>
                  <div className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
                  <div
                    className="flex items-center gap-1.5 text-celebrate"
                    title={`Level ${user.level}`}
                  >
                    <Star size={14} fill="currentColor" />
                    <span className="font-sans font-bold text-xs">Lvl {user.level}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Centre: Mode toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-slate-100 dark:bg-dark-border rounded-xl p-1">
                <button
                  onClick={switchToBlock}
                  className={`flex items-center gap-1.5 h-9 px-3 rounded-lg font-sans font-semibold text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                    mode === 'block'
                      ? 'bg-white dark:bg-dark-surface text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid size={14} /> <span className="hidden sm:inline">Blocks</span>
                </button>
                <button
                  onClick={switchToCode}
                  className={`flex items-center gap-1.5 h-9 px-3 rounded-lg font-sans font-semibold text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                    mode === 'code'
                      ? 'bg-white dark:bg-dark-surface text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Code2 size={14} /> <span className="hidden sm:inline">C++</span>
                </button>
              </div>
              {mode === 'code' && (
                <button
                  onClick={handleConvertCodeToBlocks}
                  disabled={isConverting}
                  className="h-11 px-3 sm:px-4 rounded-xl font-sans font-semibold text-sm flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Translate C++ code back to Blockly blocks"
                >
                  {isConverting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LayoutGrid size={14} />
                  )}
                  <span className="hidden md:inline">
                    {isConverting ? 'Converting...' : 'Convert to Blocks'}
                  </span>
                  <span className="inline md:hidden">{isConverting ? '...' : 'Convert'}</span>
                </button>
              )}
            </div>

            {/* Right: Board + controls + primary actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {engineMode === 'hardware' && (
                <select
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  className="h-11 px-2 sm:px-3 font-sans text-sm font-medium bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-dark-border outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 hidden sm:block"
                >
                  {BOARDS.map((b) => (
                    <option key={b.fqbn} value={b.fqbn}>
                      {b.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Font size controls (code mode only) */}
              {mode === 'code' && (
                <div className="flex items-center bg-slate-100 dark:bg-dark-border rounded-lg overflow-hidden">
                  <button
                    onClick={decreaseFontSize}
                    className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                    title="Decrease font"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 h-11 flex items-center justify-center font-sans text-xs font-semibold text-slate-500">
                    {fontSize}
                  </span>
                  <button
                    onClick={increaseFontSize}
                    className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                    title="Increase font"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}

              {/* Undo/Redo (block mode only) */}
              {mode === 'block' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => blocklyRef.current?.undo()}
                    className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-border transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo size={16} />
                  </button>
                  <button
                    onClick={() => blocklyRef.current?.redo()}
                    className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-border transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo size={16} />
                  </button>
                </div>
              )}

              {/* Secondary actions group -> Moved to More Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-border transition-colors focus-visible:ring-2 focus-visible:ring-primary-500"
                  title="More options"
                >
                  <MoreVertical size={20} />
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl shadow-lg flex flex-col p-1 z-50">
                    <button
                      onClick={() => {
                        setShowTemplates(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
                    >
                      <FileCode size={16} className="shrink-0" />
                      <span>Templates</span>
                    </button>
                    <button
                      onClick={() => {
                        handleDownload();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
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
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left disabled:opacity-50"
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
                        <div className="h-px bg-slate-200 dark:bg-dark-border my-1" />
                        <button
                          onClick={() => {
                            handleDuplicate();
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
                        >
                          <Copy size={16} className="shrink-0" />
                          <span>Duplicate</span>
                        </button>
                        <button
                          onClick={() => {
                            handleTogglePublic();
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left"
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
                  <button
                    onClick={handleConnectHardware}
                    title={
                      hardwarePort
                        ? 'Disconnect hardware'
                        : `Connect your ${boardLabel} (Web Serial)`
                    }
                    className={`h-11 px-3 sm:px-4 rounded-xl font-sans font-semibold text-sm flex items-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none active:scale-[0.97] ${
                      hardwarePort
                        ? 'bg-warning-500 hover:bg-warning-600 text-slate-900'
                        : 'bg-accent-500 hover:bg-accent-400 text-slate-900'
                    }`}
                  >
                    <Usb size={16} />
                    <span className="hidden sm:inline">
                      {hardwarePort ? 'Connected' : 'Connect'}
                    </span>
                  </button>

                  {/* Upload firmware — visible only when board connected */}
                  {hardwarePort && (
                    <button
                      onClick={handleUploadToHardware}
                      disabled={isFlashing || isCompiling}
                      title={`Compile & upload to your ${boardLabel}`}
                      className="h-11 px-3 sm:px-4 rounded-xl font-sans font-semibold text-sm flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white transition-all focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none active:scale-[0.97] disabled:opacity-50"
                    >
                      {isFlashing ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      <span className="hidden sm:inline">
                        {isFlashing ? `${flashProgress}%` : 'Upload'}
                      </span>
                    </button>
                  )}

                  {/* Serial Monitor toggle — visible when board connected */}
                  {hardwarePort && (
                    <button
                      onClick={() => setShowSerialMonitor(!showSerialMonitor)}
                      title="Toggle Serial Monitor"
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none active:scale-[0.97] ${
                        showSerialMonitor
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-100 dark:bg-dark-border text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Terminal size={16} />
                    </button>
                  )}
                </>
              )}

              {/* Code Panel Toggle */}
              {engineMode === 'hardware' && (
                <button
                  onClick={() => {
                    setShowCodePanel(!showCodePanel);
                    if (showSimulator && showCodePanel) setShowSimulator(false);
                  }}
                  title={showCodePanel ? 'Hide Code Panel' : 'Show Code Panel'}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none active:scale-[0.97] hidden sm:flex ${
                    showCodePanel && !showSimulator
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                      : 'bg-slate-100 dark:bg-dark-border text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <PanelRight size={16} />
                </button>
              )}

              {/* Simulator Panel Toggle */}
              {engineMode === 'software' && (
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
                  title={showSimulator ? 'Hide Simulator' : 'Show Simulator'}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none active:scale-[0.97] hidden sm:flex ${
                    showSimulator
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-slate-100 dark:bg-dark-border text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Gamepad2 size={16} />
                </button>
              )}

              {/* ▶ Run — highest prominence, always rightmost */}
              {engineMode === 'hardware' && (
                <button
                  onClick={handleCompile}
                  disabled={isCompiling || isFlashing}
                  title="Compile & Run (Ctrl+Enter)"
                  className="h-11 px-4 sm:px-5 rounded-xl font-sans font-bold text-sm flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white shadow-md hover:shadow-lg transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:outline-none active:scale-[0.97] disabled:opacity-50"
                >
                  {isCompiling ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} fill="currentColor" />
                  )}
                  <span>{isCompiling ? 'Running...' : 'Run'}</span>
                </button>
              )}
            </div>

            {/* Flash progress bar */}
            {isFlashing && (
              <div className="absolute left-0 right-0 bottom-0 h-1 bg-slate-100 dark:bg-dark-border">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${flashProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* ── Main Area (below toolbar) ────────────────────────────────── */}
          <div className="flex w-full h-full pt-16">
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
                  className="w-full h-full"
                />
              </div>

              {/* Monaco editor */}
              <div
                className={`absolute inset-0 bg-[#1e1e1e] transition-opacity duration-150 ${mode === 'code' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
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
              <div
                className="w-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-col-resize transition-colors shrink-0 z-10"
                onMouseDown={() => {
                  isResizing.current = true;
                  document.body.style.cursor = 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
              />
            )}

            {/* ── Output / Compiler Terminal Pane ─────────────────────────── */}
            {showCodePanel && (
              <div
                style={{ width: terminalWidth }}
                className="border-l border-slate-800 bg-[#050505] flex flex-col shrink-0"
              >
                {/* Simulator Stage Panel */}
                {showSimulator ? (
                  <StagePanel />
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
                      />
                    ) : (
                      <>
                        {/* C++ preview header (block mode) */}
                        {mode === 'block' &&
                          engineMode === 'hardware' &&
                          !isCompiling &&
                          !compileResult &&
                          !isFlashing && (
                            <div className="border-b border-slate-800 bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 shrink-0">
                              <Code2 size={12} className="text-slate-500" />
                              <span className="font-sans text-xs text-slate-500">
                                Generated C++ Preview
                              </span>
                            </div>
                          )}

                        {/* Stdin input for programs that need cin/scanf */}
                        {mode === 'code' && !isFlashing && (
                          <div className="border-b border-slate-800 bg-[#0a0a0a] shrink-0">
                            <div className="px-3 py-1.5 flex items-center gap-2">
                              <span className="font-sans text-xs text-slate-500">
                                📥 Stdin input
                              </span>
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

                        {/* Flash progress overlay */}
                        {isFlashing && (
                          <div className="flex-1 flex flex-col items-center justify-center p-6">
                            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                              <Upload size={24} className="text-blue-400 animate-pulse" />
                            </div>
                            <p className="font-sans font-semibold text-sm text-blue-400 mb-3">
                              Uploading to your {boardLabel}...
                            </p>
                            <div className="w-full max-w-[200px] h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${flashProgress}%` }}
                              />
                            </div>
                            <p className="font-sans text-xs text-slate-500 text-center">
                              {flashMessage || 'Getting ready...'}
                            </p>
                          </div>
                        )}

                        {/* Console (has compile result or is compiling) OR code preview */}
                        {!isFlashing &&
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
            )}
          </div>
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

      {/* ── Unsaved Changes Blocker Overlay ──────────────────────────────── */}
      {blocker.state === 'blocked' && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => blocker.reset()}
        >
          <div
            className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 relative flex flex-col gap-6"
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
                    blocker.proceed();
                  } catch {
                    addToast({
                      type: 'error',
                      title: 'Save failed',
                      message: 'Could not save project. Navigation cancelled.',
                    });
                    blocker.reset();
                  }
                }}
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-sans font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                Save & Exit
              </button>
              <button
                type="button"
                onClick={() => {
                  blocker.proceed();
                }}
                className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-sans font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  blocker.reset();
                }}
                className="w-full h-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-sans font-semibold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 active:scale-[0.98]"
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
