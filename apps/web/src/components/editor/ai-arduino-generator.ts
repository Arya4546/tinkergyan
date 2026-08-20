/**
 * ai-arduino-generator.ts
 *
 * Blockly → C++ code generators for the AI Model Studio blocks.
 * In hardware mode, the browser AI engine sends predictions over the Serial port
 * to the connected Arduino/ESP32. These blocks generate the C++ code to read
 * and react to those Serial messages.
 */
import { arduinoGenerator, Order } from './arduino-generator';

// ── AI Vision Control ───────────────────────────────────────────────────────
// In hardware mode, starting/stopping vision doesn't run on the Arduino itself.
// The browser handles it. But if the student includes the block, we can send a
// serial command back to the browser to trigger it, or just ignore it.
// For simplicity, we can ignore it or just add a comment.
arduinoGenerator.forBlock['ai_turn_vision'] = function (block) {
  const state = block.getFieldValue('STATE') as string;
  // We just add a comment, the actual vision control should be done from the UI
  // or we could send a command like Serial.println("AI:START");
  return `// AI Vision ${state} (handled by browser)\nSerial.println("AI_VISION:${state}");\n`;
};

// ── AI Event (Hat) Block ────────────────────────────────────────────────────
// Arduino doesn't have event listeners. We convert this into a polling check
// that we inject into the global definitions, and the student needs to call
// a generated check function in loop(), OR we can just generate a standalone
// function. However, the standard Tinkergyan way for hardware is polling in loop.
// Since it's a hat block, it generates a standalone function.
arduinoGenerator.forBlock['ai_when_predicted'] = function (block, generator) {
  const label = block.getFieldValue('LABEL') as string;
  const nextBlock = block.getNextBlock();
  const body = nextBlock ? (generator.blockToCode(nextBlock) as string) : '';

  // We create a global function for this event
  const funcName = `on_ai_predict_${label.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Add the Serial reading logic to global definitions if not added yet
  if (!(arduinoGenerator as any).definitions_['ai_serial_reader']) {
    (arduinoGenerator as any).definitions_['ai_serial_var_pred'] =
      `String __ai_current_prediction = "";`;
    (arduinoGenerator as any).definitions_['ai_serial_var_audio'] = `String __ai_latest_word = "";`;

    (arduinoGenerator as any).definitions_['ai_serial_reader'] = `
void updateAISerial() {
  if (Serial.available() > 0) {
    String msg = Serial.readStringUntil('\\n');
    msg.trim();
    if (msg.startsWith("AI_PRED:")) {
      __ai_current_prediction = msg.substring(8);
    } else if (msg.startsWith("AI_AUDIO:")) {
      __ai_latest_word = msg.substring(9);
    }
  }
}
`.trim();
  }

  // The hat block code itself:
  // In a real Arduino environment without an RTOS, we can't easily auto-hook into loop().
  // We generate the function, but it's up to the framework to call it, or we rely
  // on the user using the reporter blocks instead in their loop.
  // To make hat blocks work in Arduino, we'd need to inject into loop().
  // For now, we generate a function.
  const code = `
void ${funcName}() {
  if (__ai_current_prediction == "${label}") {
${body}
  }
}
`.trim();

  (arduinoGenerator as any).definitions_[`ai_hat_${funcName}`] = code;
  return null; // Hat blocks don't return inline code in the main flow
};

// ── AI Reporters ────────────────────────────────────────────────────────────

arduinoGenerator.forBlock['ai_current_prediction'] = function () {
  // Ensure the reader is included
  if (!(arduinoGenerator as any).definitions_['ai_serial_reader']) {
    (arduinoGenerator as any).definitions_['ai_serial_var_pred'] =
      `String __ai_current_prediction = "";`;
    (arduinoGenerator as any).definitions_['ai_serial_var_audio'] = `String __ai_latest_word = "";`;
    (arduinoGenerator as any).definitions_['ai_serial_reader'] = `
void updateAISerial() {
  if (Serial.available() > 0) {
    String msg = Serial.readStringUntil('\\n');
    msg.trim();
    if (msg.startsWith("AI_PRED:")) {
      __ai_current_prediction = msg.substring(8);
    } else if (msg.startsWith("AI_AUDIO:")) {
      __ai_latest_word = msg.substring(9);
    }
  }
}
`.trim();
  }
  const code = `
([]() -> String {
  updateAISerial();
  return __ai_current_prediction;
})()
`.trim();
  return [code, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_confidence_of'] = function (block) {
  // In hardware mode, sending full confidence array is too much serial traffic.
  // We return 100 if it's the current prediction, 0 otherwise for simplicity,
  // or we can expect the browser to send confidences like AI_CONF:ClassA:80
  const label = block.getFieldValue('LABEL') as string;
  const code = `(__ai_current_prediction == "${label}" ? 100 : 0)`;
  return [code, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_is_predicting'] = function (block) {
  const label = block.getFieldValue('LABEL') as string;
  const code = `
([]() -> bool {
  updateAISerial();
  return (__ai_current_prediction == "${label}");
})()
`.trim();
  return [code, Order.ATOMIC];
};

// ── Phase 3: Pose Detection Blocks ──────────────────────────────────────────
// Sending 34 float coordinates over 9600 baud serial chokes most Arduino UNOs.
// Pose blocks are currently Software Mode only. These return 0.0 in Hardware Mode.

arduinoGenerator.forBlock['ai_pose_x'] = function () {
  return [`/* Pose not supported on Hardware */ 0.0`, Order.ATOMIC];
};

arduinoGenerator.forBlock['ai_pose_y'] = function () {
  return [`/* Pose not supported on Hardware */ 0.0`, Order.ATOMIC];
};

// ── Phase 3: Audio Classification Blocks ────────────────────────────────────

arduinoGenerator.forBlock['ai_audio_listen'] = function (block) {
  const state = block.getFieldValue('STATE') as string;
  return `// AI Audio ${state} (handled by browser)\nSerial.println("AI_AUDIO_CTRL:${state}");\n`;
};

arduinoGenerator.forBlock['ai_when_hear_word'] = function (block, generator) {
  const word = block.getFieldValue('WORD') as string;
  const nextBlock = block.getNextBlock();
  const body = nextBlock ? (generator.blockToCode(nextBlock) as string) : '';

  const funcName = `on_ai_hear_${word}`;

  if (!(arduinoGenerator as any).definitions_['ai_serial_reader']) {
    (arduinoGenerator as any).definitions_['ai_serial_var_pred'] =
      `String __ai_current_prediction = "";`;
    (arduinoGenerator as any).definitions_['ai_serial_var_audio'] = `String __ai_latest_word = "";`;
    (arduinoGenerator as any).definitions_['ai_serial_reader'] = `
void updateAISerial() {
  if (Serial.available() > 0) {
    String msg = Serial.readStringUntil('\\n');
    msg.trim();
    if (msg.startsWith("AI_PRED:")) {
      __ai_current_prediction = msg.substring(8);
    } else if (msg.startsWith("AI_AUDIO:")) {
      __ai_latest_word = msg.substring(9);
    }
  }
}
`.trim();
  }

  const code = `
void ${funcName}() {
  if (__ai_latest_word == "${word}") {
${body}
  }
}
`.trim();

  (arduinoGenerator as any).definitions_[`ai_hat_${funcName}`] = code;
  return null;
};

arduinoGenerator.forBlock['ai_latest_word'] = function () {
  if (!(arduinoGenerator as any).definitions_['ai_serial_reader']) {
    (arduinoGenerator as any).definitions_['ai_serial_var_pred'] =
      `String __ai_current_prediction = "";`;
    (arduinoGenerator as any).definitions_['ai_serial_var_audio'] = `String __ai_latest_word = "";`;
    (arduinoGenerator as any).definitions_['ai_serial_reader'] = `
void updateAISerial() {
  if (Serial.available() > 0) {
    String msg = Serial.readStringUntil('\\n');
    msg.trim();
    if (msg.startsWith("AI_PRED:")) {
      __ai_current_prediction = msg.substring(8);
    } else if (msg.startsWith("AI_AUDIO:")) {
      __ai_latest_word = msg.substring(9);
    }
  }
}
`.trim();
  }
  const code = `
([]() -> String {
  updateAISerial();
  return __ai_latest_word;
})()
`.trim();
  return [code, Order.ATOMIC];
};

// ── Emotion Detection ────────────────────────────────────────────────────────
// Browser sends: AI_EMOTION:<label>\n over Serial

const ensureEmotionSerial = () => {
  if ((arduinoGenerator as any).definitions_['ai_emotion_var']) return;
  (arduinoGenerator as any).definitions_['ai_emotion_var'] = `String __ai_emotion = "";`;
  // Merge into existing updateAISerial or create new one
  if (!(arduinoGenerator as any).definitions_['ai_serial_reader']) {
    (arduinoGenerator as any).definitions_['ai_serial_var_pred'] =
      `String __ai_current_prediction = "";`;
    (arduinoGenerator as any).definitions_['ai_serial_var_audio'] = `String __ai_latest_word = "";`;
    (arduinoGenerator as any).definitions_['ai_serial_reader'] = `
void updateAISerial() {
  if (Serial.available() > 0) {
    String msg = Serial.readStringUntil('\\n');
    msg.trim();
    if (msg.startsWith("AI_PRED:")) { __ai_current_prediction = msg.substring(8); }
    else if (msg.startsWith("AI_AUDIO:")) { __ai_latest_word = msg.substring(9); }
    else if (msg.startsWith("AI_EMOTION:")) { __ai_emotion = msg.substring(11); }
  }
}
`.trim();
  }
};

arduinoGenerator.forBlock['ai_turn_emotion'] = function (block) {
  const state = block.getFieldValue('STATE') as string;
  return `Serial.println("AI_EMOTION_CTRL:${state}");\n`;
};

arduinoGenerator.forBlock['ai_when_emotion'] = function (block, generator) {
  const emotion = block.getFieldValue('EMOTION') as string;
  const nextBlock = block.getNextBlock();
  const body = nextBlock ? (generator.blockToCode(nextBlock) as string) : '';
  ensureEmotionSerial();
  const funcName = `on_ai_emotion_${emotion}`;
  const code = `
void ${funcName}() {
  if (__ai_emotion == "${emotion}") {
${body}  }
}
`.trim();
  (arduinoGenerator as any).definitions_[`ai_hat_${funcName}`] = code;
  return null;
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
// Browser sends: AI_HAND:<gesture>,<x>,<y>\n

const ensureHandSerial = () => {
  if ((arduinoGenerator as any).definitions_['ai_hand_vars']) return;
  (arduinoGenerator as any).definitions_['ai_hand_vars'] =
    `String __ai_hand_gesture = "";\nfloat __ai_hand_x = 0.0;\nfloat __ai_hand_y = 0.0;`;
};

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
  const gesture = block.getFieldValue('GESTURE') as string;
  const nextBlock = block.getNextBlock();
  const body = nextBlock ? (generator.blockToCode(nextBlock) as string) : '';
  ensureHandSerial();
  const funcName = `on_ai_hand_${gesture}`;
  const code = `
void ${funcName}() {
  if (__ai_hand_gesture == "${gesture}") {
${body}  }
}
`.trim();
  (arduinoGenerator as any).definitions_[`ai_hat_${funcName}`] = code;
  return null;
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
// Sends AI_SAY:<text>\n to browser, which speaks it aloud

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
