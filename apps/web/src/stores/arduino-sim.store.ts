/**
 * arduino-sim.store.ts
 *
 * State for the in-browser Arduino simulator: pin state, Serial output, and
 * the virtual inputs a student can drive from the stage.
 *
 * This exists because the old "Run" never simulated anything. It shipped the
 * sketch to wandbox.org, which compiled a shim that capped every delay at 10ms,
 * returned `(pin % 6) * 170 + 42` from analogRead, echoed your own writes back
 * from digitalRead, and ran loop() exactly five times. Output looked plausible
 * and was wrong on every board — identically wrong, since the shim compiled for
 * x86 and ignored the board entirely. Everything here runs locally against real
 * state, so what a student sees matches what the hardware would do.
 */
import { create } from 'zustand';

export type PinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';

export interface PinState {
  mode: PinMode;
  /** Digital level. For a PWM pin this is HIGH whenever duty > 0. */
  value: 0 | 1;
  /** analogWrite duty, 0-255. Undefined until the pin is written with PWM. */
  duty?: number;
}

/** One line of simulated Serial output. */
export interface SerialLine {
  text: string;
  /** ms since the sketch started — the sketch's own clock, not wall time. */
  at: number;
}

/** Cap so a runaway `Serial.println` in a tight loop can't exhaust memory. */
const MAX_SERIAL_LINES = 500;

interface ArduinoSimState {
  isRunning: boolean;
  /** Which half of the sketch is executing — surfaced in the UI. */
  phase: 'idle' | 'setup' | 'loop';
  /** Completed loop() iterations, so the UI can show the sketch is alive. */
  iterations: number;
  /** Keyed by normalized pin id (see normalizePin in the engine). */
  pins: Record<string, PinState>;
  serial: SerialLine[];
  /** Baud from Serial.begin — display only; timing is not simulated. */
  baud: number | null;
  /**
   * Virtual inputs. digitalRead/analogRead resolve here, so a student can wire
   * a button or potentiometer on the stage and have their sketch actually read
   * it. Absent pin = pulled low (or high, under INPUT_PULLUP).
   */
  digitalInputs: Record<string, 0 | 1>;
  analogInputs: Record<string, number>;
  /** Set when a sketch stops because it threw, so the UI can show why. */
  error: string | null;

  setRunning: (running: boolean) => void;
  setPhase: (phase: ArduinoSimState['phase']) => void;
  bumpIteration: () => void;
  setPinMode: (pin: string, mode: PinMode) => void;
  writePin: (pin: string, value: 0 | 1, duty?: number) => void;
  setBaud: (baud: number | null) => void;
  appendSerial: (text: string, at: number) => void;
  setDigitalInput: (pin: string, value: 0 | 1) => void;
  setAnalogInput: (pin: string, value: number) => void;
  setError: (message: string | null) => void;
  /** Back to power-on state, keeping the student's virtual input settings. */
  reset: () => void;
}

export const useArduinoSimStore = create<ArduinoSimState>()((set) => ({
  isRunning: false,
  phase: 'idle',
  iterations: 0,
  pins: {},
  serial: [],
  baud: null,
  digitalInputs: {},
  analogInputs: {},
  error: null,

  setRunning: (isRunning) => set({ isRunning }),
  setPhase: (phase) => set({ phase }),
  bumpIteration: () => set((s) => ({ iterations: s.iterations + 1 })),

  setPinMode: (pin, mode) =>
    set((s) => ({
      pins: { ...s.pins, [pin]: { value: 0, ...s.pins[pin], mode } },
    })),

  writePin: (pin, value, duty) =>
    set((s) => ({
      pins: {
        ...s.pins,
        [pin]: {
          mode: s.pins[pin]?.mode ?? 'OUTPUT',
          value,
          ...(duty === undefined ? {} : { duty }),
        },
      },
    })),

  setBaud: (baud) => set({ baud }),

  appendSerial: (text, at) =>
    set((s) => {
      const next = [...s.serial, { text, at }];
      // Drop from the front rather than refusing to append — students care
      // about the most recent output, not the first 500 lines.
      return { serial: next.length > MAX_SERIAL_LINES ? next.slice(-MAX_SERIAL_LINES) : next };
    }),

  setDigitalInput: (pin, value) =>
    set((s) => ({ digitalInputs: { ...s.digitalInputs, [pin]: value } })),

  setAnalogInput: (pin, value) =>
    set((s) => ({ analogInputs: { ...s.analogInputs, [pin]: value } })),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      isRunning: false,
      phase: 'idle',
      iterations: 0,
      pins: {},
      serial: [],
      baud: null,
      error: null,
    }),
}));
