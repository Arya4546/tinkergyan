// Test harness. Mirrors src/lib/python/python.worker.ts: same engine and options, the
// same PRELUDE (read from the source, with COMPAT_MODULES filled in), the same
// compat files written to /lib, the same error parsing. stdin answers come from
// `inputs`; END (\u0004) ends sys.stdin like an empty answer in the browser.
import fs from 'node:fs';
import { reCompile, reExec } from '../../src/lib/python/js-regex.ts';
import { rewriteForEngine } from '../../src/lib/python/rewrite.ts';
const WEB = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const PKG = WEB + '/node_modules/@micropython/micropython-webassembly-pyscript';
const COMPAT = WEB + '/src/lib/python/compat/';
const src = fs.readFileSync(WEB + '/src/lib/python/python.worker.ts', 'utf8');
const index = fs.readFileSync(COMPAT + 'index.ts', 'utf8');
const COMPAT_MODULES = Object.fromEntries(
  [...index.matchAll(/^ {2}(\w+): '(\w+)',$/gm)].map((m) => [m[1], m[2]]),
);
const COMPAT_FILES = [...index.matchAll(/^ {2}'([\w.]+\.py)': \w+,$/gm)].map((m) => m[1]);
export const PRELUDE = /const PRELUDE = `([\s\S]*?)`;/
  .exec(src)[1]
  .replace('${JSON.stringify(COMPAT_MODULES)}', JSON.stringify(COMPAT_MODULES))
  .replace(/\\`/g, '`');
export const END = '\u0004';
const FRAME_RE = /File "<stdin>", line (\d+)(?:, in (\S+))?/g;
function parsePythonError(err) {
  const traceback = err instanceof Error ? err.message : String(err);
  const isPython = err instanceof Error && err.constructor?.name === 'PythonError';
  const lines = traceback.trim().split('\n');
  const last = (lines[lines.length - 1] ?? '').trim();
  let name = 'Error',
    message = last;
  const m = /^([A-Za-z_][A-Za-z0-9_.]*)(?::\s?([\s\S]*))?$/.exec(last);
  if (isPython && m) {
    name = m[1];
    message = m[2] ?? '';
  } else if (!isPython) {
    name = 'InternalError';
    message = last || 'stopped';
  }
  let line = null;
  for (const f of traceback.matchAll(FRAME_RE)) {
    if (f[2] && f[2].startsWith('_tg_')) continue;
    line = Number(f[1]);
  }
  return { name, message, line, traceback };
}
const { loadMicroPython } = await import(PKG + '/micropython.mjs');
export async function run(
  code,
  inputs = [],
  { prelude = PRELUDE, echo = true, compat = true, rewrite = true } = {},
) {
  let out = '';
  const dec = new TextDecoder();
  const sink = (d) => {
    out += typeof d === 'string' ? d : dec.decode(d, { stream: true });
  };
  const mp = await loadMicroPython({
    url: PKG + '/micropython.wasm',
    heapsize: 8 * 1024 * 1024,
    pystack: 16 * 1024,
    linebuffer: false,
    stdout: sink,
    stderr: sink,
  });
  if (compat) {
    try {
      mp.FS.mkdir('/lib');
    } catch {
      // already there
    }
    for (const f of COMPAT_FILES) mp.FS.writeFile('/lib/' + f, fs.readFileSync(COMPAT + f, 'utf8'));
  }
  // Same as ask() in python.worker.ts. Each entry of `inputs` is one answer
  // typed into the box: it may hold several lines (a paste) or be END.
  let qi = 0; // index into inputs (one entry per answer typed into the box)
  let lines = [],
    read = 0;
  let asked = 0,
    ended = false;
  const ask = (p) => {
    if (ended) return null;
    sink(p ?? '');
    let v = lines[read];
    if (v === undefined) {
      asked++;
      if (qi >= inputs.length) throw new Error('NO_MORE_INPUT (the test gave too few answers)');
      const answer = inputs[qi++];
      if (answer === END) {
        ended = true;
        return null;
      }
      lines = answer.split('\n');
      read = 0;
      v = lines[0];
    }
    read++;
    if (echo) sink(v + '\n');
    return v;
  };
  const readRest = () => {
    if (ended) return null;
    if (read >= lines.length) {
      if (qi >= inputs.length) throw new Error('NO_MORE_INPUT (the test gave too few answers)');
      const answer = inputs[qi++];
      if (answer === END) {
        ended = true;
        return null;
      }
      lines = answer.split('\n');
      read = 0;
    }
    const text = lines.slice(read).join('\n') + '\n';
    read = lines.length;
    if (echo) sink(text);
    return text;
  };
  mp.registerJsModule('tg_host', {
    can_input: true,
    sleep: () => {},
    input: (p) => ask(p),
    read_line: () => ask(''),
    read_rest: readRest,
    ai_state: () => '',
    ai_camera: () => {},
    re_compile: reCompile,
    re_exec: reExec,
  });
  mp.runPython(compat ? prelude : '');
  const t0 = performance.now();
  try {
    // As python-runner.ts does before sending the code to the worker.
    mp.runPython(rewrite ? rewriteForEngine(code) : code);
    return { ok: true, out, ms: performance.now() - t0, asked };
  } catch (e) {
    const info = parsePythonError(e);
    return { ok: info.name === 'SystemExit', out, error: info, ms: performance.now() - t0, asked };
  }
}
