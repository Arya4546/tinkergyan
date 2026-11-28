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
import { isPythonBoardTarget } from '../../lib/python/targets';

export function getToolbox(engineMode: 'hardware' | 'software' | 'python', board = '') {
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
        { kind: 'block', type: 'scratch_motion_goto_random' },
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
        { kind: 'block', type: 'arduino_pulse_in' },
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
      name: '⚙️ Servo Motor',
      categorystyle: 'analog_category',
      contents: [
        {
          kind: 'block',
          type: 'arduino_servo_write',
          inputs: { ANGLE: { shadow: { type: 'math_number', fields: { NUM: 90 } } } },
        },
        {
          kind: 'block',
          type: 'arduino_servo_sweep',
          inputs: {
            FROM: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
            TO: { shadow: { type: 'math_number', fields: { NUM: 180 } } },
            SECONDS: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          },
        },
        {
          kind: 'block',
          type: 'arduino_servo_spin',
          inputs: { SPEED: { shadow: { type: 'math_number', fields: { NUM: 50 } } } },
        },
        { kind: 'block', type: 'arduino_servo_release' },
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
        { kind: 'block', type: 'arduino_serial_available' },
        { kind: 'block', type: 'arduino_serial_read' },
      ],
    },
  ];

  const aiCategory = [
    {
      kind: 'category',
      name: '🤖 My AI Model',
      categorystyle: 'ai_category',
      contents: [
        // ── Examples (UX Helpers) ─────────────────────────────────────────
        { kind: 'label', text: '💡 How to use AI blocks (Examples)' },
        ...(engineMode === 'software'
          ? [
              {
                kind: 'block',
                type: 'controls_if',
                inputs: {
                  IF0: {
                    block: {
                      type: 'logic_compare',
                      fields: { OP: 'EQ' },
                      inputs: {
                        A: { block: { type: 'ai_current_prediction' } },
                        B: { shadow: { type: 'text', fields: { TEXT: 'Object 1' } } },
                      },
                    },
                  },
                },
              },
              {
                kind: 'block',
                type: 'controls_if',
                inputs: {
                  IF0: {
                    block: {
                      type: 'logic_compare',
                      fields: { OP: 'GT' },
                      inputs: {
                        A: { block: { type: 'ai_confidence_of' } },
                        B: { shadow: { type: 'math_number', fields: { NUM: 80 } } },
                      },
                    },
                  },
                },
              },
            ]
          : []),

        {
          kind: 'block',
          type: 'controls_if',
          inputs: {
            IF0: { block: { type: 'ai_face_detected' } },
          },
        },

        // ── Image Classification ──────────────────────────────────────────
        { kind: 'label', text: '🎥 Image Classifier' },
        { kind: 'block', type: 'ai_turn_vision' },
        { kind: 'block', type: 'ai_when_predicted' },
        ...(engineMode === 'software'
          ? [
              { kind: 'block', type: 'ai_current_prediction' },
              { kind: 'block', type: 'ai_confidence_of' },
              { kind: 'block', type: 'ai_is_predicting' },
            ]
          : []),

        // ── Emotion / Face Detection ──────────────────────────────────────
        { kind: 'label', text: '😊 Emotion Detection' },
        { kind: 'block', type: 'ai_turn_emotion' },
        { kind: 'block', type: 'ai_when_emotion' },
        { kind: 'block', type: 'ai_emotion_detected' },
        { kind: 'block', type: 'ai_emotion_confidence' },
        { kind: 'block', type: 'ai_face_detected' },
        { kind: 'block', type: 'ai_face_position' },

        // ── Hand / Finger Tracking ────────────────────────────────────────
        { kind: 'label', text: '✋ Hand Tracking' },
        { kind: 'block', type: 'ai_turn_hand_tracking' },
        { kind: 'block', type: 'ai_when_hand_gesture' },
        { kind: 'block', type: 'ai_hand_gesture' },
        { kind: 'block', type: 'ai_hand_x' },
        { kind: 'block', type: 'ai_hand_y' },
        { kind: 'block', type: 'ai_hand_detected' },

        // ── Pose / Body Detection ─────────────────────────────────────────
        { kind: 'label', text: '🕺 Body Pose' },
        { kind: 'block', type: 'ai_pose_x' },
        { kind: 'block', type: 'ai_pose_y' },

        // ── Voice Commands ────────────────────────────────────────────────
        { kind: 'label', text: '🎤 Voice Commands' },
        { kind: 'block', type: 'ai_audio_listen' },
        { kind: 'block', type: 'ai_when_hear_word' },
        { kind: 'block', type: 'ai_latest_word' },

        // ── Speech-to-Text ────────────────────────────────────────────────
        { kind: 'label', text: '📝 Speech-to-Text' },
        { kind: 'block', type: 'ai_speech_listen' },
        { kind: 'block', type: 'ai_speech_stop' },
        { kind: 'block', type: 'ai_speech_heard' },
        { kind: 'block', type: 'ai_when_speech_contains' },

        // ── Text-to-Speech ────────────────────────────────────────────────
        { kind: 'label', text: '🔊 Text-to-Speech' },
        { kind: 'block', type: 'ai_speak' },
        { kind: 'block', type: 'ai_speak_in_lang' },
        { kind: 'block', type: 'ai_set_speech_speed' },
        { kind: 'block', type: 'ai_stop_speaking' },

        // ── Text Classification (NLP) ─────────────────────────────────────
        { kind: 'label', text: '💬 Text AI' },
        { kind: 'block', type: 'ai_classify_text' },
        { kind: 'block', type: 'ai_when_text_classified' },

        // ── AI Music (Magenta) ────────────────────────────────────────────
        { kind: 'label', text: '🎵 AI Music' },
        { kind: 'block', type: 'ai_generate_music' },
        { kind: 'block', type: 'ai_stop_music' },
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
        {
          kind: 'block',
          type: 'text_join',
          inputs: {
            ADD0: { shadow: { type: 'text', fields: { TEXT: 'hello' } } },
            ADD1: { shadow: { type: 'text', fields: { TEXT: 'world' } } },
          },
        },
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

  if (engineMode === 'python') {
    return {
      kind: 'categoryToolbox',
      contents: getPythonCategories(
        sharedCategories,
        isPythonBoardTarget(board),
      ) as unknown as typeof sharedCategories,
    };
  }

  return {
    kind: 'categoryToolbox',
    contents:
      engineMode === 'software'
        ? [...scratchCategories, ...sharedCategories, ...aiCategory]
        : [...hardwareCategories, ...sharedCategories, ...aiCategory],
  };
}

/**
 * Python projects: the shared Logic/Loops/Math/Text/Variables/My Blocks
 * categories plus Python's own Print & Ask, Lists and Time. Every block listed
 * here is run under MicroPython by the test suite (python-blocks.test), so
 * only add blocks whose generated code MicroPython supports.
 */
function getPythonCategories(
  sharedCategories: ReadonlyArray<{ name: string; contents?: unknown }>,
  onBoard: boolean,
): unknown[] {
  const shared = (name: string) => sharedCategories.find((c) => c.name === name)!;
  const text = (value: string) => ({ shadow: { type: 'text', fields: { TEXT: value } } });
  const num = (value: number) => ({ shadow: { type: 'math_number', fields: { NUM: value } } });

  const textCategory = shared('💬 Text');
  return [
    {
      kind: 'category',
      name: '🖨 Print & Ask',
      categorystyle: 'python_io_category',
      contents: [
        { kind: 'block', type: 'text_print', inputs: { TEXT: text('Hello!') } },
        { kind: 'block', type: 'py_ask_text', inputs: { QUESTION: text('What is your name? ') } },
        { kind: 'block', type: 'py_ask_number', inputs: { QUESTION: text('Pick a number: ') } },
      ],
    },
    shared('🔀 Logic'),
    {
      ...shared('🔁 Loops'),
      contents: [
        ...(shared('🔁 Loops').contents as unknown[]).slice(0, 3),
        { kind: 'block', type: 'controls_forEach' },
        {
          kind: 'block',
          type: 'py_range',
          inputs: { START: num(0), STOP: num(10), STEP: num(1) },
        },
        ...(shared('🔁 Loops').contents as unknown[]).slice(3),
      ],
    },
    {
      ...shared('🔢 Math'),
      contents: [
        ...(shared('🔢 Math').contents as unknown[]),
        { kind: 'block', type: 'py_factorial', inputs: { NUM: num(5) } },
      ],
    },
    {
      ...textCategory,
      contents: [
        ...(textCategory.contents as unknown[]),
        { kind: 'block', type: 'text_changeCase', inputs: { TEXT: text('hello') } },
        { kind: 'block', type: 'py_capitalize', inputs: { TEXT: text('hELLO') } },
      ],
    },
    {
      kind: 'category',
      name: '📃 Lists',
      categorystyle: 'python_list_category',
      contents: [
        { kind: 'block', type: 'lists_create_with' },
        { kind: 'block', type: 'lists_create_empty' },
        { kind: 'block', type: 'lists_length' },
        { kind: 'block', type: 'lists_isEmpty' },
        { kind: 'block', type: 'lists_getIndex' },
        { kind: 'block', type: 'lists_setIndex' },
        { kind: 'block', type: 'lists_indexOf' },
        { kind: 'block', type: 'lists_sort' },
      ],
    },
    {
      kind: 'category',
      name: '🗂 Data',
      categorystyle: 'python_data_category',
      contents: [
        { kind: 'block', type: 'py_type', inputs: { VALUE: num(42) } },
        {
          kind: 'block',
          type: 'py_dict',
          inputs: { KEY0: text('name'), VALUE0: text('Asha'), KEY1: text('age'), VALUE1: num(12) },
        },
        { kind: 'block', type: 'py_dict_get', inputs: { KEY: text('name') } },
        { kind: 'block', type: 'py_dict_set', inputs: { KEY: text('age'), VALUE: num(13) } },
        {
          kind: 'block',
          type: 'py_tuple',
          inputs: {
            ITEMS: {
              block: {
                type: 'lists_create_with',
                extraState: { itemCount: 2 },
                inputs: { ADD0: num(3), ADD1: num(4) },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'py_set',
          inputs: {
            ITEMS: {
              block: {
                type: 'lists_create_with',
                extraState: { itemCount: 3 },
                inputs: { ADD0: text('red'), ADD1: text('red'), ADD2: text('blue') },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: '⏱ Time',
      categorystyle: 'python_time_category',
      contents: [{ kind: 'block', type: 'py_wait', inputs: { SECONDS: num(1) } }],
    },
    // Pins and sensors only exist on a board, so they are only offered there.
    ...(onBoard
      ? [
          {
            kind: 'category',
            name: '💡 Pins',
            categorystyle: 'python_pins_category',
            contents: [
              { kind: 'block', type: 'py_led_builtin' },
              { kind: 'block', type: 'py_pin_write' },
              { kind: 'block', type: 'py_button_pressed' },
              { kind: 'block', type: 'py_pin_read' },
            ],
          },
          {
            kind: 'category',
            name: '🎚 Analog & PWM',
            categorystyle: 'python_analog_category',
            contents: [
              { kind: 'block', type: 'py_analog_read' },
              { kind: 'block', type: 'py_pwm_write', inputs: { PERCENT: num(50) } },
              {
                kind: 'block',
                type: 'py_tone',
                inputs: { FREQ: num(440), SECONDS: num(0.5) },
              },
            ],
          },
          {
            kind: 'category',
            name: '⚙️ Servo Motor',
            categorystyle: 'python_analog_category',
            contents: [
              { kind: 'block', type: 'py_servo', inputs: { ANGLE: num(90) } },
              {
                kind: 'block',
                type: 'py_servo_sweep',
                inputs: { FROM: num(0), TO: num(180), SECONDS: num(1) },
              },
              { kind: 'block', type: 'py_servo_spin', inputs: { SPEED: num(50) } },
              { kind: 'block', type: 'py_servo_release' },
            ],
          },
          {
            kind: 'category',
            name: '📡 Sensors',
            categorystyle: 'python_sensor_category',
            contents: [
              { kind: 'block', type: 'py_distance' },
              { kind: 'block', type: 'py_dht' },
            ],
          },
        ]
      : []),
    {
      kind: 'category',
      name: '🤖 AI',
      categorystyle: 'python_ai_category',
      contents: [
        { kind: 'block', type: 'py_ai_camera' },
        { kind: 'block', type: 'py_ai_sees' },
        { kind: 'block', type: 'py_ai_label' },
        { kind: 'block', type: 'py_ai_confidence' },
      ],
    },
    shared('📦 Variables'),
    shared('🛠 My Blocks'),
    {
      kind: 'category',
      name: '🐍 Python code',
      categorystyle: 'python_code_category',
      contents: [
        { kind: 'block', type: 'py_code', fields: { LINE0: 'print("Hi from Python!")' } },
        { kind: 'block', type: 'py_code_value', fields: { LINE0: 'len("hello")' } },
        { kind: 'block', type: 'py_code_wrap', fields: { LINE0: 'for letter in "abc"' } },
      ],
    },
  ];
}
