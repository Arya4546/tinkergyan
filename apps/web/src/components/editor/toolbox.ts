/**
 * toolbox.ts
 * Arduino-specific Blockly toolbox configuration.
 *
 * Category naming rules:
 *   - Sentence case, plain English — these are user-facing labels, not internal identifiers.
 *   - Emoji prefix gives each category a quick visual cue that Blockly's SVG can render natively.
 *   - `colour` fields are intentionally ABSENT. Color comes exclusively from the
 *     `categorystyle` key mapping to the kidTheme defined in BlocklyWorkspace.tsx.
 *     If both `colour` and `categorystyle` are present, Blockly silently ignores
 *     `categorystyle` — so only `categorystyle` must appear here.
 */

export function getToolbox(engineMode: 'hardware' | 'software') {
  const scratchCategories = [
    {
      kind: 'category',
      name: '🟡 Events',
      categorystyle: 'scratch_events_category',
      contents: [
        { kind: 'block', type: 'scratch_event_when_flag_clicked' },
        { kind: 'block', type: 'scratch_event_when_key_pressed' },
        { kind: 'block', type: 'scratch_event_when_sprite_clicked' },
        { kind: 'block', type: 'scratch_event_when_i_receive' },
        { kind: 'block', type: 'scratch_event_broadcast' },
        { kind: 'block', type: 'scratch_event_broadcast_and_wait' },
      ],
    },
    {
      kind: 'category',
      name: '🔵 Motion',
      categorystyle: 'scratch_motion_category',
      contents: [
        {
          kind: 'block',
          type: 'scratch_motion_move_steps',
          inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 10 } } } },
        },
        {
          kind: 'block',
          type: 'scratch_motion_turn_right',
          inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 } } } },
        },
        {
          kind: 'block',
          type: 'scratch_motion_turn_left',
          inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 } } } },
        },
        {
          kind: 'block',
          type: 'scratch_motion_goto',
          inputs: {
            X: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
            Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          },
        },
        {
          kind: 'block',
          type: 'scratch_motion_glide_to',
          inputs: {
            SECS: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
            X: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
            Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          },
        },
        {
          kind: 'block',
          type: 'scratch_motion_point_in_direction',
          inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 90 } } } },
        },
        { kind: 'block', type: 'scratch_motion_point_towards_mouse' },
        {
          kind: 'block',
          type: 'scratch_motion_change_x_by',
          inputs: { DX: { shadow: { type: 'math_number', fields: { NUM: 10 } } } },
        },
        {
          kind: 'block',
          type: 'scratch_motion_set_x_to',
          inputs: { X: { shadow: { type: 'math_number', fields: { NUM: 0 } } } },
        },
        {
          kind: 'block',
          type: 'scratch_motion_change_y_by',
          inputs: { DY: { shadow: { type: 'math_number', fields: { NUM: 10 } } } },
        },
        {
          kind: 'block',
          type: 'scratch_motion_set_y_to',
          inputs: { Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } } },
        },
        { kind: 'block', type: 'scratch_motion_if_on_edge_bounce' },
        { kind: 'block', type: 'scratch_motion_set_rotation_style' },
        { kind: 'block', type: 'scratch_motion_x_position' },
        { kind: 'block', type: 'scratch_motion_y_position' },
        { kind: 'block', type: 'scratch_motion_direction' },
      ],
    },
    {
      kind: 'category',
      name: '🟣 Looks',
      categorystyle: 'scratch_looks_category',
      contents: [
        {
          kind: 'block',
          type: 'scratch_looks_say_for',
          inputs: {
            TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } },
            SECS: { shadow: { type: 'math_number', fields: { NUM: 2 } } },
          },
        },
        {
          kind: 'block',
          type: 'scratch_looks_say',
          inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } } },
        },
        {
          kind: 'block',
          type: 'scratch_looks_think_for',
          inputs: {
            TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hmm...' } } },
            SECS: { shadow: { type: 'math_number', fields: { NUM: 2 } } },
          },
        },
        {
          kind: 'block',
          type: 'scratch_looks_think',
          inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hmm...' } } } },
        },
        { kind: 'block', type: 'scratch_looks_show' },
        { kind: 'block', type: 'scratch_looks_hide' },
        { kind: 'block', type: 'scratch_looks_switch_costume_to' },
        { kind: 'block', type: 'scratch_looks_next_costume' },
        { kind: 'block', type: 'scratch_looks_switch_backdrop_to' },
        { kind: 'block', type: 'scratch_looks_next_backdrop' },
        {
          kind: 'block',
          type: 'scratch_looks_change_size_by',
          inputs: { DELTA: { shadow: { type: 'math_number', fields: { NUM: 10 } } } },
        },
        {
          kind: 'block',
          type: 'scratch_looks_set_size_to',
          inputs: { SIZE: { shadow: { type: 'math_number', fields: { NUM: 100 } } } },
        },
        {
          kind: 'block',
          type: 'scratch_looks_change_effect_by',
          inputs: { DELTA: { shadow: { type: 'math_number', fields: { NUM: 25 } } } },
        },
        {
          kind: 'block',
          type: 'scratch_looks_set_effect_to',
          inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } },
        },
        { kind: 'block', type: 'scratch_looks_clear_graphic_effects' },
        { kind: 'block', type: 'scratch_looks_go_to_layer' },
        {
          kind: 'block',
          type: 'scratch_looks_change_layers',
          inputs: { AMOUNT: { shadow: { type: 'math_number', fields: { NUM: 1 } } } },
        },
        { kind: 'block', type: 'scratch_looks_costume_number' },
        { kind: 'block', type: 'scratch_looks_size' },
      ],
    },
    {
      kind: 'category',
      name: '🎵 Sound',
      categorystyle: 'scratch_sound_category',
      contents: [
        { kind: 'block', type: 'scratch_sound_play_until_done' },
        { kind: 'block', type: 'scratch_sound_start' },
        { kind: 'block', type: 'scratch_sound_stop_all' },
        {
          kind: 'block',
          type: 'scratch_sound_change_volume_by',
          inputs: { DELTA: { shadow: { type: 'math_number', fields: { NUM: 10 } } } },
        },
        {
          kind: 'block',
          type: 'scratch_sound_set_volume_to',
          inputs: { VOLUME: { shadow: { type: 'math_number', fields: { NUM: 100 } } } },
        },
        { kind: 'block', type: 'scratch_sound_volume' },
      ],
    },
    {
      kind: 'category',
      name: '🟠 Control',
      categorystyle: 'scratch_control_category',
      contents: [
        {
          kind: 'block',
          type: 'scratch_control_wait',
          inputs: { SECS: { shadow: { type: 'math_number', fields: { NUM: 1 } } } },
        },
        { kind: 'block', type: 'scratch_control_forever' },
        { kind: 'block', type: 'scratch_control_wait_until' },
        { kind: 'block', type: 'scratch_control_stop' },
      ],
    },
    {
      kind: 'category',
      name: '🔷 Sensing',
      categorystyle: 'scratch_sensing_category',
      contents: [
        { kind: 'block', type: 'scratch_sensing_key_pressed' },
        { kind: 'block', type: 'scratch_sensing_mouse_down' },
        { kind: 'block', type: 'scratch_sensing_mouse_x' },
        { kind: 'block', type: 'scratch_sensing_mouse_y' },
        { kind: 'block', type: 'scratch_sensing_touching_edge' },
        { kind: 'block', type: 'scratch_sensing_timer' },
        { kind: 'block', type: 'scratch_sensing_reset_timer' },
        {
          kind: 'block',
          type: 'scratch_sensing_ask_and_wait',
          inputs: { QUESTION: { shadow: { type: 'text', fields: { TEXT: "What's your name?" } } } },
        },
        { kind: 'block', type: 'scratch_sensing_answer' },
      ],
    },
    {
      kind: 'category',
      name: '📃 Lists',
      categorystyle: 'scratch_lists_category',
      contents: [
        { kind: 'block', type: 'lists_create_with' },
        { kind: 'block', type: 'lists_repeat' },
        { kind: 'block', type: 'lists_length' },
        { kind: 'block', type: 'lists_isEmpty' },
        { kind: 'block', type: 'lists_indexOf' },
        { kind: 'block', type: 'lists_getIndex' },
        { kind: 'block', type: 'lists_setIndex' },
        { kind: 'block', type: 'lists_getSublist' },
      ],
    },
  ];

  const hardwareCategories = [
    {
      kind: 'category',
      name: '🧩 Program',
      categorystyle: 'program_category',
      contents: [
        {
          kind: 'block',
          type: 'arduino_program',
        },
      ],
    },
    {
      kind: 'category',
      name: '⚡ Digital Pins',
      categorystyle: 'digital_category',
      contents: [
        { kind: 'block', type: 'arduino_pin_mode' },
        { kind: 'block', type: 'arduino_digital_write' },
        { kind: 'block', type: 'arduino_digital_read' },
      ],
    },
    {
      kind: 'category',
      name: '🌊 Analog & PWM',
      categorystyle: 'analog_category',
      contents: [
        { kind: 'block', type: 'arduino_analog_read' },
        {
          kind: 'block',
          type: 'arduino_analog_write',
          inputs: {
            VALUE: { shadow: { type: 'math_number', fields: { NUM: 255 } } },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: '⏱ Timing',
      categorystyle: 'control_category',
      contents: [
        {
          kind: 'block',
          type: 'arduino_delay',
          inputs: { DELAY_TIME: { shadow: { type: 'math_number', fields: { NUM: 1000 } } } },
        },
        { kind: 'block', type: 'arduino_millis' },
      ],
    },
    {
      kind: 'category',
      name: '📡 Serial Monitor',
      categorystyle: 'serial_category',
      contents: [
        { kind: 'block', type: 'arduino_serial_begin' },
        {
          kind: 'block',
          type: 'arduino_serial_print',
          inputs: { VALUE: { shadow: { type: 'text', fields: { TEXT: 'Hello' } } } },
        },
        {
          kind: 'block',
          type: 'arduino_serial_println',
          inputs: { VALUE: { shadow: { type: 'text', fields: { TEXT: 'Led ON' } } } },
        },
      ],
    },
  ];

  const sharedCategories = [
    {
      kind: 'category',
      name: '🔀 Logic',
      categorystyle: 'logic_category',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
      ],
    },
    {
      kind: 'category',
      name: '🔁 Loops',
      categorystyle: 'loop_category',
      contents: [
        {
          kind: 'block',
          type: 'controls_repeat_ext',
          inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } },
        },
        { kind: 'block', type: 'controls_whileUntil' },
        {
          kind: 'block',
          type: 'controls_for',
          inputs: {
            FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
            TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
            BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          },
        },
        { kind: 'block', type: 'controls_flow_statements' },
      ],
    },
    {
      kind: 'category',
      name: '🔢 Math',
      categorystyle: 'math_category',
      contents: [
        { kind: 'block', type: 'math_number' },
        {
          kind: 'block',
          type: 'math_arithmetic',
          inputs: {
            A: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
            B: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          },
        },
        {
          kind: 'block',
          type: 'math_modulo',
          inputs: {
            DIVIDEND: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
            DIVISOR: { shadow: { type: 'math_number', fields: { NUM: 3 } } },
          },
        },
        {
          kind: 'block',
          type: 'math_constrain',
          inputs: {
            VALUE: { shadow: { type: 'math_number', fields: { NUM: 50 } } },
            LOW: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
            HIGH: { shadow: { type: 'math_number', fields: { NUM: 255 } } },
          },
        },
        {
          kind: 'block',
          type: 'math_random_int',
          inputs: {
            FROM: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
            TO: { shadow: { type: 'math_number', fields: { NUM: 100 } } },
          },
        },
        {
          kind: 'block',
          type: 'math_round',
          inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 3.14 } } } },
        },
        {
          kind: 'block',
          type: 'math_single',
          inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 9 } } } },
        },
      ],
    },
    {
      kind: 'category',
      name: '💬 Text',
      categorystyle: 'text_category',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_join' },
        { kind: 'block', type: 'text_append' },
        { kind: 'block', type: 'text_length' },
        { kind: 'block', type: 'text_isEmpty' },
      ],
    },
    {
      kind: 'category',
      name: '📦 Variables',
      categorystyle: 'variable_category',
      custom: 'VARIABLE',
    },
    {
      kind: 'category',
      name: '🛠 My Blocks',
      categorystyle: 'function_category',
      custom: 'PROCEDURE',
    },
  ];

  return {
    kind: 'categoryToolbox',
    contents:
      engineMode === 'software'
        ? [...scratchCategories, ...sharedCategories]
        : [...hardwareCategories, ...sharedCategories],
  };
}
