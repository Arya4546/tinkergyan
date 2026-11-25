/**
 * friendly-errors.ts — turns a Python error into words a child can act on.
 *
 * The real error ("NameError: name 'prnt' isn't defined") is always shown too,
 * underneath, so students still learn to read real Python errors.
 */
import type { PythonErrorInfo } from './protocol';

export interface FriendlyError {
  title: string;
  explanation: string;
  /** A concrete fix to try, when we can work one out. */
  hint?: string | undefined;
  line: number | null;
}

/** Modules a student can import here. Kept in one place for the ImportError tip. */
export const AVAILABLE_MODULES = ['math', 'random', 'time', 'json', 're', 'collections', 'ai'];

/** Modules that only exist on a board (MicroPython for ESP32). */
const BOARD_MODULES = ['machine', 'dht', 'neopixel', 'network', 'esp32', 'onewire', 'ds18x20'];

const BUILTINS = [
  'print',
  'input',
  'len',
  'range',
  'int',
  'float',
  'str',
  'bool',
  'list',
  'dict',
  'set',
  'tuple',
  'abs',
  'min',
  'max',
  'sum',
  'round',
  'sorted',
  'reversed',
  'enumerate',
  'zip',
  'type',
  'isinstance',
  'True',
  'False',
  'None',
  'import',
  'from',
  'def',
  'return',
  'while',
  'for',
  'if',
  'elif',
  'else',
  'and',
  'or',
  'not',
  'in',
  'break',
  'continue',
  'pass',
  'global',
  'math',
  'random',
  'time',
];

const BLOCK_KEYWORDS = /^\s*(if|elif|else|for|while|def|class|try|except|finally|with)\b/;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

/** Closest known name to `name` (builtins + names used in the code), if one is close. */
function suggestName(name: string, code: string): string | null {
  const used = new Set(code.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []);
  used.delete(name);
  let best: string | null = null;
  let bestDist = Infinity;
  for (const candidate of [...BUILTINS, ...used]) {
    if (candidate === name) continue;
    // Same letters in a different case is the most common slip ("Print").
    if (candidate.toLowerCase() === name.toLowerCase()) return candidate;
    const d = levenshtein(name.toLowerCase(), candidate.toLowerCase());
    const allowed = name.length <= 4 ? 1 : 2;
    if (d <= allowed && d < bestDist) {
      best = candidate;
      bestDist = d;
    }
  }
  return best;
}

function codeLine(code: string, line: number | null): string {
  if (!line) return '';
  return code.split('\n')[line - 1] ?? '';
}

export function friendlyError(err: PythonErrorInfo, code: string): FriendlyError {
  const { name, message } = err;
  const line = err.line;
  const at = line ? ` on line ${line}` : '';

  switch (name) {
    case 'NameError': {
      const m = /name '([^']+)'/.exec(message);
      const missing = m?.[1] ?? '';
      const guess = missing ? suggestName(missing, code) : null;
      return {
        title: `Python doesn't know "${missing || 'that name'}"`,
        explanation: `Python found the word "${missing}"${at}, but nothing has that name yet. Check the spelling, or make sure you create it before you use it.`,
        hint: guess ? `Did you mean "${guess}"?` : undefined,
        line,
      };
    }
    case 'SyntaxError': {
      const lineCount = code.replace(/\n+$/, '').split('\n').length;
      // An unclosed bracket or quote is only noticed after the last line, so
      // Python reports a line that does not exist. Point at the last real one.
      if (line && line > lineCount) {
        return {
          title: "Python couldn't read your code",
          explanation: 'Python reached the end of your code while something was still open.',
          hint: 'Check that every "(", "[" and "{" is closed and every piece of text has quotes at both ends.',
          line: lineCount,
        };
      }
      const src = codeLine(code, line);
      const prevSrc = codeLine(code, line && line > 1 ? line - 1 : null);
      let hint: string | undefined;
      const needsColon = (s: string) => BLOCK_KEYWORDS.test(s) && !/:\s*(#.*)?$/.test(s);
      const indentOf = (s: string) => /^\s*/.exec(s)![0].length;
      if (needsColon(src)) hint = `Add a colon ":" at the end of line ${line}.`;
      else if (line && /:\s*(#.*)?$/.test(prevSrc) && indentOf(src) <= indentOf(prevSrc))
        hint = `Line ${line} belongs inside line ${line - 1}, so it needs 4 more spaces at the start.`;
      else if (line && needsColon(prevSrc))
        hint = `Add a colon ":" at the end of line ${line - 1}.`;
      else if ((src.match(/"/g) ?? []).length % 2 === 1 || (src.match(/'/g) ?? []).length % 2 === 1)
        hint = 'A quote mark is missing — text needs a quote at the start and the end.';
      else if ((src.match(/\(/g) ?? []).length !== (src.match(/\)/g) ?? []).length)
        hint = 'The brackets ( ) do not match — check every "(" has a ")".';
      else if (/^\s*(if|elif|while)\b[^=!<>]*[^=!<>]=[^=]/.test(src))
        hint = 'To compare two things use "==" (two equals signs). One "=" is for saving a value.';
      return {
        title: "Python couldn't read your code",
        explanation: `Something${at} isn't written the way Python expects.`,
        hint,
        line,
      };
    }
    case 'IndentationError':
      return {
        title: 'The spaces at the start of a line are off',
        explanation: `Python uses the spaces at the start of a line to know which lines belong together. Line ${line ?? '?'} has ${/unexpected indent/.test(message) ? 'spaces it should not have' : 'spaces that do not line up with the lines around it'}.`,
        hint: 'Lines inside an if, for, while or def need the same number of spaces (usually 4).',
        line,
      };
    case 'TypeError': {
      if (
        /unsupported types for __add__: 'str', 'int'|unsupported types for __add__: 'int', 'str'|can't convert '?int'? object to str/.test(
          message,
        )
      ) {
        return {
          title: "Text and numbers can't be added together",
          explanation: `Line ${line ?? '?'} tries to join text and a number with "+".`,
          hint: 'Turn the number into text with str(...), for example: "Score: " + str(score). Or use a comma in print: print("Score:", score).',
          line,
        };
      }
      if (/unsupported types for/.test(message)) {
        return {
          title: "Those two things can't be used together",
          explanation: `Line ${line ?? '?'} uses a maths sign on values that don't work with it (${message}).`,
          hint: 'If one of them came from input(), turn it into a number first with int(...) or float(...).',
          line,
        };
      }
      if (
        /takes \d+ positional arguments but \d+ were given|function takes|missing \d+ required positional/.test(
          message,
        )
      ) {
        return {
          title: 'The function got the wrong number of values',
          explanation: `Line ${line ?? '?'} calls a function with more or fewer values than it needs (${message}).`,
          line,
        };
      }
      if (/object isn't callable|object is not callable/.test(message)) {
        return {
          title: "That isn't something you can call",
          explanation: `Line ${line ?? '?'} puts ( ) after a value that isn't a function. Maybe a variable has the same name as a function?`,
          line,
        };
      }
      return {
        title: "Those values don't fit together",
        explanation: `Python had a problem with the kind of value used${at}: ${message}.`,
        line,
      };
    }
    case 'ValueError':
      if (/invalid syntax for (integer|number)|could not convert/.test(message)) {
        return {
          title: "That isn't a number",
          explanation: `Line ${line ?? '?'} tried to turn some text into a number, but the text wasn't a number.`,
          hint: 'int(...) needs whole numbers like 42. float(...) also accepts decimals like 2.5.',
          line,
        };
      }
      return {
        title: 'That value is not allowed here',
        explanation: `Python could not use that value${at}: ${message}.`,
        line,
      };
    case 'ZeroDivisionError':
      return {
        title: "You can't divide by zero",
        explanation: `Line ${line ?? '?'} divides by zero, which has no answer.`,
        hint: 'Check the number you divide by with an if before dividing.',
        line,
      };
    case 'IndexError':
      return {
        title: "The list doesn't have that many items",
        explanation: `Line ${line ?? '?'} asks for an item position that doesn't exist. Positions start at 0, so a list of 3 items has positions 0, 1 and 2.`,
        hint: 'Use len(your_list) to check how many items there are.',
        line,
      };
    case 'KeyError':
      return {
        title: "That key isn't in the dictionary",
        explanation: `Line ${line ?? '?'} looks up ${message || 'a key'}, but the dictionary has no such key.`,
        hint: 'Use your_dict.get(key) to get None instead of an error when a key is missing.',
        line,
      };
    case 'ImportError': {
      const mod = /module named '([^']+)'/.exec(message)?.[1];
      if (mod && BOARD_MODULES.includes(mod)) {
        return {
          title: `"${mod}" needs a real board`,
          explanation: `Line ${line ?? '?'} uses "${mod}", which controls the pins of a board. This program is running on the computer, which has no pins.`,
          hint: 'Choose your ESP32 board under "Run on" at the top, connect it with a USB cable, and press Run.',
          line,
        };
      }
      return {
        title: `"${mod ?? 'That module'}" isn't available here`,
        explanation: `TinkerGyan runs MicroPython, a small Python made for learning and for robots. It has these modules: ${AVAILABLE_MODULES.join(', ')}.`,
        line,
      };
    }
    case 'AttributeError':
      return {
        title: "That value doesn't have that",
        explanation: `Line ${line ?? '?'}: ${message}. Check the spelling after the dot.`,
        line,
      };
    case 'RuntimeError':
      if (/recursion/.test(message)) {
        return {
          title: 'A function keeps calling itself forever',
          explanation: `A function${at} calls itself again and again without ever stopping.`,
          hint: 'Add an if that returns without calling the function again.',
          line,
        };
      }
      if (/Typing answers is not available/.test(message)) {
        return { title: "This window can't answer input() questions", explanation: message, line };
      }
      return {
        title: 'Something went wrong while running',
        explanation: message || 'Python stopped unexpectedly.',
        line,
      };
    case 'MemoryError':
      return {
        title: 'Your program used too much memory',
        explanation:
          'Your program kept making a list or text bigger and bigger until there was no room left, so it was stopped.',
        hint: 'Look for a loop that keeps adding to a list or text and never stops.',
        line,
      };
    case 'BoardDisconnected':
      return {
        title: 'The board was unplugged',
        explanation:
          'TinkerGyan lost the connection to your board, so the program stopped. This happens when the USB cable is pulled out or loose.',
        hint: 'Plug the board back in, press Connect, then Run.',
        line: null,
      };
    case 'BoardError':
      if (!message || /^timeout$/i.test(message.trim())) {
        return {
          title: 'Your board stopped answering',
          explanation: 'TinkerGyan sent your program, but the board did not reply in time.',
          hint: "Press the board's reset button (EN or RST), or unplug it and plug it back in. Then press Connect and Run again.",
          line: null,
        };
      }
      return { title: 'Your board had a problem', explanation: message, line: null };
    case 'KeyboardInterrupt':
      return {
        title: 'The program was stopped',
        explanation: 'Something pressed Stop (Ctrl+C) on the board while your program was running.',
        line,
      };
    case 'OSError':
      if (/ETIMEDOUT|\b110\b|\b116\b/.test(message)) {
        return {
          title: "A sensor didn't answer",
          explanation: `Line ${line ?? '?'} asked a sensor for a reading, but it never replied.`,
          hint: 'Check the sensor is wired to the pin your program uses, and that it has power (3.3 V and GND).',
          line,
        };
      }
      return {
        title: 'The board could not do that',
        explanation: `Line ${line ?? '?'}: ${message || 'a hardware or file error'}.`,
        hint: 'Check the wiring and the pin numbers in your program.',
        line,
      };
    case 'StartError':
    case 'InternalError':
      return { title: "Python couldn't run", explanation: message, line: null };
    default:
      return {
        title: `${name}`,
        explanation: message || 'Python stopped because of an error.',
        line,
      };
  }
}
