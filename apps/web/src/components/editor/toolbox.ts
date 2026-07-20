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
      contents: [{ kind: 'block', type: 'scratch_event_when_flag_clicked' }],
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
          type: 'scratch_motion_goto',
          inputs: {
            X: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
            Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          },
        },
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
        { kind: 'block', type: 'scratch_looks_show' },
        { kind: 'block', type: 'scratch_looks_hide' },
        { kind: 'block', type: 'scratch_looks_switch_costume_to' },
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
