/**
 * boards.ts
 *
 * Single source of truth for every board the frontend knows about.
 * UI dropdowns (Editor, Settings, BlocklyWorkspace), the Blockly pin
 * dropdowns, and the Web Serial flasher all derive from this registry —
 * adding a board here is the only frontend change needed.
 *
 * The FQBN list must stay in sync with SUPPORTED_BOARDS in
 * apps/api/src/services/compile.service.ts and the cores installed by
 * scripts/setup-arduino-cli.sh.
 */
import type { KnownBoardTarget } from '@tinkergyan/shared-types';

export type BoardFqbn = KnownBoardTarget;

export interface BoardDefinition {
  fqbn: BoardFqbn;
  label: string;
  /** Options shown in Blockly digital pin dropdowns. */
  digitalPins: readonly string[];
  /** Options shown in Blockly PWM (analogWrite) pin dropdowns. */
  pwmPins: readonly string[];
  /** Options shown in Blockly analog read pin dropdowns. */
  analogPins: readonly string[];
  /**
   * Baud rates to try (in order) when syncing an AVR serial bootloader.
   * Nano lists 57600 second because old-bootloader clones ship at that rate.
   * Ignored by ESP boards — esptool-js negotiates its own connection.
   */
  uploadBauds: readonly number[];
}

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
] as const;
const UNO_PWM = ['3', '5', '6', '9', '10', '11'] as const;
const UNO_ANALOG = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] as const;

// Nano shares the Uno's pinout plus two extra analog-only inputs (A6/A7).
const NANO_ANALOG = [...UNO_ANALOG, 'A6', 'A7'] as const;

const MEGA_DIGITAL = [...Array.from({ length: 54 }, (_, i) => String(i)), 'LED_BUILTIN'] as const;
const MEGA_PWM = [
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
  '44',
  '45',
  '46',
] as const;
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
] as const;
const ESP8266_PWM = ['D1', 'D2', 'D5', 'D6', 'D7', 'D8'] as const;
const ESP8266_ANALOG = ['A0'] as const;

// ESP32 Dev Module — GPIO6–11 (internal flash) and the 0/1/3 strapping/UART
// pins are deliberately omitted. GPIO34–39 are input-only.
const ESP32_OUTPUT_CAPABLE = [
  '2',
  '4',
  '5',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '21',
  '22',
  '23',
  '25',
  '26',
  '27',
  '32',
  '33',
] as const;
const ESP32_DIGITAL = [...ESP32_OUTPUT_CAPABLE, '34', '35', '36', '39', 'LED_BUILTIN'] as const;
// Every output-capable ESP32 pin supports PWM via the LEDC peripheral.
const ESP32_PWM = ESP32_OUTPUT_CAPABLE;
// ADC1 channels only — ADC2 pins stop working when WiFi is active.
const ESP32_ANALOG = ['32', '33', '34', '35', '36', '39'] as const;

export const BOARD_DEFINITIONS: readonly BoardDefinition[] = [
  {
    fqbn: 'arduino:avr:uno',
    label: 'Arduino Uno',
    digitalPins: UNO_DIGITAL,
    pwmPins: UNO_PWM,
    analogPins: UNO_ANALOG,
    uploadBauds: [115200],
  },
  {
    fqbn: 'arduino:avr:nano',
    label: 'Arduino Nano',
    digitalPins: UNO_DIGITAL,
    pwmPins: UNO_PWM,
    analogPins: NANO_ANALOG,
    uploadBauds: [115200, 57600],
  },
  {
    fqbn: 'arduino:avr:mega',
    label: 'Arduino Mega',
    digitalPins: MEGA_DIGITAL,
    pwmPins: MEGA_PWM,
    analogPins: MEGA_ANALOG,
    uploadBauds: [115200],
  },
  {
    fqbn: 'esp8266:esp8266:nodemcuv2',
    label: 'NodeMCU (ESP8266)',
    digitalPins: ESP8266_DIGITAL,
    pwmPins: ESP8266_PWM,
    analogPins: ESP8266_ANALOG,
    uploadBauds: [115200],
  },
  {
    fqbn: 'esp32:esp32:esp32',
    label: 'ESP32 Dev Module',
    digitalPins: ESP32_DIGITAL,
    pwmPins: ESP32_PWM,
    analogPins: ESP32_ANALOG,
    uploadBauds: [115200],
  },
];

/** Dropdown-friendly `{ fqbn, label }` pairs, in display order. */
export const BOARDS = BOARD_DEFINITIONS.map(({ fqbn, label }) => ({ fqbn, label }));

const DEFINITION_BY_FQBN = new Map(BOARD_DEFINITIONS.map((b) => [b.fqbn as string, b]));

/** Look up a board definition; unknown FQBNs fall back to the Uno. */
export function getBoardDefinition(fqbn: string): BoardDefinition {
  return DEFINITION_BY_FQBN.get(fqbn) ?? BOARD_DEFINITIONS[0]!;
}

/** Display label for an FQBN, with a generic fallback. */
export function getBoardLabel(fqbn: string): string {
  return DEFINITION_BY_FQBN.get(fqbn)?.label ?? 'Board';
}
