/**
 * blockly-async-procedures.ts
 *
 * Makes Blockly's "My Blocks" (custom procedures) work in generators whose API
 * is asynchronous — which is both of ours, the Scratch engine and the Arduino
 * simulator.
 *
 * Two things break without this, and they break loudly:
 *
 *   1. A procedure *definition* lives on its own top-level block. Both
 *      generators walk only their own root blocks (hats / arduino_program), so
 *      the definition was never visited and never emitted — while the call site
 *      still was. The sketch died on "flashOnce is not defined".
 *
 *   2. A procedure containing any hardware or motion block compiles to a body
 *      with `await` in it. Inside a plain `function` that is a *syntax* error,
 *      so the entire program fails to parse — not just that one block.
 *
 * Both generators share Blockly's single `javascriptGenerator` instance, so the
 * call-site patch below is installed once and applies to both. It lives here
 * rather than in either generator to make that shared effect obvious instead of
 * an accident of import order.
 */
import { javascriptGenerator, Order } from 'blockly/javascript';

/** Top-level block types that declare a custom block rather than run code. */
export const PROCEDURE_DEF_TYPES = new Set(['procedures_defnoreturn', 'procedures_defreturn']);

let installed = false;

/**
 * Awaits every call to a custom block.
 *
 * Awaiting unconditionally is safe: `await` on a non-promise simply yields the
 * value, so procedures that happen to contain nothing async still behave.
 */
export function installAsyncProcedureCalls(): void {
  if (installed) return;
  installed = true;

  for (const type of ['procedures_callnoreturn', 'procedures_callreturn'] as const) {
    const original = javascriptGenerator.forBlock[type];
    if (!original) continue;
    javascriptGenerator.forBlock[type] = function (block, generator) {
      const out = original.call(this, block, generator);
      // Blockly implements callnoreturn by delegating to callreturn, so without
      // this guard the awaited-once result gets awaited a second time.
      if (typeof out === 'string') {
        return /^\s*\(?await\b/.test(out) ? out : out.replace(/^(\s*)/, '$1await ');
      }
      if (Array.isArray(out)) {
        const [expr, order] = out as [string, Order];
        return /^\s*\(?await\b/.test(expr)
          ? ([expr, order] as [string, Order])
          : ([`(await ${expr})`, Order.AWAIT] as [string, Order]);
      }
      return out;
    };
  }
}

/**
 * Turns `function foo()` into `async function foo()` for any generated
 * definition that awaits something. Call after generating, before `finish()`.
 *
 * Keyed on the body actually containing `await` rather than on "is it a user
 * procedure", because Blockly's own helper functions (mathRandomInt and
 * friends) live in the same table and are called for their return value.
 * Making those async would hand every caller a Promise instead of a number.
 */
export function markProcedureDefinitionsAsync(): void {
  const defs = (javascriptGenerator as unknown as { definitions_?: Record<string, string> })
    .definitions_;
  if (!defs) return;
  for (const [key, value] of Object.entries(defs)) {
    if (typeof value !== 'string') continue;
    if (!value.startsWith('function ') || !/\bawait\b/.test(value)) continue;
    defs[key] = `async ${value}`;
  }
}
