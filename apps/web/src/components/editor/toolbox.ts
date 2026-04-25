/**
 * toolbox.ts
 * Arduino-specific Blockly toolbox configuration.
 * Custom Arduino blocks appear first; standard Blockly utilities follow.
 */
export const INITIAL_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    // ── Arduino Structure ────────────────────────────────────────────────────
    {
      kind: 'category',
      name: 'PROGRAM',
      colour: '#1565C0',
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
      name: 'DIGITAL_IO',
      colour: '#2E7D32',
      contents: [
        { kind: 'block', type: 'arduino_pin_mode' },
        { kind: 'block', type: 'arduino_digital_write' },
        { kind: 'block', type: 'arduino_digital_read' },
      ],
    },

    // ── Analog I/O ───────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: 'ANALOG_IO',
      colour: '#E65100',
      contents: [
        { kind: 'block', type: 'arduino_analog_read' },
        { kind: 'block', type: 'arduino_analog_write' },
      ],
    },

    // ── Timing / Control ─────────────────────────────────────────────────────
    {
      kind: 'category',
      name: 'CONTROL',
      colour: '#6A1B9A',
      contents: [
        { kind: 'block', type: 'arduino_delay' },
        { kind: 'block', type: 'arduino_millis' },
      ],
    },

    // ── Serial Monitor ───────────────────────────────────────────────────────
    {
      kind: 'category',
      name: 'SERIAL',
      colour: '#B71C1C',
      contents: [
        { kind: 'block', type: 'arduino_serial_begin' },
        { kind: 'block', type: 'arduino_serial_print' },
        { kind: 'block', type: 'arduino_serial_println' },
      ],
    },

    // ── Separator ────────────────────────────────────────────────────────────
    { kind: 'sep' },

    // ── Logic ────────────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: 'LOGIC',
      colour: '#5C81A6',
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
      name: 'LOOPS',
      colour: '#5CA65C',
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
      name: 'MATH',
      colour: '#5C68A6',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_modulo' },
        { kind: 'block', type: 'math_constrain' },
        { kind: 'block', type: 'math_random_int' },
      ],
    },

    // ── Variables ────────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: 'VARIABLES',
      colour: '#A65C5C',
      custom: 'VARIABLE',
    },

    // ── Functions ────────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: 'FUNCTIONS',
      colour: '#9A5CA6',
      custom: 'PROCEDURE',
    },
  ],
};
