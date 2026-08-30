/**
 * tabular-ai-engine.ts
 *
 * Tabular / numbers training engine for TinkerGyan AI Model Studio.
 *
 * Architecture:
 *   1. Student uploads a CSV file. Papa Parse reads it client-side.
 *   2. Student picks which column is the label (target).
 *   3. Numeric columns are normalised to [0, 1].
 *   4. A small dense neural network (TF.js) is trained in the browser:
 *        Input → Dense(32, relu) → Dense(16, relu) → Dense(n_classes, softmax)
 *   5. Training progress is streamed via an onEpochEnd callback for live chart.
 *   6. Model can be exported via model.save('downloads://...').
 *
 * Privacy: all data stays in the browser — CSV never leaves the device.
 */

import type * as tfTypes from '@tensorflow/tfjs';

let tfRef: typeof tfTypes | null = null;

export interface TabularDataset {
  headers: string[];
  rows: Record<string, string>[];
  numericHeaders: string[]; // columns that are all-numeric
  labelOptions: string[]; // all headers (user picks one as the target)
}

export interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
}

export interface TabularTrainingConfig {
  targetColumn: string;
  epochs: number; // default 50
  batchSize: number; // default 32
  learningRate: number; // default 0.001
}

export const DEFAULT_TABULAR_CONFIG: TabularTrainingConfig = {
  targetColumn: '',
  epochs: 50,
  batchSize: 32,
  learningRate: 0.001,
};

// ─── TabularAIEngine ──────────────────────────────────────────────────────────

class TabularAIEngine {
  private model: tfTypes.LayersModel | null = null;
  private featureColumns: string[] = [];
  private classLabels: string[] = [];
  private featureMin: number[] = [];
  private featureMax: number[] = [];
  private _isTrained = false;

  // ── Init ──────────────────────────────────────────────────────────────────

  async ensureTF(): Promise<void> {
    if (tfRef) return;
    tfRef = await import('@tensorflow/tfjs');
    await tfRef.ready();
  }

  get isTrained(): boolean {
    return this._isTrained;
  }

  // ── CSV Parsing ───────────────────────────────────────────────────────────

  async parseCSV(file: File): Promise<TabularDataset> {
    const Papa = (await import('papaparse')).default;
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const headers = result.meta.fields ?? [];
          const rows = result.data;
          // Detect numeric columns
          const numericHeaders = headers.filter((h) =>
            rows.every((r) => r[h] !== '' && !isNaN(Number(r[h]))),
          );
          resolve({ headers, rows, numericHeaders, labelOptions: headers });
        },
        error: (err: Error) => reject(err),
      });
    });
  }

  // ── Training ──────────────────────────────────────────────────────────────

  async train(
    dataset: TabularDataset,
    config: TabularTrainingConfig,
    onProgress: (p: TrainingProgress) => void,
  ): Promise<void> {
    await this.ensureTF();
    if (!tfRef) throw new Error('TensorFlow not loaded');

    const { targetColumn, epochs, batchSize, learningRate } = config;
    if (!targetColumn) throw new Error('No target column selected');

    // Feature columns = all numeric headers except the target
    this.featureColumns = dataset.numericHeaders.filter((h) => h !== targetColumn);
    if (this.featureColumns.length === 0) throw new Error('No numeric feature columns found');

    // Collect unique class labels from target column
    const allLabels = dataset.rows.map((r) => r[targetColumn] ?? '').filter(Boolean);
    this.classLabels = [...new Set(allLabels)].sort();
    if (this.classLabels.length < 2)
      throw new Error('Target column must have at least 2 unique values');

    // Build feature matrix (n_rows × n_features)
    const rawX = dataset.rows.map((r) => this.featureColumns.map((h) => Number(r[h] ?? 0)));

    // Normalise each feature to [0, 1]
    this.featureMin = this.featureColumns.map((_, fi) => Math.min(...rawX.map((r) => r[fi]!)));
    this.featureMax = this.featureColumns.map((_, fi) => Math.max(...rawX.map((r) => r[fi]!)));
    const normX = rawX.map((r) =>
      r.map((v, fi) => {
        const range = (this.featureMax[fi] ?? 1) - (this.featureMin[fi] ?? 0);
        return range === 0 ? 0 : (v - (this.featureMin[fi] ?? 0)) / range;
      }),
    );

    // One-hot encode labels
    const yIndices = allLabels.map((l) => this.classLabels.indexOf(l));
    const xTensor = tfRef.tensor2d(normX);
    const yTensor = tfRef.oneHot(tfRef.tensor1d(yIndices, 'int32'), this.classLabels.length);

    // Build model
    const nFeatures = this.featureColumns.length;
    const nClasses = this.classLabels.length;
    this.model = tfRef.sequential({
      layers: [
        tfRef.layers.dense({ inputShape: [nFeatures], units: 32, activation: 'relu' }),
        tfRef.layers.dropout({ rate: 0.2 }),
        tfRef.layers.dense({ units: 16, activation: 'relu' }),
        tfRef.layers.dense({ units: nClasses, activation: 'softmax' }),
      ],
    });

    this.model.compile({
      optimizer: tfRef.train.adam(learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    await this.model.fit(xTensor, yTensor, {
      epochs,
      batchSize,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch: number, logs?: Record<string, number>) => {
          onProgress({
            epoch: epoch + 1,
            totalEpochs: epochs,
            loss: Number((logs?.['loss'] ?? 0).toFixed(4)),
            accuracy: Number(((logs?.['acc'] ?? logs?.['accuracy'] ?? 0) * 100).toFixed(1)),
          });
        },
      },
    });

    xTensor.dispose();
    yTensor.dispose();
    this._isTrained = true;
  }

  // ── Inference ─────────────────────────────────────────────────────────────

  predict(
    row: Record<string, string | number>,
  ): { label: string; confidence: number; allConfidences: Record<string, number> } | null {
    if (!this.model || !tfRef || !this._isTrained) return null;
    const features = this.featureColumns.map((h, fi) => {
      const v = Number(row[h] ?? 0);
      const range = (this.featureMax[fi] ?? 1) - (this.featureMin[fi] ?? 0);
      return range === 0 ? 0 : (v - (this.featureMin[fi] ?? 0)) / range;
    });
    const input = tfRef.tensor2d([features]);
    const output = this.model.predict(input) as tfTypes.Tensor;
    const probs = Array.from(output.dataSync());
    input.dispose();
    output.dispose();

    const allConfidences: Record<string, number> = {};
    probs.forEach((p, i) => {
      if (this.classLabels[i]) allConfidences[this.classLabels[i]] = Math.round(p * 100);
    });
    const topIdx = probs.indexOf(Math.max(...probs));
    const topLabel = this.classLabels[topIdx] ?? '';
    return { label: topLabel, confidence: allConfidences[topLabel] ?? 0, allConfidences };
  }

  // ── Export ────────────────────────────────────────────────────────────────

  async exportModel(): Promise<void> {
    if (!this.model) throw new Error('No trained model to export');
    await this.model.save('downloads://tinkergyan-tabular-model');
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  reset(): void {
    this.model?.dispose();
    this.model = null;
    this.featureColumns = [];
    this.classLabels = [];
    this.featureMin = [];
    this.featureMax = [];
    this._isTrained = false;
  }

  getFeatureColumns(): string[] {
    return this.featureColumns;
  }
  getClassLabels(): string[] {
    return this.classLabels;
  }
}

export const tabularAIEngine = new TabularAIEngine();
