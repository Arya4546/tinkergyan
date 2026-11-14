/**
 * audio-file-types.ts
 *
 * Which audio files the Audio trainer will accept for upload.
 *
 * The list is built at runtime from what THIS browser can actually decode
 * (HTMLMediaElement.canPlayType), because support differs: Safari plays
 * M4A/AAC but not Ogg, Firefox plays Ogg/Opus but not M4A on every platform,
 * etc. A file the browser cannot decode would only fail later with a cryptic
 * "Unable to decode audio data", so it is refused up front with a clear message.
 *
 * Video files are refused even when their container (e.g. .mp4, .webm) would
 * decode — this is an audio trainer.
 */

interface CandidateType {
  /** Extensions (lower-case, no dot). */
  exts: string[];
  /** Label shown to the student. */
  label: string;
  /** MIME strings to probe with canPlayType; any non-empty answer = supported. */
  probes: string[];
}

const CANDIDATES: CandidateType[] = [
  { exts: ['wav'], label: 'WAV', probes: ['audio/wav', 'audio/x-wav'] },
  { exts: ['mp3'], label: 'MP3', probes: ['audio/mpeg', 'audio/mp3'] },
  {
    exts: ['ogg', 'oga'],
    label: 'OGG',
    probes: ['audio/ogg; codecs="vorbis"', 'audio/ogg; codecs="opus"', 'audio/ogg'],
  },
  { exts: ['opus'], label: 'Opus', probes: ['audio/ogg; codecs="opus"', 'audio/opus'] },
  { exts: ['webm'], label: 'WebM audio', probes: ['audio/webm; codecs="opus"', 'audio/webm'] },
  { exts: ['m4a', 'mp4a'], label: 'M4A', probes: ['audio/mp4; codecs="mp4a.40.2"', 'audio/x-m4a'] },
  { exts: ['aac'], label: 'AAC', probes: ['audio/aac', 'audio/mp4; codecs="mp4a.40.2"'] },
  { exts: ['flac'], label: 'FLAC', probes: ['audio/flac', 'audio/x-flac'] },
];

/** Largest file accepted. Decoded audio is ~10x its compressed size in memory. */
export const MAX_AUDIO_FILE_BYTES = 25 * 1024 * 1024;

let cached: CandidateType[] | null = null;

function supportedCandidates(): CandidateType[] {
  if (cached) return cached;
  let probe: HTMLAudioElement | null = null;
  try {
    probe = document.createElement('audio');
  } catch {
    probe = null;
  }
  const canPlay = (mime: string) => {
    if (!probe) return true; // no DOM (tests) — let decoding be the judge
    try {
      return probe.canPlayType(mime) !== '';
    } catch {
      return false;
    }
  };
  cached = CANDIDATES.filter((c) => c.probes.some(canPlay));
  return cached;
}

/** Value for <input type="file" accept="…">, e.g. ".wav,.mp3,.ogg". */
export function audioAcceptAttribute(): string {
  return supportedCandidates()
    .flatMap((c) => c.exts)
    .map((e) => `.${e}`)
    .join(',');
}

/** Human list for messages, e.g. "WAV, MP3, OGG". */
export function supportedAudioLabels(): string {
  return supportedCandidates()
    .map((c) => c.label)
    .join(', ');
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

export type AudioFileCheck = { ok: true } | { ok: false; reason: string };

/**
 * Cheap checks before reading the file. Decoding is still the final judge —
 * a renamed text file passes this and fails there with its own message.
 */
export function checkAudioFile(file: File): AudioFileCheck {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('video/')) {
    return { ok: false, reason: 'is a video file — upload an audio file instead' };
  }
  const ext = extensionOf(file.name);
  const supported = supportedCandidates();
  const extOk = supported.some((c) => c.exts.includes(ext));
  const typeOk =
    type.startsWith('audio/') && supported.some((c) => c.probes.some((p) => p.startsWith(type)));
  if (!extOk && !typeOk) {
    return {
      ok: false,
      reason: `is not a supported audio type (use ${supportedAudioLabels()})`,
    };
  }
  if (file.size === 0) return { ok: false, reason: 'is empty' };
  if (file.size > MAX_AUDIO_FILE_BYTES) {
    return {
      ok: false,
      reason: `is too large (${(file.size / 1024 / 1024).toFixed(0)} MB, max ${MAX_AUDIO_FILE_BYTES / 1024 / 1024} MB)`,
    };
  }
  return { ok: true };
}
