/**
 * ai-engine.ts
 *
 * In-house AI training & inference engine running 100% in the browser.
 *
 * Architecture:
 *   1. MobileNet v2 extracts an embedding from each webcam frame — a
 *      pre-trained feature extractor, NOT a classifier.
 *   2. Embeddings are L2-normalised so KNN Euclidean distance behaves like
 *      cosine similarity (much more stable for MobileNet features).
 *   3. A KNN classifier stores labelled vectors. Prediction uses an adaptive
 *      odd k plus a short temporal confidence average so flicker and
 *      near-tie mistakes (e.g. Specs vs No Specs) settle correctly.
 *   4. Webcam frames run on a rAF loop throttled to ~12 FPS.
 *   5. The KNN dataset serialises to/from JSON inside blockState.
 *
 * Privacy:  No image data or feature vectors ever leave the browser.
 * Cost:    Zero server load. Everything runs on the student's GPU via WebGL.
 * Size:    MobileNet weights are fetched once from the TF CDN and cached.
 */

import type * as tf from '@tensorflow/tfjs';

// Lazy-loaded module references — set by init() on first use.
let tfRef: any = null;

interface MobileNetModel {
  infer: (img: tf.Tensor | ImageData | HTMLVideoElement, embedding?: boolean) => tf.Tensor;
  dispose: () => void;
}

interface KNNClassifier {
  addExample: (example: tf.Tensor, label: string) => void;
  predictClass: (
    input: tf.Tensor,
    k?: number,
  ) => Promise<{
    label: string;
    classIndex: number;
    confidences: Record<string, number>;
  }>;
  clearClass: (label: string) => void;
  clearAllClasses: () => void;
  getClassExampleCount: () => Record<string, number>;
  getClassifierDataset: () => Record<string, tf.Tensor2D>;
  setClassifierDataset: (dataset: Record<string, tf.Tensor2D>) => void;
  getNumClasses: () => number;
  dispose: () => void;
}

export interface PredictionResult {
  label: string;
  confidence: number;
  allConfidences: Record<string, number>;
  /** True when confidence is below the active predictionThreshold. */
  belowThreshold?: boolean;
}

export type PredictionCallback = (result: PredictionResult) => void;

/**
 * Tunable parameters exposed in the "Advanced" panel of the AI trainer.
 * Changing these at runtime takes effect on the next prediction cycle.
 */
export interface TrainingConfig {
  /** Number of nearest neighbours for KNN voting (default: 5, range: 1–15). */
  k: number;
  /** Minimum confidence (0–1) for belowThreshold flag / careful UI (default: 0.65). */
  predictionThreshold: number;
}

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  // Odd k reduces tie votes; 5 works well once each class has ~8+ samples.
  k: 5,
  predictionThreshold: 0.65,
};

/** Frames averaged for temporal smoothing (~400 ms at 12 FPS). */
const SMOOTH_WINDOW = 5;

// ─── Singleton AI Engine ──────────────────────────────────────────────────────

class AIEngine {
  private mobilenet: MobileNetModel | null = null;
  private classifier: KNNClassifier | null = null;

  // Phase 3 models
  private poseDetector: any = null; // poseDetection.PoseDetector
  private speechRecognizer: any = null; // speechCommands.SpeechCommandRecognizer

  private videoStream: MediaStream | null = null;
  private predictionLoopId: number | null = null;
  private lastPredictionTime = 0;
  private _isInitialised = false;

  // Active prediction modes
  private enableImageKNN = false;
  private enablePose = false;
  private isPredictingCurrently = false;

  // Latest results
  private latestPose: any[] = [];
  private latestSpeechCommand: { word: string; score: number } | null = null;
  private speechCommandListeners: Array<(word: string) => void> = [];

  /** Minimum interval between predictions (ms). ~12 FPS. */
  private readonly PREDICTION_INTERVAL_MS = 80;

  /** Active hyperparameter config — updated each time startPredicting() is called. */
  private activeConfig: TrainingConfig = DEFAULT_TRAINING_CONFIG;

  /** Rolling window of recent confidences for temporal smoothing. */
  private recentConfidences: Array<Record<string, number>> = [];

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Idempotent. Dynamically imports TF.js + MobileNet + KNN on first call. */
  async init(): Promise<void> {
    if (this._isInitialised) return;

    // Dynamic imports keep the main bundle lean — TF.js is only loaded when
    // the student actually opens the AI Studio.
    const [tfModule, mobilenetModule, knnModule, poseModule, speechModule] = await Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/mobilenet'),
      import('@tensorflow-models/knn-classifier'),
      import('@tensorflow-models/pose-detection'),
      import('@tensorflow-models/speech-commands'),
    ]);

    tfRef = tfModule;

    // Ensure the WebGL/WebGPU backend is initialized
    await tfRef.ready();

    // alpha 0.5 keeps embedding size compatible with existing saved projects.
    // Accuracy gains come from L2-normalisation, adaptive k, and temporal
    // smoothing rather than a heavier backbone.
    this.mobilenet = (await mobilenetModule.load({
      version: 2,
      alpha: 0.5,
    })) as unknown as MobileNetModel;

    this.classifier = knnModule.create() as unknown as KNNClassifier;

    // Initialize Pose Detector (MoveNet Lightning - very fast on WebGL)
    const detectorConfig = { modelType: poseModule.movenet.modelType.SINGLEPOSE_LIGHTNING };
    this.poseDetector = await poseModule.createDetector(
      poseModule.SupportedModels.MoveNet,
      detectorConfig,
    );

    // Initialize Speech Commands
    this.speechRecognizer = speechModule.create('BROWSER_FFT');
    await this.speechRecognizer.ensureModelLoaded();

    this._isInitialised = true;
  }

  get isInitialised(): boolean {
    return this._isInitialised;
  }

  /** Release all GPU memory and stop everything. */
  dispose(): void {
    this.stopPredicting();
    this.stopWebcam();
    this.stopAudioListening();
    this.classifier?.dispose();
    this.mobilenet?.dispose();
    if (this.poseDetector) {
      this.poseDetector.dispose();
    }
    this.classifier = null;
    this.mobilenet = null;
    this.poseDetector = null;
    this.speechRecognizer = null;
    this._isInitialised = false;
  }

  // ── Webcam ────────────────────────────────────────────────────────────────

  /** @param deviceId  Optional specific camera to use (from `enumerateDevices()`). */
  async startWebcam(videoEl: HTMLVideoElement, deviceId?: string): Promise<void> {
    if (this.videoStream) return; // already running

    // Request a sharper feed than 224² — MobileNet resizes internally, and the
    // extra pixels improve fine details (glasses, pens, earpods).
    const videoConstraints: MediaTrackConstraints = deviceId
      ? {
          deviceId: { exact: deviceId },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        }
      : {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        };

    this.videoStream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });

    videoEl.srcObject = this.videoStream;
    await videoEl.play();
  }

  /**
   * L2-normalise an embedding so Euclidean KNN ≈ cosine similarity.
   * Caller owns the returned tensor and must dispose it.
   */
  private l2Normalize(embedding: tf.Tensor): tf.Tensor {
    return tfRef.tidy(() => {
      const flat = embedding.flatten();
      const norm = flat.norm();
      return flat.div(norm.add(1e-6));
    }) as tf.Tensor;
  }

  /**
   * Run MobileNet on a video/image frame and return an L2-normalised embedding.
   * Optionally mirror the frame first (used as free augmentation).
   */
  private embedFrame(
    source: HTMLVideoElement | HTMLImageElement,
    flipHorizontal = false,
  ): tf.Tensor {
    if (!this.mobilenet || !tfRef) {
      throw new Error('AI Engine not initialised');
    }

    if (!flipHorizontal) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = this.mobilenet.infer(source as any, true);
      const normalised = this.l2Normalize(raw);
      raw.dispose();
      return normalised;
    }

    // Flip via tensor so we do not need a second DOM element.
    const flippedInput = tfRef.tidy(() => {
      const pixels = tfRef.browser.fromPixels(source);
      return tfRef.image.flipLeftRight(pixels.expandDims(0)).squeeze(0);
    });
    try {
      const raw = this.mobilenet.infer(flippedInput, true);
      const normalised = this.l2Normalize(raw);
      raw.dispose();
      return normalised;
    } finally {
      flippedInput.dispose();
    }
  }

  /** Pick an odd k that cannot exceed the smallest class sample count. */
  private resolveK(counts: Record<string, number>, requested: number): number {
    const values = Object.values(counts).filter((n) => n > 0);
    if (values.length === 0) return 1;
    const minSamples = Math.min(...values);
    let k = Math.min(Math.max(1, requested), minSamples);
    // Prefer odd k so neighbour votes rarely tie.
    if (k > 1 && k % 2 === 0) k -= 1;
    return Math.max(1, k);
  }

  /** Average confidences over the recent window and return the top label. */
  private smoothPrediction(confidences: Record<string, number>): {
    label: string;
    confidence: number;
    allConfidences: Record<string, number>;
  } {
    this.recentConfidences.push(confidences);
    if (this.recentConfidences.length > SMOOTH_WINDOW) {
      this.recentConfidences.shift();
    }

    const averaged: Record<string, number> = {};
    for (const frame of this.recentConfidences) {
      for (const [label, conf] of Object.entries(frame)) {
        averaged[label] = (averaged[label] ?? 0) + conf;
      }
    }
    const n = this.recentConfidences.length;
    for (const label of Object.keys(averaged)) {
      averaged[label] = Math.round((averaged[label]! / n) * 10) / 10;
    }

    let bestLabel = Object.keys(averaged)[0] ?? '';
    let bestConf = -1;
    for (const [label, conf] of Object.entries(averaged)) {
      if (conf > bestConf) {
        bestConf = conf;
        bestLabel = label;
      }
    }
    return { label: bestLabel, confidence: Math.round(bestConf), allConfidences: averaged };
  }

  /** Restarts the webcam on a different device — used when the student switches cameras. */
  async switchWebcam(videoEl: HTMLVideoElement, deviceId: string): Promise<void> {
    this.stopWebcam();
    await this.startWebcam(videoEl, deviceId);
  }

  stopWebcam(): void {
    if (this.videoStream) {
      for (const track of this.videoStream.getTracks()) {
        track.stop();
      }
      this.videoStream = null;
    }
  }

  get isWebcamActive(): boolean {
    return this.videoStream !== null;
  }

  get stream(): MediaStream | null {
    return this.videoStream;
  }

  // ── Training ──────────────────────────────────────────────────────────────

  /**
   * Adds an example to the KNN model for a specific class.
   * Embeddings are L2-normalised before storage.
   */
  addExample(videoEl: HTMLVideoElement, label: string): void {
    if (!this.mobilenet || !this.classifier || !tfRef) {
      throw new Error('AI Engine not initialised');
    }

    const embedding = this.embedFrame(videoEl, false);
    this.classifier.addExample(embedding, label);
    embedding.dispose();
  }

  /**
   * Adds an example from a static image element (e.g. a file the student uploaded
   * from their computer). Same MobileNet + L2 pipeline as webcam frames.
   */
  addExampleFromImage(img: HTMLImageElement, label: string): void {
    if (!this.mobilenet || !this.classifier) {
      throw new Error('AI Engine not initialised');
    }
    if (!img.complete || img.naturalWidth === 0) {
      throw new Error('Image has not finished loading — wait for onload before calling this.');
    }

    const embedding = this.embedFrame(img, false);
    this.classifier.addExample(embedding, label);
    embedding.dispose();
  }

  /**
   * One-shot classification of a static image (e.g. a photo the student
   * uploads to test the trained model directly, without starting the
   * webcam's continuous prediction loop).
   */
  async predictFromImage(
    img: HTMLImageElement,
    config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
  ): Promise<PredictionResult | null> {
    if (!this.mobilenet || !this.classifier) {
      throw new Error('AI Engine not initialised');
    }
    if (this.classifier.getNumClasses() < 2) return null;

    const embedding = this.embedFrame(img, false);
    try {
      const counts = this.classifier.getClassExampleCount();
      const k = this.resolveK(counts, config.k);
      const result = await this.classifier.predictClass(embedding, k);
      const allConfidences: Record<string, number> = {};
      for (const [label, conf] of Object.entries(result.confidences)) {
        allConfidences[label] = Math.round(conf * 100);
      }
      const topConf = (allConfidences[result.label] ?? 0) / 100;
      return {
        label: result.label,
        confidence: allConfidences[result.label] ?? 0,
        allConfidences,
        belowThreshold: topConf < config.predictionThreshold,
      };
    } finally {
      embedding.dispose();
    }
  }

  /**
   * Removes a single training example from a class by its position in
   * insertion order (0-indexed) — e.g. when a student deletes one bad photo
   * from a class's sample gallery instead of clearing the whole class.
   * knn-classifier has no native "remove one" API, so this rebuilds the
   * class's stacked feature-vector tensor with that row sliced out.
   */
  removeExampleAt(label: string, index: number): void {
    if (!this.classifier || !tfRef) return;
    const dataset = this.classifier.getClassifierDataset();
    const tensor = dataset[label];
    if (!tensor) return;
    const n = tensor.shape[0];
    if (index < 0 || index >= n) return;

    if (n === 1) {
      tensor.dispose();
      delete dataset[label];
      this.classifier.setClassifierDataset(dataset);
      return;
    }

    const before = index > 0 ? tensor.slice([0, 0], [index, -1]) : null;
    const after = index < n - 1 ? tensor.slice([index + 1, 0], [n - index - 1, -1]) : null;
    const parts = [before, after].filter((t): t is tf.Tensor2D => t !== null);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const merged = (parts.length === 1 ? parts[0] : tfRef.concat(parts, 0)) as tf.Tensor2D;
    if (parts.length > 1) {
      for (const p of parts) p.dispose();
    }
    tensor.dispose();
    dataset[label] = merged;
    this.classifier.setClassifierDataset(dataset);
  }

  /** Returns { className: sampleCount } for every trained class. */
  getExampleCounts(): Record<string, number> {
    return this.classifier?.getClassExampleCount() ?? {};
  }

  /** All class labels that have at least one training example. */
  getClassLabels(): string[] {
    const counts = this.getExampleCounts();
    return Object.keys(counts).filter((k) => counts[k]! > 0);
  }

  /** Remove all training data for a single class. */
  clearClass(label: string): void {
    if (!this.classifier || this.classifier.getClassExampleCount()[label] === undefined) return;
    this.classifier.clearClass(label);
  }

  /** Rename a trained class by updating the underlying dataset */
  renameClass(oldLabel: string, newLabel: string): void {
    if (!this.classifier || oldLabel === newLabel) return;
    const dataset = this.classifier.getClassifierDataset();
    if (dataset && dataset[oldLabel]) {
      dataset[newLabel] = dataset[oldLabel];
      delete dataset[oldLabel];
      this.classifier.setClassifierDataset(dataset);
    }
    // Delete old label from internal KNN classifier counts so getExampleCounts() won't retain it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (this.classifier as any).classExampleCount?.[oldLabel];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (this.classifier as any).classDatasetMatrices?.[oldLabel];
  }

  /** Remove ALL training data. */
  clearAll(): void {
    this.classifier?.clearAllClasses();
  }

  /** True when at least 2 classes each have ≥1 sample (minimum for KNN). */
  get isReadyToPredict(): boolean {
    const labels = this.getClassLabels();
    return labels.length >= 2;
  }

  // ── Inference ─────────────────────────────────────────────────────────────

  /**
   * Begin continuous prediction. `callback` fires ~10× per second with the
   * current top label and all class confidences.
   */
  startPredicting(
    videoEl: HTMLVideoElement,
    callback?: PredictionCallback,
    enableImage = true,
    enablePose = false,
    config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
  ): void {
    this.activeConfig = config;
    this.enableImageKNN = enableImage;
    this.enablePose = enablePose;
    this.recentConfidences = [];

    if (this.predictionLoopId !== null) return; // already running

    const loop = async () => {
      if (this.isPredictingCurrently) {
        this.predictionLoopId = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      if (now - this.lastPredictionTime >= this.PREDICTION_INTERVAL_MS) {
        this.isPredictingCurrently = true;
        this.lastPredictionTime = now;

        if (videoEl.readyState >= 2) {
          // Image KNN Prediction
          if (
            this.enableImageKNN &&
            this.mobilenet &&
            this.classifier &&
            this.classifier.getNumClasses() >= 2
          ) {
            let embedding: tf.Tensor | null = null;
            try {
              embedding = this.embedFrame(videoEl, false);
              const counts = this.classifier.getClassExampleCount();
              const kClamped = this.resolveK(counts, this.activeConfig.k);

              const result = await this.classifier.predictClass(embedding, kClamped);
              const frameConfs: Record<string, number> = {};
              for (const [label, conf] of Object.entries(result.confidences)) {
                frameConfs[label] = Math.round(conf * 100);
              }
              // Temporal smoothing reduces flicker between near-tie classes
              // (Specs / No Specs, Mask / No Mask, etc.).
              const smoothed = this.smoothPrediction(frameConfs);
              const topConf = smoothed.confidence / 100;
              if (callback) {
                callback({
                  label: smoothed.label,
                  confidence: smoothed.confidence,
                  allConfidences: smoothed.allConfidences,
                  belowThreshold: topConf < this.activeConfig.predictionThreshold,
                });
              }
            } catch {
              // Prediction may fail if classes were cleared mid-loop — safe to ignore.
            } finally {
              embedding?.dispose();
            }
          }

          // Pose Detection
          if (this.enablePose && this.poseDetector) {
            try {
              const poses = await this.poseDetector.estimatePoses(videoEl);
              if (poses && poses.length > 0) {
                this.latestPose = poses[0].keypoints;
              } else {
                this.latestPose = [];
              }
            } catch (err) {
              console.error('Pose estimation error:', err);
            }
          }
        }
        this.isPredictingCurrently = false;
      }

      this.predictionLoopId = requestAnimationFrame(loop);
    };

    this.predictionLoopId = requestAnimationFrame(loop);
  }

  stopPredicting(): void {
    if (this.predictionLoopId !== null) {
      cancelAnimationFrame(this.predictionLoopId);
      this.predictionLoopId = null;
    }
    this.recentConfidences = [];
  }

  get isPredicting(): boolean {
    return this.predictionLoopId !== null;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /**
   * Serialize the KNN dataset for storing in the project's blockState.
   *
   * Version 2: each class is { n, d, data } where `data` is the raw Float32
   * bytes of its n×d feature matrix, base64-encoded. That is ~4× smaller than
   * JSON number arrays (about 5.5 KB per sample instead of ~20 KB).
   */
  async serializeDataset(): Promise<string | null> {
    if (!this.classifier || !tfRef || this.classifier.getNumClasses() === 0) {
      return null;
    }

    const dataset = this.classifier.getClassifierDataset();
    const classes: Record<string, { n: number; d: number; data: string }> = {};

    for (const [label, tensor] of Object.entries(dataset)) {
      const [n, d] = tensor.shape;
      const floats = await tensor.data();
      const bytes = new Uint8Array(floats.buffer, floats.byteOffset, floats.byteLength);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      classes[label] = { n, d, data: btoa(binary) };
    }

    return JSON.stringify({ v: 2, classes });
  }

  /**
   * Rehydrates the KNN dataset. Accepts version 2 (base64 Float32) and the
   * older version 1 format (nested number arrays) so existing saves still load.
   */
  deserializeDataset(jsonStr: string): void {
    if (!this.classifier || !tfRef) {
      throw new Error('AI Engine not initialised');
    }

    const parsed = JSON.parse(jsonStr) as {
      v: number;
      classes: Record<string, number[][] | { n: number; d: number; data: string }>;
    };

    this.classifier.clearAllClasses();

    const tensorDataset: Record<string, tf.Tensor2D> = {};
    for (const [label, entry] of Object.entries(parsed.classes)) {
      let raw: tf.Tensor2D;
      if (Array.isArray(entry)) {
        raw = tfRef.tensor2d(entry);
      } else {
        const binary = atob(entry.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const floats = new Float32Array(bytes.buffer);
        raw = tfRef.tensor2d(floats, [entry.n, entry.d]);
      }
      // Re-normalise rows so older saves benefit from cosine-style KNN too.
      const norms = raw.norm('euclidean', 1, true) as tf.Tensor2D;
      tensorDataset[label] = raw.div(norms.add(1e-6));
      raw.dispose();
      norms.dispose();
    }

    this.classifier.setClassifierDataset(tensorDataset);
  }

  // ── Phase 3: Pose & Audio API ─────────────────────────────────────────────

  getPoseKeypoint(partName: string, axis: 'x' | 'y'): number {
    if (!this.latestPose || this.latestPose.length === 0) return 0;
    const kp = this.latestPose.find((p: any) => p.name === partName);
    if (!kp) return 0;
    // Normalized to 0-1 (webcam is 224x224)
    const val = axis === 'x' ? kp.x / 224 : kp.y / 224;
    return Number(val.toFixed(2));
  }

  async startAudioListening(): Promise<void> {
    if (!this.speechRecognizer || this.speechRecognizer.isListening()) return;

    await this.speechRecognizer.listen(
      (result: any) => {
        const words = this.speechRecognizer.wordLabels();
        const scores: number[] = Array.from(result.scores);
        // Find highest score
        let bestScore = -1;
        let bestIdx = 0;
        for (let i = 0; i < scores.length; i++) {
          if (scores[i]! > bestScore) {
            bestScore = scores[i]!;
            bestIdx = i;
          }
        }

        const word = words[bestIdx];
        this.latestSpeechCommand = { word: word, score: bestScore };

        // Notify listeners if confidence > 0.8
        if (bestScore > 0.8 && word !== 'background_noise' && word !== '_unknown_') {
          for (const listener of this.speechCommandListeners) {
            listener(word);
          }
        }
      },
      { probabilityThreshold: 0.75, invokeCallbackOnNoiseAndUnknown: false, overlapFactor: 0.5 },
    );
  }

  stopAudioListening(): void {
    if (this.speechRecognizer && this.speechRecognizer.isListening()) {
      this.speechRecognizer.stopListening();
    }
  }

  onSpeechCommand(callback: (word: string) => void): void {
    this.speechCommandListeners.push(callback);
  }

  offSpeechCommand(callback: (word: string) => void): void {
    this.speechCommandListeners = this.speechCommandListeners.filter((c) => c !== callback);
  }

  getLatestSpeechCommand(): string {
    if (!this.latestSpeechCommand || this.latestSpeechCommand.score < 0.8) return '';
    return this.latestSpeechCommand.word;
  }

  clearSpeechListeners(): void {
    this.speechCommandListeners = [];
  }
}

// Export a singleton instance — there should only ever be one MobileNet loaded.
export const aiEngine = new AIEngine();
