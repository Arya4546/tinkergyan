/**
 * speech-engine.ts
 *
 * Speech-to-Text (live transcription) and Text-to-Speech (synthesis)
 * using the browser's built-in Web Speech API — zero npm dependencies.
 *
 * This is separate from the existing TF.js Speech Commands recogniser,
 * which only detects preset keywords. This engine:
 *   - STT: converts ANY spoken phrase to a text string
 *   - TTS: makes the browser speak any text aloud
 */

type TranscriptCallback = (text: string) => void;

class SpeechEngine {
  // ── Speech-to-Text ─────────────────────────────────────────────────────────
  private recognition: any = null; // SpeechRecognition instance
  private latestTranscript = '';
  private transcriptListeners: TranscriptCallback[] = [];
  private _isListening = false;

  // ── Text-to-Speech ─────────────────────────────────────────────────────────
  private speechRate = 1.0;
  private speechLang = 'en-US';

  // ── STT Methods ─────────────────────────────────────────────────────────────

  get isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  startListening(lang = 'en-US'): void {
    if (!this.isSupported || this._isListening) return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.lang = lang;
    this.recognition.interimResults = false;
    this.recognition.continuous = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const transcript = (event.results[event.results.length - 1][0].transcript as string)
        .trim()
        .toLowerCase();
      this.latestTranscript = transcript;
      for (const listener of this.transcriptListeners) {
        listener(transcript);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('SpeechRecognition error:', event.error);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart to keep continuous listening
      if (this._isListening) {
        try {
          this.recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    this.recognition.start();
    this._isListening = true;
  }

  stopListening(): void {
    this._isListening = false;
    try {
      this.recognition?.stop();
    } catch {
      /* ignore */
    }
    this.recognition = null;
  }

  get isListening(): boolean {
    return this._isListening;
  }

  getLatestTranscript(): string {
    return this.latestTranscript;
  }

  speechContains(phrase: string): boolean {
    return this.latestTranscript.includes(phrase.toLowerCase());
  }

  onTranscript(callback: TranscriptCallback): void {
    this.transcriptListeners.push(callback);
  }

  offTranscript(callback: TranscriptCallback): void {
    this.transcriptListeners = this.transcriptListeners.filter((c) => c !== callback);
  }

  // ── TTS Methods ─────────────────────────────────────────────────────────────

  get ttsSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  speak(text: string, lang?: string): void {
    if (!this.ttsSupported) return;
    window.speechSynthesis.cancel(); // stop anything currently speaking
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang ?? this.speechLang;
    utterance.rate = this.speechRate;
    window.speechSynthesis.speak(utterance);
  }

  setSpeechRate(rate: number): void {
    this.speechRate = Math.max(0.1, Math.min(10, rate));
  }

  setSpeechLang(lang: string): void {
    this.speechLang = lang;
  }

  stopSpeaking(): void {
    if (this.ttsSupported) window.speechSynthesis.cancel();
  }
}

export const speechEngine = new SpeechEngine();
