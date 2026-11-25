/**
 * examples.ts — starter programs for Python projects.
 *
 * Block examples are Blockly JSON (Blockly.serialization). Every example, in
 * both forms, is run under MicroPython by the test suite with scripted answers
 * for input(), so a broken example cannot ship.
 */

type Json = Record<string, unknown>;

export interface PythonExample {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  /** Answers the test suite types in when the program asks a question. */
  testAnswers?: string[];
  /** Blockly workspace JSON, for block projects. Omitted for text-only examples. */
  blocks?: Json;
  /** Python source, for text projects. */
  code: string;
}

// ── Tiny helpers to keep the block JSON readable ────────────────────────────
const num = (n: number): Json => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
const txt = (t: string): Json => ({ shadow: { type: 'text', fields: { TEXT: t } } });
const getVar = (id: string): Json => ({
  block: { type: 'variables_get', fields: { VAR: { id } } },
});
const print = (value: Json): Json => ({ type: 'text_print', inputs: { TEXT: value } });
const join = (...parts: Json[]): Json => ({
  block: {
    type: 'text_join',
    extraState: { itemCount: parts.length },
    inputs: Object.fromEntries(parts.map((p, i) => [`ADD${i}`, p])),
  },
});
const setVar = (id: string, value: Json): Json => ({
  type: 'variables_set',
  fields: { VAR: { id } },
  inputs: { VALUE: value },
});
const arith = (op: string, a: Json, b: Json): Json => ({
  block: { type: 'math_arithmetic', fields: { OP: op }, inputs: { A: a, B: b } },
});
const compare = (op: string, a: Json, b: Json): Json => ({
  block: { type: 'logic_compare', fields: { OP: op }, inputs: { A: a, B: b } },
});
/** Chain statement blocks with `next`. */
const seq = (...stmts: Json[]): Json => {
  let next: Json | undefined;
  for (let i = stmts.length - 1; i >= 0; i--) {
    next = next ? { ...stmts[i], next: { block: next } } : { ...stmts[i] };
  }
  return next!;
};
const program = (vars: Array<{ id: string; name: string }>, top: Json): Json => ({
  variables: vars,
  blocks: { languageVersion: 0, blocks: [{ ...top, x: 30, y: 30 }] },
});

export const PYTHON_EXAMPLES: PythonExample[] = [
  {
    id: 'hello',
    title: 'Hello, world!',
    emoji: '👋',
    blurb: 'Your very first program: make the computer say hello.',
    blocks: program([], seq(print(txt('Hello, world!')), print(txt('I am learning Python 🐍')))),
    code: 'print("Hello, world!")\nprint("I am learning Python 🐍")\n',
  },
  {
    id: 'name',
    title: "What's your name?",
    emoji: '🙋',
    blurb: 'Ask a question and use the answer.',
    testAnswers: ['Asha'],
    blocks: program(
      [{ id: 'v_name', name: 'name' }],
      seq(
        setVar('v_name', {
          block: { type: 'py_ask_text', inputs: { QUESTION: txt('What is your name? ') } },
        }),
        print(join(txt('Nice to meet you, '), getVar('v_name'), txt('!'))),
      ),
    ),
    code: 'name = input("What is your name? ")\nprint("Nice to meet you, " + name + "!")\n',
  },
  {
    id: 'count',
    title: 'Count to 10',
    emoji: '🔢',
    blurb: 'Use a loop to count, then blast off.',
    blocks: program(
      [{ id: 'v_i', name: 'i' }],
      seq(
        {
          type: 'controls_for',
          fields: { VAR: { id: 'v_i' } },
          inputs: {
            FROM: num(1),
            TO: num(10),
            BY: num(1),
            DO: {
              block: seq(print(getVar('v_i')), { type: 'py_wait', inputs: { SECONDS: num(0.3) } }),
            },
          },
        },
        print(txt('Blast off! 🚀')),
      ),
    ),
    code: 'import time\n\nfor i in range(1, 11):\n    print(i)\n    time.sleep(0.3)\nprint("Blast off! 🚀")\n',
  },
  {
    id: 'table',
    title: 'Times table',
    emoji: '✖️',
    blurb: 'Pick a number and print its times table.',
    testAnswers: ['7'],
    blocks: program(
      [
        { id: 'v_n', name: 'n' },
        { id: 'v_i', name: 'i' },
      ],
      seq(
        setVar('v_n', {
          block: { type: 'py_ask_number', inputs: { QUESTION: txt('Which times table? ') } },
        }),
        {
          type: 'controls_for',
          fields: { VAR: { id: 'v_i' } },
          inputs: {
            FROM: num(1),
            TO: num(10),
            BY: num(1),
            DO: {
              block: print(
                join(
                  getVar('v_n'),
                  txt(' x '),
                  getVar('v_i'),
                  txt(' = '),
                  arith('MULTIPLY', getVar('v_n'), getVar('v_i')),
                ),
              ),
            },
          },
        },
      ),
    ),
    code: 'n = int(input("Which times table? "))\n\nfor i in range(1, 11):\n    print(n, "x", i, "=", n * i)\n',
  },
  {
    id: 'guess',
    title: 'Guess the number',
    emoji: '🎯',
    blurb: 'The computer picks a secret number. Can you find it?',
    testAnswers: [
      '50',
      '25',
      '75',
      '12',
      '37',
      '62',
      '88',
      '6',
      '18',
      '31',
      '43',
      '56',
      '68',
      '81',
      '94',
      '3',
      '9',
      '15',
      '21',
      '28',
      '34',
      '40',
      '46',
      '53',
      '59',
      '65',
      '71',
      '78',
      '84',
      '91',
      '97',
      '1',
      '2',
      '4',
      '5',
      '7',
      '8',
      '10',
      '11',
      '13',
      '14',
      '16',
      '17',
      '19',
      '20',
      '22',
      '23',
      '24',
      '26',
      '27',
      '29',
      '30',
      '32',
      '33',
      '35',
      '36',
      '38',
      '39',
      '41',
      '42',
      '44',
      '45',
      '47',
      '48',
      '49',
      '51',
      '52',
      '54',
      '55',
      '57',
      '58',
      '60',
      '61',
      '63',
      '64',
      '66',
      '67',
      '69',
      '70',
      '72',
      '73',
      '74',
      '76',
      '77',
      '79',
      '80',
      '82',
      '83',
      '85',
      '86',
      '87',
      '89',
      '90',
      '92',
      '93',
      '95',
      '96',
      '98',
      '99',
      '100',
    ],
    blocks: program(
      [
        { id: 'v_secret', name: 'secret' },
        { id: 'v_guess', name: 'guess' },
      ],
      seq(
        setVar('v_secret', {
          block: { type: 'math_random_int', inputs: { FROM: num(1), TO: num(100) } },
        }),
        setVar('v_guess', num(0)),
        print(txt('I am thinking of a number from 1 to 100.')),
        {
          type: 'controls_whileUntil',
          fields: { MODE: 'UNTIL' },
          inputs: {
            BOOL: compare('EQ', getVar('v_guess'), getVar('v_secret')),
            DO: {
              block: seq(
                setVar('v_guess', {
                  block: { type: 'py_ask_number', inputs: { QUESTION: txt('Your guess: ') } },
                }),
                {
                  type: 'controls_if',
                  extraState: { elseIfCount: 1, hasElse: true },
                  inputs: {
                    IF0: compare('LT', getVar('v_guess'), getVar('v_secret')),
                    DO0: { block: print(txt('Too low! ⬆️')) },
                    IF1: compare('GT', getVar('v_guess'), getVar('v_secret')),
                    DO1: { block: print(txt('Too high! ⬇️')) },
                    ELSE: { block: print(txt('You got it! 🎉')) },
                  },
                },
              ),
            },
          },
        },
      ),
    ),
    code: `import random

secret = random.randint(1, 100)
guess = 0
tries = 0
print("I am thinking of a number from 1 to 100.")

while guess != secret:
    guess = int(input("Your guess: "))
    tries = tries + 1
    if guess < secret:
        print("Too low! ⬆️")
    elif guess > secret:
        print("Too high! ⬇️")
    else:
        print("You got it in", tries, "tries! 🎉")
`,
  },
  {
    id: 'list',
    title: 'Favourite fruits',
    emoji: '🍎',
    blurb: 'Keep things in a list and loop over them.',
    blocks: program(
      [
        { id: 'v_fruits', name: 'fruits' },
        { id: 'v_fruit', name: 'fruit' },
      ],
      seq(
        setVar('v_fruits', {
          block: {
            type: 'lists_create_with',
            extraState: { itemCount: 3 },
            inputs: { ADD0: txt('mango'), ADD1: txt('banana'), ADD2: txt('apple') },
          },
        }),
        print(
          join(
            txt('I like '),
            { block: { type: 'lists_length', inputs: { VALUE: getVar('v_fruits') } } },
            txt(' fruits:'),
          ),
        ),
        {
          type: 'controls_forEach',
          fields: { VAR: { id: 'v_fruit' } },
          inputs: {
            LIST: getVar('v_fruits'),
            DO: { block: print(join(txt('🍽 '), getVar('v_fruit'))) },
          },
        },
      ),
    ),
    code: `fruits = ["mango", "banana", "apple"]
fruits.append("grapes")

print("I like", len(fruits), "fruits:")
for fruit in fruits:
    print("🍽", fruit)

fruits.sort()
print("In ABC order:", fruits)
`,
  },
  {
    id: 'stars',
    title: 'Star pyramid',
    emoji: '⭐',
    blurb: 'Draw a pyramid of stars with loops and text.',
    testAnswers: ['5'],
    code: `rows = int(input("How tall should the pyramid be? "))

for row in range(1, rows + 1):
    spaces = " " * (rows - row)
    stars = "*" * (2 * row - 1)
    print(spaces + stars)
`,
  },
  {
    id: 'quiz',
    title: 'Mini quiz',
    emoji: '🧠',
    blurb: 'Ask questions, check answers and keep score.',
    testAnswers: ['4', 'delhi', 'blue'],
    code: `score = 0

def ask(question, answer):
    global score
    reply = input(question + " ")
    if reply.strip().lower() == answer:
        print("✅ Correct!")
        score = score + 1
    else:
        print("❌ The answer was", answer)

ask("What is 2 + 2?", "4")
ask("What is the capital of India?", "delhi")
ask("What colour is the sky on a sunny day?", "blue")

print("You scored", score, "out of 3")
`,
  },
  {
    id: 'dice',
    title: 'Dice roller',
    emoji: '🎲',
    blurb: 'Roll dice and count how often each number comes up.',
    code: `import random

counts = [0, 0, 0, 0, 0, 0]
for roll in range(60):
    face = random.randint(1, 6)
    counts[face - 1] = counts[face - 1] + 1

for face in range(1, 7):
    print(face, "#" * counts[face - 1])
`,
  },
];

export const STARTER_CODE = '# Write your Python here, then press Run ▶\nprint("Hello, world!")\n';
