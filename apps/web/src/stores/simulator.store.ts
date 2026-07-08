import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SpriteType =
  | 'led'
  | 'button'
  | 'servo'
  | 'potentiometer'
  | 'character'
  | 'board'
  | 'robot_car';

export interface SpriteState {
  on?: boolean;
  pressed?: boolean;
  angle?: number;
  value?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface SimulatorSprite {
  id: string;
  name: string;
  type: SpriteType;
  image?: string; // Optional custom image URL or asset name
  x: number;
  y: number;
  size: number;
  direction: number; // Rotation in degrees (0-360)
  visible: boolean;
  speech?: string; // Optional speech bubble text
  pin?: string; // e.g. "13", "A0"
  costume?: string; // Current costume name
  state: SpriteState;
}

export type StageViewMode = 'small' | 'large' | 'fullscreen';

interface SimulatorStore {
  sprites: SimulatorSprite[];
  activeSpriteId: string | null;
  backdrop: string; // e.g. "grid", "breadboard", "space"
  backdropCount: number;
  isRunning: boolean;
  greenFlagCount: number;
  stageViewMode: StageViewMode;

  // Actions
  addSprite: (sprite: Omit<SimulatorSprite, 'id'> & { id?: string }) => void;
  updateSprite: (id: string, updates: Partial<SimulatorSprite>) => void;
  setSpriteSpeech: (id: string, text: string | undefined) => void;
  removeSprite: (id: string) => void;
  setActiveSprite: (id: string | null) => void;
  setBackdrop: (backdrop: string) => void;
  setStageViewMode: (mode: StageViewMode) => void;
  startSimulation: () => void;
  toggleSimulation: () => void;
  stopSimulation: () => void;
  resetSimulator: () => void;
}

// Generate a random ID for new sprites
const generateId = () => Math.random().toString(36).substring(2, 9);

// The default Scratch Cat sprite
const defaultCatSprite: SimulatorSprite = {
  id: generateId(),
  name: 'Sprite1',
  type: 'character',
  image: '/sprites/cat.png',
  x: 0,
  y: 0,
  size: 100,
  direction: 90,
  visible: true,
  state: {},
};

export const useSimulatorStore = create<SimulatorStore>()(
  persist(
    (set) => ({
      sprites: [defaultCatSprite],
      activeSpriteId: defaultCatSprite.id,
      backdrop: 'white',
      backdropCount: 1,
      isRunning: false,
      greenFlagCount: 0,
      stageViewMode: 'large',

      addSprite: (spriteInput) => {
        const id = spriteInput.id || generateId();
        const newSprite: SimulatorSprite = {
          ...spriteInput,
          id,
        };
        set((state) => ({
          sprites: [...state.sprites, newSprite],
          activeSpriteId: id, // Auto-select newly added sprite
        }));
      },

      updateSprite: (id, updates) => {
        set((state) => ({
          sprites: state.sprites.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
      },

      setSpriteSpeech: (id, text) => {
        set((state) => ({
          sprites: state.sprites.map((s) => {
            if (s.id !== id) return s;
            if (text === undefined) {
              const { speech: _speech, ...rest } = s;
              return rest;
            }
            return { ...s, speech: text };
          }),
        }));
      },

      removeSprite: (id) => {
        set((state) => {
          const filtered = state.sprites.filter((s) => s.id !== id);
          let nextActive = state.activeSpriteId;
          if (state.activeSpriteId === id) {
            // Auto-select the next available sprite, or the last one
            const removedIdx = state.sprites.findIndex((s) => s.id === id);
            if (filtered.length > 0) {
              nextActive = filtered[Math.min(removedIdx, filtered.length - 1)]?.id ?? null;
            } else {
              nextActive = null;
            }
          }
          return {
            sprites: filtered,
            activeSpriteId: nextActive,
          };
        });
      },

      setActiveSprite: (id) => {
        set({ activeSpriteId: id });
      },

      setBackdrop: (backdrop) => {
        set({ backdrop });
      },

      setStageViewMode: (mode) => {
        set({ stageViewMode: mode });
      },

      startSimulation: () => {
        set((state) => ({ isRunning: true, greenFlagCount: state.greenFlagCount + 1 }));
      },

      toggleSimulation: () => {
        set((state) => ({ isRunning: !state.isRunning }));
      },

      stopSimulation: () => {
        set({ isRunning: false });
      },

      resetSimulator: () => {
        const newCat = { ...defaultCatSprite, id: generateId() };
        set({
          sprites: [newCat],
          activeSpriteId: newCat.id,
          backdrop: 'white',
          backdropCount: 1,
          isRunning: false,
          stageViewMode: 'large',
        });
      },
    }),
    {
      name: 'tinkergyan-simulator-store',
      // We don't persist isRunning state
      partialize: (state) => ({
        sprites: state.sprites,
        activeSpriteId: state.activeSpriteId,
        backdrop: state.backdrop,
        backdropCount: state.backdropCount,
        stageViewMode: state.stageViewMode,
      }),
    },
  ),
);
