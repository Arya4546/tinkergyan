/**
 * arduino-sim-generator.ts
 *
 * Compiles the hardware blocks into JavaScript that drives ArduinoSimEngine —
 * the same trick scratch-generator.ts plays for the Scratch blocks, and the
 * reason simulation works on every board: we know exactly what each block
 * means, so we can run it directly instead of emulating a CPU to find out.
 *
 * Note this is a *second* consumer of Blockly's shared `javascriptGenerator`.
 * That is safe here: block type names never collide (`arduino_*` vs
 * `scratch_*`), and unlike the Scratch generator this one needs no `scrub_`
 * override, because `arduino_program` has neither a previous nor a next
 * connection — nothing can chain after it, so Blockly never tries.
 *
 * Every standard block in the hardware toolbox (logic, loops, math, text,
 * lists, variables, procedures) already ships a JavaScript generator, so the
 * 11 handlers below are the entire job.
 */
import { javascriptGenerator, Order } from 'blockly/javascript';
import type { Workspace } from 'blockly/core';
import {
  PROCEDURE_DEF_TYPES,
  installAsyncProcedureCalls,
  markProcedureDefinitionsAsync,
} from './blockly-async-procedures';

installAsyncProcedureCalls();

/**
 * Statement blocks all emit `await`, including ones that look instantaneous
 * like digitalWrite.
 *
 * That is deliberate: every await is a yield point, which is what lets Stop
 * actually stop a running sketch mid-`loop()`. The Scratch engine learned this
 * the hard way — a `forever` loop whose body happened to be parked in an
 * un-awaited call sailed straight through the abort and kept running.
 */

// ─── STRUCTURE ──────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['arduino_program'] = function (block, generator) {
  const setup = generator.statementToCode(block, 'SETUP');
  const loop = generator.statementToCode(block, 'LOOP');
  return `api.onSetup(async () => {\n${setup}});\napi.onLoop(async () => {\n${loop}});\n`;
};

// ─── DIGITAL I/O ────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['arduino_pin_mode'] = function (block) {
  const pin = block.getFieldValue('PIN') as string;
  const mode = block.getFieldValue('MODE') as string;
  return `await api.pinMode(${JSON.stringify(pin)}, ${JSON.stringify(mode)});\n`;
};

javascriptGenerator.forBlock['arduino_digital_write'] = function (block) {
  const pin = block.getFieldValue('PIN') as string;
  const value = block.getFieldValue('VALUE') as string;
  return `await api.digitalWrite(${JSON.stringify(pin)}, ${JSON.stringify(value)});\n`;
};

javascriptGenerator.forBlock['arduino_digital_read'] = function (block) {
  const pin = block.getFieldValue('PIN') as string;
  return [`(await api.digitalRead(${JSON.stringify(pin)}))`, Order.FUNCTION_CALL];
};

// ─── ANALOG I/O ─────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['arduino_analog_write'] = function (block, generator) {
  const pin = block.getFieldValue('PIN') as string;
  const value = generator.valueToCode(block, 'VALUE', Order.NONE) || '0';
  return `await api.analogWrite(${JSON.stringify(pin)}, ${value});\n`;
};

javascriptGenerator.forBlock['arduino_analog_read'] = function (block) {
  const pin = block.getFieldValue('PIN') as string;
  return [`(await api.analogRead(${JSON.stringify(pin)}))`, Order.FUNCTION_CALL];
};

// ─── TIMING ─────────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['arduino_delay'] = function (block, generator) {
  // Input is DELAY_TIME with a TIME_UNIT dropdown (ms / μs / s) — mirrors
  // arduino-generator.ts, which is the source of truth for these field names.
  const time = generator.valueToCode(block, 'DELAY_TIME', Order.ATOMIC) || '0';
  const unit = block.getFieldValue('TIME_UNIT') as string;
  if (unit === 'sec') return `await api.delay((${time}) * 1000);\n`;
  // Microseconds are converted to fractional milliseconds. The browser cannot
  // actually sleep for 500µs, so sub-millisecond delays round to roughly
  // nothing — same as on hardware, where delayMicroseconds is a busy-wait far
  // shorter than anything a student can perceive.
  if (unit === 'micro') return `await api.delay((${time}) / 1000);\n`;
  return `await api.delay(${time});\n`;
};

javascriptGenerator.forBlock['arduino_millis'] = function () {
  return [`api.millis()`, Order.FUNCTION_CALL];
};

// ─── SERIAL ─────────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['arduino_serial_begin'] = function (block) {
  const baud = block.getFieldValue('BAUD') as string;
  return `await api.serialBegin(${Number(baud) || 9600});\n`;
};

javascriptGenerator.forBlock['arduino_serial_print'] = function (block, generator) {
  const value = generator.valueToCode(block, 'VALUE', Order.NONE) || '""';
  return `await api.serialPrint(${value});\n`;
};

javascriptGenerator.forBlock['arduino_serial_println'] = function (block, generator) {
  const value = generator.valueToCode(block, 'VALUE', Order.NONE) || '""';
  return `await api.serialPrintln(${value});\n`;
};

/**
 * Generates the runnable JavaScript for a hardware workspace.
 *
 * Compiles `arduino_program` plus any custom block definitions. Other loose
 * blocks are ignored exactly as they are by the C++ generator — on real
 * hardware, code outside setup()/loop() never runs either, and silently
 * executing it here would teach the wrong mental model. Definitions are the
 * exception because they are declarations, not code that runs on its own.
 */
export function workspaceToArduinoSimCode(workspace: Workspace): string {
  /**
   * Yield inside every loop body, so a runaway loop cannot freeze the tab.
   *
   * The Arduino blocks all emit `await`, but the standard Blockly loops do not:
   * `repeat 1000000 [ set count to count + 1 ]` compiles to a plain `for` with
   * no await anywhere, which blocks the main thread until it finishes — and
   * `repeat while true` with no hardware block inside never finishes at all.
   * A child writing that is not doing anything wrong; the page just dies.
   *
   * INFINITE_LOOP_TRAP is Blockly's own hook for this: it injects the given
   * code at the top of every loop body, so we get an abort check and a periodic
   * yield in exactly the places that need one. `api.tick()` is nearly free when
   * the loop is short — it only actually yields every 16ms.
   */
  javascriptGenerator.INFINITE_LOOP_TRAP = 'await api.tick();\n';

  javascriptGenerator.init(workspace);
  let code = '';

  for (const block of workspace.getTopBlocks(true)) {
    const isProgram = block.type === 'arduino_program';
    // Definitions must be visited or they never reach the output at all: a
    // custom block's body lives on its own top-level definition block, so
    // skipping it left the *call* emitted with no function behind it and the
    // sketch died on "flashOnce is not defined".
    if (!isProgram && !PROCEDURE_DEF_TYPES.has(block.type)) continue;
    try {
      const blockCode = javascriptGenerator.blockToCode(block);
      // Definition blocks return null — they register themselves into the
      // generator's definition table, which finish() prepends below.
      if (isProgram && typeof blockCode === 'string') code += blockCode;
    } catch (e) {
      console.error('Failed to generate simulator code for block:', e);
    }
  }

  markProcedureDefinitionsAsync();

  return javascriptGenerator.finish(code);
}
