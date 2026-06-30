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
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Terminal,
  Save,
  Play,
  ChevronLeft,
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
} from 'lucide-react';

import { CompileConsole } from '../components/editor/CompileConsole';
import { SerialMonitor } from '../components/editor/SerialMonitor';
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

// ─────────────────────────────────────────────────────────────────────────────

export default function Editor() {
  const { id: routeProjectId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [showTemplates, setShowTemplates] = useState(false);
  const [hardwarePort, setHardwarePort] = useState<any>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashMessage, setFlashMessage] = useState('');
  const [showSerialMonitor, setShowSerialMonitor] = useState(false);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [terminalWidth, setTerminalWidth] = useState(() => (window.innerWidth < 1024 ? 340 : 420));
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

  const addToast = useUIStore((s: any) => s.addToast);
  const user = useUser();

  // ── Resizer Effect ───────────────────────────────────────────────────
  useEffect(() => {
    let animationFrameId: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const paddingRight = window.innerWidth < 640 ? 8 : 16;
      let newWidth = window.innerWidth - e.clientX - paddingRight;
      newWidth = Math.max(200, Math.min(newWidth, window.innerWidth - 300));
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

  // ── Sync URL with newly created project ──────────────────────────────
  useEffect(() => {
    if (projectId && routeProjectId !== projectId) {
      navigate(`/editor/${projectId}`, { replace: true });
    }
  }, [projectId, routeProjectId, navigate]);

  // ── Load project on mount if URL has an ID ─────────────────────────────
  useEffect(() => {
    if (routeProjectId) {
      if (projectId !== routeProjectId) {
        loadProject(routeProjectId);
      }
    } else {
      resetEditor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProjectId]);

  // ── Reset editor store when leaving the Editor page ───────────────────
  useEffect(() => {
    return () => {
      resetEditor();
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
      navigate(`/editor/${newId}`, { replace: true });
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
  }, [duplicateProject, navigate, addToast, isDirty, handleSave]);

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
        message:
          'Connecting to your Arduino needs Chrome or Edge. You can still build and save your project here!',
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
        addToast({ type: 'info', title: 'Disconnected', message: 'Arduino disconnected.' });
        return;
      }

      const port = await (navigator as any).serial.requestPort();
      // Don't open yet — let Serial Monitor or Flasher open with the right baud
      setHardwarePort(port);

      const info = port.getInfo();
      addToast({
        type: 'success',
        title: 'Arduino connected! 🎉',
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
        message: 'Connect your Arduino first.',
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
        message: 'Compiling for your Arduino — hang tight!',
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
        title: 'Done! Uploaded to your Arduino 🚀',
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
  }, [hardwarePort, board, mode, generatedCode, manualCode, addToast]);

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
    <div className="flex h-screen bg-background dark:bg-dark-bg font-sans overflow-hidden bg-canvas-grid">
      <div className="flex w-full h-full p-2 sm:p-4">
        <div className="flex w-full h-full bg-white dark:bg-dark-surface rounded-2xl shadow-xl overflow-hidden relative border border-slate-100 dark:border-dark-border">
          {/* ── Top Control Bar ─────────────────────────────────────── */}
          <div className="absolute top-0 left-0 w-full h-16 border-b border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface flex justify-between items-center z-10 px-3 sm:px-4 gap-2">
            {/* Left: Back + project title + dirty indicator */}
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to="/dashboard"
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-dark-border text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </Link>

              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
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
            <div className="flex items-center bg-slate-100 dark:bg-dark-border rounded-xl p-1 shrink-0">
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

            {/* Right: Board + controls + primary actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

              {/* Secondary actions group */}
              <div className="hidden sm:flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(true)}
                  title="Choose a starter template"
                >
                  <FileCode size={14} />
                  <span className="hidden md:inline">Templates</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  title="Download as .ino (Ctrl+Shift+D)"
                >
                  <Download size={14} />
                  <span className="hidden md:inline">Download .ino</span>
                </Button>

                {projectId && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDuplicate}
                      title="Duplicate this project"
                    >
                      <Copy size={14} />
                      <span className="hidden md:inline">Copy</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className={
                        isPublic
                          ? 'text-accent-600 border-accent-300 bg-accent-50 dark:bg-accent-900/20'
                          : ''
                      }
                      onClick={handleTogglePublic}
                      title={isPublic ? 'Make Private' : 'Share to Gallery'}
                    >
                      <Globe size={14} />
                      <span className="hidden md:inline">{isPublic ? 'Public' : 'Share'}</span>
                    </Button>
                  </>
                )}
              </div>

              {/* Save button — medium prominence */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                title="Save project (Ctrl+S)"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
              </Button>

              {/* Connect Board — second-highest prominence */}
              <button
                onClick={handleConnectHardware}
                title={hardwarePort ? 'Disconnect hardware' : 'Connect your Arduino (Web Serial)'}
                className={`h-11 px-3 sm:px-4 rounded-xl font-sans font-semibold text-sm flex items-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none active:scale-[0.97] ${
                  hardwarePort
                    ? 'bg-warning-500 hover:bg-warning-600 text-slate-900'
                    : 'bg-accent-500 hover:bg-accent-400 text-slate-900'
                }`}
              >
                <Usb size={16} />
                <span className="hidden sm:inline">{hardwarePort ? 'Connected' : 'Connect'}</span>
              </button>

              {/* Upload firmware — visible only when board connected */}
              {hardwarePort && (
                <button
                  onClick={handleUploadToHardware}
                  disabled={isFlashing || isCompiling}
                  title="Compile & upload to your Arduino"
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

              {/* Code Panel Toggle */}
              <button
                onClick={() => setShowCodePanel(!showCodePanel)}
                title={showCodePanel ? 'Hide Code Panel' : 'Show Code Panel'}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none active:scale-[0.97] hidden sm:flex ${
                  showCodePanel
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                    : 'bg-slate-100 dark:bg-dark-border text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <PanelRight size={16} />
              </button>

              {/* ▶ Run — highest prominence, always rightmost */}
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
                className="hw-border-l bg-[#050505] flex flex-col shrink-0"
              >
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
                    {mode === 'block' && !isCompiling && !compileResult && !isFlashing && (
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
                          <span className="font-sans text-xs text-slate-500">📥 Stdin input</span>
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
                          Uploading to your Arduino...
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
                        <CompileConsole isCompiling={isCompiling} compileResult={compileResult} />
                      ) : (
                        <div className="flex-1 overflow-y-auto p-4">
                          {mode === 'block' &&
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Template Picker Overlay ─────────────────────────────────────── */}
      {showTemplates && (
        <TemplatePicker onSelect={loadTemplate} onClose={() => setShowTemplates(false)} />
      )}
    </div>
  );
}
