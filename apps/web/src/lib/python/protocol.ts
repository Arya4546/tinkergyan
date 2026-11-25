/** Messages between the page (python-runner.ts) and the worker (python.worker.ts). */

export interface PythonErrorInfo {
  /** Python exception class, e.g. "NameError". */
  name: string;
  /** Exception message, e.g. "name 'prnt' isn't defined". */
  message: string;
  /** 1-based line in the student's code, when the error came from it. */
  line: number | null;
  /** The full traceback text, for the "details" view. */
  traceback: string;
}

export type ToWorker = {
  type: 'run';
  code: string;
  /** True when /__py_sync__/ is served by our service worker (input/sleep can block). */
  syncAvailable: boolean;
  /** Service worker key of this tab's AI prediction (tabs must not share one). */
  aiKey: string;
};

export type FromWorker =
  | { type: 'ready' }
  | { type: 'output'; text: string }
  | { type: 'input'; id: string; prompt: string }
  /** The program called ai.start_camera() / ai.stop_camera(). */
  | { type: 'ai-camera'; on: boolean }
  /** The program hit the memory cap. The engine sometimes hangs after that. */
  | { type: 'memory-limit' }
  | { type: 'done'; ok: true }
  | { type: 'done'; ok: false; error: PythonErrorInfo }
  | { type: 'fatal'; message: string };
