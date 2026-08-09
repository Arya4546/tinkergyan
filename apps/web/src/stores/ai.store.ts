/**
 * ai.store.ts
 *
 * Zustand store for all AI Model Studio reactive state.
 * Keeps AI concerns isolated from editor/simulator stores.
 */
import { create } from 'zustand';

interface AIState {
  // ── Status ──────────────────────────────────────────────────────────────
  isModelLoaded: boolean;
  isWebcamActive: boolean;
  isPredicting: boolean;

  // ── Training Data ───────────────────────────────────────────────────────
  classLabels: string[];
  exampleCounts: Record<string, number>;

  // ── Live Prediction ─────────────────────────────────────────────────────
  currentPrediction: string | null;
  confidences: Record<string, number>;

  // ── Persistence ─────────────────────────────────────────────────────────
  serializedDataset: string | null;

  // ── Actions ─────────────────────────────────────────────────────────────
  setModelLoaded: (loaded: boolean) => void;
  setWebcamActive: (active: boolean) => void;
  setPredicting: (predicting: boolean) => void;
  updatePrediction: (label: string, confidences: Record<string, number>) => void;
  clearPrediction: () => void;
  updateTrainingState: (labels: string[], counts: Record<string, number>) => void;
  setSerializedDataset: (data: string | null) => void;
  resetAI: () => void;
}

const INITIAL_STATE = {
  isModelLoaded: false,
  isWebcamActive: false,
  isPredicting: false,
  classLabels: [] as string[],
  exampleCounts: {} as Record<string, number>,
  currentPrediction: null as string | null,
  confidences: {} as Record<string, number>,
  serializedDataset: null as string | null,
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

  resetAI: () => set({ ...INITIAL_STATE }),
}));
