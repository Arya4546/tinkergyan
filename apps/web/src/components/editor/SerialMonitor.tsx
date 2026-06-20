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

const BAUD_RATES = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const;

interface SerialMonitorProps {
  port: any; // SerialPort from Web Serial API
  onDisconnect?: () => void;
}

export function SerialMonitor({ port }: SerialMonitorProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [isPaused, setIsPaused] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [showBaudDropdown, setShowBaudDropdown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const isPausedRef = useRef(isPaused);
  const linesRef = useRef(lines);

  // Keep refs in sync
  isPausedRef.current = isPaused;
  linesRef.current = lines;

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, isPaused]);

  // Start reading when port changes or baud rate changes
  const startReading = useCallback(async () => {
    if (!port || isReading) return;

    try {
      // If port is not open or needs reopening with new baud rate
      if (!port.readable) {
        try {
          await port.open({ baudRate });
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
  const handleSend = useCallback(async () => {
    if (!port || !port.writable || !inputValue.trim()) return;

    try {
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(inputValue + '\n'));
      writer.releaseLock();

      // Show sent data in monitor
      setLines((prev) => [...prev, `> ${inputValue}`]);
      setInputValue('');
    } catch (err) {
      console.warn('Failed to send serial data:', err);
    }
  }, [port, inputValue]);

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
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Header toolbar */}
      <div className="h-10 hw-border-b bg-[#111111] flex items-center px-2 gap-1 shrink-0">
        {/* Status indicator */}
        <div className="flex items-center gap-2 px-2">
          <div
            className={`w-2 h-2 rounded-full ${isReading ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
            <div className="absolute right-0 top-8 z-50 bg-[#111111] border border-slate-800 shadow-xl min-w-[120px]">
              {BAUD_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleBaudChange(rate)}
                  className={`w-full text-left px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    rate === baudRate
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {rate}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pause/Resume */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`p-1.5 transition-colors ${isPaused ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play size={12} /> : <Pause size={12} />}
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
          title="Export log"
          disabled={lines.length === 0}
        >
          <Download size={12} />
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
          title="Clear"
        >
          <Trash2 size={12} />
        </button>
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
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              Listening for serial data...
            </p>
            <p className="font-mono text-[9px] text-slate-700 max-w-[220px]">
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
      <div className="hw-border-t bg-[#0a0a0a] flex items-center shrink-0">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message to send..."
          className="flex-1 bg-transparent font-mono text-[11px] text-slate-300 px-3 py-2.5 outline-none placeholder:text-slate-700"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="px-3 py-2.5 text-emerald-500 hover:text-emerald-400 disabled:text-slate-700 transition-colors"
          title="Send (Enter)"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
