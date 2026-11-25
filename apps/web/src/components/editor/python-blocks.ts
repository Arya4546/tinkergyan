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

// PEP 8 indentation, matching what students see in examples and books.
pythonGenerator.INDENT = '    ';

/** Python for everything on the workspace. */
export function workspaceToPython(workspace: Blockly.Workspace): string {
  return pythonGenerator.workspaceToCode(workspace);
}
