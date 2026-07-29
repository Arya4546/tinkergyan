import * as Blockly from 'blockly/core';
import { BACKDROP_OPTIONS } from '../../stores/simulator.store';
import { SOUND_NAMES } from './simulator/ScratchEngine';

// Colors (Scratch palette)
const COLOR_EVENTS = '#FFBF00'; // Yellow
const COLOR_MOTION = '#4C97FF'; // Blue
const COLOR_LOOKS = '#9966FF'; // Purple
const COLOR_SOUND = '#D65CD6'; // Magenta
const COLOR_CONTROL = '#FFAB19'; // Orange
const COLOR_SENSING = '#5CB1D6'; // Light blue

// Key names offered by "when key pressed" / "key pressed?" dropdowns.
const KEY_OPTIONS: [string, string][] = [
  ['any', 'any'],
  ['space', 'space'],
  ['up arrow', 'up arrow'],
  ['down arrow', 'down arrow'],
  ['left arrow', 'left arrow'],
  ['right arrow', 'right arrow'],
  ['enter', 'enter'],
  ...'abcdefghijklmnopqrstuvwxyz'.split('').map((c): [string, string] => [c, c]),
  ...'0123456789'.split('').map((c): [string, string] => [c, c]),
];

const SOUND_OPTIONS: [string, string][] = SOUND_NAMES.map((n) => [n, n]);
const BACKDROP_DROPDOWN_OPTIONS: [string, string][] = BACKDROP_OPTIONS.map((b) => [b, b]);

// ─── EVENTS ─────────────────────────────────────────────────────────────────

/**
 * The green flag, drawn rather than typed.
 *
 * This used to be the 🏁 emoji inside a text label, which rendered as a
 * black-and-white *chequered* flag — the racing flag, not Scratch's green one —
 * and changed shape on every OS because it resolved to whatever emoji font
 * happened to be installed. Students match this icon against the green flag
 * button above the stage, so it has to actually be green and identical everywhere.
 *
 * Inlined as a data URI rather than served from /public so it cannot 404 and
 * costs no extra request; kept as readable SVG source rather than base64 so the
 * shape stays editable.
 */
const GREEN_FLAG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M5 3.2v17.6" stroke="#3E9E36" stroke-width="2.1" stroke-linecap="round" fill="none"/>
  <path d="M6.6 4.3c3.1-1.8 6.2 1.5 9.3-.1.8-.4 1.7.2 1.7 1.1v6.5c0 .4-.2.8-.6 1-3.1 1.6-6.2-1.7-9.3.1-.5.3-1.1-.1-1.1-.6V5.2c0-.4.2-.7.5-.9z"
        fill="#4CBF56" stroke="#3E9E36" stroke-width="1.1" stroke-linejoin="round"/>
</svg>`;

const GREEN_FLAG_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(GREEN_FLAG_SVG)}`;

Blockly.Blocks['scratch_event_when_flag_clicked'] = {
  init(this: Blockly.Block): void {
    // Three fields rather than one label: Blockly measures the image and lays the
    // block out around it, so the block grows to fit the icon instead of clipping it.
    this.appendDummyInput()
      .appendField('when')
      .appendField(new Blockly.FieldImage(GREEN_FLAG_URI, 24, 24, 'green flag'))
      .appendField('clicked');
    this.setNextStatement(true, null);
    this.setColour(COLOR_EVENTS);
    this.setTooltip('Starts the script when the green flag is clicked.');
  },
};

Blockly.Blocks['scratch_event_when_key_pressed'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('when')
      .appendField(new Blockly.FieldDropdown(KEY_OPTIONS), 'KEY')
      .appendField('key pressed');
    this.setNextStatement(true, null);
    this.setColour(COLOR_EVENTS);
    this.setTooltip('Starts the script when the chosen key is pressed.');
  },
};

Blockly.Blocks['scratch_event_when_sprite_clicked'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('when this sprite clicked');
    this.setNextStatement(true, null);
    this.setColour(COLOR_EVENTS);
    this.setTooltip('Starts the script when the sprite is clicked.');
  },
};

Blockly.Blocks['scratch_event_when_i_receive'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('when I receive')
      .appendField(new Blockly.FieldTextInput('message1'), 'MESSAGE');
    this.setNextStatement(true, null);
    this.setColour(COLOR_EVENTS);
    this.setTooltip('Starts the script when the named message is broadcast.');
  },
};

Blockly.Blocks['scratch_event_broadcast'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('broadcast')
      .appendField(new Blockly.FieldTextInput('message1'), 'MESSAGE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_EVENTS);
    this.setTooltip('Broadcasts a message to all "when I receive" scripts.');
  },
};

Blockly.Blocks['scratch_event_broadcast_and_wait'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('broadcast')
      .appendField(new Blockly.FieldTextInput('message1'), 'MESSAGE')
      .appendField('and wait');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_EVENTS);
    this.setTooltip('Broadcasts a message and waits until every receiving script finishes.');
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

Blockly.Blocks['scratch_motion_turn_left'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('DEGREES').setCheck('Number').appendField('turn ↺');
    this.appendDummyInput().appendField('degrees');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Turns the sprite to the left (counter-clockwise).');
  },
};

Blockly.Blocks['scratch_motion_glide_to'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('SECS').setCheck('Number').appendField('glide');
    this.appendDummyInput().appendField('secs to x:');
    this.appendValueInput('X').setCheck('Number');
    this.appendDummyInput().appendField('y:');
    this.appendValueInput('Y').setCheck('Number');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Glides smoothly to an x/y position over a number of seconds.');
  },
};

Blockly.Blocks['scratch_motion_point_in_direction'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('DEGREES').setCheck('Number').appendField('point in direction');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip(
      'Points the sprite in a direction (0 = up, 90 = right, 180 = down, -90 = left).',
    );
  },
};

Blockly.Blocks['scratch_motion_point_towards_mouse'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('point towards mouse-pointer');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Rotates the sprite to face the mouse pointer.');
  },
};

Blockly.Blocks['scratch_motion_change_x_by'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('DX').setCheck('Number').appendField('change x by');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Changes the x position by the given amount.');
  },
};

Blockly.Blocks['scratch_motion_set_x_to'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('X').setCheck('Number').appendField('set x to');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Sets the x position.');
  },
};

Blockly.Blocks['scratch_motion_change_y_by'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('DY').setCheck('Number').appendField('change y by');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Changes the y position by the given amount.');
  },
};

Blockly.Blocks['scratch_motion_set_y_to'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('Y').setCheck('Number').appendField('set y to');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Sets the y position.');
  },
};

Blockly.Blocks['scratch_motion_if_on_edge_bounce'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('if on edge, bounce');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Bounces the sprite off the stage edge if it has reached it.');
  },
};

Blockly.Blocks['scratch_motion_set_rotation_style'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('set rotation style')
      .appendField(
        new Blockly.FieldDropdown([
          ['all around', 'all around'],
          ['left-right', 'left-right'],
          ["don't rotate", "don't rotate"],
        ]),
        'STYLE',
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_MOTION);
    this.setTooltip('Sets how the sprite rotates as its direction changes.');
  },
};

Blockly.Blocks['scratch_motion_x_position'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('x position');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_MOTION);
    this.setTooltip("The sprite's current x position.");
  },
};

Blockly.Blocks['scratch_motion_y_position'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('y position');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_MOTION);
    this.setTooltip("The sprite's current y position.");
  },
};

Blockly.Blocks['scratch_motion_direction'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('direction');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_MOTION);
    this.setTooltip("The sprite's current direction.");
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

Blockly.Blocks['scratch_looks_say'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('TEXT').setCheck('String').appendField('say');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Displays a speech bubble until changed or cleared.');
  },
};

Blockly.Blocks['scratch_looks_think_for'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('TEXT').setCheck('String').appendField('think');
    this.appendValueInput('SECS').setCheck('Number').appendField('for');
    this.appendDummyInput().appendField('seconds');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Displays a thought bubble for a specified amount of time.');
  },
};

Blockly.Blocks['scratch_looks_think'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('TEXT').setCheck('String').appendField('think');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Displays a thought bubble until changed or cleared.');
  },
};

Blockly.Blocks['scratch_looks_next_costume'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('next costume');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Switches to the next costume in order.');
  },
};

Blockly.Blocks['scratch_looks_switch_backdrop_to'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('switch backdrop to')
      .appendField(new Blockly.FieldDropdown(BACKDROP_DROPDOWN_OPTIONS), 'BACKDROP');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Switches the stage backdrop.');
  },
};

Blockly.Blocks['scratch_looks_next_backdrop'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('next backdrop');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Switches to the next backdrop in order.');
  },
};

Blockly.Blocks['scratch_looks_change_size_by'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('DELTA').setCheck('Number').appendField('change size by');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Changes the size by a percentage.');
  },
};

Blockly.Blocks['scratch_looks_set_size_to'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('SIZE').setCheck('Number').appendField('set size to');
    this.appendDummyInput().appendField('%');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Sets the size to a percentage.');
  },
};

const GRAPHIC_EFFECT_OPTIONS: [string, string][] = [
  ['color', 'color'],
  ['ghost', 'ghost'],
  ['brightness', 'brightness'],
];

Blockly.Blocks['scratch_looks_change_effect_by'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('change')
      .appendField(new Blockly.FieldDropdown(GRAPHIC_EFFECT_OPTIONS), 'EFFECT')
      .appendField('effect by');
    this.appendValueInput('DELTA').setCheck('Number');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Changes a graphic effect (color hue, ghost transparency, or brightness).');
  },
};

Blockly.Blocks['scratch_looks_set_effect_to'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('set')
      .appendField(new Blockly.FieldDropdown(GRAPHIC_EFFECT_OPTIONS), 'EFFECT')
      .appendField('effect to');
    this.appendValueInput('VALUE').setCheck('Number');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Sets a graphic effect (color hue, ghost transparency, or brightness).');
  },
};

Blockly.Blocks['scratch_looks_clear_graphic_effects'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('clear graphic effects');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Removes all graphic effects from the sprite.');
  },
};

Blockly.Blocks['scratch_looks_go_to_layer'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('go to')
      .appendField(
        new Blockly.FieldDropdown([
          ['front', 'front'],
          ['back', 'back'],
        ]),
        'LAYER',
      )
      .appendField('layer');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Moves the sprite to the front or back of the layer order.');
  },
};

Blockly.Blocks['scratch_looks_change_layers'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('go')
      .appendField(
        new Blockly.FieldDropdown([
          ['forward', 'forward'],
          ['backward', 'backward'],
        ]),
        'DIRECTION',
      );
    this.appendValueInput('AMOUNT').setCheck('Number');
    this.appendDummyInput().appendField('layers');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_LOOKS);
    this.setTooltip('Moves the sprite forward or backward through the layer order.');
  },
};

Blockly.Blocks['scratch_looks_costume_number'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('costume #');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_LOOKS);
    this.setTooltip("The sprite's current costume number.");
  },
};

Blockly.Blocks['scratch_looks_size'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('size');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_LOOKS);
    this.setTooltip("The sprite's current size percentage.");
  },
};

// ─── SOUND ──────────────────────────────────────────────────────────────────
// Sound names are synthesized tones (pop/beep/ding/boop) played via Web Audio —
// this project ships no licensed audio assets, so there is no real sound library.

Blockly.Blocks['scratch_sound_play_until_done'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('play sound')
      .appendField(new Blockly.FieldDropdown(SOUND_OPTIONS), 'SOUND')
      .appendField('until done');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_SOUND);
    this.setTooltip('Plays a sound and waits until it finishes.');
  },
};

Blockly.Blocks['scratch_sound_start'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('start sound')
      .appendField(new Blockly.FieldDropdown(SOUND_OPTIONS), 'SOUND');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_SOUND);
    this.setTooltip('Starts a sound and continues immediately.');
  },
};

Blockly.Blocks['scratch_sound_stop_all'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('stop all sounds');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_SOUND);
    this.setTooltip('Stops every currently playing sound.');
  },
};

Blockly.Blocks['scratch_sound_change_volume_by'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('DELTA').setCheck('Number').appendField('change volume by');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_SOUND);
    this.setTooltip('Changes the volume by a percentage.');
  },
};

Blockly.Blocks['scratch_sound_set_volume_to'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('VOLUME').setCheck('Number').appendField('set volume to');
    this.appendDummyInput().appendField('%');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_SOUND);
    this.setTooltip('Sets the volume to a percentage.');
  },
};

Blockly.Blocks['scratch_sound_volume'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('volume');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_SOUND);
    this.setTooltip('The current volume percentage.');
  },
};

// ─── CONTROL ────────────────────────────────────────────────────────────────

Blockly.Blocks['scratch_control_wait'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('SECS').setCheck('Number').appendField('wait');
    this.appendDummyInput().appendField('seconds');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_CONTROL);
    this.setTooltip('Waits the given number of seconds before continuing.');
  },
};

Blockly.Blocks['scratch_control_forever'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('forever');
    this.appendStatementInput('DO');
    this.setPreviousStatement(true, null);
    // Forever never falls through — nothing can run after it, just like Scratch.
    this.setColour(COLOR_CONTROL);
    this.setTooltip('Repeats the enclosed blocks forever.');
  },
};

Blockly.Blocks['scratch_control_wait_until'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('CONDITION').setCheck('Boolean').appendField('wait until');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_CONTROL);
    this.setTooltip('Pauses the script until the condition becomes true.');
  },
};

Blockly.Blocks['scratch_control_stop'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('stop')
      .appendField(
        new Blockly.FieldDropdown([
          ['all', 'all'],
          ['this script', 'this script'],
          ['other scripts', 'other scripts'],
        ]),
        'TARGET',
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_CONTROL);
    this.setTooltip('Stops running scripts.');
  },
};

// ─── SENSING ────────────────────────────────────────────────────────────────

Blockly.Blocks['scratch_sensing_key_pressed'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput()
      .appendField('key')
      .appendField(new Blockly.FieldDropdown(KEY_OPTIONS), 'KEY')
      .appendField('pressed?');
    this.setOutput(true, 'Boolean');
    this.setColour(COLOR_SENSING);
    this.setTooltip('True while the chosen key is held down.');
  },
};

Blockly.Blocks['scratch_sensing_mouse_down'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('mouse down?');
    this.setOutput(true, 'Boolean');
    this.setColour(COLOR_SENSING);
    this.setTooltip('True while the mouse button is held down.');
  },
};

Blockly.Blocks['scratch_sensing_mouse_x'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('mouse x');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_SENSING);
    this.setTooltip("The mouse pointer's x position on the stage.");
  },
};

Blockly.Blocks['scratch_sensing_mouse_y'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('mouse y');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_SENSING);
    this.setTooltip("The mouse pointer's y position on the stage.");
  },
};

Blockly.Blocks['scratch_sensing_timer'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('timer');
    this.setOutput(true, 'Number');
    this.setColour(COLOR_SENSING);
    this.setTooltip('Seconds elapsed since the timer was last reset (or the script started).');
  },
};

Blockly.Blocks['scratch_sensing_reset_timer'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('reset timer');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_SENSING);
    this.setTooltip('Resets the timer to zero.');
  },
};

Blockly.Blocks['scratch_sensing_touching_edge'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('touching edge?');
    this.setOutput(true, 'Boolean');
    this.setColour(COLOR_SENSING);
    this.setTooltip('True if the sprite is touching the edge of the stage.');
  },
};

Blockly.Blocks['scratch_sensing_ask_and_wait'] = {
  init(this: Blockly.Block): void {
    this.appendValueInput('QUESTION').setCheck('String').appendField('ask');
    this.appendDummyInput().appendField('and wait');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(COLOR_SENSING);
    this.setTooltip('Shows a question prompt and waits for the answer.');
  },
};

Blockly.Blocks['scratch_sensing_answer'] = {
  init(this: Blockly.Block): void {
    this.appendDummyInput().appendField('answer');
    this.setOutput(true, 'String');
    this.setColour(COLOR_SENSING);
    this.setTooltip('The most recent answer typed in response to "ask and wait".');
  },
};
