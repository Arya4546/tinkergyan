/**
 * use-python-run.ts — React state for running a Python program.
 *
 * Output can arrive tens of thousands of times a second. It is collected in a
 * ref and pushed to React at most once per animation frame, and only the most
 * recent MAX_OUTPUT characters are kept on screen.
 *
 * The output is kept as a list of blocks of about CHUNK_SIZE characters, each
 * ending at a line break, instead of one big string. Each frame then only
 * changes the last block, so the browser lays out a few kilobytes per frame
 * instead of re-wrapping the whole console, which is what kept a flood of
 * prints from freezing the page.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  runPython,
  prewarmPython,
  disposePython,
  type RunHandle,
  type RunHandlers,
  type RunResult,
} from './python-runner';
import { friendlyError, type FriendlyError } from './friendly-errors';
import type { PythonErrorInfo } from './protocol';

export type RunStatus = 'idle' | 'running' | 'waiting' | 'finished' | 'stopped' | 'error';

export interface OutputChunk {
  id: number;
  text: string;
}

const MAX_OUTPUT = 200_000;
const CHUNK_SIZE = 4_096;
const LONG_LINE = CHUNK_SIZE * 4;
/** At most ~15 screen updates a second: enough to look live, a quarter of the work of 60. */
const MIN_PUBLISH_MS = 66;

/**
 * Where a program runs. The default runs it in the browser; a board supplies
 * its own (see use-python-board.ts). A backend may also end a run with
 * 'disconnected' (the board was unplugged).
 */
export type RunBackend = (
  code: string,
  handlers: Omit<RunHandlers, 'onDone'> & {
    onDone: (result: RunResult | { status: 'disconnected' }) => void;
  },
) => RunHandle;

export interface RunOptions {
  backend?: RunBackend;
  /**
   * The program reads typed input at any time (a board), rather than only
   * when it asks (input() in the browser): keep an answer box open.
   */
  interactive?: boolean;
  /** The program turned the AI camera on or off. */
  onAiCamera?: (on: boolean) => void;
}

export interface PythonRunState {
  status: RunStatus;
  /** The current run reads typed input at any time (see RunOptions). */
  interactive: boolean;
  /** The output, in blocks that each end at a line break (except the last). */
  chunks: OutputChunk[];
  hasOutput: boolean;
  /** True when early output was dropped to keep the page fast. */
  truncated: boolean;
  prompt: string;
  error: (FriendlyError & { raw: PythonErrorInfo }) | null;
  run: (code: string, options?: RunOptions) => void;
  stop: () => void;
  answer: (text: string) => void;
  clear: () => void;
  /** Add a message from TinkerGyan itself (not the program) to the output. */
  note: (text: string) => void;
}

interface Buffer {
  chunks: OutputChunk[];
  length: number;
  nextId: number;
  truncated: boolean;
}

export const emptyBuffer = (): Buffer => ({ chunks: [], length: 0, nextId: 0, truncated: false });

/** Add text to the buffer, starting a new block at a line break once the last one is full. */
export function appendTo(buf: Buffer, text: string): void {
  let rest = text;
  while (rest) {
    const last = buf.chunks[buf.chunks.length - 1];
    if (last && last.text.length < CHUNK_SIZE) {
      // Fill the current block (copy-on-write: React compares by object).
      const room = CHUNK_SIZE - last.text.length;
      const nl = rest.length <= room ? -1 : rest.lastIndexOf('\n', room - 1);
      const take =
        rest.length <= room
          ? rest.length
          : nl === -1
            ? rest.indexOf('\n') + 1 || rest.length
            : nl + 1;
      buf.chunks[buf.chunks.length - 1] = { id: last.id, text: last.text + rest.slice(0, take) };
      buf.length += take;
      rest = rest.slice(take);
    } else if (last && !last.text.endsWith('\n') && last.text.length < LONG_LINE) {
      // Don't split a line across two blocks: finish it first. (A line longer
      // than LONG_LINE does continue in a new block, or one endless line would
      // be re-laid out in full on every frame.)
      const nl = rest.indexOf('\n');
      const take = nl === -1 ? rest.length : nl + 1;
      buf.chunks[buf.chunks.length - 1] = { id: last.id, text: last.text + rest.slice(0, take) };
      buf.length += take;
      rest = rest.slice(take);
    } else {
      buf.chunks.push({ id: buf.nextId++, text: '' });
    }
  }
  // Drop whole blocks from the top until the output fits.
  while (buf.length > MAX_OUTPUT && buf.chunks.length > 1) {
    buf.length -= buf.chunks.shift()!.text.length;
    buf.truncated = true;
  }
  // One enormous line with no line breaks: keep only its end.
  const only = buf.chunks[0];
  if (buf.length > MAX_OUTPUT && only) {
    buf.chunks[0] = { id: only.id, text: only.text.slice(-MAX_OUTPUT) };
    buf.length = MAX_OUTPUT;
    buf.truncated = true;
  }
}

export function usePythonRun(): PythonRunState {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [interactive, setInteractive] = useState(false);
  const [chunks, setChunks] = useState<OutputChunk[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<PythonRunState['error']>(null);

  const handleRef = useRef<RunHandle | null>(null);
  const bufferRef = useRef<Buffer>(emptyBuffer());
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPublishRef = useRef(0);
  const runIdRef = useRef(0);

  const publish = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    lastPublishRef.current = performance.now();
    setChunks(bufferRef.current.chunks.slice());
    setTruncated(bufferRef.current.truncated);
  }, []);

  const append = useCallback(
    (text: string) => {
      appendTo(bufferRef.current, text);
      if (frameRef.current !== null || timerRef.current !== null) return;
      const onFrame = () => {
        frameRef.current = null;
        publish();
      };
      const wait = lastPublishRef.current + MIN_PUBLISH_MS - performance.now();
      if (wait <= 0) frameRef.current = requestAnimationFrame(onFrame);
      else
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          frameRef.current = requestAnimationFrame(onFrame);
        }, wait);
    },
    [publish],
  );

  const reset = useCallback(() => {
    bufferRef.current = emptyBuffer();
    publish();
  }, [publish]);

  useEffect(() => {
    prewarmPython();
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately bumps the live counter so callbacks of the stopped run are ignored
      runIdRef.current++;
      handleRef.current?.stop();
      handleRef.current = null;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      disposePython();
    };
  }, []);

  const run = useCallback(
    (code: string, options: RunOptions = {}) => {
      handleRef.current?.stop();
      const runId = ++runIdRef.current;
      reset();
      setError(null);
      setPrompt('');
      setStatus('running');
      setInteractive(!!options.interactive);
      const start: RunBackend = options.backend ?? runPython;
      handleRef.current = start(code, {
        onAiCamera: (on) => {
          if (runId === runIdRef.current) options.onAiCamera?.(on);
        },
        onOutput: (text) => {
          if (runId === runIdRef.current) append(text);
        },
        onInput: (p) => {
          if (runId !== runIdRef.current) return;
          publish(); // show the question now, not on the next frame
          setPrompt(p);
          setStatus('waiting');
        },
        onDone: (result) => {
          if (runId !== runIdRef.current) return;
          handleRef.current = null;
          publish(); // the very last output, before the status changes
          setPrompt('');
          if (result.status === 'ok') setStatus('finished');
          else if (result.status === 'stopped') setStatus('stopped');
          else if (result.status === 'disconnected') {
            const raw = {
              name: 'BoardDisconnected',
              message: '',
              line: null,
              traceback: '',
            };
            setError({ ...friendlyError(raw, code), raw });
            setStatus('error');
          } else {
            setError({ ...friendlyError(result.error, code), raw: result.error });
            setStatus('error');
          }
        },
      });
    },
    [append, publish, reset],
  );

  const stop = useCallback(() => {
    handleRef.current?.stop();
  }, []);

  const answer = useCallback((text: string) => {
    const h = handleRef.current;
    if (!h) return;
    setPrompt('');
    setStatus('running');
    h.answer(text);
  }, []);

  const note = useCallback(
    (text: string) => {
      const last = bufferRef.current.chunks[bufferRef.current.chunks.length - 1]?.text ?? '';
      appendTo(bufferRef.current, `${last && !last.endsWith('\n') ? '\n' : ''}⚠️ ${text}\n`);
      publish();
    },
    [publish],
  );

  const clear = useCallback(() => {
    reset();
    setError(null);
    setStatus((s) => (s === 'running' || s === 'waiting' ? s : 'idle'));
  }, [reset]);

  return {
    status,
    interactive,
    chunks,
    hasOutput: chunks.some((c) => c.text.length > 0),
    truncated,
    prompt,
    error,
    run,
    stop,
    answer,
    clear,
    note,
  };
}
