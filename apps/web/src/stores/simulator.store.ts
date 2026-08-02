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
  speechIsThought?: boolean; // true = "think" bubble, false/undefined = "say" bubble
  pin?: string; // e.g. "13", "A0"
  costume?: string; // Current costume name
  costumes: string[]; // Costume image paths this sprite can cycle through
  costumeIndex: number;
  rotationStyle: RotationStyle;
  effects: SpriteEffects;
  state: SpriteState;
}

export type StageViewMode = 'small' | 'large' | 'fullscreen';
export type RotationStyle = 'all around' | 'left-right' | "don't rotate";

export interface SpriteEffects {
  color: number;
  ghost: number;
  brightness: number;
}

/** Cyclable backdrop names, shared between the backdrop panel UI and Scratch "switch/next backdrop" blocks. */
export const BACKDROP_OPTIONS = ['white', 'grid', 'breadboard', 'space'] as const;

interface SimulatorStore {
  sprites: SimulatorSprite[];
  activeSpriteId: string | null;
  backdrop: string; // e.g. "grid", "breadboard", "space"
  backdropCount: number;
  isRunning: boolean;
  greenFlagCount: number;
  stageViewMode: StageViewMode;
  cameraX: number;
  cameraY: number;

  // Sensing state
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  keysDown: Record<string, boolean>;
  timerStartedAt: number;
  answer: string;
  askPrompt: string | null;
  /**
   * Live variable values, shown as monitors on the stage.
   *
   * Scratch displays every variable on the stage by default, and that readout
   * is how a beginner sees their program do anything at all. Without it a
   * script like "when flag clicked / set score to 0" runs perfectly and appears
   * to do nothing — which is exactly what was reported.
   */
  variables: Record<string, string | number>;
  pendingAskResolve: ((text: string) => void) | null;

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
  /** Record a variable's current value so its stage monitor updates. */
  setVariable: (name: string, value: string | number) => void;
  resetSimulator: () => void;
  setCamera: (x: number, y: number) => void;
  sendToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveLayers: (id: string, delta: number) => void;

  // Sensing actions
  setMouse: (x: number, y: number) => void;
  setMouseDown: (down: boolean) => void;
  setKeyDown: (key: string, down: boolean) => void;
  resetTimer: () => void;
  askQuestion: (prompt: string) => Promise<string>;
  submitAnswer: (text: string) => void;
}

// Generate a random ID for new sprites
const generateId = () => Math.random().toString(36).substring(2, 9);

// The default Stemmantra sprite
const defaultCatSprite: SimulatorSprite = {
  id: generateId(),
  name: 'Stemmantra',
  type: 'character',
  image: '/sprites/svg.svg',
  costume: 'Stemmantra (New)',
  costumes: ['/sprites/scratch_games.svg', '/sprites/svg.svg'],
  costumeIndex: 1,
  rotationStyle: 'all around',
  effects: { color: 0, ghost: 0, brightness: 0 },
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
      cameraX: 0,
      cameraY: 0,
      mouseX: 0,
      mouseY: 0,
      mouseDown: false,
      keysDown: {},
      timerStartedAt: Date.now(),
      answer: '',
      askPrompt: null,
      variables: {},
      pendingAskResolve: null,

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

      setVariable: (name, value) => {
        set((state) => ({ variables: { ...state.variables, [name]: value } }));
      },

      stopSimulation: () => {
        set({ isRunning: false, cameraX: 0, cameraY: 0 });
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
          cameraX: 0,
          cameraY: 0,
          mouseX: 0,
          mouseY: 0,
          mouseDown: false,
          keysDown: {},
          timerStartedAt: Date.now(),
          answer: '',
          askPrompt: null,
          pendingAskResolve: null,
          variables: {},
        });
      },

      setCamera: (x, y) => {
        set({ cameraX: x, cameraY: y });
      },

      sendToFront: (id) => {
        set((state) => {
          const sprite = state.sprites.find((s) => s.id === id);
          if (!sprite) return state;
          return { sprites: [...state.sprites.filter((s) => s.id !== id), sprite] };
        });
      },

      sendToBack: (id) => {
        set((state) => {
          const sprite = state.sprites.find((s) => s.id === id);
          if (!sprite) return state;
          return { sprites: [sprite, ...state.sprites.filter((s) => s.id !== id)] };
        });
      },

      moveLayers: (id, delta) => {
        set((state) => {
          const idx = state.sprites.findIndex((s) => s.id === id);
          if (idx === -1) return state;
          const newIdx = Math.max(0, Math.min(state.sprites.length - 1, idx + delta));
          if (newIdx === idx) return state;
          const next = [...state.sprites];
          const [sprite] = next.splice(idx, 1);
          next.splice(newIdx, 0, sprite!);
          return { sprites: next };
        });
      },

      setMouse: (x, y) => {
        set({ mouseX: x, mouseY: y });
      },

      setMouseDown: (down) => {
        set({ mouseDown: down });
      },

      setKeyDown: (key, down) => {
        set((state) => ({ keysDown: { ...state.keysDown, [key]: down } }));
      },

      resetTimer: () => {
        set({ timerStartedAt: Date.now() });
      },

      askQuestion: (prompt) => {
        return new Promise<string>((resolve) => {
          set({ askPrompt: prompt, pendingAskResolve: resolve });
        });
      },

      submitAnswer: (text) => {
        set((state) => {
          state.pendingAskResolve?.(text);
          return { answer: text, askPrompt: null, pendingAskResolve: null };
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
      // Sprites saved to localStorage before costumes/costumeIndex/rotationStyle/effects
      // existed are missing those fields — backfill defaults so old projects don't crash
      // (e.g. StageCanvas reading sprite.effects.color on an undefined `effects`).
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<SimulatorStore>;
        const sprites: SimulatorSprite[] = (persisted.sprites ?? currentState.sprites).map(
          (rawSprite) => {
            const s = rawSprite as Partial<SimulatorSprite>;
            return {
              costumes: [],
              costumeIndex: 0,
              rotationStyle: 'all around',
              effects: { color: 0, ghost: 0, brightness: 0 },
              ...s,
            } as SimulatorSprite;
          },
        );
        return { ...currentState, ...persisted, sprites };
      },
    },
  ),
);
