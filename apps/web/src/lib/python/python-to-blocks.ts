/**
 * python-to-blocks.ts — "Convert to blocks": typed Python back into blocks.
 *
 * Python that blocks can say *exactly* becomes those blocks. Anything else is
 * kept as it was written, in grey "Python code" blocks (a whole statement, a
 * value, or a header like `for k, v in d.items()` with real blocks inside), so
 * every program that runs can become blocks and still does the same thing.
 * The student is told which lines stayed as Python and why. Only Python that
 * can't run at all (it doesn't parse) is refused, with its line. The tests
 * (tests/python/blocks.test.mjs) run each program before and after conversion
 * and compare the output.
 *
 * It also reads the Python the blocks themselves make (helper functions such
 * as ask_number, `x = None` declarations, imports), so blocks → code → blocks
 * gives back the same blocks.
 *
 * Python is parsed with the Lezer grammar the code editor already uses.
 */
import * as Blockly from 'blockly/core';
import { pythonLanguage } from '@codemirror/lang-python';
import { pythonGenerator } from 'blockly/python';
import { codeLines, workspaceToPython } from '../../components/editor/python-blocks';
import '../../components/editor/python-board-blocks';

type Tree = ReturnType<typeof pythonLanguage.parser.parse>;
type Node = Tree['topNode'];

/** Blockly JSON for one block (the subset this file writes). */
interface BlockJson {
  type: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block: BlockJson }>;
  next?: { block: BlockJson };
  extraState?: unknown;
  icons?: { comment: { text: string; pinned: boolean; height: number; width: number } };
  x?: number;
  y?: number;
  /** Converter only (removed before loading): leave this block out. */
  drop?: boolean;
}

/** Functions kept as Python, and why (shared by every conversion attempt). */
type RawFns = Map<string, { line: number; message: string }>;

/** A value block and the types it gives (Blockly output check; null = anything). */
interface Value {
  block: BlockJson;
  check: string[] | null;
}

export class ConvertError extends Error {
  /** 1-based line in the student's code. */
  line: number;
  /** True when the whole program can't be converted (not even as Python code blocks). */
  fatal: boolean;
  /** Follows from another part kept as Python (not worth telling twice). */
  quiet = false;
  constructor(message: string, line: number, fatal = false) {
    super(message);
    this.name = 'ConvertError';
    this.line = line;
    this.fatal = fatal;
  }
}

/** Python's line breaks inside a text, written as \n (a text on one line means the same). */
function escapeLineBreaks(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '\\') {
      if (text[i + 1] === '\n')
        i++; // backslash + line break: the text just goes on
      else out += ch + (text[++i] ?? '');
    } else out += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch;
  }
  return out;
}

/** r"""a\b""" over several lines as the same text without the r: """a\\b""" on one line. */
function unRaw(text: string): string {
  const m = /^([a-zA-Z]*)('''|"""|'|")([\s\S]*)\2$/.exec(text);
  if (!m) return text;
  const body = m[3]!.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  return m[1]!.replace(/r/gi, '') + m[2]! + body + m[2]!;
}

/** Leading tabs as spaces (Python's tab stops are 8 apart). */
function expandIndent(line: string): string {
  const lead = /^[ \t]*/.exec(line)![0];
  let col = 0;
  for (const ch of lead) col = ch === '\t' ? col + 8 - (col % 8) : col + 1;
  return ' '.repeat(col) + line.slice(lead.length);
}

/** A part with no block: it is kept as Python (not a reason to stop). */
const soft = (err: unknown): err is ConvertError => err instanceof ConvertError && !err.fatal;

export interface ConvertResult {
  /** Blockly XML for the whole workspace. */
  xml: string;
  /** The Python the new blocks make. */
  code: string;
  /** Things the student should know, e.g. renamed variables. */
  notes: string[];
}

export interface ConvertOptions {
  /** The project runs on a board: pin and sensor blocks are allowed. */
  onBoard: boolean;
}

// ── Things blocks make that are skipped when reading their code back ─────────

/** Modules the blocks import (the import is written again when needed). */
const BLOCK_MODULES = new Set(['time', 'math', 'random', 'ai', 'dht']);
const MACHINE_NAMES = new Set(['Pin', 'PWM', 'ADC', 'time_pulse_us']);
const BOARD_HELPERS = new Set([
  'write_pin',
  'pwm_on',
  'button_pressed',
  'read_analog',
  'set_brightness',
  'set_servo',
  'play_tone',
  'read_distance_cm',
  'read_dht',
]);

const squash = (s: string) =>
  s
    .replace(/#[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

interface Templates {
  /** Helper function name → its source, squashed. */
  defs: Map<string, string>;
  /** Top-level tables the board blocks keep (`pwm_pins = {}`), squashed. */
  tables: Set<string>;
  /** Comment lines the blocks write above those tables. */
  comments: Set<string>;
  /** The pin number of the built-in LED on this board. */
  ledPin: string;
}

/**
 * The helper functions the blocks write, made by the real generators so they
 * can never drift from what the blocks produce.
 */
function blockTemplates(): Templates {
  const ws = new Blockly.Workspace();
  try {
    const v = (id: string) => ({ block: { type: 'variables_get', fields: { VAR: { id } } } });
    const n = (num: number) => ({ block: { type: 'math_number', fields: { NUM: num } } });
    const stmt = (block: BlockJson): BlockJson => block;
    const show = (b: BlockJson) => stmt({ type: 'text_print', inputs: { TEXT: { block: b } } });
    const blocks: BlockJson[] = [
      show({ type: 'py_ask_number' }),
      show({ type: 'text_changeCase', fields: { CASE: 'TITLECASE' }, inputs: { TEXT: v('a') } }),
      show({ type: 'py_capitalize', inputs: { TEXT: v('a') } }),
      show({
        type: 'lists_indexOf',
        fields: { END: 'FIRST' },
        inputs: { VALUE: v('a'), FIND: v('a') },
      }),
      show({
        type: 'lists_indexOf',
        fields: { END: 'LAST' },
        inputs: { VALUE: v('a'), FIND: v('a') },
      }),
      show({
        type: 'lists_sort',
        fields: { TYPE: 'NUMERIC', DIRECTION: '1' },
        inputs: { LIST: v('a') },
      }),
      show({
        type: 'lists_getIndex',
        fields: { MODE: 'GET_REMOVE', WHERE: 'RANDOM' },
        inputs: { VALUE: v('a') },
      }),
      {
        type: 'controls_for',
        fields: { VAR: { id: 'a' } },
        inputs: { FROM: v('a'), TO: v('a'), BY: n(1) },
      },
      { type: 'py_led_builtin', fields: { VALUE: '1' } },
      show({ type: 'py_button_pressed' }),
      show({ type: 'py_analog_read' }),
      { type: 'py_pwm_write', inputs: { PERCENT: n(1) } },
      { type: 'py_servo', inputs: { ANGLE: n(1) } },
      { type: 'py_tone', inputs: { FREQ: n(1), SECONDS: n(1) } },
      show({ type: 'py_distance' }),
      show({ type: 'py_dht' }),
    ];
    Blockly.serialization.workspaces.load(
      {
        blocks: { languageVersion: 0, blocks: blocks.map((b, i) => ({ ...b, x: 0, y: i * 100 })) },
        variables: [{ name: 'a', id: 'a' }],
      },
      ws,
    );
    const code = workspaceToPython(ws);
    const tree = pythonLanguage.parser.parse(code);
    const defs = new Map<string, string>();
    const tables = new Set<string>();
    const comments = new Set<string>();
    for (let c = tree.topNode.firstChild; c; c = c.nextSibling) {
      const src = code.slice(c.from, c.to);
      if (c.name === 'FunctionDefinition') {
        const name = c.getChild('VariableName');
        if (name) defs.set(code.slice(name.from, name.to), squash(src));
      } else if (c.name === 'Comment') comments.add(src.slice(1).trim());
      else if (c.name === 'AssignStatement' && /^\w+ = \{\}$/.test(src)) tables.add(squash(src));
    }
    const ledPin = /write_pin\((\d+), True\)/.exec(code)?.[1] ?? '2';
    return { defs, tables, comments, ledPin };
  } finally {
    ws.dispose();
  }
}

// ── Block shapes ─────────────────────────────────────────────────────────────

/** What each block's inputs accept and what it gives, read from Blockly itself. */
class Checks {
  private ws = new Blockly.Workspace();
  private blocks = new Map<string, Blockly.Block>();

  private probe(type: string): Blockly.Block {
    let b = this.blocks.get(type);
    if (!b) {
      b = this.ws.newBlock(type);
      this.blocks.set(type, b);
    }
    return b;
  }

  output(type: string): string[] | null {
    return this.probe(type).outputConnection?.getCheck() ?? null;
  }

  input(type: string, name: string): string[] | null {
    if (/^ARG\d+$/.test(name)) return null;
    const base = name.replace(/^(IF|DO|ADD)\d+$/, '$10');
    return this.probe(type).getInput(base)?.connection?.getCheck() ?? null;
  }

  /** Whether a dropdown on this block offers `value` (pins, AI labels). */
  hasOption(type: string, field: string, value: string): boolean {
    const f = this.probe(type).getField(field);
    if (!(f instanceof Blockly.FieldDropdown)) return false;
    return f.getOptions(false).some((o) => o[1] === value);
  }

  dispose() {
    this.ws.dispose();
  }
}

const fits = (socket: string[] | null, value: string[] | null) =>
  !socket || !value || value.some((t) => socket.includes(t));

const KIND_NAME: Record<string, string> = {
  Number: 'a number',
  String: 'text',
  Boolean: 'a True/False value',
  Array: 'a list',
};
const kindName = (check: string[] | null) =>
  check ? (KIND_NAME[check[0]!] ?? 'this value') : 'this value';

/** Python statements with no block, by Lezer node name. */
const NO_BLOCK: Record<string, string> = {
  TryStatement: 'try / except',
  ClassDefinition: 'classes',
  WithStatement: '"with"',
  DeleteStatement: '"del"',
  AssertStatement: '"assert"',
  RaiseStatement: '"raise"',
  DecoratedStatement: 'decorators (@...)',
  MatchStatement: 'match / case',
  LambdaExpression: 'lambda',
  ArrayComprehensionExpression: 'list comprehensions ([... for ... in ...])',
  DictionaryComprehensionExpression: 'dictionary comprehensions',
  SetComprehensionExpression: 'set comprehensions',
  ComprehensionExpression: 'generator expressions',
  ConditionalExpression: '"x if ... else y"',
  YieldExpression: '"yield"',
  AwaitExpression: '"await"',
};

// ── The converter ────────────────────────────────────────────────────────────

interface FnInfo {
  name: string;
  node: Node;
  params: string[];
  returnsValue: boolean;
  /** Names assigned in the function that Python keeps local to it. */
  locals: Set<string>;
  /** Every name used in the body. */
  names: Set<string>;
  /** User functions it calls. */
  calls: Set<string>;
  /** Local name → the name it gets in blocks (to keep it apart from others). */
  rename: Map<string, string>;
}

interface Ctx {
  fn: FnInfo | null;
  loops: number;
}

const TOP: Ctx = { fn: null, loops: 0 };

class Converter {
  private lineStarts: number[] = [0];
  private comments: { from: number; line: number; text: string; used: boolean }[] = [];
  private nextComment = 0;
  private vars = new Map<string, string>();
  private fns = new Map<string, FnInfo>();
  private helpers = new Set<string>();
  private fromImports = new Map<string, string>(); // local name → module.name
  private listVars = new Set<string>();
  private assigned = new Set<string>();
  private nameCount = new Map<string, number>();
  readonly notes: string[] = [];
  private dropped = 0;
  /** Names that only ever hold a dictionary / a list (so `x[i]` is an item of one). */
  private dictVars = new Set<string>();
  private knownLists = new Set<string>();
  /** Line → why it stayed as Python. */
  private rawReasons = new Map<number, string>();
  /** Every name the kept Python uses. */
  private rawRefs = new Set<string>();
  /** Imports, block-made helpers and tables that were skipped, with the names they make. */
  private skipped: { node: Node; binds: string[] }[] = [];
  /** `global` lines, kept only for names no block uses. */
  private scopes: { block: BlockJson; names: string[] }[] = [];
  /** Why an import stays as Python. */
  private importErrors = new Map<number, ConvertError>();
  /** A function failed to become blocks: convert again with it kept as Python. */
  retry = false;

  constructor(
    private code: string,
    private tree: Tree,
    private t: Templates,
    private checks: Checks,
    private options: ConvertOptions,
    private rawFns: RawFns,
  ) {
    for (let i = 0; i < code.length; i++) if (code[i] === '\n') this.lineStarts.push(i + 1);
  }

  // ── Small helpers ─────────────────────────────────────────────────────────

  lineOf(pos: number): number {
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid]! <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  src(n: Node): string {
    return this.code.slice(n.from, n.to);
  }

  fail(n: Node | number, message: string): never {
    throw new ConvertError(message, this.lineOf(typeof n === 'number' ? n : n.from));
  }

  /** Stop the whole conversion: this program can't become blocks at all. */
  fatal(n: Node | number, message: string): never {
    throw new ConvertError(message, this.lineOf(typeof n === 'number' ? n : n.from), true);
  }

  /** What a failed try changed, so it can be undone before trying another way. */
  snapshot() {
    const used = this.comments.map((c) => c.used);
    const { nextComment, dropped } = this;
    const reasons = new Map(this.rawReasons);
    const scopes = this.scopes.length;
    return () => {
      this.comments.forEach((c, i) => (c.used = used[i]!));
      Object.assign(this, { nextComment, dropped, rawReasons: reasons });
      this.scopes.length = scopes;
    };
  }

  noteRaw(err: ConvertError) {
    if (!err.quiet && !this.rawReasons.has(err.line)) this.rawReasons.set(err.line, err.message);
  }

  quiet(n: Node, message: string): never {
    const err = new ConvertError(message, this.lineOf(n.from));
    err.quiet = true;
    throw err;
  }

  // ── Python code blocks ────────────────────────────────────────────────────

  /** A "Python code" block holding the code from `from` to `to`, as written. */
  rawBlock(type: string, from: number, to: number, ctx: Ctx): BlockJson {
    const lines = this.rawLines(from, to, ctx);
    const fields: Record<string, string> = {};
    lines.forEach((line, i) => (fields[`LINE${i}`] = line));
    const block: BlockJson = { type, fields };
    if (lines.length > 1) block.extraState = { lines: lines.length };
    return block;
  }

  rawValue(n: Node, ctx: Ctx): Value {
    return { block: this.rawBlock('py_code_value', n.from, n.to, ctx), check: null };
  }

  /**
   * The code from `from` to `to` as lines for a "Python code" block: renamed
   * function variables use their new names, comments in it are kept in it,
   * and it is moved to the left edge (the blocks indent it again). A line
   * break inside a text becomes \n, so indenting can't change the text.
   */
  rawLines(from: number, to: number, ctx: Ctx): string[] {
    const edits: { from: number; to: number; text: string }[] = [];
    const texts: { from: number; to: number; raw: boolean }[] = [];
    this.tree.iterate({
      from,
      to,
      enter: (c) => {
        if (c.from < from || c.to > to) return true; // around the range: look inside
        if (c.name === 'Comment') {
          for (const k of this.comments) if (k.from === c.from) k.used = true;
          return false;
        }
        if (c.name === 'String' || c.name === 'FormatString') {
          const text = this.code.slice(c.from, c.to);
          if (text.includes('\n'))
            texts.push({ from: c.from, to: c.to, raw: /^[a-zA-Z]*[rR]/.test(text) });
          if (c.name === 'String') return false;
        }
        if (c.name === 'VariableName') {
          const node = c.node;
          if (node.parent?.name === 'ArgList' && node.nextSibling?.name === 'AssignOp') return true; // f(name=…)
          const name = this.code.slice(c.from, c.to);
          this.rawRefs.add(name);
          const renamed = ctx.fn?.rename.get(name);
          if (renamed) {
            this.rawRefs.add(renamed);
            edits.push({ from: c.from, to: c.to, text: renamed });
          }
        }
        return true;
      },
    });
    edits.sort((a, b) => a.from - b.from);
    texts.sort((a, b) => a.from - b.from);
    const apply = (a: number, b: number) => {
      let out = '';
      let pos = a;
      for (const e of edits)
        if (e.from >= a && e.to <= b) {
          out += this.code.slice(pos, e.from) + e.text;
          pos = e.to;
        }
      return out + this.code.slice(pos, b);
    };
    const lineStart = this.lineStarts[this.lineOf(from) - 1]!;
    const base = expandIndent(/^[ \t]*/.exec(this.code.slice(lineStart, from))![0]);
    let text = '';
    let pos = from;
    for (const t of texts) {
      text += apply(pos, t.from);
      let part = apply(t.from, t.to);
      part = t.raw ? unRaw(part) : escapeLineBreaks(part);
      text += part;
      pos = t.to;
    }
    text += apply(pos, to);
    const out: string[] = [];
    text.split('\n').forEach((line, i) => {
      let l = line;
      if (i > 0) {
        l = expandIndent(l);
        if (l.startsWith(base)) l = l.slice(base.length);
      }
      out.push(l.trimEnd());
    });
    while (out.length > 1 && out.at(-1) === '') out.pop();
    return out;
  }

  /**
   * A statement with no block of its own. A loop, if, try or with keeps real
   * blocks inside: only its header lines (`for k, v in d.items()`, `except
   * ValueError as e`) stay as Python. Anything else is kept whole.
   */
  keepAsPython(n: Node, ctx: Ctx, err: ConvertError): BlockJson[] {
    this.noteRaw(err);
    if (/^(For|While|If|Try|With)Statement$/.test(n.name) && !this.has(n, 'async')) {
      const restore = this.snapshot();
      try {
        return this.wrap(n, ctx);
      } catch (e) {
        if (!soft(e)) throw e;
        restore();
      }
    }
    return [this.rawBlock('py_code', n.from, n.to, ctx)];
  }

  wrap(n: Node, ctx: Ctx): BlockJson[] {
    const blocks: BlockJson[] = [];
    let start: number | null = null;
    for (let c = n.firstChild; c; c = c.nextSibling) {
      if (c.name === 'Comment') continue;
      start ??= c.from;
      if (c.name !== 'Body') continue;
      // Only a loop's own body is in the loop (not its "else").
      const loop = !blocks.length && /^(For|While)Statement$/.test(n.name);
      const block = this.rawBlock('py_code_wrap', start, c.from, ctx);
      const body = this.stack(this.kids(c), loop ? { ...ctx, loops: ctx.loops + 1 } : ctx);
      if (body) block.inputs = { DO: { block: body } };
      blocks.push(block);
      start = null;
    }
    return blocks;
  }

  /** The child nodes, without brackets, commas and the like. */
  kids(n: Node): Node[] {
    const out: Node[] = [];
    for (let c = n.firstChild; c; c = c.nextSibling)
      if (!/^[()[\]{},:.;]$/.test(c.name) && c.name !== 'Comment') out.push(c);
    return out;
  }

  has(n: Node, token: string): boolean {
    for (let c = n.firstChild; c; c = c.nextSibling) if (c.name === token) return true;
    return false;
  }

  varId(name: string): string {
    let id = this.vars.get(name);
    if (!id) {
      id = `v:${name}`;
      this.vars.set(name, id);
    }
    return id;
  }

  /** A variable's name in blocks (function locals may be renamed). */
  varName(name: string, ctx: Ctx): string {
    return ctx.fn?.rename.get(name) ?? name;
  }

  value(block: BlockJson): Value {
    return { block, check: this.checks.output(block.type) };
  }

  num(n: number): Value {
    return this.value({ type: 'math_number', fields: { NUM: n } });
  }

  text(s: string): Value {
    return this.value({ type: 'text', fields: { TEXT: s } });
  }

  getVar(name: string, ctx: Ctx): Value {
    return this.value({
      type: 'variables_get',
      fields: { VAR: { id: this.varId(this.varName(name, ctx)) } },
    });
  }

  /**
   * Put `v` into input `name` of a `type` block, if it fits. In a condition
   * (`truthy`), a number, text or list is compared with 0, '' or [] instead,
   * which is exactly how Python decides whether it counts as true.
   */
  input(type: string, name: string, v: Value, at: Node, truthy = false): { block: BlockJson } {
    const socket = this.checks.input(type, name);
    if (fits(socket, v.check)) return { block: v.block };
    if (truthy && socket?.includes('Boolean')) {
      const empty = v.check!.includes('Number')
        ? this.num(0)
        : v.check!.includes('String')
          ? this.text('')
          : v.check!.includes('Array')
            ? this.value({ type: 'lists_create_empty' })
            : null;
      if (empty) return { block: this.compare('NEQ', v, empty, at).block };
    }
    this.fail(at, `${kindName(v.check)} can't go there in blocks.`);
  }

  block(
    type: string,
    at: Node,
    fields: Record<string, unknown> = {},
    inputs: Record<string, Value> = {},
    extraState?: unknown,
    truthyInputs: string[] = [],
  ): BlockJson {
    const b: BlockJson = { type, fields };
    if (extraState !== undefined) b.extraState = extraState;
    const ins: Record<string, { block: BlockJson }> = {};
    for (const [name, v] of Object.entries(inputs))
      ins[name] = this.input(type, name, v, at, truthyInputs.includes(name));
    if (Object.keys(ins).length) b.inputs = ins;
    return b;
  }

  compare(op: string, a: Value, b: Value, at: Node): Value {
    return this.value(this.block('logic_compare', at, { OP: op }, { A: a, B: b }));
  }

  /** Comments written before `pos` (and on its own line): they go on the next block. */
  takeComments(pos: number, line = this.lineOf(pos)): string[] {
    return this.takeCommentsAt(pos, line).map((c) => c.text);
  }

  takeCommentsAt(pos: number, line = this.lineOf(pos)): { from: number; text: string }[] {
    const out: { from: number; text: string }[] = [];
    while (this.nextComment < this.comments.length) {
      const c = this.comments[this.nextComment]!;
      if (c.from > pos && c.line !== line) break;
      if (!c.used) out.push(c);
      c.used = true;
      this.nextComment++;
    }
    return out;
  }

  // ── Whole program ─────────────────────────────────────────────────────────

  run(): object {
    const top = this.tree.topNode;
    // A program that doesn't parse can't be converted: show where.
    this.tree.iterate({
      enter: (n) => {
        if (n.type.isError)
          this.fatal(
            n.from,
            "Python can't read this line. Fix it first — ▶ Run shows what's wrong.",
          );
      },
    });
    this.tree.iterate({
      enter: (n) => {
        if (n.name === 'Comment')
          this.comments.push({
            from: n.from,
            line: this.lineOf(n.from),
            text: this.code.slice(n.from + 1, n.to).trim(),
            used: false,
          });
      },
    });

    // Sort the top level into what is skipped, functions and the program.
    const statements: Node[] = [];
    const defs: Node[] = [];
    let declarations = true;
    for (let c = top.firstChild; c; c = c.nextSibling) {
      if (c.name === 'Comment') continue;
      const src = this.src(c);
      if (c.name === 'ImportStatement') {
        // Imports with blocks are written again by the blocks; others stay as Python.
        const restore = this.snapshot();
        try {
          this.skipped.push({ node: c, binds: this.readImport(c) });
          continue;
        } catch (err) {
          if (!soft(err)) throw err;
          restore();
          this.importErrors.set(c.from, err);
        }
        declarations = false;
        statements.push(c);
        continue;
      }
      if (c.name === 'FunctionDefinition') {
        const name = this.src(c.getChild('VariableName')!);
        if (this.t.defs.get(name) === squash(src)) {
          this.helpers.add(name);
          this.skipped.push({ node: c, binds: [name] });
          continue;
        }
        defs.push(c);
        continue;
      }
      if (c.name === 'AssignStatement' && this.t.tables.has(squash(src))) {
        this.skipped.push({ node: c, binds: [src.split(' ')[0]!] });
        continue;
      }
      // Blocks declare every variable first (`x = None`): the blocks do that again.
      if (declarations && c.name === 'AssignStatement' && /^[A-Za-z_]\w* = None$/.test(src)) {
        this.varId(src.split(' ')[0]!);
        this.assigned.add(src.split(' ')[0]!);
        continue;
      }
      declarations = false;
      statements.push(c);
    }
    // Drop the comments of the skipped parts (block-made helpers, imports).
    const kept = new Set([...statements, ...defs].map((n) => n.from));
    for (let c = top.firstChild; c; c = c.nextSibling) {
      if (c.name === 'Comment' || kept.has(c.from)) continue;
      for (const k of this.comments) if (k.from >= c.from && k.from < c.to) k.used = true;
    }
    for (const k of this.comments) if (this.t.comments.has(k.text)) k.used = true;

    this.analyse(statements, defs);

    const defBlocks: BlockJson[] = [];
    const ordered = [...statements, ...defs].sort((x, y) => x.from - y.from);
    let main = this.stack(ordered, TOP, defBlocks);
    main = this.chain(this.neededSkipped(), main ? [main] : []);
    const tops = main ? [main, ...defBlocks] : defBlocks;
    this.markUnneededGlobals(tops);
    const stacks = tops.map((b) => this.prune(b)).filter((b): b is BlockJson => !!b);
    const leftover = this.comments.filter((c) => !c.used).length + this.dropped;
    if (leftover)
      this.notes.push(
        leftover === 1
          ? 'A comment at the very end had no block to go on, so it was left out.'
          : `${leftover} comments at the very end had no block to go on, so they were left out.`,
      );
    this.noteRawLines();
    stacks.forEach((b, i) => Object.assign(b, { x: 20, y: 20 + i * 200 }));
    return {
      blocks: { languageVersion: 0, blocks: stacks },
      variables: [...this.vars].map(([name, id]) => ({ name, id })),
    };
  }

  /**
   * Skipped imports and block-made helpers that the kept Python uses: the
   * blocks only write those back when a block needs them, so they are kept
   * as Python too (at the start, in the order they were written).
   */
  neededSkipped(): BlockJson | null {
    const needed = new Set<Node>();
    for (let grew = true; grew; ) {
      grew = false;
      for (const s of this.skipped)
        if (!needed.has(s.node) && s.binds.some((b) => this.rawRefs.has(b))) {
          needed.add(s.node);
          this.rawBlock('py_code', s.node.from, s.node.to, TOP); // adds the names it uses
          grew = true;
        }
    }
    // Each once: the blocks may have written the same import at the top already.
    const kept = this.skipped.filter((s) => needed.has(s.node));
    const blocks = kept
      .filter(
        (s, i) =>
          !kept.slice(i + 1).some((t) => squash(this.src(t.node)) === squash(this.src(s.node))),
      )
      .map((s) => this.rawBlock('py_code', s.node.from, s.node.to, TOP));
    return this.chain(null, blocks);
  }

  /**
   * The blocks write `global` for every variable a block uses, so a `global`
   * line is only kept when it names a variable that just the Python code uses.
   */
  markUnneededGlobals(tops: BlockJson[]) {
    const used = new Set<string>();
    const visit = (b: BlockJson) => {
      const v = b.fields?.['VAR'] as { id?: string } | undefined;
      if (v?.id) used.add(v.id);
      const params = (b.extraState as { params?: { id: string }[] } | undefined)?.params;
      for (const p of params ?? []) used.add(p.id);
      for (const i of Object.values(b.inputs ?? {})) visit(i.block);
      if (b.next) visit(b.next.block);
    };
    tops.forEach(visit);
    for (const s of this.scopes)
      if (s.names.every((name) => used.has(this.varId(name)))) s.block.drop = true;
  }

  /** `top` without the blocks marked `drop` (their comments move to the next block). */
  prune(top: BlockJson): BlockJson | null {
    const prune = (b: BlockJson | undefined): BlockJson | null => {
      if (!b) return null;
      if (b.drop) {
        const next = prune(b.next?.block);
        if (next && b.icons) this.comment(next, [b.icons.comment.text]);
        return next;
      }
      for (const [name, input] of Object.entries(b.inputs ?? {})) {
        const kept = prune(input.block);
        if (kept) input.block = kept;
        else delete b.inputs![name];
      }
      const next = prune(b.next?.block);
      if (next) b.next = { block: next };
      else delete b.next;
      return b;
    };
    return prune(top);
  }

  noteRawLines() {
    const lines = [...this.rawReasons].sort((a, b) => a[0] - b[0]);
    for (const why of this.rawFns.values())
      if (!lines.some(([line]) => line === why.line)) lines.push([why.line, why.message]);
    if (!lines.length) return;
    lines.sort((a, b) => a[0] - b[0]);
    this.notes.push(
      lines.length === 1
        ? 'One part has no block yet, so it stays as Python in a grey "Python code" block:'
        : `${lines.length} parts have no blocks yet, so they stay as Python in grey "Python code" blocks:`,
    );
    for (const [line, message] of lines.slice(0, 5)) this.notes.push(`Line ${line}: ${message}`);
    if (lines.length > 5) this.notes.push(`…and ${lines.length - 5} more.`);
  }

  /** Reads an import the blocks can write themselves; gives the names it makes. */
  readImport(n: Node): string[] {
    const src = this.src(n);
    let m: RegExpExecArray | null;
    if ((m = /^import\s+([\w\s,]+)$/.exec(src))) {
      const mods = m[1]!.split(',').map((s) => s.trim());
      for (const mod of mods) if (!BLOCK_MODULES.has(mod)) this.noModule(n, mod);
      return mods;
    }
    if ((m = /^from\s+(\w+)\s+import\s+\(?([\w\s,]+?)\)?$/.exec(src))) {
      const mod = m[1]!;
      const names = m[2]!
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (mod === 'machine') {
        if (!this.options.onBoard) this.boardOnly(n);
        for (const name of names) if (!MACHINE_NAMES.has(name)) this.noModule(n, `machine.${name}`);
        return names;
      }
      if (!BLOCK_MODULES.has(mod) || mod === 'dht') this.noModule(n, mod);
      for (const name of names) {
        if (name === '*')
          this.fail(
            n,
            `Blocks can't use "from ${mod} import *". Write "import ${mod}" and ${mod}.something instead.`,
          );
        this.fromImports.set(name, `${mod}.${name}`);
      }
      return names;
    }
    this.fail(n, 'Blocks can only use plain imports like "import time" (no "as").');
  }

  noModule(n: Node, mod: string): never {
    this.fail(n, `There are no blocks for the "${mod}" module.`);
  }

  boardOnly(n: Node): never {
    this.fail(n, 'Pins and sensors only work on a board. Choose your ESP32 in "Runs on" first.');
  }

  // ── Who uses which names ──────────────────────────────────────────────────

  /**
   * Whether this VariableName is given a value here (Python then keeps it local
   * to the function it is in): `x = …`, `a, b = …`, `x += …`, `for k, v in …`,
   * `except E as e`, `with … as f`, `import x`.
   */
  isBinding(node: Node): boolean {
    let child = node;
    let p = node.parent;
    while (p && /^(TupleExpression|ParenthesizedExpression|ArrayExpression)$/.test(p.name)) {
      child = p;
      p = p.parent;
    }
    if (!p) return false;
    const after = (token: string) => {
      for (let s = child.nextSibling; s; s = s.nextSibling) if (s.name === token) return true;
      return false;
    };
    switch (p.name) {
      case 'AssignStatement':
        return after('AssignOp');
      case 'UpdateStatement':
        return p.firstChild?.from === child.from;
      case 'ForStatement':
        return after('in') && child.from < (p.getChild('in')?.from ?? 0);
      case 'TryStatement':
      case 'WithStatement':
        return child.prevSibling?.name === 'as';
      case 'ImportStatement':
        return (
          child.prevSibling?.name === 'as' ||
          (child.nextSibling?.name !== 'as' &&
            !!p.getChild('import') &&
            child.from > p.getChild('import')!.from &&
            child.prevSibling?.name !== '.')
        );
    }
    return false;
  }

  /**
   * Every VariableName read or written below `n`, and the ones given a value.
   * Gives true if `n` holds a function, class, lambda or comprehension (which
   * have names of their own).
   */
  scan(n: Node, names: Set<string>, assigned: Set<string>, calls: Set<string>): boolean {
    const cursor = n.cursor();
    const end = n.to;
    let scopes = false;
    do {
      if (cursor.from >= end) break;
      if (
        (cursor.name === 'FunctionDefinition' && cursor.from !== n.from) ||
        /^(ClassDefinition|LambdaExpression|\w*ComprehensionExpression)$/.test(cursor.name)
      )
        scopes = true;
      if (cursor.name === 'VariableName') {
        const name = this.code.slice(cursor.from, cursor.to);
        names.add(name);
        this.nameCount.set(name, (this.nameCount.get(name) ?? 0) + 1);
        const parent = cursor.node.parent!;
        if (parent.name === 'CallExpression' && parent.firstChild?.from === cursor.from)
          calls.add(name);
        if (this.isBinding(cursor.node)) assigned.add(name);
      }
    } while (cursor.next());
    return scopes;
  }

  analyse(statements: Node[], defs: Node[]) {
    const topNames = new Set<string>();
    const topCalls = new Set<string>();
    for (const s of statements) this.scan(s, topNames, this.assigned, topCalls);
    const keepAsPython = (d: Node, name: string, message: string) => {
      if (!this.rawFns.has(name)) this.rawFns.set(name, { line: this.lineOf(d.from), message });
    };
    // Every function, including the ones kept as Python: who calls whom.
    const all = new Map<string, FnInfo & { scopes: boolean; assigned: Set<string> }>();
    const seen = new Set<string>();
    for (const d of defs) {
      const name = this.src(d.getChild('VariableName')!);
      if (seen.has(name))
        keepAsPython(
          d,
          name,
          `There are two functions called "${name}". Blocks need different names.`,
        );
      seen.add(name);
      const paramList = d.getChild('ParamList')!;
      const plain = this.kids(paramList).every((k) => k.name === 'VariableName');
      const params = plain ? this.kids(paramList).map((k) => this.src(k)) : [];
      const names = new Set<string>();
      const assigned = new Set<string>();
      const calls = new Set<string>();
      const body = d.getChild('Body')!;
      const scopes = this.scan(body, names, assigned, calls);
      const globals = new Set<string>();
      let returnsValue = false;
      let nonlocal = false;
      body.cursor().iterate((c) => {
        if (c.name === 'ScopeStatement') {
          if (this.code.slice(c.from, c.to).startsWith('nonlocal')) nonlocal = true;
          for (const v of c.node.getChildren('VariableName')) globals.add(this.src(v));
        }
        if (c.name === 'ReturnStatement' && this.kids(c.node).length > 1) returnsValue = true;
      });
      for (const p of params) assigned.add(p);
      const locals = new Set([...assigned].filter((a) => !globals.has(a) && !params.includes(a)));
      all.set(name, {
        name,
        node: d,
        params,
        returnsValue,
        locals,
        names,
        calls,
        scopes,
        assigned,
        rename: new Map(),
      });
      if (this.has(d, 'async')) keepAsPython(d, name, 'Blocks have no "async" functions.');
      else if (!plain)
        keepAsPython(
          d,
          name,
          'Blocks can only make functions with plain inputs, like def area(width, height): — no default values, *args or type hints.',
        );
      else if (nonlocal) keepAsPython(d, name, 'Blocks have no "nonlocal".');
      else if (d.parent?.name === 'DecoratedStatement')
        keepAsPython(d, name, 'Blocks have no decorators (@...).');
    }
    for (const [name, f] of all) {
      if (this.rawFns.has(name)) {
        // Kept as Python: its names count as used "elsewhere" by the others.
        for (const x of f.names) topNames.add(x);
        continue;
      }
      if (this.vars.has(name) || this.assigned.has(name))
        keepAsPython(
          f.node,
          name,
          `"${name}" is the name of a function and of a variable. Blocks need different names.`,
        );
    }
    // Blocks have one copy of every variable, shared by the whole program. A
    // function's own (local) variable would then mix with one of the same name
    // elsewhere, so it gets a name of its own. A function that calls itself
    // (even through others) would need a fresh copy for every call, which
    // blocks can't do: it stays as Python.
    for (const f of all.values()) {
      if (this.rawFns.has(f.name)) continue;
      const reach = new Set<string>();
      const walk = (g: string) => {
        for (const c of all.get(g)?.calls ?? [])
          if (all.has(c) && !reach.has(c)) {
            reach.add(c);
            walk(c);
          }
      };
      walk(f.name);
      if (reach.has(f.name) && f.locals.size)
        keepAsPython(
          f.node,
          f.name,
          `"${f.name}" calls itself and has its own variables (${[...f.locals].join(', ')}). Blocks keep only one copy of each variable, so the calls would mix them up.`,
        );
    }
    for (const f of all.values()) {
      if (this.rawFns.has(f.name)) continue;
      for (const local of f.locals) {
        const elsewhere =
          topNames.has(local) ||
          [...all.values()].some((g) => g !== f && g.names.has(local) && !g.params.includes(local));
        if (!elsewhere) continue;
        let renamed = `${f.name}_${local}`;
        for (let i = 2; this.assigned.has(renamed) || all.has(renamed); i++)
          renamed = `${f.name}_${local}${i}`;
        f.rename.set(local, renamed);
      }
      // Renaming inside a class, lambda or inner function could change what a
      // name means there: keep such a function as Python instead.
      if (f.rename.size && f.scopes) {
        keepAsPython(
          f.node,
          f.name,
          `"${f.name}" has variables that need new names in blocks, and a part (class, lambda or comprehension) where that isn't safe.`,
        );
        continue;
      }
      for (const [local, renamed] of f.rename) {
        this.assigned.add(renamed);
        this.notes.push(
          `In "${f.name}", the variable "${local}" is now "${renamed}", so it doesn't mix with the "${local}" outside it.`,
        );
      }
      for (const a of f.assigned) this.assigned.add(a);
      for (const c of [...f.calls]) if (!all.has(c) || this.rawFns.has(c)) f.calls.delete(c);
      this.fns.set(f.name, f);
    }
    for (const s of statements)
      s.cursor().iterate((c) => {
        if (c.name === 'ReturnStatement')
          this.fatal(
            c.from,
            '"return" only works inside a function. Fix it first — ▶ Run shows what\'s wrong.',
          );
        return c.name !== 'FunctionDefinition' && c.name !== 'ClassDefinition';
      });
    // What each variable holds, from every place it gets a value. `x = None`
    // (which the blocks write first) says nothing; an input of a function
    // could be anything.
    const kinds = new Map<string, Set<string>>();
    const add = (name: string, kind: string) => {
      if (!kinds.has(name)) kinds.set(name, new Set());
      kinds.get(name)!.add(kind);
    };
    const kindOf = (v: Node): string | null => {
      if (v.name === 'None') return null;
      if (v.name === 'DictionaryExpression' || this.isCall(v, 'dict')) return 'dict';
      if (
        /^(ArrayExpression|ArrayComprehensionExpression)$/.test(v.name) ||
        this.isCall(v, 'list') ||
        this.isCall(v, 'sorted')
      )
        return 'list';
      if (v.name === 'BinaryExpression') {
        const k = this.kids(v);
        if (
          /^[*+]$/.test(this.src(k[1]!)) &&
          [k[0]!, k[2]!].some((x) => x.name === 'ArrayExpression')
        )
          return 'list';
      }
      return 'other';
    };
    this.tree.iterate({
      enter: (c) => {
        if (c.name === 'ParamList') {
          for (const p of c.node.getChildren('VariableName')) add(this.src(p), 'other');
          return false;
        }
        if (c.name === 'CallExpression') {
          // a.append(x): a is a list.
          const callee = c.node.firstChild;
          const obj = callee?.firstChild;
          const method = callee?.getChild('PropertyName');
          if (
            callee?.name === 'MemberExpression' &&
            obj?.name === 'VariableName' &&
            method &&
            /^(append|insert|extend|sort|reverse)$/.test(this.src(method))
          )
            add(this.src(obj), 'list');
        }
        if (c.name !== 'VariableName' || !this.isBinding(c.node)) return true;
        const parent = c.node.parent!;
        const parts = this.kids(parent);
        const simple =
          parent.name === 'AssignStatement' && parts.length === 3 && parts[0]!.from === c.from;
        const kind = simple ? kindOf(parts[2]!) : 'other';
        if (kind) add(this.src(c.node), kind);
        return true;
      },
    });
    for (const [name, k] of kinds) {
      if (k.size === 1 && k.has('dict')) this.dictVars.add(name);
      if (k.size === 1 && k.has('list')) this.knownLists.add(name);
    }
  }

  // ── Statements ────────────────────────────────────────────────────────────

  /**
   * Statements as one stack of blocks (null when there are none). At the top
   * level, functions are made into their own blocks (`defs`) where they appear,
   * so every comment lands on the block it was written next to.
   */
  stack(nodes: Node[], ctx: Ctx, defs?: BlockJson[]): BlockJson | null {
    let first: BlockJson | null = null;
    let last: BlockJson | null = null;
    let pending: string[] = [];
    for (const n of nodes) {
      if (n.name === 'FunctionDefinition' && defs) {
        const name = this.src(n.getChild('VariableName')!);
        if (!this.rawFns.has(name)) {
          const restore = this.snapshot();
          try {
            defs.push(this.procedure(n));
          } catch (err) {
            if (!soft(err)) throw err;
            // Calls to it were made into blocks already: convert again, with it as Python.
            restore();
            this.rawFns.set(name, { line: err.line, message: err.message });
            this.retry = true;
          }
          continue;
        }
      }
      const taken = this.takeCommentsAt(n.from);
      const inside = (c: { from: number }) => c.from >= n.from && c.from < n.to;
      pending.push(...taken.filter((c) => !inside(c)).map((c) => c.text));
      // A text on its own line (like a docstring) is a comment.
      if (
        n.name === 'ExpressionStatement' &&
        /^(String|ContinuedString)$/.test(n.firstChild?.name ?? '')
      ) {
        const doc = this.stringValue(n.firstChild!).trim();
        if (doc) pending.push(doc);
        continue;
      }
      let blocks: BlockJson[];
      const restore = this.snapshot();
      try {
        blocks = this.statement(n, ctx);
      } catch (err) {
        if (!soft(err)) throw err;
        restore();
        blocks = this.keepAsPython(n, ctx, err);
      }
      // A comment at the end of the line, or one inside that no block took (as
      // in `if x: return 1  # one`), goes on the block — unless the statement
      // is kept as Python: it is in there.
      if (blocks[0]?.type !== 'py_code')
        pending.push(...taken.filter(inside).map((c) => c.text), ...this.takeComments(n.to - 1));
      if (!blocks.length) continue;
      if (pending.length) {
        this.comment(blocks[0]!, pending);
        pending = [];
      }
      for (const b of blocks) {
        if (last) last.next = { block: b };
        else first = b;
        last = b;
        while (last.next) last = last.next.block;
      }
    }
    // Comments above a "pass" at the end: keep them on the last block.
    if (pending.length) {
      if (last) this.comment(last, pending);
      else this.dropped += pending.length;
    }
    return first;
  }

  comment(block: BlockJson, lines: string[]) {
    const old = block.icons?.comment.text;
    const text = [...(old ? [old] : []), ...lines].join('\n');
    block.icons = { comment: { text, pinned: false, height: 80, width: 200 } };
  }

  body(n: Node, ctx: Ctx): BlockJson | null {
    const body = n.name === 'Body' ? n : n.getChild('Body');
    if (!body) return null;
    return this.stack(this.kids(body), ctx);
  }

  statement(n: Node, ctx: Ctx): BlockJson[] {
    switch (n.name) {
      case 'ExpressionStatement':
        return this.expressionStatement(n, ctx);
      case 'AssignStatement':
        return [this.assign(n, ctx)];
      case 'UpdateStatement':
        return [this.update(n, ctx)];
      case 'IfStatement':
        return this.ifStatement(n, ctx);
      case 'WhileStatement':
        return [this.whileStatement(n, ctx)];
      case 'ForStatement':
        return [this.forStatement(n, ctx)];
      case 'PassStatement':
        return [];
      case 'BreakStatement':
      case 'ContinueStatement':
        if (!ctx.loops) this.fail(n, `"${this.src(n)}" only works inside a loop.`);
        return [
          {
            type: 'controls_flow_statements',
            fields: { FLOW: n.name === 'BreakStatement' ? 'BREAK' : 'CONTINUE' },
          },
        ];
      case 'ScopeStatement': {
        // Kept for now; dropped later if blocks use all its names (they write `global` themselves).
        if (this.src(n).startsWith('nonlocal')) this.fail(n, 'Blocks have no "nonlocal".');
        const block = this.rawBlock('py_code', n.from, n.to, ctx);
        this.scopes.push({ block, names: n.getChildren('VariableName').map((v) => this.src(v)) });
        return [block];
      }
      case 'ReturnStatement':
        return [this.returnStatement(n, ctx)];
      case 'ImportStatement': {
        const why = this.importErrors.get(n.from);
        if (why) throw why;
        return this.fail(n, 'Put imports at the very top of the program, not inside other code.');
      }
      case 'FunctionDefinition': {
        const why = this.rawFns.get(this.src(n.getChild('VariableName')!));
        if (why && !ctx.fn) {
          const err = new ConvertError(why.message, why.line);
          err.quiet = true; // listed with the functions
          throw err;
        }
        return this.fail(
          n,
          "Blocks can't make a function inside other code. Move it out to the left edge.",
        );
      }
      default:
        return this.fail(
          n,
          NO_BLOCK[n.name]
            ? `There are no blocks for ${NO_BLOCK[n.name]}.`
            : "There's no block for this line.",
        );
    }
  }

  expressionStatement(n: Node, ctx: Ctx): BlockJson[] {
    const e = n.firstChild!;
    if (e.name !== 'CallExpression')
      this.fail(
        n,
        'This line works something out but does nothing with it. Print it or save it in a variable.',
      );
    const b = this.call(e, ctx, true);
    return [b.block];
  }

  assign(n: Node, ctx: Ctx): BlockJson {
    const ops = n.getChildren('AssignOp');
    if (ops.length > 1)
      this.fail(n, 'Blocks set one variable at a time: write a = 1 and b = 1 on separate lines.');
    if (n.getChild('TypeDef'))
      this.fail(n, 'Blocks have no type hints (x: int). Leave out the ": int".');
    const parts = this.kids(n);
    const op = parts.findIndex((k) => k.name === 'AssignOp');
    const targets = parts.slice(0, op);
    const values = parts.slice(op + 1);
    if (targets.length !== 1 || !values.length)
      this.fail(n, 'Blocks set one variable at a time: write a = 1 and b = 2 on separate lines.');
    const target = targets[0]!;
    // `x = 1, 2` saves a tuple.
    if (values.length > 1) {
      if (target.name !== 'VariableName')
        this.fail(n, 'Blocks can only save a tuple in a variable.');
      const id = this.varId(this.varName(this.src(target), ctx));
      return this.block('variables_set', n, { VAR: { id } }, { VALUE: this.tuple(values, n, ctx) });
    }
    const valueNode = values[0]!;
    if (target.name === 'MemberExpression' && this.isDictItem(target)) {
      const [obj, key] = this.kids(target) as [Node, Node];
      return this.block(
        'py_dict_set',
        n,
        {},
        { DICT: this.expr(obj, ctx), KEY: this.expr(key, ctx), VALUE: this.expr(valueNode, ctx) },
      );
    }
    if (target.name === 'MemberExpression') {
      const { list, where } = this.subscript(target, ctx);
      const v = this.expr(valueNode, ctx);
      return this.block(
        'lists_setIndex',
        n,
        { MODE: 'SET', WHERE: where.where },
        { LIST: list, ...(where.at ? { AT: where.at } : {}), TO: v },
      );
    }
    if (target.name !== 'VariableName')
      this.fail(n, 'Blocks can only save into a variable or an item of a list.');
    const name = this.src(target);
    const id = this.varId(this.varName(name, ctx));
    const valueSrc = this.src(valueNode).replace(/\s+/g, ' ');
    // `x = (x if isinstance(x, (int, float)) else 0) + 1` is "change x by 1".
    const change = new RegExp(
      `^\\(${name} if isinstance\\(${name}, \\(int, float\\)\\) else 0\\) \\+ `,
    );
    if (valueNode.name === 'BinaryExpression' && change.test(valueSrc)) {
      const delta = this.expr(this.kids(valueNode)[2]!, ctx);
      return this.block('math_change', n, { VAR: { id } }, { DELTA: delta });
    }
    // `x = str(x) + "!"` is "append text".
    if (
      valueNode.name === 'BinaryExpression' &&
      new RegExp(`^str\\(${name}\\) \\+ `).test(valueSrc)
    ) {
      let add = this.kids(valueNode)[2]!;
      if (this.isCall(add, 'str') && this.args(add).length === 1) add = this.args(add)[0]!;
      return this.block('text_append', n, { VAR: { id } }, { TEXT: this.expr(add, ctx) });
    }
    const v = this.expr(valueNode, ctx);
    if (v.check?.includes('Array')) this.listVars.add(name);
    return this.block('variables_set', n, { VAR: { id } }, { VALUE: v });
  }

  update(n: Node, ctx: Ctx): BlockJson {
    const [target, op, valueNode] = [n.firstChild!, n.getChild('UpdateOp')!, this.kids(n).at(-1)!];
    if (target.name === 'MemberExpression' && this.isDictItem(target)) {
      // d["k"] += 1 → in d set "k" to (in d get "k") + 1. The key is worked out
      // twice, so only a plain key is allowed.
      const [obj, key] = this.kids(target) as [Node, Node];
      if (obj.name !== 'VariableName' || !/^(VariableName|String|Number)$/.test(key.name))
        this.fail(
          n,
          'Blocks can only change a dictionary item with a plain key, like d["a"] += 1.',
        );
      const current = this.value(
        this.block(
          'py_dict_get',
          target,
          {},
          { DICT: this.expr(obj, ctx), KEY: this.expr(key, ctx) },
        ),
      );
      const sum = this.binary(this.src(op).slice(0, -1), current, this.expr(valueNode, ctx), n);
      return this.block(
        'py_dict_set',
        n,
        {},
        { DICT: this.expr(obj, ctx), KEY: this.expr(key, ctx), VALUE: sum },
      );
    }
    if (target.name !== 'VariableName')
      this.fail(n, 'Blocks can only do +=, -= and so on with a variable.');
    const name = this.src(target);
    const id = this.varId(this.varName(name, ctx));
    const opText = this.src(op).slice(0, -1);
    const v = this.expr(valueNode, ctx);
    if (opText === '+' && v.check?.includes('Number'))
      return this.block('math_change', n, { VAR: { id } }, { DELTA: v });
    if (opText === '+' && v.check?.includes('String'))
      return this.block('text_append', n, { VAR: { id } }, { TEXT: v });
    const sum = this.binary(opText, this.getVar(name, ctx), v, n);
    return this.block('variables_set', n, { VAR: { id } }, { VALUE: sum });
  }

  ifStatement(n: Node, ctx: Ctx): BlockJson[] {
    // if c0: b0  [elif cK: bK]*  [else: be]
    const conds: Node[] = [];
    const bodies: Node[] = [];
    let elseBody: Node | null = null;
    let afterElse = false;
    for (let c = n.firstChild; c; c = c.nextSibling) {
      if (c.name === 'else') afterElse = true;
      else if (c.name === 'Body') {
        if (afterElse) elseBody = c;
        else bodies.push(c);
      } else if (!/^(if|elif|Comment)$/.test(c.name)) conds.push(c);
    }
    // In a function, `if c: return v` is the "if ... return" block.
    if (ctx.fn && !elseBody && conds.length === 1) {
      const only = this.kids(bodies[0]!);
      if (only.length === 1 && only[0]!.name === 'ReturnStatement')
        return [this.ifReturn(conds[0]!, only[0]!, ctx)];
    }
    const inputs: Record<string, Value> = {};
    const statements: Record<string, BlockJson> = {};
    conds.forEach((c, i) => {
      inputs[`IF${i}`] = this.expr(c, ctx, true);
      const b = this.body(bodies[i]!, ctx);
      if (b) statements[`DO${i}`] = b;
    });
    if (elseBody) {
      const b = this.body(elseBody, ctx);
      if (b) statements['ELSE'] = b;
    }
    const block = this.block(
      'controls_if',
      n,
      {},
      inputs,
      conds.length > 1 || elseBody
        ? { elseIfCount: conds.length - 1, hasElse: !!elseBody }
        : undefined,
      Object.keys(inputs),
    );
    for (const [k, b] of Object.entries(statements)) (block.inputs ??= {})[k] = { block: b };
    return [block];
  }

  ifReturn(cond: Node, ret: Node, ctx: Ctx): BlockJson {
    const values = this.kids(ret).filter((k) => k.name !== 'return');
    const valueNode = values[0];
    if (!!valueNode !== ctx.fn!.returnsValue)
      this.fail(
        ret,
        `"${ctx.fn!.name}" must either always give back a value or never. Blocks can't mix "return" and "return something".`,
      );
    const inputs: Record<string, Value> = { CONDITION: this.expr(cond, ctx, true) };
    if (valueNode) inputs['VALUE'] = this.valueOf(values, ret, ctx);
    return this.block(
      'procedures_ifreturn',
      ret,
      {},
      inputs,
      `<mutation value="${valueNode ? 1 : 0}"></mutation>`,
      ['CONDITION'],
    );
  }

  returnStatement(n: Node, ctx: Ctx): BlockJson {
    void ctx;
    this.fail(
      n,
      'Blocks can only "return" at the end of a function, or straight from an "if" (if ...: return ...). This return is somewhere else.',
    );
  }

  whileStatement(n: Node, ctx: Ctx): BlockJson {
    if (this.has(n, 'else')) this.fail(n, 'Blocks have no "else" after a loop.');
    const cond = this.kids(n).find((k) => k.name !== 'while' && k.name !== 'Body')!;
    const inner = { ...ctx, loops: ctx.loops + 1 };
    // `while not x` reads as "repeat until x".
    let mode = 'WHILE';
    let test = cond;
    if (
      cond.name === 'UnaryExpression' &&
      cond.firstChild?.name === 'not' &&
      !this.isCall(this.kids(cond)[1]!, 'len')
    ) {
      mode = 'UNTIL';
      test = this.kids(cond)[1]!;
    }
    const block = this.block(
      'controls_whileUntil',
      n,
      { MODE: mode },
      { BOOL: this.expr(test, ctx, true) },
      undefined,
      ['BOOL'],
    );
    const body = this.body(n, inner);
    if (body) (block.inputs ??= {})['DO'] = { block: body };
    return block;
  }

  forStatement(n: Node, ctx: Ctx): BlockJson {
    if (this.has(n, 'else')) this.fail(n, 'Blocks have no "else" after a loop.');
    const parts = this.kids(n).filter((k) => !/^(for|in|Body)$/.test(k.name));
    if (parts.length !== 2 || parts[0]!.name !== 'VariableName')
      this.fail(n, 'Blocks can only loop with one variable, like "for item in things:".');
    const [target, iter] = parts as [Node, Node];
    const name = this.src(target);
    const inner = { ...ctx, loops: ctx.loops + 1 };
    const id = this.varId(this.varName(name, ctx));
    let block: BlockJson;
    const rangeArgs = this.isCall(iter, 'range') ? this.args(iter) : null;
    const forBlocks = this.blockMadeCount(iter, ctx);
    if (rangeArgs && rangeArgs.length === 1 && this.nameCount.get(name) === 1) {
      // The loop variable is never used: "repeat N times".
      let times = rangeArgs[0]!;
      if (this.isCall(times, 'int') && this.args(times).length === 1) times = this.args(times)[0]!;
      block = this.block('controls_repeat_ext', n, {}, { TIMES: this.expr(times, ctx) });
    } else if (rangeArgs && this.literalRange(rangeArgs)) {
      // Whole numbers that are written out: "count with i from 1 to 10 by 1".
      const [start, stop, step] = this.literalRange(rangeArgs)!;
      const to = step > 0 ? stop - 1 : stop + 1;
      block = this.block(
        'controls_for',
        n,
        { VAR: { id } },
        { FROM: this.num(start), TO: this.num(to), BY: this.num(Math.abs(step)) },
      );
    } else if (forBlocks) {
      block = this.block('controls_for', n, { VAR: { id } }, forBlocks);
    } else {
      const list = this.expr(iter, ctx);
      if (list.check?.includes('String') && !list.check.includes('Array'))
        this.fail(
          iter,
          "Blocks can't go through the letters of a text one by one. Keep this loop as Python.",
        );
      if (iter.name === 'VariableName') this.listVars.add(this.src(iter));
      block = this.block('controls_forEach', n, { VAR: { id } }, { LIST: list });
    }
    const body = this.body(n, inner);
    if (body) (block.inputs ??= {})['DO'] = { block: body };
    return block;
  }

  /** range() with whole-number literals that runs at least once: [start, stop, step]. */
  literalRange(args: Node[]): [number, number, number] | null {
    const nums = args.map((a) => this.intLiteral(a));
    if (nums.some((v) => v === null) || !nums.length || nums.length > 3) return null;
    const [start, stop, step] =
      nums.length === 1
        ? [0, nums[0]!, 1]
        : nums.length === 2
          ? [nums[0]!, nums[1]!, 1]
          : (nums as [number, number, number]);
    if (step === 0 || (step > 0 ? start >= stop : start <= stop)) return null;
    return [start, stop, step];
  }

  /**
   * The "count with" block with variables writes
   * `(a <= b) and upRange(a, b, s) or downRange(a, b, s)`: read it back.
   */
  blockMadeCount(iter: Node, ctx: Ctx): Record<string, Value> | null {
    if (!this.helpers.has('upRange') || !this.helpers.has('downRange')) return null;
    const m = /^\((.+) <= (.+)\) and upRange\((.+), (.+), (.+)\) or downRange\(\3, \4, \5\)$/.exec(
      this.src(iter),
    );
    if (!m || m[1] !== m[3] || m[2] !== m[4]) return null;
    const up = this.kids(this.kids(iter)[0]!).find((k) => this.isCall(k, 'upRange'));
    const args = up ? this.args(up) : null;
    if (!args || args.length !== 3) return null;
    return {
      FROM: this.expr(args[0]!, ctx),
      TO: this.expr(args[1]!, ctx),
      BY: this.expr(args[2]!, ctx),
    };
  }

  // ── Functions ─────────────────────────────────────────────────────────────

  procedure(d: Node): BlockJson {
    const block = this.procedureBlock(d);
    // Comments no block took (like one after the last `return`) go on the function.
    const rest = this.takeComments(d.to - 1);
    if (rest.length) this.comment(block, rest);
    return block;
  }

  procedureBlock(d: Node): BlockJson {
    const f = this.fns.get(this.src(d.getChild('VariableName')!))!;
    const ctx: Ctx = { fn: f, loops: 0 };
    const comments = this.takeComments(d.from);
    let statements = this.kids(d.getChild('Body')!);
    // A docstring becomes the function's comment.
    const first = statements[0];
    if (
      first?.name === 'ExpressionStatement' &&
      /^(String|ContinuedString)$/.test(first.firstChild?.name ?? '')
    ) {
      comments.push(this.stringValue(first.firstChild!).trim());
      statements = statements.slice(1);
    }
    let returnValue: Value | null = null;
    const last = statements.at(-1);
    if (last?.name === 'ReturnStatement') {
      const values = this.kids(last).filter((k) => k.name !== 'return');
      if (values.length) returnValue = this.valueOf(values, last, ctx);
      statements = statements.slice(0, -1);
      if (!values.length && f.returnsValue)
        this.fail(
          last,
          `"${f.name}" must either always give back a value or never. Blocks can't mix "return" and "return something".`,
        );
    } else if (f.returnsValue && last?.name === 'IfStatement' && this.has(last, 'else')) {
      // if a: return x / elif b: return y / else: return z → "if ... return" blocks + return z.
      const branches = this.kids(last)
        .filter((k) => k.name === 'Body')
        .map((b) => this.kids(b));
      if (branches.every((b) => b.length === 1 && b[0]!.name === 'ReturnStatement')) {
        statements = statements.slice(0, -1);
        const conds = this.kids(last).filter((k) => !/^(if|elif|else|Body)$/.test(k.name));
        const body = this.stack(statements, ctx);
        const ifs = conds.map((c, i) => this.ifReturn(c, branches[i]![0]!, ctx));
        const elseRet = branches.at(-1)![0]!;
        const values = this.kids(elseRet).filter((k) => k.name !== 'return');
        returnValue = values.length ? this.valueOf(values, elseRet, ctx) : null;
        return this.procBlock(f, d, comments, this.chain(body, ifs), returnValue);
      }
    }
    if (f.returnsValue && !returnValue) returnValue = this.value({ type: 'logic_null' }); // falls off the end: None
    const body = this.stack(statements, ctx);
    return this.procBlock(f, d, comments, body, returnValue);
  }

  chain(first: BlockJson | null, rest: BlockJson[]): BlockJson | null {
    let head = first;
    let tail = first;
    while (tail?.next) tail = tail.next.block;
    for (const b of rest) {
      if (tail) tail.next = { block: b };
      else head = b;
      tail = b;
    }
    return head;
  }

  procBlock(
    f: FnInfo,
    d: Node,
    comments: string[],
    body: BlockJson | null,
    returnValue: Value | null,
  ): BlockJson {
    const type = f.returnsValue ? 'procedures_defreturn' : 'procedures_defnoreturn';
    const block = this.block(
      type,
      d,
      { NAME: f.name },
      returnValue ? { RETURN: returnValue } : {},
      { params: f.params.map((p) => ({ name: p, id: this.varId(p) })) },
    );
    if (body) (block.inputs ??= {})['STACK'] = { block: body };
    if (comments.length)
      block.icons = {
        comment: { text: comments.join('\n'), pinned: false, height: 80, width: 200 },
      };
    return block;
  }

  // ── Expressions ───────────────────────────────────────────────────────────

  /** A call of `name` (not when the program uses `name` for its own variable). */
  isCall(n: Node, name: string): boolean {
    return (
      n.name === 'CallExpression' &&
      n.firstChild?.name === 'VariableName' &&
      this.src(n.firstChild) === name &&
      !this.assigned.has(name)
    );
  }

  args(call: Node): Node[] {
    const list = call.getChild('ArgList');
    if (!list) return [];
    if (list.getChild('AssignOp') || this.has(list, '*') || this.has(list, '**')) {
      const fn = this.src(call.firstChild!);
      this.fail(
        call,
        fn === 'print'
          ? "Blocks can't print with sep= or end=. Print the whole line in one go instead."
          : 'Blocks can only give a function plain values, like f(1, x) — no name=value or *list.',
      );
    }
    return this.kids(list);
  }

  intLiteral(n: Node): number | null {
    if (n.name === 'Number' && /^\d+$/.test(this.src(n))) return Number(this.src(n));
    if (n.name === 'UnaryExpression' && n.firstChild && this.src(n.firstChild) === '-') {
      const v = this.intLiteral(this.kids(n)[1]!);
      return v === null ? null : -v;
    }
    if (n.name === 'ParenthesizedExpression') return this.intLiteral(this.kids(n)[0]!);
    return null;
  }

  /** `a` is a value; `a, b` (from `return a, b`) is a tuple. */
  valueOf(nodes: Node[], at: Node, ctx: Ctx): Value {
    return nodes.length === 1 ? this.expr(nodes[0]!, ctx) : this.tuple(nodes, at, ctx);
  }

  /** "create list with" the items (or "create empty list"). */
  listOf(items: Node[], at: Node, ctx: Ctx): Value {
    if (!items.length) return this.value({ type: 'lists_create_empty' });
    const inputs: Record<string, Value> = {};
    items.forEach((item, i) => (inputs[`ADD${i}`] = this.expr(item, ctx)));
    return this.value(this.block('lists_create_with', at, {}, inputs, { itemCount: items.length }));
  }

  tuple(items: Node[], at: Node, ctx: Ctx): Value {
    if (items.some((i) => i.name === '*')) this.fail(at, 'Blocks have no *list inside a tuple.');
    return this.value(this.block('py_tuple', at, {}, { ITEMS: this.listOf(items, at, ctx) }));
  }

  /** d["key"]: an item of a dictionary (not a list). */
  isDictItem(n: Node): boolean {
    const parts = this.kids(n);
    if (!this.has(n, '[') || this.has(n, ':') || parts.length !== 2) return false;
    const [obj, key] = parts as [Node, Node];
    return (
      obj.name === 'DictionaryExpression' ||
      (obj.name === 'VariableName' && this.dictVars.has(this.src(obj))) ||
      /^(String|FormatString|ContinuedString|TupleExpression)$/.test(key.name)
    );
  }

  /** A value as blocks; a part with no block is kept as Python (a "Python code" value). */
  expr(n: Node, ctx: Ctx, truthy = false): Value {
    const restore = this.snapshot();
    try {
      return this.exprInner(n, ctx, truthy);
    } catch (err) {
      if (!soft(err)) throw err;
      restore();
      this.noteRaw(err);
      return this.rawValue(n, ctx);
    }
  }

  exprInner(n: Node, ctx: Ctx, truthy: boolean): Value {
    switch (n.name) {
      case 'ParenthesizedExpression': {
        const inner = this.kids(n);
        if (inner.length !== 1) this.fail(n, 'There are no blocks for tuples (a, b).');
        return this.expr(inner[0]!, ctx, truthy);
      }
      case 'Number':
        return this.number(n, this.src(n));
      case 'String':
      case 'ContinuedString':
        return this.text(this.stringValue(n));
      case 'FormatString':
        return this.formatString(n, ctx);
      case 'Boolean':
        return this.value({
          type: 'logic_boolean',
          fields: { BOOL: this.src(n) === 'True' ? 'TRUE' : 'FALSE' },
        });
      case 'None':
        return this.value({ type: 'logic_null' });
      case 'VariableName': {
        const name = this.src(n);
        if (this.fns.has(name))
          this.fail(n, `To use the function "${name}", call it: ${name}(...).`);
        if (!this.assigned.has(name) && !this.assigned.has(this.varName(name, ctx)))
          this.fail(
            n,
            `"${name}" never gets a value, so there's no block for it. Is it spelled right?`,
          );
        return this.getVar(name, ctx);
      }
      case 'UnaryExpression':
        return this.unary(n, ctx);
      case 'BinaryExpression':
        return this.binaryExpr(n, ctx, truthy);
      case 'CallExpression':
        return this.call(n, ctx, false) as Value;
      case 'MemberExpression': {
        if (!this.has(n, '[')) this.fail(n, `There's no block for "${this.src(n)}".`);
        if (this.isDictItem(n)) {
          const [obj, key] = this.kids(n) as [Node, Node];
          return this.value(
            this.block(
              'py_dict_get',
              n,
              {},
              { DICT: this.expr(obj, ctx), KEY: this.expr(key, ctx) },
            ),
          );
        }
        const { list, where } = this.subscript(n, ctx);
        return this.value(
          this.block(
            'lists_getIndex',
            n,
            { MODE: 'GET', WHERE: where.where },
            { VALUE: list, ...(where.at ? { AT: where.at } : {}) },
          ),
        );
      }
      case 'TupleExpression':
        return this.tuple(this.kids(n), n, ctx);
      case 'SetExpression':
        if (this.has(n, '*')) this.fail(n, 'Blocks have no *list inside a set.');
        return this.value(
          this.block('py_set', n, {}, { ITEMS: this.listOf(this.kids(n), n, ctx) }),
        );
      case 'DictionaryExpression': {
        if (this.has(n, '**')) this.fail(n, 'Blocks have no **dictionary inside a dictionary.');
        const parts = this.kids(n);
        const inputs: Record<string, Value> = {};
        for (let i = 0; i + 1 < parts.length; i += 2) {
          inputs[`KEY${i / 2}`] = this.expr(parts[i]!, ctx);
          inputs[`VALUE${i / 2}`] = this.expr(parts[i + 1]!, ctx);
        }
        return this.value(this.block('py_dict', n, {}, inputs, { itemCount: parts.length >> 1 }));
      }
      case 'ArrayExpression': {
        const items = this.kids(n);
        if (this.has(n, '*')) this.fail(n, 'Blocks have no *list inside a list.');
        if (!items.length) return this.value({ type: 'lists_create_empty' });
        const inputs: Record<string, Value> = {};
        items.forEach((item, i) => (inputs[`ADD${i}`] = this.expr(item, ctx)));
        return this.value(
          this.block('lists_create_with', n, {}, inputs, { itemCount: items.length }),
        );
      }
      default:
        this.fail(
          n,
          NO_BLOCK[n.name]
            ? `There are no blocks for ${NO_BLOCK[n.name]}.`
            : `There's no block for "${this.src(n)}".`,
        );
    }
  }

  number(n: Node, text: string): Value {
    const clean = text.replace(/_/g, '');
    if (/[jJ]$/.test(clean)) this.fail(n, 'Blocks have no complex numbers.');
    const isFloat = /^\d*\.\d*([eE][-+]?\d+)?$|^\d+[eE][-+]?\d+$/.test(clean);
    const value = /^0[xX]/.test(clean)
      ? parseInt(clean, 16)
      : /^0[oO]/.test(clean)
        ? parseInt(clean.slice(2), 8)
        : /^0[bB]/.test(clean)
          ? parseInt(clean.slice(2), 2)
          : Number(clean);
    if (
      !Number.isFinite(value) ||
      /e/i.test(String(value)) ||
      (!isFloat && !Number.isSafeInteger(value))
    )
      this.fail(n, `The number block can't hold ${text}.`);
    if (isFloat && Number.isInteger(value))
      this.fail(
        n,
        `The number block would turn ${text} into ${value} (a whole number), which can print differently. Write ${value} if that's fine.`,
      );
    return this.num(value);
  }

  /** The text of a string literal (prefixes, quotes and escapes handled). */
  stringValue(n: Node): string {
    if (n.name === 'ContinuedString')
      return this.kids(n)
        .map((k) => this.stringValue(k))
        .join('');
    if (n.name !== 'String') this.fail(n, 'Blocks have no f-strings joined to other text here.');
    const raw = this.src(n);
    const m = /^([rRuUbB]*)('''|"""|'|")([\s\S]*)\2$/.exec(raw);
    if (!m) this.fail(n, "Blocks can't read this text.");
    const prefix = m[1]!.toLowerCase();
    if (prefix.includes('b')) this.fail(n, 'Blocks have no bytes (b"...").');
    if (prefix.includes('r')) return m[3]!;
    return m[3]!.replace(
      /\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|N\{[^}]*\}|[0-7]{1,3}|\n|.)/g,
      (_, e: string) => {
        const simple: Record<string, string> = {
          n: '\n',
          t: '\t',
          r: '\r',
          '\\': '\\',
          "'": "'",
          '"': '"',
          '\n': '',
          a: '\x07',
          b: '\b',
          f: '\f',
          v: '\v',
        };
        if (e in simple) return simple[e]!;
        if (/^[xuU]/.test(e)) return String.fromCodePoint(parseInt(e.slice(1), 16));
        if (/^[0-7]+$/.test(e)) return String.fromCodePoint(parseInt(e, 8));
        if (e.startsWith('N')) this.fail(n, "Blocks can't read \\N{...} in text.");
        return `\\${e}`;
      },
    );
  }

  /** f"Hi {name}!" → join "Hi ", name, "!". */
  formatString(n: Node, ctx: Ctx): Value {
    const raw = this.src(n);
    const m = /^([fFrR]+)('''|"""|'|")/.exec(raw);
    if (!m || /r/i.test(m[1]!))
      this.fail(n, 'Blocks can only read simple f-strings like f"Hi {name}".');
    const open = n.from + m[0].length;
    const close = n.to - m[2]!.length;
    const parts: Value[] = [];
    let pos = open;
    const literal = (from: number, to: number) => {
      const s = this.code.slice(from, to).replace(/\{\{/g, '{').replace(/\}\}/g, '}');
      if (!s) return;
      const decoded = s.replace(
        /\\(.)/g,
        (_, c: string) => ({ n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"' })[c] ?? `\\${c}`,
      );
      parts.push(this.text(decoded));
    };
    for (const r of n.getChildren('FormatReplacement')) {
      if (r.getChild('FormatSpec') || r.getChild('FormatConversion') || this.has(r, '='))
        this.fail(
          r,
          "Blocks can't format numbers or text inside an f-string ({x:.2f}, {x!r}). Use plain {x}.",
        );
      literal(pos, r.from);
      const inner = this.kids(r);
      if (inner.length !== 1) this.fail(r, "Blocks can't read this part of the f-string.");
      parts.push(this.expr(inner[0]!, ctx));
      pos = r.to;
    }
    literal(pos, close);
    return this.join(parts, n);
  }

  join(pieces: Value[], at: Node): Value {
    // A join inside a join is the same as one longer join.
    const parts = pieces.flatMap((p) =>
      p.block.type === 'text_join'
        ? Object.values(p.block.inputs ?? {}).map((i) => this.value(i.block))
        : [p],
    );
    if (!parts.length) return this.text('');
    if (parts.length === 1 && parts[0]!.block.type === 'text') return parts[0]!;
    const inputs: Record<string, Value> = {};
    parts.forEach((p, i) => (inputs[`ADD${i}`] = p));
    return this.value(this.block('text_join', at, {}, inputs, { itemCount: parts.length }));
  }

  unary(n: Node, ctx: Ctx): Value {
    const [op, operand] = [n.firstChild!, this.kids(n)[1]!];
    const opText = this.src(op);
    if (opText === 'not') {
      if (this.isCall(operand, 'len') && this.args(operand).length === 1) {
        const arg = this.args(operand)[0]!;
        const v = this.expr(arg, ctx);
        return this.value(
          this.block(this.isList(arg, v) ? 'lists_isEmpty' : 'text_isEmpty', n, {}, { VALUE: v }),
        );
      }
      return this.value(
        this.block('logic_negate', n, {}, { BOOL: this.expr(operand, ctx, true) }, undefined, [
          'BOOL',
        ]),
      );
    }
    if (opText === '-') {
      if (operand.name === 'Number') {
        const v = this.number(operand, this.src(operand));
        return this.num(-(v.block.fields!['NUM'] as number));
      }
      return this.value(
        this.block('math_single', n, { OP: 'NEG' }, { NUM: this.expr(operand, ctx) }),
      );
    }
    this.fail(n, `There's no block for "${opText}" in front of a value.`);
  }

  isList(n: Node, v: Value): boolean {
    return (
      !!v.check?.includes('Array') || (n.name === 'VariableName' && this.listVars.has(this.src(n)))
    );
  }

  binaryExpr(n: Node, ctx: Ctx, truthy: boolean): Value {
    const kids = this.kids(n);
    const left = kids[0]!;
    const right = kids.at(-1)!;
    const op = kids
      .slice(1, -1)
      .map((k) => this.src(k))
      .join(' ');
    if (op === 'and' || op === 'or') {
      const a = this.expr(left, ctx, truthy);
      const b = this.expr(right, ctx, truthy);
      return this.value(
        this.block(
          'logic_operation',
          n,
          { OP: op.toUpperCase() },
          { A: a, B: b },
          undefined,
          truthy ? ['A', 'B'] : [],
        ),
      );
    }
    const COMPARE: Record<string, string> = {
      '==': 'EQ',
      '!=': 'NEQ',
      '<': 'LT',
      '<=': 'LTE',
      '>': 'GT',
      '>=': 'GTE',
    };
    if (COMPARE[op]) {
      if (left.name === 'BinaryExpression' && this.kids(left).some((k) => k.name === 'CompareOp'))
        this.fail(n, 'Blocks compare two things at a time. Write 1 < x < 5 as 1 < x and x < 5.');
      // `(Pin(5, Pin.IN).value() == 1)` is the "pin is on" block.
      const pin = /^Pin\((\d+), Pin\.IN\)\.value\(\)$/.exec(this.src(left));
      if (pin && op === '==' && this.src(right) === '1') {
        if (!this.options.onBoard) this.boardOnly(n);
        return this.value(
          this.block('py_pin_read', n, { PIN: this.pin(n, 'py_pin_read', 'PIN', pin[1]!) }),
        );
      }
      // `ai.label() == 'cat'` is the "AI sees cat" block, if the model knows cat.
      if (op === '==' && this.src(left) === 'ai.label()' && right.name === 'String') {
        const label = this.stringValue(right);
        if (this.checks.hasOption('py_ai_sees', 'LABEL', label))
          return this.value({ type: 'py_ai_sees', fields: { LABEL: label } });
      }
      return this.compare(COMPARE[op], this.expr(left, ctx), this.expr(right, ctx), n);
    }
    if (/^(in|not in|is|is not)$/.test(op))
      this.fail(
        n,
        `There's no block for "${op}". ${op.includes('in') ? 'Use a loop to look through the list.' : 'Use == or != instead.'}`,
      );
    if (/^(&|\||\^|<<|>>)$/.test(op)) this.fail(n, `There's no block for "${op}".`);
    return this.binary(op, this.expr(left, ctx), this.expr(right, ctx), n);
  }

  /** A maths operator between two values that are already blocks. */
  binary(op: string, a: Value, b: Value, at: Node): Value {
    const ARITH: Record<string, string> = {
      '+': 'ADD',
      '-': 'MINUS',
      '*': 'MULTIPLY',
      '/': 'DIVIDE',
      '**': 'POWER',
    };
    const isText = (v: Value) => !!v.check?.includes('String') && !v.check.includes('Number');
    // "Hi " + name → join.
    if (op === '+' && (isText(a) || isText(b))) return this.join([a, b], at);
    if ((isText(a) || isText(b)) && op === '*')
      this.fail(at, "Blocks can't repeat text with *. Keep this line as Python.");
    if (ARITH[op])
      return this.value(this.block('math_arithmetic', at, { OP: ARITH[op] }, { A: a, B: b }));
    if (op === '%')
      return this.value(this.block('math_modulo', at, {}, { DIVIDEND: a, DIVISOR: b }));
    if (op === '//') {
      // a // b is "round down a ÷ b".
      const div = this.value(this.block('math_arithmetic', at, { OP: 'DIVIDE' }, { A: a, B: b }));
      return this.value(this.block('math_round', at, { OP: 'ROUNDDOWN' }, { NUM: div }));
    }
    this.fail(at, `There's no block for "${op}".`);
  }

  /** a[i]: which item, as the list blocks count it (from 1, or from the end). */
  subscript(n: Node, ctx: Ctx): { list: Value; where: { where: string; at?: Value } } {
    const parts = this.kids(n);
    if (this.has(n, ':') || parts.length !== 2)
      this.fail(n, 'There are no blocks for slices like a[1:3].');
    const [obj, index] = parts as [Node, Node];
    const list = this.expr(obj, ctx);
    const known =
      !!list.check?.includes('Array') ||
      (obj.name === 'VariableName' && this.knownLists.has(this.src(obj)));
    const k = this.intLiteral(index);
    if (k === 0) return { list, where: { where: 'FIRST' } };
    if (k === -1) return { list, where: { where: 'LAST' } };
    if (k !== null)
      return k > 0
        ? { list, where: { where: 'FROM_START', at: this.num(k + 1) } }
        : { list, where: { where: 'FROM_END', at: this.num(-k) } };
    // a[i - 1] is item # i; a[i] is item # (i + 1): list blocks count from 1.
    // The blocks themselves write item # i as a[int(i - 1)].
    if (this.isCall(index, 'int') && this.args(index).length === 1) {
      const inner = this.args(index)[0]!;
      const ik = inner.name === 'BinaryExpression' ? this.kids(inner) : [];
      if (ik.length === 3 && this.src(ik[1]!) === '-' && this.intLiteral(ik[2]!) === 1)
        return { list, where: { where: 'FROM_START', at: this.expr(ik[0]!, ctx) } };
    }
    // Otherwise the blocks would write a[int(i + 1 - 1)], which is only the
    // same as a[i] when `a` is a list (not a dictionary with number keys).
    if (!known)
      this.fail(
        n,
        `Blocks can only pick an item by a worked-out position from a list, and "${this.src(obj)}" might not be one.`,
      );
    if (index.name === 'BinaryExpression') {
      const ik = this.kids(index);
      if (ik.length === 3 && this.src(ik[1]!) === '-' && this.intLiteral(ik[2]!) === 1)
        return { list, where: { where: 'FROM_START', at: this.expr(ik[0]!, ctx) } };
    }
    const i = this.expr(index, ctx);
    if (i.check && !i.check.includes('Number'))
      this.fail(index, 'Blocks can only pick list items by number.');
    return { list, where: { where: 'FROM_START', at: this.binary('+', i, this.num(1), index) } };
  }

  pin(at: Node, type: string, field: string, value: string): string {
    if (!this.checks.hasOption(type, field, value))
      this.fail(
        at,
        `Pin ${value} can't be used for this on your board. Pick one of the pins the block offers.`,
      );
    return value;
  }

  // ── Calls ─────────────────────────────────────────────────────────────────

  call(n: Node, ctx: Ctx, statement: boolean): Value | { block: BlockJson; check: null } {
    const callee = n.firstChild!;
    const calleeSrc = this.src(callee);
    if (MACHINE_NAMES.has(calleeSrc) || calleeSrc.startsWith('dht.'))
      this.fail(
        n,
        `There's no block for ${calleeSrc}(...). The pin and sensor blocks write their own helpers (like write_pin(2, True)): build it with blocks, or keep it as Python.`,
      );
    const args = this.args(n);
    const value = (b: BlockJson) => {
      if (statement)
        this.fail(
          n,
          'This line works something out but does nothing with it. Print it or save it in a variable.',
        );
      return this.value(b);
    };
    const stmt = (b: BlockJson) => {
      if (!statement)
        this.fail(
          n,
          `"${this.src(callee)}(...)" doesn't give back a value, so it can only be on its own line.`,
        );
      return { block: b, check: null };
    };
    const count = (k: number) => {
      if (args.length !== k)
        this.fail(
          n,
          `Blocks need exactly ${k} value${k === 1 ? '' : 's'} in ${this.src(callee)}(...).`,
        );
    };
    const e = (i: number) => this.expr(args[i]!, ctx);

    if (callee.name === 'MemberExpression' && !this.has(callee, '[')) {
      const obj = callee.firstChild!;
      const method = this.src(callee.getChild('PropertyName')!);
      const objSrc = this.src(obj);
      if (obj.name === 'VariableName' && BLOCK_MODULES.has(objSrc) && !this.assigned.has(objSrc))
        return this.moduleCall(n, `${objSrc}.${method}`, args, ctx, statement);
      // ''.join([str(x2) for x2 in [a, b]]) is the "join" block.
      if (method === 'join' && /^''$|^""$/.test(objSrc) && args.length === 1) {
        const items = this.joinItems(args[0]!);
        if (items)
          return value(
            this.join(
              items.map((i) => this.expr(i, ctx)),
              n,
            ).block,
          );
      }
      switch (method) {
        case 'append':
          count(1);
          this.listVar(obj);
          return stmt(
            this.block(
              'lists_setIndex',
              n,
              { MODE: 'INSERT', WHERE: 'LAST' },
              { LIST: this.expr(obj, ctx), TO: e(0) },
            ),
          );
        case 'insert': {
          count(2);
          this.listVar(obj);
          const k = this.intLiteral(args[0]!);
          const where =
            k === null
              ? null
              : k === 0
                ? { where: 'FIRST' }
                : k > 0
                  ? { where: 'FROM_START', at: this.num(k + 1) }
                  : { where: 'FROM_END', at: this.num(-k) };
          if (!where)
            this.fail(
              n,
              'Blocks can only insert at a position written as a number, like a.insert(0, x).',
            );
          return stmt(
            this.block(
              'lists_setIndex',
              n,
              { MODE: 'INSERT', WHERE: where.where },
              { LIST: this.expr(obj, ctx), ...(where.at ? { AT: where.at } : {}), TO: e(1) },
            ),
          );
        }
        case 'pop': {
          if (args.length > 1) count(1);
          this.listVar(obj);
          const k = args.length ? this.intLiteral(args[0]!) : -1;
          const where =
            k === -1
              ? { where: 'LAST' }
              : k === 0
                ? { where: 'FIRST' }
                : k !== null
                  ? k > 0
                    ? { where: 'FROM_START', at: this.num(k + 1) }
                    : { where: 'FROM_END', at: this.num(-k) }
                  : { where: 'FROM_START', at: this.binary('+', e(0), this.num(1), args[0]!) };
          const inputs = { VALUE: this.expr(obj, ctx), ...(where.at ? { AT: where.at } : {}) };
          if (statement)
            return stmt(
              this.block('lists_getIndex', n, { MODE: 'REMOVE', WHERE: where.where }, inputs, {
                isStatement: true,
              }),
            );
          return value(
            this.block('lists_getIndex', n, { MODE: 'GET_REMOVE', WHERE: where.where }, inputs),
          );
        }
        case 'capitalize':
          count(0);
          return value(this.block('py_capitalize', n, {}, { TEXT: this.expr(obj, ctx) }));
        case 'upper':
        case 'lower': {
          count(0);
          let target = obj;
          if (this.isCall(obj, 'str') && this.args(obj).length === 1) target = this.args(obj)[0]!;
          return value(
            this.block(
              'text_changeCase',
              n,
              { CASE: method === 'upper' ? 'UPPERCASE' : 'LOWERCASE' },
              { TEXT: this.expr(target, ctx) },
            ),
          );
        }
      }
      this.fail(n, `There's no block for .${method}().`);
    }
    if (callee.name !== 'VariableName') this.fail(n, `There's no block for "${this.src(n)}".`);
    const name = this.src(callee);
    if (this.rawFns.has(name)) this.quiet(n, `"${name}" stays as Python, so calls to it do too.`);

    // The student's own functions come first (they may reuse a helper's name).
    const fn = this.fns.get(name);
    if (fn) {
      if (args.length !== fn.params.length)
        this.fail(
          n,
          `"${name}" needs ${fn.params.length} value${fn.params.length === 1 ? '' : 's'}, but it gets ${args.length} here.`,
        );
      const inputs: Record<string, Value> = {};
      args.forEach((_, i) => (inputs[`ARG${i}`] = e(i)));
      const extra = { name, params: fn.params };
      if (statement) {
        if (fn.returnsValue)
          this.fail(
            n,
            `"${name}" gives back a value, but here it's on a line of its own. Blocks need that value used — print it or save it.`,
          );
        return stmt(this.block('procedures_callnoreturn', n, {}, inputs, extra));
      }
      if (!fn.returnsValue)
        this.fail(
          n,
          `"${name}" doesn't give back a value (it has no "return something"), so it can't be used here.`,
        );
      return value(this.block('procedures_callreturn', n, {}, inputs, extra));
    }
    const imported = this.fromImports.get(name);
    if (imported) return this.moduleCall(n, imported, args, ctx, statement);
    if (this.assigned.has(name))
      this.fail(n, `"${name}" is a variable in this program, so there's no block for calling it.`);

    switch (name) {
      case 'print': {
        if (!statement) this.fail(n, "print(...) doesn't give back a value.");
        const parts: Value[] = [];
        args.forEach((a, i) => {
          if (i) parts.push(this.text(' '));
          parts.push(this.expr(a, ctx));
        });
        // print(a, b) prints a and b with a space between: the same as joining them.
        const shown = parts.length === 1 ? parts[0]! : this.join(parts, n);
        return stmt(this.block('text_print', n, {}, { TEXT: shown }));
      }
      case 'input': {
        if (args.length > 1) count(1);
        let q = args[0];
        if (q && this.isCall(q, 'str') && this.args(q).length === 1) q = this.args(q)[0]!;
        return value(
          this.block('py_ask_text', n, {}, { QUESTION: q ? this.expr(q, ctx) : this.text('') }),
        );
      }
      case 'int': {
        count(1);
        const inner = args[0]!;
        if (
          this.isCall(inner, 'input') ||
          (this.isCall(inner, 'ask_number') && !this.fns.has('ask_number'))
        ) {
          const q = this.args(inner);
          if (q.length > 1) this.fail(n, 'Blocks need exactly 1 value in input(...).');
          let question = q[0];
          if (question && this.isCall(question, 'str') && this.args(question).length === 1)
            question = this.args(question)[0]!;
          return value(
            this.block(
              'py_ask_number',
              n,
              {},
              { QUESTION: question ? this.expr(question, ctx) : this.text('') },
            ),
          );
        }
        return this.fail(
          n,
          'There\'s no block for int(...). To ask for a number, use int(input("...")).',
        );
      }
      case 'ask_number':
        count(1);
        return value(this.block('py_ask_number', n, {}, { QUESTION: e(0) }));
      case 'type':
        count(1);
        return value(this.block('py_type', n, {}, { VALUE: e(0) }));
      case 'tuple':
      case 'set': {
        if (args.length > 1) count(1);
        // set([3, 1]) and {3, 1} can print their items in a different order.
        if (name === 'set' && args[0] && /^(Array|Tuple)Expression$/.test(args[0].name))
          this.fail(
            n,
            'The set block writes {…}, which can show the items in another order than set([…]).',
          );
        const items = args.length ? e(0) : this.listOf([], n, ctx);
        return value(this.block(name === 'tuple' ? 'py_tuple' : 'py_set', n, {}, { ITEMS: items }));
      }
      case 'dict':
        if (args.length)
          this.fail(n, 'Blocks can only make an empty dict() — or write {"key": value}.');
        return value(this.block('py_dict', n, {}, {}, { itemCount: 0 }));
      case 'str':
        if (!args.length) return value(this.text('').block);
        count(1);
        return value(this.block('text_join', n, {}, { ADD0: e(0) }, { itemCount: 1 }));
      case 'len': {
        count(1);
        const v = e(0);
        return value(
          this.block(
            this.isList(args[0]!, v) ? 'lists_length' : 'text_length',
            n,
            {},
            { VALUE: v },
          ),
        );
      }
      case 'round':
        if (args.length !== 1) this.fail(n, 'Blocks can only round to a whole number: round(x).');
        return value(this.block('math_round', n, { OP: 'ROUND' }, { NUM: e(0) }));
      case 'abs':
        count(1);
        return value(this.block('math_single', n, { OP: 'ABS' }, { NUM: e(0) }));
      case 'min': {
        // min(max(x, low), high) is "constrain x between low and high".
        const inner = args[0];
        if (
          args.length === 2 &&
          inner &&
          this.isCall(inner, 'max') &&
          this.args(inner).length === 2
        ) {
          const [x, low] = this.args(inner) as [Node, Node];
          return value(
            this.block(
              'math_constrain',
              n,
              {},
              { VALUE: this.expr(x, ctx), LOW: this.expr(low, ctx), HIGH: e(1) },
            ),
          );
        }
        return this.fail(n, "There's no block for min(...).");
      }
      case 'range': {
        if (!args.length || args.length > 3) count(1);
        const [start, stop, step] =
          args.length === 1
            ? [this.num(0), e(0), this.num(1)]
            : [e(0), e(1), args.length === 3 ? e(2) : this.num(1)];
        return value(this.block('py_range', n, {}, { START: start, STOP: stop, STEP: step }));
      }
    }
    if (!this.fns.has(name)) {
      const helper = this.helperCall(n, name, args, ctx, statement);
      if (helper) return helper;
    }
    this.fail(n, `There's no block for ${name}(...).`);
  }

  /** The items of `[str(x2) for x2 in [a, b, c]]`, as the join block writes it. */
  joinItems(n: Node): Node[] | null {
    if (n.name !== 'ArrayComprehensionExpression') return null;
    const m = /^\[str\((\w+)\) for (\w+) in \[/.exec(this.src(n));
    if (!m || m[1] !== m[2]) return null;
    const list = this.kids(n).find((k) => k.name === 'ArrayExpression');
    return list ? this.kids(list) : null;
  }

  listVar(obj: Node) {
    if (obj.name === 'VariableName') this.listVars.add(this.src(obj));
  }

  /** time.sleep(1), math.sqrt(x), random.randint(1, 6), ai.label() … */
  moduleCall(
    n: Node,
    full: string,
    args: Node[],
    ctx: Ctx,
    statement: boolean,
  ): Value | { block: BlockJson; check: null } {
    const e = (i: number) => this.expr(args[i]!, ctx);
    const need = (k: number) => {
      if (args.length !== k)
        this.fail(n, `Blocks need exactly ${k} value${k === 1 ? '' : 's'} in ${full}(...).`);
    };
    const value = (b: BlockJson) => {
      if (statement)
        this.fail(
          n,
          'This line works something out but does nothing with it. Print it or save it in a variable.',
        );
      return this.value(b);
    };
    const stmt = (b: BlockJson) => {
      if (!statement)
        this.fail(n, `${full}(...) doesn't give back a value, so it can only be on its own line.`);
      return { block: b, check: null };
    };
    const SINGLE: Record<string, string> = {
      'math.sqrt': 'ROOT',
      'math.fabs': 'ABS',
      'math.log': 'LN',
      'math.log10': 'LOG10',
      'math.exp': 'EXP',
    };
    if (SINGLE[full]) {
      need(1);
      return value(this.block('math_single', n, { OP: SINGLE[full] }, { NUM: e(0) }));
    }
    switch (full) {
      case 'time.sleep':
        need(1);
        return stmt(this.block('py_wait', n, {}, { SECONDS: e(0) }));
      case 'math.ceil':
      case 'math.floor':
        need(1);
        return value(
          this.block(
            'math_round',
            n,
            { OP: full === 'math.ceil' ? 'ROUNDUP' : 'ROUNDDOWN' },
            { NUM: e(0) },
          ),
        );
      case 'math.factorial':
        need(1);
        return value(this.block('py_factorial', n, {}, { NUM: e(0) }));
      case 'math.pow':
        need(2);
        if (this.intLiteral(args[0]!) === 10)
          return value(this.block('math_single', n, { OP: 'POW10' }, { NUM: e(1) }));
        break;
      case 'random.randint':
        need(2);
        return value(this.block('math_random_int', n, {}, { FROM: e(0), TO: e(1) }));
      case 'random.choice':
        need(1);
        return value(
          this.block('lists_getIndex', n, { MODE: 'GET', WHERE: 'RANDOM' }, { VALUE: e(0) }),
        );
      case 'ai.start_camera':
      case 'ai.stop_camera':
        need(0);
        return stmt({
          type: 'py_ai_camera',
          fields: { STATE: full === 'ai.start_camera' ? 'on' : 'off' },
        });
      case 'ai.label':
        need(0);
        return value({ type: 'py_ai_label' });
      case 'ai.confidence': {
        need(1);
        if (args[0]!.name !== 'String')
          this.fail(
            n,
            'The AI block needs the class name written in quotes, like ai.confidence("cat").',
          );
        const label = this.stringValue(args[0]!);
        if (!this.checks.hasOption('py_ai_confidence', 'LABEL', label))
          this.fail(
            n,
            `Your AI model has no class called ${this.src(args[0]!)}. Train it in AI Studio, or check the spelling.`,
          );
        return value({ type: 'py_ai_confidence', fields: { LABEL: label } });
      }
    }
    this.fail(n, `There's no block for ${full}(...).`);
  }

  /** Calls to the helper functions the blocks write (ask_number, write_pin …). */
  helperCall(
    n: Node,
    name: string,
    args: Node[],
    ctx: Ctx,
    statement: boolean,
  ): Value | { block: BlockJson; check: null } | null {
    const e = (i: number) => this.expr(args[i]!, ctx);
    const need = (k: number) => {
      if (args.length !== k) this.fail(n, `Blocks need exactly ${k} values in ${name}(...).`);
    };
    const value = (b: BlockJson) => {
      if (statement)
        this.fail(
          n,
          'This line works something out but does nothing with it. Print it or save it in a variable.',
        );
      return this.value(b);
    };
    const stmt = (b: BlockJson) => {
      if (!statement)
        this.fail(n, `${name}(...) doesn't give back a value, so it can only be on its own line.`);
      return { block: b, check: null };
    };
    const lit = (i: number) => {
      const k = this.intLiteral(args[i]!);
      if (k === null) this.fail(args[i]!, 'Blocks need the pin as a number written out, like 4.');
      return String(k);
    };
    if (BOARD_HELPERS.has(name) && !this.options.onBoard) this.boardOnly(n);
    switch (name) {
      case 'capitalize':
        if (!this.helpers.has(name)) return null;
        need(1);
        return value(this.block('py_capitalize', n, {}, { TEXT: e(0) }));
      case 'title_case':
        need(1);
        return value(this.block('text_changeCase', n, { CASE: 'TITLECASE' }, { TEXT: e(0) }));
      case 'first_index':
      case 'last_index':
        need(2);
        return value(
          this.block(
            'lists_indexOf',
            n,
            { END: name === 'first_index' ? 'FIRST' : 'LAST' },
            { VALUE: e(0), FIND: e(1) },
          ),
        );
      case 'lists_sort': {
        need(3);
        const type = args[1]!.name === 'String' ? this.stringValue(args[1]!) : '';
        const reverse = this.src(args[2]!);
        if (
          !['NUMERIC', 'TEXT', 'IGNORE_CASE'].includes(type) ||
          !['True', 'False'].includes(reverse)
        )
          return null;
        return value(
          this.block(
            'lists_sort',
            n,
            { TYPE: type, DIRECTION: reverse === 'True' ? '-1' : '1' },
            { LIST: e(0) },
          ),
        );
      }
      case 'lists_remove_random_item':
        need(1);
        return value(
          this.block('lists_getIndex', n, { MODE: 'GET_REMOVE', WHERE: 'RANDOM' }, { VALUE: e(0) }),
        );
      case 'write_pin': {
        need(2);
        const pin = lit(0);
        const on = this.src(args[1]!);
        if (on !== 'True' && on !== 'False')
          this.fail(args[1]!, 'Blocks need True or False written out here.');
        const v = on === 'True' ? '1' : '0';
        if (pin === this.t.ledPin) return stmt({ type: 'py_led_builtin', fields: { VALUE: v } });
        return stmt({
          type: 'py_pin_write',
          fields: { PIN: this.pin(n, 'py_pin_write', 'PIN', pin), VALUE: v },
        });
      }
      case 'button_pressed':
        need(1);
        return value({
          type: 'py_button_pressed',
          fields: { PIN: this.pin(n, 'py_button_pressed', 'PIN', lit(0)) },
        });
      case 'read_analog':
        need(1);
        return value({
          type: 'py_analog_read',
          fields: { PIN: this.pin(n, 'py_analog_read', 'PIN', lit(0)) },
        });
      case 'set_brightness':
        need(2);
        return stmt(
          this.block(
            'py_pwm_write',
            n,
            { PIN: this.pin(n, 'py_pwm_write', 'PIN', lit(0)) },
            { PERCENT: e(1) },
          ),
        );
      case 'set_servo':
        need(2);
        return stmt(
          this.block(
            'py_servo',
            n,
            { PIN: this.pin(n, 'py_servo', 'PIN', lit(0)) },
            { ANGLE: e(1) },
          ),
        );
      case 'play_tone':
        need(3);
        return stmt(
          this.block(
            'py_tone',
            n,
            { PIN: this.pin(n, 'py_tone', 'PIN', lit(0)) },
            { FREQ: e(1), SECONDS: e(2) },
          ),
        );
      case 'read_distance_cm':
        need(2);
        return value({
          type: 'py_distance',
          fields: {
            TRIG: this.pin(n, 'py_distance', 'TRIG', lit(0)),
            ECHO: this.pin(n, 'py_distance', 'ECHO', lit(1)),
          },
        });
      case 'read_dht': {
        need(3);
        const kind = this.src(args[1]!);
        const what = args[2]!.name === 'String' ? this.stringValue(args[2]!) : '';
        if (!['11', '22'].includes(kind) || !['temp', 'humidity'].includes(what)) return null;
        return value({
          type: 'py_dht',
          fields: { WHAT: what, KIND: kind, PIN: this.pin(n, 'py_dht', 'PIN', lit(0)) },
        });
      }
    }
    return null;
  }
}

/**
 * The blocks write some names differently (a variable called `sum` becomes
 * `sum2`). Python code blocks must then say the new name too — everywhere,
 * calls included: a program that saves something in `input` means that.
 */
function matchBlocklyNames(ws: Blockly.Workspace) {
  const vars = new Map<string, string>();
  const procs = new Map<string, string>();
  pythonGenerator.init(ws);
  try {
    for (const v of ws.getAllVariables()) {
      const name = pythonGenerator.getVariableName(v.getId());
      if (name !== v.name) vars.set(v.name, name);
    }
    for (const b of ws.getAllBlocks(false))
      if (b.type.startsWith('procedures_def')) {
        const own = b.getFieldValue('NAME') as string;
        const name = pythonGenerator.getProcedureName(own);
        if (name !== own) procs.set(own, name);
      }
  } finally {
    pythonGenerator.finish('');
  }
  if (!vars.size && !procs.size) return;
  for (const b of ws.getAllBlocks(false)) {
    if (!/^py_code(_value|_wrap)?$/.test(b.type)) continue;
    const text = codeLines(b).join('\n');
    // A header (`for x in y`) is only Python with a body after it.
    const parsed = b.type === 'py_code_wrap' ? `${text}:\n pass` : text;
    const tree = pythonLanguage.parser.parse(parsed);
    const edits: { from: number; to: number; text: string }[] = [];
    tree.iterate({
      enter: (c) => {
        if (c.name !== 'VariableName' || c.to > text.length) return;
        const node = c.node;
        if (node.parent?.name === 'ArgList' && node.nextSibling?.name === 'AssignOp') return;
        const own = text.slice(c.from, c.to);
        const renamed = procs.get(own) ?? vars.get(own);
        if (renamed) edits.push({ from: c.from, to: c.to, text: renamed });
      },
    });
    if (!edits.length) continue;
    let out = text;
    for (const e of edits.sort((a, b) => b.from - a.from))
      out = out.slice(0, e.from) + e.text + out.slice(e.to);
    out.split('\n').forEach((line, i) => b.setFieldValue(line, `LINE${i}`));
  }
}

/**
 * Turn Python into blocks. Parts with no block become "Python code" blocks.
 * Throws ConvertError (with the line) only when the program can't be read at
 * all; nothing is changed then.
 */
export function pythonToBlocks(code: string, options: ConvertOptions): ConvertResult {
  const tree = pythonLanguage.parser.parse(code);
  const checks = new Checks();
  const ws = new Blockly.Workspace();
  try {
    const templates = blockTemplates();
    const rawFns: RawFns = new Map();
    let converter: Converter;
    let state: object;
    // A function that can't become blocks is kept as Python; calls to it must
    // then be Python too, so convert again (each round keeps more functions).
    for (;;) {
      converter = new Converter(code, tree, templates, checks, options, rawFns);
      state = converter.run();
      if (!converter.retry) break;
    }
    try {
      Blockly.serialization.workspaces.load(state, ws);
    } catch (err) {
      console.error('[python-to-blocks] could not load', err, state);
      throw new ConvertError("Something in this program couldn't be made into blocks.", 1, true);
    }
    matchBlocklyNames(ws);
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws));
    return { xml, code: workspaceToPython(ws), notes: converter.notes };
  } finally {
    ws.dispose();
    checks.dispose();
  }
}
