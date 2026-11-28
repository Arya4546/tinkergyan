/**
 * board-examples.ts — starter programs for Python on an ESP32 board, and AI
 * programs (which work on the computer and on a board).
 *
 * Pins differ from chip to chip (GPIO34 doesn't exist on an ESP32-C3), so
 * each board example is made for the board the project runs on, using only
 * pins from that board's safe lists in lib/boards.ts.
 */
import { getBoardDefinition } from '../boards';
import { pythonBoardInfo, type PythonBoardTarget } from './targets';
import type { PythonExample } from './examples';

type Json = Record<string, unknown>;

/** Wiring used by the examples, per chip. */
interface Pins {
  led: string; // the built-in LED
  extLed: string;
  button: string;
  knob: string;
  servo: string;
  buzzer: string;
  trig: string;
  echo: string;
  dht: string;
}

const PINS: Record<PythonBoardTarget, Omit<Pins, 'led'>> = {
  'python-esp32': {
    extLed: '26',
    button: '4',
    knob: '34',
    servo: '13',
    buzzer: '25',
    trig: '5',
    echo: '18',
    dht: '15',
  },
  'python-esp32s3': {
    extLed: '5',
    button: '4',
    knob: '1',
    servo: '13',
    buzzer: '14',
    trig: '6',
    echo: '7',
    dht: '15',
  },
  'python-esp32c3': {
    extLed: '6',
    button: '5',
    knob: '0',
    servo: '7',
    buzzer: '10',
    trig: '3',
    echo: '1',
    dht: '11',
  },
};

export function boardPins(target: PythonBoardTarget): Pins {
  const info = pythonBoardInfo(target)!;
  return { led: getBoardDefinition(info.fqbn).builtinLed, ...PINS[target] };
}

// ── Block JSON helpers ──────────────────────────────────────────────────────
const num = (n: number): Json => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
const txt = (t: string): Json => ({ shadow: { type: 'text', fields: { TEXT: t } } });
const block = (b: Json): Json => ({ block: b });
const print = (value: Json): Json => ({ type: 'text_print', inputs: { TEXT: value } });
const wait = (s: number): Json => ({ type: 'py_wait', inputs: { SECONDS: num(s) } });
const seq = (...stmts: Json[]): Json => {
  let next: Json | undefined;
  for (let i = stmts.length - 1; i >= 0; i--) {
    next = next ? { ...stmts[i], next: { block: next } } : { ...stmts[i] };
  }
  return next!;
};
const forever = (...body: Json[]): Json => ({
  type: 'controls_whileUntil',
  fields: { MODE: 'WHILE' },
  inputs: {
    BOOL: block({ type: 'logic_boolean', fields: { BOOL: 'TRUE' } }),
    DO: block(seq(...body)),
  },
});
const ifElse = (cond: Json, then: Json[], otherwise: Json[]): Json => ({
  type: 'controls_if',
  extraState: { hasElse: true },
  inputs: { IF0: block(cond), DO0: block(seq(...then)), ELSE: block(seq(...otherwise)) },
});
const arith = (op: string, a: Json, b: Json): Json => ({
  type: 'math_arithmetic',
  fields: { OP: op },
  inputs: { A: a, B: b },
});
const compare = (op: string, a: Json, b: Json): Json => ({
  type: 'logic_compare',
  fields: { OP: op },
  inputs: { A: a, B: b },
});
const program = (top: Json, vars: Array<{ id: string; name: string }> = []): Json => ({
  variables: vars,
  blocks: { languageVersion: 0, blocks: [{ ...top, x: 30, y: 30 }] },
});

// ── Examples ────────────────────────────────────────────────────────────────

/** Examples that need a board. */
export function boardExamples(target: PythonBoardTarget): PythonExample[] {
  const p = boardPins(target);
  return [
    {
      id: 'board-blink',
      title: 'Blink the LED',
      emoji: '💡',
      blurb: 'Make the light on your board blink on and off.',
      blocks: program(
        forever(
          { type: 'py_led_builtin', fields: { VALUE: '1' } },
          wait(0.5),
          { type: 'py_led_builtin', fields: { VALUE: '0' } },
          wait(0.5),
        ),
      ),
      code: `from machine import Pin
import time

led = Pin(${p.led}, Pin.OUT)  # the LED on the board

while True:
    led.value(1)
    time.sleep(0.5)
    led.value(0)
    time.sleep(0.5)
`,
    },
    {
      id: 'board-button',
      title: 'Button light',
      emoji: '🔘',
      blurb: `The LED lights up while you press a button (wired from pin ${p.button} to GND).`,
      blocks: program(
        forever(
          ifElse(
            { type: 'py_button_pressed', fields: { PIN: p.button } },
            [{ type: 'py_led_builtin', fields: { VALUE: '1' } }],
            [{ type: 'py_led_builtin', fields: { VALUE: '0' } }],
          ),
          wait(0.05),
        ),
      ),
      code: `from machine import Pin
import time

led = Pin(${p.led}, Pin.OUT)
# The button connects pin ${p.button} to GND; PULL_UP makes it read 1 when not pressed.
button = Pin(${p.button}, Pin.IN, Pin.PULL_UP)

while True:
    if button.value() == 0:
        led.value(1)
    else:
        led.value(0)
    time.sleep(0.05)
`,
    },
    {
      id: 'board-knob',
      title: 'Dimmer knob',
      emoji: '🎚️',
      blurb: `Turn a knob (potentiometer on pin ${p.knob}) to dim an LED on pin ${p.extLed}.`,
      blocks: program(
        forever(
          {
            type: 'py_pwm_write',
            fields: { PIN: p.extLed },
            inputs: {
              PERCENT: block(
                arith(
                  'DIVIDE',
                  block(
                    arith(
                      'MULTIPLY',
                      block({ type: 'py_analog_read', fields: { PIN: p.knob } }),
                      num(100),
                    ),
                  ),
                  num(4095),
                ),
              ),
            },
          },
          wait(0.05),
        ),
      ),
      code: `from machine import Pin, PWM, ADC
import time

knob = ADC(Pin(${p.knob}), atten=ADC.ATTN_11DB)  # reads 0 to 3.3 V
led = PWM(Pin(${p.extLed}), freq=1000)

while True:
    value = knob.read_u16()  # 0 to 65535
    led.duty_u16(value)  # the more you turn, the brighter
    print("knob:", value * 100 // 65535, "%")
    time.sleep(0.2)
`,
    },
    {
      id: 'board-servo',
      title: 'Servo sweep',
      emoji: '🦾',
      blurb: `Swing a servo (signal on pin ${p.servo}) from side to side.`,
      blocks: program(
        forever(
          {
            type: 'py_servo_sweep',
            fields: { PIN: p.servo },
            inputs: { FROM: num(0), TO: num(180), SECONDS: num(1) },
          },
          {
            type: 'py_servo_sweep',
            fields: { PIN: p.servo },
            inputs: { FROM: num(180), TO: num(0), SECONDS: num(1) },
          },
        ),
      ),
      code: `from machine import Pin, PWM
import time

servo = PWM(Pin(${p.servo}), freq=50)


def turn(angle):
    # 0.5 ms pulse is 0 degrees, 2.5 ms is 180 degrees
    servo.duty_ns(int(500000 + angle * 2000000 / 180))


while True:
    for angle in range(0, 181, 10):
        turn(angle)
        time.sleep(0.05)
    for angle in range(180, -1, -10):
        turn(angle)
        time.sleep(0.05)
`,
    },
    {
      id: 'board-distance',
      title: 'Parking sensor',
      emoji: '📏',
      blurb: `Beep when something comes close (HC-SR04: trig ${p.trig}, echo ${p.echo}; buzzer on ${p.buzzer}).`,
      blocks: program(
        seq({
          type: 'controls_whileUntil',
          fields: { MODE: 'WHILE' },
          inputs: {
            BOOL: block({ type: 'logic_boolean', fields: { BOOL: 'TRUE' } }),
            DO: block(
              seq(
                print(block({ type: 'py_distance', fields: { TRIG: p.trig, ECHO: p.echo } })),
                {
                  type: 'controls_if',
                  inputs: {
                    IF0: block(
                      compare(
                        'LT',
                        block({ type: 'py_distance', fields: { TRIG: p.trig, ECHO: p.echo } }),
                        num(20),
                      ),
                    ),
                    DO0: block({
                      type: 'py_tone',
                      fields: { PIN: p.buzzer },
                      inputs: { FREQ: num(880), SECONDS: num(0.1) },
                    }),
                  },
                },
                wait(0.2),
              ),
            ),
          },
        }),
      ),
      code: `from machine import Pin, PWM, time_pulse_us
import time

trig = Pin(${p.trig}, Pin.OUT)
echo = Pin(${p.echo}, Pin.IN)
buzzer = PWM(Pin(${p.buzzer}), freq=880, duty_u16=0)


def distance_cm():
    trig.value(0)
    time.sleep_us(2)
    trig.value(1)
    time.sleep_us(10)
    trig.value(0)
    micros = time_pulse_us(echo, 1, 30000)
    if micros < 0:
        return -1  # nothing in range
    return micros / 58


while True:
    d = distance_cm()
    print("distance:", round(d), "cm")
    if 0 <= d < 20:
        buzzer.duty_u16(32768)  # beep!
        time.sleep(0.1)
        buzzer.duty_u16(0)
    time.sleep(0.2)
`,
    },
    {
      id: 'board-dht',
      title: 'Weather station',
      emoji: '🌡️',
      blurb: `Show the temperature and humidity from a DHT11 sensor on pin ${p.dht}.`,
      blocks: program(
        forever(
          print(
            block({
              type: 'text_join',
              extraState: { itemCount: 2 },
              inputs: {
                ADD0: txt('Temperature °C: '),
                ADD1: block({ type: 'py_dht', fields: { WHAT: 'temp', KIND: '11', PIN: p.dht } }),
              },
            }),
          ),
          print(
            block({
              type: 'text_join',
              extraState: { itemCount: 2 },
              inputs: {
                ADD0: txt('Humidity %: '),
                ADD1: block({
                  type: 'py_dht',
                  fields: { WHAT: 'humidity', KIND: '11', PIN: p.dht },
                }),
              },
            }),
          ),
          wait(2),
        ),
      ),
      code: `from machine import Pin
import dht
import time

sensor = dht.DHT11(Pin(${p.dht}))  # use dht.DHT22 for a DHT22

while True:
    sensor.measure()  # the sensor needs 2 seconds between readings
    print("Temperature:", sensor.temperature(), "°C")
    print("Humidity:", sensor.humidity(), "%")
    time.sleep(2)
`,
    },
    {
      id: 'board-melody',
      title: 'Play a tune',
      emoji: '🎵',
      blurb: `Play "Twinkle Twinkle" on a buzzer on pin ${p.buzzer}.`,
      blocks: program(
        seq(
          ...[262, 262, 392, 392, 440, 440, 392].map((f, i) => ({
            type: 'py_tone',
            fields: { PIN: p.buzzer },
            inputs: { FREQ: num(f), SECONDS: num(i === 6 ? 0.6 : 0.3) },
          })),
        ),
      ),
      code: `from machine import Pin, PWM
import time

buzzer = PWM(Pin(${p.buzzer}), freq=440, duty_u16=0)

C, G, A = 262, 392, 440
tune = [(C, 0.3), (C, 0.3), (G, 0.3), (G, 0.3), (A, 0.3), (A, 0.3), (G, 0.6)]

for note, seconds in tune:
    buzzer.freq(note)
    buzzer.duty_u16(32768)
    time.sleep(seconds)
    buzzer.duty_u16(0)
    time.sleep(0.05)
print("The end! 🎶")
`,
    },
  ];
}

/** AI examples: the model trained in AI Studio, on the computer or a board. */
export function aiExamples(target: PythonBoardTarget | null): PythonExample[] {
  const list: PythonExample[] = [
    {
      id: 'ai-what',
      title: 'What does the AI see?',
      emoji: '🤖',
      blurb: 'Turn on the camera and print what your AI model (from AI Studio) sees.',
      blocks: program(
        seq(
          { type: 'py_ai_camera', fields: { STATE: 'on' } },
          {
            type: 'controls_repeat_ext',
            inputs: {
              TIMES: num(30),
              DO: block(seq(print(block({ type: 'py_ai_label' })), wait(1))),
            },
          },
          { type: 'py_ai_camera', fields: { STATE: 'off' } },
        ),
      ),
      code: `import ai
import time

ai.start_camera()
last = ""
for i in range(300):  # about 30 seconds
    seen = ai.label()
    if seen != last:  # only when it changes
        print("I see:", seen, "(" + str(ai.confidence(seen)) + "% sure)")
        last = seen
    time.sleep(0.1)
ai.stop_camera()
print("Done!")
`,
    },
  ];
  if (target) {
    const p = boardPins(target);
    list.push({
      id: 'ai-led',
      title: 'AI light switch',
      emoji: '🚦',
      blurb: 'The board’s LED turns on when the AI sees the first thing you trained.',
      code: `import ai
from machine import Pin
import time

led = Pin(${p.led}, Pin.OUT)
ai.start_camera()

while True:
    names = ai.labels()  # the things your model knows
    if names and ai.label() == names[0]:
        led.value(1)
    else:
        led.value(0)
    time.sleep(0.1)
`,
    });
    list.push({
      id: 'ai-servo',
      title: 'AI servo gate',
      emoji: '🚧',
      blurb: `A servo on pin ${p.servo} opens a gate when the AI sees the first thing you trained.`,
      code: `import ai
from machine import Pin, PWM
import time

servo = PWM(Pin(${p.servo}), freq=50)


def turn(angle):
    # 0.5 ms pulse is 0 degrees, 2.5 ms is 180 degrees
    servo.duty_ns(int(500000 + angle * 2000000 / 180))


ai.start_camera()

while True:
    names = ai.labels()  # the things your model knows
    if names and ai.label() == names[0]:
        turn(90)  # open
    else:
        turn(0)  # closed
    time.sleep(0.1)
`,
    });
  }
  return list;
}
