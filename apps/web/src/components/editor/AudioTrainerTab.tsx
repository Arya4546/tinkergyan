/**
 * AudioTrainerTab.tsx
 *
 * UI for the custom audio training tab in AI Model Studio.
 * Students add class names, hold a button to record mic samples,
 * then test live predictions — all in the browser.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MoreVertical, Pencil, ChevronDown, Info, Plus, Play, Square } from 'lucide-react';
import { audioTrainerEngine } from '../../lib/audio-trainer-engine';

const COLOR = '#1a73e8';

export function AudioTrainerTab() {
  const [classes, setClasses] = useState<string[]>(() => {
    const existing = audioTrainerEngine.isInitialised
      ? Object.keys(audioTrainerEngine.getExampleCounts())
      : [];
    return existing.length > 0 ? existing : ['Background Noise', 'Class 2'];
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

  const card = 'bg-white dark:bg-[#1b1b33] rounded-lg shadow-sm';
  const muted = 'text-slate-500 dark:text-white/50';
  const tile =
    'flex flex-col items-center justify-center gap-1 w-[72px] h-[62px] shrink-0 rounded-md bg-[#e8f0fe] dark:bg-[#1a73e8]/15 text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#d2e3fc] dark:hover:bg-[#1a73e8]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
  const primaryBtn =
    'bg-[#1a73e8] text-white hover:bg-[#1765cc] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-white/30';
  const grayBtn =
    'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white/80';

  // Background noise is a normal class in Teachable Machine: it needs 20 samples, other classes 8.
  const minSamples = (name: string) => (name === 'Background Noise' ? 20 : 8);

  const handleTrain = () => {
    // The audio model learns as you record, so training only confirms there is enough data.
    if (canTest) setIsTrained(true);
  };

  return (
    <div className="flex-1 flex justify-center items-stretch py-8 px-6 min-h-[calc(100vh-96px)]">
      <div className="w-full max-w-[1400px] grid grid-cols-[minmax(0,1fr)_280px_340px] gap-8 items-stretch">
        {/* ── Classes ── */}
        <section className="min-w-0 flex flex-col gap-4">
          {classes.map((className) => {
            const count = exampleCounts[className] ?? 0;
            const needed = minSamples(className);
            return (
              <div key={className} className={`${card} overflow-hidden`}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-lg truncate">{className}</span>
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
                      onMouseDown={() => handleCaptureStart(className)}
                      onMouseUp={handleCaptureStop}
                      onMouseLeave={handleCaptureStop}
                      onTouchStart={() => handleCaptureStart(className)}
                      onTouchEnd={handleCaptureStop}
                      disabled={!isMicOn}
                      title={isMicOn ? 'Hold to record' : 'Turn on the microphone first'}
                      className={`${tile} select-none ${isRecording === className ? '!bg-red-500 !text-white' : ''}`}
                    >
                      <Mic size={20} />
                      <span className="text-[11px] font-medium">
                        {isRecording === className ? 'Recording…' : 'Mic'}
                      </span>
                    </button>
                    <div className="flex-1 min-w-0 text-xs text-slate-500 dark:text-white/50">
                      {isRecording === className
                        ? 'Keep holding while you make the sound.'
                        : isMicOn
                          ? 'Hold the Mic button and make the sound.'
                          : 'Turn on the microphone in the Preview panel.'}
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
              const name = newClassName.trim() || `Sound ${classes.length + 1}`;
              if (classes.includes(name)) return;
              setClasses((p) => [...p, name]);
              setNewClassName('');
            }}
            className="w-full py-5 rounded-lg border-2 border-dashed border-slate-300 dark:border-white/15 text-slate-500 dark:text-white/50 text-base flex items-center justify-center gap-2 hover:border-[#1a73e8] hover:text-[#1a73e8]"
          >
            <Plus size={18} /> Add a class
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const name = newClassName.trim();
                  if (name && !classes.includes(name)) setClasses((p) => [...p, name]);
                  setNewClassName('');
                }
              }}
              placeholder={`Sound ${classes.length + 1} name`}
              className="flex-1 min-w-0 px-3 py-2 rounded-md bg-white dark:bg-[#1b1b33] border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-[#1a73e8]"
            />
            <button
              onClick={() => {
                audioTrainerEngine.clearAll();
                setIsTrained(false);
                syncCounts();
              }}
              className={`text-xs font-medium px-3 rounded-md hover:text-red-500 ${muted}`}
            >
              Start over
            </button>
          </div>
        </section>

        {/* ── Training ── */}
        <section className="flex flex-col pt-1 h-full">
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
                    className={`relative w-9 h-5 rounded-full transition-colors ${isMicOn ? 'bg-[#1a73e8]' : 'bg-slate-300 dark:bg-white/20'}`}
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
                    ? 'Start listening to see what it hears.'
                    : 'You must train a model before you can preview it here.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {classes.map((label, idx) => {
                    const conf = prediction.confs[label] ?? 0;
                    const color = [
                      '#f59e0b',
                      '#e11d48',
                      '#10b981',
                      '#6366f1',
                      '#0ea5e9',
                      '#a855f7',
                    ][idx % 6]!;
                    return (
                      <div
                        key={label}
                        className={`relative h-9 rounded-md bg-slate-50 dark:bg-white/5 overflow-hidden flex items-center px-3 ${
                          label === prediction.label ? 'ring-2 ring-[#1a73e8]' : ''
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
