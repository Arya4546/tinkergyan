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
