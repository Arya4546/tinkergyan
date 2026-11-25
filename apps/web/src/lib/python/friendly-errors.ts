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
export const AVAILABLE_MODULES = [
  'math',
  'random',
  'time',
  'json',
  're',
  'string',
  'sys',
  'collections',
  'heapq',
  'bisect',
  'itertools',
  'functools',
  'operator',
  'copy',
  'queue',
  'typing',
  'ai',
];

/**
 * How deep functions can call each other in the browser. The engine's stack
 * is fixed when it is built; measured at about 155 plain calls (fewer with
 * @lru_cache, which adds a call per level).
 */
export const BROWSER_CALL_DEPTH = 150;

/** str methods Python has that MicroPython's str does not, with what to use instead. */
const MISSING_STR_METHODS: Record<string, string> = {
  zfill: 'Use an f-string: f"{n:05}" pads a number with zeros to 5 digits.',
  ljust: 'Use an f-string: f"{text:<10}" pads text on the right to 10 characters.',
  rjust: 'Use an f-string: f"{text:>10}" pads text on the left to 10 characters.',
  title: 'Capitalise each word yourself: " ".join(w.capitalize() for w in text.split()).',
  swapcase:
    'Swap each letter yourself: "".join(c.lower() if c.isupper() else c.upper() for c in text).',
  isalnum: 'Check each character: all(c.isalpha() or c.isdigit() for c in text).',
  isnumeric: 'Use text.isdigit() instead.',
  isdecimal: 'Use text.isdigit() instead.',
  casefold: 'Use text.lower() instead.',
  removeprefix: 'Use text[len(prefix):] if text.startswith(prefix) else text.',
  removesuffix: 'Use text[:-len(suffix)] if text.endswith(suffix) else text.',
  translate: 'Replace characters one at a time with text.replace(old, new).',
  bit_length: 'Use len(bin(n)) - 2 for a positive number n.',
  bit_count: 'Use bin(n).count("1") instead.',
};

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

const CLOSER: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const PYTHON_KEYWORDS =
  /^\s*(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\s*=(?!=)/;

/**
 * Brackets that are never closed, in the order they were opened, skipping
 * text in quotes and comments. MicroPython reports an unclosed bracket on the
 * line where it gave up (often the next line); Python points at where it opened.
 */
export function unclosedBrackets(code: string): { char: string; line: number }[] {
  const stack: { char: string; line: number }[] = [];
  const lines = code.split('\n');
  let quote: string | null = null; // the quote that opened the current text, e.g. ' or """
  for (let n = 0; n < lines.length; n++) {
    const text = lines[n]!;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]!;
      if (quote) {
        if (ch === '\\') i++;
        else if (text.startsWith(quote, i)) {
          i += quote.length - 1;
          quote = null;
        }
        continue;
      }
      if (ch === '#') break;
      if (ch === '"' || ch === "'") {
        quote = text.startsWith(ch.repeat(3), i) ? ch.repeat(3) : ch;
        i += quote.length - 1;
      } else if (CLOSER[ch]) stack.push({ char: ch, line: n + 1 });
      else if (ch === ')' || ch === ']' || ch === '}') {
        if (stack.length && CLOSER[stack[stack.length - 1]!.char] === ch) stack.pop();
      }
    }
    if (quote && quote.length === 1) quote = null; // a one-line text can't continue
  }
  return stack;
}

function codeLine(code: string, line: number | null): string {
  if (!line) return '';
  return code.split('\n')[line - 1] ?? '';
}

/**
 * `onBoard`: the program ran on a board (MicroPython for ESP32), not in the
 * browser, which changes what a few errors mean.
 */
export function friendlyError(err: PythonErrorInfo, code: string, onBoard = false): FriendlyError {
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
      // A bracket left open is only noticed on a later line (or after the
      // last one). Point at the line where it was opened, as Python does.
      const open = line
        ? unclosedBrackets(code)
            .filter((b) => b.line < line)
            .pop()
        : undefined;
      if (open) {
        return {
          title: `A "${open.char}" is never closed`,
          explanation: `The "${open.char}" on line ${open.line} has no "${CLOSER[open.char]}" to match it, so Python read on into the next lines and got lost.`,
          hint: `Add the missing "${CLOSER[open.char]}" at the end of what it holds on line ${open.line}.`,
          line: open.line,
        };
      }
      // An unclosed quote is only noticed after the last line, so Python
      // reports a line that does not exist. Point at the last real one.
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
      const needsColon = (s: string) =>
        BLOCK_KEYWORDS.test(s) && !/:\s*(#.*)?$/.test(s) && !PYTHON_KEYWORDS.test(s);
      const indentOf = (s: string) => /^\s*/.exec(s)![0].length;
      const keyword = PYTHON_KEYWORDS.exec(src)?.[1];
      if (keyword)
        hint = `"${keyword}" is a word Python keeps for itself, so it can't be a variable's name. Use another name, like my_${keyword.toLowerCase()}.`;
      else if (/^\s*match\s+.+:\s*(#.*)?$/.test(src) || /^\s*case\s+.+:\s*(#.*)?$/.test(src))
        hint = `TinkerGyan's Python (MicroPython) has no match/case. Use if, elif and else instead.`;
      else if (/\{[^{}]*\*\*/.test(src))
        hint = `TinkerGyan's Python (MicroPython) can't unpack a dict inside { } with **. Make a copy and update it: b = dict(a); b.update(y=2).`;
      else if (needsColon(src)) hint = `Add a colon ":" at the end of line ${line}.`;
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
      if (/argument should be a 'dict'/.test(message)) {
        return {
          title: "That kind of dictionary doesn't work there",
          explanation: `Line ${line ?? '?'} passes a Counter, defaultdict or OrderedDict where Python's browser version needs a plain dict (${message}).`,
          hint: 'Turn it into a plain dict first: dict(your_counter.items()).',
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
      if (/need more than (\d+) values? to unpack|not enough values to unpack/.test(message)) {
        const got = /need more than (\d+)/.exec(message)?.[1];
        return {
          title: 'Not enough values to fill your variables',
          explanation: `Line ${line ?? '?'} puts values into several variables at once (like a, b = ...), but ${got === undefined ? 'there were fewer values than variables' : got === '0' ? 'there were no values at all' : `there ${got === '1' ? 'was only 1 value' : `were only ${got} values`}`}.`,
          hint: 'If the values come from input().split(), type them all on one line with spaces between them, for example: 3 4. An empty answer gives no values.',
          line,
        };
      }
      if (/too many values to unpack/.test(message)) {
        const want = /expected (\d+)/.exec(message)?.[1];
        return {
          title: 'More values than variables',
          explanation: `Line ${line ?? '?'} puts values into ${want ? `${want} variables` : 'several variables'} at once (like a, b = ...), but there were more values than that.`,
          hint: 'If the values come from input().split(), check how many you typed on the line. To keep the rest, use a star: a, *rest = ...',
          line,
        };
      }
      if (/dict update sequence has wrong length/.test(message)) {
        return {
          title: "That can't be turned into a dictionary",
          explanation: `Line ${line ?? '?'} makes a dict from something that isn't a list of (key, value) pairs.`,
          hint: 'To copy a Counter, defaultdict or OrderedDict, use dict(your_counter.items()).',
          line,
        };
      }
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
      if (/empty/.test(message)) {
        return {
          title: 'There was nothing left to take',
          explanation: `Line ${line ?? '?'} takes an item out of something that is empty (${message}).`,
          hint: 'Check that it has items first, for example: while queue: ...',
          line,
        };
      }
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
      const missingName = /can't import name (\w+)/.exec(message)?.[1];
      if (missingName) {
        return {
          title: `"${missingName}" isn't available here`,
          explanation: `Line ${line ?? '?'} imports "${missingName}", but the module it comes from doesn't have it in TinkerGyan's Python.`,
          hint: 'Check the spelling, or write that part yourself.',
          line,
        };
      }
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
    case 'AttributeError': {
      const attr = /has no attribute '(\w+)'/.exec(message)?.[1];
      const what = /^'(str|int)' object/.exec(message)?.[1];
      if (attr && what && MISSING_STR_METHODS[attr]) {
        return {
          title: `${what === 'str' ? 'Text' : 'Numbers'} can't do .${attr}() here`,
          explanation: `Line ${line ?? '?'} uses .${attr}(), which full Python has but TinkerGyan's Python (MicroPython) does not.`,
          hint: MISSING_STR_METHODS[attr],
          line,
        };
      }
      return {
        title: "That value doesn't have that",
        explanation: `Line ${line ?? '?'}: ${message}. Check the spelling after the dot.`,
        line,
      };
    }
    case 'RecursionError':
    case 'RuntimeError':
      if (/recursion|pystack exhausted/.test(message)) {
        if (onBoard) {
          return {
            title: 'A function called itself too many times',
            explanation: `A function${at} calls itself so many times that the board ran out of room to keep track. Either it never stops, or it needs more room than a small board has.`,
            hint: 'Check there is an if that stops calling the function again, or use a loop instead.',
            line,
          };
        }
        return {
          title: 'A function called itself too many times',
          explanation: `A function${at} went more than about ${BROWSER_CALL_DEPTH} calls deep. Either it calls itself again and again without ever stopping, or it really needs to go that deep (like a search through a big graph): Python in the browser can only go about ${BROWSER_CALL_DEPTH} calls deep (sys.setrecursionlimit can't change that).`,
          hint: 'If it never stops, add an if that returns without calling the function again. If it needs to go deep, use a loop with a list as a stack instead (stack.append(...) and stack.pop()).',
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
    case 'NotImplementedError':
      if (/slices with step/.test(message)) {
        return {
          title: "Text can't be sliced with a step here",
          explanation: `Line ${line ?? '?'} slices text with a step (like text[::-1] or text[::2]). Full Python can do that, but TinkerGyan's Python (MicroPython) can only step through lists.`,
          hint: 'To reverse text use "".join(reversed(text)). For every 2nd letter use "".join(list(text)[::2]).',
          line,
        };
      }
      return {
        title: "TinkerGyan's Python can't do that yet",
        explanation: `Line ${line ?? '?'}: ${message || 'this part of Python is not available'}.`,
        line,
      };
    case 'EOFError':
      return {
        title: 'There was no more input',
        explanation: `Line ${line ?? '?'} asked for more input after the input had ended (an empty answer ends it when a program reads sys.stdin).`,
        hint: 'Stop reading when the input ends, for example: for line in sys.stdin: ...',
        line,
      };
    case 'OSError':
      if (!onBoard) {
        const missingFile = /\b(2|44|ENOENT)\b/.test(message);
        return {
          title: missingFile ? "That file doesn't exist" : "Python couldn't do that here",
          explanation: missingFile
            ? `Line ${line ?? '?'} opens a file that isn't there. Programs in the browser start with no files; a file your program writes lasts only until it finishes.`
            : `Line ${line ?? '?'} asked for something the browser doesn't allow (${message || 'a file or device error'}).`,
          line,
        };
      }
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
