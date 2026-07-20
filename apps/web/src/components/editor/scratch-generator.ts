import { javascriptGenerator, Order } from 'blockly/javascript';
import type { Workspace } from 'blockly/core';

// ─── EVENTS ─────────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['scratch_event_when_flag_clicked'] = function (block, generator) {
  let nextCode = '';
  const nextBlock = block.getNextBlock();
  if (nextBlock) {
    nextCode = generator.blockToCode(nextBlock) as string;
  }
  return `api.onGreenFlag(async () => {\n${nextCode}});\n`;
};

// Override scrub_ to prevent next blocks from being appended at the top level for hat blocks
const originalScrub = javascriptGenerator.scrub_.bind(javascriptGenerator);
javascriptGenerator.scrub_ = function (block, code, opt_thisOnly) {
  if (block.type === 'scratch_event_when_flag_clicked') {
    return code; // Do not append next blocks, they are already inside the callback
  }
  return originalScrub(block, code, opt_thisOnly);
};

// ─── MOTION ─────────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['scratch_motion_move_steps'] = function (block, generator) {
  const steps = generator.valueToCode(block, 'STEPS', Order.NONE) || '0';
  return `await api.move(${steps});\n`;
};

javascriptGenerator.forBlock['scratch_motion_turn_right'] = function (block, generator) {
  const degrees = generator.valueToCode(block, 'DEGREES', Order.NONE) || '0';
  return `await api.turn(${degrees});\n`;
};

javascriptGenerator.forBlock['scratch_motion_goto'] = function (block, generator) {
  const x = generator.valueToCode(block, 'X', Order.NONE) || '0';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '0';
  return `await api.goTo(${x}, ${y});\n`;
};

// ─── LOOKS ──────────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['scratch_looks_say_for'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', Order.NONE) || '""';
  const secs = generator.valueToCode(block, 'SECS', Order.NONE) || '0';
  return `await api.sayFor(${text}, ${secs});\n`;
};

javascriptGenerator.forBlock['scratch_looks_show'] = function () {
  return `await api.show();\n`;
};

javascriptGenerator.forBlock['scratch_looks_hide'] = function () {
  return `await api.hide();\n`;
};

javascriptGenerator.forBlock['scratch_looks_switch_costume_to'] = function (block, _generator) {
  const costume = block.getFieldValue('COSTUME') as string;
  return `await api.switchCostume('${costume}');\n`;
};

/**
 * Generates Scratch JavaScript from a Blockly workspace.
 */
export function workspaceToScratchCode(workspace: Workspace): string {
  javascriptGenerator.init(workspace);
  let code = '';
  const topBlocks = workspace.getTopBlocks(true);

  for (const block of topBlocks) {
    if (block.type === 'scratch_event_when_flag_clicked') {
      try {
        const blockCode = javascriptGenerator.blockToCode(block);
        if (typeof blockCode === 'string') {
          code += blockCode;
        }
      } catch (e) {
        console.error('Failed to generate Scratch code for block:', e);
      }
    }
  }

  return javascriptGenerator.finish(code);
}
