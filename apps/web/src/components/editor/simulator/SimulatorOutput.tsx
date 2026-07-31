import { useEffect, useRef } from 'react';
import { Cpu, CircleDot } from 'lucide-react';
import { useArduinoSimStore } from '../../../stores/arduino-sim.store';
import { useEditorStore } from '../../../stores/editor.store';
import { getBoardLabel } from '../../../lib/boards';

/**
 * SimulatorOutput — what the sketch is doing, right now, in the browser.
 *
 * Two panes because students debug with both: Serial output for what they
 * printed, and live pin state for what the board is physically doing. The pin
 * pane is the one the old cloud "simulator" could never show — it printed
 * `[SIM] digitalWrite(13, HIGH)` into a text log and left the student to
 * imagine the rest.
 */
export function SimulatorOutput() {
  const { isRunning, phase, iterations, pins, serial, baud, error } = useArduinoSimStore();
  const board = useEditorStore((s) => s.board);
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the tail, the way a serial monitor does.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [serial.length]);

  const pinEntries = Object.entries(pins).sort(([a], [b]) => {
    // Numeric pins in order, then named ones (A0, A1…) alphabetically.
    const na = Number(a);
    const nb = Number(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return a.localeCompare(b);
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-ed-term-bg">
      {/* Status strip */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ed-term-line shrink-0">
        <Cpu size={13} className={isRunning ? 'text-ed-go' : 'text-ed-term-dim'} />
        <span className="font-mono text-[11px] text-ed-term-text">{getBoardLabel(board)}</span>
        <span className="font-mono text-[10px] text-ed-term-dim">
          {isRunning ? (phase === 'setup' ? 'setup()' : `loop() ×${iterations}`) : 'stopped'}
        </span>
        {baud !== null && (
          <span className="font-mono text-[10px] text-ed-term-dim ml-auto">{baud} baud</span>
        )}
      </div>

      {/* Pin state */}
      {pinEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-ed-term-line shrink-0">
          {pinEntries.map(([pin, state]) => (
            <span
              key={pin}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-ed-term-surface font-mono text-[10px]"
              title={`pin ${pin} — ${state.mode}${state.duty !== undefined ? `, PWM ${state.duty}/255` : ''}`}
            >
              <CircleDot
                size={9}
                className={state.value ? 'text-ed-go' : 'text-ed-term-dim'}
                // A lit pin should read as lit at a glance, not as a label to
                // be parsed — students scan this while their code is running.
                fill={state.value ? 'currentColor' : 'none'}
              />
              <span className="text-ed-term-text">{pin}</span>
              <span className="text-ed-term-dim">
                {state.duty !== undefined && state.duty > 0 && state.duty < 255
                  ? state.duty
                  : state.value
                    ? 'HIGH'
                    : 'LOW'}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Serial output */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {error && (
          <p className="font-mono text-[11px] text-ed-err leading-relaxed whitespace-pre-wrap mb-2">
            {error}
          </p>
        )}
        {serial.length === 0 && !error ? (
          <p className="font-mono text-[11px] text-ed-term-dim">
            {isRunning
              ? 'Running — no Serial output yet. Add a "Serial.println" block to print something.'
              : 'Press Run to start your program.'}
          </p>
        ) : (
          serial.map((line, i) => (
            <div key={i} className="flex gap-2 font-mono text-[11px] leading-relaxed">
              <span className="text-ed-term-dim shrink-0 tabular-nums">
                {(line.at / 1000).toFixed(2)}s
              </span>
              <span className="text-ed-term-text whitespace-pre-wrap break-all">{line.text}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
