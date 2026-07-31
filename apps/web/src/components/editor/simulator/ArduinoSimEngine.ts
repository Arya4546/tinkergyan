/**
 * ArduinoSimEngine.ts
 *
 * Runs the JavaScript emitted by arduino-sim-generator.ts, in the browser,
 * against real state.
 *
 * The contract this engine exists to keep: **what the student sees is what the
 * hardware would do.** `delay(1000)` waits a real second. `loop()` runs forever
 * until Stop. `digitalRead` returns what is actually wired to the pin. The
 * previous implementation (a C++ shim compiled on wandbox.org) broke all three
 * — 10ms delays, five loop iterations, and `analogRead` returning a made-up
 * `(pin % 6) * 170 + 42`. Correctness here matters more than features: a
 * simulator that lies teaches the wrong thing more effectively than no
 * simulator at all.
 */
import { useArduinoSimStore, type PinMode } from '../../../stores/arduino-sim.store';
import { useEditorStore } from '../../../stores/editor.store';
import { workspaceToArduinoSimCode } from '../arduino-sim-generator';

/** API surface handed to generated sketch code as `api`. */
export interface ArduinoSimAPI {
  onSetup: (cb: () => Promise<void>) => void;
  onLoop: (cb: () => Promise<void>) => void;

  pinMode: (pin: string, mode: string) => Promise<void>;
  digitalWrite: (pin: string, value: string | number) => Promise<void>;
  digitalRead: (pin: string) => Promise<number>;
  analogWrite: (pin: string, value: number) => Promise<void>;
  analogRead: (pin: string) => Promise<number>;

  delay: (ms: number) => Promise<void>;
  millis: () => number;
  /**
   * Yield point injected into every loop body via INFINITE_LOOP_TRAP, so a
   * loop with no hardware call in it still can't lock the page or outrun Stop.
   */
  tick: () => Promise<void>;

  serialBegin: (baud: number) => Promise<void>;
  serialPrint: (text: unknown) => Promise<void>;
  serialPrintln: (text: unknown) => Promise<void>;
}

/**
 * Per-board hardware facts the simulation has to respect.
 *
 * This is the whole reason a block interpreter can be board-accurate without
 * emulating a CPU: the differences that matter to a beginner's sketch are a
 * short list of constants. An ESP32 reading a potentiometer really does return
 * 0-4095 where an Uno returns 0-1023, and a sketch that maps one range will
 * behave differently on the two boards — exactly as it would on a real desk.
 */
interface BoardProfile {
  /** Pin that LED_BUILTIN resolves to, so `13` and `LED_BUILTIN` are one pin. */
  builtinLed: string;
  /** Max value from analogRead. AVR is 10-bit, ESP32 is 12-bit. */
  adcMax: number;
  /** Max duty accepted by analogWrite. */
  pwmMax: number;
}

const BOARD_PROFILES: Record<string, BoardProfile> = {
  'arduino:avr:uno': { builtinLed: '13', adcMax: 1023, pwmMax: 255 },
  'arduino:avr:nano': { builtinLed: '13', adcMax: 1023, pwmMax: 255 },
  'arduino:avr:mega': { builtinLed: '13', adcMax: 1023, pwmMax: 255 },
  'esp8266:esp8266:nodemcuv2': { builtinLed: '2', adcMax: 1023, pwmMax: 255 },
  'esp32:esp32:esp32': { builtinLed: '2', adcMax: 4095, pwmMax: 255 },
};

const DEFAULT_PROFILE: BoardProfile = BOARD_PROFILES['arduino:avr:uno']!;

/**
 * How long the engine may run without handing control back to the browser.
 *
 * A `loop()` with no delay is legal Arduino and common in real sketches, but
 * here it would peg the main thread and freeze the tab. Yielding on this
 * interval keeps the UI responsive without slowing sketches that do call delay.
 */
const YIELD_INTERVAL_MS = 16;

export class ArduinoSimEngine {
  private abortController: AbortController | null = null;
  /**
   * setup()/loop() bodies, registered by the generated code when it runs.
   *
   * Held in a holder object rather than two fields so the compiler keeps their
   * declared types: assigning `null` to a field and then calling opaque
   * generated code narrows the field to `never`, since TypeScript cannot see
   * the assignment that happens inside `new Function`.
   */
  private hooks: { setup?: () => Promise<void>; loop?: () => Promise<void> } = {};
  /**
   * Which run is current. Guards against a superseded run tearing down its
   * replacement — see the `finally` in run().
   */
  private runId = 0;
  private startedAt = 0;
  private lastYieldAt = 0;
  /** Buffered partial line from Serial.print (no newline) — flushed by println. */
  private serialBuffer = '';

  private get board(): BoardProfile {
    return BOARD_PROFILES[useEditorStore.getState().board] ?? DEFAULT_PROFILE;
  }

  /** Collapses aliases so LED_BUILTIN and its pin number are the same pin. */
  private normalizePin(pin: string): string {
    return pin === 'LED_BUILTIN' ? this.board.builtinLed : pin;
  }

  /**
   * The single yield point every API call passes through.
   *
   * Checks abort and, when the sketch has been hogging the thread, hands
   * control back to the browser. Treating "no controller" as aborted is what
   * makes Stop reliable: a stopped sketch cannot get past its next await, no
   * matter where the abort landed. (The Scratch engine had exactly this bug —
   * `stop()` nulled the controller, so the next await got an undefined signal,
   * resolved normally, and `forever` loops carried on running.)
   */
  private async tick(): Promise<void> {
    const ctrl = this.abortController;
    if (!ctrl || ctrl.signal.aborted) throw new Error('Aborted');
    const now = Date.now();
    if (now - this.lastYieldAt >= YIELD_INTERVAL_MS) {
      this.lastYieldAt = now;
      await this.sleep(0);
    }
  }

  /** Abortable sleep. Resolves after ms, rejects the moment Stop is pressed. */
  private sleep(ms: number): Promise<void> {
    const signal = this.abortController?.signal;
    return new Promise<void>((resolve, reject) => {
      if (!signal || signal.aborted) return reject(new Error('Aborted'));
      const timer = setTimeout(resolve, ms);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new Error('Aborted'));
        },
        { once: true },
      );
    });
  }

  private buildApi(): ArduinoSimAPI {
    const store = () => useArduinoSimStore.getState();

    const toLevel = (value: string | number): 0 | 1 => {
      if (typeof value === 'number') return value ? 1 : 0;
      return value === 'HIGH' || value === '1' || value === 'true' ? 1 : 0;
    };

    /**
     * Formats a value the way Arduino's Serial does, not the way JS does.
     *
     * `Serial.println(3.14159)` prints `3.14` on a real board — print(float)
     * defaults to two decimal places. JavaScript would print `3.14159`, so a
     * student comparing the simulator against their hardware would see two
     * different numbers and reasonably conclude one of them is broken.
     * Integers print bare, as they do on the board.
     */
    const formatForSerial = (value: unknown): string => {
      if (typeof value !== 'number') return String(value);
      if (!Number.isFinite(value)) return String(value);
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    };

    const writeSerial = (text: string) => {
      // Arduino's print/println split lines by newline, not by call. Buffer
      // partial text so `print("a"); print("b"); println()` is one line "ab".
      this.serialBuffer += text;
      const parts = this.serialBuffer.split('\n');
      this.serialBuffer = parts.pop() ?? '';
      for (const line of parts) store().appendSerial(line, this.millisNow());
    };

    return {
      onSetup: (cb) => {
        this.hooks.setup = cb;
      },
      onLoop: (cb) => {
        this.hooks.loop = cb;
      },

      pinMode: async (pin, mode) => {
        await this.tick();
        store().setPinMode(this.normalizePin(pin), mode as PinMode);
      },

      digitalWrite: async (pin, value) => {
        await this.tick();
        store().writePin(this.normalizePin(pin), toLevel(value));
      },

      digitalRead: async (pin) => {
        await this.tick();
        const id = this.normalizePin(pin);
        const s = store();
        const wired = s.digitalInputs[id];
        if (wired !== undefined) return wired;
        // Nothing wired: INPUT_PULLUP idles HIGH, a bare INPUT floats low.
        // Never echo back what the sketch itself wrote — that was the old
        // shim's behaviour and it made every button appear pressed.
        return s.pins[id]?.mode === 'INPUT_PULLUP' ? 1 : 0;
      },

      analogWrite: async (pin, value) => {
        await this.tick();
        const duty = Math.max(0, Math.min(this.board.pwmMax, Math.round(Number(value) || 0)));
        store().writePin(this.normalizePin(pin), duty > 0 ? 1 : 0, duty);
      },

      analogRead: async (pin) => {
        await this.tick();
        const id = this.normalizePin(pin);
        const wired = store().analogInputs[id];
        // Unwired ADC pins read 0. Real floating inputs drift, but inventing
        // noise would make sketches non-reproducible for no teaching benefit.
        if (wired === undefined) return 0;
        return Math.max(0, Math.min(this.board.adcMax, Math.round(wired)));
      },

      delay: async (ms) => {
        const requested = Math.max(0, Number(ms) || 0);
        await this.tick();
        // The real thing. No cap — this is the single biggest correctness fix
        // over the old shim, which silently clamped every delay to 10ms and so
        // ran every blink sketch 100x too fast.
        if (requested > 0) await this.sleep(requested);
        this.lastYieldAt = Date.now();
      },

      millis: () => this.millisNow(),

      tick: () => this.tick(),

      serialBegin: async (baud) => {
        await this.tick();
        store().setBaud(baud);
      },

      serialPrint: async (text) => {
        await this.tick();
        writeSerial(formatForSerial(text));
      },

      serialPrintln: async (text) => {
        await this.tick();
        writeSerial(`${formatForSerial(text)}\n`);
      },
    };
  }

  private millisNow(): number {
    return this.startedAt ? Date.now() - this.startedAt : 0;
  }

  /**
   * Compiles the generated sketch code and runs it: setup() once, then loop()
   * until stopped. Resolves when the sketch stops; never throws for Stop.
   */
  public async run(code: string): Promise<void> {
    // Claim this run before stopping the previous one, so the outgoing run can
    // tell it has been superseded.
    const myRun = ++this.runId;
    this.stop();

    const store = useArduinoSimStore.getState();
    store.reset();

    this.abortController = new AbortController();
    this.hooks = {};
    this.serialBuffer = '';
    this.startedAt = Date.now();
    this.lastYieldAt = Date.now();

    const api = this.buildApi();

    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const register = new Function('api', code);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      register(api);
    } catch (e) {
      store.setError(e instanceof Error ? e.message : 'Could not read your blocks');
      this.stop();
      return;
    }

    const { setup, loop } = this.hooks;
    if (!setup && !loop) {
      store.setError('Add an Arduino Program block with some code inside it.');
      this.stop();
      return;
    }

    useArduinoSimStore.getState().setRunning(true);

    try {
      useArduinoSimStore.getState().setPhase('setup');
      if (setup) await setup();

      useArduinoSimStore.getState().setPhase('loop');
      // Forever, exactly like the chip. Bounded only by Stop.
      while (this.abortController && !this.abortController.signal.aborted) {
        if (loop) await loop();
        useArduinoSimStore.getState().bumpIteration();
        // An empty or instantaneous loop() must still let the browser breathe.
        await this.tick();
        await this.sleep(0);
      }
    } catch (e) {
      if (e instanceof Error && e.message !== 'Aborted' && this.runId === myRun) {
        useArduinoSimStore.getState().setError(e.message);
      }
    } finally {
      /**
       * Only tear down if we are still the current run.
       *
       * Pressing Run twice (Ctrl+Enter is not gated by the Stop button) used to
       * kill the sketch outright: the second run aborted the first, then the
       * first unwound into this `finally` and called stop() — which aborted the
       * *second* run's controller and cleared isRunning. The result was a Run
       * that appeared to do nothing at all.
       */
      if (this.runId === myRun) this.stop();
    }
  }

  /** Halts the sketch. Safe to call when nothing is running. */
  public stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    const store = useArduinoSimStore.getState();
    // Flush a trailing Serial.print that never got its newline, so the last
    // thing a student printed doesn't vanish when they hit Stop.
    if (this.serialBuffer) {
      store.appendSerial(this.serialBuffer, this.millisNow());
      this.serialBuffer = '';
    }
    store.setRunning(false);
    store.setPhase('idle');
  }
}

export const arduinoSimEngine = new ArduinoSimEngine();

/**
 * Compiles whatever is on the Blockly canvas and runs it.
 *
 * Shared by the toolbar's Run button and the green flag above the stage, so the
 * two cannot drift apart. The stage flag matters: enabling the stage in
 * hardware mode put a second, Scratch-wired run button on screen that did
 * nothing for an Arduino sketch — two Run buttons, one of them a dud.
 *
 * Reads the workspace off the global the editor already exposes rather than
 * threading a ref through the stage components, which have no other reason to
 * know Blockly exists.
 */
export function runArduinoSketchFromWorkspace(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspace = (window as any).Blockly?.getMainWorkspace?.();
  if (!workspace) return false;
  void arduinoSimEngine.run(workspaceToArduinoSimCode(workspace));
  return true;
}
