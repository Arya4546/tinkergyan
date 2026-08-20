/**
 * ai-blocks.ts
 *
 * Registers all custom AI Model Studio block definitions for Blockly.
 * These blocks let students interact with their trained image classifier
 * directly from the Scratch or Arduino block canvas.
 *
 * Block shapes, colors, inputs, and fields are defined here.
 * Code generation lives in ai-scratch-generator.ts (and ai-arduino-generator.ts for Phase 2).
 */
import * as Blockly from 'blockly/core';
import { useAIStore } from '../../stores/ai.store';

// Coral — visually distinct from all existing categories
const COLOR_AI = '#FF6F61';

// ─── Dynamic dropdown generator ─────────────────────────────────────────────
// Same lazy-evaluation pattern used by arduino-blocks.ts for pin dropdowns.
// Reads the student's trained class labels from the AI store at render time.

const getClassLabels = function (this: Blockly.FieldDropdown): [string, string][] {
  const labels = useAIStore.getState().classLabels;
  if (labels.length === 0) {
    return [['(no classes trained)', '__none__']];
  }
  return labels.map((l) => [l, l]);
};

// ─────────────────────────────────────────────────────────────────────────────
// AI VISION CONTROL
// ─────────────────────────────────────────────────────────────────────────────

/** Turn AI vision ON or OFF — starts/stops webcam and live prediction. */
Blockly.Blocks['ai_turn_vision'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('turn AI vision')
      .appendField(
        new Blockly.FieldDropdown([
          ['ON', 'ON'],
          ['OFF', 'OFF'],
        ]),
        'STATE',
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip(
      'Turn the webcam AI on or off. When ON, the camera starts predicting what it sees using your trained model.',
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI EVENT (HAT) BLOCK
// ─────────────────────────────────────────────────────────────────────────────

/** When AI predicts [Label] — hat block that fires when confidence > 70%. */
Blockly.Blocks['ai_when_predicted'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('when AI sees')
      .appendField(new Blockly.FieldDropdown(getClassLabels), 'LABEL');
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip(
      'Starts this script when the AI model predicts the chosen class with high confidence.',
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI REPORTER BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the current top prediction label as a string. */
Blockly.Blocks['ai_current_prediction'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('AI prediction');
    this.setOutput(true, 'String');
    this.setColour(COLOR_AI);
    this.setTooltip('The label the AI is most confident about right now.');
  },
};

/** Returns the confidence percentage (0–100) for a specific class. */
Blockly.Blocks['ai_confidence_of'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('AI confidence of')
      .appendField(new Blockly.FieldDropdown(getClassLabels), 'LABEL');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_AI);
    this.setTooltip('How confident (0–100%) the AI is that it sees this class right now.');
  },
};

/** Boolean: is the AI currently predicting this label? */
Blockly.Blocks['ai_is_predicting'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('AI sees')
      .appendField(new Blockly.FieldDropdown(getClassLabels), 'LABEL')
      .appendField('?');
    this.setOutput(true, 'Boolean');
    this.setColour(COLOR_AI);
    this.setTooltip("True if the AI model's current top prediction matches this class.");
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: POSE DETECTION BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

const POSE_PARTS = [
  ['nose', 'nose'],
  ['left eye', 'left_eye'],
  ['right eye', 'right_eye'],
  ['left ear', 'left_ear'],
  ['right ear', 'right_ear'],
  ['left shoulder', 'left_shoulder'],
  ['right shoulder', 'right_shoulder'],
  ['left elbow', 'left_elbow'],
  ['right elbow', 'right_elbow'],
  ['left wrist', 'left_wrist'],
  ['right wrist', 'right_wrist'],
  ['left hip', 'left_hip'],
  ['right hip', 'right_hip'],
  ['left knee', 'left_knee'],
  ['right knee', 'right_knee'],
  ['left ankle', 'left_ankle'],
  ['right ankle', 'right_ankle'],
] as [string, string][];

Blockly.Blocks['ai_pose_x'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('x position of')
      .appendField(new Blockly.FieldDropdown(POSE_PARTS), 'PART');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_AI);
    this.setTooltip('Get the horizontal (X) position of a body part (0 to 1).');
  },
};

Blockly.Blocks['ai_pose_y'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('y position of')
      .appendField(new Blockly.FieldDropdown(POSE_PARTS), 'PART');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_AI);
    this.setTooltip('Get the vertical (Y) position of a body part (0 to 1).');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: AUDIO CLASSIFICATION BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

const AUDIO_WORDS = [
  ['up', 'up'],
  ['down', 'down'],
  ['left', 'left'],
  ['right', 'right'],
  ['yes', 'yes'],
  ['no', 'no'],
  ['go', 'go'],
  ['stop', 'stop'],
  ['on', 'on'],
  ['off', 'off'],
  ['zero', 'zero'],
  ['one', 'one'],
  ['two', 'two'],
  ['three', 'three'],
  ['four', 'four'],
  ['five', 'five'],
  ['six', 'six'],
  ['seven', 'seven'],
  ['eight', 'eight'],
  ['nine', 'nine'],
] as [string, string][];

Blockly.Blocks['ai_audio_listen'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('turn microphone')
      .appendField(
        new Blockly.FieldDropdown([
          ['ON', 'ON'],
          ['OFF', 'OFF'],
        ] as [string, string][]),
        'STATE',
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Start or stop listening for voice commands.');
  },
};

Blockly.Blocks['ai_when_hear_word'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('when I hear')
      .appendField(new Blockly.FieldDropdown(AUDIO_WORDS), 'WORD');
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Runs when the chosen word is spoken.');
  },
};

Blockly.Blocks['ai_latest_word'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('latest word heard');
    this.setOutput(true, 'String');
    this.setColour(COLOR_AI);
    this.setTooltip('The most recent word recognized by the microphone.');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EMOTION / FACE EXPRESSION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const EMOTION_OPTIONS = [
  ['happy 😊', 'happy'],
  ['sad 😢', 'sad'],
  ['angry 😠', 'angry'],
  ['surprised 😮', 'surprised'],
  ['disgusted 🤢', 'disgusted'],
  ['fearful 😨', 'fearful'],
  ['neutral 😐', 'neutral'],
] as [string, string][];

/** Turn face emotion detection ON or OFF */
Blockly.Blocks['ai_turn_emotion'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('turn emotion detection')
      .appendField(
        new Blockly.FieldDropdown([
          ['ON', 'ON'],
          ['OFF', 'OFF'],
        ]),
        'STATE',
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Start or stop detecting facial expressions from the webcam.');
  },
};

/** Hat block: fires when a specific emotion is detected */
Blockly.Blocks['ai_when_emotion'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('when AI detects')
      .appendField(new Blockly.FieldDropdown(EMOTION_OPTIONS), 'EMOTION')
      .appendField('face');
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Runs this script when the AI detects the chosen facial expression.');
  },
};

/** Reporter: current top emotion label */
Blockly.Blocks['ai_emotion_detected'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('AI emotion');
    this.setOutput(true, 'String');
    this.setColour(COLOR_AI);
    this.setTooltip('The facial expression the AI currently detects (e.g. "happy", "sad").');
  },
};

/** Reporter: confidence % for a specific emotion */
Blockly.Blocks['ai_emotion_confidence'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('emotion confidence of')
      .appendField(new Blockly.FieldDropdown(EMOTION_OPTIONS), 'EMOTION');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_AI);
    this.setTooltip('How confident (0–100%) the AI is about detecting this emotion.');
  },
};

/** Boolean: is a face currently visible? */
Blockly.Blocks['ai_face_detected'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('face detected?');
    this.setOutput(true, 'Boolean');
    this.setColour(COLOR_AI);
    this.setTooltip('True if the AI can currently see a face in the webcam.');
  },
};

/** Reporter: face X or Y position (0–1) */
Blockly.Blocks['ai_face_position'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('face')
      .appendField(
        new Blockly.FieldDropdown([
          ['x', 'x'],
          ['y', 'y'],
        ]),
        'AXIS',
      )
      .appendField('position');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_AI);
    this.setTooltip(
      'The horizontal (x) or vertical (y) center position of the detected face (0 to 1).',
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HAND / FINGER TRACKING
// ─────────────────────────────────────────────────────────────────────────────

const HAND_LANDMARKS = [
  ['wrist', 'wrist'],
  ['thumb tip', 'thumb_tip'],
  ['index finger tip', 'index_finger_tip'],
  ['middle finger tip', 'middle_finger_tip'],
  ['ring finger tip', 'ring_finger_tip'],
  ['pinky tip', 'pinky_tip'],
  ['index knuckle', 'index_finger_mcp'],
  ['middle knuckle', 'middle_finger_mcp'],
  ['ring knuckle', 'ring_finger_mcp'],
] as [string, string][];

const HAND_GESTURES = [
  ['open ✋', 'open'],
  ['closed ✊', 'closed'],
  ['pointing ☝️', 'pointing'],
  ['pinching 🤌', 'pinching'],
  ['thumbs up 👍', 'thumbs_up'],
  ['thumbs down 👎', 'thumbs_down'],
] as [string, string][];

/** Turn hand tracking ON or OFF */
Blockly.Blocks['ai_turn_hand_tracking'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('turn hand tracking')
      .appendField(
        new Blockly.FieldDropdown([
          ['ON', 'ON'],
          ['OFF', 'OFF'],
        ]),
        'STATE',
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Start or stop tracking hand and finger positions.');
  },
};

/** Reporter: x or y position of a specific finger/landmark */
Blockly.Blocks['ai_hand_x'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('x position of')
      .appendField(new Blockly.FieldDropdown(HAND_LANDMARKS), 'LANDMARK');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_AI);
    this.setTooltip('Get the horizontal (X) position of a finger or hand landmark (0 to 1).');
  },
};

Blockly.Blocks['ai_hand_y'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('y position of')
      .appendField(new Blockly.FieldDropdown(HAND_LANDMARKS), 'LANDMARK');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_AI);
    this.setTooltip('Get the vertical (Y) position of a finger or hand landmark (0 to 1).');
  },
};

/** Hat block: fires when a hand gesture is detected */
Blockly.Blocks['ai_when_hand_gesture'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('when hand is')
      .appendField(new Blockly.FieldDropdown(HAND_GESTURES), 'GESTURE');
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Runs this script when the chosen hand gesture is detected.');
  },
};

/** Reporter: current hand gesture label */
Blockly.Blocks['ai_hand_gesture'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('hand gesture');
    this.setOutput(true, 'String');
    this.setColour(COLOR_AI);
    this.setTooltip('The current hand gesture (e.g. "open", "closed", "pinching").');
  },
};

/** Boolean: is a hand detected? */
Blockly.Blocks['ai_hand_detected'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('hand detected?');
    this.setOutput(true, 'Boolean');
    this.setColour(COLOR_AI);
    this.setTooltip('True if the AI can currently see a hand in the webcam.');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SPEECH-TO-TEXT (Free-form transcription)
// ─────────────────────────────────────────────────────────────────────────────

/** Start / stop free-form speech-to-text listening */
Blockly.Blocks['ai_speech_listen'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('start listening for speech');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip(
      'Start converting everything spoken into text. Use "speech heard" block to get the text.',
    );
  },
};

Blockly.Blocks['ai_speech_stop'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('stop listening for speech');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Stop the speech-to-text listener.');
  },
};

/** Reporter: returns the last thing spoken */
Blockly.Blocks['ai_speech_heard'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('speech heard');
    this.setOutput(true, 'String');
    this.setColour(COLOR_AI);
    this.setTooltip('The last phrase or sentence spoken (converted to text).');
  },
};

/** Hat block: fires when speech contains a specific word/phrase */
Blockly.Blocks['ai_when_speech_contains'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('PHRASE').setCheck('String').appendField('when speech contains');
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip(
      'Runs this script when the AI hears a sentence containing the given word or phrase.',
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEXT-TO-SPEECH (Speak aloud)
// ─────────────────────────────────────────────────────────────────────────────

const SPEECH_LANG_OPTIONS = [
  ['English', 'en-US'],
  ['Hindi', 'hi-IN'],
  ['Spanish', 'es-ES'],
  ['French', 'fr-FR'],
  ['German', 'de-DE'],
  ['Japanese', 'ja-JP'],
  ['Chinese', 'zh-CN'],
] as [string, string][];

/** Speak a text string aloud */
Blockly.Blocks['ai_speak'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('TEXT').setCheck('String').appendField('say aloud');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Make the computer speak this text aloud.');
  },
};

/** Speak in a specific language */
Blockly.Blocks['ai_speak_in_lang'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('TEXT')
      .setCheck('String')
      .appendField('say aloud in')
      .appendField(new Blockly.FieldDropdown(SPEECH_LANG_OPTIONS), 'LANG');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Speak this text in the chosen language.');
  },
};

/** Set speech speed */
Blockly.Blocks['ai_set_speech_speed'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('SPEED').setCheck('Number').appendField('set speech speed to');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Set how fast the computer speaks (0.5 = slow, 1 = normal, 2 = fast).');
  },
};

/** Stop speaking immediately */
Blockly.Blocks['ai_stop_speaking'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('stop speaking');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Immediately stop any text-to-speech that is playing.');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEXT CLASSIFICATION (NLP)
// ─────────────────────────────────────────────────────────────────────────────

const getTextClassLabels = function (this: Blockly.FieldDropdown): [string, string][] {
  const labels = useAIStore.getState().classLabels;
  const textOnly = labels.filter((l) => l.startsWith('text:')).map((l) => l.replace('text:', ''));
  if (textOnly.length === 0) return [['(no text classes trained)', '__none__']];
  return textOnly.map((l) => [l, l]);
};

/** Classify a text input and return the matching class label */
Blockly.Blocks['ai_classify_text'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('TEXT').setCheck('String').appendField('classify text');
    this.setOutput(true, 'String');
    this.setColour(COLOR_AI);
    this.setTooltip('Run your trained text AI on this text and return the matching class label.');
  },
};

/** Hat block: fires when a text classification result matches */
Blockly.Blocks['ai_when_text_classified'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('TEXT')
      .setCheck('String')
      .appendField('when')
      .appendField(new Blockly.FieldDropdown(getTextClassLabels), 'LABEL')
      .appendField('detected in');
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Runs this script when the text AI classifies input as the chosen class.');
  },
};

// ─── Priority 5: AI Music Generation (Magenta) ───────────────────────────────

Blockly.Blocks['ai_generate_music'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('🎸 play AI melody from base notes');
    this.appendValueInput('NOTES').setCheck('Array').appendField('notes:');
    this.appendValueInput('STEPS').setCheck('Number').appendField('generate steps:');
    this.appendValueInput('TEMP').setCheck('Number').appendField('creativity (0.1-2.0):');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip(
      'Uses AI to generate and play a melody continuing the provided MIDI notes array.',
    );
  },
};

Blockly.Blocks['ai_stop_music'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('🛑 stop AI music');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_AI);
    this.setTooltip('Stops playing the currently generating AI melody.');
  },
};
