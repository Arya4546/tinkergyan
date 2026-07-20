import * as Blockly from 'blockly/core';

// Colors (Scratch palette)
const COLOR_EVENTS = '#FFBF00'; // Yellow
const COLOR_MOTION = '#4C97FF'; // Blue
const COLOR_LOOKS = '#9966FF'; // Purple

// ─── EVENTS ─────────────────────────────────────────────────────────────────

Blockly.Blocks['scratch_event_when_flag_clicked'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('when 🏁 clicked');
    this.setNextStatement(true, null);
    this.setColour(COLOR_EVENTS);
    this.setTooltip('Starts the script when the green flag is clicked.');
  },
};

// ─── MOTION ─────────────────────────────────────────────────────────────────

Blockly.Blocks['scratch_motion_move_steps'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('STEPS').setCheck('Number').appendField('move');
    this.appendDummyInput().appendField('steps');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Moves the sprite forward in the direction it is facing.');
  },
};

Blockly.Blocks['scratch_motion_turn_right'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('DEGREES').setCheck('Number').appendField('turn ↻');
    this.appendDummyInput().appendField('degrees');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Turns the sprite to the right (clockwise).');
  },
};

Blockly.Blocks['scratch_motion_goto'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('X').setCheck('Number').appendField('go to x:');
    this.appendValueInput('Y').setCheck('Number').appendField('y:');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Moves the sprite to a specific x and y position.');
  },
};

// ─── LOOKS ──────────────────────────────────────────────────────────────────

Blockly.Blocks['scratch_looks_say_for'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('TEXT').setCheck('String').appendField('say');
    this.appendValueInput('SECS').setCheck('Number').appendField('for');
    this.appendDummyInput().appendField('seconds');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Displays a speech bubble for a specified amount of time.');
  },
};

Blockly.Blocks['scratch_looks_show'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('show');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Makes the sprite visible.');
  },
};

Blockly.Blocks['scratch_looks_hide'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('hide');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Hides the sprite.');
  },
};

Blockly.Blocks['scratch_looks_switch_costume_to'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('switch costume to')
      .appendField(
        new Blockly.FieldDropdown([
          ['Stemmantra (Old)', '/sprites/scratch_games.svg'],
          ['Stemmantra (New)', '/sprites/svg.svg'],
        ]),
        'COSTUME',
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Changes the costume of the sprite.');
  },
};
