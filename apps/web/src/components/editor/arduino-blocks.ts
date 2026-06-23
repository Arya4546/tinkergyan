/**
 * arduino-blocks.ts
 *
 * Registers all custom Arduino block definitions for Blockly.
 * Block shapes, colors, inputs, and fields are defined here.
 * Code generation lives in arduino-generator.ts.
 */
import * as Blockly from 'blockly/core';
import { useEditorStore } from '../../stores/editor.store';

// ─── Color palette (consistent with toolbox categories) ──────────────────────
const COLOR_STRUCTURE = '#1565C0'; // Dark blue  — program structure
const COLOR_DIGITAL = '#2E7D32'; // Dark green — digital I/O
const COLOR_ANALOG = '#E65100'; // Deep orange — analog I/O
const COLOR_CONTROL = '#6A1B9A'; // Purple — timing & control
const COLOR_SERIAL = '#B71C1C'; // Dark red — serial comms

// ─── Helpers ─────────────────────────────────────────────────────────────────
const UNO_DIGITAL = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  'LED_BUILTIN',
];
const UNO_PWM = ['3', '5', '6', '9', '10', '11'];
const UNO_ANALOG = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];

const MEGA_DIGITAL = Array.from({ length: 54 }, (_, i) => String(i)).concat(['LED_BUILTIN']);
const MEGA_PWM = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '44', '45', '46'];
const MEGA_ANALOG = Array.from({ length: 16 }, (_, i) => `A${i}`);

const ESP8266_DIGITAL = [
  'D0',
  'D1',
  'D2',
  'D3',
  'D4',
  'D5',
  'D6',
  'D7',
  'D8',
  'RX',
  'TX',
  'LED_BUILTIN',
];
const ESP8266_PWM = ['D1', 'D2', 'D5', 'D6', 'D7', 'D8'];
const ESP8266_ANALOG = ['A0'];

const getDigitalPins = function (this: Blockly.FieldDropdown): [string, string][] {
  const board = useEditorStore.getState().board;
  if (board === 'arduino:avr:mega') {
    return MEGA_DIGITAL.map((p) => [p, p]);
  }
  if (board === 'esp8266:esp8266:nodemcuv2') {
    return ESP8266_DIGITAL.map((p) => [p, p]);
  }
  return UNO_DIGITAL.map((p) => [p, p]);
};

const getPwmPins = function (this: Blockly.FieldDropdown): [string, string][] {
  const board = useEditorStore.getState().board;
  if (board === 'arduino:avr:mega') {
    return MEGA_PWM.map((p) => [p, p]);
  }
  if (board === 'esp8266:esp8266:nodemcuv2') {
    return ESP8266_PWM.map((p) => [p, p]);
  }
  return UNO_PWM.map((p) => [p, p]);
};

const getAnalogPins = function (this: Blockly.FieldDropdown): [string, string][] {
  const board = useEditorStore.getState().board;
  if (board === 'arduino:avr:mega') {
    return MEGA_ANALOG.map((p) => [p, p]);
  }
  if (board === 'esp8266:esp8266:nodemcuv2') {
    return ESP8266_ANALOG.map((p) => [p, p]);
  }
  return UNO_ANALOG.map((p) => [p, p]);
};

const BAUD_RATES = [
  ['9600', '9600'],
  ['19200', '19200'],
  ['38400', '38400'],
  ['57600', '57600'],
  ['115200', '115200'],
] as [string, string][];

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

/** The root block of every sketch — provides setup() and loop() statements. */
Blockly.Blocks['arduino_program'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField(new Blockly.FieldLabel('Arduino Program'), 'TITLE');
    this.appendStatementInput('SETUP').appendField('setup ()  — runs once');
    this.appendStatementInput('LOOP').appendField('loop ()  — runs forever');
    this.setInputsInline(false);
    this.setColour(COLOR_STRUCTURE);
    this.setTooltip('Root block. setup() runs once on boot, loop() runs repeatedly.');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DIGITAL I/O BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

/** pinMode(pin, mode) */
Blockly.Blocks['arduino_pin_mode'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('pinMode(')
      .appendField(new Blockly.FieldDropdown(getDigitalPins), 'PIN')
      .appendField(',')
      .appendField(
        new Blockly.FieldDropdown([
          ['OUTPUT', 'OUTPUT'],
          ['INPUT', 'INPUT'],
          ['INPUT_PULLUP', 'INPUT_PULLUP'],
        ]),
        'MODE',
      )
      .appendField(')');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_DIGITAL);
    this.setTooltip('Configure a digital pin as INPUT or OUTPUT.');
  },
};

/** digitalWrite(pin, value) */
Blockly.Blocks['arduino_digital_write'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('digitalWrite(')
      .appendField(new Blockly.FieldDropdown(getDigitalPins), 'PIN')
      .appendField(',')
      .appendField(
        new Blockly.FieldDropdown([
          ['HIGH', 'HIGH'],
          ['LOW', 'LOW'],
        ]),
        'VALUE',
      )
      .appendField(')');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_DIGITAL);
    this.setTooltip('Write HIGH or LOW to a digital pin.');
  },
};

/** digitalRead(pin) — value block */
Blockly.Blocks['arduino_digital_read'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('digitalRead(')
      .appendField(new Blockly.FieldDropdown(getDigitalPins), 'PIN')
      .appendField(')');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_DIGITAL);
    this.setTooltip('Read the digital value (HIGH=1 or LOW=0) from a pin.');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALOG I/O BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

/** analogRead(pin) — value block, returns 0–1023 */
Blockly.Blocks['arduino_analog_read'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('analogRead(')
      .appendField(new Blockly.FieldDropdown(getAnalogPins), 'PIN')
      .appendField(')');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_ANALOG);
    this.setTooltip('Read an analog value from a pin (0–1023).');
  },
};

/** analogWrite(pin, value 0–255) — PWM output */
Blockly.Blocks['arduino_analog_write'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('VALUE')
      .setCheck('Number')
      .appendField('analogWrite pin')
      .appendField(new Blockly.FieldDropdown(getPwmPins), 'PIN')
      .appendField('value:');
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_ANALOG);
    this.setTooltip('Write a PWM value (0–255) to a PWM-capable pin.');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL / TIMING BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

/** delay */
Blockly.Blocks['arduino_delay'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('DELAY_TIME')
      .setCheck('Number')
      .appendField('delay')
      .appendField(
        new Blockly.FieldDropdown([
          ['ms', 'milli'],
          ['μs', 'micro'],
          ['s', 'sec'],
        ]),
        'TIME_UNIT',
      );
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_CONTROL);
    this.setTooltip('Pause execution for the given amount of time.');
  },
};

/** millis() — value block, returns elapsed ms */
Blockly.Blocks['arduino_millis'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('millis()');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_CONTROL);
    this.setTooltip('Returns the number of milliseconds since the board started.');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SERIAL BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

/** Serial.begin(baud) */
Blockly.Blocks['arduino_serial_begin'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('Serial.begin(')
      .appendField(new Blockly.FieldDropdown(BAUD_RATES), 'BAUD')
      .appendField(')');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_SERIAL);
    this.setTooltip('Initialize serial communication at the given baud rate. Call in setup().');
  },
};

/** Serial.print(value) */
Blockly.Blocks['arduino_serial_print'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('VALUE').setCheck(null).appendField('Serial.print:');
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_SERIAL);
    this.setTooltip('Print data to the serial port (no newline).');
  },
};

/** Serial.println(value) */
Blockly.Blocks['arduino_serial_println'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('VALUE').setCheck(null).appendField('Serial.println:');
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_SERIAL);
    this.setTooltip('Print data to the serial port, followed by a newline.');
  },
};
