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

const PRESETS: PresetSprite[] = [
  {
    name: 'Stemmantra Logo',
    type: 'character',
    icon: <User size={24} className="text-indigo-500" />,
    desc: 'Default Logo Sprite',
    image: '/sprites/scratch_games.svg',
  },
];

export function AddSpriteModal({ onClose }: { onClose: () => void }) {
  const addSprite = useSimulatorStore((s) => s.addSprite);

  const handleSelect = (preset: PresetSprite) => {
    addSprite({
      name: preset.name,
      type: preset.type,
      ...(preset.image ? { image: preset.image } : {}),
      x: 0, // Center of stage (Scratch coordinate system: 0,0 = center)
      y: 0,
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
