/**
 * ai-bridge.ts — runs the student's AI model (trained in AI Studio) while a
 * Python program uses it.
 *
 * The program asks for the camera (`ai.start_camera()`); this starts the
 * webcam and the image model, and reports every new prediction as
 * { l: label, c: { label: percent } }. Where that goes depends on where the
 * program runs: to the service worker for a program in the browser, over USB
 * for a program on a board.
 *
 * The model itself is loaded with the project (editor.store), the same one
 * the blocks/C++ editors use, so nothing is trained or stored twice.
 */
import { aiEngine } from '../ai-engine';
import { useAIStore, visionClassNames } from '../../stores/ai.store';

export interface AiSnapshot {
  /** Top label, '' while nothing is recognised yet. */
  l: string;
  /** Every class with its confidence, 0–100. */
  c: Record<string, number>;
}

const VIDEO_ID = 'python-ai-video';

const NOTHING_TRAINED =
  'Your AI has nothing to recognise yet. Open AI Studio, train at least 2 classes with the Image model, and save.';

function videoElement(): HTMLVideoElement {
  let el = document.getElementById(VIDEO_ID) as HTMLVideoElement | null;
  if (!el) {
    el = document.createElement('video');
    el.id = VIDEO_ID;
    el.autoplay = true;
    el.playsInline = true;
    el.muted = true;
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  return el;
}

let active = false;
let generation = 0;

/**
 * Start the camera and the model. Resolves with a problem to tell the student
 * (no model trained, camera blocked), or null when it is running.
 */
export async function startAiCamera(onUpdate: (s: AiSnapshot) => void): Promise<string | null> {
  const gen = ++generation;
  stopAiCamera(false);
  generation = gen;
  // Nothing trained: say so at once, without downloading the image model.
  const trained = visionClassNames();
  if (trained.length < 2) return NOTHING_TRAINED;
  try {
    if (!aiEngine.isInitialised) await aiEngine.init();
    if (gen !== generation) return null;
    if (!aiEngine.isReadyToPredict) {
      return NOTHING_TRAINED;
    }
    const video = videoElement();
    await aiEngine.startWebcam(video);
    if (gen !== generation) {
      aiEngine.stopWebcam();
      return null;
    }
    useAIStore.getState().setWebcamActive(true);
    active = true;
    let last = '';
    aiEngine.startPredicting(
      video,
      (result) => {
        if (gen !== generation) return;
        useAIStore.getState().updatePrediction(result.label, result.allConfidences);
        // Whole percents, as the blocks promise (the engine averages to 0.1).
        const c: Record<string, number> = {};
        for (const [name, pct] of Object.entries(result.allConfidences)) c[name] = Math.round(pct);
        const snap: AiSnapshot = { l: result.belowThreshold ? '' : result.label, c };
        const key = JSON.stringify(snap);
        if (key !== last) {
          last = key;
          onUpdate(snap);
        }
      },
      true,
      false,
    );
    useAIStore.getState().setPredicting(true);
    return null;
  } catch (err) {
    if (gen === generation) stopAiCamera();
    const msg = err instanceof Error ? err.message : String(err);
    if (/Permission|NotAllowed|denied/i.test(msg)) {
      return 'The camera is blocked. Allow camera access for this site (the camera icon in the address bar), then run your program again.';
    }
    if (/NotFound|Requested device not found|no camera/i.test(msg)) {
      return 'No camera was found. Plug in a webcam, then run your program again.';
    }
    if (/NotReadable|in use|Could not start video/i.test(msg)) {
      return 'The camera is being used by another program or tab. Close it, then run your program again.';
    }
    return `The AI camera could not start: ${msg}`;
  }
}

/** Stop the camera and the model (safe to call any time). */
export function stopAiCamera(bumpGeneration = true): void {
  if (bumpGeneration) generation++;
  if (!active && !aiEngine.isWebcamActive) return;
  active = false;
  aiEngine.stopPredicting();
  aiEngine.stopWebcam();
  document.getElementById(VIDEO_ID)?.remove();
  const store = useAIStore.getState();
  store.setWebcamActive(false);
  store.setPredicting(false);
  store.clearPrediction();
}
