/**
 * ai-module.ts — `ai.py`, the AI module for programs that run on a board.
 *
 * The model can't run on an ESP32: it runs in the browser on the computer
 * the board is plugged into (see lib/python/ai-bridge.ts). When the program
 * prints "AI_VISION:ON" the page starts the camera and sends each new
 * prediction to the board over USB as one line:
 *
 *   AI:{"l": "cat", "c": {"cat": 97, "dog": 3}}
 *
 * which this module reads from the board's keyboard input without waiting.
 * The functions are the same as the browser's `ai` module.
 */

/** Bump when AI_MODULE changes, so boards get the new copy. */
export const AI_MODULE_VERSION = 1;

export const AI_MODULE = `# ai.py - TinkerGyan AI for MicroPython boards (version ${AI_MODULE_VERSION})
# Your AI model runs in the browser on the computer this board is plugged
# into, and the browser sends what it sees here over USB. Keep the board
# connected to TinkerGyan while your program uses the AI.
import sys
import select
import json

_poll = select.poll()
_poll.register(sys.stdin, select.POLLIN)
_stdin = getattr(sys.stdin, 'buffer', sys.stdin)
_line = b''
_label = ''
_conf = {}


def _update():
    global _line, _label, _conf
    while _poll.poll(0):
        c = _stdin.read(1)
        if not c:
            break
        if isinstance(c, str):
            c = c.encode()
        if c == b'\\n' or c == b'\\r':
            if _line.startswith(b'AI:'):
                try:
                    data = json.loads(_line[3:].decode())
                    _label = data.get('l', '')
                    _conf = data.get('c', {})
                except Exception:
                    pass
            _line = b''
        elif len(_line) < 1024:
            _line += c
        else:
            _line = b''


def start_camera():
    print('AI_VISION:ON')


def stop_camera():
    print('AI_VISION:OFF')


def label():
    _update()
    return _label


def confidence(name):
    _update()
    return _conf.get(str(name), 0)


def labels():
    _update()
    return list(_conf)
`;

/** Lines the board prints to control the camera (hidden from the console). */
export const AI_CONTROL_LINES = ['AI_VISION:ON', 'AI_VISION:OFF'];

/** True when a program imports the ai module. */
export function usesAi(code: string): boolean {
  return /^[ \t]*(import[ \t]+ai\b|from[ \t]+ai[ \t]+import\b)/m.test(code);
}

/** The line sent to the board for a prediction. */
export function aiLine(snapshot: { l: string; c: Record<string, number> }): string {
  // JSON escapes everything outside printable ASCII, so the line can't contain
  // a newline or a control character the board would treat as a command.
  return (
    'AI:' +
    JSON.stringify(snapshot).replace(/[\u007f-￿]/g, (ch) => {
      return '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
    })
  );
}
