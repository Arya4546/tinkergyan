/**
 * ai-engine.ts
 *
 * In-house AI training & inference engine running 100% in the browser.
 *
 * Architecture:
 *   1. MobileNet v2 (alpha 0.5) extracts a 1024-dim feature vector from each
 *      webcam frame — this is a pre-trained "feature extractor", NOT a classifier.
 *   2. A KNN (k-Nearest Neighbors) classifier stores labelled feature vectors
 *      added by the student. At prediction time it finds the 3 closest stored
 *      vectors and returns a confidence-weighted vote.
 *   3. The webcam stream is managed via getUserMedia. Frames are captured on a
 *      requestAnimationFrame loop throttled to ~10 FPS for battery friendliness.
 *   4. The KNN dataset (feature vectors + labels) can be serialised to/from JSON
 *      for project persistence — stored inside the existing blockState field.
 *
 * Privacy:  No image data or feature vectors ever leave the browser.
 * Cost:    Zero server load. Everything runs on the student's GPU via WebGL.
 * Size:    MobileNet weights (~7 MB) are fetched once from the TF CDN and
 *          permanently cached by the browser's HTTP cache.
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
}

export type PredictionCallback = (result: PredictionResult) => void;

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

  // Latest results
  private latestPose: any[] = [];
  private latestSpeechCommand: { word: string; score: number } | null = null;
  private speechCommandListeners: Array<(word: string) => void> = [];

  /** Minimum interval between predictions (ms). ~10 FPS. */
  private readonly PREDICTION_INTERVAL_MS = 100;

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

    // alpha 0.5 = half-width MobileNet — 4× faster than full, good enough for
    // classroom image classification on a Chromebook.
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

  async startWebcam(videoEl: HTMLVideoElement): Promise<void> {
    if (this.videoStream) return; // already running

    this.videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 224, height: 224 },
      audio: false,
    });

    videoEl.srcObject = this.videoStream;
    await videoEl.play();
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

  // ── Training ──────────────────────────────────────────────────────────────

  /**
   * Adds an example to the KNN model for a specific class.
   */
  addExample(videoEl: HTMLVideoElement, label: string): void {
    if (!this.mobilenet || !this.classifier || !tfRef) {
      throw new Error('AI Engine not initialised');
    }

    const embedding = this.mobilenet.infer(videoEl, true);
    this.classifier.addExample(embedding, label);
    // Dispose the intermediate tensor immediately to prevent GPU memory leaks.
    embedding.dispose();
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
    this.classifier?.clearClass(label);
  }

  /** Rename a trained class by updating the underlying dataset */
  renameClass(oldLabel: string, newLabel: string): void {
    if (!this.classifier || oldLabel === newLabel) return;
    const dataset = this.classifier.getClassifierDataset();
    if (dataset[oldLabel]) {
      dataset[newLabel] = dataset[oldLabel];
      delete dataset[oldLabel];
      this.classifier.setClassifierDataset(dataset);
    }
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
  ): void {
    if (this.predictionLoopId !== null) return; // already running

    this.enableImageKNN = enableImage;
    this.enablePose = enablePose;

    const loop = async () => {
      const now = performance.now();
      if (now - this.lastPredictionTime >= this.PREDICTION_INTERVAL_MS) {
        this.lastPredictionTime = now;

        if (videoEl.readyState >= 2) {
          // Image KNN Prediction
          if (
            this.enableImageKNN &&
            this.mobilenet &&
            this.classifier &&
            this.classifier.getNumClasses() >= 2
          ) {
            const embedding = this.mobilenet.infer(videoEl, true);
            try {
              const result = await this.classifier.predictClass(embedding, 3);
              const allConfidences: Record<string, number> = {};
              for (const [label, conf] of Object.entries(result.confidences)) {
                allConfidences[label] = Math.round(conf * 100);
              }
              if (callback) {
                callback({
                  label: result.label,
                  confidence: allConfidences[result.label] ?? 0,
                  allConfidences,
                });
              }
            } catch {
              // Prediction may fail if classes were cleared mid-loop — safe to ignore.
            } finally {
              embedding.dispose();
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
  }

  get isPredicting(): boolean {
    return this.predictionLoopId !== null;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /**
   * Serialize the entire KNN dataset to a JSON string suitable for storing
   * inside the project's blockState payload.
   *
   * Format: { labels: string[], datasets: { [label]: number[][] } }
   * Each inner array is a 1024-float feature vector.
   */
  async serializeDataset(): Promise<string | null> {
    if (!this.classifier || !tfRef || this.classifier.getNumClasses() === 0) {
      return null;
    }

    const dataset = this.classifier.getClassifierDataset();
    const serialised: Record<string, number[][]> = {};

    for (const [label, tensor] of Object.entries(dataset)) {
      const data = await tensor.array();
      serialised[label] = data;
    }

    return JSON.stringify({ v: 1, classes: serialised });
  }

  /**
   * Rehydrates the KNN dataset from a JSON string.
   */
  deserializeDataset(jsonStr: string): void {
    if (!this.classifier || !tfRef) {
      throw new Error('AI Engine not initialised');
    }

    const parsed = JSON.parse(jsonStr) as { v: number; classes: Record<string, number[][]> };

    this.classifier.clearAllClasses();

    const tensorDataset: Record<string, tf.Tensor2D> = {};
    for (const [label, vectors] of Object.entries(parsed.classes)) {
      tensorDataset[label] = tfRef.tensor2d(vectors);
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
