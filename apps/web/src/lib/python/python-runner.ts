/**
 * python-runner.ts — page-side control of Python programs running in the browser.
 *
 *   const handle = runPython(code, { onOutput, onInput, onDone });
 *   handle.answer('Asha');   // reply to input()
 *   handle.stop();           // Stop button
 *
 * A fresh worker is kept warm in the background so pressing Run starts at
 * once. Each worker runs a single program and is then thrown away.
 */
import type { FromWorker, PythonErrorInfo } from './protocol';
import { rewriteForEngine } from './rewrite';

export type RunResult =
  | { status: 'ok' }
  | { status: 'stopped' }
  | { status: 'error'; error: PythonErrorInfo };

export interface RunHandlers {
  onOutput: (text: string) => void;
  /**
   * The program wants a line (input(), or sys.stdin when `eof`); call
   * handle.answer(text) to continue it. With `eof`, END_OF_INPUT ends the input.
   */
  onInput: (prompt: string, eof: boolean) => void;
  onDone: (result: RunResult) => void;
  /** The program turned the AI camera on or off. */
  onAiCamera?: (on: boolean) => void;
}

export interface RunHandle {
  answer: (text: string) => void;
  stop: () => void;
}

const START_TIMEOUT_MS = 20000;
/** How long a program may keep going after hitting the memory cap. */
const MEMORY_GRACE_MS = 2500;

export const MEMORY_LIMIT_MESSAGE =
  'Your program used too much memory (more than 64 MB), so it was stopped. Look for a list or text that keeps growing forever.';

// ── Service worker (input/sleep channel) ────────────────────────────────────
let swReady: Promise<boolean> | null = null;

function ensureServiceWorker(): Promise<boolean> {
  if (swReady) return swReady;
  swReady = (async () => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return false;
    try {
      await navigator.serviceWorker.register('/py-sync-sw.js', { scope: '/' });
      // `ready` never rejects; give up after a few seconds so Run is never stuck.
      const ready = await Promise.race([
        navigator.serviceWorker.ready.then(() => true),
        new Promise<boolean>((r) => setTimeout(() => r(false), 4000)),
      ]);
      return ready;
    } catch {
      return false; // e.g. Firefox private windows disable service workers
    }
  })();
  return swReady;
}

async function replyToServiceWorker(id: string, value: string) {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const target = navigator.serviceWorker.controller ?? reg?.active;
    target?.postMessage({ type: 'py-sync-reply', id, value });
  } catch {
    /* nothing to answer — the worker will report the problem */
  }
}

/**
 * Publish the AI model's latest prediction for `ai.label()` in a running
 * program (JSON: {"l": label, "c": {label: percent}}), or clear it with null.
 */
/** One key per tab: every tab shares the one service worker. */
const AI_KEY = `ai-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

export function publishAiState(json: string | null): void {
  void (async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration('/');
      const target = navigator.serviceWorker?.controller ?? reg?.active;
      target?.postMessage({ type: 'py-sync-state', key: AI_KEY, value: json });
    } catch {
      /* no service worker: ai.label() reports that itself */
    }
  })();
}

// ── Workers ────────────────────────────────────────────────────────────────
interface WarmWorker {
  worker: Worker;
  ready: Promise<void>;
}

let warm: WarmWorker | null = null;
/** False after disposePython(): nothing new is started in the background. */
let keepWarm = false;

function spawnWorker(): WarmWorker {
  const worker = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error('Python took too long to start. Check your internet and press Run again.'),
        ),
      START_TIMEOUT_MS,
    );
    const onMessage = (e: MessageEvent<FromWorker>) => {
      if (e.data.type === 'ready') {
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        resolve();
      } else if (e.data.type === 'fatal') {
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        reject(new Error(`Python could not start: ${e.data.message}`));
      }
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', (e) => {
      clearTimeout(timer);
      e.preventDefault();
      reject(new Error('Python could not start in this browser. Try updating your browser.'));
    });
  });
  const entry = { worker, ready };
  ready.catch(() => {
    // A worker that failed to start must not be handed to the next Run.
    if (warm === entry) warm = null;
    worker.terminate();
  });
  return entry;
}

/**
 * Start Python in the background (service worker + one warm worker). Safe to
 * call many times; call it when a Python project opens.
 */
export function prewarmPython(): void {
  keepWarm = true;
  void ensureServiceWorker().then(() => {
    if (keepWarm) warm ??= spawnWorker();
  });
}

/** Free the background worker (about 10 MB) when the student leaves Python. */
export function disposePython(): void {
  keepWarm = false;
  warm?.worker.terminate();
  warm = null;
}

function takeWorker(): WarmWorker {
  const w = warm ?? spawnWorker();
  warm = null;
  return w;
}

export function runPython(code: string, handlers: RunHandlers): RunHandle {
  let finished = false;
  let worker: Worker | null = null;
  let waitingId: string | null = null;
  let memoryTimer: ReturnType<typeof setTimeout> | null = null;

  const finish = (result: RunResult) => {
    if (finished) return;
    finished = true;
    if (memoryTimer) clearTimeout(memoryTimer);
    if (waitingId) void replyToServiceWorker(waitingId, '');
    waitingId = null;
    worker?.terminate();
    worker = null;
    handlers.onDone(result);
    if (keepWarm) prewarmPython(); // the next Run starts instantly
  };

  void (async () => {
    const syncAvailable = await ensureServiceWorker();
    if (finished) return;
    let w = takeWorker();
    worker = w.worker;
    try {
      try {
        await w.ready;
      } catch {
        // One retry with a brand-new worker: a background worker can fail for
        // reasons that are gone by now (a dropped connection, a reload).
        if (finished) return;
        w = spawnWorker();
        worker = w.worker;
        await w.ready;
      }
    } catch (err) {
      finish({
        status: 'error',
        error: {
          name: 'StartError',
          message: err instanceof Error ? err.message : String(err),
          line: null,
          traceback: '',
        },
      });
      return;
    }
    if (finished) return;
    w.worker.onmessage = (e: MessageEvent<FromWorker>) => {
      const msg = e.data;
      if (finished) return;
      if (msg.type === 'output') handlers.onOutput(msg.text);
      else if (msg.type === 'ai-camera') handlers.onAiCamera?.(msg.on);
      else if (msg.type === 'input') {
        waitingId = msg.id;
        handlers.onInput(msg.prompt, msg.eof);
      } else if (msg.type === 'memory-limit') {
        memoryTimer ??= setTimeout(
          () =>
            finish({
              status: 'error',
              error: {
                name: 'MemoryError',
                message: MEMORY_LIMIT_MESSAGE,
                line: null,
                traceback: '',
              },
            }),
          MEMORY_GRACE_MS,
        );
      } else if (msg.type === 'done') {
        finish(msg.ok ? { status: 'ok' } : { status: 'error', error: msg.error });
      }
    };
    w.worker.onerror = (e) => {
      e.preventDefault();
      finish({
        status: 'error',
        error: {
          name: 'InternalError',
          message: 'Python stopped unexpectedly. Press Run to try again.',
          line: null,
          traceback: e.message ?? '',
        },
      });
    };
    // s[::-1], @dataclass…: see rewrite.ts. Same lines, so errors still match.
    w.worker.postMessage({
      type: 'run',
      code: rewriteForEngine(code),
      syncAvailable,
      aiKey: AI_KEY,
    });
  })();

  return {
    answer(text: string) {
      if (finished || !waitingId) return;
      const id = waitingId;
      waitingId = null;
      void replyToServiceWorker(id, text);
    },
    stop() {
      finish({ status: 'stopped' });
    },
  };
}
