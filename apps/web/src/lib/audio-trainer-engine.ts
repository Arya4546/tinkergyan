/**
 * audio-trainer-engine.ts
 *
 * Custom audio training engine for TinkerGyan AI Model Studio.
 *
 * Architecture:
 *   1. Web Audio API captures a 1-second mic snapshot per "Hold to Record" press.
 *   2. An AnalyserNode extracts a 128-point FFT magnitude spectrum → a feature vector.
 *   3. A KNN classifier (from @tensorflow-models/knn-classifier) stores labelled vectors.
 *   4. At prediction time, the mic is polled ~5×/sec; the KNN votes from stored vectors.
 *
 * Privacy: all audio stays in the browser — no data leaves the device.
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

export interface AudioPrediction {
  label: string;
  confidence: number;
  allConfidences: Record<string, number>;
}

export type AudioPredictionCallback = (result: AudioPrediction) => void;

// ─── AudioTrainerEngine ────────────────────────────────────────────────────────

class AudioTrainerEngine {
  private classifier: KNNClassifier | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private predictionInterval: ReturnType<typeof setInterval> | null = null;
  private _isInitialised = false;

  /** FFT size — 256 bins, 128 usable magnitudes. */
  private readonly FFT_SIZE = 256;
  /** Prediction poll rate ms (~5 FPS). */
  private readonly POLL_MS = 200;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this._isInitialised) return;
    const [tfModule, knnModule] = await Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/knn-classifier'),
    ]);
    tfRef = tfModule;
    await tfRef.ready();
    this.classifier = knnModule.create() as unknown as KNNClassifier;
    this._isInitialised = true;
  }

  get isInitialised(): boolean {
    return this._isInitialised;
  }

  dispose(): void {
    this.stopPredicting();
    this.stopMic();
    this.classifier?.dispose();
    this.classifier = null;
    this.audioCtx?.close();
    this.audioCtx = null;
    this._isInitialised = false;
  }

  // ── Mic ───────────────────────────────────────────────────────────────────

  async startMic(): Promise<void> {
    if (this.micStream) return;
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.audioCtx = new AudioContext();
    const source = this.audioCtx.createMediaStreamSource(this.micStream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = this.FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.3;
    source.connect(this.analyser);
  }

  stopMic(): void {
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
    this.analyser = null;
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  get isMicActive(): boolean {
    return this.micStream !== null;
  }

  /** Returns a live waveform buffer (Uint8Array) for drawing the visualizer. */
  getWaveform(): Uint8Array {
    if (!this.analyser) return new Uint8Array(128);
    const buf = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(buf);
    return buf;
  }

  // ── Feature Extraction ────────────────────────────────────────────────────

  private extractFeatures(): any {
    if (!this.analyser || !tfRef) return null;
    const freqData = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(freqData);
    // Normalise dB values (typically −160 to 0) to 0–1 range.
    const normalised = Array.from(freqData).map((v) => Math.max(0, (v + 160) / 160));
    return tfRef.tensor1d(normalised);
  }

  // ── Training ──────────────────────────────────────────────────────────────

  /** Capture one snapshot from the mic and add it to the class. */
  captureExample(label: string): boolean {
    if (!this.classifier) throw new Error('Audio engine not initialised');
    const feat = this.extractFeatures();
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

  startPredicting(callback: AudioPredictionCallback, k = 3): void {
    if (this.predictionInterval !== null) return;
    this.predictionInterval = setInterval(async () => {
      if (!this.classifier || this.classifier.getNumClasses() < 2) return;
      const feat = this.extractFeatures();
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
    if (!this.classifier || !tfRef) throw new Error('Audio engine not initialised');
    const parsed = JSON.parse(jsonStr) as { v: number; classes: Record<string, number[][]> };
    this.classifier.clearAllClasses();
    const tensorDataset: Record<string, any> = {};
    for (const [label, vectors] of Object.entries(parsed.classes)) {
      tensorDataset[label] = tfRef.tensor2d(vectors);
    }
    this.classifier.setClassifierDataset(tensorDataset);
  }
}

export const audioTrainerEngine = new AudioTrainerEngine();
