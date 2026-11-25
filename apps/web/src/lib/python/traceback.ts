/**
 * traceback.ts — turn the text of a MicroPython traceback into PythonErrorInfo.
 *
 * Used for programs that run on a board, where the error arrives as text:
 *
 *   Traceback (most recent call last):
 *     File "<stdin>", line 3, in <module>
 *   NameError: name 'prnt' isn't defined
 *
 * The line reported is the last frame in the student's own program
 * ("<stdin>" for Run, "main.py" for a saved program), not in a helper module.
 */
import type { PythonErrorInfo } from './protocol';

const FRAME_RE = /File "([^"]+)", line (\d+)/g;

export function parseTraceback(
  text: string,
  programFiles = ['<stdin>', 'main.py'],
): PythonErrorInfo {
  const clean = text.replace(/\r\n?/g, '\n').trim();
  const lines = clean.split('\n').filter((l) => l.trim() !== '');
  const last = (lines[lines.length - 1] ?? '').trim();
  let name = 'Error';
  let message = last;
  const m = /^([A-Za-z_][A-Za-z0-9_.]*)(?::\s?([\s\S]*))?$/.exec(last);
  if (m && /(Error|Exception|Interrupt|Exit|Iteration)$/.test(m[1]!)) {
    name = m[1]!;
    message = m[2] ?? '';
  }
  let line: number | null = null;
  for (const frame of clean.matchAll(FRAME_RE)) {
    if (programFiles.includes(frame[1]!)) line = Number(frame[2]);
  }
  return { name, message, line, traceback: clean };
}
