/**
 * PoseTrainerTab.tsx
 *
 * UI for the custom pose training tab in AI Model Studio.
 * Students hold a pose, click to capture frames, train a KNN on
 * 17-keypoint feature vectors, and test live predictions.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Plus,
  MoreVertical,
  Pencil,
  ChevronDown,
  Info,
  PersonStanding,
  Play,
  Square,
  Camera,
} from 'lucide-react';
import { poseTrainerEngine } from '../../lib/pose-trainer-engine';
import { RobotMascot } from '../illustrations/RobotMascot';
import { aiEngine } from '../../lib/ai-engine';

const COLOR = '#FF6F61';

// Skeleton connections for the 17-keypoint MoveNet model
const SKELETON_PAIRS = [
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10], // arms
  [5, 6],
  [5, 11],
  [6, 12],
  [11, 12], // torso
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16], // legs
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4], // face
] as [number, number][];

export function PoseTrainerTab() {
  const [classes, setClasses] = useState<string[]>(() => {
    const existing = poseTrainerEngine.isInitialised
      ? Object.keys(poseTrainerEngine.getExampleCounts())
      : [];
    return existing.length > 0 ? existing : ['Class 1', 'Class 2'];
  });
  const [newClassName, setNewClassName] = useState('');
  const [isIniting, setIsIniting] = useState(false);
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [prediction, setPrediction] = useState<{
    label: string;
    confs: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTrained, setIsTrained] = useState(false);
  const [menuClass, setMenuClass] = useState<string | null>(null);
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [showHood, setShowHood] = useState(false);
  const [exampleCounts, setExampleCounts] = useState<Record<string, number>>({});
  const [latestKeypoints, setLatestKeypoints] = useState<
    Array<{ x: number; y: number; score: number }>
  >([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const syncCounts = useCallback(() => {
    if (poseTrainerEngine.isInitialised) {
      setExampleCounts({ ...poseTrainerEngine.getExampleCounts() });
    }
  }, []);

  // Sync counts on mount
  useEffect(() => {
    syncCounts();
  }, [syncCounts]);

  // Draw skeleton overlay on canvas
  useEffect(() => {
    const drawSkeleton = () => {
      animFrameRef.current = requestAnimationFrame(drawSkeleton);
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || !isWebcamOn) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (latestKeypoints.length === 0) return;

      // Draw connections
      ctx.strokeStyle = COLOR;
      ctx.lineWidth = 2;
      for (const [a, b] of SKELETON_PAIRS) {
        const kpA = latestKeypoints[a];
        const kpB = latestKeypoints[b];
        if (!kpA || !kpB || (kpA.score ?? 0) < 0.3 || (kpB.score ?? 0) < 0.3) continue;
        ctx.beginPath();
        ctx.moveTo(kpA.x * canvas.width, kpA.y * canvas.height);
        ctx.lineTo(kpB.x * canvas.width, kpB.y * canvas.height);
        ctx.stroke();
      }

      // Draw keypoints
      for (const kp of latestKeypoints) {
        if ((kp.score ?? 0) < 0.3) continue;
        ctx.beginPath();
        ctx.arc(kp.x * canvas.width, kp.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
      }
    };
    if (isWebcamOn) {
      animFrameRef.current = requestAnimationFrame(drawSkeleton);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isWebcamOn, latestKeypoints]);

  const handleStartWebcam = useCallback(async () => {
    setIsIniting(true);
    setError(null);
    try {
      if (!aiEngine.isInitialised) {
        await aiEngine.init();
      }
      // Expose the shared detector to the pose trainer
      const sharedDetector = (aiEngine as any).poseDetector;
      await poseTrainerEngine.init(sharedDetector);

      if (videoRef.current) {
        await aiEngine.startWebcam(videoRef.current);
        setIsWebcamOn(true);
        poseTrainerEngine.startTracking(videoRef.current, (keypoints) => {
          setLatestKeypoints(keypoints);
        });
      }
    } catch (e) {
      setError(`Webcam error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsIniting(false);
    }
  }, []);

  const handleStopWebcam = useCallback(() => {
    poseTrainerEngine.stopPredicting();
    poseTrainerEngine.stopTracking();
    aiEngine.stopWebcam();
    setIsWebcamOn(false);
    setIsTesting(false);
    setPrediction(null);
    setLatestKeypoints([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      poseTrainerEngine.stopPredicting();
      poseTrainerEngine.stopTracking();
      if (aiEngine.isWebcamActive) {
        aiEngine.stopWebcam();
      }
    };
  }, []);

  const handleCaptureStart = useCallback(
    (className: string) => {
      if (!isWebcamOn || !videoRef.current) return;
      setIsCapturing(className);
      const capture = async () => {
        if (!videoRef.current) return;
        const success = await poseTrainerEngine.captureFrame(videoRef.current, className);
        if (success) syncCounts();
      };
      void capture();
      captureIntervalRef.current = setInterval(() => void capture(), 200);
    },
    [isWebcamOn, syncCounts],
  );

  const handleCaptureStop = useCallback(() => {
    setIsCapturing(null);
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  const handleToggleTest = useCallback(() => {
    if (!isWebcamOn || !videoRef.current) return;
    if (isTesting) {
      poseTrainerEngine.stopPredicting();
      setIsTesting(false);
      setPrediction(null);
    } else {
      poseTrainerEngine.startPredicting(videoRef.current, (result) => {
        setPrediction({ label: result.label, confs: result.allConfidences });
      });
      setIsTesting(true);
    }
  }, [isWebcamOn, isTesting]);

  const CLASS_COLORS = ['#f59e0b', '#e11d48', '#10b981', '#6366f1', '#0ea5e9', '#a855f7'];
  const canTest = classes.filter((c) => (exampleCounts[c] ?? 0) > 0).length >= 2;
  const totalSamples = classes.reduce((sum, c) => sum + (exampleCounts[c] ?? 0), 0);
  // Progressive reveal — don't show Training until there is something to train
  // on. Preview stays visible even with zero samples: its camera picker and
  // on/off switch are shared across every class, so hiding the panel would
  // hide the only way to turn the webcam on in the first place.
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
    'bg-gradient-to-b from-[#FF7A6D] to-[#FF6F61] text-white shadow-[0_3px_10px_-2px_rgba(255,111,97,0.55)] hover:shadow-[0_5px_16px_-2px_rgba(255,111,97,0.65)] hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none disabled:translate-y-0 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-white/30 transition-all';
  const grayBtn =
    'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white/80 transition-colors';

  const handleTrain = () => {
    // The pose model learns as you record, so training only confirms there is enough data.
    if (canTest) {
      setIsTrained(true);
      void confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#FF6F61', '#E8584A', '#FFAB9E', '#ffffff'],
      });
    }
  };

  return (
    <div className="flex-1 flex justify-center items-stretch py-10 px-6 min-h-[calc(100vh-96px)]">
      <div className={`w-full max-w-[1400px] grid ${gridCols} gap-9 items-stretch`}>
        {/* ── Classes ── */}
        <section className="min-w-0 flex flex-col gap-5">
          {classes.map((className, classIdx) => {
            const count = exampleCounts[className] ?? 0;
            const isOpen = openClass === className;
            const classColor = CLASS_COLORS[classIdx % CLASS_COLORS.length];
            return (
              <div
                key={className}
                className={`${card} overflow-hidden border-l-[5px]`}
                style={{ borderLeftColor: classColor }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: classColor }}
                    />
                    <span className="font-heading font-semibold text-xl truncate">{className}</span>
                    <Pencil size={14} className="text-slate-400 shrink-0" />
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
                            disabled={count === 0}
                            onClick={() => {
                              setMenuClass(null);
                              poseTrainerEngine.clearClass(className);
                              syncCounts();
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40"
                          >
                            Delete all poses
                            <span className={`block text-xs ${muted}`}>{count} poses</span>
                          </button>
                          <button
                            disabled={classes.length <= 2}
                            onClick={() => {
                              setMenuClass(null);
                              poseTrainerEngine.clearClass(className);
                              setClasses((p) => p.filter((c) => c !== className));
                              syncCounts();
                            }}
                            className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40"
                          >
                            Delete this class
                            <span className={`block text-xs ${muted}`}>
                              {classes.length <= 2
                                ? 'You need at least 2 classes'
                                : 'Removes the class and its poses'}
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {isOpen && isWebcamOn ? (
                  <div className="px-5 py-4 space-y-3 bg-[#FFEDEA]/60 dark:bg-[#FF6F61]/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#FF6F61] dark:text-[#FFAB9E]">
                        Webcam
                      </span>
                      <button
                        onClick={() => setOpenClass(null)}
                        className="text-xs font-medium text-[#FF6F61] hover:underline"
                      >
                        Done
                      </button>
                    </div>
                    <p className={`text-sm ${muted}`}>{count} Pose Samples</p>
                    <button
                      onMouseDown={() => handleCaptureStart(className)}
                      onMouseUp={handleCaptureStop}
                      onMouseLeave={handleCaptureStop}
                      onTouchStart={() => handleCaptureStart(className)}
                      onTouchEnd={handleCaptureStop}
                      className={`w-full py-2.5 rounded-md text-sm font-semibold select-none ${
                        isCapturing === className ? 'bg-red-500 text-white' : primaryBtn
                      }`}
                    >
                      {isCapturing === className ? 'Recording…' : 'Hold to Record'}
                    </button>
                    <p className={`text-xs ${muted}`}>
                      Strike the pose in the Preview panel, then hold the button.
                    </p>
                  </div>
                ) : (
                  <div className="px-5 py-4 space-y-3">
                    <p className={`text-sm ${muted}`}>
                      {count === 0 ? 'Add Pose Samples:' : `${count} Pose Samples`}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (!isWebcamOn) await handleStartWebcam();
                          setOpenClass(className);
                        }}
                        disabled={isIniting}
                        className={tile}
                      >
                        <Camera size={20} />
                        <span className="text-[11px] font-medium">Webcam</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => {
              const name = newClassName.trim() || `Class ${classes.length + 1}`;
              if (classes.includes(name)) return;
              setClasses((p) => [...p, name]);
              setNewClassName('');
            }}
            className="w-full py-5 rounded-lg border-2 border-dashed border-slate-300 dark:border-white/15 text-slate-500 dark:text-white/50 text-base flex items-center justify-center gap-2 hover:border-[#FF6F61] hover:text-[#FF6F61]"
          >
            <Plus size={18} /> Add a class
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder={`Class ${classes.length + 1} name`}
              className="flex-1 min-w-0 px-3 py-2 rounded-md bg-white dark:bg-[#1b1b33] border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-[#FF6F61]"
            />
            <button
              onClick={() => {
                poseTrainerEngine.clearAll();
                setIsTrained(false);
                syncCounts();
              }}
              className={`text-xs font-medium px-3 rounded-md hover:text-red-500 ${muted}`}
            >
              Start over
            </button>
          </div>

          {!showTraining && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <RobotMascot className="w-24 opacity-90" />
              <p className={`text-sm max-w-xs ${muted}`}>
                Turn on the webcam in Preview, then record a few poses for each class. Once you have
                some, I&apos;ll help you train it! 🎉
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
                  ? 'Your poses were learned as you recorded them. Try them in the Preview.'
                  : canTest
                    ? 'Press Train Model when every class has poses recorded.'
                    : 'Record poses for at least 2 classes first.'}
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
                    Your computer finds 17 points on your body (nose, elbows, knees and so on) and
                    remembers where they are for each pose. When you strike a pose, it picks the
                    class with the most similar positions. Nothing is uploaded.
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
                    onClick={() => (isWebcamOn ? handleStopWebcam() : void handleStartWebcam())}
                    disabled={isIniting}
                    title={isWebcamOn ? 'Turn camera off' : 'Turn camera on'}
                    className={`relative w-9 h-5 rounded-full transition-colors ${isWebcamOn ? 'bg-[#FF6F61]' : 'bg-slate-300 dark:bg-white/20'}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isWebcamOn ? 'left-[18px]' : 'left-0.5'}`}
                    />
                  </button>
                  <span className={`text-xs font-medium ${muted}`}>
                    {isIniting ? 'Starting…' : isWebcamOn ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
              <div className="relative aspect-square rounded-md bg-slate-900 overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={640}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!isWebcamOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/50">
                    <PersonStanding size={24} />
                    <span className="text-xs">Turn on your camera</span>
                  </div>
                )}
                {isCapturing && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                    Recording: {isCapturing}
                  </div>
                )}
              </div>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              {isWebcamOn && isTrained && (
                <button
                  onClick={handleToggleTest}
                  className={`w-full py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 ${
                    isTesting
                      ? 'bg-red-500 text-white'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isTesting ? <Square size={12} /> : <Play size={12} />}
                  {isTesting ? 'Stop guessing' : 'Start guessing'}
                </button>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 dark:border-white/10 space-y-3">
              <span className="text-sm font-medium text-slate-700 dark:text-white/80">Output</span>
              {!isTesting || !prediction ? (
                <p className={`text-xs ${muted}`}>
                  {isTrained
                    ? 'Strike a pose to see what it thinks.'
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
