# Type stub for editors only (Pyrefly, Pylance, mypy): not shipped to the browser.
#
# tg_host is not a file. python.worker.ts creates it in JavaScript with
# mp.registerJsModule('tg_host', {...}) before any student code runs, so the
# compat modules here can call back into the browser. Keep this in step with
# that call (and with tests/python/harness.mjs, which mirrors it).

can_input: bool
"""False in a browser window that can't pause Python for typed answers."""

def sleep(seconds: float) -> None: ...
def input(prompt: str) -> str | None:
    """The answer typed into the box, or None at end of input."""

def read_line() -> str | None: ...
def read_rest() -> str | None: ...
def ai_state() -> str:
    """The AI camera's latest prediction as JSON ('' when it is off)."""

def ai_camera(on: bool) -> None: ...
def re_compile(pattern: str, flags: int) -> str:
    """JSON: {"g": groups, "n": {name: index}, "f": inline flags} or {"e": error} (js-regex.ts)."""

def re_exec(pattern: str, flags: int, text: str, pos: int, endpos: int, mode: int) -> str:
    """'' for no match, else JSON [[start, end] or null, ...] per group (js-regex.ts)."""
