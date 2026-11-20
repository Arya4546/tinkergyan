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

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

class TextAIEngine {
  private useModel: any = null;
  private classifier: any = null;
  private tfRef: any = null;
  private _isInitialised = false;
  private initPromise: Promise<void> | null = null;

  // Stored text training examples: { className: [sentence, sentence, ...] }
  private textExamples: Record<string, string[]> = {};

  // Sentence vectors from the last training run: { className: [vector, ...] }
  private embeddings: Record<string, number[][]> = {};

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Loads the sentence encoder and creates the classifier. Safe to call from
   * several places at once (the warm-up on the first typed sentence, the Train
   * button, restoring a saved project): every caller awaits the SAME load.
   *
   * It used to start a second load per caller, and whichever finished last
   * replaced `this.classifier` with a brand-new empty one — so a model that had
   * just been trained and tested correctly failed on the next test with "You
   * have not added any examples to the KNN classifier".
   */
  async init(): Promise<void> {
    if (this._isInitialised) return;
    if (!this.initPromise) {
      this.initPromise = this.load().catch((err) => {
        // Let a later call retry instead of caching the failure forever.
        this.initPromise = null;
        throw err;
      });
    }
    await this.initPromise;
  }

  private async load(): Promise<void> {
    const [tfModule, useModule, knnModule] = await Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/universal-sentence-encoder'),
      import('@tensorflow-models/knn-classifier'),
    ]);

    await tfModule.ready();
    const useModel = await useModule.load();

    // Publish everything together, only once the whole load has succeeded.
    this.tfRef = tfModule;
    this.useModel = useModel;
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
    delete this.embeddings[label];
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
    this.embeddings = {};

    for (const [label, sentences] of Object.entries(this.textExamples)) {
      if (sentences.length === 0) continue;

      // Embed all sentences for this class in one batch
      const embeddings = await this.useModel.embed(sentences);
      const embeddingArray = (await embeddings.array()) as number[][];
      embeddings.dispose();

      this.embeddings[label] = embeddingArray;

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

    // Score every class by how SIMILAR the sentence is to that class's examples.
    //
    // This used to be a k-nearest-neighbour vote with k = min(3, smallest class
    // size). With 2 examples per class that is k = 2, so the two nearest
    // neighbours were often one from each class → a 50/50 tie → the first class
    // won, even for a sentence typed exactly as a training example ("i am
    // feeling sad" → "Class 1, 50%"). Comparing similarities has no ties.
    const labels = Object.keys(this.embeddings);
    if (labels.length === 0) return { label: '', confidence: 0, allConfidences: {} };

    const scores: Record<string, number> = {};
    for (const label of labels) {
      const sims = (this.embeddings[label] ?? [])
        .map((v) => cosineSimilarity(flatEmbedding, v))
        .sort((x, y) => y - x);
      // Average of the best two matches: one lucky near-duplicate cannot
      // outvote a class that is similar overall.
      const top = sims.slice(0, 2);
      scores[label] = top.reduce((sum, v) => sum + v, 0) / Math.max(1, top.length);
    }

    // Turn similarities into percentages that add up to 100 (softmax). The
    // factor spreads out the small gaps that sentence vectors give.
    const SHARPNESS = 12;
    const max = Math.max(...Object.values(scores));
    const exps: Record<string, number> = {};
    let total = 0;
    for (const label of labels) {
      exps[label] = Math.exp(SHARPNESS * ((scores[label] ?? 0) - max));
      total += exps[label];
    }
    const allConfidences: Record<string, number> = {};
    let best = labels[0]!;
    for (const label of labels) {
      allConfidences[label] = Math.round((exps[label]! / total) * 100);
      if ((scores[label] ?? -1) > (scores[best] ?? -1)) best = label;
    }
    return { label: best, confidence: allConfidences[best] ?? 0, allConfidences };
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
    this.embeddings = {};
    this.classifier?.clearAllClasses();
  }
}

export const textAIEngine = new TextAIEngine();
