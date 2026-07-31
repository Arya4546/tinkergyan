import { javascriptGenerator, Order } from 'blockly/javascript';
import type { Block, Workspace } from 'blockly/core';
import {
  PROCEDURE_DEF_TYPES,
  installAsyncProcedureCalls,
  markProcedureDefinitionsAsync,
} from './blockly-async-procedures';

installAsyncProcedureCalls();

// ─── EVENTS ─────────────────────────────────────────────────────────────────

// Every "hat" block type — each compiles its body into a registered callback
// rather than inline code, so Blockly's default next-block chaining must be
// suppressed for all of them (see the scrub_ override below).
const HAT_BLOCK_TYPES = new Set([
  'scratch_event_when_flag_clicked',
  'scratch_event_when_key_pressed',
  'scratch_event_when_sprite_clicked',
  'scratch_event_when_i_receive',
]);

const getBodyCode = (block: Block): string => {
  const nextBlock = block.getNextBlock();
  return nextBlock ? (javascriptGenerator.blockToCode(nextBlock) as string) : '';
};

javascriptGenerator.forBlock['scratch_event_when_flag_clicked'] = function (block) {
  return `api.onGreenFlag(async () => {\n${getBodyCode(block)}});\n`;
};

javascriptGenerator.forBlock['scratch_event_when_key_pressed'] = function (block) {
  const key = block.getFieldValue('KEY') as string;
  return `api.onKeyPressed('${key}', async () => {\n${getBodyCode(block)}});\n`;
};

javascriptGenerator.forBlock['scratch_event_when_sprite_clicked'] = function (block) {
  return `api.onSpriteClicked(async () => {\n${getBodyCode(block)}});\n`;
};

javascriptGenerator.forBlock['scratch_event_when_i_receive'] = function (block) {
  const message = block.getFieldValue('MESSAGE') as string;
  return `api.onReceive(${JSON.stringify(message)}, async () => {\n${getBodyCode(block)}});\n`;
};

javascriptGenerator.forBlock['scratch_event_broadcast'] = function (block) {
  const message = block.getFieldValue('MESSAGE') as string;
  return `await api.broadcast(${JSON.stringify(message)});\n`;
};

javascriptGenerator.forBlock['scratch_event_broadcast_and_wait'] = function (block) {
  const message = block.getFieldValue('MESSAGE') as string;
  return `await api.broadcastAndWait(${JSON.stringify(message)});\n`;
};

// Override scrub_ to prevent next blocks from being appended at the top level for hat blocks
const originalScrub = javascriptGenerator.scrub_.bind(javascriptGenerator);
javascriptGenerator.scrub_ = function (block, code, opt_thisOnly) {
  if (HAT_BLOCK_TYPES.has(block.type)) {
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

javascriptGenerator.forBlock['scratch_motion_turn_left'] = function (block, generator) {
  const degrees = generator.valueToCode(block, 'DEGREES', Order.NONE) || '0';
  return `await api.turn(-(${degrees}));\n`;
};

javascriptGenerator.forBlock['scratch_motion_glide_to'] = function (block, generator) {
  const secs = generator.valueToCode(block, 'SECS', Order.NONE) || '0';
  const x = generator.valueToCode(block, 'X', Order.NONE) || '0';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '0';
  return `await api.glideTo(${secs}, ${x}, ${y});\n`;
};

javascriptGenerator.forBlock['scratch_motion_point_in_direction'] = function (block, generator) {
  const degrees = generator.valueToCode(block, 'DEGREES', Order.NONE) || '0';
  return `await api.pointInDirection(${degrees});\n`;
};

javascriptGenerator.forBlock['scratch_motion_point_towards_mouse'] = function () {
  return `await api.pointTowardsMouse();\n`;
};

javascriptGenerator.forBlock['scratch_motion_change_x_by'] = function (block, generator) {
  const dx = generator.valueToCode(block, 'DX', Order.NONE) || '0';
  return `await api.changeXBy(${dx});\n`;
};

javascriptGenerator.forBlock['scratch_motion_set_x_to'] = function (block, generator) {
  const x = generator.valueToCode(block, 'X', Order.NONE) || '0';
  return `await api.setX(${x});\n`;
};

javascriptGenerator.forBlock['scratch_motion_change_y_by'] = function (block, generator) {
  const dy = generator.valueToCode(block, 'DY', Order.NONE) || '0';
  return `await api.changeYBy(${dy});\n`;
};

javascriptGenerator.forBlock['scratch_motion_set_y_to'] = function (block, generator) {
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '0';
  return `await api.setY(${y});\n`;
};

javascriptGenerator.forBlock['scratch_motion_if_on_edge_bounce'] = function () {
  return `await api.ifOnEdgeBounce();\n`;
};

javascriptGenerator.forBlock['scratch_motion_set_rotation_style'] = function (block) {
  const style = block.getFieldValue('STYLE') as string;
  return `await api.setRotationStyle(${JSON.stringify(style)});\n`;
};

javascriptGenerator.forBlock['scratch_motion_x_position'] = function () {
  return [`api.getX()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['scratch_motion_y_position'] = function () {
  return [`api.getY()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['scratch_motion_direction'] = function () {
  return [`api.getDirection()`, Order.FUNCTION_CALL];
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

javascriptGenerator.forBlock['scratch_looks_say'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', Order.NONE) || '""';
  return `await api.say(${text});\n`;
};

javascriptGenerator.forBlock['scratch_looks_think_for'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', Order.NONE) || '""';
  const secs = generator.valueToCode(block, 'SECS', Order.NONE) || '0';
  return `await api.thinkFor(${text}, ${secs});\n`;
};

javascriptGenerator.forBlock['scratch_looks_think'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', Order.NONE) || '""';
  return `await api.think(${text});\n`;
};

javascriptGenerator.forBlock['scratch_looks_next_costume'] = function () {
  return `await api.nextCostume();\n`;
};

javascriptGenerator.forBlock['scratch_looks_switch_backdrop_to'] = function (block) {
  const backdrop = block.getFieldValue('BACKDROP') as string;
  return `await api.switchBackdropTo(${JSON.stringify(backdrop)});\n`;
};

javascriptGenerator.forBlock['scratch_looks_next_backdrop'] = function () {
  return `await api.nextBackdrop();\n`;
};

javascriptGenerator.forBlock['scratch_looks_change_size_by'] = function (block, generator) {
  const delta = generator.valueToCode(block, 'DELTA', Order.NONE) || '0';
  return `await api.changeSizeBy(${delta});\n`;
};

javascriptGenerator.forBlock['scratch_looks_set_size_to'] = function (block, generator) {
  const size = generator.valueToCode(block, 'SIZE', Order.NONE) || '100';
  return `await api.setSizeTo(${size});\n`;
};

javascriptGenerator.forBlock['scratch_looks_change_effect_by'] = function (block, generator) {
  const effect = block.getFieldValue('EFFECT') as string;
  const delta = generator.valueToCode(block, 'DELTA', Order.NONE) || '0';
  return `await api.changeEffectBy(${JSON.stringify(effect)}, ${delta});\n`;
};

javascriptGenerator.forBlock['scratch_looks_set_effect_to'] = function (block, generator) {
  const effect = block.getFieldValue('EFFECT') as string;
  const value = generator.valueToCode(block, 'VALUE', Order.NONE) || '0';
  return `await api.setEffectTo(${JSON.stringify(effect)}, ${value});\n`;
};

javascriptGenerator.forBlock['scratch_looks_clear_graphic_effects'] = function () {
  return `await api.clearGraphicEffects();\n`;
};

javascriptGenerator.forBlock['scratch_looks_go_to_layer'] = function (block) {
  const layer = block.getFieldValue('LAYER') as string;
  return `await api.goToLayer(${JSON.stringify(layer)});\n`;
};

javascriptGenerator.forBlock['scratch_looks_change_layers'] = function (block, generator) {
  const direction = block.getFieldValue('DIRECTION') as string;
  const amount = generator.valueToCode(block, 'AMOUNT', Order.NONE) || '1';
  const sign = direction === 'backward' ? '-1' : '1';
  return `await api.changeLayers((${amount}) * ${sign});\n`;
};

javascriptGenerator.forBlock['scratch_looks_costume_number'] = function () {
  return [`api.getCostumeNumber()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['scratch_looks_size'] = function () {
  return [`api.getSize()`, Order.FUNCTION_CALL];
};

// ─── SOUND ──────────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['scratch_sound_play_until_done'] = function (block) {
  const sound = block.getFieldValue('SOUND') as string;
  return `await api.playSoundUntilDone(${JSON.stringify(sound)});\n`;
};

javascriptGenerator.forBlock['scratch_sound_start'] = function (block) {
  const sound = block.getFieldValue('SOUND') as string;
  return `await api.startSound(${JSON.stringify(sound)});\n`;
};

javascriptGenerator.forBlock['scratch_sound_stop_all'] = function () {
  return `await api.stopAllSounds();\n`;
};

javascriptGenerator.forBlock['scratch_sound_change_volume_by'] = function (block, generator) {
  const delta = generator.valueToCode(block, 'DELTA', Order.NONE) || '0';
  return `await api.changeVolumeBy(${delta});\n`;
};

javascriptGenerator.forBlock['scratch_sound_set_volume_to'] = function (block, generator) {
  const volume = generator.valueToCode(block, 'VOLUME', Order.NONE) || '100';
  return `await api.setVolumeTo(${volume});\n`;
};

javascriptGenerator.forBlock['scratch_sound_volume'] = function () {
  return [`api.getVolume()`, Order.FUNCTION_CALL];
};

// ─── CONTROL ────────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['scratch_control_wait'] = function (block, generator) {
  const secs = generator.valueToCode(block, 'SECS', Order.NONE) || '0';
  return `await api.wait(${secs});\n`;
};

javascriptGenerator.forBlock['scratch_control_forever'] = function (block, generator) {
  const body = generator.statementToCode(block, 'DO');
  return `while (true) {\n${body}  await api.yield();\n}\n`;
};

javascriptGenerator.forBlock['scratch_control_wait_until'] = function (block, generator) {
  const condition = generator.valueToCode(block, 'CONDITION', Order.NONE) || 'false';
  return `while (!(${condition})) {\n  await api.yield();\n}\n`;
};

javascriptGenerator.forBlock['scratch_control_stop'] = function () {
  // "this script" / "other scripts" are simplified to a full stop — the
  // engine runs one shared program, not per-sprite script isolation.
  return `await api.stopAll();\n`;
};

// ─── SENSING ────────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['scratch_sensing_key_pressed'] = function (block) {
  const key = block.getFieldValue('KEY') as string;
  return [`api.isKeyPressed(${JSON.stringify(key)})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['scratch_sensing_mouse_down'] = function () {
  return [`api.isMouseDown()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['scratch_sensing_mouse_x'] = function () {
  return [`api.getMouseX()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['scratch_sensing_mouse_y'] = function () {
  return [`api.getMouseY()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['scratch_sensing_timer'] = function () {
  return [`api.getTimer()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['scratch_sensing_reset_timer'] = function () {
  return `api.resetTimer();\n`;
};

javascriptGenerator.forBlock['scratch_sensing_touching_edge'] = function () {
  return [`api.isTouchingEdge()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['scratch_sensing_ask_and_wait'] = function (block, generator) {
  const question = generator.valueToCode(block, 'QUESTION', Order.NONE) || '""';
  return `await api.askAndWait(${question});\n`;
};

javascriptGenerator.forBlock['scratch_sensing_answer'] = function () {
  return [`api.getAnswer()`, Order.FUNCTION_CALL];
};

/**
 * Generates Scratch JavaScript from a Blockly workspace.
 */
export function workspaceToScratchCode(workspace: Workspace): string {
  javascriptGenerator.init(workspace);
  let code = '';
  const topBlocks = workspace.getTopBlocks(true);

  for (const block of topBlocks) {
    const isHat = HAT_BLOCK_TYPES.has(block.type);
    // Custom-block definitions sit on their own top-level block. Walking only
    // hats meant a "My Blocks" definition was never emitted while its call site
    // still was, so any script using one died on "<name> is not defined".
    if (!isHat && !PROCEDURE_DEF_TYPES.has(block.type)) continue;
    try {
      const blockCode = javascriptGenerator.blockToCode(block);
      // Definitions return null and register themselves for finish() below.
      if (isHat && typeof blockCode === 'string') {
        code += blockCode;
      }
    } catch (e) {
      console.error('Failed to generate Scratch code for block:', e);
    }
  }

  markProcedureDefinitionsAsync();

  return javascriptGenerator.finish(code);
}
