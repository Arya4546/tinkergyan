# ai: the student's AI Studio model, for programs that run in the browser.
# Same functions as ai.py on a board (lib/python/board/ai-module.ts).
import json
import tg_host


def start_camera():
    tg_host.ai_camera(True)


def stop_camera():
    tg_host.ai_camera(False)


def _state():
    if not tg_host.can_input:
        raise RuntimeError(
            "AI needs a normal (not private) browser window. Open TinkerGyan in a normal Chrome, Edge, Firefox or Safari window."
        )
    raw = tg_host.ai_state()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except ValueError:
        return {}


def label():
    return _state().get("l", "")


def confidence(name):
    return _state().get("c", {}).get(str(name), 0)


def labels():
    return list(_state().get("c", {}))
