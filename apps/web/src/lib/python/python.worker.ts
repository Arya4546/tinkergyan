/// <reference lib="webworker" />
/**
 * python.worker.ts — runs one student program with MicroPython (WebAssembly).
 *
 * One worker runs exactly one program. The page terminates it to stop a
 * program (the only reliable way to stop `while True:` with no sleep), and
 * starts a fresh one for the next run, so nothing leaks between runs.
 *
 * Blocking calls (input(), time.sleep()) use synchronous requests to
 * /__py_sync__/..., answered by public/py-sync-sw.js. See that file.
 */
// Both files are loaded as plain static assets, not bundled: the engine's
// module uses top-level await, which the app's bundler target does not allow,
// while every browser that can run a module worker handles it natively.
import engineUrl from '@micropython/micropython-webassembly-pyscript/micropython.mjs?url';
import wasmUrl from '@micropython/micropython-webassembly-pyscript/micropython.wasm?url';
import type * as EngineNs from '@micropython/micropython-webassembly-pyscript';
import type { MicroPythonInstance } from '@micropython/micropython-webassembly-pyscript';
import { END_OF_INPUT, type FromWorker, type PythonErrorInfo, type ToWorker } from './protocol';
import { COMPAT_FILES, COMPAT_MODULES } from './compat';
import { lockDown } from './isolation';

type EngineModule = typeof EngineNs;

const ctx = self as unknown as DedicatedWorkerGlobalScope;
// Kept here: lockDown() (./isolation) removes both from the global scope
// before any student code runs.
const postToPage = ctx.postMessage.bind(ctx);
const XHR = XMLHttpRequest;
const post = (msg: FromWorker) => postToPage(msg);

// ── Output batching ──────────────────────────────────────────────────────────
// A `while True: print(...)` loop can print hundreds of thousands of lines a
// second. Posting each one would bury the page, so output is batched. A line
// is sent straight away while output is sparse (so "Calculating..." shows up
// before a long calculation), and grouped once it starts to flood.
const decoder = new TextDecoder();
let pending = '';
let lastFlush = 0;
// Lines sent in the current 100 ms window. The first few go out at once;
// beyond that, output is grouped and sent at most ~30 times a second.
let windowStart = 0;
let windowLines = 0;

function flush() {
  if (!pending) return;
  post({ type: 'output', text: pending });
  pending = '';
  lastFlush = performance.now();
}

function write(text: string) {
  if (!text) return;
  pending += text;
  if (text.includes('\n')) {
    const now = performance.now();
    if (now - windowStart > 100) {
      windowStart = now;
      windowLines = 0;
    }
    windowLines += 1;
    if (windowLines <= 20 || now - lastFlush >= 33 || pending.length > 16384) flush();
  } else if (pending.length > 16384) {
    flush();
  }
}

function onBytes(data: string | Uint8Array) {
  write(typeof data === 'string' ? data : decoder.decode(data, { stream: true }));
}

// ── Blocking helpers ────────────────────────────────────────────────────────
let syncAvailable = false;

function syncGet(path: string): string | null {
  try {
    const xhr = new XHR();
    xhr.open('GET', `/__py_sync__/${path}`, false);
    xhr.send();
    return xhr.status === 200 ? xhr.responseText : null;
  } catch {
    return null;
  }
}

function busyWait(ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    /* spin — only used when the service worker is unavailable */
  }
}

function sleep(seconds: unknown) {
  flush();
  const total = Number(seconds) * 1000;
  if (!Number.isFinite(total) || total <= 0) return;
  const end = performance.now() + total;
  // Tiny sleeps are more accurate (and cheaper) spun than round-tripped.
  while (syncAvailable) {
    const left = end - performance.now();
    if (left <= 4) break;
    if (syncGet(`sleep?ms=${Math.ceil(Math.min(left, 20000))}`) === null) {
      syncAvailable = false; // service worker went away — spin for the rest
    }
  }
  const left = end - performance.now();
  if (left > 0) busyWait(left);
}

let inputCounter = 0;
/** The student ended the input (end of file: Ctrl+D, or an empty answer to sys.stdin). */
let inputEnded = false;
/** The lines of the student's last answer (a paste can have many) and how many were read. */
let answerLines: string[] = [];
let answerRead = 0;

/** Wait for the student's answer to one question. */
function waitForAnswer(prompt: string, eof: boolean): string {
  flush();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${inputCounter++}`;
  post({ type: 'input', id, prompt, eof });
  for (;;) {
    const reply = syncGet(`wait?id=${encodeURIComponent(id)}`);
    if (reply === null) {
      throw new Error('The answer box stopped working. Press Run to start again.');
    }
    if (reply.startsWith('v:')) return reply.slice(2);
    // 'retry' — the service worker answered before a long wait timed out; ask again.
  }
}

/**
 * One line of input, or null once the input has ended. A pasted block arrives
 * as one answer; its other lines are kept for the next calls, so a program
 * reading thousands of lines does not wait for the page once per line.
 * `eof`: the program reads sys.stdin, where an empty answer ends the input.
 */
function ask(prompt: string, eof: boolean): string | null {
  if (inputEnded) return null;
  write(prompt);
  // (An index, not shift(): shift() copies the array, which made reading a
  // 100 000-line paste take seconds instead of milliseconds.)
  let value = answerLines[answerRead];
  if (value === undefined) {
    const answer = waitForAnswer(prompt, eof);
    if (answer === END_OF_INPUT) {
      inputEnded = true;
      return null;
    }
    answerLines = answer.split('\n');
    answerRead = 0;
    value = answerLines[0]!;
  }
  answerRead += 1;
  write(value + '\n'); // echo, like a real terminal
  return value;
}

/**
 * sys.stdin.read(): the rest of the current answer at once (or the next
 * answer), each line ending in \n; null once the input has ended.
 */
function readRest(): string | null {
  if (inputEnded) return null;
  if (answerRead >= answerLines.length) {
    const answer = waitForAnswer('', true);
    if (answer === END_OF_INPUT) {
      inputEnded = true;
      return null;
    }
    answerLines = answer.split('\n');
    answerRead = 0;
  }
  const text = answerLines.slice(answerRead).join('\n') + '\n';
  answerRead = answerLines.length;
  write(text);
  return text;
}

// input(): the Python side always passes str(prompt); null (after the input
// ended) becomes EOFError, as in Python.
const input = (prompt: string | undefined) => ask(prompt ?? '', false);
// sys.stdin (compat/_tg_sys.py): readline() takes one line, read() the rest.
const readLine = () => ask('', true);

// ── AI model (trained in AI Studio, running on the page) ───────────────────
// The page publishes the latest prediction to the service worker; reading it
// is one quick synchronous request. A loop that asks thousands of times a
// second reuses the last answer for a few milliseconds instead.
let aiKey = 'ai';
let aiCache = '';
let aiCacheAt = -Infinity;

function aiState(): string {
  const now = performance.now();
  if (now - aiCacheAt < 30) return aiCache;
  const reply = syncGet(`state?key=${encodeURIComponent(aiKey)}`);
  aiCache = reply?.startsWith('v:') ? reply.slice(2) : '';
  aiCacheAt = now;
  return aiCache;
}

function aiCamera(on: unknown) {
  flush();
  aiCache = '';
  aiCacheAt = -Infinity;
  post({ type: 'ai-camera', on: !!on });
}

// ── Python side of the bridge ───────────────────────────────────────────────
// Runs before the student's code. Everything is set up inside a function so no
// helper names leak into the student's globals, and the wrappers are named
// _tg_* so the error parser can skip their frames in a traceback.
//
// Built-in modules that MicroPython leaves incomplete (time, sys, collections,
// math, ...) are completed by /lib/_tg_<name>.py (see ./compat). The import
// hook loads that file the first time a program imports the module, so
// \`import math\` and \`from math import *\` both see the complete module.
const PRELUDE = `
def _tg_setup():
    import sys, builtins, tg_host

    compat = ${JSON.stringify(COMPAT_MODULES)}
    real_import = builtins.__import__
    loaded = {}
    loading = []

    def _tg_import(name, globals=None, locals=None, fromlist=(), level=0):
        base = compat.get(name) if level == 0 else None
        # While a module loads, its own imports get the real modules (the
        # engine's time.py imports utime, which would otherwise come back here).
        if base is None or base in loading:
            return real_import(name, globals, locals, fromlist, level)
        mod = loaded.get(base)
        if mod is None:
            loading.append(base)
            try:
                sys.modules['_tg_real_' + base] = real_import(base)
                mod = real_import('_tg_' + base)
            finally:
                loading.remove(base)
            loaded[base] = mod
        return mod

    builtins.__import__ = _tg_import

    def _tg_input(prompt=''):
        if not tg_host.can_input:
            raise RuntimeError("Typing answers is not available in this browser window. Open TinkerGyan in a normal (not private) Chrome, Edge, Firefox or Safari window.")
        stdin = sys.modules.get('_tg_sys')
        if stdin is not None and stdin.stdin._buf:
            # sys.stdin.read(n) left part of a line: input() continues from it.
            print(prompt, end='')
            return stdin.stdin._input_line()
        value = tg_host.input(str(prompt))
        if value is None:
            raise EOFError('EOF when reading a line')
        return value

    builtins.input = _tg_input

    real_sorted = builtins.sorted

    def _tg_sorted(iterable, *, key=None, reverse=False):
        # MicroPython's sort is not stable; Python's is (items with equal keys
        # keep their order, which decides ties in many programs' output).
        # Sorting (key, position) pairs natively makes it stable and stays fast.
        # (list.sort() cannot be changed: use sorted() when ties matter.)
        if key is None:
            return real_sorted(iterable, reverse=reverse)
        items = list(iterable)
        if reverse:
            order = real_sorted([(key(items[i]), -i) for i in range(len(items))], reverse=True)
            return [items[-p[1]] for p in order]
        order = real_sorted([(key(items[i]), i) for i in range(len(items))])
        return [items[p[1]] for p in order]

    builtins.sorted = _tg_sorted

    real_open = builtins.open

    def _tg_open(file, *args, **kwargs):
        # open(0) is standard input, as in Python (open(0).read()).
        if file == 0 and not isinstance(file, bool):
            return _tg_import('sys').stdin
        return real_open(file, *args, **kwargs)

    builtins.open = _tg_open

_tg_setup()
del _tg_setup
`;

const FRAME_RE = /File "<stdin>", line (\d+)(?:, in (\S+))?/g;

function parsePythonError(err: unknown): PythonErrorInfo {
  const traceback = err instanceof Error ? err.message : String(err);
  const isPython = err instanceof Error && err.constructor?.name === 'PythonError';
  const lines = traceback.trim().split('\n');
  const last = (lines[lines.length - 1] ?? '').trim();
  let name = 'Error';
  let message = last;
  const m = /^([A-Za-z_][A-Za-z0-9_.]*)(?::\s?([\s\S]*))?$/.exec(last);
  if (isPython && m) {
    name = m[1]!;
    message = m[2] ?? '';
  } else if (!isPython) {
    // A failure inside the engine itself (e.g. the browser ran out of memory).
    name = 'InternalError';
    message = last || 'Python stopped unexpectedly.';
  }
  let line: number | null = null;
  for (const frame of traceback.matchAll(FRAME_RE)) {
    const fn = frame[2];
    if (fn && fn.startsWith('_tg_')) continue;
    line = Number(frame[1]);
  }
  return { name, message, line, traceback };
}

// ── Lifecycle ───────────────────────────────────────────────────────────────
let memoryLimitReported = false;
(globalThis as unknown as { __tgMemoryLimit: () => void }).__tgMemoryLimit = () => {
  if (memoryLimitReported) return;
  memoryLimitReported = true;
  flush();
  post({ type: 'memory-limit' });
};

let mpPromise: Promise<MicroPythonInstance> | null = null;

// The engine lets its memory grow to 2 GB before failing. A runaway program
// (`while True: a.append(1)`) then takes ~30 s and can freeze a school laptop,
// so growth is capped at 64 MB. Near the cap the engine usually raises
// MemoryError, but for some programs it crawls or hangs instead (reproduced
// in Node too — an engine bug), so the first refused growth is also reported
// to the page, which stops the program if it has not finished shortly after.
// The engine version is pinned exactly, so this text is known to be present;
// if it ever is not, we refuse to run rather than silently lose the cap.
const MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;
const GROW_CHECK =
  'if(requestedSize>2147483648)return err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is 2147483648 bytes!`),!1;';

async function loadEngine(): Promise<MicroPythonInstance> {
  const res = await fetch(engineUrl);
  if (!res.ok) throw new Error(`could not download Python (${res.status})`);
  const source = await res.text();
  if (!source.includes(GROW_CHECK)) throw new Error('unexpected Python engine version');
  const patched = source.replace(
    GROW_CHECK,
    `if(requestedSize>${MEMORY_LIMIT_BYTES}){globalThis.__tgMemoryLimit&&globalThis.__tgMemoryLimit();return!1}`,
  );
  const blobUrl = URL.createObjectURL(new Blob([patched], { type: 'text/javascript' }));
  let engine: EngineModule;
  try {
    engine = (await import(/* @vite-ignore */ blobUrl)) as EngineModule;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
  const { loadMicroPython } = engine;
  const mp = await loadMicroPython({
    url: wasmUrl,
    heapsize: 8 * 1024 * 1024,
    // Words of Python stack. The default (2048) ran out first in recursive
    // functions with loops (a DFS stopped 112 calls deep); with this much, only
    // the engine's fixed C stack limits recursion (~155 calls).
    pystack: 16 * 1024,
    linebuffer: false,
    stdout: onBytes,
    stderr: onBytes,
  });
  try {
    mp.FS.mkdir('/lib'); // on sys.path, but not created by the engine
  } catch {
    /* already there */
  }
  for (const [name, source] of Object.entries(COMPAT_FILES)) {
    mp.FS.writeFile(`/lib/${name}`, source);
  }
  lockDown();
  return mp;
}

function load() {
  mpPromise ??= loadEngine();
  return mpPromise;
}

load().then(
  () => post({ type: 'ready' }),
  (err: unknown) =>
    post({ type: 'fatal', message: err instanceof Error ? err.message : String(err) }),
);

ctx.onmessage = async (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  if (msg?.type !== 'run') return;
  // Ask the service worker directly: the page may believe it is installed
  // while this worker is not actually routed through it.
  syncAvailable = msg.syncAvailable && syncGet('ping') === 'pong';
  aiKey = msg.aiKey;
  let mp;
  try {
    mp = await load();
  } catch {
    return; // 'fatal' was already posted
  }
  mp.registerJsModule('tg_host', {
    can_input: syncAvailable,
    sleep,
    input,
    read_line: readLine,
    read_rest: readRest,
    ai_state: aiState,
    ai_camera: aiCamera,
  });
  try {
    mp.runPython(PRELUDE);
  } catch (err) {
    flush();
    post({ type: 'done', ok: false, error: parsePythonError(err) });
    return;
  }
  try {
    mp.runPython(msg.code);
    flush();
    post({ type: 'done', ok: true });
  } catch (err) {
    flush();
    const info = parsePythonError(err);
    if (info.name === 'SystemExit') post({ type: 'done', ok: true });
    else post({ type: 'done', ok: false, error: info });
  }
};
