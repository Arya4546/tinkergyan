/**
 * use-python-board.ts — React state for the ESP32 a Python project runs on.
 *
 *   connect()            pick the board (browser dialog) and check MicroPython
 *   installMicroPython() put MicroPython on it (first time, or after Arduino)
 *   backend              pass to usePythonRun().run() to run a program on it
 *   saveBackend          …to save the program as main.py and start it, so it
 *                        also runs by itself when the board is powered
 *   removeProgram()      delete main.py
 *   sendAi(snapshot)     give the running program the AI model's prediction
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  hardwareUnsupportedMessage,
  isHardwareSupported,
  requestHardwarePort,
  type HardwarePort,
} from '../../usb-serial';
import type { RunBackend } from '../use-python-run';
import type { PythonBoardTarget } from '../targets';
import {
  MicroPythonBoard,
  NoMicroPythonError,
  type BoardInfo,
  type BoardRun,
  type BoardRunResult,
} from './mp-board';
import { firmwareForChip, loadFirmware } from './firmware';
import { AI_CONTROL_LINES, AI_MODULE, aiLine, usesAi } from './ai-module';
import { exactLineFilter } from './output-filter';

export type BoardStatus =
  | 'unsupported'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'needs-micropython'
  | 'installing';

export type ConnectResult = 'connected' | 'needs-micropython' | 'failed' | 'cancelled';

export interface InstallProgress {
  percent: number;
  message: string;
}

export interface PythonBoardState {
  status: BoardStatus;
  info: BoardInfo | null;
  /** Something to tell the student (why connecting failed, …). */
  problem: string | null;
  install: InstallProgress | null;
  /** Why hardware can't be used in this browser (status 'unsupported'). */
  unsupportedMessage: string;
  /** Pick and open a board. Resolves with how it went. */
  connect: () => Promise<ConnectResult>;
  disconnect: () => Promise<void>;
  installMicroPython: () => Promise<PythonBoardTarget | null>;
  removeProgram: () => Promise<boolean>;
  backend: RunBackend;
  saveBackend: RunBackend;
  sendAi: (snapshot: { l: string; c: Record<string, number> }) => void;
  clearProblem: () => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function friendlyConnectError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (err instanceof DOMException && err.name === 'NotFoundError') return '';
  if (/No port selected|cancel/i.test(msg)) return '';
  return msg;
}

/** Ports the page may already use without asking (Web Serial only). */
async function knownPorts(): Promise<HardwarePort[]> {
  const serial = (navigator as unknown as { serial?: { getPorts(): Promise<HardwarePort[]> } })
    .serial;
  try {
    return serial ? await serial.getPorts() : [];
  } catch {
    return [];
  }
}

export function usePythonBoard(target: PythonBoardTarget | null): PythonBoardState {
  const supported = isHardwareSupported();
  const [status, setStatus] = useState<BoardStatus>(supported ? 'disconnected' : 'unsupported');
  const [info, setInfo] = useState<BoardInfo | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [install, setInstall] = useState<InstallProgress | null>(null);

  const boardRef = useRef<MicroPythonBoard | null>(null);
  /** The port the student picked, kept so Install doesn't ask again. */
  const portRef = useRef<HardwarePort | null>(null);
  const runRef = useRef<BoardRun | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runRef.current?.stop();
      void boardRef.current?.close();
      boardRef.current = null;
    };
  }, []);

  // Leaving mid-install leaves the board half-written (installing again fixes
  // it, but a child won't know that): ask first.
  useEffect(() => {
    if (status !== 'installing') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [status]);

  // Start downloading MicroPython in the background once a board project is
  // open, so installing doesn't wait for it.
  useEffect(() => {
    if (target && status === 'needs-micropython') void loadFirmware(target).catch(() => {});
  }, [target, status]);

  const attach = useCallback((board: MicroPythonBoard) => {
    boardRef.current = board;
    board.onClose(() => {
      if (boardRef.current !== board) return;
      boardRef.current = null;
      if (!mountedRef.current) return;
      setStatus('disconnected');
      setInfo(null);
      setProblem('The board was disconnected. Plug it in and press Connect.');
    });
    setInfo(board.info);
    setStatus('connected');
    setProblem(null);
  }, []);

  const openPort = useCallback(
    async (port: HardwarePort): Promise<ConnectResult> => {
      portRef.current = port;
      setStatus('connecting');
      setProblem(null);
      try {
        const board = await MicroPythonBoard.open(port);
        if (!mountedRef.current) {
          void board.close();
          return 'failed';
        }
        attach(board);
        return 'connected';
      } catch (err) {
        if (!mountedRef.current) return 'failed';
        if (err instanceof NoMicroPythonError) {
          setStatus('needs-micropython');
          setProblem(null);
          return 'needs-micropython';
        }
        setStatus('disconnected');
        setProblem(friendlyConnectError(err) || null);
        return 'failed';
      }
    },
    [attach],
  );

  const connect = useCallback(async (): Promise<ConnectResult> => {
    if (!supported || busyRef.current) return 'failed';
    busyRef.current = true;
    try {
      runRef.current?.stop();
      await boardRef.current?.close();
      boardRef.current = null;
      let port: HardwarePort;
      try {
        port = await requestHardwarePort();
      } catch (err) {
        const msg = friendlyConnectError(err);
        if (msg) setProblem(msg);
        // The old board (if any) was let go of above.
        setStatus((s) => (s === 'connected' ? 'disconnected' : s));
        return msg ? 'failed' : 'cancelled';
      }
      return await openPort(port);
    } finally {
      busyRef.current = false;
    }
  }, [supported, openPort]);

  const disconnect = useCallback(async () => {
    runRef.current?.stop();
    const b = boardRef.current;
    boardRef.current = null;
    await b?.close();
    setStatus(supported ? 'disconnected' : 'unsupported');
    setInfo(null);
    setProblem(null);
  }, [supported]);

  const installMicroPython = useCallback(async (): Promise<PythonBoardTarget | null> => {
    if (busyRef.current) return null;
    busyRef.current = true;
    let installed: PythonBoardTarget | null = null;
    try {
      let port = portRef.current;
      if (!port) {
        try {
          port = await requestHardwarePort();
        } catch (err) {
          const msg = friendlyConnectError(err);
          if (msg) setProblem(msg);
          return null;
        }
        portRef.current = port;
      }
      await boardRef.current?.close();
      boardRef.current = null;
      setStatus('installing');
      setProblem(null);
      setInstall({ percent: 0, message: 'Getting ready…' });
      const info = port.getInfo();
      // The flasher (esptool) is only needed here: load it now, not with the page.
      const { WebSerialFlasher } = await import('../../web-serial-flasher');

      const flashOnce = (baudrate: number) =>
        new WebSerialFlasher(port).flashMicroPython(
          async (chipName) => {
            const fw = await firmwareForChip(chipName);
            installed = fw.target;
            return fw;
          },
          {
            baudrate,
            onProgress: (percent, message) => {
              if (mountedRef.current) setInstall({ percent, message });
            },
          },
        );

      try {
        await flashOnce(460800);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // A cable or adapter that can't keep up with the fast speed: try the
        // slow one once. Anything the student must fix is reported at once.
        if (!installed || /busy|ESP8266|Python projects work with|download/i.test(msg)) throw err;
        setInstall({ percent: 2, message: 'Trying again more slowly…' });
        await flashOnce(115200);
      }

      // The board restarts into MicroPython. Boards whose USB is built into
      // the chip disappear and come back, possibly as a different port.
      setInstall({ percent: 100, message: 'Starting MicroPython…' });
      await sleep(2500);
      let reconnected = false;
      for (let attempt = 0; attempt < 6 && !reconnected && mountedRef.current; attempt++) {
        const candidates = [port, ...(await knownPorts()).filter((p) => p !== port)].filter((p) => {
          const pi = p.getInfo();
          return p === port || (pi.usbVendorId === info.usbVendorId && !!pi.usbVendorId);
        });
        for (const p of candidates) {
          try {
            const board = await MicroPythonBoard.open(p);
            portRef.current = p;
            attach(board);
            reconnected = true;
            break;
          } catch {
            /* not this one / not ready yet */
          }
        }
        if (!reconnected) await sleep(1500);
      }
      if (!reconnected && mountedRef.current) {
        setStatus('disconnected');
        setProblem(
          'MicroPython is installed! Press Connect and pick your board again (it may have a new name in the list).',
        );
      }
      return installed;
    } catch (err) {
      if (mountedRef.current) {
        setStatus('needs-micropython');
        setProblem(err instanceof Error ? err.message : String(err));
      }
      return null;
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setInstall(null);
    }
  }, [attach]);

  /** Wrap a board operation as a run backend for usePythonRun. */
  const makeBackend = useCallback(
    (
      start: (
        board: MicroPythonBoard,
        code: string,
        handlers: Parameters<RunBackend>[1],
      ) => BoardRun,
    ) =>
      ((code, handlers) => {
        const board = boardRef.current;
        if (!board) {
          setTimeout(() => handlers.onDone({ status: 'disconnected' }), 0);
          return { answer: () => {}, stop: () => {} };
        }
        const run = start(board, code, handlers);
        runRef.current = run;
        return {
          answer: (text: string) => run.send(text),
          stop: () => run.stop(),
        };
      }) as RunBackend,
    [],
  );

  const wrapHandlers = (handlers: Parameters<RunBackend>[1]) => {
    // Hide the camera control lines the ai module prints, and act on them.
    const filter = exactLineFilter(AI_CONTROL_LINES, (line) =>
      handlers.onAiCamera?.(line.trim() === 'AI_VISION:ON'),
    );
    return {
      onOutput: (text: string) => {
        const visible = filter.push(text);
        if (visible) handlers.onOutput(visible);
      },
      onDone: (result: BoardRunResult) => {
        const rest = filter.flush();
        if (rest) handlers.onOutput(rest);
        runRef.current = null;
        handlers.onDone(result);
      },
    };
  };

  const helperFiles = (code: string): Record<string, string> =>
    usesAi(code) ? { '/ai.py': AI_MODULE } : {};

  const backend = useCallback<RunBackend>(
    (code, handlers) =>
      makeBackend((board, c, h) => board.run(c, wrapHandlers(h), helperFiles(c)))(code, handlers),
    [makeBackend],
  );

  const saveBackend = useCallback<RunBackend>(
    (code, handlers) =>
      makeBackend((board, c, h) => {
        const wrapped = wrapHandlers(h);
        let inner: BoardRun | null = null;
        let stopped = false;
        board
          .saveProgram(c, helperFiles(c))
          .then(() => {
            if (stopped) return wrapped.onDone({ status: 'stopped' });
            h.onOutput(
              '✅ Saved on the board. It will also run by itself whenever the board gets power.\n',
            );
            inner = board.startSavedProgram(wrapped);
            runRef.current = inner;
          })
          .catch((err: unknown) => {
            wrapped.onDone(
              board.closed
                ? { status: 'disconnected' }
                : {
                    status: 'error',
                    error: {
                      name: 'BoardError',
                      message: err instanceof Error ? err.message : String(err),
                      line: null,
                      traceback: '',
                    },
                  },
            );
          });
        return {
          send: (t) => inner?.send(t),
          sendLine: (l) => inner?.sendLine(l),
          stop: () => {
            stopped = true;
            inner?.stop();
          },
        };
      })(code, handlers),
    [makeBackend],
  );

  const removeProgram = useCallback(async () => {
    const board = boardRef.current;
    if (!board) return false;
    return board.removeProgram();
  }, []);

  // The camera's confidences change on almost every frame, but the board's
  // input buffer is small (a few hundred bytes) and the program may only look
  // now and then. A new label goes at once; other changes at most every 300 ms,
  // always the latest.
  const aiSentRef = useRef({ label: null as string | null, at: 0 });
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiLatestRef = useRef<{ l: string; c: Record<string, number> } | null>(null);
  const sendAi = useCallback((snapshot: { l: string; c: Record<string, number> }) => {
    aiLatestRef.current = snapshot;
    const flushAi = () => {
      aiTimerRef.current = null;
      const snap = aiLatestRef.current;
      if (!snap) return;
      aiSentRef.current = { label: snap.l, at: Date.now() };
      runRef.current?.sendLine(aiLine(snap));
    };
    const sent = aiSentRef.current;
    const since = Date.now() - sent.at;
    if (snapshot.l !== sent.label || since >= 300) {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      flushAi();
    } else if (!aiTimerRef.current) {
      aiTimerRef.current = setTimeout(flushAi, 300 - since);
    }
  }, []);
  useEffect(
    () => () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    },
    [],
  );

  return {
    status,
    info,
    problem,
    install,
    unsupportedMessage: supported ? '' : hardwareUnsupportedMessage('ESP32 board'),
    connect,
    disconnect,
    installMicroPython,
    removeProgram,
    backend,
    saveBackend,
    sendAi,
    clearProblem: () => setProblem(null),
  };
}
