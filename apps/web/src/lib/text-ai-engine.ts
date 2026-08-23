/**
 * text-ai-engine.ts
 *
 * Text Classification engine for TinkerGyan.
 * Uses Universal Sentence Encoder (USE) to convert text → 512-dim vectors,
 * then feeds them into our existing KNN classifier — the same pattern as
 * image classification but for text instead of webcam frames.
 *
 * Student workflow:
 *   1. Type example sentences per class (e.g. "Hello" → "Greeting")
 *   2. Click "Train"
 *   3. Use `classify text [...]` block — returns the matching class label
 */

export interface TextClassificationResult {
  label: string;
  confidence: number; // 0-100
  allConfidences: Record<string, number>;
}

class TextAIEngine {
  private useModel: any = null;
  private classifier: any = null;
  private tfRef: any = null;
  private _isInitialised = false;

  // Stored text training examples: { className: [sentence, sentence, ...] }
  private textExamples: Record<string, string[]> = {};

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this._isInitialised) return;

    const [tfModule, useModule, knnModule] = await Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/universal-sentence-encoder'),
      import('@tensorflow-models/knn-classifier'),
    ]);

    this.tfRef = tfModule;
    await this.tfRef.ready();

    this.useModel = await useModule.load();
    this.classifier = knnModule.create();

    this._isInitialised = true;
  }

  get isInitialised(): boolean {
    return this._isInitialised;
  }

  // ── Training ───────────────────────────────────────────────────────────────

  /** Add a sentence to a class (stored as raw text for display) */
  addTextExample(sentence: string, label: string): void {
    if (!this.textExamples[label]) this.textExamples[label] = [];
    this.textExamples[label].push(sentence);
  }

  removeTextExamplesForClass(label: string): void {
    delete this.textExamples[label];
    this.classifier?.clearClass(label);
  }

  getTextExamples(): Record<string, string[]> {
    return this.textExamples;
  }

  getClassLabels(): string[] {
    return Object.keys(this.textExamples).filter((k) => (this.textExamples[k]?.length ?? 0) > 0);
  }

  /**
   * Encode all stored text examples and add them to the KNN classifier.
   * Must be called before classifyText() will work.
   */
  async trainModel(): Promise<void> {
    if (!this.useModel || !this.classifier) throw new Error('Text engine not initialised');

    this.classifier.clearAllClasses();

    for (const [label, sentences] of Object.entries(this.textExamples)) {
      if (sentences.length === 0) continue;

      // Embed all sentences for this class in one batch
      const embeddings = await this.useModel.embed(sentences);
      const embeddingArray = (await embeddings.array()) as number[][];
      embeddings.dispose();

      // Add each embedding vector to the KNN
      for (const vector of embeddingArray) {
        const tensor = this.tfRef.tensor1d(vector);
        this.classifier.addExample(tensor, label);
        tensor.dispose();
      }
    }
  }

  /** Returns true if at least 2 classes have training examples and model is trained */
  get isReadyToClassify(): boolean {
    return this.getClassLabels().length >= 2 && this.classifier?.getNumClasses() >= 2;
  }

  // ── Inference ──────────────────────────────────────────────────────────────

  async classifyText(text: string): Promise<TextClassificationResult> {
    if (!this.useModel || !this.classifier || !this.tfRef) {
      return { label: '', confidence: 0, allConfidences: {} };
    }

    const embedding = await this.useModel.embed([text]);
    const flatEmbedding = ((await embedding.array()) as number[][])[0]!;
    embedding.dispose();

    const tensor = this.tfRef.tensor1d(flatEmbedding);

    try {
      const counts: Record<string, number> = this.classifier.getClassExampleCount();
      const minSamples = Math.min(...Object.values(counts));
      const k = Math.min(3, Math.max(1, minSamples));

      const result = await this.classifier.predictClass(tensor, k);
      const allConfidences: Record<string, number> = {};
      for (const [lbl, conf] of Object.entries(result.confidences)) {
        allConfidences[lbl] = Math.round((conf as number) * 100);
      }
      return {
        label: result.label as string,
        confidence: allConfidences[result.label as string] ?? 0,
        allConfidences,
      };
    } finally {
      tensor.dispose();
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  serializeExamples(): string {
    return JSON.stringify({ v: 1, examples: this.textExamples });
  }

  deserializeExamples(jsonStr: string): void {
    const parsed = JSON.parse(jsonStr) as { v: number; examples: Record<string, string[]> };
    this.textExamples = parsed.examples ?? {};
  }

  clearAll(): void {
    this.textExamples = {};
    this.classifier?.clearAllClasses();
  }
}

export const textAIEngine = new TextAIEngine();
