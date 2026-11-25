/*
 * py-sync-sw.js — the "pause" button for Python running in the browser.
 *
 * Student Python runs inside a Web Worker. When the program calls input() or
 * time.sleep(), the worker has to stop and wait — but JavaScript in a worker
 * cannot simply wait for a message. Instead the worker makes a *synchronous*
 * request to /__py_sync__/..., which this service worker holds open until:
 *   • sleep — the requested time has passed (no CPU spent spinning), or
 *   • wait  — the page sends the student's typed answer.
 * It also keeps the latest value the page publishes for a key (the AI model's
 * current prediction), so `ai.label()` can read it without waiting.
 *
 * This is the same technique futurecoder and PyScript use when the page is not
 * cross-origin isolated (no SharedArrayBuffer).
 *
 * Only URLs under /__py_sync__/ are touched. Every other request falls through
 * to the network exactly as if this service worker did not exist.
 */
const PREFIX = '/__py_sync__/';
// Browsers stop a service worker whose fetch event runs too long (Chrome ~5 min),
// so a long wait is answered with "retry" well before that and the worker asks again.
const MAX_HOLD_MS = 20000;

/** id -> resolve function of a held /wait request */
const waiting = new Map();
/** id -> answer that arrived before the worker's /wait request did */
const early = new Map();
/** key -> latest value published by the page (e.g. 'ai' -> prediction JSON) */
const state = new Map();
const MAX_STATE_LENGTH = 65536;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'py-sync-state' && typeof data.key === 'string') {
    if (typeof data.value === 'string' && data.value.length <= MAX_STATE_LENGTH) {
      // One key per tab; a tab closed mid-run never clears its own, so keep
      // only the most recent few.
      state.delete(data.key);
      state.set(data.key, data.value);
      while (state.size > 32) state.delete(state.keys().next().value);
    } else {
      state.delete(data.key);
    }
    return;
  }
  if (data.type !== 'py-sync-reply' || typeof data.id !== 'string') return;
  const value = typeof data.value === 'string' ? data.value : '';
  const resolve = waiting.get(data.id);
  if (resolve) {
    waiting.delete(data.id);
    resolve(value);
  } else {
    early.set(data.id, value);
    // Never let an answer nobody collects pile up.
    setTimeout(() => early.delete(data.id), 60000);
  }
});

function text(body, status) {
  return new Response(body, {
    status: status || 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

self.addEventListener('fetch', (event) => {
  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) return;

  const action = url.pathname.slice(PREFIX.length);

  if (action === 'ping') {
    event.respondWith(text('pong'));
    return;
  }

  if (action === 'state') {
    const key = url.searchParams.get('key') || '';
    event.respondWith(text('v:' + (state.get(key) || '')));
    return;
  }

  if (action === 'sleep') {
    const ms = Math.min(Math.max(Number(url.searchParams.get('ms')) || 0, 0), MAX_HOLD_MS);
    event.respondWith(new Promise((resolve) => setTimeout(() => resolve(text('ok')), ms)));
    return;
  }

  if (action === 'wait') {
    const id = url.searchParams.get('id') || '';
    if (early.has(id)) {
      const value = early.get(id);
      early.delete(id);
      event.respondWith(text('v:' + value));
      return;
    }
    event.respondWith(
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (waiting.get(id) === done) waiting.delete(id);
          resolve(text('retry'));
        }, MAX_HOLD_MS);
        function done(value) {
          clearTimeout(timer);
          resolve(text('v:' + value));
        }
        waiting.set(id, done);
      }),
    );
    return;
  }

  event.respondWith(text('unknown', 404));
});
