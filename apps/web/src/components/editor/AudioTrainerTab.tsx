/**
 * AudioTrainerTab.tsx
 *
 * UI for the custom audio training tab in AI Model Studio.
 * Students add class names, hold a button to record mic samples,
 * then test live predictions — all in the browser.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Mic,
  MoreVertical,
  Pencil,
  ChevronDown,
  Info,
  Plus,
  Play,
  Square,
  Check,
  Upload,
} from 'lucide-react';
import { audioTrainerEngine } from '../../lib/audio-trainer-engine';
import {
  audioAcceptAttribute,
  checkAudioFile,
  supportedAudioLabels,
} from '../../lib/audio-file-types';
import { useAIStore } from '../../stores/ai.store';
import { RobotMascot } from '../illustrations/RobotMascot';

const COLOR = '#FF6F61';

const DEFAULT_AUDIO_CLASSES = ['Class 1', 'Class 2'];

/**
 * Every SAMPLE_MS of sound is ONE sample, like one photo on the Image tab.
 *
 *  - Tap the mic:   records one SAMPLE_MS take  -> 1 sample.
 *  - Hold the mic:  keeps recording while held  -> 1 sample per SAMPLE_MS.
 *  - Upload a file: split the same way          -> 1 sample per SAMPLE_MS.
 *
 * During a take the mic is read every FRAME_EVERY_MS and the snapshots are
 * combined into a single sample (see addTakeExample), so the counter goes up
 * by exactly one per SAMPLE_MS. The minimums below (8 for a normal class, 20
 * for a background-noise class) are therefore samples.
 */
const RECORD_MS = 5000;
const SAMPLE_EVERY_MS = 100;
const FRAMES_PER_TAKE = Math.floor(RECORD_MS / SAMPLE_EVERY_MS);
/** Pressing longer than this means "hold to record" rather than a tap. */
const HOLD_MS = 350;
/** Safety stop so a stuck pointer can never record forever. */
const MAX_HOLD_MS = 60_000;
/** The last, shorter piece of a hold is kept only if it is at least this long. */
const MIN_TAIL_FRAMES = Math.floor(1000 / SAMPLE_EVERY_MS);
/** Longest part of an uploaded file that is used (in samples). */
const MAX_FILE_TAKES = 12;

function resolveAudioClasses(): string[] {
  // ONLY audio-specific names — never Image's savedImageClasses.
  const saved = useAIStore.getState().savedAudioClasses;
  if (saved && saved.length > 0) return saved;
  if (audioTrainerEngine.isInitialised) {
    const existing = Object.keys(audioTrainerEngine.getExampleCounts()).filter(
      (k) => (audioTrainerEngine.getExampleCounts()[k] ?? 0) > 0,
    );
    if (existing.length > 0) return existing;
  }
  return [...DEFAULT_AUDIO_CLASSES];
}

export function AudioTrainerTab() {
  const [classes, setClasses] = useState<string[]>(() => resolveAudioClasses());
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isIniting, setIsIniting] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isRecording, setIsRecording] = useState<string | null>(null);
  /** Class whose mic is still warming up — its take has not started yet. */
  const [isStartingRecord, setIsStartingRecord] = useState<string | null>(null);
  const [recordElapsedMs, setRecordElapsedMs] = useState(0);
  const [recordHolding, setRecordHolding] = useState(false);
  /** Samples already added by the recording in progress (a hold adds several). */
  const [recordSamplesAdded, setRecordSamplesAdded] = useState(0);
  /** Class an upload is being processed for, with a "2 / 5" style progress. */
  const [uploadingClass, setUploadingClass] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  // True once the student presses "Stop listening". Without it, the effect that
  // auto-starts listening saw `isTesting === false` and restarted it instantly.
  const [listeningPaused, setListeningPaused] = useState(false);
  const [prediction, setPrediction] = useState<{
    label: string;
    confs: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Trained only after an explicit Train click (or a restored audio model).
  const [isTrained, setIsTrained] = useState(() => useAIStore.getState().audioModelLoaded === true);
  const [menuClass, setMenuClass] = useState<string | null>(null);
  const [showHood, setShowHood] = useState(false);
  const [exampleCounts, setExampleCounts] = useState<Record<string, number>>({});

  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /**
   * Bumped on every start/stop so a take whose getUserMedia was still pending
   * when the student cancelled can detect that it is stale and bail out
   * instead of starting an interval nobody is left to clear.
   */
  const recordTokenRef = useRef(0);
  /**
   * Synchronous "a take is running" flag. Two fast clicks are handled by the
   * same render, so the `isRecording` state cannot gate the second one.
   */
  const isTakeActiveRef = useRef(false);
  /** Mirrors the class being recorded, readable from handlers synchronously. */
  const recordingClassRef = useRef<string | null>(null);
  /** Frames of the take in progress; disposed here if the take is abandoned. */
  const framesRef = useRef<Array<{ feat: unknown; energy: number }>>([]);
  const pressRef = useRef<{ pressedAt: number; releasedAt: number | null } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Waveform visualiser
  useEffect(() => {
    if (!isMicOn) return;
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const waveform = audioTrainerEngine.getWaveform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = COLOR;
      ctx.lineWidth = 2;
      const sliceWidth = canvas.width / waveform.length;
      let x = 0;
      for (let i = 0; i < waveform.length; i++) {
        const v = waveform[i]! / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();
    };
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isMicOn]);

  const syncCounts = useCallback(() => {
    if (audioTrainerEngine.isInitialised) {
      setExampleCounts({ ...audioTrainerEngine.getExampleCounts() });
    }
  }, []);

  const audioModelLoaded = useAIStore((s) => s.audioModelLoaded);
  const savedAudioClasses = useAIStore((s) => s.savedAudioClasses);
  const setSavedProjectAI = useAIStore((s) => s.setSavedProjectAI);

  const isInitialMount = useRef(true);
  // Persist AUDIO class names only — never overwrite Image/Pose names.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSavedProjectAI({ audioClasses: classes });
  }, [classes, setSavedProjectAI]);

  // Sync from audio-specific store / engine. Never read Image class names.
  useEffect(() => {
    syncCounts();
    if (savedAudioClasses && savedAudioClasses.length > 0) {
      setClasses(savedAudioClasses);
    } else {
      setClasses(resolveAudioClasses());
    }
    // Mark trained only when a saved audio model was restored — not merely
    // because samples exist or Image was trained.
    setIsTrained(audioModelLoaded);
  }, [syncCounts, audioModelLoaded, savedAudioClasses]);

  const releaseFrames = useCallback(() => {
    for (const f of framesRef.current) (f.feat as { dispose: () => void }).dispose();
    framesRef.current = [];
  }, []);

  const handleStartMic = useCallback(async () => {
    setIsIniting(true);
    setError(null);
    try {
      if (!audioTrainerEngine.isInitialised) await audioTrainerEngine.init();
      // Force-resume (or recreate) the AudioContext under this user gesture so
      // Train / Input toggle always leaves the mic actually live.
      await audioTrainerEngine.forceResumeMic();
      setIsMicOn(true);
    } catch (e) {
      setError(`Mic error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsIniting(false);
    }
  }, []);

  const handleStopMic = useCallback(() => {
    // Abandon any take in flight — without the mic it would only bank silence.
    recordTokenRef.current += 1;
    isTakeActiveRef.current = false;
    recordingClassRef.current = null;
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    pressRef.current = null;
    releaseFrames();
    setIsRecording(null);
    setIsStartingRecord(null);
    setRecordElapsedMs(0);
    setRecordHolding(false);
    setRecordSamplesAdded(0);
    audioTrainerEngine.stopPredicting();
    audioTrainerEngine.stopMic();
    setIsMicOn(false);
    setListeningPaused(false);
    setIsTesting(false);
    setPrediction(null);
  }, [releaseFrames]);

  // Do NOT auto-start the mic on mount — browsers block getUserMedia /
  // AudioContext without a gesture, which left Input OFF until students
  // toggled it. Mic starts from Enable Mic, Input toggle, or Train.

  // Cleanup on unmount — also cancels an in-flight take so its interval (and
  // any start still waiting on getUserMedia) cannot outlive the component.
  useEffect(() => {
    return () => {
      recordTokenRef.current += 1;
      isTakeActiveRef.current = false;
      recordingClassRef.current = null;
      pressRef.current = null;
      releaseFrames();
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      audioTrainerEngine.stopPredicting();
      audioTrainerEngine.stopMic();
    };
  }, [releaseFrames]);

  const startListening = useCallback(() => {
    if (!audioTrainerEngine.isInitialised) return;
    audioTrainerEngine.stopPredicting();
    audioTrainerEngine.startPredicting((result) => {
      setPrediction({ label: result.label, confs: result.allConfidences });
    });
    setIsTesting(true);
  }, []);

  const stopListening = useCallback(() => {
    audioTrainerEngine.stopPredicting();
    setIsTesting(false);
    setPrediction(null);
  }, []);

  const canTest = classes.filter((c) => (exampleCounts[c] ?? 0) > 0).length >= 2;

  const invalidateAudioTraining = useCallback(() => {
    setIsTrained(false);
    useAIStore.getState().setAudioModelLoaded(false);
  }, []);

  // When model is trained and microphone is on, automatically keep listening active
  useEffect(() => {
    if (
      isTrained &&
      isMicOn &&
      !isRecording &&
      !isStartingRecord &&
      !isTesting &&
      !listeningPaused
    ) {
      startListening();
    }
  }, [
    isTrained,
    isMicOn,
    isRecording,
    isStartingRecord,
    isTesting,
    listeningPaused,
    startListening,
  ]);

  // If samples are deleted such that there are fewer than 2 classes with data, invalidate trained state
  useEffect(() => {
    if (isTrained && !canTest) {
      invalidateAudioTraining();
      stopListening();
    }
  }, [isTrained, canTest, stopListening, invalidateAudioTraining]);

  // ── Recording ─────────────────────────────────────────────────────────────
  // Ends a take: the fixed clip finished, the student tapped Stop, or the tab
  // is going away. Bumping the token also neutralises any pending start.
  const stopRecording = useCallback(() => {
    recordTokenRef.current += 1;
    isTakeActiveRef.current = false;
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    recordingClassRef.current = null;
    pressRef.current = null;
    releaseFrames();
    setIsRecording(null);
    setIsStartingRecord(null);
    setRecordElapsedMs(0);
    setRecordHolding(false);
    setRecordSamplesAdded(0);
  }, [releaseFrames]);

  /** The pointer / key was released. The take loop reads this on its next tick. */
  const handlePressEnd = useCallback(() => {
    const press = pressRef.current;
    if (press && press.releasedAt === null) press.releasedAt = Date.now();
  }, []);

  /**
   * Starts recording on press. A quick tap gives one RECORD_MS take (1 sample);
   * holding past HOLD_MS keeps recording until release and adds a sample for
   * every RECORD_MS of sound. A press while a take is running cancels it.
   */
  const handlePressStart = useCallback(
    async (className: string) => {
      if (isTakeActiveRef.current) {
        pressRef.current = null;
        stopRecording();
        return;
      }
      const press = { pressedAt: Date.now(), releasedAt: null as number | null };
      pressRef.current = press;
      isTakeActiveRef.current = true;
      recordingClassRef.current = className;
      const micWasOn = isMicOn;
      const token = recordTokenRef.current + 1;
      recordTokenRef.current = token;
      setError(null);
      setNotice(null);
      setIsStartingRecord(className);
      try {
        if (!audioTrainerEngine.isInitialised) await audioTrainerEngine.init();
        // Resume (or rebuild) the AudioContext under this click. A suspended
        // context reads as pure silence, which would bank a dead sample.
        await audioTrainerEngine.forceResumeMic();
      } catch (e) {
        if (token === recordTokenRef.current) {
          setError(`Mic error: ${e instanceof Error ? e.message : String(e)}`);
          stopRecording();
        }
        return;
      }
      // Cancelled (or unmounted) while the mic was warming up.
      if (token !== recordTokenRef.current) return;

      setIsMicOn(true);
      if (!micWasOn) {
        // First press only turns the microphone on: the student is probably
        // still looking at the browser's permission prompt.
        stopRecording();
        return;
      }
      if (audioTrainerEngine.isPredicting) audioTrainerEngine.stopPredicting();
      setIsTesting(false);
      setPrediction(null);
      // A new sample invalidates the trained model, same as before.
      invalidateAudioTraining();
      setIsStartingRecord(null);
      setIsRecording(className);
      setRecordElapsedMs(0);
      setRecordSamplesAdded(0);

      const startedAt = Date.now();
      const steady = className.toLowerCase().includes('background');
      let added = 0;
      framesRef.current = [];

      /** Turns the frames collected so far into ONE sample. */
      const flush = () => {
        const batch = framesRef.current;
        if (batch.length === 0) return;
        framesRef.current = []; // ownership passes to the engine
        if (audioTrainerEngine.addTakeExample(className, batch as never, steady)) {
          added += 1;
          setRecordSamplesAdded(added);
          syncCounts();
        }
      };

      const tick = () => {
        if (token !== recordTokenRef.current) return;
        const now = Date.now();
        let failed = false;
        let done = false;
        try {
          const frame = audioTrainerEngine.grabFrame();
          if (frame) framesRef.current.push(frame);
          if (framesRef.current.length >= FRAMES_PER_TAKE) flush();

          const released = press.releasedAt !== null;
          const heldMs = (press.releasedAt ?? now) - press.pressedAt;
          const isHold = heldMs >= HOLD_MS;
          setRecordHolding(!released && isHold);
          setRecordElapsedMs(now - startedAt);

          if (released && !isHold) {
            // A tap: exactly one RECORD_MS take.
            done = added >= 1;
          } else if (released || now - startedAt >= MAX_HOLD_MS) {
            // Hold ended (or hit the safety cap). Keep the last piece only if
            // it is long enough to mean something.
            const tail = framesRef.current.length;
            if (tail >= MIN_TAIL_FRAMES || (added === 0 && tail >= 3)) flush();
            done = true;
          } else if (!isHold && now - startedAt > RECORD_MS * 3) {
            done = true; // backstop for a take that never completes
          }
        } catch {
          failed = true;
          done = true;
        }
        if (done) {
          if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
          }
          stopRecording();
          syncCounts();
          if (failed) setError('Recording stopped unexpectedly. Try again.');
          else if (added === 0) {
            setError(
              `Nothing was recorded. Tap once to record ${RECORD_MS / 1000} seconds, or hold the button while you make the sound.`,
            );
          } else {
            setNotice(`Added ${added} sample${added === 1 ? '' : 's'}.`);
          }
        }
      };
      captureIntervalRef.current = setInterval(tick, SAMPLE_EVERY_MS);
    },
    [isMicOn, stopRecording, syncCounts, invalidateAudioTraining],
  );

  /**
   * Adds uploaded audio files to a class. Each file is decoded and cut into
   * RECORD_MS samples (see addSamplesFromAudioFile). Files that are not a
   * supported audio type are refused with a reason; the rest still go in.
   */
  const handleAudioUpload = useCallback(
    async (className: string, files: File[]) => {
      if (files.length === 0 || isTakeActiveRef.current || uploadingClass) return;
      setError(null);
      setNotice(null);
      setUploadingClass(className);
      const problems: string[] = [];
      let addedTotal = 0;
      let filesUsed = 0;
      let truncated = false;
      try {
        if (!audioTrainerEngine.isInitialised) await audioTrainerEngine.init();
        if (audioTrainerEngine.isPredicting) audioTrainerEngine.stopPredicting();
        setIsTesting(false);
        setPrediction(null);
        for (let i = 0; i < files.length; i++) {
          const file = files[i]!;
          setUploadProgress(`${i + 1} / ${files.length}`);
          const check = checkAudioFile(file);
          if (!check.ok) {
            problems.push(`"${file.name}" ${check.reason}`);
            continue;
          }
          try {
            const result = await audioTrainerEngine.addSamplesFromAudioFile(
              className,
              await file.arrayBuffer(),
              {
                takeMs: RECORD_MS,
                frameMs: SAMPLE_EVERY_MS,
                maxTakes: MAX_FILE_TAKES,
                steady: className.toLowerCase().includes('background'),
              },
            );
            addedTotal += result.added;
            if (result.added > 0) filesUsed += 1;
            if (result.truncated) truncated = true;
          } catch {
            problems.push(
              `"${file.name}" could not be read as audio (it may be damaged, or this browser cannot decode it)`,
            );
          }
        }
      } catch (e) {
        problems.push(e instanceof Error ? e.message : String(e));
      } finally {
        syncCounts();
        if (addedTotal > 0) invalidateAudioTraining();
        setUploadingClass(null);
        setUploadProgress('');
      }
      if (problems.length > 0) {
        const shown = problems.slice(0, 3).join('. ');
        setError(problems.length > 3 ? `${shown} (+${problems.length - 3} more)` : shown);
      }
      if (addedTotal > 0) {
        setNotice(
          `Added ${addedTotal} sample${addedTotal === 1 ? '' : 's'} from ${filesUsed} file${filesUsed === 1 ? '' : 's'}.` +
            (truncated
              ? ` Only the first ${(MAX_FILE_TAKES * RECORD_MS) / 1000} seconds of a long file are used.`
              : ''),
        );
      }
    },
    [uploadingClass, syncCounts, invalidateAudioTraining],
  );

  const handleToggleTest = useCallback(() => {
    if (!isMicOn) return;
    if (isTesting) {
      setListeningPaused(true);
      stopListening();
    } else {
      setListeningPaused(false);
      startListening();
    }
  }, [isMicOn, isTesting, stopListening, startListening]);

  const CLASS_COLORS = ['#f59e0b', '#e11d48', '#10b981', '#6366f1', '#0ea5e9', '#a855f7'];
  const totalSamples = classes.reduce((sum, c) => sum + (exampleCounts[c] ?? 0), 0);
  // Progressive reveal, same as the Image tab: Training appears once there is
  // something to train on, and Preview only once a model is trained. The mic
  // is switched on from the class's own Record button, so Preview is not
  // needed for recording. It stays mounted (just hidden) so its waveform
  // canvas exists when the mic starts.
  const showTraining = totalSamples > 0;
  const showPreview = isTrained;
  const gridCols =
    showTraining && showPreview
      ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px_340px]'
      : showTraining
        ? 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px]'
        : 'grid-cols-[minmax(0,1fr)]';

  const card =
    'bg-white dark:bg-[#1b1b33] rounded-xl shadow-[0_2px_12px_rgba(20,20,40,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)] border border-slate-100 dark:border-white/5';
  const muted = 'text-slate-500 dark:text-white/50';
  const tile =
    'flex flex-col items-center justify-center gap-1.5 w-20 h-[72px] shrink-0 rounded-xl border border-[#FF6F61]/20 dark:border-[#FF6F61]/20 bg-[#FFEDEA] dark:bg-[#FF6F61]/15 text-[#FF6F61] dark:text-[#FFAB9E] hover:bg-[#FFDDD6] dark:hover:bg-[#FF6F61]/25 hover:border-[#FF6F61]/40 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all';
  const primaryBtn =
    'bg-gradient-to-b from-[#FF7A6D] to-[#FF6F61] text-white shadow-[0_3px_10px_-2px_rgba(255,111,97,0.55)] hover:shadow-[0_5px_16px_-2px_rgba(255,111,97,0.65)] hover:-translate-y-0.5 active:translate-y-0 disabled:bg-none disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-white/30 transition-all';
  const grayBtn =
    'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white/80 transition-colors';

  // If a class is named background noise, it needs 20 samples; otherwise standard 8.
  const minSamples = (name: string) => (name.toLowerCase().includes('background') ? 20 : 8);

  // Only one take at a time: every class reads the same shared analyser, so
  // two takes at once would bank identical frames into both classes.
  const recordingClass = isRecording ?? isStartingRecord;
  const RECORD_SECONDS_LABEL = (RECORD_MS / 1000).toFixed(RECORD_MS % 1000 === 0 ? 0 : 1);

  const handleRenameClass = useCallback(
    (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) {
        setEditingClass(null);
        return;
      }
      if (classes.includes(trimmed)) {
        setError(`A class named "${trimmed}" already exists.`);
        setEditingClass(null);
        return;
      }
      // A take in flight captures into the *old* label (its loop closed over
      // the name), so renaming mid-take would scatter one class's samples
      // across two names. End the take first and keep what it already got.
      if (recordingClassRef.current === oldName) stopRecording();
      if (!audioTrainerEngine.isInitialised) {
        void audioTrainerEngine.init().then(() => {
          audioTrainerEngine.renameClass(oldName, trimmed);
        });
      } else {
        audioTrainerEngine.renameClass(oldName, trimmed);
      }
      const nextClasses = classes.map((c) => (c === oldName ? trimmed : c));
      setClasses(nextClasses);
      setSavedProjectAI({ audioClasses: nextClasses });
      if (isRecording === oldName) setIsRecording(trimmed);
      setEditingClass(null);
      // Renaming does not invalidate the model — only sample changes do.
      syncCounts();
    },
    [classes, isRecording, setSavedProjectAI, syncCounts, stopRecording],
  );

  const handleTrain = async () => {
    // The audio model learns as you record, so training confirms there is enough data
    // and automatically starts live listening in the Preview panel.
    if (canTest) {
      setIsTrained(true);
      // Persist trained flag so remounting Audio after leaving the tab keeps
      // "Model Trained" instead of resetting to untrained.
      useAIStore.getState().setAudioModelLoaded(true);
      void confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#FF6F61', '#E8584A', '#FFAB9E', '#ffffff'],
      });
      // Always force-resume (or recreate) the mic on the Train click so a
      // suspended AudioContext from an earlier auto-start gets a fresh gesture.
      try {
        if (!audioTrainerEngine.isInitialised) await audioTrainerEngine.init();
        await audioTrainerEngine.forceResumeMic();
        setIsMicOn(true);
      } catch (e) {
        setError(`Mic error: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
      startListening();
    }
  };

  return (
    <div className="flex-1 flex justify-center items-stretch py-4 px-3 sm:py-10 sm:px-6 min-h-[calc(100vh-96px)]">
      <div className={`w-full max-w-[1400px] grid ${gridCols} gap-5 md:gap-9 items-stretch`}>
        {/* ── Classes ── */}
        <section className="min-w-0 flex flex-col gap-5">
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100">
            <p className="font-semibold">💡 Tips for a smarter sound model</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>
                The computer learns from the sounds you record. If only <b>one person</b> records,
                it will mostly understand <b>that person</b>.
              </li>
              <li>
                Ask friends or family to record the same sounds too, so it learns many voices.
              </li>
              <li>Record near and far from the mic, and loud and soft.</li>
              <li>Record about 20 samples for each sound. More samples means better guesses.</li>
              <li>
                Add a <b>Background Noise</b> class and record the quiet room, so it knows when
                nobody is making a sound.
              </li>
            </ul>
          </div>
          {classes.map((className, classIdx) => {
            const count = exampleCounts[className] ?? 0;
            const needed = minSamples(className);
            const classColor = CLASS_COLORS[classIdx % CLASS_COLORS.length];
            const isBusyElsewhere =
              (recordingClass !== null && recordingClass !== className) ||
              (uploadingClass !== null && uploadingClass !== className);
            const isUploadingHere = uploadingClass === className;
            return (
              <div
                key={className}
                className={`${card} overflow-hidden border-l-[5px]`}
                style={{ borderLeftColor: classColor }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: classColor }}
                    />
                    {editingClass === className ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleRenameClass(className, editingValue);
                        }}
                        className="flex items-center gap-1.5 min-w-0"
                      >
                        <input
                          autoFocus
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={(e) => {
                            // Ignore blur caused by clicking the Save button inside the form.
                            const next = e.relatedTarget as HTMLElement | null;
                            if (next && e.currentTarget.form?.contains(next)) return;
                            handleRenameClass(className, editingValue);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleRenameClass(className, editingValue);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingClass(null);
                            }
                          }}
                          className="font-heading font-semibold text-lg md:text-xl bg-white dark:bg-[#1b1b33] px-2 py-0.5 rounded border border-[#FF6F61] outline-none text-slate-800 dark:text-white min-w-0"
                        />
                        <button
                          type="submit"
                          className="p-1 rounded text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 shrink-0"
                          title="Save name"
                        >
                          <Check size={16} />
                        </button>
                      </form>
                    ) : (
                      <div
                        className="flex items-center gap-2 min-w-0 cursor-pointer group/title"
                        onClick={() => {
                          setEditingClass(className);
                          setEditingValue(className);
                        }}
                        title="Click to rename"
                      >
                        <span className="font-heading font-semibold text-xl text-slate-800 dark:text-white truncate">
                          {className}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClass(className);
                            setEditingValue(className);
                          }}
                          title="Rename class"
                          className="p-1 rounded text-slate-400 group-hover/title:text-slate-700 dark:group-hover/title:text-white hover:text-slate-600 transition-colors shrink-0"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuClass(menuClass === className ? null : className)}
                      title="Class options"
                      className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {menuClass === className && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuClass(null)} />
                        <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg bg-white dark:bg-[#24244a] shadow-lg border border-slate-200 dark:border-white/10 py-1">
                          <button
                            onClick={() => {
                              setMenuClass(null);
                              setEditingClass(className);
                              setEditingValue(className);
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 text-slate-700 dark:text-white/80"
                          >
                            <Pencil size={13} className="text-slate-400" />
                            Rename class
                          </button>
                          <button
                            disabled={count === 0}
                            onClick={() => {
                              setMenuClass(null);
                              if (recordingClass === className) stopRecording();
                              audioTrainerEngine.clearClass(className);
                              invalidateAudioTraining();
                              syncCounts();
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40"
                          >
                            Delete all recordings
                            <span className={`block text-xs ${muted}`}>{count} recordings</span>
                          </button>
                          <button
                            disabled={classes.length <= 2}
                            onClick={() => {
                              setMenuClass(null);
                              if (recordingClass === className) stopRecording();
                              audioTrainerEngine.clearClass(className);
                              setClasses((p) => p.filter((c) => c !== className));
                              invalidateAudioTraining();
                              syncCounts();
                            }}
                            className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40"
                          >
                            Delete this class
                            <span className={`block text-xs ${muted}`}>
                              {classes.length <= 2
                                ? 'You need at least 2 classes'
                                : 'Removes the class and its recordings'}
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className={`text-sm ${muted}`}>
                    {count === 0
                      ? `Add Audio Samples (${needed} minimum):`
                      : `${count} Audio Samples`}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        // Keep receiving pointerup even if the finger/mouse drifts off.
                        e.currentTarget.setPointerCapture?.(e.pointerId);
                        void handlePressStart(className);
                      }}
                      onPointerUp={handlePressEnd}
                      onPointerCancel={handlePressEnd}
                      onKeyDown={(e) => {
                        // Keyboard users: Enter / Space is a tap.
                        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                          e.preventDefault();
                          void handlePressStart(className);
                          handlePressEnd();
                        }
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                      disabled={isIniting || isBusyElsewhere}
                      title={
                        isRecording === className
                          ? recordHolding
                            ? 'Release to stop'
                            : 'Press again to cancel this recording'
                          : isMicOn
                            ? `Tap: record ${RECORD_SECONDS_LABEL}s (1 sample). Hold: keep recording.`
                            : 'Click to turn on your microphone'
                      }
                      className={`${tile} select-none touch-none ${isRecording === className ? '!bg-red-500 !text-white !border-red-500' : ''}`}
                    >
                      {isRecording === className ? <Square size={18} /> : <Mic size={20} />}
                      <span className="text-[11px] font-medium tabular-nums">
                        {isRecording === className
                          ? `${(recordElapsedMs / 1000).toFixed(1)}s`
                          : isStartingRecord === className
                            ? 'Starting…'
                            : isMicOn
                              ? 'Record'
                              : 'Enable Mic'}
                      </span>
                    </button>
                    <button
                      onClick={() => fileInputRefs.current[className]?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (isBusyElsewhere || isUploadingHere || isRecording) return;
                        void handleAudioUpload(className, Array.from(e.dataTransfer.files));
                      }}
                      disabled={isIniting || isBusyElsewhere || isUploadingHere || !!recordingClass}
                      title={`Upload audio (${supportedAudioLabels()}). Long files are cut into ${RECORD_MS / 1000}-second samples.`}
                      className={`${tile} select-none`}
                    >
                      <Upload size={20} />
                      <span className="text-[11px] font-medium tabular-nums">
                        {isUploadingHere ? uploadProgress || '…' : 'Upload'}
                      </span>
                    </button>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[className] = el;
                      }}
                      type="file"
                      accept={audioAcceptAttribute()}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files ?? []);
                        e.target.value = '';
                        if (picked.length) void handleAudioUpload(className, picked);
                      }}
                    />
                    <div className="flex-1 min-w-0 text-xs text-slate-500 dark:text-white/50">
                      {isRecording === className ? (
                        <>
                          {recordHolding
                            ? `Recording — release to stop. ${recordSamplesAdded} sample${recordSamplesAdded === 1 ? '' : 's'} added so far.`
                            : `Say or make the sound now — recording 1 sample.`}
                          <span className="mt-1.5 block h-1 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                            <span
                              className="block h-full bg-[#FF6F61] transition-[width] duration-100 ease-linear"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    Math.round(
                                      ((recordElapsedMs - recordSamplesAdded * RECORD_MS) /
                                        RECORD_MS) *
                                        100,
                                    ),
                                  ),
                                )}%`,
                              }}
                            />
                          </span>
                        </>
                      ) : isStartingRecord === className ? (
                        'Starting microphone…'
                      ) : isUploadingHere ? (
                        'Reading your audio file…'
                      ) : isBusyElsewhere ? (
                        `Busy with "${recordingClass ?? uploadingClass}" — finish that first.`
                      ) : isMicOn ? (
                        `Tap to record ${RECORD_SECONDS_LABEL} seconds (1 sample), or hold the button to keep recording — every ${RECORD_SECONDS_LABEL} seconds is a sample. You can also upload audio.`
                      ) : (
                        'Turn on your microphone, then tap to record — or upload an audio file.'
                      )}
                      {count > 0 && count < needed && isRecording !== className && (
                        <p className="mt-1 text-amber-600 dark:text-amber-400">
                          Record {needed - count} more to reach the minimum.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => {
              let nextNum = classes.length + 1;
              let nextName = `Class ${nextNum}`;
              while (classes.includes(nextName)) {
                nextNum++;
                nextName = `Class ${nextNum}`;
              }
              const next = [...classes, nextName];
              setClasses(next);
              setSavedProjectAI({ audioClasses: next });
            }}
            className="w-full py-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/15 text-slate-500 dark:text-white/50 text-base flex items-center justify-center gap-2 hover:border-[#FF6F61] hover:text-[#FF6F61] hover:bg-[#FFEDEA]/50 dark:hover:bg-[#FF6F61]/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Plus size={18} /> Add a class
          </button>
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                stopRecording();
                audioTrainerEngine.clearAll();
                stopListening();
                setClasses([...DEFAULT_AUDIO_CLASSES]);
                setSavedProjectAI({ audioClasses: [...DEFAULT_AUDIO_CLASSES] });
                useAIStore.getState().setAudioModelLoaded(false);
                setIsTrained(false);
                syncCounts();
              }}
              className={`text-xs font-medium px-3 py-1.5 rounded-md hover:text-red-500 hover:bg-red-500/10 transition-colors ${muted}`}
            >
              Start over
            </button>
          </div>

          {!showTraining && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <RobotMascot className="w-24 opacity-90" />
              <p className={`text-sm max-w-xs ${muted}`}>
                Record a few sounds for each class. Once you have some, I&apos;ll help you train it!
                🎉
              </p>
            </div>
          )}
        </section>

        {/* ── Training ── */}
        {showTraining && (
          <section className="flex flex-col pt-1 h-full animate-pop-in">
            <div className={`${card} p-5 flex-1 flex flex-col gap-4`}>
              <h2 className="text-lg font-semibold">Training</h2>
              <button
                onClick={() => void handleTrain()}
                disabled={!canTest || isTrained}
                className={`w-full py-2 rounded-md text-sm font-semibold ${isTrained ? grayBtn : primaryBtn}`}
              >
                {isTrained ? 'Model Trained' : 'Train Model'}
              </button>
              <p className={`text-xs leading-relaxed ${muted}`}>
                {isTrained
                  ? 'Your sounds were learned as you recorded them. Try them in the Preview.'
                  : canTest
                    ? 'Press Train Model when every class has enough sounds.'
                    : 'Record sounds for at least 2 classes first.'}
              </p>
              <div className="border-t border-slate-100 dark:border-white/10 pt-3">
                <button
                  onClick={() => setShowHood((v) => !v)}
                  className="w-full flex items-center justify-between text-sm font-medium text-slate-700 dark:text-white/80"
                >
                  <span className="flex items-center gap-1.5">
                    <Info size={14} /> How does this work?
                  </span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform ${showHood ? 'rotate-180' : ''}`}
                  />
                </button>
                {showHood && (
                  <p className={`text-xs leading-relaxed mt-2 ${muted}`}>
                    Your computer listens to each sound and remembers how it sounds. When it hears
                    something new, it picks the class with the most similar sounds. Nothing is
                    uploaded: sounds stay on this computer.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Preview ── */}
        <section className={`flex flex-col pt-1 h-full ${showPreview ? '' : 'hidden'}`}>
          <div className={`${card} overflow-hidden h-full flex flex-col`}>
            <div className="px-5 py-4">
              <h2 className="text-lg font-semibold">Preview</h2>
            </div>
            <div className="px-5 pb-4 space-y-3 border-t border-slate-100 dark:border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-white/80">Input</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => (isMicOn ? handleStopMic() : void handleStartMic())}
                    disabled={isIniting}
                    title={isMicOn ? 'Turn microphone off' : 'Turn microphone on'}
                    className={`relative w-9 h-5 rounded-full transition-colors ${isMicOn ? 'bg-[#FF6F61]' : 'bg-slate-300 dark:bg-white/20'}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isMicOn ? 'left-[18px]' : 'left-0.5'}`}
                    />
                  </button>
                  <span className={`text-xs font-medium ${muted}`}>
                    {isIniting ? 'Starting…' : isMicOn ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
              <div className="relative h-24 rounded-md bg-slate-900 overflow-hidden flex items-center justify-center">
                {isMicOn ? (
                  <canvas ref={canvasRef} width={400} height={200} className="w-full h-full" />
                ) : (
                  <Mic size={24} className="text-white/30" />
                )}
                {isRecording && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-semibold tabular-nums">
                    Recording: {isRecording} · {(recordElapsedMs / 1000).toFixed(1)}s
                  </div>
                )}
              </div>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              {notice && !error && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{notice}</p>
              )}
              {isMicOn && isTrained && (
                <button
                  onClick={handleToggleTest}
                  className={`w-full py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 ${
                    isTesting
                      ? 'bg-red-500 text-white'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isTesting ? <Square size={12} /> : <Play size={12} />}
                  {isTesting ? 'Stop listening' : 'Start listening'}
                </button>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 dark:border-white/10 space-y-3">
              <span className="text-sm font-medium text-slate-700 dark:text-white/80">Output</span>
              {!isTesting || !prediction ? (
                <p className={`text-xs ${muted}`}>
                  {isTrained
                    ? isMicOn
                      ? 'Listening to microphone…'
                      : 'Turn on the microphone in Preview to see what it hears.'
                    : 'You must train a model before you can preview it here.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {prediction.label === '' && (
                    <p className={`text-xs ${muted}`}>No sound heard — make a sound to test.</p>
                  )}
                  {classes.map((label, idx) => {
                    const conf = prediction.confs[label] ?? 0;
                    const color = CLASS_COLORS[idx % CLASS_COLORS.length]!;
                    return (
                      <div
                        key={label}
                        className={`relative h-9 rounded-md bg-slate-50 dark:bg-white/5 overflow-hidden flex items-center px-3 ${
                          label === prediction.label ? 'ring-2 ring-[#FF6F61]' : ''
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0"
                          style={{ width: `${conf}%`, backgroundColor: color, opacity: 0.25 }}
                        />
                        <span className="relative text-sm font-semibold" style={{ color }}>
                          {label}
                        </span>
                        <span className="relative ml-auto text-xs font-semibold" style={{ color }}>
                          {conf}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
