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
  pin?: string; // e.g. "13", "A0"
  state: SpriteState;
}

interface SimulatorStore {
  sprites: SimulatorSprite[];
  activeSpriteId: string | null;
  backdrop: string; // e.g. "grid", "breadboard", "space"
  isRunning: boolean;

  // Actions
  addSprite: (sprite: Omit<SimulatorSprite, 'id'> & { id?: string }) => void;
  updateSprite: (id: string, updates: Partial<SimulatorSprite>) => void;
  removeSprite: (id: string) => void;
  setActiveSprite: (id: string | null) => void;
  setBackdrop: (backdrop: string) => void;
  toggleSimulation: () => void;
  stopSimulation: () => void;
  resetSimulator: () => void;
}

// Generate a random ID for new sprites
const generateId = () => Math.random().toString(36).substring(2, 9);

export const useSimulatorStore = create<SimulatorStore>()(
  persist(
    (set) => ({
      sprites: [],
      activeSpriteId: null,
      backdrop: 'grid',
      isRunning: false,

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

      removeSprite: (id) => {
        set((state) => ({
          sprites: state.sprites.filter((s) => s.id !== id),
          activeSpriteId: state.activeSpriteId === id ? null : state.activeSpriteId,
        }));
      },

      setActiveSprite: (id) => {
        set({ activeSpriteId: id });
      },

      setBackdrop: (backdrop) => {
        set({ backdrop });
      },

      toggleSimulation: () => {
        set((state) => ({ isRunning: !state.isRunning }));
      },

      stopSimulation: () => {
        set({ isRunning: false });
      },

      resetSimulator: () => {
        set({
          sprites: [],
          activeSpriteId: null,
          backdrop: 'grid',
          isRunning: false,
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
      }),
    },
  ),
);
