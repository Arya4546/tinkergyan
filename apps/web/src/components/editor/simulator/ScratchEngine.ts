import { useSimulatorStore } from '../../../stores/simulator.store';

/**
 * Scratch API interface exposed to the dynamically executed JavaScript.
 */
export interface ScratchAPI {
  onGreenFlag: (callback: () => Promise<void>) => void;
  move: (steps: number) => Promise<void>;
  turn: (degrees: number) => Promise<void>;
  goTo: (x: number, y: number) => Promise<void>;
  sayFor: (text: string, secs: number) => Promise<void>;
  show: () => Promise<void>;
  hide: () => Promise<void>;
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

export class ScratchEngine {
  private abortController: AbortController | null = null;
  private greenFlagCallbacks: Array<() => Promise<void>> = [];

  /**
   * Evaluates the JavaScript generated from Blockly and registers events.
   */
  public loadCode(code: string) {
    this.greenFlagCallbacks = [];

    const getTargetSprite = () => {
      const store = useSimulatorStore.getState();
      const targetId = store.activeSpriteId || store.sprites[0]?.id;
      return store.sprites.find((s) => s.id === targetId);
    };

    // The API object exposed to the blocks
    const api: ScratchAPI = {
      onGreenFlag: (callback) => {
        this.greenFlagCallbacks.push(callback);
      },

      move: async (steps) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;

        // Scratch direction: 90 is right, 0 is up.
        // Math.cos/sin use radians, where 0 is right.
        // So we subtract 90 degrees to align Scratch 0 (up) with Math -90 (up)
        const radians = (sprite.direction - 90) * (Math.PI / 180);
        const dx = Math.round(steps * Math.cos(radians));
        // Scratch Y is positive UP. Our canvas Y is also positive UP (handled in render).
        // Wait, standard Math Cartesian Y is positive down usually on screens,
        // but Scratch Y is positive UP.
        // If direction is 0 (UP), cos(-90)=0, sin(-90)=-1.
        // So dy = steps * (-1) = -steps.
        // But we want Y to INCREASE when going up.
        // So we invert dy.
        const dy = Math.round(steps * Math.sin(radians));

        const newX = Math.max(-240, Math.min(240, sprite.x + dx));
        const newY = Math.max(-180, Math.min(180, sprite.y - dy)); // Subtract dy because sin(-90) is negative but we want positive Y

        store.updateSprite(sprite.id, { x: newX, y: newY });

        // Small yield to let UI render if inside a loop
        await wait(10, this.abortController?.signal);
      },

      turn: async (degrees) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;

        const newDir = (sprite.direction + degrees) % 360;
        store.updateSprite(sprite.id, { direction: newDir });
        await wait(10, this.abortController?.signal);
      },

      goTo: async (x, y) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;
        store.updateSprite(sprite.id, { x, y });
        await wait(10, this.abortController?.signal);
      },

      sayFor: async (text, secs) => {
        const store = useSimulatorStore.getState();
        const sprite = getTargetSprite();
        if (!sprite) return;

        store.setSpriteSpeech(sprite.id, String(text));

        try {
          await wait(secs * 1000, this.abortController?.signal);
        } catch {
          // If aborted, still clear speech bubble
        }

        store.setSpriteSpeech(sprite.id, undefined);
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
    };

    try {
      // Evaluate the code using a Function constructor
      // The code should just register callbacks via api.onGreenFlag
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

    // Run all green flag scripts concurrently
    const promises = this.greenFlagCallbacks.map((cb) =>
      cb().catch((e) => {
        if (e instanceof Error && e.message !== 'Aborted') console.error('Script Error:', e);
      }),
    );

    await Promise.all(promises);
  }

  /**
   * Stops all currently running scripts.
   */
  public stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const scratchEngine = new ScratchEngine();
