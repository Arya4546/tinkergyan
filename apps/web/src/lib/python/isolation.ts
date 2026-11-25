/**
 * isolation.ts — keeps student programs away from the network and the site's
 * storage.
 *
 * A Python program can reach JavaScript: the engine's `js` module is the
 * worker's global scope, and any JS function it is given leads to the Function
 * constructor. The worker runs on the site's own origin, so without this a
 * program could call the API with the login of whoever pressed Run (POST
 * /api/auth/refresh sends back a fresh access token), and a project shared in
 * the Gallery could take over the account of every student who ran it.
 *
 * python.worker.ts calls lockDown() once the engine has loaded (it needs fetch
 * for that) and before any student code runs. The worker keeps its own
 * references to the two things it still needs (XMLHttpRequest for the
 * input/sleep channel, postMessage to talk to the page) where Python can't
 * reach them.
 */
export const BLOCKED_GLOBALS = [
  'fetch',
  'fetchLater',
  'XMLHttpRequest',
  'WebSocket',
  'WebSocketStream',
  'WebTransport',
  'EventSource',
  'importScripts',
  'Worker',
  'SharedWorker',
  'BroadcastChannel',
  'indexedDB',
  'caches',
  'cookieStore',
  'navigator',
  'Notification',
  'postMessage',
];

/**
 * Remove every BLOCKED_GLOBALS name from `scope` and from every object on its
 * prototype chain (in a worker, fetch lives on WorkerGlobalScope.prototype).
 */
export function lockDown(scope: object = globalThis): void {
  for (const name of BLOCKED_GLOBALS) {
    for (let obj: object | null = scope; obj; obj = Object.getPrototypeOf(obj) as object | null) {
      const desc = Object.getOwnPropertyDescriptor(obj, name);
      if (!desc) continue;
      if (desc.configurable) Reflect.deleteProperty(obj, name);
      else if (desc.writable) Reflect.set(obj, name, undefined);
    }
  }
}
