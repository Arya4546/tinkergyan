/**
 * python-blocks.ts — blocks and code generation for Python projects.
 *
 * Python projects run on MicroPython (in the browser now, on ESP32 boards
 * later), not full CPython. Blockly's stock Python generator targets CPython,
 * so the few stock blocks whose output MicroPython cannot run are overridden
 * here. Every block in the Python toolbox is executed under MicroPython by the
 * test suite, so a new block that generates unsupported code is caught.
 */
import * as Blockly from 'blockly/core';
import { pythonGenerator, Order } from 'blockly/python';

export const PY_IO_COLOUR = '#0EA5E9';
export const PY_TIME_COLOUR = '#F59E0B';

Blockly.defineBlocksWithJsonArray([
  {
    type: 'py_ask_text',
    message0: 'ask %1 and wait for an answer',
    args0: [{ type: 'input_value', name: 'QUESTION', check: ['String', 'Number'] }],
    output: 'String',
    colour: PY_IO_COLOUR,
    tooltip:
      'Shows the question and waits for the user to type an answer. Gives back what they typed.',
  },
  {
    type: 'py_ask_number',
    message0: 'ask %1 and wait for a number',
    args0: [{ type: 'input_value', name: 'QUESTION', check: ['String', 'Number'] }],
    output: 'Number',
    colour: PY_IO_COLOUR,
    tooltip:
      'Shows the question and waits for a number. Asks again if something that is not a number is typed.',
  },
  {
    type: 'py_wait',
    message0: 'wait %1 seconds',
    args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: PY_TIME_COLOUR,
    tooltip: 'Pauses the program for this many seconds (you can use decimals like 0.5).',
  },
  {
    type: 'py_range',
    message0: 'range from %1 to %2 step %3',
    args0: [
      { type: 'input_value', name: 'START', check: 'Number' },
      { type: 'input_value', name: 'STOP', check: 'Number' },
      { type: 'input_value', name: 'STEP', check: 'Number' },
    ],
    inputsInline: true,
    output: 'Array',
    colour: '#5CA65C', // the Loops category's colour
    tooltip:
      'The whole numbers from the first number up to the second, NOT including the second: from 0 to 3 gives 0, 1, 2. Use it in "for each item in list".',
  },
]);

pythonGenerator.forBlock['py_ask_text'] = (block, generator) => {
  const question = generator.valueToCode(block, 'QUESTION', Order.NONE) || "''";
  return [`input(str(${question}))`, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['py_ask_number'] = (block, generator) => {
  const question = generator.valueToCode(block, 'QUESTION', Order.NONE) || "''";
  const fn = generator.provideFunction_(
    'ask_number',
    // Written with 2-space steps: provideFunction_ turns each into INDENT.
    `def ${generator.FUNCTION_NAME_PLACEHOLDER_}(question):
  while True:
    answer = input(str(question)).strip()
    try:
      return int(answer)
    except ValueError:
      try:
        return float(answer)
      except ValueError:
        print('Please type a number.')
`,
  );
  return [`${fn}(${question})`, Order.FUNCTION_CALL];
};

// Python's own range(): `for i in range(n)` stays exactly that, so a loop over
// range(len(things)) runs zero times for an empty list. (The "count with"
// block counts DOWN from 0 to -1 there, because its end is included.)
pythonGenerator.forBlock['py_range'] = (block, generator) => {
  const start = generator.valueToCode(block, 'START', Order.NONE) || '0';
  const stop = generator.valueToCode(block, 'STOP', Order.NONE) || '0';
  const step = generator.valueToCode(block, 'STEP', Order.NONE) || '1';
  const args = step !== '1' ? [start, stop, step] : start !== '0' ? [start, stop] : [stop];
  return [`range(${args.join(', ')})`, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['py_wait'] = (block, generator) => {
  // Imports go in definitions_ (protected in the typings, but it is exactly how
  // Blockly's own Python generators add `import math` / `import random`).
  (generator as unknown as { definitions_: Record<string, string> }).definitions_['import_time'] =
    'import time';
  const seconds = generator.valueToCode(block, 'SECONDS', Order.NONE) || '1';
  return `time.sleep(${seconds})\n`;
};

// ── MicroPython overrides of stock generators ──────────────────────────────

// Stock: `x = (x if isinstance(x, Number) else 0) + 1` with
// `from numbers import Number` — MicroPython has no `numbers` module.
pythonGenerator.forBlock['math_change'] = (block, generator) => {
  const name = generator.getVariableName(block.getFieldValue('VAR') as string);
  const delta = generator.valueToCode(block, 'DELTA', Order.ADDITIVE) || '0';
  return `${name} = (${name} if isinstance(${name}, (int, float)) else 0) + ${delta}\n`;
};

// Stock "absolute" is math.fabs(x), which turns whole numbers into decimals
// (|-3| prints 3.0). abs() keeps 3 as 3, and is what students write.
const stockMathSingle = pythonGenerator.forBlock['math_single']!;
pythonGenerator.forBlock['math_single'] = (block, generator) => {
  if (block.getFieldValue('OP') !== 'ABS') return stockMathSingle.call(generator, block, generator);
  const value = generator.valueToCode(block, 'NUM', Order.NONE) || '0';
  return [`abs(${value})`, Order.FUNCTION_CALL];
};

// Stock title case uses str.title(), which MicroPython's str does not have.
pythonGenerator.forBlock['text_changeCase'] = (block, generator) => {
  const text = generator.valueToCode(block, 'TEXT', Order.MEMBER) || "''";
  const mode = block.getFieldValue('CASE') as string;
  if (mode === 'UPPERCASE') return [`str(${text}).upper()`, Order.FUNCTION_CALL];
  if (mode === 'LOWERCASE') return [`str(${text}).lower()`, Order.FUNCTION_CALL];
  const fn = generator.provideFunction_(
    'title_case',
    `def ${generator.FUNCTION_NAME_PLACEHOLDER_}(text):
  return ' '.join(word[:1].upper() + word[1:].lower() for word in str(text).split(' '))
`,
  );
  return [`${fn}(${text})`, Order.FUNCTION_CALL];
};

// Stock quoting writes a line break inside text as backslash + line break,
// which Python reads as "the line continues": the line break vanished.
pythonGenerator.quote_ = (text: string) => {
  let s = text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  let quote = "'";
  if (s.includes("'")) {
    if (!s.includes('"')) quote = '"';
    else s = s.replace(/'/g, "\\'");
  }
  return quote + s + quote;
};

// ── Data: type(), tuples, sets and dictionaries ───────────────────────────

export const PY_DATA_COLOUR = '#0D9488';
export const PY_CODE_COLOUR = '#64748B';

Blockly.defineBlocksWithJsonArray([
  {
    type: 'py_type',
    message0: 'type of %1',
    args0: [{ type: 'input_value', name: 'VALUE' }],
    output: null,
    colour: PY_DATA_COLOUR,
    tooltip: "What kind of value this is, like <class 'int'> for a whole number.",
  },
  {
    type: 'py_tuple',
    message0: 'tuple of %1',
    args0: [{ type: 'input_value', name: 'ITEMS', check: 'Array' }],
    output: null,
    colour: PY_DATA_COLOUR,
    tooltip: 'A tuple: a list that can never be changed. Plug in a "create list with" block.',
  },
  {
    type: 'py_set',
    message0: 'set of %1',
    args0: [{ type: 'input_value', name: 'ITEMS', check: 'Array' }],
    output: null,
    colour: PY_DATA_COLOUR,
    tooltip: 'A set: a group of values where each value is kept only once.',
  },
  {
    type: 'py_dict_get',
    message0: 'in dictionary %1 get %2',
    args0: [
      { type: 'input_value', name: 'DICT' },
      { type: 'input_value', name: 'KEY' },
    ],
    inputsInline: true,
    output: null,
    colour: PY_DATA_COLOUR,
    tooltip: 'The value stored under this key in the dictionary.',
  },
  {
    type: 'py_dict_set',
    message0: 'in dictionary %1 set %2 to %3',
    args0: [
      { type: 'input_value', name: 'DICT' },
      { type: 'input_value', name: 'KEY' },
      { type: 'input_value', name: 'VALUE' },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: PY_DATA_COLOUR,
    tooltip: 'Stores the value under this key (it replaces what was there).',
  },
  {
    type: 'py_capitalize',
    message0: 'capitalize %1',
    args0: [{ type: 'input_value', name: 'TEXT', check: ['String', 'Number'] }],
    output: 'String',
    colour: '#5BA58C', // the Text category's colour
    tooltip: 'The text with a capital first letter and the rest small: "hELLO" becomes "Hello".',
  },
  {
    type: 'py_factorial',
    message0: 'factorial of %1',
    args0: [{ type: 'input_value', name: 'NUM', check: 'Number' }],
    output: 'Number',
    colour: '#5C68A6', // the Math category's colour
    tooltip:
      'Multiplies all the whole numbers from 1 up to this one: factorial of 4 is 1×2×3×4 = 24.',
  },
  // The gear's mini-blocks for "dictionary".
  {
    type: 'py_dict_container',
    message0: 'dictionary %1 %2',
    args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'STACK' }],
    colour: PY_DATA_COLOUR,
    tooltip: 'Add, remove or reorder the pairs.',
  },
  {
    type: 'py_dict_item',
    message0: 'key : value',
    previousStatement: null,
    nextStatement: null,
    colour: PY_DATA_COLOUR,
    tooltip: 'One key and its value.',
  },
]);

interface DictBlock extends Blockly.BlockSvg {
  itemCount_: number;
  updateShape_(): void;
}

// "dictionary" holds key/value pairs; the gear adds and removes them (like
// "create list with").
Blockly.Blocks['py_dict'] = {
  init(this: DictBlock) {
    this.setColour(PY_DATA_COLOUR);
    this.setOutput(true, null);
    this.setTooltip('A dictionary: values stored under keys, like "name" → "Asha".');
    this.setMutator(new Blockly.icons.MutatorIcon(['py_dict_item'], this));
    this.itemCount_ = 2;
    this.updateShape_();
  },
  saveExtraState(this: DictBlock) {
    return { itemCount: this.itemCount_ };
  },
  loadExtraState(this: DictBlock, state: { itemCount: number }) {
    this.itemCount_ = state.itemCount;
    this.updateShape_();
  },
  mutationToDom(this: DictBlock) {
    const m = Blockly.utils.xml.createElement('mutation');
    m.setAttribute('items', String(this.itemCount_));
    return m;
  },
  domToMutation(this: DictBlock, xml: Element) {
    this.itemCount_ = parseInt(xml.getAttribute('items') ?? '0', 10);
    this.updateShape_();
  },
  decompose(this: DictBlock, workspace: Blockly.WorkspaceSvg) {
    const container = workspace.newBlock('py_dict_container');
    container.initSvg();
    let connection = container.getInput('STACK')!.connection!;
    for (let i = 0; i < this.itemCount_; i++) {
      const item = workspace.newBlock('py_dict_item');
      item.initSvg();
      connection.connect(item.previousConnection);
      connection = item.nextConnection;
    }
    return container;
  },
  compose(this: DictBlock, container: Blockly.Block) {
    type Item = Blockly.Block & {
      keyConnection_?: Blockly.Connection | null;
      valueConnection_?: Blockly.Connection | null;
    };
    const items: Item[] = [];
    for (
      let b = container.getInputTargetBlock('STACK') as Item | null;
      b;
      b = b.getNextBlock() as Item | null
    )
      if (!b.isInsertionMarker()) items.push(b);
    // Unplug what no longer has a pair, then rebuild and plug each pair back.
    for (let i = 0; i < this.itemCount_; i++)
      for (const name of [`KEY${i}`, `VALUE${i}`]) {
        const target = this.getInput(name)?.connection?.targetConnection;
        if (
          target &&
          !items.some((it) => it.keyConnection_ === target || it.valueConnection_ === target)
        )
          target.disconnect();
      }
    this.itemCount_ = items.length;
    this.updateShape_();
    items.forEach((it, i) => {
      it.keyConnection_?.reconnect(this, `KEY${i}`);
      it.valueConnection_?.reconnect(this, `VALUE${i}`);
    });
  },
  saveConnections(this: DictBlock, container: Blockly.Block) {
    type Item = Blockly.Block & {
      keyConnection_?: Blockly.Connection | null;
      valueConnection_?: Blockly.Connection | null;
    };
    let i = 0;
    for (
      let b = container.getInputTargetBlock('STACK') as Item | null;
      b;
      b = b.getNextBlock() as Item | null, i++
    ) {
      b.keyConnection_ = this.getInput(`KEY${i}`)?.connection?.targetConnection ?? null;
      b.valueConnection_ = this.getInput(`VALUE${i}`)?.connection?.targetConnection ?? null;
    }
  },
  updateShape_(this: DictBlock) {
    if (this.itemCount_ && this.getInput('EMPTY')) this.removeInput('EMPTY');
    else if (!this.itemCount_ && !this.getInput('EMPTY'))
      this.appendDummyInput('EMPTY').appendField('empty dictionary');
    for (let i = 0; i < this.itemCount_; i++)
      if (!this.getInput(`KEY${i}`)) {
        this.appendValueInput(`KEY${i}`)
          .setAlign(Blockly.inputs.Align.RIGHT)
          .appendField(i ? 'key' : 'dictionary   key');
        this.appendValueInput(`VALUE${i}`)
          .setAlign(Blockly.inputs.Align.RIGHT)
          .appendField('value');
      }
    for (let i = this.itemCount_; this.getInput(`KEY${i}`); i++) {
      this.removeInput(`KEY${i}`);
      this.removeInput(`VALUE${i}`);
    }
  },
};

/** The items of a "create list with" plugged into `name`, or null for any other block. */
function listItems(block: Blockly.Block, name: string, generator: typeof pythonGenerator) {
  const child = block.getInputTargetBlock(name);
  if (!child || child.type === 'lists_create_empty') return [];
  if (child.type !== 'lists_create_with') return null;
  const items: string[] = [];
  for (let i = 0; child.getInput(`ADD${i}`); i++)
    items.push(generator.valueToCode(child, `ADD${i}`, Order.NONE) || 'None');
  return items;
}

pythonGenerator.forBlock['py_type'] = (block, generator) => [
  `type(${generator.valueToCode(block, 'VALUE', Order.NONE) || 'None'})`,
  Order.FUNCTION_CALL,
];

// Written the way students write them: (1, 2), {1, 2}, {"a": 1}.
pythonGenerator.forBlock['py_tuple'] = (block, generator) => {
  const items = listItems(block, 'ITEMS', generator);
  if (!items)
    return [`tuple(${generator.valueToCode(block, 'ITEMS', Order.NONE)})`, Order.FUNCTION_CALL];
  return [items.length === 1 ? `(${items[0]},)` : `(${items.join(', ')})`, Order.ATOMIC];
};

pythonGenerator.forBlock['py_set'] = (block, generator) => {
  const items = listItems(block, 'ITEMS', generator);
  if (!items)
    return [`set(${generator.valueToCode(block, 'ITEMS', Order.NONE)})`, Order.FUNCTION_CALL];
  return items.length ? [`{${items.join(', ')}}`, Order.ATOMIC] : ['set()', Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['py_dict'] = (block, generator) => {
  const pairs: string[] = [];
  for (let i = 0; block.getInput(`KEY${i}`); i++) {
    const key = generator.valueToCode(block, `KEY${i}`, Order.NONE) || 'None';
    const value = generator.valueToCode(block, `VALUE${i}`, Order.NONE) || 'None';
    pairs.push(`${key}: ${value}`);
  }
  return [`{${pairs.join(', ')}}`, Order.ATOMIC];
};

pythonGenerator.forBlock['py_dict_get'] = (block, generator) => {
  const dict = generator.valueToCode(block, 'DICT', Order.MEMBER) || '{}';
  const key = generator.valueToCode(block, 'KEY', Order.NONE) || 'None';
  return [`${dict}[${key}]`, Order.MEMBER];
};

pythonGenerator.forBlock['py_dict_set'] = (block, generator) => {
  const dict = generator.valueToCode(block, 'DICT', Order.MEMBER) || '{}';
  const key = generator.valueToCode(block, 'KEY', Order.NONE) || 'None';
  const value = generator.valueToCode(block, 'VALUE', Order.NONE) || 'None';
  return `${dict}[${key}] = ${value}\n`;
};

// MicroPython's str has no .capitalize().
pythonGenerator.forBlock['py_capitalize'] = (block, generator) => {
  const text = generator.valueToCode(block, 'TEXT', Order.NONE) || "''";
  const fn = generator.provideFunction_(
    'capitalize',
    `def ${generator.FUNCTION_NAME_PLACEHOLDER_}(text):
  text = str(text)
  return text[:1].upper() + text[1:].lower()
`,
  );
  return [`${fn}(${text})`, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['py_factorial'] = (block, generator) => {
  (generator as unknown as { definitions_: Record<string, string> }).definitions_['import_math'] =
    'import math';
  const n = generator.valueToCode(block, 'NUM', Order.NONE) || '0';
  return [`math.factorial(${n})`, Order.FUNCTION_CALL];
};

// ── "Python code": any Python, kept exactly as written ──────────────────────
//
// Convert to blocks uses these for Python that has no block of its own, so
// every program that runs can become blocks. One text field per line (Blockly
// has no multi-line field): py_code is whole statements, py_code_value is a
// value, and py_code_wrap is a header like `for k, v in d.items()` with real
// blocks inside.

interface CodeBlock extends Blockly.Block {
  lineCount_: number;
  setLines_(count: number): void;
}

function defineCodeBlock(type: string, shape: 'statement' | 'value' | 'wrap', tooltip: string) {
  Blockly.Blocks[type] = {
    init(this: CodeBlock) {
      this.setColour(PY_CODE_COLOUR);
      if (shape === 'value') this.setOutput(true, null);
      else {
        this.setPreviousStatement(true);
        this.setNextStatement(true);
      }
      if (shape === 'wrap') this.appendStatementInput('DO');
      this.setTooltip(tooltip);
      this.lineCount_ = 0;
      this.setLines_(1);
    },
    saveExtraState(this: CodeBlock) {
      return this.lineCount_ === 1 ? null : { lines: this.lineCount_ };
    },
    loadExtraState(this: CodeBlock, state: { lines?: number } | null) {
      this.setLines_(state?.lines ?? 1);
    },
    mutationToDom(this: CodeBlock) {
      if (this.lineCount_ === 1) return null;
      const m = Blockly.utils.xml.createElement('mutation');
      m.setAttribute('lines', String(this.lineCount_));
      return m;
    },
    domToMutation(this: CodeBlock, xml: Element) {
      this.setLines_(parseInt(xml.getAttribute('lines') ?? '1', 10) || 1);
    },
    setLines_(this: CodeBlock, count: number) {
      for (let i = count; i < this.lineCount_; i++) this.removeInput(`L${i}`);
      for (let i = this.lineCount_; i < count; i++) {
        const input = this.appendDummyInput(`L${i}`);
        if (i === 0) input.appendField('🐍');
        else input.appendField('   ');
        input.appendField(new Blockly.FieldTextInput(''), `LINE${i}`);
        if (this.getInput('DO')) this.moveInputBefore(`L${i}`, 'DO');
      }
      this.lineCount_ = count;
      if (shape === 'wrap') {
        for (let i = 0; i < count; i++) this.getInput(`L${i}`)?.removeField('COLON', true);
        this.getInput(`L${count - 1}`)!.appendField(':', 'COLON');
      }
    },
  };
}

defineCodeBlock(
  'py_code',
  'statement',
  'Python code, run exactly as it is written. Used for Python that has no block yet.',
);
defineCodeBlock(
  'py_code_value',
  'value',
  'A piece of Python code that gives a value, used exactly as it is written.',
);
defineCodeBlock(
  'py_code_wrap',
  'wrap',
  'A line of Python (like "for k, v in d.items()") that runs the blocks inside it.',
);

/** The lines of a "Python code" block. */
export function codeLines(block: Blockly.Block): string[] {
  const lines: string[] = [];
  for (let i = 0; block.getField(`LINE${i}`); i++)
    lines.push(block.getFieldValue(`LINE${i}`) as string);
  return lines;
}

pythonGenerator.forBlock['py_code'] = (block) => `${codeLines(block).join('\n')}\n`;
// A name, number or text needs no brackets; anything else gets them whenever
// the block around it needs them (Order.NONE).
pythonGenerator.forBlock['py_code_value'] = (block) => {
  const code = codeLines(block).join('\n');
  const atomic = /^(?:[\w.]+|'[^'\\\n]*'|"[^"\\\n]*")$/.test(code);
  return [code, atomic ? Order.ATOMIC : Order.NONE];
};
pythonGenerator.forBlock['py_code_wrap'] = (block, generator) => {
  const body = generator.statementToCode(block, 'DO') || `${generator.INDENT}pass\n`;
  return `${codeLines(block).join('\n')}:\n${body}`;
};

// PEP 8 indentation, matching what students see in examples and books.
pythonGenerator.INDENT = '    ';

/** Python for everything on the workspace. */
export function workspaceToPython(workspace: Blockly.Workspace): string {
  return pythonGenerator.workspaceToCode(workspace);
}
