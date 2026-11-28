/**
 * ai.store.ts
 *
 * Zustand store for all AI Model Studio reactive state.
 * Keeps AI concerns isolated from editor/simulator stores.
 *
 * Class names are stored PER modality (image / audio / pose). A single shared
 * `savedClasses` list caused Audio/Pose to inherit Image labels like
 * "specs" / "no specs" when switching tabs.
 */
import { create } from 'zustand';
import type { EmotionLabel } from '../lib/emotion-engine';

export type AITrainerTab = 'image' | 'text' | 'audio' | 'pose' | 'numbers';

interface AIState {
  // ── Status ──────────────────────────────────────────────────────────────
  isModelLoaded: boolean;
  isWebcamActive: boolean;
  isPredicting: boolean;

  // ── Training Data ───────────────────────────────────────────────────────
  classLabels: string[];
  exampleCounts: Record<string, number>;

  // ── Live Prediction (Image Classification) ───────────────────────────────
  currentPrediction: string | null;
  confidences: Record<string, number>;

  // ── Emotion Detection ────────────────────────────────────────────────────
  isEmotionActive: boolean;
  currentEmotion: EmotionLabel | null;
  emotionConfidences: Record<EmotionLabel, number>;
  faceDetected: boolean;

  // ── Speech-to-Text ───────────────────────────────────────────────────────
  isSpeechListening: boolean;
  latestTranscript: string;

  // ── Hand Tracking ────────────────────────────────────────────────────────
  isHandTrackingActive: boolean;
  handDetected: boolean;
  handKeypoints: Record<string, { x: number; y: number }>;

  // ── Persistence ─────────────────────────────────────────────────────────
  serializedDataset: string | null;
  serializedTextExamples: string | null;
  savedTab: AITrainerTab | null;
  /**
   * The modality a dedicated AI project was created for. Set once at creation
   * and never changed, so AI Studio can open just that one trainer instead of
   * all five — which is what let a previous project's image/audio/pose data
   * (and its "already trained" flags) surface in a brand-new project.
   *
   * `null` means "no declared kind": either a hardware/software project using
   * Train AI, or an AI project created before kinds existed. Both keep the
   * full tab bar.
   */
  savedAIKind: AITrainerTab | null;
  /** Image-tab class names only. */
  savedImageClasses: string[] | null;
  /** Audio-tab class names only. */
  savedAudioClasses: string[] | null;
  /** Pose-tab class names only. */
  savedPoseClasses: string[] | null;
  savedThumbnails: Record<string, string[]> | null;
  savedTextData: { classes: { name: string; sentences: string[] }[] } | null;
  audioModelLoaded: boolean;
  poseModelLoaded: boolean;
  imageModelLoaded: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────
  setModelLoaded: (loaded: boolean) => void;
  setWebcamActive: (active: boolean) => void;
  setPredicting: (predicting: boolean) => void;
  updatePrediction: (label: string, confidences: Record<string, number>) => void;
  clearPrediction: () => void;
  updateTrainingState: (labels: string[], counts: Record<string, number>) => void;
  setSerializedDataset: (data: string | null) => void;
  setSavedProjectAI: (data: {
    tab?: AITrainerTab | null | undefined;
    /** Declared modality of a dedicated AI project (see `savedAIKind`). */
    kind?: AITrainerTab | null | undefined;
    /** @deprecated use imageClasses — kept so older call sites still compile */
    classes?: string[] | null | undefined;
    imageClasses?: string[] | null | undefined;
    audioClasses?: string[] | null | undefined;
    poseClasses?: string[] | null | undefined;
    thumbnails?: Record<string, string[]> | null | undefined;
    textData?: { classes: { name: string; sentences: string[] }[] } | null | undefined;
  }) => void;
  setAudioModelLoaded: (loaded: boolean) => void;
  setPoseModelLoaded: (loaded: boolean) => void;
  setImageModelLoaded: (loaded: boolean) => void;
  // Emotion
  setEmotionActive: (active: boolean) => void;
  updateEmotion: (
    emotion: EmotionLabel,
    confidences: Record<EmotionLabel, number>,
    faceDetected: boolean,
  ) => void;
  // Speech
  setSpeechListening: (listening: boolean) => void;
  setLatestTranscript: (text: string) => void;
  // Hand
  setHandTrackingActive: (active: boolean) => void;
  updateHandKeypoints: (
    detected: boolean,
    keypoints: Record<string, { x: number; y: number }>,
  ) => void;
  // Text classification persistence
  setSerializedTextExamples: (data: string | null) => void;
  resetAI: () => void;
}

const EMOTION_ZERO: Record<EmotionLabel, number> = {
  happy: 0,
  sad: 0,
  angry: 0,
  disgusted: 0,
  fearful: 0,
  surprised: 0,
  neutral: 0,
};

const INITIAL_STATE = {
  isModelLoaded: false,
  isWebcamActive: false,
  isPredicting: false,
  classLabels: [] as string[],
  exampleCounts: {} as Record<string, number>,
  currentPrediction: null as string | null,
  confidences: {} as Record<string, number>,
  isEmotionActive: false,
  currentEmotion: null as EmotionLabel | null,
  emotionConfidences: { ...EMOTION_ZERO },
  faceDetected: false,
  isSpeechListening: false,
  latestTranscript: '',
  isHandTrackingActive: false,
  handDetected: false,
  handKeypoints: {} as Record<string, { x: number; y: number }>,
  serializedDataset: null as string | null,
  serializedTextExamples: null as string | null,
  savedTab: null as AITrainerTab | null,
  savedAIKind: null as AITrainerTab | null,
  savedImageClasses: null as string[] | null,
  savedAudioClasses: null as string[] | null,
  savedPoseClasses: null as string[] | null,
  savedThumbnails: null as Record<string, string[]> | null,
  savedTextData: null as { classes: { name: string; sentences: string[] }[] } | null,
  audioModelLoaded: false,
  poseModelLoaded: false,
  imageModelLoaded: false,
};

export const useAIStore = create<AIState>()((set) => ({
  ...INITIAL_STATE,

  setModelLoaded: (loaded) => set({ isModelLoaded: loaded }),
  setWebcamActive: (active) => set({ isWebcamActive: active }),
  setPredicting: (predicting) => set({ isPredicting: predicting }),

  updatePrediction: (label, confidences) => set({ currentPrediction: label, confidences }),
  clearPrediction: () => set({ currentPrediction: null, confidences: {} }),

  updateTrainingState: (labels, counts) => set({ classLabels: labels, exampleCounts: counts }),
  setSerializedDataset: (data) => set({ serializedDataset: data }),

  // Explicit `null` clears a field. `undefined` means "leave unchanged".
  setSavedProjectAI: (data) =>
    set((prev) => {
      const imageClasses =
        data.imageClasses !== undefined
          ? data.imageClasses
          : data.classes !== undefined
            ? data.classes
            : undefined;
      return {
        savedTab: data.tab !== undefined ? data.tab : prev.savedTab,
        savedAIKind: data.kind !== undefined ? data.kind : prev.savedAIKind,
        savedImageClasses: imageClasses !== undefined ? imageClasses : prev.savedImageClasses,
        savedAudioClasses:
          data.audioClasses !== undefined ? data.audioClasses : prev.savedAudioClasses,
        savedPoseClasses: data.poseClasses !== undefined ? data.poseClasses : prev.savedPoseClasses,
        savedThumbnails: data.thumbnails !== undefined ? data.thumbnails : prev.savedThumbnails,
        savedTextData: data.textData !== undefined ? data.textData : prev.savedTextData,
      };
    }),
  setAudioModelLoaded: (loaded) => set({ audioModelLoaded: loaded }),
  setPoseModelLoaded: (loaded) => set({ poseModelLoaded: loaded }),
  setImageModelLoaded: (loaded) => set({ imageModelLoaded: loaded }),

  setEmotionActive: (active) => set({ isEmotionActive: active }),
  updateEmotion: (emotion, confidences, faceDetected) =>
    set({ currentEmotion: emotion, emotionConfidences: confidences, faceDetected }),

  setSpeechListening: (listening) => set({ isSpeechListening: listening }),
  setLatestTranscript: (text) => set({ latestTranscript: text }),

  setHandTrackingActive: (active) => set({ isHandTrackingActive: active }),
  updateHandKeypoints: (detected, keypoints) =>
    set({ handDetected: detected, handKeypoints: keypoints }),

  setSerializedTextExamples: (data) => set({ serializedTextExamples: data }),

  resetAI: () => set({ ...INITIAL_STATE }),
}));

/**
 * Class names for the camera blocks ("if AI sees [class]"): the Image model's,
 * or — when the project was trained on the Pose tab instead — the Pose
 * model's. aiEngine predicts with the same model (see usesPoseClassifier).
 */
export function visionClassNames(): string[] {
  const s = useAIStore.getState();
  const image = s.classLabels.filter((l) => !l.startsWith('text:') && l.trim() !== '');
  if (image.length > 0) return image;
  // Only a trained Pose model: the tab fills in default names before that.
  if (!s.poseModelLoaded) return [];
  return (s.savedPoseClasses ?? []).filter((l) => l.trim() !== '');
}

/**
 * Class names for "if I hear [word]" when the project has a trained Audio
 * model (aiEngine.startAudioListening then listens with it); [] otherwise,
 * and the block offers its built-in words.
 */
export function audioClassNames(): string[] {
  const s = useAIStore.getState();
  if (!s.audioModelLoaded) return [];
  return (s.savedAudioClasses ?? []).filter((l) => l.trim() !== '');
}
