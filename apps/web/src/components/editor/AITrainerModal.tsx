/**
 * AITrainerModal.tsx
 *
 * Full-screen modal for training an in-house image classification model.
 * Students can add classes, capture webcam samples, train, and test —
 * all without leaving TinkerGyan.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Camera,
  Trash2,
  Plus,
  Brain,
  Loader2,
  Video,
  VideoOff,
  Type,
  Image as ImageIcon,
  Upload,
  Settings2,
  ChevronDown,
  RotateCcw,
  Download,
  FolderOpen,
  Code2,
  Copy,
  Check,
  PackageOpen,
  Mic,
  PersonStanding,
  Table2,
} from 'lucide-react';
import { aiEngine, type TrainingConfig, DEFAULT_TRAINING_CONFIG } from '../../lib/ai-engine';
import { useAIStore } from '../../stores/ai.store';
import { TextTrainerModal } from './TextTrainerModal';
import { AudioTrainerTab } from './AudioTrainerTab';
import { PoseTrainerTab } from './PoseTrainerTab';
import { TabularTrainerTab } from './TabularTrainerTab';

interface AITrainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AITrainerModal({ isOpen, onClose }: AITrainerModalProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'text' | 'audio' | 'pose' | 'numbers'>(
    'image',
  );
  const [classes, setClasses] = useState<string[]>(() => {
    const labels = useAIStore.getState().classLabels.filter((l) => !l.startsWith('text:'));
    return labels.length > 0 ? labels : ['Class 1', 'Class 2'];
  });
  const [newClassName, setNewClassName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isCapturing, setIsCapturing] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phase 1: Hyperparameter tuning
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>({
    ...DEFAULT_TRAINING_CONFIG,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Phase 1: Upload progress per class
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});
  // Phase 2: Export / import
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showExportCode, setShowExportCode] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const importZipRef = useRef<HTMLInputElement | null>(null);

  const {
    isModelLoaded,
    isWebcamActive,
    exampleCounts,
    currentPrediction,
    confidences,
    updateTrainingState,
    setModelLoaded,
    setWebcamActive,
    setPredicting,
    updatePrediction,
    clearPrediction,
  } = useAIStore();

  // Sync class labels with store
  const syncTrainingState = useCallback(() => {
    const counts = aiEngine.getExampleCounts();
    const labels = aiEngine.getClassLabels();
    // Merge with UI classes (some may have 0 samples)
    const allLabels = [...new Set([...classes, ...labels])];

    // Preserve text labels
    const textLabels = useAIStore.getState().classLabels.filter((l) => l.startsWith('text:'));
    const textCounts: Record<string, number> = {};
    for (const l of textLabels) {
      textCounts[l] = useAIStore.getState().exampleCounts[l] ?? 0;
    }

    updateTrainingState([...allLabels, ...textLabels], { ...counts, ...textCounts });
  }, [classes, updateTrainingState]);

  // Initialize AI engine when modal opens
  useEffect(() => {
    if (!isOpen || activeTab !== 'image') return;

    const initEngine = async () => {
      if (aiEngine.isInitialised) {
        setModelLoaded(true);
        return;
      }

      setIsLoading(true);
      setLoadingMessage('Loading AI model (first time only)...');
      setError(null);

      try {
        await aiEngine.init();
        setModelLoaded(true);
        setLoadingMessage('');
      } catch (err) {
        setError(`Failed to load AI model: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    };

    void initEngine();
  }, [isOpen, activeTab, setModelLoaded]);

  // Cleanup image tab resources when switching to another tab
  useEffect(() => {
    if (activeTab !== 'image') {
      if (isTesting) {
        aiEngine.stopPredicting();
        setPredicting(false);
        clearPrediction();
        setIsTesting(false);
      }
      if (isWebcamActive) {
        aiEngine.stopWebcam();
        setWebcamActive(false);
      }
    }
  }, [activeTab, isTesting, isWebcamActive, setPredicting, clearPrediction, setWebcamActive]);

  // Start webcam
  const handleStartWebcam = useCallback(async () => {
    if (!videoRef.current || !isModelLoaded) return;

    try {
      setError(null);
      await aiEngine.startWebcam(videoRef.current);
      setWebcamActive(true);
    } catch (err) {
      setError(
        `Camera error: ${err instanceof Error ? err.message : String(err)}. Please allow camera access.`,
      );
    }
  }, [isModelLoaded, setWebcamActive]);

  // Stop webcam
  const handleStopWebcam = useCallback(() => {
    aiEngine.stopWebcam();
    aiEngine.stopPredicting();
    setWebcamActive(false);
    setPredicting(false);
    clearPrediction();
    setIsTesting(false);
  }, [setWebcamActive, setPredicting, clearPrediction]);

  // Start capturing samples for a class (mousedown / touchstart)
  const handleCaptureStart = useCallback(
    (className: string) => {
      if (!isWebcamActive || !videoRef.current) return;
      setIsCapturing(className);

      // Capture a frame every 200ms (5 FPS) while button is held
      const capture = () => {
        if (!videoRef.current) return;
        try {
          aiEngine.addExample(videoRef.current, className);
          syncTrainingState();
        } catch {
          // Ignore capture errors — model may still be loading
        }
      };

      void capture();
      captureIntervalRef.current = setInterval(() => void capture(), 200);
    },
    [isWebcamActive, syncTrainingState],
  );

  // Stop capturing (mouseup / touchend)
  const handleCaptureStop = useCallback(() => {
    setIsCapturing(null);
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  // Add a new class
  const handleAddClass = useCallback(() => {
    const name = newClassName.trim() || `Class ${classes.length + 1}`;
    if (classes.includes(name)) return;
    setClasses((prev) => [...prev, name]);
    setNewClassName('');
  }, [newClassName, classes]);

  // Remove a class
  const handleRemoveClass = useCallback(
    (className: string) => {
      aiEngine.clearClass(className);
      setClasses((prev) => prev.filter((c) => c !== className));
      syncTrainingState();
    },
    [syncTrainingState],
  );

  // Clear all samples for a class
  const handleClearClass = useCallback(
    (className: string) => {
      aiEngine.clearClass(className);
      syncTrainingState();
    },
    [syncTrainingState],
  );

  // Rename a class
  const handleRenameClass = useCallback(
    (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName || classes.includes(trimmed)) return;

      aiEngine.renameClass(oldName, trimmed);
      setClasses((prev) => prev.map((c) => (c === oldName ? trimmed : c)));
      syncTrainingState();
    },
    [classes, syncTrainingState],
  );

  // Phase 1: Bulk image upload for a class
  const handleImageUpload = useCallback(
    async (className: string, files: FileList) => {
      if (!files.length) return;
      const total = files.length;
      setUploadProgress((p) => ({ ...p, [className]: `0 / ${total}` }));

      for (let i = 0; i < total; i++) {
        const file = files[i]!;
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              aiEngine.addExampleFromImage(img, className);
            } catch {
              // Ignore individual failures; keep processing the batch.
            }
            URL.revokeObjectURL(img.src);
            setUploadProgress((p) => ({ ...p, [className]: `${i + 1} / ${total}` }));
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(img.src);
            resolve();
          };
          img.src = URL.createObjectURL(file);
        });
      }

      syncTrainingState();
      setUploadProgress((p) => {
        const n = { ...p };
        delete n[className];
        return n;
      });
    },
    [syncTrainingState],
  );

  // Toggle live testing
  const handleToggleTest = useCallback(() => {
    if (!videoRef.current || !isWebcamActive) return;

    if (isTesting) {
      aiEngine.stopPredicting();
      setPredicting(false);
      clearPrediction();
      setIsTesting(false);
    } else {
      // Pass active TrainingConfig so k and threshold take effect immediately.
      aiEngine.startPredicting(
        videoRef.current,
        (result) => {
          updatePrediction(result.label, result.allConfidences);
        },
        true,
        false,
        trainingConfig,
      );
      setPredicting(true);
      setIsTesting(true);
    }
  }, [isWebcamActive, isTesting, trainingConfig, setPredicting, clearPrediction, updatePrediction]);

  // Sync trainingConfig changes live while testing
  useEffect(() => {
    if (isTesting && videoRef.current) {
      aiEngine.startPredicting(
        videoRef.current,
        (result) => {
          updatePrediction(result.label, result.allConfidences);
        },
        true,
        false,
        trainingConfig,
      );
    }
  }, [trainingConfig, isTesting, updatePrediction]);

  // Reset everything
  const handleResetAll = useCallback(() => {
    aiEngine.clearAll();
    setClasses(['Class 1', 'Class 2']);
    clearPrediction();
    syncTrainingState();
  }, [clearPrediction, syncTrainingState]);

  // Cleanup on close
  const handleClose = useCallback(() => {
    handleCaptureStop();
    handleStopWebcam();
    onClose();
  }, [handleCaptureStop, handleStopWebcam, onClose]);

  // ── Phase 2: Export Training State (.zip) ────────────────────────────────
  const handleExportZip = useCallback(async () => {
    setIsExporting(true);
    try {
      const dataset = await aiEngine.serializeDataset();
      const meta = JSON.stringify({ classes, exportedAt: new Date().toISOString(), version: 1 });
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      zip.file('dataset.json', dataset ?? '{}');
      zip.file('meta.json', meta);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tinkergyan-ai-project.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  }, [classes]);

  // ── Phase 2: Import Training State (.zip) ────────────────────────────────
  const handleImportZip = useCallback(
    async (file: File) => {
      setIsImporting(true);
      try {
        const { default: JSZip } = await import('jszip');
        const zip = await JSZip.loadAsync(file);

        const datasetFile = zip.file('dataset.json');
        const metaFile = zip.file('meta.json');
        if (!datasetFile || !metaFile)
          throw new Error('Invalid project zip — missing dataset.json or meta.json.');

        const datasetStr = await datasetFile.async('string');
        const metaStr = await metaFile.async('string');
        const meta = JSON.parse(metaStr) as { classes: string[] };

        if (!aiEngine.isInitialised) {
          setIsLoading(true);
          setLoadingMessage('Loading AI engine...');
          await aiEngine.init();
          setModelLoaded(true);
          setIsLoading(false);
          setLoadingMessage('');
        }

        aiEngine.deserializeDataset(datasetStr);
        setClasses(meta.classes ?? ['Class 1', 'Class 2']);
        syncTrainingState();
      } catch (err) {
        setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsImporting(false);
      }
    },
    [syncTrainingState, setModelLoaded],
  );

  // ── Phase 2: TFJS / Model Export ─────────────────────────────────────────
  const handleExportModel = useCallback(async () => {
    setIsExporting(true);
    try {
      const dataset = await aiEngine.serializeDataset();
      if (!dataset) {
        setError('No training data to export.');
        return;
      }
      const blob = new Blob([dataset], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tinkergyan-model-dataset.json';
      a.click();
      URL.revokeObjectURL(url);
      setShowExportCode(true);
    } catch (err) {
      setError(`Model export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  if (!isOpen) return null;

  const totalSamples = classes.map((c) => exampleCounts[c] ?? 0).reduce((a, b) => a + b, 0);
  const trainedClassCount = classes.map((c) => exampleCounts[c] ?? 0).filter((c) => c > 0).length;
  const canTest = trainedClassCount >= 2;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[95vw] max-w-[900px] max-h-[90vh] h-[90vh] bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#FF6F61]/20 to-transparent">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF6F61]/20 flex items-center justify-center">
                <Brain size={22} className="text-[#FF6F61]" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">AI Model Studio</h2>
                <p className="text-white/50 text-xs">Train your own models — no coding needed</p>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex bg-black/20 p-1 rounded-xl flex-wrap gap-1">
              <button
                onClick={() => setActiveTab('image')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'image' ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/80'}`}
              >
                <ImageIcon size={14} /> Image
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'text' ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/80'}`}
              >
                <Type size={14} /> Text
              </button>
              <button
                onClick={() => setActiveTab('audio')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'audio' ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/80'}`}
              >
                <Mic size={14} /> Audio
              </button>
              <button
                onClick={() => setActiveTab('pose')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'pose' ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/80'}`}
              >
                <PersonStanding size={14} /> Pose
              </button>
              <button
                onClick={() => setActiveTab('numbers')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'numbers' ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/80'}`}
              >
                <Table2 size={14} /> Numbers
              </button>
            </div>
          </div>
          {/* Phase 2: Export / Import / Model-Export buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleExportZip()}
              disabled={isExporting || totalSamples === 0}
              title="Export training project as .zip"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              Export
            </button>
            <button
              onClick={() => importZipRef.current?.click()}
              disabled={isImporting}
              title="Import a saved .zip project"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FolderOpen size={13} />
              )}
              Import
            </button>
            <input
              ref={importZipRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  void handleImportZip(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={() => void handleExportModel()}
              disabled={isExporting || totalSamples === 0}
              title="Export model dataset as JSON + get usage code"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6F61]/10 text-[#FF6F61]/70 hover:text-[#FF6F61] hover:bg-[#FF6F61]/20 transition-colors text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Code2 size={13} />
              Export Model
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {activeTab === 'text' ? (
          <div className="flex-1 overflow-hidden">
            <TextTrainerModal />
          </div>
        ) : activeTab === 'audio' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <AudioTrainerTab />
          </div>
        ) : activeTab === 'pose' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <PoseTrainerTab />
          </div>
        ) : activeTab === 'numbers' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <TabularTrainerTab />
          </div>
        ) : (
          <>
            {/* Loading State */}
            {isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12">
                <Loader2 size={40} className="text-[#FF6F61] animate-spin" />
                <p className="text-white/70 text-sm">{loadingMessage}</p>
                <p className="text-white/40 text-xs">
                  This only happens once — the AI model is cached after first load.
                </p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="mx-6 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Main Content */}
            {isModelLoaded && !isLoading && (
              <div className="flex-1 flex overflow-hidden">
                {/* Left: Webcam Preview */}
                <div className="flex-1 flex flex-col p-6 gap-4 border-r border-white/10">
                  {/* Webcam Feed */}
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain bg-black"
                      style={{ transform: 'scaleX(-1)' }}
                    />

                    {!isWebcamActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1a1a2e]">
                        <Camera size={40} className="text-white/30" />
                        <button
                          onClick={() => void handleStartWebcam()}
                          className="px-4 py-2 rounded-lg bg-[#FF6F61] text-white font-bold text-sm hover:bg-[#FF6F61]/90 transition-colors flex items-center gap-2"
                        >
                          <Video size={16} />
                          Start Camera
                        </button>
                      </div>
                    )}

                    {isWebcamActive && (
                      <button
                        onClick={handleStopWebcam}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
                        title="Stop Camera"
                      >
                        <VideoOff size={14} />
                      </button>
                    )}

                    {isCapturing && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                        ● Recording: {isCapturing}
                      </div>
                    )}
                  </div>

                  {/* Live Predictions */}
                  {isTesting && currentPrediction && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
                          Live Prediction
                        </span>
                      </div>
                      {Object.entries(confidences)
                        .filter(([label]) => !label.startsWith('text:'))
                        .sort(([, a], [, b]) => b - a)
                        .map(([label, conf]) => (
                          <div key={label} className="flex items-center gap-3">
                            <span className="text-white/80 text-sm font-medium w-24 truncate">
                              {label}
                            </span>
                            <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-200"
                                style={{
                                  width: `${conf}%`,
                                  backgroundColor:
                                    label === currentPrediction
                                      ? '#FF6F61'
                                      : 'rgba(255,255,255,0.2)',
                                }}
                              />
                            </div>
                            <span className="text-white/60 text-xs font-mono w-10 text-right">
                              {conf}%
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Test Button */}
                  {isWebcamActive && (
                    <button
                      onClick={handleToggleTest}
                      disabled={!canTest}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        isTesting
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                          : canTest
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                      }`}
                    >
                      <Brain size={16} />
                      {isTesting
                        ? 'Stop Testing'
                        : canTest
                          ? 'Start Live Test'
                          : 'Train at least 2 classes first'}
                    </button>
                  )}

                  {/* ── Advanced / Hyperparameter Panel ── */}
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <button
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                      <span className="flex items-center gap-2">
                        <Settings2 size={13} /> Advanced Settings
                      </span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showAdvanced && (
                      <div className="px-4 pb-4 pt-1 space-y-4 bg-white/[0.02]">
                        {/* k Neighbours */}
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <label className="text-white/60 text-xs">
                              k Neighbours{' '}
                              <span className="text-white/30">(how many matches to vote)</span>
                            </label>
                            <span className="text-[#FF6F61] text-xs font-mono font-bold">
                              {trainingConfig.k}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={trainingConfig.k}
                            onChange={(e) =>
                              setTrainingConfig((c) => ({ ...c, k: Number(e.target.value) }))
                            }
                            className="w-full h-1.5 rounded-full accent-[#FF6F61] cursor-pointer"
                          />
                          <div className="flex justify-between text-white/20 text-[10px] mt-0.5">
                            <span>1 (precise)</span>
                            <span>10 (smooth)</span>
                          </div>
                        </div>

                        {/* Confidence Threshold */}
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <label className="text-white/60 text-xs">
                              Confidence Threshold{' '}
                              <span className="text-white/30">(min % to trigger)</span>
                            </label>
                            <span className="text-[#FF6F61] text-xs font-mono font-bold">
                              {Math.round(trainingConfig.predictionThreshold * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.5}
                            max={0.99}
                            step={0.01}
                            value={trainingConfig.predictionThreshold}
                            onChange={(e) =>
                              setTrainingConfig((c) => ({
                                ...c,
                                predictionThreshold: Number(e.target.value),
                              }))
                            }
                            className="w-full h-1.5 rounded-full accent-[#FF6F61] cursor-pointer"
                          />
                          <div className="flex justify-between text-white/20 text-[10px] mt-0.5">
                            <span>50% (sensitive)</span>
                            <span>99% (strict)</span>
                          </div>
                        </div>

                        {/* Reset button */}
                        <button
                          onClick={() => setTrainingConfig({ ...DEFAULT_TRAINING_CONFIG })}
                          className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors"
                        >
                          <RotateCcw size={11} /> Reset to defaults
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Classes */}
                <div className="w-[320px] flex flex-col p-6 gap-3 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
                      Training Classes
                    </span>
                    <span className="text-white/40 text-xs">{totalSamples} total samples</span>
                  </div>

                  {/* Class Cards */}
                  {classes.map((className) => {
                    const count = exampleCounts[className] ?? 0;
                    return (
                      <div
                        key={className}
                        className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <input
                            defaultValue={className}
                            onBlur={(e) => handleRenameClass(className, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                            className="text-white font-bold text-sm bg-transparent outline-none flex-1 min-w-0 mr-2 border-b border-transparent focus:border-[#FF6F61]/50 hover:border-white/20 transition-colors"
                            title="Click to rename"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-white/40 text-xs font-mono">{count} samples</span>
                            <button
                              onClick={() => handleClearClass(className)}
                              className="p-1 rounded text-white/30 hover:text-amber-400 transition-colors"
                              title="Clear samples"
                            >
                              <Trash2 size={12} />
                            </button>
                            {classes.length > 2 && (
                              <button
                                onClick={() => handleRemoveClass(className)}
                                className="p-1 rounded text-white/30 hover:text-red-400 transition-colors"
                                title="Remove class"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Webcam capture button */}
                        <button
                          onMouseDown={() => handleCaptureStart(className)}
                          onMouseUp={handleCaptureStop}
                          onMouseLeave={handleCaptureStop}
                          onTouchStart={() => handleCaptureStart(className)}
                          onTouchEnd={handleCaptureStop}
                          disabled={!isWebcamActive}
                          className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            isCapturing === className
                              ? 'bg-red-500 text-white scale-95'
                              : isWebcamActive
                                ? 'bg-[#FF6F61]/20 text-[#FF6F61] border border-[#FF6F61]/30 hover:bg-[#FF6F61]/30 active:scale-95'
                                : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                          }`}
                        >
                          <Camera size={14} />
                          {isCapturing === className ? 'Recording...' : 'Hold to Record'}
                        </button>

                        {/* Phase 1: File upload zone */}
                        <div
                          className="relative border border-dashed border-white/20 rounded-lg py-2 px-3 flex items-center justify-center gap-2 hover:border-[#FF6F61]/50 hover:bg-white/5 transition-colors cursor-pointer group"
                          onClick={() => fileInputRefs.current[className]?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const files = e.dataTransfer.files;
                            if (files.length) void handleImageUpload(className, files);
                          }}
                        >
                          <Upload
                            size={12}
                            className="text-white/30 group-hover:text-[#FF6F61]/70 transition-colors shrink-0"
                          />
                          <span className="text-white/30 group-hover:text-white/50 text-[11px] transition-colors">
                            {uploadProgress[className]
                              ? `Uploading ${uploadProgress[className]}…`
                              : 'Upload images / drag & drop'}
                          </span>
                          <input
                            ref={(el) => {
                              fileInputRefs.current[className] = el;
                            }}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.length)
                                void handleImageUpload(className, e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Class */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                      placeholder={`Class ${classes.length + 1}`}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 outline-none focus:border-[#FF6F61]/50"
                    />
                    <button
                      onClick={handleAddClass}
                      className="px-3 py-2 rounded-lg bg-[#FF6F61]/20 text-[#FF6F61] hover:bg-[#FF6F61]/30 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="flex-1" />

                  {/* Reset All */}
                  <button
                    onClick={handleResetAll}
                    className="w-full py-2 rounded-lg bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-colors border border-white/5"
                  >
                    Reset All Training Data
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Phase 2: TFJS code-snippet modal */}
      {showExportCode &&
        (() => {
          const snippet = `<!-- Load TF.js + MobileNet + KNN in any webpage -->
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet"></script>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/knn-classifier"></script>
<script>
async function loadMyModel() {
  const net = await mobilenet.load({ version: 2, alpha: 0.5 });
  const classifier = knnClassifier.create();
  // Replace with URL or fetch path to your tinkergyan-model-dataset.json
  const res = await fetch('tinkergyan-model-dataset.json');
  const { classes } = await res.json();
  for (const [label, vectors] of Object.entries(classes)) {
    classifier.setClassifierDataset({
      ...classifier.getClassifierDataset(),
      [label]: tf.tensor2d(vectors)
    });
  }
  return { net, classifier };
}
</script>`;
          return (
            <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-[#12122a] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <PackageOpen size={18} className="text-[#FF6F61]" />
                    <span className="text-white font-bold text-sm">
                      Model exported! Use it anywhere
                    </span>
                  </div>
                  <button
                    onClick={() => setShowExportCode(false)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-white/60 text-xs leading-relaxed">
                    Your model dataset (
                    <code className="text-[#FF6F61]">tinkergyan-model-dataset.json</code>) has been
                    downloaded. Paste this snippet into any HTML page to load and use it:
                  </p>
                  <div className="relative">
                    <pre className="bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-emerald-300 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {snippet}
                    </pre>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(snippet);
                        setSnippetCopied(true);
                        setTimeout(() => setSnippetCopied(false), 2000);
                      }}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors text-[10px] font-bold"
                    >
                      {snippetCopied ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <Copy size={11} />
                      )}
                      {snippetCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-white/30 text-[10px]">
                    Place both files in the same folder and open the HTML file in a browser to run
                    predictions.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
    </div>,
    document.body,
  );
}
