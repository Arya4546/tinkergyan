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
} from 'lucide-react';
import { audioTrainerEngine } from '../../lib/audio-trainer-engine';
import { useAIStore } from '../../stores/ai.store';
import { RobotMascot } from '../illustrations/RobotMascot';

const COLOR = '#FF6F61';

export function AudioTrainerTab() {
  const [classes, setClasses] = useState<string[]>(() => {
    const savedTab = useAIStore.getState().savedTab;
    const saved = savedTab === 'audio' ? useAIStore.getState().savedClasses : null;
    if (saved && saved.length > 0) return saved;
    const existing = audioTrainerEngine.isInitialised
      ? Object.keys(audioTrainerEngine.getExampleCounts())
      : [];
    return existing.length > 0 ? existing : ['Class 1', 'Class 2'];
  });
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isIniting, setIsIniting] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [prediction, setPrediction] = useState<{
    label: string;
    confs: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTrained, setIsTrained] = useState(false);
  const [menuClass, setMenuClass] = useState<string | null>(null);
  const [showHood, setShowHood] = useState(false);
  const [exampleCounts, setExampleCounts] = useState<Record<string, number>>({});

  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
  const savedTab = useAIStore((s) => s.savedTab);
  const savedClasses = useAIStore((s) => s.savedClasses);
  const setSavedProjectAI = useAIStore((s) => s.setSavedProjectAI);

  const isInitialMount = useRef(true);
  // Keep savedClasses in sync for saving
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSavedProjectAI({ tab: 'audio', classes });
  }, [classes, setSavedProjectAI]);

  // Sync counts and classes on mount and when restored
  useEffect(() => {
    syncCounts();
    if (savedTab === 'audio' && savedClasses && savedClasses.length > 0) {
      setClasses(savedClasses);
      const counts = audioTrainerEngine.isInitialised ? audioTrainerEngine.getExampleCounts() : {};
      const trainedCount = savedClasses.filter((c) => (counts[c] ?? 0) > 0).length;
      if (trainedCount >= 2) {
        setIsTrained(true);
      }
    }
  }, [syncCounts, audioModelLoaded, savedTab, savedClasses]);

  const handleStartMic = useCallback(async () => {
    setIsIniting(true);
    setError(null);
    try {
      if (!audioTrainerEngine.isInitialised) await audioTrainerEngine.init();
      await audioTrainerEngine.startMic();
      setIsMicOn(true);
    } catch (e) {
      setError(`Mic error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsIniting(false);
    }
  }, []);

  const handleStopMic = useCallback(() => {
    audioTrainerEngine.stopPredicting();
    audioTrainerEngine.stopMic();
    setIsMicOn(false);
    setIsTesting(false);
    setPrediction(null);
  }, []);

  // Attempt to auto-start microphone on mount so students can record sounds immediately
  useEffect(() => {
    void handleStartMic();
  }, [handleStartMic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioTrainerEngine.stopPredicting();
      audioTrainerEngine.stopMic();
    };
  }, []);

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

  // When model is trained and microphone is on, automatically keep listening active
  useEffect(() => {
    if (isTrained && isMicOn && !isRecording && !isTesting) {
      startListening();
    }
  }, [isTrained, isMicOn, isRecording, isTesting, startListening]);

  // If samples are deleted such that there are fewer than 2 classes with data, invalidate trained state
  useEffect(() => {
    if (isTrained && !canTest) {
      setIsTrained(false);
      stopListening();
    }
  }, [isTrained, canTest, stopListening]);

  const handleCaptureStart = useCallback(
    async (className: string) => {
      if (!isMicOn) {
        await handleStartMic();
      }
      if (audioTrainerEngine.isPredicting) {
        audioTrainerEngine.stopPredicting();
      }
      setIsRecording(className);
      const capture = () => {
        audioTrainerEngine.captureExample(className);
        syncCounts();
      };
      capture();
      captureIntervalRef.current = setInterval(capture, 200);
    },
    [isMicOn, handleStartMic, syncCounts],
  );

  const handleCaptureStop = useCallback(() => {
    setIsRecording(null);
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (isTrained && isMicOn) {
      startListening();
    }
  }, [isTrained, isMicOn, startListening]);

  const handleToggleTest = useCallback(() => {
    if (!isMicOn) return;
    if (isTesting) {
      stopListening();
    } else {
      startListening();
    }
  }, [isMicOn, isTesting, stopListening, startListening]);

  const CLASS_COLORS = ['#f59e0b', '#e11d48', '#10b981', '#6366f1', '#0ea5e9', '#a855f7'];
  const totalSamples = classes.reduce((sum, c) => sum + (exampleCounts[c] ?? 0), 0);
  // Progressive reveal — don't show Training until there is something to train
  // on. Preview can't be hidden the same way: it's not just a test panel here,
  // it's where the one shared microphone gets turned on, and every class's
  // record button is disabled until that happens. Hiding it before training
  // would mean there's no way to ever record a first sample.
  const showTraining = totalSamples > 0;
  const gridCols = showTraining
    ? 'grid-cols-[minmax(0,1fr)_280px_340px]'
    : 'grid-cols-[minmax(0,1fr)_340px]';

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

  const handleRenameClass = useCallback(
    (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;
      if (classes.includes(trimmed)) return;
      audioTrainerEngine.renameClass(oldName, trimmed);
      const nextClasses = classes.map((c) => (c === oldName ? trimmed : c));
      setClasses(nextClasses);
      setSavedProjectAI({ tab: 'audio', classes: nextClasses });
      if (isRecording === oldName) setIsRecording(trimmed);
      syncCounts();
    },
    [classes, isRecording, setSavedProjectAI, syncCounts],
  );

  const handleTrain = async () => {
    // The audio model learns as you record, so training confirms there is enough data
    // and automatically starts live listening in the Preview panel.
    if (canTest) {
      setIsTrained(true);
      void confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#FF6F61', '#E8584A', '#FFAB9E', '#ffffff'],
      });
      if (!isMicOn) {
        await handleStartMic();
      }
      startListening();
    }
  };

  return (
    <div className="flex-1 flex justify-center items-stretch py-10 px-6 min-h-[calc(100vh-96px)]">
      <div className={`w-full max-w-[1400px] grid ${gridCols} gap-9 items-stretch`}>
        {/* ── Classes ── */}
        <section className="min-w-0 flex flex-col gap-5">
          {classes.map((className, classIdx) => {
            const count = exampleCounts[className] ?? 0;
            const needed = minSamples(className);
            const classColor = CLASS_COLORS[classIdx % CLASS_COLORS.length];
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
                          setEditingClass(null);
                        }}
                        className="flex items-center gap-1.5 min-w-0"
                      >
                        <input
                          autoFocus
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => {
                            handleRenameClass(className, editingValue);
                            setEditingClass(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
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
                              audioTrainerEngine.clearClass(className);
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
                              audioTrainerEngine.clearClass(className);
                              setClasses((p) => p.filter((c) => c !== className));
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
                      onClick={async () => {
                        if (!isMicOn) await handleStartMic();
                      }}
                      onMouseDown={() => void handleCaptureStart(className)}
                      onMouseUp={handleCaptureStop}
                      onMouseLeave={handleCaptureStop}
                      onTouchStart={() => void handleCaptureStart(className)}
                      onTouchEnd={handleCaptureStop}
                      disabled={isIniting}
                      title={isMicOn ? 'Hold to record' : 'Click to enable microphone'}
                      className={`${tile} select-none ${isRecording === className ? '!bg-red-500 !text-white' : ''}`}
                    >
                      <Mic size={20} />
                      <span className="text-[11px] font-medium">
                        {isRecording === className
                          ? 'Recording…'
                          : isIniting
                            ? 'Starting…'
                            : isMicOn
                              ? 'Mic'
                              : 'Enable Mic'}
                      </span>
                    </button>
                    <div className="flex-1 min-w-0 text-xs text-slate-500 dark:text-white/50">
                      {isRecording === className
                        ? 'Keep holding while you make the sound.'
                        : isIniting
                          ? 'Starting microphone…'
                          : isMicOn
                            ? 'Hold the Mic button and make the sound.'
                            : 'Click Enable Mic to turn on your microphone.'}
                      {count > 0 && count < needed && (
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
              setSavedProjectAI({ tab: 'audio', classes: next });
            }}
            className="w-full py-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/15 text-slate-500 dark:text-white/50 text-base flex items-center justify-center gap-2 hover:border-[#FF6F61] hover:text-[#FF6F61] hover:bg-[#FFEDEA]/50 dark:hover:bg-[#FF6F61]/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Plus size={18} /> Add a class
          </button>
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                audioTrainerEngine.clearAll();
                stopListening();
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
                onClick={handleTrain}
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
        <section className="flex flex-col pt-1 h-full">
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
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                    Recording: {isRecording}
                  </div>
                )}
              </div>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
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
