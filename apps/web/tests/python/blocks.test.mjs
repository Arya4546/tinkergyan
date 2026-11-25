// "Convert to blocks" (src/lib/python/python-to-blocks.ts). Runs with
// `node --test` (see README.md).
//
// - Blocks → Python → blocks → Python gives the same Python, for every block.
// - Typed programs print the same before and after conversion (both run on
//   MicroPython).
// - Python with no matching block is refused with the right line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from './harness.mjs';
import {
  pythonToBlocks,
  jsonToPython,
  xmlToPython,
  xmlBlockTypes,
  setBoard,
  setAiLabels,
} from './blocks.mjs';
import { PYTHON_EXAMPLES } from '../../src/lib/python/examples.ts';

setAiLabels(['cat', 'dog']);

const n = (v) => ({ block: { type: 'math_number', fields: { NUM: v } } });
const t = (v) => ({ block: { type: 'text', fields: { TEXT: v } } });
const v = (id) => ({ block: { type: 'variables_get', fields: { VAR: { id } } } });
const show = (block) => ({ type: 'text_print', inputs: { TEXT: { block } } });
/** Statement blocks as one stack; function definitions as their own stacks. */
function program(blocks) {
  const isDef = (b) => b.type.startsWith('procedures_def');
  const stack = blocks.filter((b) => !isDef(b)).map((b) => structuredClone(b));
  for (let i = stack.length - 1; i > 0; i--) stack[i - 1].next = { block: stack[i] };
  const tops = [...stack.slice(0, 1), ...blocks.filter(isDef)];
  return programOf(tops);
}
const programOf = (blocks) => ({
  blocks: { languageVersion: 0, blocks: blocks.map((b, i) => ({ ...b, x: 0, y: i * 300 })) },
  variables: [
    { name: 'x', id: 'x' },
    { name: 'items', id: 'items' },
    { name: 'i', id: 'i' },
  ],
});

/** One block of each kind (and each dropdown choice) the Python toolbox offers. */
function toolboxPrograms() {
  const out = {
    print: [{ type: 'text_print', inputs: { TEXT: t('hi') } }],
    'ask text': [show({ type: 'py_ask_text', inputs: { QUESTION: t('Name? ') } })],
    'ask number': [show({ type: 'py_ask_number', inputs: { QUESTION: t('N? ') } })],
    wait: [{ type: 'py_wait', inputs: { SECONDS: n(0.5) } }],
    set: [{ type: 'variables_set', fields: { VAR: { id: 'x' } }, inputs: { VALUE: n(5) } }],
    'change by': [{ type: 'math_change', fields: { VAR: { id: 'x' } }, inputs: { DELTA: n(2) } }],
    'append text': [
      { type: 'text_append', fields: { VAR: { id: 'x' } }, inputs: { TEXT: t('!') } },
    ],
    'if / else if / else': [
      {
        type: 'controls_if',
        extraState: { elseIfCount: 1, hasElse: true },
        inputs: {
          IF0: { block: { type: 'logic_boolean', fields: { BOOL: 'TRUE' } } },
          DO0: { block: show({ type: 'text', fields: { TEXT: 'a' } }) },
          IF1: v('x'),
          DO1: { block: show({ type: 'text', fields: { TEXT: 'b' } }) },
          ELSE: { block: show({ type: 'text', fields: { TEXT: 'c' } }) },
        },
      },
    ],
    while: [
      {
        type: 'controls_whileUntil',
        fields: { MODE: 'WHILE' },
        inputs: {
          BOOL: v('x'),
          DO: { block: { type: 'controls_flow_statements', fields: { FLOW: 'BREAK' } } },
        },
      },
    ],
    until: [
      {
        type: 'controls_whileUntil',
        fields: { MODE: 'UNTIL' },
        inputs: {
          BOOL: v('x'),
          DO: { block: { type: 'controls_flow_statements', fields: { FLOW: 'CONTINUE' } } },
        },
      },
    ],
    repeat: [
      { type: 'controls_repeat_ext', inputs: { TIMES: n(10), DO: { block: show(v('x').block) } } },
    ],
    'repeat variable times': [{ type: 'controls_repeat_ext', inputs: { TIMES: v('x') } }],
    'count up': [
      {
        type: 'controls_for',
        fields: { VAR: { id: 'i' } },
        inputs: { FROM: n(1), TO: n(10), BY: n(1), DO: { block: show(v('i').block) } },
      },
    ],
    'count down': [
      {
        type: 'controls_for',
        fields: { VAR: { id: 'i' } },
        inputs: { FROM: n(10), TO: n(1), BY: n(2) },
      },
    ],
    'count with variables': [
      {
        type: 'controls_for',
        fields: { VAR: { id: 'i' } },
        inputs: { FROM: n(0), TO: v('x'), BY: n(1), DO: { block: show(v('i').block) } },
      },
    ],
    'for each': [
      {
        type: 'controls_forEach',
        fields: { VAR: { id: 'i' } },
        inputs: { LIST: v('items'), DO: { block: show(v('i').block) } },
      },
    ],
    range: [
      {
        type: 'controls_forEach',
        fields: { VAR: { id: 'i' } },
        inputs: {
          LIST: { block: { type: 'py_range', inputs: { START: n(2), STOP: v('x'), STEP: n(3) } } },
          DO: { block: show(v('i').block) },
        },
      },
    ],
    'range from 0': [show({ type: 'py_range', inputs: { START: n(0), STOP: v('x'), STEP: n(1) } })],
    'not / and / or': [
      show({
        type: 'logic_negate',
        inputs: {
          BOOL: {
            block: {
              type: 'logic_operation',
              fields: { OP: 'OR' },
              inputs: {
                A: v('x'),
                B: {
                  block: {
                    type: 'logic_operation',
                    fields: { OP: 'AND' },
                    inputs: { A: v('x'), B: v('i') },
                  },
                },
              },
            },
          },
        },
      }),
    ],
    'text join': [
      show({
        type: 'text_join',
        extraState: { itemCount: 3 },
        inputs: { ADD0: t('a'), ADD1: v('x'), ADD2: n(1) },
      }),
    ],
    'to text': [
      show({ type: 'text_join', extraState: { itemCount: 1 }, inputs: { ADD0: v('x') } }),
    ],
    'text length / empty': [
      show({ type: 'text_length', inputs: { VALUE: v('x') } }),
      show({ type: 'text_isEmpty', inputs: { VALUE: v('x') } }),
    ],
    'list length / empty': [
      show({ type: 'lists_length', inputs: { VALUE: v('items') } }),
      show({ type: 'lists_isEmpty', inputs: { VALUE: v('items') } }),
    ],
    'make list': [
      {
        type: 'variables_set',
        fields: { VAR: { id: 'items' } },
        inputs: {
          VALUE: {
            block: {
              type: 'lists_create_with',
              extraState: { itemCount: 3 },
              inputs: { ADD0: n(1), ADD1: n(2), ADD2: v('x') },
            },
          },
        },
      },
    ],
    'empty list': [
      {
        type: 'variables_set',
        fields: { VAR: { id: 'items' } },
        inputs: { VALUE: { block: { type: 'lists_create_empty' } } },
      },
    ],
    'list sort': ['NUMERIC', 'TEXT', 'IGNORE_CASE'].flatMap((type) =>
      ['1', '-1'].map((dir) =>
        show({
          type: 'lists_sort',
          fields: { TYPE: type, DIRECTION: dir },
          inputs: { LIST: v('items') },
        }),
      ),
    ),
    'list index of': ['FIRST', 'LAST'].map((end) =>
      show({
        type: 'lists_indexOf',
        fields: { END: end },
        inputs: { VALUE: v('items'), FIND: v('x') },
      }),
    ),
    'list remove item': [
      {
        type: 'lists_getIndex',
        extraState: { isStatement: true },
        fields: { MODE: 'REMOVE', WHERE: 'FIRST' },
        inputs: { VALUE: v('items') },
      },
    ],
    'list item numbered by a variable': [
      show({
        type: 'lists_getIndex',
        fields: { MODE: 'GET', WHERE: 'FROM_START' },
        inputs: { VALUE: v('items'), AT: v('i') },
      }),
    ],
    'set list item by a variable': [
      {
        type: 'lists_setIndex',
        fields: { MODE: 'SET', WHERE: 'FROM_START' },
        inputs: { LIST: v('items'), AT: v('i'), TO: v('x') },
      },
    ],
    'title case': [
      show({ type: 'text_changeCase', fields: { CASE: 'TITLECASE' }, inputs: { TEXT: v('x') } }),
    ],
    'upper / lower case': ['UPPERCASE', 'LOWERCASE'].map((c) =>
      show({ type: 'text_changeCase', fields: { CASE: c }, inputs: { TEXT: v('x') } }),
    ),
    'random number': [show({ type: 'math_random_int', inputs: { FROM: n(1), TO: n(6) } })],
    constrain: [show({ type: 'math_constrain', inputs: { VALUE: v('x'), LOW: n(0), HIGH: n(9) } })],
    modulo: [show({ type: 'math_modulo', inputs: { DIVIDEND: v('x'), DIVISOR: n(3) } })],
    'function with return': [
      show({
        type: 'procedures_callreturn',
        extraState: { name: 'double', params: ['x'] },
        inputs: { ARG0: n(4) },
      }),
      {
        type: 'procedures_defreturn',
        fields: { NAME: 'double' },
        extraState: { params: [{ name: 'x', id: 'x' }] },
        inputs: {
          STACK: {
            block: {
              type: 'procedures_ifreturn',
              extraState: '<mutation value="1"></mutation>',
              inputs: { CONDITION: v('x'), VALUE: n(0) },
            },
          },
          RETURN: {
            block: {
              type: 'math_arithmetic',
              fields: { OP: 'MULTIPLY' },
              inputs: { A: v('x'), B: n(2) },
            },
          },
        },
      },
    ],
    'function with no return': [
      { type: 'procedures_callnoreturn', extraState: { name: 'hello', params: [] } },
      {
        type: 'procedures_defnoreturn',
        fields: { NAME: 'hello' },
        inputs: { STACK: { block: show(t('hello').block) } },
      },
    ],
    comment: [
      {
        type: 'variables_set',
        fields: { VAR: { id: 'x' } },
        inputs: { VALUE: n(1) },
        icons: { comment: { text: 'start at one', pinned: false, height: 80, width: 160 } },
      },
    ],
    'AI blocks': [
      { type: 'py_ai_camera', fields: { STATE: 'on' } },
      show({ type: 'py_ai_label' }),
      show({ type: 'py_ai_sees', fields: { LABEL: 'cat' } }),
      show({ type: 'py_ai_confidence', fields: { LABEL: 'dog' } }),
      { type: 'py_ai_camera', fields: { STATE: 'off' } },
    ],
  };
  for (const op of ['ADD', 'MINUS', 'MULTIPLY', 'DIVIDE', 'POWER'])
    out[`arithmetic ${op}`] = [
      show({ type: 'math_arithmetic', fields: { OP: op }, inputs: { A: v('x'), B: n(2) } }),
    ];
  for (const op of ['EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE'])
    out[`compare ${op}`] = [
      show({ type: 'logic_compare', fields: { OP: op }, inputs: { A: v('x'), B: n(1) } }),
    ];
  for (const op of ['ROOT', 'ABS', 'NEG', 'LN', 'LOG10', 'EXP', 'POW10'])
    out[`math ${op}`] = [
      show({ type: 'math_single', fields: { OP: op }, inputs: { NUM: v('x') } }),
    ];
  for (const op of ['ROUND', 'ROUNDUP', 'ROUNDDOWN'])
    out[`round ${op}`] = [
      show({ type: 'math_round', fields: { OP: op }, inputs: { NUM: v('x') } }),
    ];
  for (const where of ['FIRST', 'LAST', 'FROM_START', 'FROM_END', 'RANDOM'])
    for (const mode of ['GET', 'GET_REMOVE'])
      out[`list ${mode} ${where}`] = [
        show({
          type: 'lists_getIndex',
          fields: { MODE: mode, WHERE: where },
          inputs: { VALUE: v('items'), ...(where.startsWith('FROM') ? { AT: n(2) } : {}) },
        }),
      ];
  for (const where of ['FIRST', 'LAST', 'FROM_START', 'FROM_END'])
    for (const mode of ['SET', 'INSERT'])
      out[`list ${mode} ${where}`] = [
        {
          type: 'lists_setIndex',
          fields: { MODE: mode, WHERE: where },
          inputs: {
            LIST: v('items'),
            TO: v('x'),
            ...(where.startsWith('FROM') ? { AT: n(2) } : {}),
          },
        },
      ];
  return out;
}

function boardPrograms() {
  return {
    'built-in LED': [{ type: 'py_led_builtin', fields: { VALUE: '1' } }],
    'pin on / off': [{ type: 'py_pin_write', fields: { PIN: '4', VALUE: '0' } }],
    'pin read': [show({ type: 'py_pin_read', fields: { PIN: '5' } })],
    button: [show({ type: 'py_button_pressed', fields: { PIN: '5' } })],
    analog: [show({ type: 'py_analog_read', fields: { PIN: '34' } })],
    brightness: [{ type: 'py_pwm_write', fields: { PIN: '4' }, inputs: { PERCENT: n(50) } }],
    servo: [{ type: 'py_servo', fields: { PIN: '4' }, inputs: { ANGLE: n(90) } }],
    tone: [{ type: 'py_tone', fields: { PIN: '4' }, inputs: { FREQ: n(440), SECONDS: n(0.5) } }],
    distance: [show({ type: 'py_distance', fields: { TRIG: '4', ECHO: '5' } })],
    dht: [show({ type: 'py_dht', fields: { WHAT: 'humidity', KIND: '22', PIN: '4' } })],
    'everything at once': [
      { type: 'py_led_builtin', fields: { VALUE: '1' } },
      { type: 'py_servo', fields: { PIN: '4' }, inputs: { ANGLE: n(90) } },
      { type: 'py_tone', fields: { PIN: '5' }, inputs: { FREQ: n(440), SECONDS: n(0.5) } },
      show({ type: 'py_dht', fields: { WHAT: 'temp', KIND: '11', PIN: '4' } }),
      show({ type: 'py_distance', fields: { TRIG: '4', ECHO: '5' } }),
    ],
  };
}

test('blocks → Python → blocks gives the same Python, for every block', async (t) => {
  setBoard('python');
  for (const [name, blocks] of Object.entries(toolboxPrograms())) {
    await t.test(name, () => {
      const code = jsonToPython(program(blocks));
      const back = pythonToBlocks(code, { onBoard: false });
      assert.equal(back.code, code);
      assert.equal(xmlToPython(back.xml), code);
    });
  }
});

test('board blocks → Python → blocks gives the same Python', async (t) => {
  setBoard('python-esp32');
  try {
    for (const [name, blocks] of Object.entries(boardPrograms())) {
      await t.test(name, () => {
        const code = jsonToPython(program(blocks));
        assert.equal(pythonToBlocks(code, { onBoard: true }).code, code);
      });
    }
  } finally {
    setBoard('python');
  }
});

test('the examples that have blocks convert back to the same blocks', async (t) => {
  setBoard('python');
  for (const ex of PYTHON_EXAMPLES.filter((e) => e.blocks)) {
    await t.test(ex.id, () => {
      const code = jsonToPython(ex.blocks);
      assert.equal(pythonToBlocks(code, { onBoard: false }).code, code);
    });
  }
});

/** The same random numbers in both runs. */
const seeded = (code) => `import random\nrandom.seed(7)\n${code}`;

/** Convert, then run both programs: they must print the same. */
async function samePrograms(code, inputs = []) {
  const converted = pythonToBlocks(code, { onBoard: false });
  const before = await run(seeded(code), inputs);
  const after = await run(seeded(converted.code), inputs);
  assert.ok(before.ok, `the original fails: ${before.error?.name}: ${before.error?.message}`);
  assert.ok(
    after.ok,
    `the converted program fails: ${after.error?.name}: ${after.error?.message}\n${converted.code}`,
  );
  assert.equal(after.out, before.out, converted.code);
  return converted;
}

// Programs written the way students type them. Each must print exactly the
// same after it is turned into blocks.
const TYPED = {
  'hello and input': [
    'name = input("What is your name? ")\nprint("Hello, " + name + "!")',
    ['Asha'],
  ],
  'print several values': [
    'a = 3\nb = 4.5\nprint("a is", a, "and b is", b)\nprint()\nprint(a, b, a * b)',
    [],
  ],
  'f-strings': [
    'name = "Sam"\nage = 7\nprint(f"{name} is {age} years old. {{braces}}")\nprint(f"{age * 2}")',
    [],
  ],
  'ask for numbers': [
    'a = int(input("First: "))\nb = int(input("Second: "))\nprint("Sum:", a + b)',
    ['3', '4'],
  ],
  'if / elif / else': [
    'for x in range(-2, 3):\n    if x > 0:\n        print("positive")\n    elif x == 0:\n        print("zero")\n    else:\n        print("negative")',
    [],
  ],
  'while with break and continue': [
    'n = 0\nwhile True:\n    n += 1\n    if n % 2 == 0:\n        continue\n    if n > 7:\n        break\n    print(n)',
    [],
  ],
  'while not': [
    'done = False\ncount = 0\nwhile not done:\n    count += 1\n    done = count >= 3\nprint(count)',
    [],
  ],
  'repeat (loop variable unused)': ['for _ in range(3):\n    print("hip hip hooray")', []],
  'counting loops': [
    'for i in range(5):\n    print(i)\nfor i in range(1, 11, 3):\n    print(i)\nfor i in range(10, 0, -2):\n    print(i)',
    [],
  ],
  'range with variables, including empty': [
    'n = 0\nfor i in range(n):\n    print("never", i)\nitems = [4, 5, 6]\nfor i in range(len(items)):\n    print(i, items[i])\nfor i in range(len(items) - 1, -1, -1):\n    print(items[i])',
    [],
  ],
  'empty literal range': ['for i in range(5, 5):\n    print("never")\nprint("done")', []],
  lists: [
    'nums = [5, 3, 8]\nnums.append(1)\nnums.insert(0, 9)\nprint(nums)\nprint(nums[0], nums[-1], nums[1], nums[-2])\nnums[0] = 7\nnums[-1] = 2\nfirst = nums.pop(0)\nlast = nums.pop()\nprint(first, last, nums, len(nums))\nnums.pop()\nprint(nums)\nprint(not len(nums), len(nums) > 0)',
    [],
  ],
  'list index from a variable': [
    'scores = [10, 20, 30]\nfor i in range(len(scores)):\n    scores[i] = scores[i] + 1\nk = 2\nprint(scores, scores[k - 1], scores.pop(k))',
    [],
  ],
  'for each item': [
    'fruits = ["apple", "kiwi"]\nfor fruit in fruits:\n    print(fruit.upper(), len(fruit))',
    [],
  ],
  maths: [
    'import math\nx = 7\nprint(x + 2, x - 2, x * 2, x / 2, x ** 2, x % 3, x // 2, -x // 2)\nprint(abs(-3), abs(2.5), round(2.6), math.sqrt(16), math.floor(2.7), math.ceil(2.1))\nprint(min(max(x, 0), 5))',
    [],
  ],
  text: [
    's = "Hello"\nprint(s.lower(), s.upper(), len(s))\nt = s + " " + "World"\nprint(t)\nt += "!"\nprint(t)\nprint(str(5) + "5")',
    [],
  ],
  'booleans and None': [
    'a = True\nb = not a\nc = None\nprint(a, b, c, a and b, a or b)\nif a and not b:\n    print("yes")',
    [],
  ],
  'truthy conditions': [
    'items = []\nif len(items):\n    print("has items")\nwords = "hi"\nwhile len(words) < 5:\n    words = words + "!"\nprint(words)',
    [],
  ],
  functions: [
    'def area(w, h):\n    return w * h\n\ndef show(label, value):\n    print(label, value)\n\nshow("area", area(3, 4))\nshow("double", area(2, 5))',
    [],
  ],
  'function with if-return': [
    'def sign(x):\n    if x > 0:\n        return "plus"\n    elif x < 0:\n        return "minus"\n    else:\n        return "zero"\n\nfor v in [3, -1, 0]:\n    print(sign(v))',
    [],
  ],
  'function that falls off the end': [
    'def check(x):\n    if x > 10:\n        return "big"\n\nprint(check(20), check(1))',
    [],
  ],
  'function local with the same name as a global': [
    'total = 100\n\ndef add(a, b):\n    total = a + b\n    return total\n\nprint(add(1, 2))\nprint(total)',
    [],
  ],
  'two functions with the same local name': [
    'def outer():\n    for i in range(2):\n        inner()\n        print("outer", i)\n\ndef inner():\n    for i in range(3):\n        pass\n\nouter()',
    [],
  ],
  'global in a function': [
    'count = 0\n\ndef bump():\n    global count\n    count += 1\n\nbump()\nbump()\nprint(count)',
    [],
  ],
  'recursion with only parameters': [
    'def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(6))',
    [],
  ],
  'early return in a function with no value': [
    'def greet(name):\n    if name == "":\n        return\n    print("hi", name)\n\ngreet("")\ngreet("Bo")',
    [],
  ],
  random: ['import random\nx = random.randint(1, 1)\nprint(x)\nprint(random.choice([7, 7]))', []],
  time: ['import time\nprint("wait")\ntime.sleep(0.01)\nprint("done")', []],
  'from-imports': [
    'from time import sleep\nfrom math import sqrt\nsleep(0.01)\nprint(sqrt(9))',
    [],
  ],
  'strings with escapes': [
    'print("it\'s \\"quoted\\"\\ttab")\nprint(\'line1\\nline2\')\nprint(r"raw\\n")\nprint("""triple""")\nprint("a" "b")',
    [],
  ],
  'comments and docstrings': [
    '# Start\nx = 1  # one\n\ndef f():\n    """Says hi."""\n    # inside\n    print("hi")\n\n# call it\nf()\n# the end',
    [],
  ],
  'number formats': ['print(1_000, 0x10, 2.5, 0.1 + 0.2, -3)', []],
};

test('typed programs print the same after becoming blocks', async (t) => {
  setBoard('python');
  for (const [name, [code, inputs]] of Object.entries(TYPED)) {
    await t.test(name, () => samePrograms(code, inputs));
  }
});

test('converting keeps what the student sees in mind', async (t) => {
  await t.test('comments become block comments and come back as # lines', async () => {
    const r = await samePrograms(
      '# Start\nx = 1  # one\n\ndef f():\n    """Says hi."""\n    print("hi")\n\nf()',
    );
    assert.match(r.code, /# Start\n# one\nx = 1/);
    assert.match(r.code, /# Says hi\.\ndef f\(\):/);
  });
  await t.test('a renamed local variable is reported', () => {
    const r = pythonToBlocks(
      'total = 1\n\ndef f():\n    total = 2\n    return total\n\nprint(f(), total)',
      { onBoard: false },
    );
    assert.match(r.notes.join(' '), /"total" is now "f_total"/);
  });
  await t.test('friendly blocks are chosen', () => {
    const types = (code) => xmlBlockTypes(pythonToBlocks(code, { onBoard: false }).xml);
    assert.ok(types('for i in range(1, 11):\n    print(i)').includes('controls_for'));
    assert.ok(types('for _ in range(3):\n    print(1)').includes('controls_repeat_ext'));
    assert.ok(types('n = 3\nfor i in range(n):\n    print(i)').includes('py_range'));
    assert.ok(types('x = 0\nx += 1').includes('math_change'));
    assert.ok(types('n = int(input())').includes('py_ask_number'));
    assert.ok(types('import ai\nif ai.label() == "cat":\n    print(1)').includes('py_ai_sees'));
  });
});

// Python with no block: refused, with the line to look at.
const REFUSED = [
  ['try / except', 'x = 1\ntry:\n    x = 2\nexcept ValueError:\n    pass', 2, /try \/ except/],
  ['class', 'class Dog:\n    pass', 1, /classes/],
  ['dictionary', 'ages = {"a": 1}', 1, /dictionaries/],
  ['list comprehension', 'sq = [i * i for i in range(3)]', 1, /comprehensions/],
  ['tuple unpacking', 'a, b = 1, 2', 1, /one variable at a time/],
  ['print with end=', 'print("a", end="")', 1, /sep= or end=/],
  ['default argument', 'def f(a=1):\n    return a', 1, /no default values/],
  [
    'recursion with local variables',
    'def fib(n):\n    if n < 2:\n        return n\n    a = fib(n - 1)\n    return a + fib(n - 2)\nprint(fib(5))',
    1,
    /calls itself/,
  ],
  [
    'return in a loop',
    'def find(items, x):\n    for v in items:\n        if v == x:\n            print(v)\n            return v\n    return -1\nprint(find([1], 1))',
    5,
    /only "return" at the end/,
  ],
  [
    'nested function',
    'def a():\n    def b():\n        pass\n    b()',
    2,
    /inside another function/,
  ],
  ['unknown module', 'import sys\nprint(1)', 1, /"sys" module/],
  ['slice', 'a = [1, 2, 3]\nprint(a[1:])', 2, /slices/],
  ['in operator', 'a = [1]\nprint(1 in a)', 2, /"in"/],
  ['chained comparison', 'x = 3\nprint(1 < x < 5)', 2, /two things at a time/],
  ['string method', 's = "a b"\nprint(s.split())', 2, /\.split\(\)/],
  ['whole-number float', 'x = 5.0', 1, /whole number/],
  ['undefined name', 'print(y)', 1, /never gets a value/],
  ['text repetition', 'print("-" * 10)', 1, /repeat text/],
  ['looping over text', 'for ch in input():\n    print(ch)', 1, /letters of a text/],
  ['float(input())', 'x = float(input())', 1, /no block for float/],
  ['syntax error', 'x = 1\nif x\n    print(x)', 2, /can't read this line/],
  [
    'pins in the browser',
    'from machine import Pin\nPin(2, Pin.OUT).value(1)',
    1,
    /only work on a board/,
  ],
  ['unknown AI class', 'import ai\nprint(ai.confidence("horse"))', 2, /no class called "horse"/],
  [
    'returning function used as a statement',
    'def f():\n    return 1\nf()',
    3,
    /gives back a value/,
  ],
  ['wrong number of values', 'def f(a):\n    print(a)\nf(1, 2)', 3, /needs 1 value/],
];

test('Python with no matching block is refused with its line', async (t) => {
  setBoard('python');
  for (const [name, code, line, message] of REFUSED) {
    await t.test(name, () => {
      assert.throws(
        () => pythonToBlocks(code, { onBoard: false }),
        (err) => {
          assert.equal(err.name, 'ConvertError', err.stack);
          assert.match(err.message, message);
          assert.equal(err.line, line, err.message);
          return true;
        },
      );
    });
  }
});

test('typed examples either convert to the same program or are refused', async (t) => {
  setBoard('python');
  for (const ex of PYTHON_EXAMPLES.filter((e) => !e.board)) {
    await t.test(ex.id, async () => {
      let converted;
      try {
        converted = pythonToBlocks(ex.code, { onBoard: false });
      } catch (err) {
        assert.equal(err.name, 'ConvertError', err.stack);
        return;
      }
      const before = await run(seeded(ex.code), ex.testAnswers ?? []);
      const after = await run(seeded(converted.code), ex.testAnswers ?? []);
      assert.equal(after.out, before.out, converted.code);
    });
  }
});
