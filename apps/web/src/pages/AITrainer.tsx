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
  Plus,
  Brain,
  Loader2,
  Video,
  Upload,
  ChevronDown,
  RotateCcw,
  Download,
  FolderOpen,
  Copy,
  Check,
  PackageOpen,
  Save,
  AlertTriangle,
  ImagePlus,
  Pencil,
  MoreVertical,
  Trash2,
  BarChart3,
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
  const [inputMode, setInputMode] = useState<'webcam' | 'file'>('webcam');
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
  const outputVideoRef = useRef<HTMLVideoElement>(null);
  const [webcamClass, setWebcamClass] = useState<string | null>(null);
  const [menuClass, setMenuClass] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: 'class' | 'pictures';
    name: string;
  } | null>(null);
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
    if (isWebcamActive && aiEngine.stream) {
      for (const el of [previewVideoRef.current, outputVideoRef.current]) {
        if (!el) continue;
        el.srcObject = aiEngine.stream;
        void el.play().catch(() => {});
      }
    }
  }, [isWebcamActive, webcamClass, inputMode, showPreviewInput]);

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

  const TABS: Array<{ id: TrainerTab; label: string }> = [
    { id: 'image', label: 'Image' },
    { id: 'text', label: 'Text' },
    { id: 'audio', label: 'Audio' },
    { id: 'pose', label: 'Pose' },
    { id: 'numbers', label: 'Numbers' },
  ];

  // Kid-friendly "How careful should it be?" — maps to the engine's threshold.
  const CAREFUL_LEVELS: Array<{ label: string; emoji: string; value: number; help: string }> = [
    {
      label: 'Quick',
      emoji: '🐢',
      value: 0.6,
      help: 'Guesses fast. It may guess wrong sometimes.',
    },
    {
      label: 'Just right',
      emoji: '⚖️',
      value: 0.7,
      help: 'A good mix. This is the recommended choice.',
    },
    { label: 'Very sure', emoji: '🎯', value: 0.85, help: 'Only guesses when it is really sure.' },
  ];
  const careLevel = CAREFUL_LEVELS.reduce((best, lvl) =>
    Math.abs(lvl.value - trainingConfig.predictionThreshold) <
    Math.abs(best.value - trainingConfig.predictionThreshold)
      ? lvl
      : best,
  ).label;

  // Output bar colours per class, in order.
  const CLASS_COLORS = ['#f59e0b', '#e11d48', '#10b981', '#6366f1', '#0ea5e9', '#a855f7'];

  const card = 'bg-white dark:bg-[#1b1b33] rounded-lg shadow-sm';
  const muted = 'text-slate-500 dark:text-white/50';
  const tile =
    'flex flex-col items-center justify-center gap-1 w-[72px] h-[62px] shrink-0 rounded-md bg-[#e8f0fe] dark:bg-[#1a73e8]/15 text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#d2e3fc] dark:hover:bg-[#1a73e8]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
  const primaryBtn =
    'bg-[#1a73e8] text-white hover:bg-[#1765cc] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-white/30';
  const grayBtn =
    'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15';

  return (
    <div className="min-h-screen bg-[#e8eaed] dark:bg-[#0f0f1e] text-slate-800 dark:text-white flex flex-col">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 px-4 pt-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 bg-white dark:bg-[#15152b] rounded-lg shadow-sm px-4 py-2.5">
          <button
            onClick={goBackToEditor}
            title="Back to Editor"
            className="p-1 rounded-md text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-semibold text-lg text-[#1a73e8] flex items-center gap-2">
            <Brain size={18} /> Train AI
            {hasUnsavedChanges && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Not saved yet" />
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-[#15152b] rounded-lg shadow-sm px-2 py-2">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-[#1a73e8]/10 text-[#1a73e8] dark:bg-white/10 dark:text-white'
                  : 'text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
          {activeTab === 'image' && (
            <>
              <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />
              <button
                onClick={() => void handleSaveAI()}
                disabled={isSavingAI || (!hasUnsavedChanges && !justSaved)}
                title="Save to this project"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-40 ${
                  justSaved
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : primaryBtn
                }`}
              >
                {isSavingAI ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : justSaved ? (
                  <Check size={14} />
                ) : (
                  <Save size={14} />
                )}
                {isSavingAI ? 'Saving…' : justSaved ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={() => importZipRef.current?.click()}
                disabled={isImporting}
                title="Open a saved project file"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-40 ${grayBtn}`}
              >
                {isImporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FolderOpen size={14} />
                )}
                Open
              </button>
              <button
                onClick={() => void handleExportZip()}
                disabled={isExporting || totalSamples === 0}
                title="Download your project as a file"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-40 ${grayBtn}`}
              >
                {isExporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Download
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
            </>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col">
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
              <div className="flex flex-col items-center justify-center gap-3 py-24">
                <Loader2 size={36} className="text-[#1a73e8] animate-spin" />
                <p className="text-sm font-semibold">{loadingMessage}</p>
                <p className={`text-xs ${muted}`}>This only happens once.</p>
              </div>
            )}

            {error && (
              <div className="mx-auto mt-4 w-full max-w-[1220px] px-4">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              </div>
            )}

            {isModelLoaded && !isLoading && (
              <div className="flex-1 flex justify-center items-stretch py-8 px-6 min-h-[calc(100vh-96px)]">
                <div className="w-full max-w-[1400px] grid grid-cols-[minmax(0,1fr)_280px_340px] gap-8 items-stretch">
                  {/* ── Classes ── */}
                  <section className="min-w-0 flex flex-col gap-4">
                    {classes.map((className) => {
                      const count = exampleCounts[className] ?? 0;
                      const thumbs = sampleThumbnails[className] ?? [];
                      const isOpen = webcamClass === className;
                      return (
                        <div key={className} className={`${card} overflow-hidden`}>
                          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/10">
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                defaultValue={className}
                                onBlur={(e) => handleRenameClass(className, e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                title="Click to rename"
                                className="font-semibold text-lg bg-transparent outline-none min-w-0 rounded px-1 -ml-1 border border-transparent focus:border-[#1a73e8]/60 hover:border-slate-200 dark:hover:border-white/20"
                              />
                              <Pencil size={14} className="text-slate-400 shrink-0" />
                            </div>
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setMenuClass(menuClass === className ? null : className)
                                }
                                title="Class options"
                                className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {menuClass === className && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setMenuClass(null)}
                                  />
                                  <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg bg-white dark:bg-[#24244a] shadow-lg border border-slate-200 dark:border-white/10 py-1 text-left">
                                    <button
                                      onClick={() => {
                                        setMenuClass(null);
                                        setConfirmDelete({ kind: 'pictures', name: className });
                                      }}
                                      disabled={count === 0}
                                      className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      Delete all pictures in this class
                                      <span className={`block text-xs ${muted}`}>
                                        {count} pictures
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setMenuClass(null);
                                        setConfirmDelete({ kind: 'class', name: className });
                                      }}
                                      disabled={classes.length <= 2}
                                      className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      Delete this class
                                      <span className={`block text-xs ${muted}`}>
                                        {classes.length <= 2
                                          ? 'You need at least 2 classes'
                                          : 'Removes the class and its pictures'}
                                      </span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {isOpen ? (
                            <div className="flex bg-[#e8f0fe]/60 dark:bg-[#1a73e8]/10">
                              {/* Webcam recorder */}
                              <div className="w-[285px] shrink-0 p-4 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-[#1a73e8] dark:text-[#8ab4f8]">
                                    Webcam
                                  </span>
                                  <button
                                    onClick={() => {
                                      setWebcamClass(null);
                                      handleStopWebcam();
                                    }}
                                    title="Close webcam"
                                    className="p-1 rounded text-[#1a73e8] hover:bg-white/60"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                <div
                                  className={`relative aspect-square rounded-md bg-slate-900 overflow-hidden ${isCapturing === className ? 'ring-2 ring-red-500' : ''}`}
                                >
                                  <video
                                    ref={previewVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                    style={{ transform: 'scaleX(-1)' }}
                                  />
                                  {!isWebcamActive && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">
                                      Starting camera…
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onMouseDown={() => handleCaptureStart(className)}
                                    onMouseUp={handleCaptureStop}
                                    onMouseLeave={handleCaptureStop}
                                    onTouchStart={() => handleCaptureStart(className)}
                                    onTouchEnd={handleCaptureStop}
                                    disabled={!isWebcamActive}
                                    className={`flex-1 py-2.5 rounded-md text-sm font-semibold select-none transition-colors ${
                                      isCapturing === className
                                        ? 'bg-red-500 text-white'
                                        : 'bg-[#1a73e8] text-white hover:bg-[#1765cc] disabled:bg-slate-300'
                                    }`}
                                  >
                                    {isCapturing === className ? 'Recording…' : 'Hold to Record'}
                                  </button>
                                </div>
                              </div>
                              {/* Sample grid */}
                              <div className="flex-1 min-w-0 p-4 bg-white dark:bg-transparent">
                                <p className="text-sm font-medium mb-3">{count} Image Samples</p>
                                <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                  {thumbs.map((thumb, i) => (
                                    <div key={i} className="relative group">
                                      <img
                                        src={thumb}
                                        alt=""
                                        className="w-full aspect-square rounded-md object-cover"
                                        style={{ transform: 'scaleX(-1)' }}
                                      />
                                      <button
                                        onClick={() => handleDeleteSample(className, i)}
                                        title="Delete this sample"
                                        className="absolute inset-0 m-auto w-7 h-7 rounded bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="px-5 py-4 space-y-3">
                              <p className={`text-sm ${muted}`}>
                                {count === 0 ? 'Add Image Samples:' : `${count} Image Samples`}
                              </p>
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  onClick={async () => {
                                    if (!isWebcamActive) await handleStartWebcam();
                                    setWebcamClass(className);
                                  }}
                                  disabled={!isModelLoaded}
                                  className={tile}
                                >
                                  <Video size={20} />
                                  <span className="text-[11px] font-medium">Webcam</span>
                                </button>
                                <button
                                  onClick={() => fileInputRefs.current[className]?.click()}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const files = e.dataTransfer.files;
                                    if (files.length) void handleImageUpload(className, files);
                                  }}
                                  className={tile}
                                >
                                  <Upload size={20} />
                                  <span className="text-[11px] font-medium">
                                    {uploadProgress[className] ?? 'Upload'}
                                  </span>
                                </button>
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
                                {thumbs.length > 0 && (
                                  <div className="flex gap-1.5 overflow-x-auto min-w-0 pb-1">
                                    {thumbs.map((thumb, i) => (
                                      <img
                                        key={i}
                                        src={thumb}
                                        alt=""
                                        className="w-[62px] h-[62px] rounded-md object-cover shrink-0"
                                        style={{ transform: 'scaleX(-1)' }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button
                      onClick={handleAddClass}
                      className="w-full py-5 rounded-lg border-2 border-dashed border-slate-300 dark:border-white/15 text-slate-500 dark:text-white/50 text-base flex items-center justify-center gap-2 hover:border-[#1a73e8] hover:text-[#1a73e8]"
                    >
                      <Plus size={18} /> Add a class
                    </button>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                        placeholder={`Class ${classes.length + 1} name`}
                        className="flex-1 min-w-0 px-3 py-2 rounded-md bg-white dark:bg-[#1b1b33] border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-[#1a73e8]"
                      />
                      <button
                        onClick={handleResetAll}
                        className={`text-xs font-medium px-3 rounded-md hover:text-red-500 ${muted}`}
                      >
                        Start over
                      </button>
                    </div>

                    {/* Processing video — feeds the model; never shown. */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none"
                      aria-hidden
                    />
                  </section>

                  {/* ── Training ── */}
                  <section className="flex flex-col pt-1 h-full">
                    <div className={`${card} p-5 flex flex-col gap-4 h-full`}>
                      <h2 className="text-lg font-semibold">Training</h2>
                      <button
                        onClick={() => void handleTrainModel()}
                        disabled={!canTrain || isTrainingModel || isTrained}
                        className={`w-full py-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                          isTrained
                            ? grayBtn
                            : canTrain
                              ? primaryBtn
                              : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30'
                        }`}
                      >
                        {isTrainingModel ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Training…
                          </>
                        ) : isTrained ? (
                          'Model Trained'
                        ) : (
                          'Train Model'
                        )}
                      </button>
                      {isTrainingModel && (
                        <p className="text-xs text-[#1a73e8]">Preparing training data…</p>
                      )}
                      {!canTrain && !isTrained && (
                        <p className={`text-xs ${muted}`}>
                          Add image samples to at least 2 classes.
                        </p>
                      )}

                      <div className="border-t border-slate-100 dark:border-white/10 pt-3">
                        <button
                          onClick={() => setShowAdvanced((v) => !v)}
                          className="w-full flex items-center justify-between text-sm font-medium text-slate-700 dark:text-white/80"
                        >
                          <span>Advanced</span>
                          <ChevronDown
                            size={15}
                            className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {showAdvanced && (
                          <div className="pt-3 space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                How sure should it be before it guesses?
                              </p>
                              <p className={`text-xs mt-0.5 ${muted}`}>
                                Pick one. You can change it any time.
                              </p>
                            </div>
                            <div className="space-y-2">
                              {CAREFUL_LEVELS.map((lvl) => (
                                <button
                                  key={lvl.label}
                                  onClick={() =>
                                    setTrainingConfig((c) => ({
                                      ...c,
                                      predictionThreshold: lvl.value,
                                    }))
                                  }
                                  className={`w-full text-left p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                                    careLevel === lvl.label
                                      ? 'border-[#1a73e8] bg-[#1a73e8]/10'
                                      : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                                  }`}
                                >
                                  <span className="text-xl leading-none mt-0.5">{lvl.emoji}</span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-slate-800 dark:text-white">
                                      {lvl.label}
                                    </span>
                                    <span className={`block text-xs mt-0.5 ${muted}`}>
                                      {lvl.help}
                                    </span>
                                  </span>
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setTrainingConfig({ ...DEFAULT_TRAINING_CONFIG })}
                              className={`flex items-center gap-1.5 text-xs font-medium hover:text-slate-800 dark:hover:text-white ${muted}`}
                            >
                              <RotateCcw size={12} /> Go back to Just right
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 dark:border-white/10 pt-3">
                        <button
                          onClick={() => setShowUnderTheHood((v) => !v)}
                          className="w-full flex items-center justify-between text-sm font-medium text-slate-700 dark:text-white/80"
                        >
                          <span className="flex items-center gap-1.5">
                            <BarChart3 size={14} /> Under the hood
                          </span>
                          <ChevronDown
                            size={15}
                            className={`transition-transform ${showUnderTheHood ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {showUnderTheHood && (
                          <p className={`text-xs leading-relaxed mt-2 ${muted}`}>
                            Your computer looks at each picture and remembers what it looks like.
                            When you show it something new, it finds the pictures it remembers most
                            similar and picks that class. Nothing is sent anywhere: your pictures
                            stay on this computer.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* ── Preview ── */}
                  <section className="flex flex-col pt-1 h-full">
                    <div className={`${card} overflow-hidden h-full flex flex-col`}>
                      <div className="flex items-center justify-between px-5 py-4">
                        <h2 className="text-lg font-semibold">Preview</h2>
                        <button
                          onClick={() => void handleExportModel()}
                          disabled={isExporting || totalSamples === 0}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-40 ${grayBtn}`}
                        >
                          {isExporting ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Upload size={13} />
                          )}
                          Export Model
                        </button>
                      </div>

                      <div className="px-5 pb-4 space-y-3 border-t border-slate-100 dark:border-white/10 pt-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setShowPreviewInput(!showPreviewInput)}
                            className="text-sm font-medium text-slate-700 dark:text-white/80"
                          >
                            Input
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                isWebcamActive ? handleStopWebcam() : void handleStartWebcam()
                              }
                              title={isWebcamActive ? 'Turn camera off' : 'Turn camera on'}
                              className={`relative w-9 h-5 rounded-full transition-colors ${isWebcamActive ? 'bg-[#1a73e8]' : 'bg-slate-300 dark:bg-white/20'}`}
                            >
                              <span
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isWebcamActive ? 'left-[18px]' : 'left-0.5'}`}
                              />
                            </button>
                            <span className={`text-xs font-medium ${muted}`}>
                              {isWebcamActive ? 'ON' : 'OFF'}
                            </span>
                            <select
                              value={inputMode}
                              onChange={(e) => setInputMode(e.target.value as 'webcam' | 'file')}
                              className="text-xs rounded-md border border-slate-200 dark:border-white/10 bg-transparent px-2 py-1 outline-none"
                            >
                              <option value="webcam">Webcam</option>
                              <option value="file">File</option>
                            </select>
                          </div>
                        </div>

                        {showPreviewInput && inputMode === 'webcam' && (
                          <div
                            className={`relative aspect-square rounded-md bg-slate-900 overflow-hidden ${isCapturing ? 'ring-2 ring-red-500' : ''}`}
                          >
                            <video
                              ref={outputVideoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                              style={{ transform: 'scaleX(-1)' }}
                            />
                          </div>
                        )}

                        {showPreviewInput && inputMode === 'file' && (
                          <div
                            className="aspect-square rounded-md border-2 border-dashed border-slate-300 dark:border-white/15 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#1a73e8]"
                            onClick={() => testFileRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const file = e.dataTransfer.files[0];
                              if (file) void handleTestWithFile(file);
                            }}
                          >
                            {isTestingFile ? (
                              <Loader2 size={24} className="animate-spin text-[#1a73e8]" />
                            ) : (
                              <ImagePlus size={24} className="text-slate-400" />
                            )}
                            <span className={`text-xs font-medium ${muted}`}>
                              {isTestingFile ? 'Checking…' : 'Drop a picture or click'}
                            </span>
                            <input
                              ref={testFileRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) void handleTestWithFile(e.target.files[0]);
                                e.target.value = '';
                              }}
                            />
                          </div>
                        )}

                        {inputMode === 'webcam' &&
                          isWebcamActive &&
                          availableCameras.length > 1 && (
                            <select
                              value={selectedCameraId}
                              disabled={isSwitchingCamera}
                              onChange={(e) => void handleSwitchCamera(e.target.value)}
                              className="w-full text-xs rounded-md border border-slate-200 dark:border-white/10 bg-transparent px-2 py-1.5 outline-none"
                            >
                              {availableCameras.map((cam, i) => (
                                <option
                                  key={cam.deviceId}
                                  value={cam.deviceId}
                                  className="bg-white dark:bg-[#1b1b33]"
                                >
                                  {cam.label || `Camera ${i + 1}`}
                                </option>
                              ))}
                            </select>
                          )}

                        {isTrained && inputMode === 'webcam' && isWebcamActive && (
                          <button
                            onClick={handleToggleTest}
                            className={`w-full py-2 rounded-md text-sm font-semibold ${isTesting ? 'bg-red-500 text-white' : primaryBtn}`}
                          >
                            {isTesting ? 'Stop guessing' : 'Start guessing'}
                          </button>
                        )}
                      </div>

                      <div className="px-5 py-4 border-t border-slate-100 dark:border-white/10 space-y-3">
                        <button
                          onClick={() => setShowPreviewOutput(!showPreviewOutput)}
                          className="text-sm font-medium text-slate-700 dark:text-white/80"
                        >
                          Output
                        </button>
                        {showPreviewOutput &&
                          (Object.keys(confidences).length === 0 ? (
                            <p className={`text-xs ${muted}`}>
                              {isTrained
                                ? 'Show it a picture to see what it thinks.'
                                : 'You must train a model on the left before you can preview it here.'}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {classes.map((label, idx) => {
                                const conf = confidences[label] ?? 0;
                                const color = CLASS_COLORS[idx % CLASS_COLORS.length];
                                return (
                                  <div
                                    key={label}
                                    className={`relative h-9 rounded-md bg-slate-50 dark:bg-white/5 overflow-hidden flex items-center px-3 ${label === currentPrediction ? 'ring-2 ring-[#1a73e8]' : ''}`}
                                  >
                                    <div
                                      className="absolute inset-y-0 left-0 transition-all duration-200"
                                      style={{
                                        width: `${conf}%`,
                                        backgroundColor: color,
                                        opacity: 0.25,
                                      }}
                                    />
                                    <span
                                      className="relative text-sm font-semibold"
                                      style={{ color }}
                                    >
                                      {label}
                                    </span>
                                    <span
                                      className="relative ml-auto text-xs font-semibold"
                                      style={{ color }}
                                    >
                                      {conf}%
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#1b1b33] rounded-xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="space-y-1.5">
              <h3 className="font-semibold text-base">
                {confirmDelete.kind === 'class'
                  ? `Delete "${confirmDelete.name}"?`
                  : `Delete all pictures in "${confirmDelete.name}"?`}
              </h3>
              <p className={`text-sm ${muted}`}>
                {confirmDelete.kind === 'class'
                  ? 'This removes the class and all of its pictures. This cannot be undone.'
                  : 'All pictures in this class will be removed. The class itself stays. This cannot be undone.'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.kind === 'class') handleRemoveClass(confirmDelete.name);
                  else handleClearClass(confirmDelete.name);
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
              >
                {confirmDelete.kind === 'class' ? 'Delete class' : 'Delete pictures'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-class sample gallery */}
      {galleryClass && (
        <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#1b1b33] rounded-xl w-full max-w-2xl max-h-[80vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
              <span className="font-semibold text-sm">
                {galleryClass} · {sampleThumbnails[galleryClass]?.length ?? 0} pictures
              </span>
              <button
                onClick={() => setGalleryClass(null)}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {(sampleThumbnails[galleryClass]?.length ?? 0) === 0 ? (
                <p className={`text-sm text-center py-8 ${muted}`}>
                  No pictures left in this class.
                </p>
              ) : (
                <div className="grid grid-cols-6 gap-3">
                  {sampleThumbnails[galleryClass]!.map((thumb, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={thumb}
                        alt=""
                        className="w-full aspect-square rounded-lg object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      <button
                        onClick={() => handleDeleteSample(galleryClass, i)}
                        title="Delete this picture"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Leave-without-saving */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#1b1b33] rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-5 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" /> Save your pictures first?
              </h3>
              <p className={`text-xs leading-relaxed ${muted}`}>
                You have not saved your latest changes. If you leave now they will be lost.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-4 pt-0">
              <button
                onClick={() => void handleSaveAndLeave()}
                disabled={isSavingAI}
                className={`w-full py-2.5 rounded-md text-sm font-semibold disabled:opacity-60 ${primaryBtn}`}
              >
                Save and leave
              </button>
              <button
                onClick={handleDiscardAndLeave}
                disabled={isSavingAI}
                className="w-full py-2.5 rounded-md text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Leave without saving
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={isSavingAI}
                className={`w-full py-2 text-xs font-medium ${muted}`}
              >
                Stay here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export code snippet */}
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
  const res = await fetch('tinkergyan-model-dataset.json');
  const { classes } = await res.json();
  for (const [label, c] of Object.entries(classes)) {
    const bytes = Uint8Array.from(atob(c.data), (ch) => ch.charCodeAt(0));
    classifier.setClassifierDataset({
      ...classifier.getClassifierDataset(),
      [label]: tf.tensor2d(new Float32Array(bytes.buffer), [c.n, c.d])
    });
  }
  return { net, classifier };
}
</script>`;
          return (
            <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-6">
              <div className="bg-white dark:bg-[#1b1b33] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
                  <span className="font-semibold text-sm flex items-center gap-2">
                    <PackageOpen size={16} className="text-[#1a73e8]" /> Your model is downloaded
                  </span>
                  <button
                    onClick={() => setShowExportCode(false)}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <p className={`text-xs leading-relaxed ${muted}`}>
                    Put the downloaded file next to this code in a folder and open it in a browser:
                  </p>
                  <div className="relative">
                    <pre className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg p-4 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                      {snippet}
                    </pre>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(snippet);
                        setSnippetCopied(true);
                        setTimeout(() => setSnippetCopied(false), 2000);
                      }}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-white/10 shadow-sm text-[10px] font-semibold"
                    >
                      {snippetCopied ? (
                        <Check size={11} className="text-emerald-500" />
                      ) : (
                        <Copy size={11} />
                      )}
                      {snippetCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
