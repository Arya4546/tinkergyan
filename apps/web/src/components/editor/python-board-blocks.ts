/**
 * python-board-blocks.ts — Python blocks for ESP32 boards (pins, sensors,
 * servo, sound) and for AI models trained in AI Studio.
 *
 * The board blocks generate standard MicroPython (`machine.Pin`, `PWM`, `ADC`,
 * `dht`) wrapped in small helper functions with plain names, because students
 * read the Python their blocks make. Pin dropdowns use the same safe pin lists
 * as the C++ editor (lib/boards.ts), for whichever ESP32 the project targets.
 *
 * The AI blocks use the `ai` module, which works the same in the browser and
 * on a board (see lib/python/board/ai-module.ts).
 */
import * as Blockly from 'blockly/core';
import { pythonGenerator, Order } from 'blockly/python';
import { getBoardDefinition } from '../../lib/boards';
import { pythonBoardInfo } from '../../lib/python/targets';
import { useEditorStore } from '../../stores/editor.store';
import { useAIStore } from '../../stores/ai.store';

export const PY_PINS_COLOUR = '#2E7D32';
export const PY_ANALOG_COLOUR = '#E65100';
export const PY_SENSOR_COLOUR = '#00838F';
export const PY_AI_COLOUR = '#FF6F61';

type Defs = Record<string, string>;
const defs = (g: typeof pythonGenerator) => (g as unknown as { definitions_: Defs }).definitions_;

// ── Pin lists for the board this project runs on ──────────────────────────
function boardDef() {
  const info = pythonBoardInfo(useEditorStore.getState().board);
  return getBoardDefinition(info?.fqbn ?? 'esp32:esp32:esp32');
}
const opts = (pins: readonly string[]): [string, string][] =>
  pins.length ? pins.map((p) => [p, p]) : [['2', '2']];
/** Pins that can be outputs (input-only pins and LED_BUILTIN left out). */
function outputPins(): [string, string][] {
  return opts(boardDef().pwmPins);
}
function inputPins(): [string, string][] {
  return opts(boardDef().digitalPins.filter((p) => p !== 'LED_BUILTIN'));
}
function analogPins(): [string, string][] {
  return opts(boardDef().analogPins);
}
/** The pin number, with LED_BUILTIN resolved for this board. */
function pinNumber(block: Blockly.Block, field: string): string {
  const v = String(block.getFieldValue(field) ?? '');
  if (v === 'LED_BUILTIN') return boardDef().builtinLed;
  return /^\d+$/.test(v) ? v : '2';
}

// ── AI labels (from the model trained in AI Studio) ────────────────────────
function aiLabels(): [string, string][] {
  const labels = useAIStore
    .getState()
    .classLabels.filter((l) => !l.startsWith('text:') && l.trim() !== '');
  return labels.length ? labels.map((l) => [l, l]) : [['(train a model in AI Studio)', '']];
}

const pinField = (name: string, fn: () => [string, string][]) =>
  new Blockly.FieldDropdown(fn as unknown as Blockly.MenuGenerator) as Blockly.Field;

// ── Block definitions ──────────────────────────────────────────────────────
Blockly.Blocks['py_pin_write'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('turn pin')
      .appendField(pinField('PIN', outputPins), 'PIN')
      .appendField(
        new Blockly.FieldDropdown([
          ['on', '1'],
          ['off', '0'],
        ]),
        'VALUE',
      );
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PY_PINS_COLOUR);
    this.setTooltip('Turns a pin on (3.3 V) or off (0 V) — for an LED, buzzer or relay.');
  },
};

Blockly.Blocks['py_led_builtin'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('turn built-in LED')
      .appendField(
        new Blockly.FieldDropdown([
          ['on', '1'],
          ['off', '0'],
        ]),
        'VALUE',
      );
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PY_PINS_COLOUR);
    this.setTooltip("Turns the LED that's on the board itself on or off.");
  },
};

Blockly.Blocks['py_pin_read'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('pin')
      .appendField(pinField('PIN', inputPins), 'PIN')
      .appendField('is on');
    this.setOutput(true, 'Boolean');
    this.setColour(PY_PINS_COLOUR);
    this.setTooltip('True when the pin reads 3.3 V (on), False when it reads 0 V (off).');
  },
};

Blockly.Blocks['py_button_pressed'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('button on pin')
      .appendField(pinField('PIN', inputPins), 'PIN')
      .appendField('is pressed');
    this.setOutput(true, 'Boolean');
    this.setColour(PY_PINS_COLOUR);
    this.setTooltip(
      'True while a button wired between this pin and GND is pressed. No resistor needed.',
    );
  },
};

Blockly.Blocks['py_analog_read'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('read analog pin')
      .appendField(pinField('PIN', analogPins), 'PIN');
    this.setOutput(true, 'Number');
    this.setColour(PY_ANALOG_COLOUR);
    this.setTooltip(
      'Reads a voltage from 0 (0 V) to 4095 (3.3 V) — for a knob, light sensor or soil sensor.',
    );
  },
};

Blockly.Blocks['py_pwm_write'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('PERCENT')
      .setCheck('Number')
      .appendField('set brightness of pin')
      .appendField(pinField('PIN', outputPins), 'PIN')
      .appendField('to');
    this.appendDummyInput().appendField('%');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PY_ANALOG_COLOUR);
    this.setTooltip('Dims an LED or slows a motor: 0 % is off, 100 % is fully on.');
  },
};

Blockly.Blocks['py_servo'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('ANGLE')
      .setCheck('Number')
      .appendField('turn servo on pin')
      .appendField(pinField('PIN', outputPins), 'PIN')
      .appendField('to');
    this.appendDummyInput().appendField('degrees');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PY_ANALOG_COLOUR);
    this.setTooltip('Moves a hobby servo to an angle from 0 to 180 degrees.');
  },
};

Blockly.Blocks['py_tone'] = {
  init(this: Blockly.Block) {
    this.appendValueInput('FREQ')
      .setCheck('Number')
      .appendField('play tone on pin')
      .appendField(pinField('PIN', outputPins), 'PIN')
      .appendField('at');
    this.appendValueInput('SECONDS').setCheck('Number').appendField('Hz for');
    this.appendDummyInput().appendField('seconds');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PY_ANALOG_COLOUR);
    this.setTooltip('Plays a note on a buzzer. 262 Hz is middle C, 440 Hz is the A above it.');
  },
};

Blockly.Blocks['py_distance'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('distance in cm (trig pin')
      .appendField(pinField('TRIG', outputPins), 'TRIG')
      .appendField('echo pin')
      .appendField(pinField('ECHO', inputPins), 'ECHO')
      .appendField(')');
    this.setOutput(true, 'Number');
    this.setColour(PY_SENSOR_COLOUR);
    this.setTooltip(
      'Distance measured by an HC-SR04 ultrasonic sensor, in cm. Gives -1 when nothing is in range.',
    );
  },
};

Blockly.Blocks['py_dht'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField(
        new Blockly.FieldDropdown([
          ['temperature (°C)', 'temp'],
          ['humidity (%)', 'humidity'],
        ]),
        'WHAT',
      )
      .appendField('from')
      .appendField(
        new Blockly.FieldDropdown([
          ['DHT11', '11'],
          ['DHT22', '22'],
        ]),
        'KIND',
      )
      .appendField('on pin')
      .appendField(pinField('PIN', inputPins), 'PIN');
    this.setOutput(true, 'Number');
    this.setColour(PY_SENSOR_COLOUR);
    this.setTooltip('Reads a DHT11 or DHT22 temperature and humidity sensor.');
  },
};

Blockly.Blocks['py_ai_camera'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('turn AI camera')
      .appendField(
        new Blockly.FieldDropdown([
          ['on', 'on'],
          ['off', 'off'],
        ]),
        'STATE',
      );
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PY_AI_COLOUR);
    this.setTooltip(
      'Starts (or stops) the webcam and your AI model from AI Studio. Train a model there first.',
    );
  },
};

Blockly.Blocks['py_ai_label'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField('what the AI sees');
    this.setOutput(true, 'String');
    this.setColour(PY_AI_COLOUR);
    this.setTooltip('The name of the class your AI model sees right now (empty before it starts).');
  },
};

Blockly.Blocks['py_ai_sees'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('AI sees')
      .appendField(
        new Blockly.FieldDropdown(aiLabels as unknown as Blockly.MenuGenerator),
        'LABEL',
      );
    this.setOutput(true, 'Boolean');
    this.setColour(PY_AI_COLOUR);
    this.setTooltip('True while your AI model thinks it sees this class.');
  },
};

Blockly.Blocks['py_ai_confidence'] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('how sure the AI is it sees')
      .appendField(new Blockly.FieldDropdown(aiLabels as unknown as Blockly.MenuGenerator), 'LABEL')
      .appendField('(%)');
    this.setOutput(true, 'Number');
    this.setColour(PY_AI_COLOUR);
    this.setTooltip('How sure your AI model is about this class, from 0 to 100.');
  },
};

// ── Code generation ────────────────────────────────────────────────────────
function needMachine(g: typeof pythonGenerator, ...names: string[]) {
  const d = defs(g);
  const have = new Set(
    (d['import_machine'] ?? '')
      .replace('from machine import ', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  for (const n of names) have.add(n);
  // Fixed order so the import line doesn't jump around as blocks are added.
  const order = ['Pin', 'PWM', 'ADC', 'time_pulse_us'];
  d['import_machine'] = `from machine import ${order.filter((n) => have.has(n)).join(', ')}`;
}
function needTime(g: typeof pythonGenerator) {
  defs(g)['import_time'] = 'import time';
}
function needPwmTable(g: typeof pythonGenerator) {
  needMachine(g, 'Pin', 'PWM');
  defs(g)['pwm_table'] = '# PWM outputs in use, by pin number\npwm_pins = {}';
}

// provideFunction_ templates use 2-space steps (each becomes one INDENT).
function writePinFn(g: typeof pythonGenerator) {
  needPwmTable(g);
  return g.provideFunction_(
    'write_pin',
    `def ${g.FUNCTION_NAME_PLACEHOLDER_}(pin, on):
  if pin in pwm_pins:
    pwm_pins.pop(pin).deinit()
  Pin(pin, Pin.OUT).value(1 if on else 0)
`,
  );
}

function pwmFn(g: typeof pythonGenerator) {
  needPwmTable(g);
  return g.provideFunction_(
    'pwm_on',
    `def ${g.FUNCTION_NAME_PLACEHOLDER_}(pin, frequency):
  if pin not in pwm_pins:
    pwm_pins[pin] = PWM(Pin(pin), freq=frequency)
  else:
    pwm_pins[pin].freq(frequency)
  return pwm_pins[pin]
`,
  );
}

pythonGenerator.forBlock['py_pin_write'] = (block, g) => {
  const fn = writePinFn(g);
  return `${fn}(${pinNumber(block, 'PIN')}, ${block.getFieldValue('VALUE') === '1' ? 'True' : 'False'})\n`;
};

pythonGenerator.forBlock['py_led_builtin'] = (block, g) => {
  const fn = writePinFn(g);
  return `${fn}(${boardDef().builtinLed}, ${block.getFieldValue('VALUE') === '1' ? 'True' : 'False'})\n`;
};

pythonGenerator.forBlock['py_pin_read'] = (block, g) => {
  needMachine(g, 'Pin');
  return [`(Pin(${pinNumber(block, 'PIN')}, Pin.IN).value() == 1)`, Order.RELATIONAL];
};

pythonGenerator.forBlock['py_button_pressed'] = (block, g) => {
  needMachine(g, 'Pin');
  const fn = g.provideFunction_(
    'button_pressed',
    `def ${g.FUNCTION_NAME_PLACEHOLDER_}(pin):
  # The button connects the pin to GND, so pressed reads 0.
  return Pin(pin, Pin.IN, Pin.PULL_UP).value() == 0
`,
  );
  return [`${fn}(${pinNumber(block, 'PIN')})`, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['py_analog_read'] = (block, g) => {
  needMachine(g, 'Pin', 'ADC');
  const fn = g.provideFunction_(
    'read_analog',
    `def ${g.FUNCTION_NAME_PLACEHOLDER_}(pin):
  adc = ADC(Pin(pin), atten=ADC.ATTN_11DB)
  return adc.read_u16() >> 4  # 0 to 4095
`,
  );
  return [`${fn}(${pinNumber(block, 'PIN')})`, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['py_pwm_write'] = (block, g) => {
  const pwm = pwmFn(g);
  const percent = g.valueToCode(block, 'PERCENT', Order.NONE) || '0';
  const fn = g.provideFunction_(
    'set_brightness',
    `def ${g.FUNCTION_NAME_PLACEHOLDER_}(pin, percent):
  percent = max(0, min(100, percent))
  ${pwm}(pin, 1000).duty_u16(int(percent * 65535 / 100))
`,
  );
  return `${fn}(${pinNumber(block, 'PIN')}, ${percent})\n`;
};

pythonGenerator.forBlock['py_servo'] = (block, g) => {
  const pwm = pwmFn(g);
  const angle = g.valueToCode(block, 'ANGLE', Order.NONE) || '90';
  const fn = g.provideFunction_(
    'set_servo',
    `def ${g.FUNCTION_NAME_PLACEHOLDER_}(pin, angle):
  angle = max(0, min(180, angle))
  # A servo reads a pulse 50 times a second: 0.5 ms is 0 degrees, 2.5 ms is 180.
  ${pwm}(pin, 50).duty_ns(int(500000 + angle * 2000000 / 180))
`,
  );
  return `${fn}(${pinNumber(block, 'PIN')}, ${angle})\n`;
};

pythonGenerator.forBlock['py_tone'] = (block, g) => {
  const pwm = pwmFn(g);
  needTime(g);
  const freq = g.valueToCode(block, 'FREQ', Order.NONE) || '440';
  const seconds = g.valueToCode(block, 'SECONDS', Order.NONE) || '0.5';
  const fn = g.provideFunction_(
    'play_tone',
    `def ${g.FUNCTION_NAME_PLACEHOLDER_}(pin, frequency, seconds):
  if frequency < 1:
    time.sleep(seconds)  # a rest
    return
  buzzer = ${pwm}(pin, int(frequency))
  buzzer.duty_u16(32768)
  time.sleep(seconds)
  buzzer.duty_u16(0)
`,
  );
  return `${fn}(${pinNumber(block, 'PIN')}, ${freq}, ${seconds})\n`;
};

pythonGenerator.forBlock['py_distance'] = (block, g) => {
  needMachine(g, 'Pin', 'time_pulse_us');
  needTime(g);
  const fn = g.provideFunction_(
    'read_distance_cm',
    `def ${g.FUNCTION_NAME_PLACEHOLDER_}(trig_pin, echo_pin):
  trig = Pin(trig_pin, Pin.OUT)
  echo = Pin(echo_pin, Pin.IN)
  trig.value(0)
  time.sleep_us(2)
  trig.value(1)
  time.sleep_us(10)
  trig.value(0)
  micros = time_pulse_us(echo, 1, 30000)
  if micros < 0:
    return -1  # nothing in range
  return round(micros / 58, 1)
`,
  );
  return [`${fn}(${pinNumber(block, 'TRIG')}, ${pinNumber(block, 'ECHO')})`, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['py_dht'] = (block, g) => {
  needMachine(g, 'Pin');
  needTime(g);
  defs(g)['import_dht'] = 'import dht';
  defs(g)['dht_table'] = '# DHT sensors in use: pin -> [sensor, last read time]\ndht_sensors = {}';
  const fn = g.provideFunction_(
    'read_dht',
    `def ${g.FUNCTION_NAME_PLACEHOLDER_}(pin, model, what):
  if pin not in dht_sensors:
    sensor = dht.DHT11(Pin(pin)) if model == 11 else dht.DHT22(Pin(pin))
    dht_sensors[pin] = [sensor, None]
  sensor, last = dht_sensors[pin]
  # The sensor needs 2 seconds between readings; reuse the last one until then.
  if last is None or time.ticks_diff(time.ticks_ms(), last) > 2000:
    sensor.measure()
    dht_sensors[pin][1] = time.ticks_ms()
  return sensor.temperature() if what == 'temp' else sensor.humidity()
`,
  );
  return [
    `${fn}(${pinNumber(block, 'PIN')}, ${block.getFieldValue('KIND') === '22' ? 22 : 11}, '${block.getFieldValue('WHAT') === 'humidity' ? 'humidity' : 'temp'}')`,
    Order.FUNCTION_CALL,
  ];
};

const quote = (s: string) => pythonGenerator.quote_(s);

pythonGenerator.forBlock['py_ai_camera'] = (block, g) => {
  defs(g)['import_ai'] = 'import ai';
  return block.getFieldValue('STATE') === 'off' ? 'ai.stop_camera()\n' : 'ai.start_camera()\n';
};

pythonGenerator.forBlock['py_ai_label'] = (_block, g) => {
  defs(g)['import_ai'] = 'import ai';
  return ['ai.label()', Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['py_ai_sees'] = (block, g) => {
  defs(g)['import_ai'] = 'import ai';
  const label = String(block.getFieldValue('LABEL') ?? '');
  // No model trained yet: "sees nothing" must not be true when nothing is seen.
  if (!label) return ['False', Order.ATOMIC];
  return [`ai.label() == ${quote(label)}`, Order.RELATIONAL];
};

pythonGenerator.forBlock['py_ai_confidence'] = (block, g) => {
  defs(g)['import_ai'] = 'import ai';
  return [
    `ai.confidence(${quote(String(block.getFieldValue('LABEL') ?? ''))})`,
    Order.FUNCTION_CALL,
  ];
};

/** Block types that only work on a board (hidden when running in the browser). */
export const BOARD_ONLY_BLOCKS = [
  'py_pin_write',
  'py_led_builtin',
  'py_pin_read',
  'py_button_pressed',
  'py_analog_read',
  'py_pwm_write',
  'py_servo',
  'py_tone',
  'py_distance',
  'py_dht',
];
