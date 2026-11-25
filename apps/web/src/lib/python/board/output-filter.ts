/**
 * output-filter.ts — remove whole "control" lines from a stream of output
 * without delaying anything else.
 *
 * Board output mixes what the student printed with lines meant for the page
 * (e.g. "AI_VISION:ON", or MicroPython's start-up banner). Those lines must not
 * appear in the console, but ordinary text — including a prompt like
 * "Your name? " that has no newline yet — must show at once. So a partial line
 * is only held back while it could still turn into a control line.
 */
export class OutputFilter {
  private pending = '';
  private lineShown = false;

  constructor(
    private readonly opts: {
      /** True for a complete line (without "\n") that must not be shown. */
      isControl: (line: string) => boolean;
      /** True while a partial line could still become a control line. */
      mightBeControl: (partial: string) => boolean;
      /** Called with every control line removed from the output. */
      onControl?: (line: string) => void;
    },
  ) {}

  /** Feed text; returns the part to show now. */
  push(text: string): string {
    let out = '';
    const parts = text.split('\n');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const lineEnds = i < parts.length - 1;
      if (this.lineShown) {
        // The start of this line was already shown, so it is not a control line.
        out += part;
        if (lineEnds) {
          out += '\n';
          this.lineShown = false;
        }
        continue;
      }
      this.pending += part;
      if (lineEnds) {
        if (this.opts.isControl(this.pending)) this.opts.onControl?.(this.pending);
        else out += this.pending + '\n';
        this.pending = '';
      } else if (this.pending && !this.opts.mightBeControl(this.pending)) {
        out += this.pending;
        this.pending = '';
        this.lineShown = true;
      }
    }
    return out;
  }

  /** The end of the output: show whatever partial line is still held back. */
  flush(): string {
    const rest = this.pending;
    this.pending = '';
    this.lineShown = false;
    return rest && !this.opts.isControl(rest) ? rest : '';
  }
}

/** A filter for a list of exact control lines (e.g. ["AI_VISION:ON"]). */
export function exactLineFilter(lines: string[], onControl?: (line: string) => void): OutputFilter {
  const set = new Set(lines);
  return new OutputFilter({
    isControl: (l) => set.has(l.replace(/\r$/, '')),
    mightBeControl: (p) => lines.some((l) => l.startsWith(p)),
    ...(onControl ? { onControl } : {}),
  });
}

const TRACEBACK_HEADER = 'Traceback (most recent call last):';

/**
 * Holds back a traceback until it's clear what it is. When the program ends
 * with an error, MicroPython prints the traceback and then its banner: the
 * student sees the friendly explanation instead, so the traceback is dropped
 * (`end()`). A traceback the program printed itself (sys.print_exception) is
 * followed by more output, and then it is shown after all.
 */
export class TracebackHolder {
  private partial = '';
  private held: string[] | null = null;
  private sawException = false;
  /** The traceback that ended the program (followed by the end marker). */
  fatal: string | null = null;

  constructor(private readonly isEndMarker: (line: string) => boolean) {}

  push(text: string): string {
    let out = '';
    const parts = text.split('\n');
    for (let i = 0; i < parts.length; i++) {
      const lineEnds = i < parts.length - 1;
      this.partial += parts[i]!;
      if (!lineEnds) break;
      const line = this.partial;
      this.partial = '';
      out += this.line(line);
    }
    // A partial line shows at once (an input() prompt), unless it may be the
    // start of a traceback or we're inside one.
    if (this.held === null && this.partial && !TRACEBACK_HEADER.startsWith(this.partial)) {
      out += this.partial;
      this.partial = '';
      this.partialShown = true;
    }
    return out;
  }

  private partialShown = false;

  private line(line: string): string {
    if (this.partialShown) {
      // Its start was already shown: just finish it.
      this.partialShown = false;
      return line + '\n';
    }
    if (this.held === null) {
      if (line === TRACEBACK_HEADER) {
        this.held = [line];
        this.sawException = false;
        return '';
      }
      return line + '\n';
    }
    if (!this.sawException) {
      this.held.push(line);
      // Frames are indented; the first line that isn't is "Name: message".
      if (!/^\s/.test(line)) this.sawException = true;
      return '';
    }
    // The line after the exception decides.
    const held = this.held;
    this.held = null;
    if (this.isEndMarker(line)) {
      // The program ended with this error: the console explains it instead.
      this.fatal = held.join('\n');
      return line + '\n';
    }
    return held.join('\n') + '\n' + this.line(line);
  }

  /** The program ended: drop a held traceback, keep a partial line. */
  end(): string {
    const rest = this.held === null ? this.partial : '';
    this.partial = '';
    this.held = null;
    this.partialShown = false;
    return rest;
  }
}
