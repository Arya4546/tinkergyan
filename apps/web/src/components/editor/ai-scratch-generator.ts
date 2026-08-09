/**
 * ai-scratch-generator.ts
 *
 * Blockly → JavaScript code generators for the AI Model Studio blocks.
 * These generate calls into the ScratchEngine's `api.ai*` methods, which
 * are implemented in ScratchEngine.ts.
 */
import { javascriptGenerator, Order } from 'blockly/javascript';

// ── AI Vision Control ───────────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_turn_vision'] = function (block) {
  const state = block.getFieldValue('STATE') as string;
  return state === 'ON' ? `await api.aiStartVision();\n` : `await api.aiStopVision();\n`;
};

// ── AI Event (Hat) Block ────────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_when_predicted'] = function (block) {
  const label = block.getFieldValue('LABEL') as string;
  // Get the body the same way scratch_event_when_flag_clicked does.
  const nextBlock = block.getNextBlock();
  const body = nextBlock ? (javascriptGenerator.blockToCode(nextBlock) as string) : '';
  return `api.onAIPredicted(${JSON.stringify(label)}, async () => {\n${body}});\n`;
};

// ── AI Reporters ────────────────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_current_prediction'] = function () {
  return [`api.getAIPrediction()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_confidence_of'] = function (block) {
  const label = block.getFieldValue('LABEL') as string;
  return [`api.getAIConfidence(${JSON.stringify(label)})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_is_predicting'] = function (block) {
  const label = block.getFieldValue('LABEL') as string;
  return [`api.isAIPredicting(${JSON.stringify(label)})`, Order.FUNCTION_CALL];
};

// ── Phase 3: Pose Detection ──────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_pose_x'] = function (block) {
  const part = block.getFieldValue('PART') as string;
  return [`api.getPoseKeypoint(${JSON.stringify(part)}, 'x')`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_pose_y'] = function (block) {
  const part = block.getFieldValue('PART') as string;
  return [`api.getPoseKeypoint(${JSON.stringify(part)}, 'y')`, Order.FUNCTION_CALL];
};

// ── Phase 3: Audio Classification ──────────────────────────────────────────

javascriptGenerator.forBlock['ai_audio_listen'] = function (block) {
  const state = block.getFieldValue('STATE') as string;
  return state === 'ON'
    ? `await api.startAudioListening();\n`
    : `await api.stopAudioListening();\n`;
};

javascriptGenerator.forBlock['ai_when_hear_word'] = function (block) {
  const word = block.getFieldValue('WORD') as string;
  const nextBlock = block.getNextBlock();
  const body = nextBlock ? (javascriptGenerator.blockToCode(nextBlock) as string) : '';
  return `api.onSpeechCommand(${JSON.stringify(word)}, async () => {\n${body}});\n`;
};

javascriptGenerator.forBlock['ai_latest_word'] = function () {
  return [`api.getLatestSpeechCommand()`, Order.FUNCTION_CALL];
};
