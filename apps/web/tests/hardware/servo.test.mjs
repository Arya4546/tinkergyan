// Servo motor blocks, for Arduino C++ projects and ESP32 MicroPython projects.
//
// The C++ is compiled with g++ against the API's Arduino shim (the same Servo emulation
// the code editor's cloud compile uses) and run, so the angles each block sends are
// checked, not just the text. The simulator code runs on a fake clock, and the
// Python runs in the test MicroPython with a fake `machine` module.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  cppToBlocks,
  getToolbox,
  setBoard,
  jsonToCpp,
  xmlToCpp,
  jsonToSim,
  xmlBlockTypes,
  analogWriteWarning,
} from './hardware.mjs';
import { prepareForWandbox } from '../../../api/src/lib/arduino-shim.ts';
import {
  jsonToPython,
  pythonToBlocks,
  setBoard as setPythonBoard,
  getToolbox as getPythonToolbox,
  toolboxEntryToPython,
} from '../python/blocks.mjs';
import { run as runPython } from '../python/harness.mjs';

// ── Building programs ───────────────────────────────────────────────────────

const n = (v) => ({ shadow: { type: 'math_number', fields: { NUM: v } } });
function chain(list) {
  if (!list.length) return undefined;
  const [head, ...rest] = list;
  return { block: rest.length ? { ...head, next: chain(rest) } : head };
}
/** An Arduino program: blocks in setup() and loop(), plus any other top-level blocks. */
const sketch = (setup, loop = [], extra = [], variables = []) => ({
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: 'arduino_program',
        x: 0,
        y: 0,
        inputs: Object.fromEntries(
          [
            ['SETUP', chain(setup)],
            ['LOOP', chain(loop)],
          ].filter(([, v]) => v),
        ),
      },
      ...extra.map((b, i) => ({ ...b, x: 600, y: i * 200 })),
    ],
  },
  variables,
});
const write = (pin, angle) => ({
  type: 'arduino_servo_write',
  fields: { PIN: pin },
  inputs: { ANGLE: typeof angle === 'object' ? angle : n(angle) },
});
const sweep = (pin, from, to, seconds) => ({
  type: 'arduino_servo_sweep',
  fields: { PIN: pin },
  inputs: { FROM: n(from), TO: n(to), SECONDS: n(seconds) },
});
const spin = (pin, speed) => ({
  type: 'arduino_servo_spin',
  fields: { PIN: pin },
  inputs: { SPEED: n(speed) },
});
const release = (pin) => ({ type: 'arduino_servo_release', fields: { PIN: pin } });

// ── Running the C++ ─────────────────────────────────────────────────────────

const hasGpp = (() => {
  try {
    execFileSync('g++', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-servo-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
let compiled = 0;

/** Compiles a sketch with the shim, runs it, and returns the servo events from setup(). */
function runCpp(cpp) {
  const file = path.join(tmp, `s${++compiled}.cpp`);
  fs.writeFileSync(file, prepareForWandbox(cpp).code);
  execFileSync('g++', ['-std=c++17', '-w', '-o', `${file}.out`, file], { stdio: 'pipe' });
  const out = execFileSync(`${file}.out`, { encoding: 'utf8' });
  const setupOut = out.split('--- loop() running')[0];
  return [...setupOut.matchAll(/\[SIM\] Servo\.(attach|detach|write)\((\d+)?/g)].map((m) =>
    m[1] === 'write' ? Number(m[2]) : m[1] === 'attach' ? `attach ${m[2]}` : 'detach',
  );
}

// ── C++ ─────────────────────────────────────────────────────────────────────

test('servo C++ uses the right library for each board', async (t) => {
  const cases = [
    ['arduino:avr:uno', '9', '<Servo.h>'],
    ['arduino:avr:nano', '9', '<Servo.h>'],
    ['arduino:avr:mega', '44', '<Servo.h>'],
    ['esp8266:esp8266:nodemcuv2', 'D1', '<Servo.h>'],
    ['esp32:esp32:esp32', '18', '<ESP32Servo.h>'],
    ['esp32:esp32:esp32s3', '4', '<ESP32Servo.h>'],
    ['esp32:esp32:esp32c3', '5', '<ESP32Servo.h>'],
  ];
  for (const [board, pin, include] of cases) {
    await t.test(board, () => {
      setBoard(board);
      const cpp = jsonToCpp(sketch([write(pin, 90)], [release(pin)]));
      assert.equal(cpp.match(/#include <(ESP32)?Servo\.h>/g)?.length, 1, cpp);
      assert.ok(cpp.includes(`#include ${include}`), cpp);
      assert.ok(cpp.includes(`Servo servo_${pin};`), cpp);
      assert.ok(cpp.includes(`servoWrite(servo_${pin}, ${pin}, 90);`), cpp);
      assert.ok(cpp.includes(`servo_${pin}.detach();`), cpp);
    });
  }
  setBoard('arduino:avr:uno');
});

test('servo C++ compiles and sends the right angles', { skip: !hasGpp && 'no g++' }, async (t) => {
  setBoard('arduino:avr:uno');
  const cases = {
    'angles are kept to 0-180, decimals dropped': [
      [write('9', -20), write('9', 999), write('9', 45.7)],
      ['attach 9', 0, 180, 45],
    ],
    'an angle worked out with maths': [
      [
        write('9', {
          block: {
            type: 'math_arithmetic',
            fields: { OP: 'MULTIPLY' },
            inputs: { A: n(30), B: n(2) },
          },
        }),
      ],
      ['attach 9', 60],
    ],
    'sweep up': [[sweep('9', 0, 4, 0)], ['attach 9', 0, 1, 2, 3, 4]],
    'sweep down': [[sweep('9', 5, 2, 0)], ['attach 9', 5, 4, 3, 2]],
    'sweep to the same angle': [[sweep('9', 7, 7, 0.01)], ['attach 9', 7]],
    'sweep past the ends stops at 180': [
      [sweep('9', 176, 999, 0)],
      ['attach 9', 176, 177, 178, 179, 180],
    ],
    'sweep with negative seconds goes at once': [[sweep('9', 3, 0, -5)], ['attach 9', 3, 2, 1, 0]],
    'spin speeds': [
      [
        spin('9', 0),
        spin('9', 100),
        spin('9', -100),
        spin('9', 50),
        spin('9', -33),
        spin('9', 500),
      ],
      ['attach 9', 90, 180, 0, 135, 61, 180],
    ],
    'release, then turn again: attaches again': [
      [write('9', 10), release('9'), write('9', 20)],
      ['attach 9', 10, 'detach', 'attach 9', 20],
    ],
    'release before it was ever turned': [[release('9')], []],
    'two servos': [
      [write('9', 10), write('10', 170), write('9', 11)],
      ['attach 9', 10, 'attach 10', 170, 11],
    ],
  };
  for (const [name, [blocks, want]] of Object.entries(cases)) {
    await t.test(name, () => {
      const cpp = jsonToCpp(sketch(blocks));
      assert.deepEqual(runCpp(cpp), want, cpp);
    });
  }
});

test('servo C++ edge cases', { skip: !hasGpp && 'no g++' }, async (t) => {
  setBoard('arduino:avr:uno');
  await t.test('every servo block on one pin: one Servo, each helper once', () => {
    const cpp = jsonToCpp(
      sketch([write('9', 1), sweep('9', 1, 2, 0)], [spin('9', 0), release('9'), write('9', 3)]),
    );
    assert.equal(cpp.match(/^Servo /gm)?.length, 1, cpp);
    for (const fn of ['servoWrite', 'servoSweep', 'servoSpin'])
      assert.equal(cpp.match(new RegExp(`^void ${fn}\\(`, 'gm'))?.length, 1, cpp);
    // Declarations come before the helpers and setup().
    assert.ok(cpp.indexOf('Servo servo_9;') < cpp.indexOf('void servoWrite('), cpp);
    assert.deepEqual(runCpp(cpp), ['attach 9', 1, 1, 2]);
  });
  await t.test('a variable already called servo_9', () => {
    const cpp = jsonToCpp(
      sketch(
        [
          {
            type: 'variables_set',
            fields: { VAR: { id: 'v' } },
            inputs: { VALUE: n(5) },
            next: { block: write('9', 33) },
          },
        ],
        [],
        [],
        [{ name: 'servo_9', id: 'v' }],
      ),
    );
    assert.match(cpp, /int servo_9 = /, cpp);
    const obj = /^Servo (\w+);/m.exec(cpp)?.[1];
    assert.ok(obj && obj !== 'servo_9', cpp);
    assert.deepEqual(runCpp(cpp), ['attach 9', 33]);
  });
  await t.test('inside a function called from setup', () => {
    const cpp = jsonToCpp(
      sketch(
        [
          {
            type: 'procedures_callnoreturn',
            extraState: { name: 'wave' },
          },
        ],
        [],
        [
          {
            type: 'procedures_defnoreturn',
            fields: { NAME: 'wave' },
            inputs: { STACK: chain([sweep('6', 0, 2, 0), release('6')]) },
          },
        ],
      ),
    );
    assert.deepEqual(runCpp(cpp), ['attach 6', 0, 1, 2, 'detach']);
  });
  await t.test('a student variable called D1 is still declared', () => {
    const cpp = jsonToCpp(
      sketch(
        [
          {
            type: 'variables_set',
            fields: { VAR: { id: 'd' } },
            inputs: { VALUE: n(7) },
            next: { block: write('9', 7) },
          },
        ],
        [],
        [],
        [{ name: 'D1', id: 'd' }],
      ),
    );
    // (Not compiled: the shim itself defines D1 as a pin.)
    assert.match(cpp, /int D1 = /, cpp);
    assert.match(cpp, /\bD1 = 7;/, cpp);
  });
  await t.test('only in loop()', () => {
    const cpp = jsonToCpp(sketch([], [write('3', 45)]));
    assert.ok(cpp.includes('#include <Servo.h>'), cpp);
    runCpp(cpp); // compiles and runs
  });
});

test('sweep takes the time it is given', { skip: !hasGpp && 'no g++' }, () => {
  setBoard('arduino:avr:uno');
  // Uses the C++ helper with a real clock: 0→20 degrees in 0.2 s (the shim caps each
  // delay at 10 ms, so the helper's own timing has to do the waiting).
  const cpp = jsonToCpp(sketch([sweep('9', 0, 20, 0.2)]));
  const file = path.join(tmp, 'timed.cpp');
  const timed = cpp
    .replace('void setup() {', 'void setup() {\n  unsigned long t0 = millis();')
    .replace(
      /(servoSweep\(servo_9, 9, 0, 20, 0\.2\);)/,
      '$1\n  std::cout << "[TOOK] " << (millis() - t0) << std::endl;',
    );
  fs.writeFileSync(file, prepareForWandbox(timed).code);
  execFileSync('g++', ['-std=c++17', '-w', '-o', `${file}.out`, file]);
  const took = Number(
    /\[TOOK\] (\d+)/.exec(execFileSync(`${file}.out`, { encoding: 'utf8' }))?.[1],
  );
  assert.ok(took >= 195 && took <= 260, `took ${took} ms`);
});

test('analogWrite next to a servo on Uno pin 9 or 10 is warned about', async (t) => {
  const dim = (pin) => ({
    type: 'arduino_analog_write',
    fields: { PIN: pin },
    inputs: { VALUE: n(100) },
  });
  const cases = [
    ['arduino:avr:uno', [write('3', 90), dim('9')], /can't dim pin 9.*pin 3, 5, 6 or 11/],
    ['arduino:avr:uno', [write('3', 90), dim('10')], /can't dim pin 10/],
    ['arduino:avr:nano', [write('3', 90), dim('10')], /can't dim pin 10/],
    ['arduino:avr:uno', [write('3', 90), dim('5')], null],
    ['arduino:avr:uno', [dim('9')], null],
    [
      'arduino:avr:uno',
      [{ ...write('3', 90), disabledReasons: ['MANUALLY_DISABLED'] }, dim('9')],
      null,
    ],
    ['arduino:avr:mega', [write('3', 90), dim('44')], /can't dim pin 44.*pins 2 to 13/],
    ['arduino:avr:mega', [write('3', 90), dim('9')], null],
    ['esp32:esp32:esp32', [write('18', 90), dim('19')], null],
  ];
  for (const [board, blocks, want] of cases) {
    await t.test(`${board} ${blocks.map((b) => `${b.type}:${b.fields.PIN}`).join(' ')}`, () => {
      setBoard(board);
      const text = analogWriteWarning(sketch(blocks));
      if (want) assert.match(text ?? '', want);
      else assert.equal(text, null);
    });
  }
  setBoard('arduino:avr:uno');
});

// ── Simulator ───────────────────────────────────────────────────────────────

/** Runs simulator code on a fake clock; returns [pin, angle, ms] for each servo write. */
async function runSim(code) {
  let now = 0;
  const writes = [];
  const hooks = {};
  const api = {
    onSetup: (f) => (hooks.setup = f),
    onLoop: (f) => (hooks.loop = f),
    analogWrite: async (pin, duty) => writes.push([pin, Math.round((duty / 255) * 180), now]),
    delay: async (ms) => {
      now += ms;
    },
    millis: () => now,
    tick: async () => {},
    pinMode: async () => {},
  };
  new Function('api', code)(api);
  await hooks.setup();
  return { writes, now };
}

test('the simulator turns the servo the same way', async (t) => {
  setBoard('arduino:avr:uno');
  await t.test('angles, spin and release', async () => {
    const { writes } = await runSim(
      jsonToSim(
        sketch([
          write('9', -20),
          write('9', 999),
          write('9', 45.7),
          spin('9', -33),
          spin('9', 50),
          release('9'),
        ]),
      ),
    );
    assert.deepEqual(
      writes.map((w) => w[1]),
      [0, 180, 45, 61, 135],
    );
    assert.ok(writes.every((w) => w[0] === '9'));
  });
  await t.test('sweep 0 to 180 in 1 second', async () => {
    const { writes, now } = await runSim(jsonToSim(sketch([sweep('9', 0, 180, 1)])));
    assert.equal(writes.length, 181);
    assert.deepEqual(
      writes.map((w) => w[1]),
      Array.from({ length: 181 }, (_, i) => i),
    );
    assert.ok(Math.abs(now - 1000) < 1, `took ${now} ms`);
  });
  await t.test('inside a function', async () => {
    const { writes } = await runSim(
      jsonToSim(
        sketch(
          [{ type: 'procedures_callnoreturn', extraState: { name: 'wave' } }, write('9', 5)],
          [],
          [
            {
              type: 'procedures_defnoreturn',
              fields: { NAME: 'wave' },
              inputs: { STACK: chain([sweep('9', 0, 2, 0), spin('9', 100)]) },
            },
          ],
        ),
      ),
    );
    assert.deepEqual(
      writes.map((w) => w[1]),
      [0, 1, 2, 180, 5],
    );
  });
  await t.test('sweep down, and to the same angle', async () => {
    let r = await runSim(jsonToSim(sketch([sweep('5', 3, 0, 0)])));
    assert.deepEqual(
      r.writes.map((w) => w[1]),
      [3, 2, 1, 0],
    );
    r = await runSim(jsonToSim(sketch([sweep('5', 90, 90, 0.5)])));
    assert.deepEqual(
      r.writes.map((w) => w[1]),
      [90],
    );
    assert.equal(r.now, 500);
  });
});

// ── Convert C++ to blocks ───────────────────────────────────────────────────

test('servo blocks → C++ → blocks gives the same C++', async (t) => {
  const programs = {
    'every block': sketch([write('9', 0)], [sweep('9', 0, 180, 1), spin('10', 50), release('9')]),
    'release only': sketch([release('6')]),
    'in a function': sketch(
      [{ type: 'procedures_callnoreturn', extraState: { name: 'wave' } }],
      [],
      [
        {
          type: 'procedures_defnoreturn',
          fields: { NAME: 'wave' },
          inputs: { STACK: chain([sweep('6', 0, 90, 2), release('6')]) },
        },
      ],
    ),
  };
  for (const board of ['arduino:avr:uno', 'esp8266:esp8266:nodemcuv2', 'esp32:esp32:esp32']) {
    setBoard(board);
    const pins = board.startsWith('esp8266')
      ? { 9: 'D1', 10: 'D2', 6: 'D5' }
      : board.startsWith('esp32')
        ? { 9: '18', 10: '19', 6: '23' }
        : {};
    for (const [name, prog] of Object.entries(programs)) {
      await t.test(`${board} ${name}`, () => {
        const json = JSON.parse(
          JSON.stringify(prog).replace(/"PIN":"(\d+)"/g, (m, p) => `"PIN":"${pins[p] ?? p}"`),
        );
        const cpp = jsonToCpp(json);
        const xml = cppToBlocks(cpp);
        assert.equal(xmlToCpp(xml), cpp);
        assert.doesNotMatch(xml, /<variable>servo_/);
      });
    }
  }
  setBoard('arduino:avr:uno');
});

test('hand-written servo sketches convert to servo blocks', async (t) => {
  setBoard('arduino:avr:uno');
  await t.test('the Arduino "Sweep" pattern', () => {
    const xml = cppToBlocks(`#include <Servo.h>
Servo myservo;
int pos = 0;
void setup() {
  myservo.attach(9);
}
void loop() {
  for (pos = 0; pos <= 180; pos += 1) {
    myservo.write(pos);
    delay(15);
  }
  myservo.detach();
}`);
    const types = xmlBlockTypes(xml);
    assert.ok(types.includes('arduino_servo_write'), types.join());
    assert.ok(types.includes('arduino_servo_release'), types.join());
    assert.ok(!types.some((ty) => ty.startsWith('procedures_')), types.join());
    assert.doesNotMatch(xml, /<variable>myservo/);
    const cpp = xmlToCpp(xml);
    assert.match(cpp, /servoWrite\(servo_9, 9, pos\);/);
  });
  await t.test('attach after use, pin from a constant', () => {
    const xml = cppToBlocks(`#include <Servo.h>
const int SERVO_PIN = 6;
Servo arm;
void loop() { arm.write(120); }
void setup() { arm.attach(SERVO_PIN); }`);
    assert.match(xmlToCpp(xml), /servoWrite\(servo_6, 6, 120\);/);
  });
  await t.test('helpers defined after loop(), with a prototype first', () => {
    const xml = cppToBlocks(`#include <Servo.h>
Servo arm;
void servoSweep(Servo &servo, int pin, int from, int to, float seconds);
void setup() { arm.attach(9); }
void loop() {
  servoSweep(arm, 9, 0, 180, 1);
  blink();
}
void servoSweep(Servo &servo, int pin, int from, int to, float seconds) {
  servo.write(to);
}
void blink() { digitalWrite(13, HIGH); }`);
    const types = xmlBlockTypes(xml);
    assert.ok(types.includes('arduino_servo_sweep'), types.join());
    // blink() is still a function of its own, with its block inside.
    assert.ok(types.includes('arduino_digital_write'), types.join());
    assert.match(xmlToCpp(xml), /servoSweep\(servo_9, 9, 0, 180, 1\);/);
  });
  await t.test("a student's own servoWrite with other parameters stays their function", () => {
    const xml = cppToBlocks(`#include <Servo.h>
Servo s;
void servoWrite(Servo &servo, int angle) {
  servo.write(angle);
}
void setup() { s.attach(9); }
void loop() { servoWrite(s, 45); }`);
    const types = xmlBlockTypes(xml);
    assert.ok(types.includes('procedures_defnoreturn'), types.join());
    assert.ok(types.includes('procedures_callnoreturn'), types.join());
    // Inside it, servo.write is the parameter, not a servo block with a made-up pin.
    assert.doesNotMatch(xml, /arduino_servo_write"><field name="PIN">45/);
  });
  await t.test('a pin held in a plain variable stays as code', () => {
    const xml = cppToBlocks(`#include <Servo.h>
Servo s;
int p;
void setup() { p = 9; s.attach(p); }
void loop() { s.write(30); }`);
    assert.ok(!xmlBlockTypes(xml).includes('arduino_servo_write'));
  });
  await t.test('ESP8266 pin names are not variables', () => {
    setBoard('esp8266:esp8266:nodemcuv2');
    const xml = cppToBlocks(`#include <Servo.h>
Servo s;
void setup() { s.attach(D1); }
void loop() { s.write(30); analogWrite(D2, 10); }`);
    assert.doesNotMatch(xml, /<variable>D[12]<\/variable>/);
    assert.match(xmlToCpp(xml), /servoWrite\(servo_D1, D1, 30\);/);
    setBoard('arduino:avr:uno');
  });
  await t.test('a servo with no pin stays as code', () => {
    const xml = cppToBlocks(`#include <Servo.h>
Servo s;
void setup() {}
void loop() { s.write(10); }`);
    assert.ok(!xmlBlockTypes(xml).includes('arduino_servo_write'));
  });
});

test('every block in the hardware toolbox makes C++', async (t) => {
  for (const board of ['arduino:avr:uno', 'esp8266:esp8266:nodemcuv2', 'esp32:esp32:esp32c3']) {
    setBoard(board);
    const servo = getToolbox('hardware', board).contents.find((c) => c.name === '⚙️ Servo Motor');
    for (const entry of servo.contents) {
      await t.test(`${board} ${entry.type}`, () => {
        const block = { ...entry };
        delete block.kind;
        const cpp = jsonToCpp(sketch([block]));
        assert.doesNotMatch(cpp, /undefined|NaN/);
        assert.match(cpp, /Servo servo_\w+;/);
      });
    }
  }
  setBoard('arduino:avr:uno');
});

// ── MicroPython (ESP32) ─────────────────────────────────────────────────────

const pyWrite = (angle) => ({
  type: 'py_servo',
  fields: { PIN: '4' },
  inputs: { ANGLE: n(angle) },
});
const pySweep = (from, to, s) => ({
  type: 'py_servo_sweep',
  fields: { PIN: '4' },
  inputs: { FROM: n(from), TO: n(to), SECONDS: n(s) },
});
const pySpin = (speed) => ({
  type: 'py_servo_spin',
  fields: { PIN: '4' },
  inputs: { SPEED: n(speed) },
});
const pyRelease = () => ({ type: 'py_servo_release', fields: { PIN: '4' } });
const pyProgram = (blocks) => ({
  blocks: { languageVersion: 0, blocks: [{ ...chain(blocks).block, x: 0, y: 0 }] },
});

// A fake `machine` (PWM pulses logged as angles) and a fake clock in `time` that sleep moves on.
const FAKE_BOARD = `
import sys
class _Mod:
    pass
import time as _time
machine = _Mod()
clock = [0]
log = []
class Pin:
    OUT = 1
    IN = 0
    def __init__(self, n, *a):
        self.n = n
class PWM:
    def __init__(self, pin, freq=0):
        self.pin = pin.n
        log.append("on")
    def freq(self, f):
        pass
    def duty_ns(self, ns):
        a = round((ns - 500000) * 180 / 2000000, 1)
        log.append(int(a) if a == int(a) else a)
    def deinit(self):
        log.append("off")
machine.Pin = Pin
machine.PWM = PWM
def _sleep_ms(ms):
    clock[0] += ms
_time.ticks_ms = lambda: clock[0]
_time.ticks_diff = lambda a, b: a - b
_time.sleep_ms = _sleep_ms
_time.sleep = lambda s: _sleep_ms(int(s * 1000))
sys.modules["machine"] = machine
`;

test('ESP32 servo blocks: Python works and converts back to blocks', async (t) => {
  setPythonBoard('python-esp32');
  const cases = {
    'angles are kept to 0-180': [
      [pyWrite(-20), pyWrite(999), pyWrite(45.5)],
      ['on', 0, 180, 45.5],
    ],
    'sweep up in 1 s': [[pySweep(0, 3, 1)], ['on', 0, 1, 2, 3], 1000],
    'sweep down, past the end': [[pySweep(2, -50, 0)], ['on', 2, 1, 0], 0],
    'sweep to the same angle waits': [[pySweep(90, 90, 0.5)], ['on', 90], 500],
    'spin speeds': [
      [pySpin(0), pySpin(100), pySpin(-100), pySpin(500)],
      ['on', 90, 180, 0, 180],
    ],
    'release, then turn again': [
      [pyWrite(10), pyRelease(), pyWrite(20)],
      ['on', 10, 'off', 'on', 20],
    ],
    'release before it was ever turned': [
      [pyRelease(), pyWrite(5)],
      ['on', 5],
    ],
  };
  try {
    for (const [name, [blocks, want, ms]] of Object.entries(cases)) {
      await t.test(name, async () => {
        const code = jsonToPython(pyProgram(blocks));
        assert.equal(pythonToBlocks(code, { onBoard: true }).code, code);
        const r = await runPython(`${FAKE_BOARD}\n${code}\nprint(log)\nprint(clock[0])`, [], {
          echo: false,
        });
        assert.ok(r.ok, `${r.error?.name}: ${r.error?.message}\n${code}`);
        const [logLine, clockLine] = r.out.trim().split('\n').slice(-2);
        assert.equal(logLine, JSON.stringify(want).replace(/"/g, "'").replace(/,/g, ', '), code);
        if (ms !== undefined) assert.equal(Number(clockLine), ms);
      });
    }
    await t.test('every servo block in the Python toolbox', () => {
      const cat = getPythonToolbox('python', 'python-esp32').contents.find(
        (c) => c.name === '⚙️ Servo Motor',
      );
      assert.deepEqual(
        cat.contents.map((e) => e.type),
        ['py_servo', 'py_servo_sweep', 'py_servo_spin', 'py_servo_release'],
      );
      for (const entry of cat.contents)
        assert.doesNotMatch(toolboxEntryToPython(entry), /undefined/);
    });
  } finally {
    setPythonBoard('python');
  }
});
