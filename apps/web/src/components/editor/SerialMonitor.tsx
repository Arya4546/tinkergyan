/**
 * SerialMonitor.tsx
 *
 * Live Serial Monitor for connected hardware.
 * Reads incoming data via Web Serial ReadableStream,
 * allows sending data back via WritableStream,
 * and provides baud rate selection.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Send, Trash2, Download, Pause, Play, ChevronDown } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useAIStore } from '../../stores/ai.store';
import { aiEngine } from '../../lib/ai-engine';
import { emotionEngine } from '../../lib/emotion-engine';
import { speechEngine } from '../../lib/speech-engine';

const BAUD_RATES = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const;

interface SerialMonitorProps {
  port: any; // SerialPort from Web Serial API
  onDisconnect?: () => void;
  onClose?: () => void;
}

export function SerialMonitor({ port, onClose }: SerialMonitorProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isReading, setIsReading] = useState(false);
  const [showBaudDropdown, setShowBaudDropdown] = useState(false);

  // AI prediction sync
  const currentPrediction = useAIStore((state) => state.currentPrediction);
  const isPredicting = useAIStore((state) => state.isPredicting);

  const scrollRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const isPausedRef = useRef(isPaused);
  const linesRef = useRef(lines);

  // Keep refs in sync
  isPausedRef.current = isPaused;
  linesRef.current = lines;

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, isAutoScroll]);

  // Start reading when port changes or baud rate changes
  const startReading = useCallback(async () => {
    if (!port || isReading) return;

    try {
      // If port is not open or needs reopening with new baud rate
      if (!port.readable) {
        try {
          await port.open({ baudRate });
          try {
            // Pulse DTR to reset the board into run mode (fixes ESP32 hanging after flash)
            await port.setSignals({ dataTerminalReady: true, requestToSend: false });
            await new Promise((resolve) => setTimeout(resolve, 100));
            await port.setSignals({ dataTerminalReady: false, requestToSend: false });
          } catch {
            /* ignore if signals cannot be set */
          }
        } catch (openErr: any) {
          console.warn('Port open error:', openErr);
          setLines((prev) => [...prev, `> Error opening port: ${openErr.message || openErr}`]);
          setIsReading(false);
          return;
        }
      }

      if (!port.readable) {
        setLines((prev) => [...prev, '> Error: Port is not readable after open.']);
        return;
      }

      setIsReading(true);

      const decoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();
      readerRef.current = reader;

      let buffer = '';

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value && !isPausedRef.current) {
            buffer += value;
            // Split by newlines, keep the last incomplete chunk in buffer
            const parts = buffer.split('\n');
            buffer = parts.pop() || '';

            if (parts.length > 0) {
              // Parse hardware-to-browser AI triggers
              parts.forEach((part) => {
                const text = part.trim();
                if (text === 'AI_AUDIO_CTRL:ON') {
                  if (!aiEngine.isInitialised)
                    void aiEngine.init().then(() => void aiEngine.startAudioListening());
                  else void aiEngine.startAudioListening();
                } else if (text === 'AI_AUDIO_CTRL:OFF') {
                  void aiEngine.stopAudioListening();
                } else if (text === 'AI_VISION:ON') {
                  const startVision = async () => {
                    if (!aiEngine.isInitialised) await aiEngine.init();
                    useAIStore.getState().setModelLoaded(true);

                    let videoEl = document.getElementById('hardware-ai-video') as HTMLVideoElement;
                    if (!videoEl) {
                      videoEl = document.createElement('video');
                      videoEl.id = 'hardware-ai-video';
                      videoEl.autoplay = true;
                      videoEl.playsInline = true;
                      videoEl.muted = true;
                      videoEl.style.display = 'none';
                      document.body.appendChild(videoEl);
                    }

                    await aiEngine.startWebcam(videoEl);
                    useAIStore.getState().setWebcamActive(true);

                    if (!aiEngine.isReadyToPredict) return;

                    aiEngine.startPredicting(
                      videoEl,
                      (result) => {
                        useAIStore.getState().updatePrediction(result.label, result.allConfidences);
                      },
                      true,
                      false,
                    );
                    useAIStore.getState().setPredicting(true);
                  };
                  void startVision();
                } else if (text === 'AI_VISION:OFF') {
                  aiEngine.stopPredicting();
                  aiEngine.stopWebcam();
                  const videoEl = document.getElementById('hardware-ai-video');
                  if (videoEl) videoEl.remove();
                  useAIStore.getState().setWebcamActive(false);
                  useAIStore.getState().setPredicting(false);
                } else if (text === 'AI_EMOTION_CTRL:ON') {
                  // Start emotion detection and stream results back over Serial
                  const startEmotion = async () => {
                    if (!emotionEngine.isInitialised) await emotionEngine.init();
                    let videoEl = document.getElementById('hardware-ai-video') as HTMLVideoElement;
                    if (!videoEl) {
                      videoEl = document.createElement('video');
                      videoEl.id = 'hardware-ai-video';
                      videoEl.autoplay = true;
                      videoEl.playsInline = true;
                      videoEl.muted = true;
                      videoEl.style.display = 'none';
                      document.body.appendChild(videoEl);
                    }
                    await aiEngine.startWebcam(videoEl);
                    emotionEngine.startDetecting(videoEl, async (result) => {
                      useAIStore
                        .getState()
                        .updateEmotion(result.emotion, result.allEmotions, result.faceDetected);
                      // Send emotion back to board
                      if (result.faceDetected && port?.writable) {
                        try {
                          const enc = new TextEncoder();
                          const w = port.writable.getWriter();
                          await w.write(enc.encode(`AI_EMOTION:${result.emotion}\n`));
                          w.releaseLock();
                        } catch {
                          /* ignore */
                        }
                      }
                    });
                    useAIStore.getState().setEmotionActive(true);
                  };
                  void startEmotion();
                } else if (text === 'AI_EMOTION_CTRL:OFF') {
                  emotionEngine.stopDetecting();
                  useAIStore.getState().setEmotionActive(false);
                } else if (text === 'AI_HAND_CTRL:ON') {
                  // Hand tracking start — handled by Scratch engine in software mode
                  // In hardware mode, we just acknowledge
                  useAIStore.getState().setHandTrackingActive(true);
                } else if (text === 'AI_HAND_CTRL:OFF') {
                  useAIStore.getState().setHandTrackingActive(false);
                } else if (text === 'AI_STT_CTRL:ON') {
                  speechEngine.startListening();
                  useAIStore.getState().setSpeechListening(true);
                } else if (text === 'AI_STT_CTRL:OFF') {
                  speechEngine.stopListening();
                  useAIStore.getState().setSpeechListening(false);
                } else if (text.startsWith('AI_SAY:')) {
                  const sayText = text.substring(7).trim();
                  speechEngine.speak(sayText);
                } else if (text === 'AI_SAY_STOP') {
                  speechEngine.stopSpeaking();
                }
              });

              setLines((prev) => {
                const newLines = [...prev, ...parts];
                // Cap at 500 lines to prevent memory issues
                return newLines.slice(-500);
              });
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'TypeError' && err.message !== 'The device has been lost.') {
          console.warn('Serial read error:', err);
        }
      } finally {
        reader.releaseLock();
        readerRef.current = null;
        setIsReading(false);
        try {
          await readableStreamClosed;
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.warn('Failed to start serial reader:', err);
      setIsReading(false);
    }
  }, [port, baudRate, isReading]);

  // Auto-start reading when port is provided
  useEffect(() => {
    if (port) {
      startReading();
    }
    return () => {
      // Cleanup reader on unmount
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => {});
      }
    };
  }, [port]); // eslint-disable-line react-hooks/exhaustive-deps

  // Send data to the board
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!port || !port.writable || !inputValue) return;

    try {
      const encoder = new TextEncoder();
      const writer = port.writable.getWriter();
      await writer.write(encoder.encode(inputValue + '\n'));
      writer.releaseLock();

      setLines((prev) => [...prev, `> ${inputValue}`]);
      setInputValue('');
    } catch (err) {
      console.error('Serial send error:', err);
    }
  };

  // Sync AI predictions to hardware over Serial
  useEffect(() => {
    if (!port || !port.writable || !isPredicting || !currentPrediction) return;

    const sendPrediction = async () => {
      try {
        const encoder = new TextEncoder();
        const writer = port.writable.getWriter();
        const msg = `AI_PRED:${currentPrediction}\n`;
        await writer.write(encoder.encode(msg));
        writer.releaseLock();
      } catch (err) {
        console.error('AI sync serial error:', err);
      }
    };

    void sendPrediction();
  }, [currentPrediction, isPredicting, port]);

  // Sync AI audio commands over Serial
  useEffect(() => {
    if (!port || !port.writable) return;

    const handleWord = async (word: string) => {
      try {
        const encoder = new TextEncoder();
        const writer = port.writable.getWriter();
        const msg = `AI_AUDIO:${word}\n`;
        await writer.write(encoder.encode(msg));
        writer.releaseLock();
      } catch (err) {
        console.error('AI sync audio error:', err);
      }
    };

    aiEngine.onSpeechCommand(handleWord);

    return () => {
      aiEngine.offSpeechCommand(handleWord);
    };
  }, [port]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => setLines([]);

  const handleExport = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_log_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBaudChange = async (newBaud: number) => {
    setBaudRate(newBaud);
    setShowBaudDropdown(false);

    // Close existing reader and port, reopen with new baud rate
    if (readerRef.current) {
      await readerRef.current.cancel().catch(() => {});
    }
    try {
      await port.close();
      await port.open({ baudRate: newBaud });
      setLines((prev) => [...prev, `--- Baud rate changed to ${newBaud} ---`]);
      startReading();
    } catch (err) {
      console.warn('Failed to change baud rate:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-ed-term-bg">
      {/* Header toolbar */}
      <div className="h-10 hw-border-b bg-ed-term-surface flex items-center px-2 gap-1 shrink-0">
        {/* Status indicator */}
        <div className="flex items-center gap-2 px-2">
          <div
            className={`w-2 h-2 rounded-full ${isReading ? 'bg-emerald-500 animate-pulse' : 'bg-ed-term-dim'}`}
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ed-term-text">
            Serial Monitor
          </span>
        </div>

        <div className="flex-1" />

        {/* Baud rate selector */}
        <div className="relative">
          <button
            onClick={() => setShowBaudDropdown(!showBaudDropdown)}
            className="flex items-center gap-1 px-2 py-1 font-mono text-[10px] font-bold text-amber-400 uppercase tracking-widest hover:bg-amber-500/10 transition-colors"
          >
            <Radio size={10} />
            {baudRate}
            <ChevronDown size={10} />
          </button>

          {showBaudDropdown && (
            <div className="absolute right-0 top-8 z-50 bg-ed-term-surface border border-ed-term-line shadow-xl min-w-[120px]">
              {BAUD_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleBaudChange(rate)}
                  className={`w-full text-left px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    rate === baudRate
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-ed-term-text hover:bg-ed-term-line hover:text-white'
                  }`}
                >
                  {rate}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pause/Resume */}
        <Tooltip
          content={isPaused ? 'Resume Serial Stream' : 'Pause Serial Output'}
          position="bottom"
        >
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1.5 transition-colors ${isPaused ? 'text-amber-400 hover:bg-amber-500/10' : 'text-ed-term-dim hover:text-ed-term-text'}`}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
          </button>
        </Tooltip>

        {/* Export */}
        <Tooltip content="Export Logs to File" position="bottom">
          <button
            onClick={handleExport}
            className="p-1.5 text-ed-term-dim hover:text-ed-term-text transition-colors"
            disabled={lines.length === 0}
          >
            <Download size={12} />
          </button>
        </Tooltip>

        {/* Auto-scroll toggle */}
        <Tooltip
          content={isAutoScroll ? 'Disable Auto-scroll' : 'Enable Auto-scroll'}
          position="bottom"
        >
          <button
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className={`p-1.5 transition-colors font-mono text-[9px] font-bold uppercase tracking-widest ${
              isAutoScroll
                ? 'text-emerald-400 hover:bg-emerald-500/10'
                : 'text-ed-term-dim hover:text-ed-term-text'
            }`}
          >
            Scroll
          </button>
        </Tooltip>

        {/* Clear */}
        <Tooltip content="Clear Output Logs" position="bottom">
          <button
            onClick={handleClear}
            className="p-1.5 text-ed-term-dim hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </Tooltip>

        {/* Close Button */}
        {onClose && (
          <>
            <div className="w-px h-4 bg-ed-term-line mx-1" />
            <Tooltip content="Close Serial Monitor" position="bottom">
              <button
                onClick={onClose}
                className="p-1.5 text-ed-term-dim hover:text-ed-term-text transition-colors"
              >
                ✕
              </button>
            </Tooltip>
          </>
        )}
      </div>

      {/* Output area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
      >
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
              <Radio size={20} className="text-amber-500/50" />
            </div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ed-term-dim mb-1">
              Listening for serial data...
            </p>
            <p className="font-mono text-[9px] text-ed-term-dim max-w-[220px]">
              Make sure your code uses Serial.begin({baudRate}) and Serial.println()
            </p>
          </div>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              className={`py-0.5 ${
                line.startsWith('>')
                  ? 'text-cyan-400'
                  : line.startsWith('---')
                    ? 'text-amber-500/60 italic'
                    : 'text-emerald-400/90'
              }`}
            >
              {line}
            </div>
          ))
        )}

        {isPaused && (
          <div className="sticky bottom-0 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 mt-2 text-center">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-amber-400">
              ⏸ Output paused
            </span>
          </div>
        )}
      </div>

      {/* Send input bar */}
      <div className="hw-border-t bg-ed-term-bg flex items-center shrink-0">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message to send..."
          className="flex-1 bg-transparent font-mono text-[11px] text-ed-term-text px-3 py-2.5 outline-none placeholder:text-ed-term-dim"
        />
        <Tooltip content="Send Message (Enter)" position="left">
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="px-3 py-2.5 text-emerald-500 hover:text-emerald-400 disabled:text-ed-term-dim transition-colors"
          >
            <Send size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
