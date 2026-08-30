/**
 * pose-trainer-engine.ts
 *
 * Custom pose training engine for TinkerGyan AI Model Studio.
 *
 * Architecture:
 *   1. Reuses the MoveNet Lightning detector already loaded inside ai-engine.ts
 *      (passed in by reference — no second model download).
 *   2. For each captured frame, all 17 keypoint (x, y, score) values are
 *      flattened into a 51-float tensor and stored in a KNN classifier.
 *   3. Prediction polls the webcam at ~5 FPS and returns the nearest pose class.
 *
 * Usage:
 *   poseTrainerEngine.init(detector);   // pass aiEngine's internal detector
 *   poseTrainerEngine.captureFrame(videoEl, 'arms_up');
 *   poseTrainerEngine.startPredicting(videoEl, callback);
 */

let tfRef: any = null;

interface KNNClassifier {
  addExample: (example: any, label: string) => void;
  predictClass: (
    input: any,
    k?: number,
  ) => Promise<{ label: string; confidences: Record<string, number> }>;
  clearClass: (label: string) => void;
  clearAllClasses: () => void;
  getClassExampleCount: () => Record<string, number>;
  getClassifierDataset: () => Record<string, any>;
  setClassifierDataset: (d: Record<string, any>) => void;
  getNumClasses: () => number;
  dispose: () => void;
}

export interface PosePrediction {
  label: string;
  confidence: number;
  allConfidences: Record<string, number>;
}

export type PosePredictionCallback = (result: PosePrediction) => void;

// ─── PoseTrainerEngine ────────────────────────────────────────────────────────

class PoseTrainerEngine {
  private classifier: KNNClassifier | null = null;
  private detector: any = null; // MoveNet detector shared from aiEngine
  private predictionInterval: ReturnType<typeof setInterval> | null = null;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;
  private _isInitialised = false;
  private readonly NUM_KEYPOINTS = 17;
  private readonly POLL_MS = 200;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Must be called with the MoveNet detector instance from aiEngine.
   * aiEngine.init() must have been called first.
   */
  async init(sharedDetector: any): Promise<void> {
    if (this._isInitialised) return;
    const [tfModule, knnModule] = await Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/knn-classifier'),
    ]);
    tfRef = tfModule;
    await tfRef.ready();
    this.classifier = knnModule.create() as unknown as KNNClassifier;
    this.detector = sharedDetector;
    this._isInitialised = true;
  }

  get isInitialised(): boolean {
    return this._isInitialised;
  }

  dispose(): void {
    this.stopPredicting();
    this.stopTracking();
    this.classifier?.dispose();
    this.classifier = null;
    this.detector = null;
    this._isInitialised = false;
  }

  // ── Feature Extraction ────────────────────────────────────────────────────

  private async extractFeatures(videoEl: HTMLVideoElement): Promise<any> {
    if (!this.detector || !tfRef) return null;
    try {
      const poses = await this.detector.estimatePoses(videoEl);
      if (!poses || poses.length === 0) return null;
      const keypoints = poses[0].keypoints as Array<{ x: number; y: number; score?: number }>;
      // Flatten [x, y, score] for each of the 17 keypoints → 51 floats.
      const flat: number[] = [];
      for (let i = 0; i < this.NUM_KEYPOINTS; i++) {
        const kp = keypoints[i] ?? { x: 0, y: 0, score: 0 };
        // Normalise x/y by video dimensions.
        flat.push(kp.x / (videoEl.videoWidth || 224));
        flat.push(kp.y / (videoEl.videoHeight || 224));
        flat.push(kp.score ?? 0);
      }
      return tfRef.tensor1d(flat);
    } catch {
      return null;
    }
  }

  // ── Skeleton Tracking ─────────────────────────────────────────────────────

  startTracking(
    videoEl: HTMLVideoElement,
    onKeypoints: (keypoints: Array<{ x: number; y: number; score: number }>) => void,
  ): void {
    if (this.trackingInterval !== null) return;
    this.trackingInterval = setInterval(async () => {
      if (!this.detector || !tfRef) return;
      try {
        const poses = await this.detector.estimatePoses(videoEl);
        if (poses && poses.length > 0) {
          const keypoints = poses[0].keypoints.map(
            (kp: { x: number; y: number; score?: number }) => ({
              x: kp.x / (videoEl.videoWidth || 640),
              y: kp.y / (videoEl.videoHeight || 360),
              score: kp.score ?? 0,
            }),
          );
          onKeypoints(keypoints);
        } else {
          onKeypoints([]);
        }
      } catch {
        /* ignore */
      }
    }, 100); // 10 FPS for smoother skeleton
  }

  stopTracking(): void {
    if (this.trackingInterval !== null) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  // ── Training ──────────────────────────────────────────────────────────────

  async captureFrame(videoEl: HTMLVideoElement, label: string): Promise<boolean> {
    if (!this.classifier) throw new Error('Pose engine not initialised');
    const feat = await this.extractFeatures(videoEl);
    if (!feat) return false;
    this.classifier.addExample(feat, label);
    feat.dispose();
    return true;
  }

  getExampleCounts(): Record<string, number> {
    return this.classifier?.getClassExampleCount() ?? {};
  }

  clearClass(label: string): void {
    this.classifier?.clearClass(label);
  }
  clearAll(): void {
    this.classifier?.clearAllClasses();
  }

  get isReadyToPredict(): boolean {
    const counts = this.getExampleCounts();
    return Object.keys(counts).filter((k) => (counts[k] ?? 0) > 0).length >= 2;
  }

  // ── Inference ─────────────────────────────────────────────────────────────

  startPredicting(videoEl: HTMLVideoElement, callback: PosePredictionCallback, k = 3): void {
    if (this.predictionInterval !== null) return;
    this.predictionInterval = setInterval(async () => {
      if (!this.classifier || this.classifier.getNumClasses() < 2) return;
      const feat = await this.extractFeatures(videoEl);
      if (!feat) return;
      try {
        const counts = this.classifier.getClassExampleCount();
        const minSamples = Math.min(...Object.values(counts));
        const kClamped = Math.min(k, Math.max(1, minSamples));
        const result = await this.classifier.predictClass(feat, kClamped);
        const allConfidences: Record<string, number> = {};
        for (const [label, conf] of Object.entries(result.confidences)) {
          allConfidences[label] = Math.round(conf * 100);
        }
        callback({
          label: result.label,
          confidence: allConfidences[result.label] ?? 0,
          allConfidences,
        });
      } catch {
        /* ignore */
      } finally {
        feat.dispose();
      }
    }, this.POLL_MS);
  }

  stopPredicting(): void {
    if (this.predictionInterval !== null) {
      clearInterval(this.predictionInterval);
      this.predictionInterval = null;
    }
  }

  get isPredicting(): boolean {
    return this.predictionInterval !== null;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  async serializeDataset(): Promise<string | null> {
    if (!this.classifier || !tfRef || this.classifier.getNumClasses() === 0) return null;
    const dataset = this.classifier.getClassifierDataset();
    const serialised: Record<string, number[][]> = {};
    for (const [label, tensor] of Object.entries(dataset)) {
      serialised[label] = await tensor.array();
    }
    return JSON.stringify({ v: 1, classes: serialised });
  }

  deserializeDataset(jsonStr: string): void {
    if (!this.classifier || !tfRef) throw new Error('Pose engine not initialised');
    const parsed = JSON.parse(jsonStr) as { v: number; classes: Record<string, number[][]> };
    this.classifier.clearAllClasses();
    const tensorDataset: Record<string, any> = {};
    for (const [label, vectors] of Object.entries(parsed.classes)) {
      tensorDataset[label] = tfRef.tensor2d(vectors);
    }
    this.classifier.setClassifierDataset(tensorDataset);
  }
}

export const poseTrainerEngine = new PoseTrainerEngine();
