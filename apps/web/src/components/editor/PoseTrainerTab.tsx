/**
 * PoseTrainerTab.tsx
 *
 * UI for the custom pose training tab in AI Model Studio.
 * Students hold a pose, click to capture frames, train a KNN on
 * 17-keypoint feature vectors, and test live predictions.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus,
  X,
  Brain,
  Loader2,
  Trash2,
  CheckCircle2,
  PersonStanding,
  Video,
  VideoOff,
} from 'lucide-react';
import { poseTrainerEngine } from '../../lib/pose-trainer-engine';
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
    return existing.length > 0 ? existing : ['Pose 1', 'Pose 2'];
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

  const canTest = classes.filter((c) => (exampleCounts[c] ?? 0) > 0).length >= 2;
  const totalSamples = classes.reduce((s, c) => s + (exampleCounts[c] ?? 0), 0);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Webcam + skeleton overlay */}
      <div className="flex-1 flex flex-col p-6 gap-4 border-r border-white/10">
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
            style={{ transform: 'scaleX(-1)' }}
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ transform: 'scaleX(-1)' }}
          />

          {!isWebcamOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1a1a2e]">
              <PersonStanding size={40} className="text-white/30" />
              <button
                onClick={() => void handleStartWebcam()}
                disabled={isIniting}
                className="px-4 py-2 rounded-lg bg-[#FF6F61] text-white font-bold text-sm hover:bg-[#FF6F61]/90 flex items-center gap-2 disabled:opacity-60"
              >
                {isIniting ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
                {isIniting ? 'Loading MoveNet...' : 'Start Camera'}
              </button>
            </div>
          )}
          {isWebcamOn && (
            <button
              onClick={handleStopWebcam}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 text-white/70 hover:text-white transition-colors"
            >
              <VideoOff size={14} />
            </button>
          )}
          {isCapturing && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
              ● Capturing: {isCapturing}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {isTesting && prediction && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
                Live Pose Prediction
              </span>
            </div>
            {Object.entries(prediction.confs)
              .sort(([, a], [, b]) => b - a)
              .map(([label, conf]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-white/80 text-sm font-medium w-24 truncate">{label}</span>
                  <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${conf}%`,
                        backgroundColor:
                          label === prediction.label ? COLOR : 'rgba(255,255,255,0.2)',
                      }}
                    />
                  </div>
                  <span className="text-white/60 text-xs font-mono w-10 text-right">{conf}%</span>
                </div>
              ))}
          </div>
        )}

        {isWebcamOn && (
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
                : 'Capture at least 2 poses first'}
          </button>
        )}
      </div>

      {/* Right: Pose classes */}
      <div className="w-[320px] flex flex-col p-6 gap-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
            Pose Classes
          </span>
          <span className="text-white/40 text-xs">{totalSamples} total frames</span>
        </div>

        {classes.map((className) => {
          const count = exampleCounts[className] ?? 0;
          return (
            <div
              key={className}
              className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-sm">{className}</span>
                <div className="flex items-center gap-1">
                  <span className="text-white/40 text-xs font-mono">{count} frames</span>
                  <button
                    onClick={() => {
                      poseTrainerEngine.clearClass(className);
                      syncCounts();
                    }}
                    className="p-1 rounded text-white/30 hover:text-amber-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                  {classes.length > 2 && (
                    <button
                      onClick={() => {
                        poseTrainerEngine.clearClass(className);
                        setClasses((p) => p.filter((c) => c !== className));
                        syncCounts();
                      }}
                      className="p-1 rounded text-white/30 hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              {count > 0 && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                  <CheckCircle2 size={12} /> {count} frames captured
                </div>
              )}
              <button
                onMouseDown={() => handleCaptureStart(className)}
                onMouseUp={handleCaptureStop}
                onMouseLeave={handleCaptureStop}
                onTouchStart={() => handleCaptureStart(className)}
                onTouchEnd={handleCaptureStop}
                disabled={!isWebcamOn}
                className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isCapturing === className
                    ? 'bg-red-500 text-white scale-95'
                    : isWebcamOn
                      ? 'bg-[#FF6F61]/20 text-[#FF6F61] border border-[#FF6F61]/30 hover:bg-[#FF6F61]/30 active:scale-95'
                      : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                }`}
              >
                <PersonStanding size={14} />
                {isCapturing === className ? 'Capturing...' : 'Hold to Capture'}
              </button>
            </div>
          );
        })}

        <div className="flex gap-2">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newClassName.trim()) {
                setClasses((p) => [...p, newClassName.trim()]);
                setNewClassName('');
              }
            }}
            placeholder={`Pose ${classes.length + 1}`}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 outline-none focus:border-[#FF6F61]/50"
          />
          <button
            onClick={() => {
              if (newClassName.trim()) {
                setClasses((p) => [...p, newClassName.trim()]);
                setNewClassName('');
              }
            }}
            className="px-3 py-2 rounded-lg bg-[#FF6F61]/20 text-[#FF6F61] hover:bg-[#FF6F61]/30 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => {
            poseTrainerEngine.clearAll();
            syncCounts();
          }}
          className="w-full py-2 rounded-lg bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-colors border border-white/5"
        >
          Reset All Pose Data
        </button>
      </div>
    </div>
  );
}
