/**
 * hardware-binding.ts
 *
 * Wires the running sketch to the components on the stage, both ways.
 *
 *   outputs:  digitalWrite(13, HIGH)  ->  the LED wired to pin 13 lights up
 *   inputs:   press the button on pin 7  ->  digitalRead(7) returns pressed
 *
 * Both directions live here because they are one idea — "this component is
 * connected to this pin" — and splitting them would mean two places to keep
 * the pin lookup consistent.
 *
 * The stage components already knew how to draw themselves (an LED has
 * `state.on`, a servo has `state.angle`, a pot has a slider). What they never
 * had was any connection to the code. This is that connection.
 */
import { useSimulatorStore, type SimulatorSprite } from '../../../stores/simulator.store';
import { useArduinoSimStore } from '../../../stores/arduino-sim.store';
import { useEditorStore } from '../../../stores/editor.store';
import { getBoardDefinition } from '../../../lib/boards';

/** Max analogRead value for the selected board. AVR is 10-bit, ESP32 12-bit. */
function adcMaxForBoard(): number {
  return useEditorStore.getState().board === 'esp32:esp32:esp32' ? 4095 : 1023;
}

/** LED_BUILTIN and its pin number must resolve to the same key as the engine uses. */
function normalizePin(pin: string): string {
  if (pin !== 'LED_BUILTIN') return pin;
  const board = useEditorStore.getState().board;
  return board.startsWith('esp') ? '2' : '13';
}

/** The pin a component is wired to, or null if the student hasn't wired it. */
function pinOf(sprite: SimulatorSprite): string | null {
  const pin = sprite.state?.pin as string | undefined;
  return pin ? normalizePin(pin) : null;
}

/**
 * Sketch -> stage. Called whenever pin state changes.
 *
 * Only writes when the value actually differs: these updates land in a zustand
 * store that re-renders the stage, and a `loop()` calling digitalWrite every
 * few milliseconds would otherwise repaint every component continuously.
 */
export function applyPinsToStage(): void {
  const { pins } = useArduinoSimStore.getState();
  const { sprites, updateSprite } = useSimulatorStore.getState();

  for (const sprite of sprites) {
    const pin = pinOf(sprite);
    if (!pin) continue;
    const state = pins[pin];
    if (!state) continue;

    if (sprite.type === 'led') {
      const on = state.value === 1;
      // PWM dims the LED rather than just switching it. `analogWrite(led, 128)`
      // is half brightness on real hardware, and showing it fully lit would
      // make a fade lesson look broken. Undefined duty means a plain
      // digitalWrite, which is full brightness.
      const brightness = state.duty !== undefined ? Math.max(0, Math.min(1, state.duty / 255)) : 1;
      if (sprite.state?.on !== on || sprite.state?.brightness !== brightness) {
        updateSprite(sprite.id, { state: { ...sprite.state, on, brightness } });
      }
      continue;
    }

    if (sprite.type === 'servo') {
      // A hobby servo is driven by analogWrite here, so map duty onto the
      // usual 0-180° travel. Without a PWM write (plain digitalWrite) treat
      // HIGH as full deflection, which is what a student would see if they
      // wired a servo signal line to a digital output.
      const angle =
        state.duty !== undefined
          ? Math.round((state.duty / 255) * 180)
          : state.value === 1
            ? 180
            : 0;
      if (sprite.state?.angle !== angle) {
        updateSprite(sprite.id, { state: { ...sprite.state, angle } });
      }
      continue;
    }

    if (sprite.type === 'robot_car') {
      const moving = state.value === 1;
      if (sprite.state?.moving !== moving) {
        updateSprite(sprite.id, { state: { ...sprite.state, moving } });
      }
    }
  }
}

/**
 * Stage -> sketch. Called whenever a student touches a component.
 *
 * Buttons deliberately respect INPUT_PULLUP. A real button wires the pin to
 * ground, so with the internal pull-up enabled it reads HIGH at rest and LOW
 * when pressed — the inversion that confuses every beginner the first time.
 * Reproducing it means a sketch written against the simulator still works when
 * it is uploaded to real hardware, which is the entire point.
 */
export function applyStageToPins(): void {
  const sim = useArduinoSimStore.getState();
  const { sprites } = useSimulatorStore.getState();
  const adcMax = adcMaxForBoard();

  for (const sprite of sprites) {
    const pin = pinOf(sprite);
    if (!pin) continue;

    if (sprite.type === 'button') {
      const pressed = Boolean(sprite.state?.pressed);
      const pulledUp = sim.pins[pin]?.mode === 'INPUT_PULLUP';
      const level: 0 | 1 = pulledUp ? (pressed ? 0 : 1) : pressed ? 1 : 0;
      if (sim.digitalInputs[pin] !== level) sim.setDigitalInput(pin, level);
      continue;
    }

    if (sprite.type === 'potentiometer') {
      // The knob UI is fixed at 0-1023; scale onto whatever this board's ADC
      // actually reports so the same sketch reads 0-4095 on an ESP32.
      const raw = Number(sprite.state?.value ?? 0);
      const scaled = Math.round((raw / 1023) * adcMax);
      if (sim.analogInputs[pin] !== scaled) sim.setAnalogInput(pin, scaled);
    }
  }
}

/**
 * Starts both directions. Returns an unsubscribe function.
 *
 * Subscriptions rather than React effects: pin state changes at sketch speed
 * (potentially every few milliseconds), and routing that through component
 * re-renders would make the simulation's frame rate depend on React's.
 */
export function startHardwareBinding(): () => void {
  // Seed once so components reflect current state immediately on Run.
  applyStageToPins();
  applyPinsToStage();

  const unsubPins = useArduinoSimStore.subscribe((state, prev) => {
    if (state.pins === prev.pins) return;
    applyPinsToStage();
    // Inputs have to be recomputed too, because a pin's *mode* changes what its
    // component means: an idle button reads LOW normally but HIGH once setup()
    // calls pinMode(INPUT_PULLUP). Modes are set while the sketch runs, long
    // after the sprite was placed, so watching sprite changes alone left every
    // pull-up button stuck reporting "pressed".
    //
    // No feedback loop: this writes digitalInputs/analogInputs, which are
    // separate keys from `pins`, so it cannot retrigger this subscription.
    applyStageToPins();
  });

  const unsubSprites = useSimulatorStore.subscribe((state, prev) => {
    if (state.sprites !== prev.sprites) applyStageToPins();
  });

  return () => {
    unsubPins();
    unsubSprites();
  };
}

/** Digital pin choices for the wiring dropdown, for the current board. */
export function availablePins(kind: 'digital' | 'analog' | 'pwm'): readonly string[] {
  const def = getBoardDefinition(useEditorStore.getState().board);
  if (kind === 'analog') return def.analogPins;
  if (kind === 'pwm') return def.pwmPins;
  return def.digitalPins;
}

/** Which pin list a component should offer, based on what it is. */
export function pinKindFor(type: SimulatorSprite['type']): 'digital' | 'analog' | 'pwm' | null {
  switch (type) {
    case 'led':
    case 'button':
    case 'robot_car':
      return 'digital';
    case 'servo':
      return 'pwm';
    case 'potentiometer':
      return 'analog';
    default:
      return null; // characters and the board graphic aren't wired to anything
  }
}
