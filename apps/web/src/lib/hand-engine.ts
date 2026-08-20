/**
 * hand-engine.ts
 *
 * Browser-native hand and finger tracking using MediaPipe Hands via
 * @tensorflow-models/hand-pose-detection. Runs 100% in-browser on WebGL.
 *
 * Provides:
 *   - 21 finger/hand landmark positions (normalised 0–1)
 *   - Automatic gesture classification (open, closed, pointing, pinching, thumbs_up/down)
 *   - Callbacks for gesture events
 */

export type HandGesture =
  | 'open'
  | 'closed'
  | 'pointing'
  | 'pinching'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'unknown';

export interface HandKeypoint {
  name: string;
  x: number; // 0–1 normalized
  y: number; // 0–1 normalized
  score: number;
}

export interface HandResult {
  detected: boolean;
  gesture: HandGesture;
  keypoints: Record<string, HandKeypoint>;
}

export type HandCallback = (result: HandResult) => void;

// MediaPipe Hands keypoint names (subset — the most useful ones)
const LANDMARK_NAMES = [
  'wrist',
  'thumb_cmc',
  'thumb_mcp',
  'thumb_ip',
  'thumb_tip',
  'index_finger_mcp',
  'index_finger_pip',
  'index_finger_dip',
  'index_finger_tip',
  'middle_finger_mcp',
  'middle_finger_pip',
  'middle_finger_dip',
  'middle_finger_tip',
  'ring_finger_mcp',
  'ring_finger_pip',
  'ring_finger_dip',
  'ring_finger_tip',
  'pinky_mcp',
  'pinky_pip',
  'pinky_dip',
  'pinky_tip',
];

// ─── Gesture Classification ───────────────────────────────────────────────────

function classifyGesture(kps: Record<string, HandKeypoint>): HandGesture {
  const tip = (name: string) => kps[name];
  const mcp = (name: string) => kps[name];

  if (!tip('index_finger_tip')) return 'unknown';

  // Helper: is finger extended? (tip Y < mcp Y in normalized coords since Y is inverted)
  const isExtended = (finger: string) => {
    const t = tip(`${finger}_tip`);
    const m = mcp(`${finger}_mcp`);
    if (!t || !m) return false;
    return t.y < m.y; // tip is higher (lower Y value) than the knuckle
  };

  const thumbExtended = () => {
    const t = tip('thumb_tip');
    const b = kps['thumb_cmc'];
    if (!t || !b) return false;
    return Math.abs(t.x - b.x) > 0.1;
  };

  const indexUp = isExtended('index_finger');
  const middleUp = isExtended('middle_finger');
  const ringUp = isExtended('ring_finger');
  const pinkyUp = isExtended('pinky');
  const thumbUp = thumbExtended();

  // Thumbs up: only thumb extended, hand oriented vertically
  const thumbTip = tip('thumb_tip');
  const wrist = kps['wrist'];
  if (thumbTip && wrist && thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
    if (thumbTip.y < wrist.y) return 'thumbs_up';
    if (thumbTip.y > wrist.y) return 'thumbs_down';
  }

  // Open: all fingers extended
  if (indexUp && middleUp && ringUp && pinkyUp) return 'open';

  // Closed: no fingers extended
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) return 'closed';

  // Pointing: only index extended
  if (indexUp && !middleUp && !ringUp && !pinkyUp) return 'pointing';

  // Pinching: index and thumb close together
  if (thumbTip && tip('index_finger_tip')) {
    const dx = thumbTip.x - tip('index_finger_tip')!.x;
    const dy = thumbTip.y - tip('index_finger_tip')!.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.08) return 'pinching';
  }

  return 'unknown';
}

// ─── Singleton Hand Engine ────────────────────────────────────────────────────

class HandEngine {
  private detector: any = null;
  private predictionLoopId: number | null = null;
  private lastTime = 0;
  private readonly INTERVAL_MS = 80; // ~12 FPS
  private _isInitialised = false;
  private latestResult: HandResult | null = null;
  private gestureListeners: Array<(gesture: HandGesture) => void> = [];
  private lastGesture: HandGesture = 'unknown';

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this._isInitialised) return;

    const [handPoseModule] = await Promise.all([import('@tensorflow-models/hand-pose-detection')]);

    // MediaPipe Hands via TF.js runtime (works in browser without WASM)
    const model = handPoseModule.SupportedModels.MediaPipeHands;
    this.detector = await handPoseModule.createDetector(model, {
      runtime: 'tfjs',
      modelType: 'lite',
      maxHands: 1,
    });

    this._isInitialised = true;
  }

  get isInitialised(): boolean {
    return this._isInitialised;
  }

  // ── Prediction Loop ─────────────────────────────────────────────────────────

  startTracking(videoEl: HTMLVideoElement, callback?: HandCallback): void {
    if (this.predictionLoopId !== null) return;

    const loop = async () => {
      const now = performance.now();
      if (now - this.lastTime >= this.INTERVAL_MS && this.detector) {
        this.lastTime = now;

        if (videoEl.readyState >= 2) {
          try {
            const hands = await this.detector.estimateHands(videoEl, { flipHorizontal: true });

            if (hands && hands.length > 0) {
              const hand = hands[0];
              const kps: Record<string, HandKeypoint> = {};
              const { videoWidth: w, videoHeight: h } = videoEl;

              (hand.keypoints as any[]).forEach((kp: any, i: number) => {
                const name = LANDMARK_NAMES[i] ?? `landmark_${i}`;
                kps[name] = {
                  name,
                  x: Number((kp.x / (w || 224)).toFixed(3)),
                  y: Number((kp.y / (h || 224)).toFixed(3)),
                  score: kp.score ?? 1,
                };
              });

              const gesture = classifyGesture(kps);

              const result: HandResult = { detected: true, gesture, keypoints: kps };
              this.latestResult = result;
              callback?.(result);

              // Fire gesture listeners on change
              if (gesture !== this.lastGesture) {
                this.lastGesture = gesture;
                for (const listener of this.gestureListeners) {
                  listener(gesture);
                }
              }
            } else {
              const noHandResult: HandResult = {
                detected: false,
                gesture: 'unknown',
                keypoints: {},
              };
              this.latestResult = noHandResult;
              callback?.(noHandResult);
            }
          } catch {
            // Estimation may fail on empty frames — safe to ignore
          }
        }
      }
      this.predictionLoopId = requestAnimationFrame(loop);
    };

    this.predictionLoopId = requestAnimationFrame(loop);
  }

  stopTracking(): void {
    if (this.predictionLoopId !== null) {
      cancelAnimationFrame(this.predictionLoopId);
      this.predictionLoopId = null;
    }
  }

  get isTracking(): boolean {
    return this.predictionLoopId !== null;
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  getKeypoint(landmark: string, axis: 'x' | 'y'): number {
    const kp = this.latestResult?.keypoints[landmark];
    if (!kp) return 0;
    return axis === 'x' ? kp.x : kp.y;
  }

  getGesture(): HandGesture {
    return this.latestResult?.gesture ?? 'unknown';
  }

  isHandDetected(): boolean {
    return this.latestResult?.detected ?? false;
  }

  // ── Listeners ────────────────────────────────────────────────────────────────

  onGesture(callback: (gesture: HandGesture) => void): void {
    this.gestureListeners.push(callback);
  }

  offGesture(callback: (gesture: HandGesture) => void): void {
    this.gestureListeners = this.gestureListeners.filter((c) => c !== callback);
  }

  clearListeners(): void {
    this.gestureListeners = [];
  }
}

export const handEngine = new HandEngine();
