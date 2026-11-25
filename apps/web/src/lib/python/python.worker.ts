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
import type { FromWorker, PythonErrorInfo, ToWorker } from './protocol';

type EngineModule = typeof EngineNs;

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: FromWorker) => ctx.postMessage(msg);

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
    const xhr = new XMLHttpRequest();
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
// The Python side always passes str(prompt).
function input(prompt: string | undefined): string {
  write(prompt ?? '');
  flush();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${inputCounter++}`;
  post({ type: 'input', id, prompt: prompt ?? '' });
  for (;;) {
    const reply = syncGet(`wait?id=${encodeURIComponent(id)}`);
    if (reply === null) {
      throw new Error('The answer box stopped working. Press Run to start again.');
    }
    if (reply.startsWith('v:')) {
      const value = reply.slice(2);
      write(value + '\n'); // echo, like a real terminal
      flush();
      return value;
    }
    // 'retry' — the service worker answered before a long wait timed out; ask again.
  }
}

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
const PRELUDE = `
def _tg_setup():
    import sys, builtins, tg_host
    real_time = __import__('time')

    def _tg_sleep(seconds):
        tg_host.sleep(float(seconds))

    def _tg_sleep_ms(ms):
        tg_host.sleep(float(ms) / 1000)

    def _tg_sleep_us(us):
        tg_host.sleep(float(us) / 1000000)

    class _TgTime:
        sleep = staticmethod(_tg_sleep)
        sleep_ms = staticmethod(_tg_sleep_ms)
        sleep_us = staticmethod(_tg_sleep_us)
        def __getattr__(self, name):
            return getattr(real_time, name)

    sys.modules['time'] = _TgTime()
    sys.modules['utime'] = sys.modules['time']

    def _tg_input(prompt=''):
        if not tg_host.can_input:
            raise RuntimeError("Typing answers is not available in this browser window. Open TinkerGyan in a normal (not private) Chrome, Edge, Firefox or Safari window.")
        return tg_host.input(str(prompt))

    builtins.input = _tg_input

    import json

    class _TgAI:
        # Same functions as ai.py on a board (lib/python/board/ai-module.ts).
        def start_camera(self):
            tg_host.ai_camera(True)
        def stop_camera(self):
            tg_host.ai_camera(False)
        def _tg_state(self):
            if not tg_host.can_input:
                raise RuntimeError("AI needs a normal (not private) browser window. Open TinkerGyan in a normal Chrome, Edge, Firefox or Safari window.")
            raw = tg_host.ai_state()
            if not raw:
                return {}
            try:
                return json.loads(raw)
            except ValueError:
                return {}
        def label(self):
            return self._tg_state().get('l', '')
        def confidence(self, name):
            return self._tg_state().get('c', {}).get(str(name), 0)
        def labels(self):
            return list(self._tg_state().get('c', {}))

    sys.modules['ai'] = _TgAI()

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
  return loadMicroPython({
    url: wasmUrl,
    heapsize: 8 * 1024 * 1024,
    linebuffer: false,
    stdout: onBytes,
    stderr: onBytes,
  });
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
