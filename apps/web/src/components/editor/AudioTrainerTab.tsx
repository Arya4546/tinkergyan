/**
 * AudioTrainerTab.tsx
 *
 * UI for the custom audio training tab in AI Model Studio.
 * Students add class names, hold a button to record mic samples,
 * then test live predictions — all in the browser.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, X, Mic, MicOff, Brain, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { audioTrainerEngine } from '../../lib/audio-trainer-engine';

const COLOR = '#FF6F61';

export function AudioTrainerTab() {
  const [classes, setClasses] = useState<string[]>(() => {
    const existing = audioTrainerEngine.isInitialised
      ? Object.keys(audioTrainerEngine.getExampleCounts())
      : [];
    return existing.length > 0 ? existing : ['Sound 1', 'Sound 2'];
  });
  const [newClassName, setNewClassName] = useState('');
  const [isIniting, setIsIniting] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [prediction, setPrediction] = useState<{
    label: string;
    confs: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  // Sync counts on mount
  useEffect(() => {
    syncCounts();
  }, [syncCounts]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioTrainerEngine.stopPredicting();
      audioTrainerEngine.stopMic();
    };
  }, []);

  const handleCaptureStart = useCallback(
    (className: string) => {
      if (!isMicOn) return;
      setIsRecording(className);
      const capture = () => {
        audioTrainerEngine.captureExample(className);
        syncCounts();
      };
      capture();
      captureIntervalRef.current = setInterval(capture, 200);
    },
    [isMicOn, syncCounts],
  );

  const handleCaptureStop = useCallback(() => {
    setIsRecording(null);
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  const handleToggleTest = useCallback(() => {
    if (!isMicOn) return;
    if (isTesting) {
      audioTrainerEngine.stopPredicting();
      setIsTesting(false);
      setPrediction(null);
    } else {
      audioTrainerEngine.startPredicting((result) => {
        setPrediction({ label: result.label, confs: result.allConfidences });
      });
      setIsTesting(true);
    }
  }, [isMicOn, isTesting]);

  const canTest = classes.filter((c) => (exampleCounts[c] ?? 0) > 0).length >= 2;
  const totalSamples = classes.reduce((s, c) => s + (exampleCounts[c] ?? 0), 0);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Mic + Visualiser */}
      <div className="flex-1 flex flex-col p-6 gap-4 border-r border-white/10">
        {/* Waveform */}
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
          {isMicOn ? (
            <>
              <canvas ref={canvasRef} width={400} height={200} className="w-full h-full" />
              {isRecording && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                  ● Recording: {isRecording}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Mic size={40} className="text-white/30" />
              <button
                onClick={() => void handleStartMic()}
                disabled={isIniting}
                className="px-4 py-2 rounded-lg bg-[#FF6F61] text-white font-bold text-sm hover:bg-[#FF6F61]/90 transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {isIniting ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
                {isIniting ? 'Starting...' : 'Start Microphone'}
              </button>
            </div>
          )}
          {isMicOn && (
            <button
              onClick={handleStopMic}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
              title="Stop Mic"
            >
              <MicOff size={14} />
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Live prediction */}
        {isTesting && prediction && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
                Live Prediction
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

        {/* Test button */}
        {isMicOn && (
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
                : 'Record at least 2 classes first'}
          </button>
        )}
      </div>

      {/* Right: Classes */}
      <div className="w-[320px] flex flex-col p-6 gap-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
            Sound Classes
          </span>
          <span className="text-white/40 text-xs">{totalSamples} total samples</span>
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
                  <span className="text-white/40 text-xs font-mono">{count} samples</span>
                  <button
                    onClick={() => {
                      audioTrainerEngine.clearClass(className);
                      syncCounts();
                    }}
                    className="p-1 rounded text-white/30 hover:text-amber-400 transition-colors"
                    title="Clear"
                  >
                    <Trash2 size={12} />
                  </button>
                  {classes.length > 2 && (
                    <button
                      onClick={() => {
                        audioTrainerEngine.clearClass(className);
                        setClasses((p) => p.filter((c) => c !== className));
                        syncCounts();
                      }}
                      className="p-1 rounded text-white/30 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              {count > 0 && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                  <CheckCircle2 size={12} /> {count} samples recorded
                </div>
              )}
              <button
                onMouseDown={() => handleCaptureStart(className)}
                onMouseUp={handleCaptureStop}
                onMouseLeave={handleCaptureStop}
                onTouchStart={() => handleCaptureStart(className)}
                onTouchEnd={handleCaptureStop}
                disabled={!isMicOn}
                className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isRecording === className
                    ? 'bg-red-500 text-white scale-95'
                    : isMicOn
                      ? 'bg-[#FF6F61]/20 text-[#FF6F61] border border-[#FF6F61]/30 hover:bg-[#FF6F61]/30 active:scale-95'
                      : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Mic size={14} />
                {isRecording === className ? 'Recording...' : 'Hold to Record'}
              </button>
            </div>
          );
        })}

        {/* Add class */}
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
            placeholder={`Sound ${classes.length + 1}`}
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
            audioTrainerEngine.clearAll();
            syncCounts();
          }}
          className="w-full py-2 rounded-lg bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-colors border border-white/5"
        >
          Reset All Audio Data
        </button>
      </div>
    </div>
  );
}
