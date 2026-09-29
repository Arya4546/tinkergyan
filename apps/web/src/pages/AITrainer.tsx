/**
 * AITrainer.tsx
 *
 * Full-page "Train AI" studio — the Teachable-Machine-style workspace for
 * training an in-house image classifier (plus Text / Audio / Pose / Numbers
 * tabs). Previously this lived in a fixed-overlay modal (AITrainerModal);
 * it now has its own route so it behaves like a real page (own URL, back
 * button, no backdrop) instead of a dialog stacked on top of the editor.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
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
  Copy,
  Check,
  PackageOpen,
  Mic,
  PersonStanding,
  Table2,
  Info,
  Sparkles,
  Save,
  AlertTriangle,
  Layers,
  Eye,
  Circle,
  Images,
  SwitchCamera,
  ImagePlus,
} from 'lucide-react';
import { aiEngine, type TrainingConfig, DEFAULT_TRAINING_CONFIG } from '../lib/ai-engine';
import { useAIStore } from '../stores/ai.store';
import { useEditorStore } from '../stores/editor.store';
import { TextTrainerModal } from '../components/editor/TextTrainerModal';
import { AudioTrainerTab } from '../components/editor/AudioTrainerTab';
import { PoseTrainerTab } from '../components/editor/PoseTrainerTab';
import { TabularTrainerTab } from '../components/editor/TabularTrainerTab';

/** Draws the current frame of a video/image into a small square JPEG thumbnail. */
function captureThumbnail(source: HTMLVideoElement | HTMLImageElement, size = 72): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!sw || !sh) return '';
  const side = Math.min(sw, sh);
  const sx = (sw - side) / 2;
  const sy = (sh - side) / 2;
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.7);
}

type TrainerTab = 'image' | 'text' | 'audio' | 'pose' | 'numbers';

export default function AITrainer() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const backEngine = searchParams.get('engine') || 'software';

  const goToEditorNow = useCallback(() => {
    navigate(
      projectId ? `/editor/${projectId}?engine=${backEngine}` : `/editor?engine=${backEngine}`,
    );
  }, [navigate, projectId, backEngine]);

  const [activeTab, setActiveTab] = useState<TrainerTab>('image');
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

  // Explicit "Train Model" step (Teachable-Machine parity). Our classifier is
  // a live KNN — every recorded sample is already usable the instant it's
  // captured — but TM's UX gates Preview behind a discrete Train action, and
  // that gate is genuinely useful here too: it stops a student from judging
  // "Preview" on a half-recorded class, and it forces a fresh warm-up
  // inference so the first live prediction isn't the one paying WebGL's
  // kernel-compile cost.
  const [isTrained, setIsTrained] = useState(false);
  const [isTrainingModel, setIsTrainingModel] = useState(false);
  const [showUnderTheHood, setShowUnderTheHood] = useState(false);

  // Full thumbnail history per class (session-only, never uploaded) — kept
  // uncapped and in the exact same order samples were added to the KNN
  // classifier, so a thumbnail's array index always matches its row in the
  // classifier's dataset. That's what makes per-sample delete safe.
  const [sampleThumbnails, setSampleThumbnails] = useState<Record<string, string[]>>({});
  // Which class's full sample gallery is currently open in the modal.
  const [galleryClass, setGalleryClass] = useState<string | null>(null);

  // Camera selection — only shown once we know there's more than one.
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // "Test with a photo" — a one-shot classification in the Preview panel,
  // independent of the continuous live-webcam test loop.
  const [isTestingFile, setIsTestingFile] = useState(false);
  const [showPreviewInput, setShowPreviewInput] = useState(true);
  const [showPreviewOutput, setShowPreviewOutput] = useState(true);

  // Save-before-leaving guard. Recorded samples live only in the in-memory
  // KNN classifier until the project is explicitly saved (from here or from
  // the Editor) — so if a student records a class and then navigates away
  // or closes the tab, that work is gone unless we catch it first.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const goBackToEditor = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowLeaveConfirm(true);
    } else {
      goToEditorNow();
    }
  }, [hasUnsavedChanges, goToEditorNow]);

  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>({
    ...DEFAULT_TRAINING_CONFIG,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showExportCode, setShowExportCode] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);

  // The processing video (fed to MobileNet for both capture and inference).
  const videoRef = useRef<HTMLVideoElement>(null);
  // A second <video> in the Preview panel, sharing the same MediaStream —
  // this is what makes recording and previewing feel like two independent
  // camera views, the way Teachable Machine presents them.
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const importZipRef = useRef<HTMLInputElement | null>(null);
  const testFileRef = useRef<HTMLInputElement | null>(null);

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

  const syncTrainingState = useCallback(() => {
    const counts = aiEngine.getExampleCounts();
    const labels = aiEngine.getClassLabels();
    const allLabels = [...new Set([...classes, ...labels])];

    const textLabels = useAIStore.getState().classLabels.filter((l) => l.startsWith('text:'));
    const textCounts: Record<string, number> = {};
    for (const l of textLabels) {
      textCounts[l] = useAIStore.getState().exampleCounts[l] ?? 0;
    }

    updateTrainingState([...allLabels, ...textLabels], { ...counts, ...textCounts });
  }, [classes, updateTrainingState]);

  // Any data-mutating action invalidates the current "trained" state, same
  // as Teachable Machine prompting "Train again" once samples change — and
  // marks the page dirty so leaving prompts a save.
  const invalidateTraining = useCallback(() => {
    setIsTrained(false);
    setHasUnsavedChanges(true);
    if (isTesting) {
      aiEngine.stopPredicting();
      setPredicting(false);
      clearPrediction();
      setIsTesting(false);
    }
  }, [isTesting, setPredicting, clearPrediction]);

  useEffect(() => {
    if (activeTab !== 'image') return;

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
  }, [activeTab, setModelLoaded]);

  // Cleanup image-tab resources when switching to another tab.
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

  // Stop the camera and any running capture/test loop when leaving the page
  // entirely — mirrors the old modal's onClose discipline, so ScratchEngine's
  // own hidden <video> can grab the webcam cleanly next time a program runs.
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      aiEngine.stopPredicting();
      aiEngine.stopWebcam();
      setWebcamActive(false);
      setPredicting(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the shared MediaStream into the Preview panel's own <video>.
  useEffect(() => {
    if (isWebcamActive && previewVideoRef.current && aiEngine.stream) {
      previewVideoRef.current.srcObject = aiEngine.stream;
      void previewVideoRef.current.play().catch(() => {});
    }
  }, [isWebcamActive]);

  // Close the sample gallery if its class was removed/reset elsewhere.
  useEffect(() => {
    if (galleryClass && !classes.includes(galleryClass)) {
      setGalleryClass(null);
    }
  }, [classes, galleryClass]);

  // Warn on tab close / refresh, same as the Editor page does for code edits.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          'You have trained samples that have not been saved. Are you sure you want to leave?';
        return e.returnValue as string;
      }
      return undefined;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Camera labels are only populated by the browser once permission has
  // been granted, so this is always called *after* a successful start.
  const refreshCameraList = useCallback(
    async (activeDeviceId?: string) => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(cams);
        if (activeDeviceId) {
          setSelectedCameraId(activeDeviceId);
        } else if (cams[0] && !selectedCameraId) {
          setSelectedCameraId(cams[0].deviceId);
        }
      } catch {
        // Device enumeration isn't critical — fail silently.
      }
    },
    [selectedCameraId],
  );

  const handleStartWebcam = useCallback(async () => {
    if (!videoRef.current || !isModelLoaded) return;
    try {
      setError(null);
      await aiEngine.startWebcam(videoRef.current, selectedCameraId || undefined);
      setWebcamActive(true);
      const track = aiEngine.stream?.getVideoTracks()[0];
      void refreshCameraList(track?.getSettings().deviceId);
    } catch (err) {
      setError(
        `Camera error: ${err instanceof Error ? err.message : String(err)}. Please allow camera access.`,
      );
    }
  }, [isModelLoaded, selectedCameraId, setWebcamActive, refreshCameraList]);

  const handleSwitchCamera = useCallback(
    async (deviceId: string) => {
      if (!videoRef.current || deviceId === selectedCameraId) return;
      setIsSwitchingCamera(true);
      setError(null);
      try {
        await aiEngine.switchWebcam(videoRef.current, deviceId);
        setSelectedCameraId(deviceId);
        if (previewVideoRef.current && aiEngine.stream) {
          previewVideoRef.current.srcObject = aiEngine.stream;
          void previewVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setError(`Could not switch camera: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsSwitchingCamera(false);
      }
    },
    [selectedCameraId],
  );

  const handleStopWebcam = useCallback(() => {
    aiEngine.stopWebcam();
    aiEngine.stopPredicting();
    setWebcamActive(false);
    setPredicting(false);
    clearPrediction();
    setIsTesting(false);
  }, [setWebcamActive, setPredicting, clearPrediction]);

  const handleCaptureStart = useCallback(
    (className: string) => {
      if (!isWebcamActive || !videoRef.current) return;
      setIsCapturing(className);

      const capture = () => {
        if (!videoRef.current) return;
        try {
          aiEngine.addExample(videoRef.current, className);
          const thumb = captureThumbnail(videoRef.current);
          if (thumb) {
            setSampleThumbnails((prev) => ({
              ...prev,
              [className]: [...(prev[className] ?? []), thumb],
            }));
          }
          syncTrainingState();
          setIsTrained(false);
          setHasUnsavedChanges(true);
        } catch {
          // Model may still be loading — ignore.
        }
      };

      void capture();
      captureIntervalRef.current = setInterval(() => void capture(), 200);
    },
    [isWebcamActive, syncTrainingState],
  );

  const handleCaptureStop = useCallback(() => {
    setIsCapturing(null);
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  const handleAddClass = useCallback(() => {
    const name = newClassName.trim() || `Class ${classes.length + 1}`;
    if (classes.includes(name)) return;
    setClasses((prev) => [...prev, name]);
    setNewClassName('');
    invalidateTraining();
  }, [newClassName, classes, invalidateTraining]);

  const handleRemoveClass = useCallback(
    (className: string) => {
      aiEngine.clearClass(className);
      setClasses((prev) => prev.filter((c) => c !== className));
      setSampleThumbnails((prev) => {
        const n = { ...prev };
        delete n[className];
        return n;
      });
      syncTrainingState();
      invalidateTraining();
    },
    [syncTrainingState, invalidateTraining],
  );

  const handleClearClass = useCallback(
    (className: string) => {
      aiEngine.clearClass(className);
      setSampleThumbnails((prev) => {
        const n = { ...prev };
        delete n[className];
        return n;
      });
      syncTrainingState();
      invalidateTraining();
    },
    [syncTrainingState, invalidateTraining],
  );

  // Deletes exactly one recorded sample instead of clearing the whole class —
  // the thumbnail array's index always matches the classifier's row order,
  // so this stays correct as long as both are only ever appended to in sync.
  const handleDeleteSample = useCallback(
    (className: string, index: number) => {
      aiEngine.removeExampleAt(className, index);
      setSampleThumbnails((prev) => ({
        ...prev,
        [className]: (prev[className] ?? []).filter((_, i) => i !== index),
      }));
      syncTrainingState();
      invalidateTraining();
    },
    [syncTrainingState, invalidateTraining],
  );

  const handleRenameClass = useCallback(
    (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName || classes.includes(trimmed)) return;
      aiEngine.renameClass(oldName, trimmed);
      setClasses((prev) => prev.map((c) => (c === oldName ? trimmed : c)));
      setSampleThumbnails((prev) => {
        const n = { ...prev };
        if (n[oldName]) {
          n[trimmed] = n[oldName];
          delete n[oldName];
        }
        return n;
      });
      syncTrainingState();
    },
    [classes, syncTrainingState],
  );

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
              const thumb = captureThumbnail(img);
              if (thumb) {
                setSampleThumbnails((prev) => ({
                  ...prev,
                  [className]: [...(prev[className] ?? []), thumb],
                }));
              }
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
      invalidateTraining();
      setUploadProgress((p) => {
        const n = { ...p };
        delete n[className];
        return n;
      });
    },
    [syncTrainingState, invalidateTraining],
  );

  // The discrete "Train Model" action. For a KNN classifier there's no
  // gradient descent to run, but the step is still real: it validates the
  // dataset, runs one throwaway inference to force WebGL to compile its
  // shaders/kernels up front (so the *first* live prediction in Preview
  // isn't the slow one), and only then unlocks Preview — never a fake
  // progress bar with no work behind it.
  const handleTrainModel = useCallback(async () => {
    if (!videoRef.current || !isModelLoaded) return;
    setIsTrainingModel(true);
    setError(null);
    try {
      if (!isWebcamActive) await handleStartWebcam();
      await new Promise((r) => setTimeout(r, 250));
      if (videoRef.current && videoRef.current.readyState >= 2) {
        aiEngine.addExample(videoRef.current, '__warmup__');
        aiEngine.clearClass('__warmup__');
      }
      setIsTrained(true);
    } catch (err) {
      setError(`Training failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTrainingModel(false);
    }
  }, [isModelLoaded, isWebcamActive, handleStartWebcam]);

  const handleToggleTest = useCallback(() => {
    if (!videoRef.current || !isWebcamActive) return;

    if (isTesting) {
      aiEngine.stopPredicting();
      setPredicting(false);
      clearPrediction();
      setIsTesting(false);
    } else {
      aiEngine.startPredicting(
        videoRef.current,
        (result) => updatePrediction(result.label, result.allConfidences),
        true,
        false,
        trainingConfig,
      );
      setPredicting(true);
      setIsTesting(true);
    }
  }, [isWebcamActive, isTesting, trainingConfig, setPredicting, clearPrediction, updatePrediction]);

  useEffect(() => {
    if (isTesting && videoRef.current) {
      aiEngine.startPredicting(
        videoRef.current,
        (result) => updatePrediction(result.label, result.allConfidences),
        true,
        false,
        trainingConfig,
      );
    }
  }, [trainingConfig, isTesting, updatePrediction]);

  // One-shot "test with a photo" — classifies a single uploaded image
  // without touching the continuous live-webcam prediction loop.
  const handleTestWithFile = useCallback(
    async (file: File) => {
      setIsTestingFile(true);
      setError(null);
      try {
        const img = new Image();
        const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Could not read that image file.'));
          img.src = URL.createObjectURL(file);
        });
        const result = await aiEngine.predictFromImage(loaded, trainingConfig);
        URL.revokeObjectURL(loaded.src);
        if (result) {
          updatePrediction(result.label, result.allConfidences);
        } else {
          setError('Train the model on at least 2 classes before testing a photo.');
        }
      } catch (err) {
        setError(`Test failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsTestingFile(false);
      }
    },
    [trainingConfig, updatePrediction],
  );

  const handleResetAll = useCallback(() => {
    aiEngine.clearAll();
    setClasses(['Class 1', 'Class 2']);
    setSampleThumbnails({});
    clearPrediction();
    syncTrainingState();
    invalidateTraining();
  }, [clearPrediction, syncTrainingState, invalidateTraining]);

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
        setSampleThumbnails({});
        syncTrainingState();
        invalidateTraining();
      } catch (err) {
        setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsImporting(false);
      }
    },
    [syncTrainingState, setModelLoaded, invalidateTraining],
  );

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

  // Persists the trained KNN dataset into the project's saved blockState —
  // the same mechanism the Editor's own Save button uses, so a model
  // trained here survives a refresh or a closed tab.
  const handleSaveAI = useCallback(async () => {
    setIsSavingAI(true);
    setError(null);
    try {
      const { blockXml, saveProject } = useEditorStore.getState();
      await saveProject(blockXml);
      setHasUnsavedChanges(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingAI(false);
    }
  }, []);

  const handleSaveAndLeave = useCallback(async () => {
    await handleSaveAI();
    setShowLeaveConfirm(false);
    goToEditorNow();
  }, [handleSaveAI, goToEditorNow]);

  const handleDiscardAndLeave = useCallback(() => {
    setShowLeaveConfirm(false);
    setHasUnsavedChanges(false);
    goToEditorNow();
  }, [goToEditorNow]);

  const totalSamples = classes.map((c) => exampleCounts[c] ?? 0).reduce((a, b) => a + b, 0);
  const trainedClassCount = classes.map((c) => exampleCounts[c] ?? 0).filter((c) => c > 0).length;
  const canTrain = trainedClassCount >= 2;

  const TABS: Array<{ id: TrainerTab; label: string; icon: typeof ImageIcon }> = [
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'audio', label: 'Audio', icon: Mic },
    { id: 'pose', label: 'Pose', icon: PersonStanding },
    { id: 'numbers', label: 'Numbers', icon: Table2 },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f1e] flex flex-col">
      {/* ── Page header ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-3 border-b border-white/10 bg-[#1a1a2e]/95 backdrop-blur-sm">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={goBackToEditor}
            title="Back to Editor"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold shrink-0"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Editor</span>
          </button>
          <div className="w-px h-6 bg-white/10 shrink-0" />
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FF6F61]/20 flex items-center justify-center shrink-0">
              <Brain size={20} className="text-[#FF6F61]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-base leading-tight flex items-center gap-1.5">
                Train AI
                {hasUnsavedChanges && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-400"
                    title="You have unsaved training data"
                  />
                )}
              </h1>
              <p className="text-white/40 text-xs leading-tight hidden sm:block">
                Train your own models — no coding needed
              </p>
            </div>
          </div>

          <div className="flex bg-black/20 p-1 rounded-xl flex-wrap gap-1 ml-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === id
                    ? 'bg-white/10 text-white shadow'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'image' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void handleSaveAI()}
              disabled={isSavingAI || (!hasUnsavedChanges && !justSaved)}
              title="Save training data to this project"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold disabled:cursor-not-allowed ${
                justSaved
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : hasUnsavedChanges
                    ? 'bg-[#FF6F61] text-white hover:bg-[#FF6F61]/90'
                    : 'bg-white/5 text-white/25'
              }`}
            >
              {isSavingAI ? (
                <Loader2 size={13} className="animate-spin" />
              ) : justSaved ? (
                <Check size={13} />
              ) : (
                <Save size={13} />
              )}
              <span className="hidden md:inline">
                {isSavingAI ? 'Saving…' : justSaved ? 'Saved' : 'Save'}
              </span>
            </button>
            <div className="w-px h-5 bg-white/10 mx-0.5" />
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
              <span className="hidden md:inline">Export</span>
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
              <span className="hidden md:inline">Import</span>
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
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1">
        {activeTab === 'text' ? (
          <TextTrainerModal />
        ) : activeTab === 'audio' ? (
          <AudioTrainerTab />
        ) : activeTab === 'pose' ? (
          <PoseTrainerTab />
        ) : activeTab === 'numbers' ? (
          <TabularTrainerTab />
        ) : (
          <>
            {isLoading && (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <Loader2 size={40} className="text-[#FF6F61] animate-spin" />
                <p className="text-white/70 text-sm">{loadingMessage}</p>
                <p className="text-white/40 text-xs">
                  This only happens once — the AI model is cached after first load.
                </p>
              </div>
            )}

            {error && (
              <div className="mx-6 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {isModelLoaded && !isLoading && (
              <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-[300px_380px_340px] gap-5 p-6 justify-center items-stretch">
                {/* ── LEFT: Classes ── */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Layers size={13} /> Classes
                    </span>
                    <span className="text-white/40 text-xs">{totalSamples} samples</span>
                  </div>

                  {!isWebcamActive && (
                    <button
                      onClick={() => void handleStartWebcam()}
                      className="w-full py-2.5 rounded-lg bg-[#FF6F61] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#FF6F61]/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Video size={14} />
                      Start Camera
                    </button>
                  )}

                  {isWebcamActive && availableCameras.length > 1 && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
                      <SwitchCamera size={13} className="text-white/40 shrink-0" />
                      <select
                        value={selectedCameraId}
                        disabled={isSwitchingCamera}
                        onChange={(e) => void handleSwitchCamera(e.target.value)}
                        className="flex-1 min-w-0 bg-transparent text-white/70 text-xs outline-none disabled:opacity-50"
                      >
                        {availableCameras.map((cam, i) => (
                          <option key={cam.deviceId} value={cam.deviceId} className="bg-[#1a1a2e]">
                            {cam.label || `Camera ${i + 1}`}
                          </option>
                        ))}
                      </select>
                      {isSwitchingCamera && (
                        <Loader2 size={12} className="animate-spin text-white/40 shrink-0" />
                      )}
                    </div>
                  )}

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

                        {(sampleThumbnails[className]?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                              {sampleThumbnails[className]!.slice(-6).map((thumb, i) => (
                                <img
                                  key={i}
                                  src={thumb}
                                  alt=""
                                  className="w-10 h-10 rounded-md object-cover border border-white/10 shrink-0"
                                  style={{ transform: 'scaleX(-1)' }}
                                />
                              ))}
                            </div>
                            <button
                              onClick={() => setGalleryClass(className)}
                              title="View and manage all samples"
                              className="w-10 h-10 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 shrink-0 flex flex-col items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                            >
                              <Images size={13} />
                              <span className="text-[9px] font-bold mt-0.5">{count}</span>
                            </button>
                          </div>
                        )}

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

                  <button
                    onClick={handleResetAll}
                    className="w-full py-2 rounded-lg bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-colors border border-white/5"
                  >
                    Reset All Training Data
                  </button>

                  {/* Processing video — fed to MobileNet for capture + inference.
                      Its pixels are never shown; the Preview panel's video (same
                      MediaStream) is what the student actually looks at. */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none"
                    aria-hidden
                  />
                </div>

                {/* ── MIDDLE: Training ── */}
                <div className="flex flex-col gap-3 sticky top-20 h-full">
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Sparkles size={13} /> Training
                  </span>

                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3 flex-1 flex flex-col">
                    <button
                      onClick={() => void handleTrainModel()}
                      disabled={!canTrain || isTrainingModel}
                      className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        isTrained
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : canTrain
                            ? 'bg-[#FF6F61] text-white hover:bg-[#FF6F61]/90'
                            : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                      }`}
                    >
                      {isTrainingModel ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Training...
                        </>
                      ) : isTrained ? (
                        <>
                          <Check size={15} /> Model Trained
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          {canTrain ? 'Train Model' : 'Add samples to 2+ classes'}
                        </>
                      )}
                    </button>

                    {!canTrain && (
                      <p className="text-white/30 text-[11px] leading-relaxed text-center">
                        Record samples for at least two classes on the left, then come back here to
                        train.
                      </p>
                    )}
                    {isTrained && (
                      <p className="text-emerald-400/70 text-[11px] text-center">
                        Ready — check the Preview panel to test it live.
                      </p>
                    )}

                    {/* ── Advanced ── */}
                    <div className="rounded-lg border border-white/10 overflow-hidden">
                      <button
                        onClick={() => setShowAdvanced((v) => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest"
                      >
                        <span className="flex items-center gap-2">
                          <Settings2 size={13} /> Advanced
                        </span>
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {showAdvanced && (
                        <div className="px-4 pb-4 pt-1 space-y-4 bg-white/[0.02]">
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

                          <button
                            onClick={() => setTrainingConfig({ ...DEFAULT_TRAINING_CONFIG })}
                            className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors"
                          >
                            <RotateCcw size={11} /> Reset to defaults
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── Under the hood ── */}
                    <button
                      onClick={() => setShowUnderTheHood((v) => !v)}
                      className="w-full flex items-center justify-between px-1 py-1 text-white/30 hover:text-white/60 transition-colors text-xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <Info size={12} /> Under the hood
                      </span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${showUnderTheHood ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {showUnderTheHood && (
                      <p className="text-white/30 text-[11px] leading-relaxed px-1">
                        Every webcam frame is run through <strong>MobileNet v2</strong> (a small
                        pretrained vision model) to get a 1024-number "fingerprint". A{' '}
                        <strong>k-Nearest-Neighbours</strong> classifier then remembers the
                        fingerprint of every sample you record, and compares new fingerprints
                        against them to vote on the closest class. Nothing leaves your browser — no
                        images or audio are ever uploaded.
                      </p>
                    )}

                    {/* Fills the remaining height instead of leaving dead
                        space — a quick 3-step guide for what to do next. */}
                    <div className="flex-1 flex flex-col justify-center gap-4 py-2">
                      {[
                        { icon: Camera, text: 'Record a handful of samples for each class' },
                        {
                          icon: Sparkles,
                          text: 'Click Train Model once you have at least 2 classes',
                        },
                        { icon: Eye, text: 'Test it live in the Preview panel on the right' },
                      ].map(({ icon: Icon, text }, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white/40 text-[11px] font-bold">
                            {i + 1}
                          </div>
                          <Icon size={14} className="text-white/25 shrink-0" />
                          <p className="text-white/40 text-xs leading-snug">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: Preview ── */}
                <div className="flex flex-col gap-3 sticky top-20 h-full">
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Eye size={13} /> Preview
                  </span>

                  <button
                    onClick={() => void handleExportModel()}
                    disabled={isExporting || totalSamples === 0 || !isTrained}
                    className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors mb-1"
                  >
                    Export Model
                  </button>

                  {/* Input Section */}
                  <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-1 flex flex-col">
                    <button
                      onClick={() => setShowPreviewInput((v) => !v)}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors border-b border-white/10"
                    >
                      <span className="text-white text-xs font-bold uppercase tracking-widest">
                        Input
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-white/40 transition-transform ${showPreviewInput ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showPreviewInput && (
                      <div className="flex flex-col">
                        {/* Start/Stop Preview Toggle (like TM Input Switch) */}
                        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20">
                          <label
                            className="flex items-center gap-2 cursor-pointer"
                            title="Toggle prediction"
                          >
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isTesting}
                                onChange={handleToggleTest}
                                disabled={!isTrained || (!isWebcamActive && !isTestingFile)}
                              />
                              <div
                                className={`block w-8 h-4 rounded-full transition-colors ${isTesting ? 'bg-emerald-500' : 'bg-white/20'}`}
                              ></div>
                              <div
                                className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${isTesting ? 'translate-x-4' : ''}`}
                              ></div>
                            </div>
                            <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider">
                              {isTesting ? 'On' : 'Off'}
                            </span>
                          </label>

                          {/* Webcam / File Switch */}
                          <div className="flex bg-white/10 rounded-lg p-0.5">
                            <button
                              onClick={() => setIsTestingFile(false)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${!isTestingFile ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}
                            >
                              Webcam
                            </button>
                            <button
                              onClick={() => setIsTestingFile(true)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${isTestingFile ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}
                            >
                              File
                            </button>
                          </div>
                        </div>

                        {/* Video / File area */}
                        <div
                          className={`relative aspect-square bg-black flex items-center justify-center transition-shadow shrink-0 ${
                            isCapturing ? 'ring-2 ring-red-500 ring-inset' : ''
                          }`}
                        >
                          {!isTestingFile ? (
                            <>
                              <video
                                ref={previewVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover bg-black"
                                style={{ transform: 'scaleX(-1)' }}
                              />
                              {!isWebcamActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1a1a2e]">
                                  <Camera size={28} className="text-white/20" />
                                  <span className="text-white/25 text-[11px] text-center px-6">
                                    Start the camera on the left to see it here
                                  </span>
                                </div>
                              )}
                              {isCapturing && (
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                                  <Circle size={6} className="fill-white animate-pulse" />
                                  Recording: {isCapturing}
                                </div>
                              )}
                              {isWebcamActive && (
                                <button
                                  onClick={handleStopWebcam}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
                                  title="Stop Camera"
                                >
                                  <VideoOff size={13} />
                                </button>
                              )}
                            </>
                          ) : (
                            <div
                              className="absolute inset-4 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#FF6F61]/50 hover:bg-white/5 transition-colors cursor-pointer group"
                              onClick={() => testFileRef.current?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files[0];
                                if (file) void handleTestWithFile(file);
                              }}
                            >
                              <ImagePlus
                                size={24}
                                className="text-white/30 group-hover:text-[#FF6F61]/70 transition-colors shrink-0"
                              />
                              <span className="text-white/30 group-hover:text-white/50 text-xs transition-colors">
                                Drop image or click to upload
                              </span>
                              <input
                                ref={testFileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0])
                                    void handleTestWithFile(e.target.files[0]);
                                  e.target.value = '';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Output Section */}
                  <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden flex flex-col">
                    <button
                      onClick={() => setShowPreviewOutput((v) => !v)}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors border-b border-white/10"
                    >
                      <span className="text-white text-xs font-bold uppercase tracking-widest">
                        Output
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-white/40 transition-transform ${showPreviewOutput ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showPreviewOutput && (
                      <div className="p-4 space-y-3 flex flex-col justify-center bg-black/20 min-h-[120px]">
                        {!isTrained ? (
                          <p className="text-white/30 text-xs leading-relaxed text-center py-4">
                            You must train a model on the left before you can preview it here.
                          </p>
                        ) : (
                          <>
                            {Object.keys(confidences).length > 0 ? (
                              <div className="space-y-2">
                                {Object.entries(confidences)
                                  .filter(([label]) => !label.startsWith('text:'))
                                  .sort(([, a], [, b]) => b - a)
                                  .map(([label, conf]) => (
                                    <div key={label} className="flex items-center gap-2">
                                      <span className="text-white/80 text-xs font-medium w-16 truncate">
                                        {label}
                                      </span>
                                      <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
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
                                      <span className="text-white/60 text-[11px] font-mono w-9 text-right">
                                        {conf}%
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-white/30 text-[11px] text-center italic">
                                Waiting for input...
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Per-class sample gallery — view + delete individual samples */}
      {galleryClass && (
        <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#12122a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Images size={18} className="text-[#FF6F61]" />
                <span className="text-white font-bold text-sm">
                  {galleryClass} — {sampleThumbnails[galleryClass]?.length ?? 0} samples
                </span>
              </div>
              <button
                onClick={() => setGalleryClass(null)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {(sampleThumbnails[galleryClass]?.length ?? 0) === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">
                  No samples left for this class.
                </p>
              ) : (
                <div className="grid grid-cols-6 gap-3">
                  {sampleThumbnails[galleryClass]!.map((thumb, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={thumb}
                        alt=""
                        className="w-full aspect-square rounded-lg object-cover border border-white/10"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      <button
                        onClick={() => handleDeleteSample(galleryClass, i)}
                        title="Delete this sample"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave-without-saving confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#12122a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-amber-400" />
                </div>
                <h3 className="text-white font-bold text-sm">Save your training data?</h3>
              </div>
              <p className="text-white/50 text-xs leading-relaxed">
                You've recorded samples that haven't been saved to this project yet. If you leave
                without saving, they'll be lost as soon as you close this tab.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-4 pt-0">
              <button
                onClick={() => void handleSaveAndLeave()}
                disabled={isSavingAI}
                className="w-full py-2.5 rounded-lg bg-[#FF6F61] text-white font-bold text-sm hover:bg-[#FF6F61]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSavingAI ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save & Go Back
              </button>
              <button
                onClick={handleDiscardAndLeave}
                disabled={isSavingAI}
                className="w-full py-2.5 rounded-lg bg-white/5 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors"
              >
                Discard & Go Back
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={isSavingAI}
                className="w-full py-2 rounded-lg text-white/40 hover:text-white/70 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TFJS code-snippet popup */}
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
            <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
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
    </div>
  );
}
