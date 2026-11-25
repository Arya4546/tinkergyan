# Python engine regression tests

Run with `pnpm --filter @tinkergyan/web test` (Node 22.6+; it loads the `.ts`
sources directly).

They run student programs on the same MicroPython build, PRELUDE and compat
modules the browser uses (`harness.mjs` reads them from the source), without a
browser. `input()` / `sys.stdin` answers come from the test.

- `fixtures/dsa/` — interview-style programs. Each `.expected` is CPython 3.12's
  output; `.in` holds stdin, one answer per line.
- `blocks.test.mjs` — "Convert to blocks": every block goes blocks → Python →
  blocks unchanged, typed programs print the same before and after conversion,
  and Python with no block is refused with the right line. It loads the real
  block generators through Vite (`blocks.mjs`, `blocks-env.mjs`).
- `fixtures/stdin/` — `input()`, `sys.stdin.*` and `open(0)` parity with CPython.
  The whole `.in` is typed, then input ends (Ctrl+D). An empty `.in` means
  input ends straight away.

To add a program: put `name.py` (and `name.in`) in a fixtures folder and create
`name.expected` with `python3 name.py < name.in > name.expected`. Avoid printing
plain dicts or sets: MicroPython orders them differently.
