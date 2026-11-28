# Python engine regression tests

Run with `pnpm --filter @tinkergyan/web test` (Node 22.6+; it loads the `.ts`
sources directly).

They run student programs on the same MicroPython build, PRELUDE and compat
modules the browser uses (`harness.mjs` reads them from the source), without a
browser. `input()` / `sys.stdin` answers come from the test.

- `fixtures/compat/` — Python the engine can't run by itself, made to work:
  `re` (on the browser's regex engine, `js-regex.ts`), `s[::-1]` and
  `a[::2] = …` (`rewrite.ts`), `dataclasses`, `RecursionError`. Each
  `.expected` is CPython's output.
- `fixtures/dsa/` — interview-style programs. Each `.expected` is CPython 3.12's
  output; `.in` holds stdin, one answer per line.
- `blocks.test.mjs` — "Convert to blocks": every block goes blocks → Python →
  blocks unchanged, typed programs print the same before and after conversion,
  Python with no block stays as "Python code" blocks (noted with its line),
  only Python that can't run is refused, every example and fixture converts
  again to identical code, and every toolbox block makes Python. It loads the real
  block generators through Vite (`blocks.mjs`, `blocks-env.mjs`).
- `fixtures/stdin/` — `input()`, `sys.stdin.*` and `open(0)` parity with CPython.
  The whole `.in` is typed, then input ends (Ctrl+D). An empty `.in` means
  input ends straight away.

To add a program: put `name.py` (and `name.in`) in a fixtures folder and create
`name.expected` with `python3 name.py < name.in > name.expected`. Avoid printing
plain dicts or sets: MicroPython orders them differently.

## Hardware blocks (`tests/hardware/`)

`servo.test.mjs` checks the servo motor blocks for Arduino C++ and ESP32
MicroPython. The C++ is compiled with g++ against the API's Arduino shim
(`apps/api/src/lib/arduino-shim.ts`) and run, so the angles each block sends
are checked (skipped when g++ is missing). The simulator code runs on a fake
clock, the Python runs in the test MicroPython with a fake `machine` module, and
both "Convert to blocks" directions are checked. `hardware.mjs` loads the real
blocks and generators through Vite, like `blocks.mjs`.
