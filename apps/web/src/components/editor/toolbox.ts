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
export const INITIAL_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    // ── Arduino Structure ────────────────────────────────────────────────────
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

    // ── Digital I/O ──────────────────────────────────────────────────────────
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

    // ── Analog I/O ───────────────────────────────────────────────────────────
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
            VALUE: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 255 },
              },
            },
          },
        },
      ],
    },

    // ── Timing / Control ─────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '⏱ Timing',
      categorystyle: 'control_category',
      contents: [
        {
          kind: 'block',
          type: 'arduino_delay',
          inputs: {
            DELAY_TIME: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 1000 },
              },
            },
          },
        },
        { kind: 'block', type: 'arduino_millis' },
      ],
    },

    // ── Serial Monitor ───────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '📡 Serial Monitor',
      categorystyle: 'serial_category',
      contents: [
        { kind: 'block', type: 'arduino_serial_begin' },
        {
          kind: 'block',
          type: 'arduino_serial_print',
          inputs: {
            VALUE: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'Hello' },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'arduino_serial_println',
          inputs: {
            VALUE: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'Led ON' },
              },
            },
          },
        },
      ],
    },

    // ── Logic ────────────────────────────────────────────────────────────────
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

    // ── Loops ────────────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '🔁 Repeat',
      categorystyle: 'loop_category',
      contents: [
        { kind: 'block', type: 'controls_repeat_ext' },
        { kind: 'block', type: 'controls_whileUntil' },
        { kind: 'block', type: 'controls_for' },
        { kind: 'block', type: 'controls_flow_statements' },
      ],
    },

    // ── Math ─────────────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '🔢 Math',
      categorystyle: 'math_category',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_modulo' },
        { kind: 'block', type: 'math_constrain' },
        { kind: 'block', type: 'math_random_int' },
      ],
    },

    // ── Text ─────────────────────────────────────────────────────────────────
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

    // ── Variables ────────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '📦 Variables',
      categorystyle: 'variable_category',
      custom: 'VARIABLE',
    },

    // ── Functions ────────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '🛠 My Blocks',
      categorystyle: 'function_category',
      custom: 'PROCEDURE',
    },
  ],
};
