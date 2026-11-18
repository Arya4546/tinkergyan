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

  /** FFT size — 256 bins (128 magnitudes). Kept for saved-model compatibility. */
  private readonly FFT_SIZE = 256;
  /** Prediction poll rate ms (~8 FPS). */
  private readonly POLL_MS = 120;
  /** Rolling confidences for temporal smoothing. */
  private recentConfidences: Array<Record<string, number>> = [];
  private readonly SMOOTH_WINDOW = 4;
  /** Below this loudness (RMS, 0–1) the mic is hearing silence, not a sound. */
  private readonly SILENCE_RMS = 0.008;
  /** Consecutive quiet polls (~120 ms each) before we call it silence, so the gaps inside a word don't flicker. */
  private readonly SILENCE_POLLS = 3;

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
    if (this.micStream) {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return;
    }
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.audioCtx = new AudioContext();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    const source = this.audioCtx.createMediaStreamSource(this.micStream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = this.FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.3;
    source.connect(this.analyser);
  }

  stopMic(): void {
    this.stopPredicting();
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
    this.analyser = null;
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  get isMicActive(): boolean {
    return this.micStream !== null;
  }

  /** Returns a live waveform buffer (Uint8Array) for drawing the visualizer. */
  getWaveform(): Uint8Array {
    if (!this.analyser) return new Uint8Array(128);
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    const buf = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(buf);
    return buf;
  }

  // ── Feature Extraction ────────────────────────────────────────────────────

  private extractFeatures(): any {
    return this.extractFrame()?.feat ?? null;
  }

  /** One normalised spectrum snapshot, plus how loud it was (0–1, pre-normalisation). */
  private extractFrame(): { feat: any; energy: number } | null {
    if (!this.analyser || !tfRef) return null;
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    const freqData = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(freqData);
    return this.featuresFromFreq(freqData);
  }

  /**
   * dB spectrum -> normalised feature tensor. Shared by the live microphone
   * and by uploaded files so both land in exactly the same feature space.
   */
  private featuresFromFreq(freqData: Float32Array): { feat: any; energy: number } | null {
    if (!tfRef) return null;
    // Map dB → 0–1, then log-compress so quiet/loud samples sit closer together
    // and mid-band speech cues are not drowned by absolute volume.
    const features = Array.from(freqData).map((v) => {
      const linear = Math.max(0, (v + 160) / 160);
      return Math.log1p(linear * 12) / Math.log1p(12);
    });
    const energy = features.reduce((a, b) => a + b, 0) / Math.max(1, features.length);
    const tensor = tfRef.tensor1d(features);
    const norm = tensor.norm();
    const normalised = tensor.div(norm.add(1e-6));
    tensor.dispose();
    norm.dispose();
    return { feat: normalised, energy };
  }

  private smoothPrediction(confidences: Record<string, number>): {
    label: string;
    confidence: number;
    allConfidences: Record<string, number>;
  } {
    this.recentConfidences.push(confidences);
    if (this.recentConfidences.length > this.SMOOTH_WINDOW) this.recentConfidences.shift();
    const averaged: Record<string, number> = {};
    for (const frame of this.recentConfidences) {
      for (const [label, conf] of Object.entries(frame)) {
        averaged[label] = (averaged[label] ?? 0) + conf;
      }
    }
    const n = this.recentConfidences.length;
    for (const label of Object.keys(averaged)) {
      averaged[label] = Math.round(averaged[label]! / n);
    }
    let bestLabel = Object.keys(averaged)[0] ?? '';
    let bestConf = -1;
    for (const [label, conf] of Object.entries(averaged)) {
      if (conf > bestConf) {
        bestConf = conf;
        bestLabel = label;
      }
    }
    return { label: bestLabel, confidence: bestConf, allConfidences: averaged };
  }

  // ── Training ──────────────────────────────────────────────────────────────

  /** Grab one snapshot for a take in progress. The caller owns (and must dispose) `feat`. */
  grabFrame(): { feat: any; energy: number } | null {
    return this.extractFrame();
  }

  /**
   * Turn a whole take (many snapshots over a second or two) into ONE sample.
   *
   * A spoken word fills only part of the take, so averaging every snapshot
   * would blend the word with the silence around it. Unless it is a steady
   * background-noise class, only the louder half of the take (by loudness) is
   * averaged. Takes ownership of `frames` and disposes them.
   */
  addTakeExample(
    label: string,
    frames: Array<{ feat: any; energy: number }>,
    steady = false,
  ): boolean {
    if (!this.classifier || !tfRef) {
      for (const f of frames) f.feat.dispose();
      throw new Error('Audio engine not initialised');
    }
    if (frames.length === 0) return false;
    const energies = frames.map((f) => f.energy);
    const lo = Math.min(...energies);
    const hi = Math.max(...energies);
    const cut = steady || hi - lo < 0.01 ? -Infinity : lo + (hi - lo) * 0.5;
    const chosen = frames.filter((f) => f.energy >= cut);
    const stacked = tfRef.stack(chosen.map((f) => f.feat));
    const mean = stacked.mean(0);
    const norm = mean.norm();
    const sample = mean.div(norm.add(1e-6));
    this.classifier.addExample(sample, label);
    for (const t of [stacked, mean, norm, sample]) t.dispose();
    for (const f of frames) f.feat.dispose();
    return true;
  }

  /**
   * Turn an uploaded audio file into samples, with the same rule as recording:
   * every `takeMs` of audio is ONE sample (a long file gives several, a short
   * one gives one). Anything past `maxTakes` is ignored.
   *
   * The file is decoded and analysed offline — faster than playing it — using
   * the same analyser settings and sample rate as the live microphone, so an
   * uploaded sample and a recorded one are directly comparable.
   *
   * Throws if the browser cannot decode the data.
   */
  async addSamplesFromAudioFile(
    label: string,
    data: ArrayBuffer,
    opts: { takeMs: number; frameMs: number; maxTakes: number; steady?: boolean },
  ): Promise<{ added: number; seconds: number; truncated: boolean }> {
    if (!this.classifier || !tfRef) throw new Error('Audio engine not initialised');
    const { takeMs, frameMs, maxTakes, steady = false } = opts;

    // Match the live context's rate so FFT bins mean the same frequencies.
    let sampleRate = this.audioCtx?.sampleRate;
    if (!sampleRate) {
      const probe = new AudioContext();
      sampleRate = probe.sampleRate;
      void probe.close().catch(() => {});
    }

    const decoder = new OfflineAudioContext(1, 1, sampleRate);
    const buffer = await decoder.decodeAudioData(data.slice(0));
    const seconds = buffer.duration;
    if (!(seconds > 0)) throw new Error('The file has no audio in it.');

    // Whole takes only, but never drop a file that is just shorter than one,
    // and keep a trailing piece only if it is at least a second long.
    const takeSec = takeMs / 1000;
    let takes = Math.floor(seconds / takeSec);
    if (takes === 0 || seconds - takes * takeSec >= 1) takes += 1;
    const truncated = takes > maxTakes;
    takes = Math.min(takes, maxTakes);

    const framesPerTake = Math.max(1, Math.floor(takeMs / frameMs));
    const totalFrames = Math.max(
      1,
      Math.min(takes * framesPerTake, Math.floor((seconds * 1000) / frameMs)),
    );

    const ctx = new OfflineAudioContext(
      1,
      Math.ceil(((totalFrames * frameMs) / 1000 + 0.1) * sampleRate),
      sampleRate,
    );
    const analyser = ctx.createAnalyser();
    analyser.fftSize = this.FFT_SIZE;
    analyser.smoothingTimeConstant = 0.3;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    source.start();

    const perTake: Array<Array<{ feat: any; energy: number }>> = Array.from(
      { length: takes },
      () => [],
    );
    // Pause the render every frameMs and read the analyser, exactly like the
    // live path reads it on a timer.
    for (let k = 1; k <= totalFrames; k++) {
      void ctx.suspend((k * frameMs) / 1000).then(() => {
        const freq = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(freq);
        const frame = this.featuresFromFreq(freq);
        const bucket = perTake[Math.floor((k - 1) / framesPerTake)];
        if (frame && bucket) bucket.push(frame);
        return ctx.resume();
      });
    }
    await ctx.startRendering();

    let added = 0;
    for (const frames of perTake) {
      if (frames.length === 0) continue;
      if (this.addTakeExample(label, frames, steady)) added += 1;
    }
    return { added, seconds, truncated };
  }

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
    if (!this.classifier || this.getExampleCounts()[label] === undefined) return;
    this.classifier.clearClass(label);
  }

  /** Rename a trained class by updating the underlying dataset */
  renameClass(oldLabel: string, newLabel: string): void {
    if (!this.classifier || oldLabel === newLabel || !newLabel.trim()) return;
    const dataset = this.classifier.getClassifierDataset() ?? {};
    // Move samples when present. Empty classes only live in React state — the
    // count bookkeeping below still keeps getExampleCounts() consistent.
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

  async forceResumeMic(): Promise<void> {
    if (this.micStream && this.audioCtx) {
      const before = this.audioCtx.state as string;
      if (before === 'running') return;
      if (before === 'suspended') {
        try {
          await this.audioCtx.resume();
        } catch {
          // Fall through and recreate the stream under a fresh user gesture.
        }
      }
      const after = this.audioCtx.state as string;
      if (after === 'running') return;
      this.stopMic();
    }
    await this.startMic();
  }

  clearAll(): void {
    this.classifier?.clearAllClasses();
  }

  get isReadyToPredict(): boolean {
    const counts = this.getExampleCounts();
    return Object.keys(counts).filter((k) => (counts[k] ?? 0) > 0).length >= 2;
  }

  // ── Inference ─────────────────────────────────────────────────────────────

  /** Current mic loudness as RMS (0–1), or null if the mic isn't running. */
  private currentRms(): number | null {
    if (!this.analyser) return null;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
  }

  startPredicting(callback: AudioPredictionCallback, k = 5): void {
    if (this.predictionInterval !== null) return;
    this.recentConfidences = [];
    let quietPolls = 0;
    this.predictionInterval = setInterval(async () => {
      if (!this.classifier || this.classifier.getNumClasses() < 2) return;

      // A KNN classifier always returns its nearest class, even for a spectrum
      // that is just mic hiss — which showed "Clap 100%" with nothing playing.
      // So when it is quiet we report "no sound" instead of guessing. A class
      // the student named "background…" is meant to model quiet, so then we
      // classify as usual.
      const labels = Object.keys(this.classifier.getClassExampleCount());
      const hasBackgroundClass = labels.some((l) => l.toLowerCase().includes('background'));
      const rms = this.currentRms();
      if (!hasBackgroundClass && rms !== null) {
        quietPolls = rms < this.SILENCE_RMS ? quietPolls + 1 : 0;
        if (quietPolls >= this.SILENCE_POLLS) {
          this.recentConfidences = [];
          callback({
            label: '',
            confidence: 0,
            allConfidences: Object.fromEntries(labels.map((l) => [l, 0])),
          });
          return;
        }
      }
      const feat = this.extractFeatures();
      if (!feat) return;
      try {
        const counts = this.classifier.getClassExampleCount();
        const minSamples = Math.min(...Object.values(counts));
        let kClamped = Math.min(k, Math.max(1, minSamples));
        if (kClamped > 1 && kClamped % 2 === 0) kClamped -= 1;
        const result = await this.classifier.predictClass(feat, kClamped);
        const frameConfs: Record<string, number> = {};
        for (const [label, conf] of Object.entries(result.confidences)) {
          frameConfs[label] = Math.round(conf * 100);
        }
        const smoothed = this.smoothPrediction(frameConfs);
        callback({
          label: smoothed.label,
          confidence: smoothed.confidence,
          allConfidences: smoothed.allConfidences,
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
    this.recentConfidences = [];
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
