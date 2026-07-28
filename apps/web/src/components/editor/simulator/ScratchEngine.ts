import {
  useSimulatorStore,
  BACKDROP_OPTIONS,
  type RotationStyle,
} from '../../../stores/simulator.store';

/** Normalizes a browser KeyboardEvent.key into the tokens used by our "key pressed" blocks. */
export function normalizeKeyName(key: string): string {
  const map: Record<string, string> = {
    ' ': 'space',
    ArrowUp: 'up arrow',
    ArrowDown: 'down arrow',
    ArrowLeft: 'left arrow',
    ArrowRight: 'right arrow',
    Enter: 'enter',
  };
  return map[key] ?? key.toLowerCase();
}

// Simple synthesized tone presets — we don't ship licensed audio assets,
// so "sounds" are short Web Audio oscillator envelopes identified by name.
const TONE_PRESETS: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
  pop: { freq: 880, duration: 0.12, type: 'sine' },
  beep: { freq: 440, duration: 0.2, type: 'square' },
  ding: { freq: 1320, duration: 0.35, type: 'triangle' },
  boop: { freq: 220, duration: 0.25, type: 'sawtooth' },
};
export const SOUND_NAMES = Object.keys(TONE_PRESETS);

/**
 * Scratch API interface exposed to the dynamically executed JavaScript.
 */
export interface ScratchAPI {
  onGreenFlag: (callback: () => Promise<void>) => void;
  onKeyPressed: (key: string, callback: () => Promise<void>) => void;
  onSpriteClicked: (callback: () => Promise<void>) => void;
  onReceive: (message: string, callback: () => Promise<void>) => void;
  broadcast: (message: string) => Promise<void>;
  broadcastAndWait: (message: string) => Promise<void>;

  // Motion
  move: (steps: number) => Promise<void>;
  turn: (degrees: number) => Promise<void>;
  goTo: (x: number, y: number) => Promise<void>;
  glideTo: (secs: number, x: number, y: number) => Promise<void>;
  pointInDirection: (degrees: number) => Promise<void>;
  pointTowardsMouse: () => Promise<void>;
  changeXBy: (dx: number) => Promise<void>;
  setX: (x: number) => Promise<void>;
  changeYBy: (dy: number) => Promise<void>;
  setY: (y: number) => Promise<void>;
  ifOnEdgeBounce: () => Promise<void>;
  setRotationStyle: (style: RotationStyle) => Promise<void>;
  getX: () => number;
  getY: () => number;
  getDirection: () => number;

  // Looks
  sayFor: (text: string, secs: number) => Promise<void>;
  say: (text: string) => Promise<void>;
  thinkFor: (text: string, secs: number) => Promise<void>;
  think: (text: string) => Promise<void>;
  show: () => Promise<void>;
  hide: () => Promise<void>;
  switchCostume: (costume: string) => Promise<void>;
  nextCostume: () => Promise<void>;
  switchBackdropTo: (name: string) => Promise<void>;
  nextBackdrop: () => Promise<void>;
  changeSizeBy: (delta: number) => Promise<void>;
  setSizeTo: (pct: number) => Promise<void>;
  changeEffectBy: (effect: 'color' | 'ghost' | 'brightness', delta: number) => Promise<void>;
  setEffectTo: (effect: 'color' | 'ghost' | 'brightness', value: number) => Promise<void>;
  clearGraphicEffects: () => Promise<void>;
  goToLayer: (layer: 'front' | 'back') => Promise<void>;
  changeLayers: (delta: number) => Promise<void>;
  getCostumeNumber: () => number;
  getSize: () => number;

  // Sound
  playSoundUntilDone: (name: string) => Promise<void>;
  startSound: (name: string) => Promise<void>;
  stopAllSounds: () => Promise<void>;
  changeVolumeBy: (delta: number) => Promise<void>;
  setVolumeTo: (pct: number) => Promise<void>;
  getVolume: () => number;

  // Control
  wait: (secs: number) => Promise<void>;
  yield: () => Promise<void>;
  stopAll: () => Promise<void>;

  // Sensing
  isKeyPressed: (key: string) => boolean;
  isMouseDown: () => boolean;
  getMouseX: () => number;
  getMouseY: () => number;
  getTimer: () => number;
  resetTimer: () => void;
  isTouchingEdge: () => boolean;
  askAndWait: (prompt: string) => Promise<void>;
  getAnswer: () => string;
}

const wait = (ms: number, signal?: AbortSignal) => {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Aborted'));
    const timeout = setTimeout(() => resolve(), ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    });
  });
};

// Stage bounds match classic Scratch's fixed 480×360 stage (our camera-pan
// feature is a local extension, not part of Scratch, so edge/bounce/touching
// logic intentionally ignores camera offset for fidelity with real Scratch).
const STAGE_HALF_WIDTH = 240;
const STAGE_HALF_HEIGHT = 180;

export class ScratchEngine {
  private abortController: AbortController | null = null;
  private greenFlagCallbacks: Array<() => Promise<void>> = [];
  private keyPressedCallbacks: Array<{ key: string; cb: () => Promise<void> }> = [];
  private spriteClickedCallbacks: Array<() => Promise<void>> = [];
  private receiveCallbacks: Map<string, Array<() => Promise<void>>> = new Map();
  private audioCtx: AudioContext | null = null;
  private activeAudioNodes: Set<OscillatorNode> = new Set();

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Evaluates the JavaScript generated from Blockly and registers events.
   */
  public loadCode(code: string) {
    this.greenFlagCallbacks = [];
    this.keyPressedCallbacks = [];
    this.spriteClickedCallbacks = [];
    this.receiveCallbacks = new Map();

    const getTargetSprite = () => {
      const store = useSimulatorStore.getState();
      const targetId = store.activeSpriteId || store.sprites[0]?.id;
      return store.sprites.find((s) => s.id === targetId);
    };

    const halfSizeOf = (size: number, type: string) =>
      ((type === 'character' ? 100 : 64) * (size / 100)) / 2;

    const updatePositionWithCamera = (
      spriteId: string,
      proposedX: number,
      proposedY: number,
      size: number,
      type: string,
    ) => {
      const store = useSimulatorStore.getState();
      const halfSize = halfSizeOf(size, type);

      let currentCameraX = store.cameraX;
      let currentCameraY = store.cameraY;

      // If the proposed position goes outside the visible viewport, pan the camera!
      if (proposedX + halfSize > 240 + currentCameraX) {
        currentCameraX = proposedX + halfSize - 240;
      } else if (proposedX - halfSize < -240 + currentCameraX) {
        currentCameraX = proposedX - halfSize + 240;
      }

      if (proposedY + halfSize > 180 + currentCameraY) {
        currentCameraY = proposedY + halfSize - 180;
      } else if (proposedY - halfSize < -180 + currentCameraY) {
        currentCameraY = proposedY - halfSize + 180;
      }

      // Update camera in store if it has changed
      if (currentCameraX !== store.cameraX || currentCameraY !== store.cameraY) {
        store.setCamera(currentCameraX, currentCameraY);
      }

      // Clamp the sprite to the active camera boundaries
      const finalX = Math.max(
        -240 + currentCameraX + halfSize,
        Math.min(240 + currentCameraX - halfSize, proposedX),
      );
      const finalY = Math.max(
        -180 + currentCameraY + halfSize,
        Math.min(180 + currentCameraY - halfSize, proposedY),
      );

      store.updateSprite(spriteId, { x: finalX, y: finalY });
    };

    const playTone = (name: string, volumePct: number, waitForEnd: boolean) => {
      const preset = TONE_PRESETS[name] ?? TONE_PRESETS.pop!;
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = preset.type;
      osc.frequency.value = preset.freq;
      gain.gain.value = Math.max(0, Math.min(1, volumePct / 100)) * 0.2;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.activeAudioNodes.add(osc);
      osc.stop(ctx.currentTime + preset.duration);
      const done = new Promise<void>((resolve) => {
        osc.onended = () => {
          this.activeAudioNodes.delete(osc);
          resolve();
        };
      });
      return waitForEnd ? done : Promise.resolve();
    };

    // The API object exposed to the blocks
    const api: ScratchAPI = {
      onGreenFlag: (callback) => {
        this.greenFlagCallbacks.push(callback);
      },
      onKeyPressed: (key, callback) => {
        this.keyPressedCallbacks.push({ key, cb: callback });
      },
      onSpriteClicked: (callback) => {
        this.spriteClickedCallbacks.push(callback);
      },
      onReceive: (message, callback) => {
        const list = this.receiveCallbacks.get(message) ?? [];
        list.push(callback);
        this.receiveCallbacks.set(message, list);
      },
      broadcast: (message) => {
        const callbacks = this.receiveCallbacks.get(message) ?? [];
        void Promise.all(callbacks.map((cb) => cb())).catch((e) => {
          if (e instanceof Error && e.message !== 'Aborted') console.error('Script Error:', e);
        });
        return Promise.resolve();
      },
      broadcastAndWait: async (message) => {
        const callbacks = this.receiveCallbacks.get(message) ?? [];
        await Promise.all(callbacks.map((cb) => cb()));
      },

      // ── Motion ──────────────────────────────────────────────────────
      move: async (steps) => {
        const sprite = getTargetSprite();
        if (!sprite) return;

        // Scratch direction: 90 is right, 0 is up. Rotate into standard
        // math convention (0 = right) by subtracting 90 degrees.
        const radians = (sprite.direction - 90) * (Math.PI / 180);
        const dx = Math.round(steps * Math.cos(radians));
        const dy = Math.round(steps * Math.sin(radians));

        const proposedX = sprite.x + dx;
        const proposedY = sprite.y - dy;

        updatePositionWithCamera(sprite.id, proposedX, proposedY, sprite.size, sprite.type);
        await wait(10, this.abortController?.signal);
      },

      turn: async (degrees) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;

        const newDir = (((sprite.direction + degrees) % 360) + 360) % 360;
        store.updateSprite(sprite.id, { direction: newDir });
        await wait(10, this.abortController?.signal);
      },

      goTo: async (x, y) => {
        const sprite = getTargetSprite();
        if (!sprite) return;
        updatePositionWithCamera(sprite.id, x, y, sprite.size, sprite.type);
        await wait(10, this.abortController?.signal);
      },

      glideTo: async (secs, x, y) => {
        const sprite = getTargetSprite();
        if (!sprite) return;
        const startX = sprite.x;
        const startY = sprite.y;
        const durationMs = Math.max(0, secs * 1000);
        const stepMs = 30;
        const steps = Math.max(1, Math.round(durationMs / stepMs));

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const curX = startX + (x - startX) * t;
          const curY = startY + (y - startY) * t;
          updatePositionWithCamera(sprite.id, curX, curY, sprite.size, sprite.type);
          await wait(stepMs, this.abortController?.signal);
        }
      },

      pointInDirection: async (degrees) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;
        store.updateSprite(sprite.id, { direction: ((degrees % 360) + 360) % 360 });
        await wait(10, this.abortController?.signal);
      },

      pointTowardsMouse: async () => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;
        const dx = store.mouseX - sprite.x;
        const dy = store.mouseY - sprite.y;
        const direction = (Math.atan2(dx, dy) * 180) / Math.PI;
        store.updateSprite(sprite.id, { direction: ((direction % 360) + 360) % 360 });
        await wait(10, this.abortController?.signal);
      },

      changeXBy: async (dx) => {
        const sprite = getTargetSprite();
        if (!sprite) return;
        updatePositionWithCamera(sprite.id, sprite.x + dx, sprite.y, sprite.size, sprite.type);
        await wait(10, this.abortController?.signal);
      },

      setX: async (x) => {
        const sprite = getTargetSprite();
        if (!sprite) return;
        updatePositionWithCamera(sprite.id, x, sprite.y, sprite.size, sprite.type);
        await wait(10, this.abortController?.signal);
      },

      changeYBy: async (dy) => {
        const sprite = getTargetSprite();
        if (!sprite) return;
        updatePositionWithCamera(sprite.id, sprite.x, sprite.y + dy, sprite.size, sprite.type);
        await wait(10, this.abortController?.signal);
      },

      setY: async (y) => {
        const sprite = getTargetSprite();
        if (!sprite) return;
        updatePositionWithCamera(sprite.id, sprite.x, y, sprite.size, sprite.type);
        await wait(10, this.abortController?.signal);
      },

      ifOnEdgeBounce: async () => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;
        const halfSize = halfSizeOf(sprite.size, sprite.type);

        let dir = sprite.direction;
        let x = sprite.x;
        let y = sprite.y;
        let bounced = false;

        if (x - halfSize < -STAGE_HALF_WIDTH) {
          x = -STAGE_HALF_WIDTH + halfSize;
          dir = ((-dir % 360) + 360) % 360;
          bounced = true;
        } else if (x + halfSize > STAGE_HALF_WIDTH) {
          x = STAGE_HALF_WIDTH - halfSize;
          dir = ((-dir % 360) + 360) % 360;
          bounced = true;
        }

        if (y - halfSize < -STAGE_HALF_HEIGHT) {
          y = -STAGE_HALF_HEIGHT + halfSize;
          dir = (((180 - dir) % 360) + 360) % 360;
          bounced = true;
        } else if (y + halfSize > STAGE_HALF_HEIGHT) {
          y = STAGE_HALF_HEIGHT - halfSize;
          dir = (((180 - dir) % 360) + 360) % 360;
          bounced = true;
        }

        if (bounced) {
          store.updateSprite(sprite.id, { x, y, direction: dir });
        }
        await wait(10, this.abortController?.signal);
      },

      setRotationStyle: (style) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite) store.updateSprite(sprite.id, { rotationStyle: style });
        return Promise.resolve();
      },

      getX: () => getTargetSprite()?.x ?? 0,
      getY: () => getTargetSprite()?.y ?? 0,
      getDirection: () => getTargetSprite()?.direction ?? 90,

      // ── Looks ───────────────────────────────────────────────────────
      sayFor: async (text, secs) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;

        store.updateSprite(sprite.id, { speech: String(text), speechIsThought: false });
        try {
          await wait(secs * 1000, this.abortController?.signal);
        } catch {
          // If aborted, still clear speech bubble
        }
        store.setSpriteSpeech(sprite.id, undefined);
      },

      say: (text) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite) store.updateSprite(sprite.id, { speech: String(text), speechIsThought: false });
        return Promise.resolve();
      },

      thinkFor: async (text, secs) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;
        store.updateSprite(sprite.id, { speech: String(text), speechIsThought: true });
        try {
          await wait(secs * 1000, this.abortController?.signal);
        } catch {
          // If aborted, still clear speech bubble
        }
        store.setSpriteSpeech(sprite.id, undefined);
      },

      think: (text) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite) store.updateSprite(sprite.id, { speech: String(text), speechIsThought: true });
        return Promise.resolve();
      },

      show: () => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite) {
          store.updateSprite(sprite.id, { visible: true });
        }
        return Promise.resolve();
      },

      hide: () => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite) {
          store.updateSprite(sprite.id, { visible: false });
        }
        return Promise.resolve();
      },

      switchCostume: async (costume) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite) {
          const idx = sprite.costumes.indexOf(costume);
          store.updateSprite(sprite.id, {
            image: costume,
            costumeIndex: idx === -1 ? sprite.costumeIndex : idx,
            costume:
              costume === '/sprites/scratch_games.svg' ? 'Stemmantra (Old)' : 'Stemmantra (New)',
          });
        }
        await wait(10, this.abortController?.signal);
      },

      nextCostume: async () => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite && sprite.costumes.length > 0) {
          const nextIndex = (sprite.costumeIndex + 1) % sprite.costumes.length;
          const nextImage = sprite.costumes[nextIndex];
          if (nextImage !== undefined) {
            store.updateSprite(sprite.id, { costumeIndex: nextIndex, image: nextImage });
          }
        }
        await wait(10, this.abortController?.signal);
      },

      switchBackdropTo: async (name) => {
        useSimulatorStore.getState().setBackdrop(name);
        await wait(10, this.abortController?.signal);
      },

      nextBackdrop: async () => {
        const store = useSimulatorStore.getState();
        const idx = BACKDROP_OPTIONS.indexOf(store.backdrop as (typeof BACKDROP_OPTIONS)[number]);
        const next =
          BACKDROP_OPTIONS[(idx + 1 + BACKDROP_OPTIONS.length) % BACKDROP_OPTIONS.length];
        store.setBackdrop(next ?? BACKDROP_OPTIONS[0]);
        await wait(10, this.abortController?.signal);
      },

      changeSizeBy: async (delta) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;
        store.updateSprite(sprite.id, { size: Math.max(0, sprite.size + delta) });
        await wait(10, this.abortController?.signal);
      },

      setSizeTo: async (pct) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;
        store.updateSprite(sprite.id, { size: Math.max(0, pct) });
        await wait(10, this.abortController?.signal);
      },

      changeEffectBy: async (effect, delta) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;
        store.updateSprite(sprite.id, {
          effects: { ...sprite.effects, [effect]: sprite.effects[effect] + delta },
        });
        await wait(10, this.abortController?.signal);
      },

      setEffectTo: async (effect, value) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;
        store.updateSprite(sprite.id, { effects: { ...sprite.effects, [effect]: value } });
        await wait(10, this.abortController?.signal);
      },

      clearGraphicEffects: async () => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;
        store.updateSprite(sprite.id, { effects: { color: 0, ghost: 0, brightness: 0 } });
        await wait(10, this.abortController?.signal);
      },

      goToLayer: (layer) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite) {
          if (layer === 'front') store.sendToFront(sprite.id);
          else store.sendToBack(sprite.id);
        }
        return Promise.resolve();
      },

      changeLayers: (delta) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite) store.moveLayers(sprite.id, delta);
        return Promise.resolve();
      },

      getCostumeNumber: () => (getTargetSprite()?.costumeIndex ?? 0) + 1,
      getSize: () => getTargetSprite()?.size ?? 100,

      // ── Sound ───────────────────────────────────────────────────────
      playSoundUntilDone: async (name) => {
        const sprite = getTargetSprite();
        const volume = (sprite?.state?.volume as number | undefined) ?? 100;
        await playTone(name, volume, true);
      },

      startSound: async (name) => {
        const sprite = getTargetSprite();
        const volume = (sprite?.state?.volume as number | undefined) ?? 100;
        await playTone(name, volume, false);
      },

      stopAllSounds: () => {
        for (const osc of this.activeAudioNodes) {
          try {
            osc.stop();
          } catch {
            // Already stopped
          }
        }
        this.activeAudioNodes.clear();
        return Promise.resolve();
      },

      changeVolumeBy: (delta) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite) {
          const current = (sprite.state?.volume as number | undefined) ?? 100;
          const next = Math.max(0, Math.min(100, current + delta));
          store.updateSprite(sprite.id, { state: { ...sprite.state, volume: next } });
        }
        return Promise.resolve();
      },

      setVolumeTo: (pct) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (sprite) {
          store.updateSprite(sprite.id, {
            state: { ...sprite.state, volume: Math.max(0, Math.min(100, pct)) },
          });
        }
        return Promise.resolve();
      },

      getVolume: () => (getTargetSprite()?.state?.volume as number | undefined) ?? 100,

      // ── Control ─────────────────────────────────────────────────────
      wait: async (secs) => {
        await wait(Math.max(0, secs * 1000), this.abortController?.signal);
      },

      yield: async () => {
        await wait(1, this.abortController?.signal);
      },

      stopAll: () => {
        this.stop();
        // Reject so the calling script's promise chain unwinds too.
        return Promise.reject(new Error('Aborted'));
      },

      // ── Sensing ─────────────────────────────────────────────────────
      isKeyPressed: (key) => {
        const store = useSimulatorStore.getState();
        return Boolean(store.keysDown[key]);
      },
      isMouseDown: () => useSimulatorStore.getState().mouseDown,
      getMouseX: () => useSimulatorStore.getState().mouseX,
      getMouseY: () => useSimulatorStore.getState().mouseY,
      getTimer: () => (Date.now() - useSimulatorStore.getState().timerStartedAt) / 1000,
      resetTimer: () => {
        useSimulatorStore.getState().resetTimer();
      },
      isTouchingEdge: () => {
        const sprite = getTargetSprite();
        if (!sprite) return false;
        const halfSize = halfSizeOf(sprite.size, sprite.type);
        return (
          sprite.x - halfSize <= -STAGE_HALF_WIDTH ||
          sprite.x + halfSize >= STAGE_HALF_WIDTH ||
          sprite.y - halfSize <= -STAGE_HALF_HEIGHT ||
          sprite.y + halfSize >= STAGE_HALF_HEIGHT
        );
      },
      askAndWait: async (prompt) => {
        const store = useSimulatorStore.getState();
        const signal = this.abortController?.signal;
        await new Promise<void>((resolve, reject) => {
          if (signal?.aborted) return reject(new Error('Aborted'));
          store
            .askQuestion(prompt)
            .then(() => resolve())
            .catch(() => reject(new Error('Aborted')));
          signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        });
      },
      getAnswer: () => useSimulatorStore.getState().answer,
    };

    try {
      // Evaluate the code using a Function constructor
      // The code should just register callbacks via api.onGreenFlag / api.onKeyPressed / etc.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const evaluate = new Function('api', code);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      evaluate(api);
    } catch (e) {
      console.error('Failed to parse Scratch code:', e);
    }
  }

  /**
   * Triggers the Green Flag event, running all registered scripts concurrently.
   */
  public async triggerGreenFlag() {
    this.stop();
    this.abortController = new AbortController();
    useSimulatorStore.getState().resetTimer();

    // Run all green flag scripts concurrently
    const promises = this.greenFlagCallbacks.map((cb) =>
      cb().catch((e) => {
        if (e instanceof Error && e.message !== 'Aborted') console.error('Script Error:', e);
      }),
    );

    await Promise.all(promises);
  }

  /** Called by the stage's global keydown listener to fire "when key pressed" hats. */
  public notifyKeyPressed(key: string) {
    if (!this.abortController) return;
    for (const { key: watchKey, cb } of this.keyPressedCallbacks) {
      if (watchKey === 'any' || watchKey === key) {
        void cb().catch((e) => {
          if (e instanceof Error && e.message !== 'Aborted') console.error('Script Error:', e);
        });
      }
    }
  }

  /** Called by the stage when a sprite is clicked (not dragged) to fire "when this sprite clicked" hats. */
  public notifySpriteClicked() {
    if (!this.abortController) return;
    for (const cb of this.spriteClickedCallbacks) {
      void cb().catch((e) => {
        if (e instanceof Error && e.message !== 'Aborted') console.error('Script Error:', e);
      });
    }
  }

  /**
   * Stops all currently running scripts.
   */
  public stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    for (const osc of this.activeAudioNodes) {
      try {
        osc.stop();
      } catch {
        // Already stopped
      }
    }
    this.activeAudioNodes.clear();

    // An "ask and wait" prompt has no other way to dismiss itself — without this,
    // stopping a script mid-ask leaves the question bar stuck open on the stage.
    const store = useSimulatorStore.getState();
    if (store.askPrompt !== null) {
      store.submitAnswer('');
    }
  }
}

export const scratchEngine = new ScratchEngine();
