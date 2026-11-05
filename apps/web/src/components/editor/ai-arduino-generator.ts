/**
 * ai-arduino-generator.ts
 *
 * Blockly → C++ code generators for the AI Model Studio blocks.
 * In hardware mode, the browser AI engine sends predictions over the Serial port
 * to the connected Arduino/ESP32. These blocks generate the C++ code to read
 * and react to those Serial messages.
 */
import { arduinoGenerator, Order } from './arduino-generator';

type GenDefs = Record<string, string>;

function defs(): GenDefs {
  return (arduinoGenerator as any).definitions_ as GenDefs;
}

/** Escape a label so it is safe inside a C++ double-quoted string literal. */
function escapeCString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Ensure a single shared updateAISerial() reader exists and covers every AI
 * serial protocol we emit (PRED / AUDIO / EMOTION / HAND). Uses `(char)10`
 * instead of a `'\n'` char literal so template-literal escaping can never
 * split the line into an unterminated quote (the "missing terminating '
 * character" build error students hit on ESP32/Uno with AI blocks).
 */
function ensureUpdateAISerial(options?: { emotion?: boolean; hand?: boolean }): void {
  const d = defs();
  if (!d['ai_serial_var_pred']) d['ai_serial_var_pred'] = 'String __ai_current_prediction = "";';
  if (!d['ai_serial_var_audio']) d['ai_serial_var_audio'] = 'String __ai_latest_word = "";';
  if (options?.emotion && !d['ai_emotion_var']) d['ai_emotion_var'] = 'String __ai_emotion = "";';
  if (options?.hand && !d['ai_hand_vars']) {
    d['ai_hand_vars'] =
      'String __ai_hand_gesture = "";\nfloat __ai_hand_x = 0.0;\nfloat __ai_hand_y = 0.0;';
  }

  // Rebuild every time so later emotion/hand blocks merge into the same reader
  // instead of silently no-op'ing when a vision block already defined it.
  const wantsEmotion = !!d['ai_emotion_var'];
  const wantsHand = !!d['ai_hand_vars'];

  const emotionBranch = wantsEmotion
    ? `\n    else if (msg.startsWith("AI_EMOTION:")) { __ai_emotion = msg.substring(11); }`
    : '';
  const handBranch = wantsHand
    ? `
    else if (msg.startsWith("AI_HAND:")) {
      String payload = msg.substring(8);
      int c1 = payload.indexOf(',');
      int c2 = payload.indexOf(',', c1 + 1);
      if (c1 > 0 && c2 > c1) {
        __ai_hand_gesture = payload.substring(0, c1);
        __ai_hand_x = payload.substring(c1 + 1, c2).toFloat();
        __ai_hand_y = payload.substring(c2 + 1).toFloat();
      }
    }`
    : '';

  // Delete before reassign so the rebuilt function is inserted *after* any
  // newly added globals (emotion/hand). Object.values() preserves insertion
  // order — overwriting in place can emit updateAISerial() before the vars
  // it references, which fails to compile on ESP32/Uno.
  delete d['ai_serial_reader'];
  d['ai_serial_reader'] = `
void updateAISerial() {
  while (Serial.available() > 0) {
    String msg = Serial.readStringUntil((char)10);
    msg.trim();
    if (msg.startsWith("AI_PRED:")) {
      __ai_current_prediction = msg.substring(8);
    } else if (msg.startsWith("AI_AUDIO:")) {
      __ai_latest_word = msg.substring(9);
    }${emotionBranch}${handBranch}
  }
}
`.trim();
}

// ── AI Vision Control ───────────────────────────────────────────────────────
arduinoGenerator.forBlock['ai_turn_vision'] = function (block) {
  const state = block.getFieldValue('STATE') as string;
  return `// AI Vision ${state} (handled by browser)\nSerial.println("AI_VISION:${state}");\n`;
};

// ── AI Event (Hat) Block ────────────────────────────────────────────────────
arduinoGenerator.forBlock['ai_when_predicted'] = function (block, generator) {
  const label = escapeCString(block.getFieldValue('LABEL') as string);
  const body = generator.statementToCode(block, 'DO');
  ensureUpdateAISerial();
  return `updateAISerial();\nif (__ai_current_prediction == "${label}") {\n${body}}\n`;
};

arduinoGenerator.forBlock['ai_latest_word'] = function () {
  ensureUpdateAISerial();
  const d = defs();
  if (!d['ai_latest_word_fn']) {
    d['ai_latest_word_fn'] = `
String aiLatestWord() {
  updateAISerial();
  return __ai_latest_word;
}
`.trim();
  }
  return [`aiLatestWord()`, Order.ATOMIC];
};

// ── Emotion Detection ────────────────────────────────────────────────────────
const ensureEmotionSerial = () => ensureUpdateAISerial({ emotion: true });

arduinoGenerator.forBlock['ai_turn_emotion'] = function (block) {
  const state = block.getFieldValue('STATE') as string;
  return `Serial.println("AI_EMOTION_CTRL:${state}");\n`;
};

arduinoGenerator.forBlock['ai_when_emotion'] = function (block, generator) {
  const emotion = escapeCString(block.getFieldValue('EMOTION') as string);
  const body = generator.statementToCode(block, 'DO');
  ensureEmotionSerial();
  return `updateAISerial();\nif (__ai_emotion == "${emotion}") {\n${body}}\n`;
};

arduinoGenerator.forBlock['ai_emotion_detected'] = function () {
  ensureEmotionSerial();
  return [`__ai_emotion`, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_emotion_confidence'] = function () {
  return [`/* Emotion confidence not available on hardware */ 0`, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_face_detected'] = function () {
  ensureEmotionSerial();
  return [`(__ai_emotion != "")`, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_face_position'] = function () {
  return [`/* Face position not available on hardware */ 0.0`, Order.ATOMIC];
};

// ── Hand Tracking ────────────────────────────────────────────────────────────
const ensureHandSerial = () => ensureUpdateAISerial({ hand: true });

arduinoGenerator.forBlock['ai_turn_hand_tracking'] = function (block) {
  const state = block.getFieldValue('STATE') as string;
  return `Serial.println("AI_HAND_CTRL:${state}");\n`;
};

arduinoGenerator.forBlock['ai_hand_x'] = function () {
  ensureHandSerial();
  return [`__ai_hand_x`, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_hand_y'] = function () {
  ensureHandSerial();
  return [`__ai_hand_y`, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_hand_gesture'] = function () {
  ensureHandSerial();
  return [`__ai_hand_gesture`, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_hand_detected'] = function () {
  ensureHandSerial();
  return [`(__ai_hand_gesture != "")`, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_when_hand_gesture'] = function (block, generator) {
  const gesture = escapeCString(block.getFieldValue('GESTURE') as string);
  const body = generator.statementToCode(block, 'DO');
  ensureHandSerial();
  return `updateAISerial();\nif (__ai_hand_gesture == "${gesture}") {\n${body}}\n`;
};

// ── Speech-to-Text ───────────────────────────────────────────────────────────

arduinoGenerator.forBlock['ai_speech_listen'] = function () {
  return `Serial.println("AI_STT_CTRL:ON");\n`;
};

arduinoGenerator.forBlock['ai_speech_stop'] = function () {
  return `Serial.println("AI_STT_CTRL:OFF");\n`;
};

arduinoGenerator.forBlock['ai_speech_heard'] = function () {
  return [`/* STT not available on hardware — use AI_STT: serial messages */ ""`, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_when_speech_contains'] = function () {
  return `/* STT hat blocks not supported on hardware */\n`;
};

// ── Text-to-Speech ───────────────────────────────────────────────────────────

arduinoGenerator.forBlock['ai_speak'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', Order.NONE) || '""';
  return `Serial.print("AI_SAY:"); Serial.println(${text});\n`;
};

arduinoGenerator.forBlock['ai_speak_in_lang'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', Order.NONE) || '""';
  return `Serial.print("AI_SAY:"); Serial.println(${text});\n`;
};

arduinoGenerator.forBlock['ai_set_speech_speed'] = function () {
  return `/* Speech speed not configurable on hardware */\n`;
};

arduinoGenerator.forBlock['ai_stop_speaking'] = function () {
  return `Serial.println("AI_SAY_STOP");\n`;
};

// ── Text Classification ──────────────────────────────────────────────────────

arduinoGenerator.forBlock['ai_classify_text'] = function () {
  return [`/* Text classification not supported on hardware */ ""`, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_when_text_classified'] = function () {
  return `/* Text classification not supported on hardware */\n`;
};
