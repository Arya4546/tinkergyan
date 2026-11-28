// Runs with `node --test` (see README.md). Covers the bugs found in the Python
// audit: deque / defaultdict / missing modules, stdin, error messages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { run, END } from './harness.mjs';
import { friendlyError, unclosedBrackets } from '../../src/lib/python/friendly-errors.ts';
import { PYTHON_EXAMPLES, STARTER_CODE } from '../../src/lib/python/examples.ts';
import { lockDown, BLOCKED_GLOBALS } from '../../src/lib/python/isolation.ts';
import { rewriteForEngine } from '../../src/lib/python/rewrite.ts';

const fixtures = (name) => new URL(`./fixtures/${name}/`, import.meta.url).pathname;
const programs = (dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.py'))
    .sort()
    .map((f) => f.slice(0, -3));
const failure = (r) => `${r.error.name}: ${r.error.message} (line ${r.error.line})`;

// Python the browser engine can't run by itself: re (on the browser's regex
// engine), s[::-1] and a[::2] = … (rewrite.ts), dataclasses, RecursionError.
test('Python made to work in the browser prints the same as CPython', async (t) => {
  const dir = fixtures('compat');
  for (const name of programs(dir)) {
    await t.test(name, async () => {
      const r = await run(fs.readFileSync(dir + name + '.py', 'utf8'), [], { echo: false });
      assert.ok(r.ok, r.ok ? '' : failure(r));
      assert.equal(r.out, fs.readFileSync(dir + name + '.expected', 'utf8'));
    });
  }
});

test('rewrite.ts leaves other code alone and keeps line numbers', async () => {
  for (const code of [
    'print("a::b")',
    'x = {"a": 1, "b": 2}\nprint(x[1:2])',
    'def f(:\n  pass',
    'print(s[1:2:])',
    'a = [1]\nb = """x::y"""',
  ]) {
    assert.equal(rewriteForEngine(code), code);
  }
  assert.equal(
    rewriteForEngine('a[::2] = b[::-1]\ndel c[1::2]'),
    '_tg_setslice(a, None, None, 2, _tg_slice(b, None, None, -1))\n_tg_delslice(c, 1, None, 2)',
  );
  const r = await run('s = "abc"\nx = s[::-1]\nprint(missing)');
  assert.equal(r.error.line, 3);
  const r2 = await run('a = [1]\na[::2] = [1, 2]');
  assert.equal(`${r2.error.name} ${r2.error.line}`, 'ValueError 2');
});

test('DSA programs print the same as CPython', async (t) => {
  const dir = fixtures('dsa');
  for (const name of programs(dir)) {
    await t.test(name, async () => {
      const inFile = dir + name + '.in';
      const inputs = fs.existsSync(inFile)
        ? fs.readFileSync(inFile, 'utf8').replace(/\n$/, '').split('\n')
        : [];
      const r = await run(fs.readFileSync(dir + name + '.py', 'utf8'), inputs, { echo: false });
      assert.ok(r.ok, r.ok ? '' : failure(r));
      assert.equal(r.out, fs.readFileSync(dir + name + '.expected', 'utf8'));
    });
  }
});

test('input() and sys.stdin behave like CPython', async (t) => {
  const dir = fixtures('stdin');
  for (const name of programs(dir)) {
    await t.test(name, async () => {
      const inFile = dir + name + '.in';
      const stdin = fs.existsSync(inFile) ? fs.readFileSync(inFile, 'utf8') : null;
      const inputs =
        stdin === null ? [] : stdin === '' ? [END] : [...stdin.replace(/\n$/, '').split('\n'), END];
      const r = await run(fs.readFileSync(dir + name + '.py', 'utf8'), inputs, { echo: false });
      const got = r.ok ? r.out : `${r.out}\n!! ${failure(r)}`;
      assert.equal(got, fs.readFileSync(dir + name + '.expected', 'utf8'));
    });
  }
});

test('100k lines of stdin are read quickly (sys.stdin.read)', async () => {
  const lines = [
    '100000',
    ...Array.from({ length: 100000 }, (_, i) => String(((i + 1) * 7919) % 1e9)),
  ];
  const code =
    'import sys\ndata = sys.stdin.read().split()\nn = int(data[0])\nvals = list(map(int, data[1:]))\nprint(n, len(vals), sum(vals) % 1000000007, max(vals))';
  const r = await run(code, [lines.join('\n'), END], { echo: false });
  assert.ok(r.ok, r.ok ? '' : failure(r));
  assert.equal(r.out, '100000 100000 395672835 791900000\n');
  assert.ok(r.ms < 5000, `took ${r.ms} ms`);
});

test('a pasted answer is served line by line', async () => {
  const code =
    'import sys\nn = int(input())\nprint(sum(int(sys.stdin.readline()) for _ in range(n)))';
  const r = await run(code, ['3\n1\n2\n3'], { echo: false });
  assert.ok(r.ok, r.ok ? '' : failure(r));
  assert.equal(r.out, '6\n');
});

test('the built-in examples run and print something', async (t) => {
  for (const ex of [...PYTHON_EXAMPLES, { id: 'starter', code: STARTER_CODE }]) {
    await t.test(ex.id, async () => {
      const r = await run(ex.code, ex.testAnswers ?? []);
      assert.ok(r.ok, r.ok ? '' : failure(r));
      assert.ok(r.out.trim().length > 0, 'no output');
    });
  }
});

test('modules and imports', async (t) => {
  const cases = {
    'import time / sleep': `import time\ntime.sleep(0.01)\ntime.sleep_ms(1)\nprint(time.ticks_ms() >= 0, time.time() > 0, time.perf_counter() > 0)`,
    'from time import sleep': `from time import sleep, ticks_ms\nsleep(0.01)\nprint(ticks_ms() >= 0)`,
    'from time import *': `from time import *\nsleep(0.01)\nprint(ticks_ms() >= 0, monotonic() > 0)`,
    'import utime': `import utime\nutime.sleep_ms(1)\nprint(True)`,
    'import ai': `import ai\nai.start_camera()\nprint(ai.label() == '', ai.labels() == [])\nai.stop_camera()`,
    'from ai import *': `from ai import *\nprint(label() == '')`,
    'math + random': `import math, random\nrandom.seed(3)\nx = [1, 2, 3]\nrandom.shuffle(x)\nprint(math.gcd(12, 18) == 6, math.isqrt(17) == 4, sorted(x) == [1, 2, 3])`,
    'json / re / string': `import json, re, string\nprint(json.dumps({'a': 1}) == '{"a": 1}', re.sub('a', 'b', 'aa') == 'bb', string.digits == '0123456789')`,
    'sorted is stable with a key': `print(sorted(['bb', 'a', 'cc', 'b', 'aa'], key=len) == ['a', 'b', 'bb', 'cc', 'aa'])`,
    'deque() with no maxlen': `from collections import deque\nq = deque()\nq.append(1)\nq.appendleft(0)\nprint(list(q) == [0, 1], deque([1, 2], maxlen=1)[0] == 2)`,
    'defaultdict is a dict': `from collections import defaultdict\nd = defaultdict(list)\nd['a'].append(1)\nprint(isinstance(d, dict), len(d) == 1, list(d.keys()) == ['a'], [k for k in d] == ['a'])`,
    'deep recursion with a loop (pystack)': `def dfs(u):\n    for v in range(1) if u < 140 else []:\n        dfs(u + 1)\ndfs(0)\nprint(True)`,
    'no stray globals': `print([k for k in globals() if not k.startswith('__')] == [])`,
  };
  for (const [name, code] of Object.entries(cases)) {
    await t.test(name, async () => {
      const r = await run(code);
      assert.ok(r.ok, r.ok ? '' : failure(r));
      assert.ok(!/False/.test(r.out), r.out);
    });
  }
});

test('errors point at the right line with a helpful message', async (t) => {
  const cases = [
    [
      'endless recursion',
      'def f(n):\n    return f(n + 1)\nf(0)',
      [],
      'RuntimeError',
      2,
      /called itself too many times/,
    ],
    [
      'legit deep DFS',
      'import sys\nsys.setrecursionlimit(10**6)\nadj = [[i + 1] for i in range(500)] + [[]]\ndef dfs(u):\n    for v in adj[u]:\n        dfs(v)\ndfs(0)',
      [],
      'RuntimeError',
      6,
      /about 150 calls deep/,
    ],
    ['unpack: one value', 'a, b = input().split()', ['5'], 'ValueError', 1, /only 1 value/],
    [
      'unpack: empty answer',
      'a, b = map(int, input().split())',
      [''],
      'ValueError',
      1,
      /no values at all/,
    ],
    [
      'unpack: too many',
      'a, b = "1 2 3".split()',
      [],
      'ValueError',
      1,
      /More values than variables/,
    ],
    // s[::-1] works in the browser now (rewrite.ts); the hint is still what
    // a board shows, so this one runs without the rewrite, as a board does.
    [
      'str[::-1] on a board',
      's = "hello"\nprint(s[::-1])',
      [],
      'NotImplementedError',
      2,
      /reversed\(text\)/,
    ],
    ['str.zfill', 'print("7".zfill(3))', [], 'AttributeError', 1, /f"\{n:05\}"/],
    ['missing file (browser)', 'open("data.txt").read()', [], 'OSError', 1, /doesn't exist/],
    [
      'empty deque',
      'from collections import deque\nq = deque()\nq.popleft()',
      [],
      'IndexError',
      3,
      /nothing left to take/,
    ],
    [
      'empty heap',
      'import heapq\nheapq.heappop([])',
      [],
      'IndexError',
      2,
      /nothing left to take|doesn't have that many/,
    ],
    [
      'dict(Counter)',
      'from collections import Counter\nd = dict(Counter("aab"))',
      [],
      'ValueError',
      2,
      /dict\(your_counter.items\(\)\)/,
    ],
    [
      'EOFError after Ctrl+D',
      'x = input()\ny = input()',
      ['1', END],
      'EOFError',
      2,
      /no more input/,
    ],
    [
      "can't import name",
      'from functools import singledispatch',
      [],
      'ImportError',
      1,
      /"singledispatch" isn't available/,
    ],
    ['unknown module', 'import numpy', [], 'ImportError', 1, /heapq/],
    [
      'wrong arg count',
      'def f(a, b):\n    return a + b\nf(1)',
      [],
      'TypeError',
      3,
      /wrong number of values/,
    ],
    [
      'error in a method: deepest line',
      'class S:\n    def go(self, xs):\n        return [10 // x for x in xs]\nprint(S().go([1, 0]))',
      [],
      'ZeroDivisionError',
      3,
      /divide by zero/,
    ],
    [
      'error in a sorted key lambda',
      'data = [1, "a"]\nprint(sorted(data, key=lambda v: v + 1))',
      [],
      'TypeError',
      2,
      /./,
    ],
    [
      'error inside an lru_cache function',
      'from functools import lru_cache\n@lru_cache(None)\ndef f(n):\n    return 1 // n\nf(0)',
      [],
      'ZeroDivisionError',
      4,
      /./,
    ],
    ['KeyError on a plain dict', 'd = {}\nd["x"] += 1', [], 'KeyError', 2, /dictionary/],
    ['NameError typo', 'count = 1\nprint(cuont)', [], 'NameError', 2, /Did you mean "count"/],
    // SyntaxErrors
    [
      'missing colon',
      'x = 5\nif x > 3\n    print(x)',
      [],
      'SyntaxError',
      2,
      /Add a colon ":" at the end of line 2/,
    ],
    [
      'unclosed paren mid-file',
      'x = 1\nprint(x\ny = 2\nprint(y)',
      [],
      'SyntaxError',
      2,
      /"\(" is never closed/,
    ],
    [
      'unclosed bracket at the end',
      'nums = [1, 2,\n',
      [],
      'SyntaxError',
      1,
      /"\[" is never closed/,
    ],
    [
      'bracket in a string is not a bracket',
      's = "(not a bracket"\nx = [1,\ny = 2',
      [],
      'SyntaxError',
      2,
      /"\[" is never closed/,
    ],
    [
      'closed multi-line list is not blamed',
      'nums = [\n    1, 2\n    3,\n]',
      [],
      'SyntaxError',
      3,
      /couldn't read/,
    ],
    [
      'unclosed string',
      'x = 1\nprint("hello)\nprint(2)',
      [],
      'SyntaxError',
      2,
      /quote mark is missing/,
    ],
    ['body not indented', 'def f():\nprint(1)', [], 'SyntaxError', 2, /needs 4 more spaces/],
    ['= in if', 'x = 1\nif x = 1:\n    pass', [], 'SyntaxError', 2, /"=="/],
    [
      'match is unsupported',
      'x = 2\nmatch x:\n    case 2:\n        print("two")',
      [],
      'SyntaxError',
      2,
      /no match\/case/,
    ],
    [
      '{**d} is unsupported',
      'a = {"x": 1}\nb = {**a, "y": 2}',
      [],
      'SyntaxError',
      2,
      /can't unpack a dict/,
    ],
    ['keyword as a name', 'class = 3', [], 'SyntaxError', 1, /"class" is a word Python keeps/],
  ];
  for (const [name, code, inputs, wantName, wantLine, wantText] of cases) {
    await t.test(name, async () => {
      const rewrite = !name.endsWith('on a board');
      const r = await run(code, inputs, { echo: false, rewrite });
      assert.ok(!r.ok, 'expected an error');
      assert.equal(r.error.name, wantName, failure(r));
      const f = friendlyError(r.error, code);
      assert.equal(f.line, wantLine, `${f.title} / ${f.hint}`);
      assert.match(`${f.title} | ${f.explanation} | ${f.hint ?? ''}`, wantText);
    });
  }
});

test('unclosedBrackets skips strings and comments', () => {
  assert.deepEqual(unclosedBrackets('a = "(" + \'[\'  # {\nb = (1,\n 2)\nc = [x\n'), [
    { char: '[', line: 4 },
  ]);
  assert.deepEqual(unclosedBrackets('s = """(\n[\n"""\nt = {1: (2)}'), []);
});

test('lockDown removes network and storage access, including on prototypes', () => {
  const proto = Object.fromEntries(BLOCKED_GLOBALS.map((n) => [n, () => n]));
  const scope = Object.create(proto);
  Object.defineProperty(scope, 'fetch', {
    value: () => 'own',
    writable: true,
    configurable: false,
  });
  scope.keep = 1;
  lockDown(scope);
  for (const name of BLOCKED_GLOBALS) assert.equal(scope[name], undefined, name);
  assert.equal(scope.keep, 1);
});
