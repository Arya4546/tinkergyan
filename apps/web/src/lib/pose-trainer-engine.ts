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
  private initPromise: Promise<void> | null = null;
  private detector: any = null; // MoveNet detector shared from aiEngine
  private predictionInterval: ReturnType<typeof setInterval> | null = null;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;
  private _isInitialised = false;
  private readonly NUM_KEYPOINTS = 17;
  private readonly POLL_MS = 200;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Can be called with the MoveNet detector instance from aiEngine (or called without it for dataset deserialization).
   */
  async init(sharedDetector?: any): Promise<void> {
    if (this._isInitialised) {
      if (sharedDetector && !this.detector) this.detector = sharedDetector;
      return;
    }
    // Concurrent callers share one load; see TextAIEngine.init for why.
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const [tfModule, knnModule] = await Promise.all([
          import('@tensorflow/tfjs'),
          import('@tensorflow-models/knn-classifier'),
        ]);
        tfRef = tfModule;
        await tfRef.ready();
        this.classifier = knnModule.create() as unknown as KNNClassifier;
        this._isInitialised = true;
      })().catch((err) => {
        this.initPromise = null;
        throw err;
      });
    }
    await this.initPromise;
    if (sharedDetector && !this.detector) this.detector = sharedDetector;
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
    this.initPromise = null;
  }

  // ── Feature Extraction ────────────────────────────────────────────────────

  private async extractFeatures(
    videoEl: HTMLVideoElement | HTMLImageElement,
    requirePerson = false,
  ): Promise<any> {
    if (!this.detector || !tfRef) return null;
    try {
      const poses = await this.detector.estimatePoses(videoEl);
      if (!poses || poses.length === 0) return null;
      const keypoints = poses[0].keypoints as Array<{ x: number; y: number; score?: number }>;
      // MoveNet is a single-pose model: it ALWAYS answers with 17 keypoints,
      // even for an empty room or a photo of a cat. For still photos (no
      // later frame to correct a bad one) insist that a body was really seen:
      // several confident keypoints, including part of the torso that the
      // features are measured from.
      if (requirePerson) {
        const sure = keypoints.filter((k) => (k.score ?? 0) >= 0.3).length;
        const torso = [5, 6, 11, 12].some((i) => (keypoints[i]?.score ?? 0) >= 0.3);
        if (sure < 6 || !torso) return null;
      }
      const w =
        ('videoWidth' in videoEl ? videoEl.videoWidth : 0) ||
        ('naturalWidth' in videoEl ? videoEl.naturalWidth : 0) ||
        224;
      const h =
        ('videoHeight' in videoEl ? videoEl.videoHeight : 0) ||
        ('naturalHeight' in videoEl ? videoEl.naturalHeight : 0) ||
        224;

      // Torso-relative frame: origin at mid-hip/shoulder, scale by torso length.
      // This makes the same pose look similar whether the student stands near or
      // far from the camera — a big accuracy win for classroom pose models.
      const ls = keypoints[5] ?? { x: 0, y: 0, score: 0 };
      const rs = keypoints[6] ?? { x: 0, y: 0, score: 0 };
      const lh = keypoints[11] ?? { x: 0, y: 0, score: 0 };
      const rh = keypoints[12] ?? { x: 0, y: 0, score: 0 };
      const cx = (ls.x + rs.x + lh.x + rh.x) / 4;
      const cy = (ls.y + rs.y + lh.y + rh.y) / 4;
      const shoulderMidX = (ls.x + rs.x) / 2;
      const shoulderMidY = (ls.y + rs.y) / 2;
      const hipMidX = (lh.x + rh.x) / 2;
      const hipMidY = (lh.y + rh.y) / 2;
      const torsoLen =
        Math.hypot(shoulderMidX - hipMidX, shoulderMidY - hipMidY) || Math.max(w, h) * 0.25;

      const flat: number[] = [];
      for (let i = 0; i < this.NUM_KEYPOINTS; i++) {
        const kp = keypoints[i] ?? { x: 0, y: 0, score: 0 };
        flat.push((kp.x - cx) / torsoLen);
        flat.push((kp.y - cy) / torsoLen);
        flat.push(kp.score ?? 0);
      }

      // L2-normalise the whole feature vector for stable KNN distances.
      const tensor = tfRef.tensor1d(flat);
      const norm = tensor.norm();
      const normalised = tensor.div(norm.add(1e-6));
      tensor.dispose();
      norm.dispose();
      return normalised;
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

  async captureFrame(
    videoEl: HTMLVideoElement | HTMLImageElement,
    label: string,
    requirePerson = false,
  ): Promise<boolean> {
    if (!this.classifier) throw new Error('Pose engine not initialised');
    const feat = await this.extractFeatures(videoEl, requirePerson);
    if (!feat) return false;
    this.classifier.addExample(feat, label);
    feat.dispose();
    return true;
  }

  /**
   * Add a still photo as one pose sample. Returns false when no person was
   * found in it.
   *
   * MoveNet keeps a tracker between calls (it smooths keypoints and narrows
   * its search to where the body was last frame) because it expects video. A
   * photo has no relation to the previous one, so the tracker is reset first;
   * otherwise the pose would be dragged toward the previous picture.
   */
  async captureImage(img: HTMLImageElement, label: string): Promise<boolean> {
    try {
      this.detector?.reset?.();
    } catch {
      // Older detector builds have no reset — carry on.
    }
    return this.captureFrame(img, label, true);
  }

  getExampleCounts(): Record<string, number> {
    return this.classifier?.getClassExampleCount() ?? {};
  }

  clearClass(label: string): void {
    if (!this.classifier || this.getExampleCounts()[label] === undefined) return;
    this.classifier.clearClass(label);
  }

  /** Rename a trained class by updating the underlying dataset */
  renameClass(oldLabel: string, newLabel: string): void {
    if (!this.classifier || oldLabel === newLabel || !newLabel.trim()) return;
    const dataset = this.classifier.getClassifierDataset() ?? {};
    // Always move the label — even with 0 samples — so rename works immediately.
    if (dataset[oldLabel]) {
      dataset[newLabel] = dataset[oldLabel];
      delete dataset[oldLabel];
    }
    this.classifier.setClassifierDataset(dataset);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const counts = (this.classifier as any).classExampleCount as Record<string, number> | undefined;
    if (counts) {
      if (counts[oldLabel] !== undefined) {
        counts[newLabel] = counts[oldLabel]!;
        delete counts[oldLabel];
      }
      // Do not inject a 0-count key for empty renames — that inflates
      // getNumClasses() and can make predictClass run on a broken set.
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matrices = (this.classifier as any).classDatasetMatrices as
      | Record<string, unknown>
      | undefined;
    if (matrices && matrices[oldLabel] !== undefined) {
      matrices[newLabel] = matrices[oldLabel];
      delete matrices[oldLabel];
    }
  }

  clearAll(): void {
    this.classifier?.clearAllClasses();
  }

  get isReadyToPredict(): boolean {
    const counts = this.getExampleCounts();
    return Object.keys(counts).filter((k) => (counts[k] ?? 0) > 0).length >= 2;
  }

  // ── Inference ─────────────────────────────────────────────────────────────

  startPredicting(videoEl: HTMLVideoElement, callback: PosePredictionCallback, k = 5): void {
    if (this.predictionInterval !== null) return;
    this.predictionInterval = setInterval(async () => {
      if (!this.classifier || this.classifier.getNumClasses() < 2) return;
      const feat = await this.extractFeatures(videoEl);
      if (!feat) return;
      try {
        const counts = this.classifier.getClassExampleCount();
        const minSamples = Math.min(...Object.values(counts));
        let kClamped = Math.min(k, Math.max(1, minSamples));
        if (kClamped > 1 && kClamped % 2 === 0) kClamped -= 1;
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
