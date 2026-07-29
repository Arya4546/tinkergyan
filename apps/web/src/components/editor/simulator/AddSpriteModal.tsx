import React from 'react';
import { X, User } from 'lucide-react';
import { useSimulatorStore, type SpriteType } from '../../../stores/simulator.store';

interface PresetSprite {
  name: string;
  type: SpriteType;
  icon: React.ReactNode;
  desc: string;
  image?: string;
}

/**
 * Sprites offered by "Choose a Sprite".
 *
 * These must be sprites, not costumes. This list used to contain a single entry
 * — "Stemmantra Logo", /sprites/scratch_games.svg — which is *costume 0 of the
 * default Stemmantra sprite*. Picking it added a second sprite that was really
 * another view of the one already on stage, and because new sprites also spawned
 * at 0,0 it landed directly on top of the original. That is the "both appear at
 * once" report: not two sprites too many, but one sprite offered twice and
 * stacked on itself. To change how the existing sprite looks, switch its costume
 * — that is what costumes are for.
 */
const PRESETS: PresetSprite[] = [
  {
    name: 'Cat',
    type: 'character',
    icon: <User size={24} className="text-indigo-500" />,
    desc: 'The classic Scratch cat',
    image: '/sprites/cat.png',
  },
  {
    name: 'Stemmantra',
    type: 'character',
    icon: <User size={24} className="text-indigo-500" />,
    desc: 'Robot mascot',
    image: '/sprites/svg.svg',
  },
];

/**
 * A spot on the stage that isn't already occupied.
 *
 * Scratch drops new sprites at a random position rather than dead centre, so two
 * sprites never hide each other. We do the same, then take the best of a handful
 * of candidates by distance to the nearest existing sprite — cheap, and it
 * guarantees the new sprite is visibly separate rather than merely usually so.
 */
function findFreeSpot(taken: { x: number; y: number }[]): { x: number; y: number } {
  // Stage is 480x360 with 0,0 at centre. Inset so sprites never straddle an edge.
  const RX = 170;
  const RY = 120;
  let best = { x: 0, y: 0 };
  let bestDist = -1;
  for (let i = 0; i < 12; i++) {
    const cand = {
      x: Math.round((Math.random() * 2 - 1) * RX),
      y: Math.round((Math.random() * 2 - 1) * RY),
    };
    const dist = taken.length
      ? Math.min(...taken.map((t) => Math.hypot(t.x - cand.x, t.y - cand.y)))
      : Infinity;
    if (dist > bestDist) {
      bestDist = dist;
      best = cand;
    }
    if (dist > 110) break; // comfortably clear — no need to keep looking
  }
  return best;
}

export function AddSpriteModal({ onClose }: { onClose: () => void }) {
  const addSprite = useSimulatorStore((s) => s.addSprite);
  const sprites = useSimulatorStore((s) => s.sprites);

  const handleSelect = (preset: PresetSprite) => {
    const { x, y } = findFreeSpot(sprites.map((s) => ({ x: s.x, y: s.y })));
    addSprite({
      name: preset.name,
      type: preset.type,
      ...(preset.image ? { image: preset.image } : {}),
      x,
      y,
      size: 100,
      direction: 90,
      visible: true,
      costumes: preset.image ? [preset.image] : [],
      costumeIndex: 0,
      rotationStyle: 'all around',
      effects: { color: 0, ghost: 0, brightness: 0 },
      state: {},
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-2xl w-full max-w-lg shadow-2xl animate-pop overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-dark-bg shrink-0">
          <h2 className="font-sans font-bold text-base text-slate-800 dark:text-white">
            Choose a Sprite
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleSelect(preset)}
                className="text-left p-4 rounded-xl border border-slate-100 dark:border-dark-border bg-white dark:bg-dark-bg hover:border-primary-500 hover:shadow-md transition-all group flex flex-col gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-ed-raised flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                  {preset.image ? (
                    <img
                      src={preset.image}
                      alt={preset.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    preset.icon
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                    {preset.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{preset.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
