/**
 * music-engine.ts
 *
 * Uses Magenta.js (MusicRNN) to generate simple AI melodies in the browser.
 * Lazy loads @magenta/music to keep the initial bundle small.
 */

export class MusicAIEngine {
  private mm: any = null;
  private rnn: any = null;
  private player: any = null;
  private _isInitialised = false;
  private _isPlaying = false;

  async init(): Promise<void> {
    if (this._isInitialised) return;

    // Lazy load Magenta.js
    const mm = await import('@magenta/music');
    this.mm = mm;

    // We use a basic MelodyRNN model trained on basic melodies
    // Hosted on Magenta's public GCP bucket
    const rnn = new mm.MusicRNN(
      'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn',
    );
    await rnn.initialize();

    this.rnn = rnn;
    this.player = new mm.Player();

    // Wire up player callbacks to track state
    const originalStart = this.player.start.bind(this.player);
    this.player.start = async (...args: any[]) => {
      this._isPlaying = true;
      await originalStart(...args);
      this._isPlaying = false;
    };

    this._isInitialised = true;
  }

  get isInitialised(): boolean {
    return this._isInitialised;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * Generates and plays a continuation of a base sequence.
   * @param notes Array of MIDI note numbers (e.g. [60, 62, 64])
   * @param steps How many new steps to generate (e.g. 20)
   * @param temperature Creativity/randomness (0.1 to 2.0)
   */
  async playAIMelody(notes: number[], steps = 20, temperature = 1.0): Promise<void> {
    if (!this._isInitialised) await this.init();
    if (this._isPlaying) {
      this.stop();
    }

    if (notes.length === 0) {
      notes = [60]; // Middle C fallback
    }

    // Convert simple MIDI array into a NoteSequence required by Magenta
    const quantizedStepsPerNote = 4; // 16th notes
    const sequence = {
      notes: notes.map((pitch, idx) => ({
        pitch,
        quantizedStartStep: idx * quantizedStepsPerNote,
        quantizedEndStep: (idx + 1) * quantizedStepsPerNote,
      })),
      quantizationInfo: { stepsPerQuarter: 4 },
      totalQuantizedSteps: notes.length * quantizedStepsPerNote,
    };

    try {
      // Generate continuation
      const generated = await this.rnn.continueSequence(sequence, steps, temperature);

      // Play the combined result
      const combined = this.mm.sequences.concatenate([sequence, generated]);
      await this.player.start(combined);
    } catch (e) {
      console.error('AI Music generation failed:', e);
      this._isPlaying = false;
    }
  }

  stop(): void {
    if (this.player && this.player.isPlaying()) {
      this.player.stop();
      this._isPlaying = false;
    }
  }
}

export const musicEngine = new MusicAIEngine();
