/**
 * Fully clears AI Studio in-memory state across the shared Zustand store and
 * the three trainer engine singletons. Must run whenever a project is loaded,
 * created, or left — otherwise leftover KNN classes (e.g. "pen" / "earpods")
 * leak into the next project and show as already trained.
 */
import { useAIStore } from '../stores/ai.store';
import { aiEngine } from './ai-engine';
import { audioTrainerEngine } from './audio-trainer-engine';
import { poseTrainerEngine } from './pose-trainer-engine';
import { textAIEngine } from './text-ai-engine';

export function resetAllAIState(): void {
  try {
    aiEngine.stopPredicting();
    aiEngine.stopWebcam();
    aiEngine.stopAudioListening();
    aiEngine.clearSpeechListeners();
  } catch {
    // Engines may not be initialised yet — safe to ignore.
  }
  try {
    audioTrainerEngine.stopPredicting();
    audioTrainerEngine.stopMic();
  } catch {
    // ignore
  }
  try {
    poseTrainerEngine.stopPredicting();
    poseTrainerEngine.stopTracking();
  } catch {
    // ignore
  }

  try {
    if (aiEngine.isInitialised) aiEngine.clearAll();
  } catch {
    // ignore
  }
  try {
    if (audioTrainerEngine.isInitialised) audioTrainerEngine.clearAll();
  } catch {
    // ignore
  }
  try {
    if (poseTrainerEngine.isInitialised) poseTrainerEngine.clearAll();
  } catch {
    // ignore
  }
  try {
    textAIEngine.clearAll();
  } catch {
    // ignore
  }

  useAIStore.getState().resetAI();
}
