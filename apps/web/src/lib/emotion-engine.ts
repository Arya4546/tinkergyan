/**
 * emotion-engine.ts
 *
 * Browser-native face expression (emotion) detection using face-api.js.
 * Runs 100% in the browser on top of TF.js — no server, no API keys.
 *
 * Emotions detected: happy, sad, angry, disgusted, fearful, surprised, neutral
 */

export type EmotionLabel =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'disgusted'
  | 'fearful'
  | 'surprised'
  | 'neutral';

export interface EmotionResult {
  emotion: EmotionLabel;
  confidence: number; // 0-100
  allEmotions: Record<EmotionLabel, number>; // 0-100 per emotion
  faceX: number; // 0-1 normalised center X
  faceY: number; // 0-1 normalised center Y
  faceDetected: boolean;
}

export type EmotionCallback = (result: EmotionResult) => void;

// ─── Singleton Emotion Engine ─────────────────────────────────────────────────

class EmotionEngine {
  private faceapi: any = null;
  private predictionLoopId: number | null = null;
  private lastPredictionTime = 0;
  private readonly INTERVAL_MS = 150; // ~7 FPS — emotion changes slowly
  private _isInitialised = false;
  private latestResult: EmotionResult | null = null;
  private emotionListeners: Array<(label: EmotionLabel) => void> = [];

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this._isInitialised) return;

    // Lazy-load face-api.js — it's large, only fetch when needed
    const faceApiModule = await import('face-api.js');
    this.faceapi = faceApiModule;

    // Load required model weights
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

    await Promise.all([
      this.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      this.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);

    this._isInitialised = true;
  }

  get isInitialised(): boolean {
    return this._isInitialised;
  }

  // ── Prediction loop ─────────────────────────────────────────────────────────

  startDetecting(videoEl: HTMLVideoElement, callback?: EmotionCallback): void {
    if (this.predictionLoopId !== null) return;

    const loop = async () => {
      const now = performance.now();
      if (now - this.lastPredictionTime >= this.INTERVAL_MS) {
        this.lastPredictionTime = now;

        if (videoEl.readyState >= 2 && this.faceapi) {
          try {
            const detection = await this.faceapi
              .detectSingleFace(
                videoEl,
                new this.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }),
              )
              .withFaceExpressions();

            if (detection) {
              const expr = detection.expressions as Record<string, number>;
              const { width, height } = videoEl;
              const box = detection.detection.box;

              const allEmotions = Object.fromEntries(
                Object.entries(expr).map(([k, v]) => [k, Math.round(v * 100)]),
              ) as Record<EmotionLabel, number>;

              // Top emotion
              const sorted = Object.entries(allEmotions).sort(([, a], [, b]) => b - a) as [
                EmotionLabel,
                number,
              ][];

              const topEmotion = sorted[0] ?? (['neutral', 0] as [EmotionLabel, number]);

              const result: EmotionResult = {
                emotion: topEmotion[0],
                confidence: topEmotion[1],

                allEmotions,
                faceX: Number(((box.x + box.width / 2) / width).toFixed(2)),
                faceY: Number(((box.y + box.height / 2) / height).toFixed(2)),
                faceDetected: true,
              };

              this.latestResult = result;
              callback?.(result);

              // Fire emotion listeners
              for (const listener of this.emotionListeners) {
                listener(result.emotion);
              }
            } else {
              // No face found
              const noFaceResult: EmotionResult = {
                emotion: 'neutral',
                confidence: 0,
                allEmotions: {
                  happy: 0,
                  sad: 0,
                  angry: 0,
                  disgusted: 0,
                  fearful: 0,
                  surprised: 0,
                  neutral: 0,
                },
                faceX: 0,
                faceY: 0,
                faceDetected: false,
              };
              this.latestResult = noFaceResult;
              callback?.(noFaceResult);
            }
          } catch {
            // Face detection may fail on empty frames — safe to ignore
          }
        }
      }

      this.predictionLoopId = requestAnimationFrame(loop);
    };

    this.predictionLoopId = requestAnimationFrame(loop);
  }

  stopDetecting(): void {
    if (this.predictionLoopId !== null) {
      cancelAnimationFrame(this.predictionLoopId);
      this.predictionLoopId = null;
    }
  }

  get isDetecting(): boolean {
    return this.predictionLoopId !== null;
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  getLatestEmotion(): EmotionLabel {
    return this.latestResult?.emotion ?? 'neutral';
  }

  getEmotionConfidence(emotion: EmotionLabel): number {
    return this.latestResult?.allEmotions?.[emotion] ?? 0;
  }

  isFaceDetected(): boolean {
    return this.latestResult?.faceDetected ?? false;
  }

  getFacePosition(axis: 'x' | 'y'): number {
    if (!this.latestResult?.faceDetected) return 0;
    return axis === 'x' ? this.latestResult.faceX : this.latestResult.faceY;
  }

  // ── Listeners ────────────────────────────────────────────────────────────────

  onEmotion(callback: (label: EmotionLabel) => void): void {
    this.emotionListeners.push(callback);
  }

  offEmotion(callback: (label: EmotionLabel) => void): void {
    this.emotionListeners = this.emotionListeners.filter((c) => c !== callback);
  }
}

export const emotionEngine = new EmotionEngine();
