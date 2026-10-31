/**
 * ai.store.ts
 *
 * Zustand store for all AI Model Studio reactive state.
 * Keeps AI concerns isolated from editor/simulator stores.
 */
import { create } from 'zustand';
import type { EmotionLabel } from '../lib/emotion-engine';

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
  savedTab: 'image' | 'text' | 'audio' | 'pose' | 'numbers' | null;
  savedClasses: string[] | null;
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
    tab?: 'image' | 'text' | 'audio' | 'pose' | 'numbers' | null | undefined;
    classes?: string[] | null | undefined;
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
  savedTab: null as 'image' | 'text' | 'audio' | 'pose' | 'numbers' | null,
  savedClasses: null as string[] | null,
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
  setSavedProjectAI: (data) =>
    set((prev) => ({
      savedTab: data.tab !== undefined ? data.tab : prev.savedTab,
      savedClasses: data.classes !== undefined ? data.classes : prev.savedClasses,
      savedThumbnails: data.thumbnails !== undefined ? data.thumbnails : prev.savedThumbnails,
      savedTextData: data.textData !== undefined ? data.textData : prev.savedTextData,
    })),
  setAudioModelLoaded: (loaded) => set({ audioModelLoaded: loaded }),
  setPoseModelLoaded: (loaded) => set({ poseModelLoaded: loaded }),
  setImageModelLoaded: (loaded) => set({ imageModelLoaded: loaded }),

  // Emotion
  setEmotionActive: (active) => set({ isEmotionActive: active }),
  updateEmotion: (emotion, confidences, faceDetected) =>
    set({ currentEmotion: emotion, emotionConfidences: confidences, faceDetected }),

  // Speech
  setSpeechListening: (listening) => set({ isSpeechListening: listening }),
  setLatestTranscript: (text) => set({ latestTranscript: text }),

  // Hand
  setHandTrackingActive: (active) => set({ isHandTrackingActive: active }),
  updateHandKeypoints: (detected, keypoints) =>
    set({ handDetected: detected, handKeypoints: keypoints }),

  // Text classification
  setSerializedTextExamples: (data) => set({ serializedTextExamples: data }),

  resetAI: () => set({ ...INITIAL_STATE }),
}));
