/**
 * js-regex.ts — the regex engine behind Python's `re` in the browser.
 *
 * MicroPython's own `re` is tiny: no findall/split, no {2,3}, \b, flags or
 * named groups. The browser's RegExp has all of that and nearly the same
 * syntax, so compat/_tg_re.py asks this module (through tg_host) to match,
 * and builds Python's API (Match objects, sub templates, findall…) on top.
 *
 * This file translates a Python pattern into an equivalent JavaScript one and
 * reports positions in code points, as Python strings count them (JavaScript
 * counts UTF-16 units, which differ once a string holds an emoji).
 *
 * No imports: the Node test harness loads this file directly.
 */

// Python's flag values (re.I is 2, re.M is 8…).
const PY_A = 256;
const PY_I = 2;
const PY_M = 8;
const PY_S = 16;
const PY_X = 64;
const INLINE_FLAGS: Record<string, number> = {
  a: 256,
  i: PY_I,
  L: 4,
  m: PY_M,
  s: PY_S,
  u: 32,
  x: PY_X,
};

// Newer RegExp features, missing in older browsers (Safari before 16.4 has
// no lookbehind; before 15, no match positions for groups). Without them the
// module still works: \b and \A are the JavaScript ones, and group positions
// are worked out from the matched text.
const supports = (source: string, flags = '') => {
  try {
    new RegExp(source, flags);
    return true;
  } catch {
    return false;
  }
};
const HAS_LOOKBEHIND = supports('(?<=a)b');
const HAS_INDICES = supports('a', 'd');

// Python's \w, \d and \b know every alphabet (é, ü, देवनागरी…); JavaScript's
// only ASCII. These Unicode versions are used unless re.ASCII is set.
const WORD = '\\p{L}\\p{N}_';
const UNICODE_ESCAPES: Record<string, { out: string; inClass: string | null }> = {
  w: { out: `[${WORD}]`, inClass: WORD },
  W: { out: `[^${WORD}]`, inClass: null },
  d: { out: '\\p{Nd}', inClass: '\\p{Nd}' },
  D: { out: '\\P{Nd}', inClass: '\\P{Nd}' },
  b: {
    out: `(?:(?<=[${WORD}])(?![${WORD}])|(?<![${WORD}])(?=[${WORD}]))`,
    inClass: null,
  },
  B: {
    out: `(?:(?<=[${WORD}])(?=[${WORD}])|(?<![${WORD}])(?![${WORD}]))`,
    inClass: null,
  },
};

/** Characters that must stay escaped in a JavaScript pattern with the u flag. */
const SYNTAX = '^$\\.*+?()[]{}|/';

interface Compiled {
  /** Search (g), match / fullmatch (y) — built on first use. */
  regex: Partial<Record<0 | 1 | 2, RegExp>>;
  source: string;
  jsFlags: string;
  groups: number;
  names: Record<string, number>;
  /** Flags set inside the pattern, like (?i) — Pattern.flags includes them. */
  inline: number;
}

class PatternError extends Error {}

function translate(pattern: string, pyFlags: number): Omit<Compiled, 'regex'> {
  let i = 0;
  let flags = pyFlags;
  let inline = 0;
  // Global inline flags at the start: (?i), (?ms)…
  for (;;) {
    const m = /^\(\?([aiLmsux]+)\)/.exec(pattern.slice(i));
    if (!m) break;
    for (const ch of m[1]!) inline |= INLINE_FLAGS[ch]!;
    i += m[0].length;
  }
  flags |= inline;
  const verbose = (flags & PY_X) !== 0;
  const unicode = (flags & PY_A) === 0;
  let out = '';
  let inClass = false;
  let groups = 0;
  const names: Record<string, number> = {};

  while (i < pattern.length) {
    const c = pattern[i]!;
    if (c === '\\') {
      const d = pattern[i + 1];
      if (d === undefined) throw new PatternError('bad escape (end of pattern)');
      if (!inClass && d === 'A') out += HAS_LOOKBEHIND ? '(?<![\\s\\S])' : '^';
      else if (!inClass && d === 'Z') out += '(?![\\s\\S])';
      else if (
        unicode &&
        UNICODE_ESCAPES[d] &&
        (!inClass || UNICODE_ESCAPES[d].inClass) &&
        (HAS_LOOKBEHIND || (d !== 'b' && d !== 'B'))
      ) {
        out += inClass ? UNICODE_ESCAPES[d].inClass : UNICODE_ESCAPES[d].out;
      } else if (/[0-9A-Za-z]/.test(d)) out += '\\' + d;
      // Python lets any other character be escaped; JavaScript (u flag) only
      // syntax characters (and "-" inside a class). Others are just literal.
      else if (SYNTAX.includes(d) || (inClass && d === '-')) out += '\\' + d;
      else out += d;
      i += 2;
      continue;
    }
    if (inClass) {
      if (c === ']') inClass = false;
      else if (c === '[') {
        out += '\\[';
        i++;
        continue;
      }
      out += c;
      i++;
      continue;
    }
    if (verbose && /\s/.test(c)) {
      i++;
      continue;
    }
    if (verbose && c === '#') {
      while (i < pattern.length && pattern[i] !== '\n') i++;
      continue;
    }
    if (c === '[') {
      inClass = true;
      out += '[';
      i++;
      if (pattern[i] === '^') {
        out += '^';
        i++;
      }
      // "]" first in a class is a literal in Python; "[]" is an empty class in JavaScript.
      if (pattern[i] === ']') {
        out += '\\]';
        i++;
      }
      continue;
    }
    if (c === '(') {
      const rest = pattern.slice(i);
      const named = /^\(\?P<([A-Za-z_]\w*)>/.exec(rest);
      if (named) {
        groups++;
        names[named[1]!] = groups;
        out += `(?<${named[1]}>`;
        i += named[0].length;
        continue;
      }
      const backref = /^\(\?P=([A-Za-z_]\w*)\)/.exec(rest);
      if (backref) {
        out += `\\k<${backref[1]}>`;
        i += backref[0].length;
        continue;
      }
      if (rest.startsWith('(?#')) {
        const end = pattern.indexOf(')', i);
        if (end < 0) throw new PatternError('missing ), unterminated comment');
        i = end + 1;
        continue;
      }
      if (rest.startsWith('(?(')) {
        throw new PatternError("conditional groups (?(...)) aren't supported in the browser");
      }
      if (pattern[i + 1] !== '?') groups++;
      out += '(';
      i++;
      continue;
    }
    if (c === '.' && !(flags & PY_S)) {
      // Python's "." stops only at \n; JavaScript's also at \r and others.
      out += '[^\\n]';
      i++;
      continue;
    }
    if (c === '$' && !(flags & PY_M)) {
      // Python's "$" also matches just before a newline at the very end.
      out += '(?=\\n?(?![\\s\\S]))';
      i++;
      continue;
    }
    if (c === '{') {
      const q = /^\{(\d*)(,?)(\d*)\}/.exec(pattern.slice(i));
      if (q && (q[1] !== '' || (q[2] === ',' && q[3] !== ''))) {
        out += `{${q[1] || '0'}${q[2]}${q[3]}}`;
        i += q[0].length;
        continue;
      }
      out += '\\{'; // a literal brace, as Python reads it
      i++;
      continue;
    }
    if (c === '}' || c === ']') {
      out += '\\' + c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  if (inClass) throw new PatternError('unterminated character set');
  let jsFlags = HAS_INDICES ? 'du' : 'u';
  if (flags & PY_I) jsFlags += 'i';
  if (flags & PY_M) jsFlags += 'm';
  if (flags & PY_S) jsFlags += 's';
  return { source: out, jsFlags, groups, names, inline };
}

const cache = new Map<string, Compiled>();

function compile(pattern: string, pyFlags: number): Compiled {
  const key = `${pyFlags}\u0000${pattern}`;
  let c = cache.get(key);
  if (!c) {
    c = { ...translate(pattern, pyFlags), regex: {} };
    // Check it is valid now, so re.compile() reports errors as Python does.
    new RegExp(c.source, c.jsFlags);
    if (cache.size > 200) cache.clear();
    cache.set(key, c);
  }
  return c;
}

function regexFor(c: Compiled, mode: 0 | 1 | 2): RegExp {
  let r = c.regex[mode];
  if (!r) {
    const source = mode === 2 ? `(?:${c.source})(?![\\s\\S])` : c.source;
    r = new RegExp(source, c.jsFlags + (mode === 0 ? 'g' : 'y'));
    c.regex[mode] = r;
  }
  return r;
}

function errorText(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  // "Invalid regular expression: /(/du: Unterminated group" → "Unterminated group"
  return msg.replace(/^Invalid regular expression: \/.*\/[a-z]*: /s, '');
}

// Code point ↔ UTF-16 positions, for strings with characters outside the BMP.
let lastText: string | null = null;
let cpToUnit: number[] | null = null;
let unitToCp: Map<number, number> | null = null;

function positions(text: string): void {
  if (text === lastText) return;
  lastText = text;
  if (!/[\uD800-\uDFFF]/.test(text)) {
    cpToUnit = null;
    unitToCp = null;
    return;
  }
  cpToUnit = [];
  unitToCp = new Map();
  let unit = 0;
  for (const ch of text) {
    unitToCp.set(unit, cpToUnit.length);
    cpToUnit.push(unit);
    unit += ch.length;
  }
  unitToCp.set(unit, cpToUnit.length);
  cpToUnit.push(unit);
}
const toUnit = (cp: number) => (cpToUnit ? (cpToUnit[cp] ?? 0) : cp);
const toCp = (unit: number) => (unitToCp ? (unitToCp.get(unit) ?? 0) : unit);

/**
 * Compile a Python pattern. Returns JSON: {"g": groups, "n": {name: index},
 * "f": inline flags}, or {"e": message} when the pattern is not valid.
 */
export function reCompile(pattern: string, flags: number): string {
  try {
    const c = compile(String(pattern), Number(flags) || 0);
    return JSON.stringify({ g: c.groups, n: c.names, f: c.inline });
  } catch (err) {
    return JSON.stringify({ e: errorText(err) });
  }
}

/**
 * Run a compiled pattern on text[pos:endpos] (code points). mode 0 searches,
 * 1 matches at pos, 2 must match all of it. Returns '' for no match, else a
 * JSON list of [start, end] per group (null for a group that did not take
 * part), in code points of the whole text.
 */
export function reExec(
  pattern: string,
  flags: number,
  text: string,
  pos: number,
  endpos: number,
  mode: number,
): string {
  const c = compile(String(pattern), Number(flags) || 0);
  const s = String(text);
  positions(s);
  const regex = regexFor(c, mode === 1 ? 1 : mode === 2 ? 2 : 0);
  const end = toUnit(endpos);
  const subject = end < s.length ? s.slice(0, end) : s;
  regex.lastIndex = toUnit(pos);
  const m = regex.exec(subject) as (RegExpExecArray & { indices?: [number, number][] }) | null;
  if (!m) return '';
  let indices = m.indices;
  if (!indices) {
    // No "d" flag: each group's place is found in the match (exact in all but
    // patterns where the same text appears twice).
    const start = m.index;
    let from = start;
    indices = Array.from(m, (text, g) => {
      if (g === 0) return [start, start + text.length];
      if (text === undefined) return undefined as unknown as [number, number];
      const at = subject.indexOf(text, from);
      const p = at < 0 ? start : at;
      from = p;
      return [p, p + text.length];
    });
  }
  const spans = indices.map((sp) => (sp ? [toCp(sp[0]), toCp(sp[1])] : null));
  return JSON.stringify(spans);
}
