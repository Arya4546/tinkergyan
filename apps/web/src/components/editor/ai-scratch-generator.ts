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

// ── Emotion Detection ────────────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_turn_emotion'] = function (block) {
  const state = block.getFieldValue('STATE') as string;
  return state === 'ON' ? `await api.aiStartEmotion();\n` : `await api.aiStopEmotion();\n`;
};

javascriptGenerator.forBlock['ai_when_emotion'] = function (block) {
  const emotion = block.getFieldValue('EMOTION') as string;
  const nextBlock = block.getNextBlock();
  const body = nextBlock ? (javascriptGenerator.blockToCode(nextBlock) as string) : '';
  return `api.onAIEmotion(${JSON.stringify(emotion)}, async () => {\n${body}});\n`;
};

javascriptGenerator.forBlock['ai_emotion_detected'] = function () {
  return [`api.getAIEmotion()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_emotion_confidence'] = function (block) {
  const emotion = block.getFieldValue('EMOTION') as string;
  return [`api.getAIEmotionConfidence(${JSON.stringify(emotion)})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_face_detected'] = function () {
  return [`api.isFaceDetected()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_face_position'] = function (block) {
  const axis = block.getFieldValue('AXIS') as string;
  return [`api.getFacePosition(${JSON.stringify(axis)})`, Order.FUNCTION_CALL];
};

// ── Hand / Finger Tracking ───────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_turn_hand_tracking'] = function (block) {
  const state = block.getFieldValue('STATE') as string;
  return state === 'ON'
    ? `await api.aiStartHandTracking();\n`
    : `await api.aiStopHandTracking();\n`;
};

javascriptGenerator.forBlock['ai_hand_x'] = function (block) {
  const landmark = block.getFieldValue('LANDMARK') as string;
  return [`api.getHandLandmark(${JSON.stringify(landmark)}, 'x')`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_hand_y'] = function (block) {
  const landmark = block.getFieldValue('LANDMARK') as string;
  return [`api.getHandLandmark(${JSON.stringify(landmark)}, 'y')`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_when_hand_gesture'] = function (block) {
  const gesture = block.getFieldValue('GESTURE') as string;
  const nextBlock = block.getNextBlock();
  const body = nextBlock ? (javascriptGenerator.blockToCode(nextBlock) as string) : '';
  return `api.onHandGesture(${JSON.stringify(gesture)}, async () => {\n${body}});\n`;
};

javascriptGenerator.forBlock['ai_hand_gesture'] = function () {
  return [`api.getHandGesture()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_hand_detected'] = function () {
  return [`api.isHandDetected()`, Order.FUNCTION_CALL];
};

// ── Speech-to-Text ───────────────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_speech_listen'] = function () {
  return `api.startSpeechListening();\n`;
};

javascriptGenerator.forBlock['ai_speech_stop'] = function () {
  return `api.stopSpeechListening();\n`;
};

javascriptGenerator.forBlock['ai_speech_heard'] = function () {
  return [`api.getSpeechTranscript()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_when_speech_contains'] = function (block) {
  const phrase = javascriptGenerator.valueToCode(block, 'PHRASE', Order.NONE) || '""';
  const nextBlock = block.getNextBlock();
  const body = nextBlock ? (javascriptGenerator.blockToCode(nextBlock) as string) : '';
  return `api.onSpeechContains(${phrase}, async () => {\n${body}});\n`;
};

// ── Text-to-Speech ───────────────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_speak'] = function (block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', Order.NONE) || '""';
  return `api.speak(${text});\n`;
};

javascriptGenerator.forBlock['ai_speak_in_lang'] = function (block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', Order.NONE) || '""';
  const lang = block.getFieldValue('LANG') as string;
  return `api.speak(${text}, ${JSON.stringify(lang)});\n`;
};

javascriptGenerator.forBlock['ai_set_speech_speed'] = function (block) {
  const speed = javascriptGenerator.valueToCode(block, 'SPEED', Order.NONE) || '1';
  return `api.setSpeechSpeed(${speed});\n`;
};

javascriptGenerator.forBlock['ai_stop_speaking'] = function () {
  return `api.stopSpeaking();\n`;
};

// ── Text Classification (NLP) ────────────────────────────────────────────────

javascriptGenerator.forBlock['ai_classify_text'] = function (block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', Order.NONE) || '""';
  return [`await api.classifyText(${text})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['ai_when_text_classified'] = function (block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', Order.NONE) || '""';
  const label = block.getFieldValue('LABEL') as string;
  const nextBlock = block.getNextBlock();
  const body = nextBlock ? (javascriptGenerator.blockToCode(nextBlock) as string) : '';
  return `api.onTextClassified(${text}, ${JSON.stringify(label)}, async () => {\n${body}});\n`;
};

// ─── Priority 5: AI Music Generation ───────────────────────────────────────

javascriptGenerator.forBlock['ai_generate_music'] = function (block: any, generator: any) {
  const notes = generator.valueToCode(block, 'NOTES', Order.NONE) || '[]';
  const steps = generator.valueToCode(block, 'STEPS', Order.NONE) || '20';
  const temp = generator.valueToCode(block, 'TEMP', Order.NONE) || '1.0';
  return `await api.aiPlayMusic(${notes}, ${steps}, ${temp});\n`;
};

javascriptGenerator.forBlock['ai_stop_music'] = function () {
  return 'api.aiStopMusic();\n';
};
