/**
 * targets.ts — where a Python project runs.
 *
 * Stored in the project's boardTarget (no extra database field):
 *   'python'          — in the browser (MicroPython WebAssembly)
 *   'python-esp32'    — on an ESP32 board running MicroPython
 *   'python-esp32s3'  — on an ESP32-S3
 *   'python-esp32c3'  — on an ESP32-C3
 *
 * Only boards the platform already supports are offered (no ESP8266).
 */
import type { BoardFqbn } from '../boards';

export type PythonTarget = 'python' | 'python-esp32' | 'python-esp32s3' | 'python-esp32c3';
export type PythonBoardTarget = Exclude<PythonTarget, 'python'>;

export interface PythonBoardInfo {
  target: PythonBoardTarget;
  /** Name shown to students. */
  label: string;
  /** The board definition used for pin lists (shared with the C++ editor). */
  fqbn: BoardFqbn;
  /** Chip name as esptool-js reads it from the chip ("ESP32-S3"). */
  chipName: string;
}

export const PYTHON_BOARDS: readonly PythonBoardInfo[] = [
  { target: 'python-esp32', label: 'ESP32', fqbn: 'esp32:esp32:esp32', chipName: 'ESP32' },
  {
    target: 'python-esp32s3',
    label: 'ESP32-S3',
    fqbn: 'esp32:esp32:esp32s3',
    chipName: 'ESP32-S3',
  },
  {
    target: 'python-esp32c3',
    label: 'ESP32-C3',
    fqbn: 'esp32:esp32:esp32c3',
    chipName: 'ESP32-C3',
  },
];

export const BOARD_PREFIX = 'python-';

/** Any Python project, wherever it runs. */
export function isPythonTarget(boardTarget: string | null | undefined): boolean {
  return (
    boardTarget === 'python' ||
    (!!boardTarget && PYTHON_BOARDS.some((b) => b.target === boardTarget))
  );
}

/** A Python project that runs on a board, not in the browser. */
export function isPythonBoardTarget(
  boardTarget: string | null | undefined,
): boardTarget is PythonBoardTarget {
  return !!boardTarget && PYTHON_BOARDS.some((b) => b.target === boardTarget);
}

export function pythonBoardInfo(target: string | null | undefined): PythonBoardInfo | null {
  return PYTHON_BOARDS.find((b) => b.target === target) ?? null;
}

/** The target for a chip name esptool-js or MicroPython reported, if supported. */
export function targetForChip(chipName: string): PythonBoardTarget | null {
  const n = chipName.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (n === 'ESP32S3') return 'python-esp32s3';
  if (n === 'ESP32C3') return 'python-esp32c3';
  if (n === 'ESP32') return 'python-esp32';
  return null;
}

/**
 * The chip a running MicroPython says it is, from `os.uname().machine`, e.g.
 * "Generic ESP32S3 module with ESP32S3" or "ESP32C3 module with ESP32C3".
 */
export function targetFromMachine(machine: string): PythonBoardTarget | null {
  const m = /with\s+(ESP32[A-Z0-9-]*)/i.exec(machine);
  return m ? targetForChip(m[1]!) : null;
}
