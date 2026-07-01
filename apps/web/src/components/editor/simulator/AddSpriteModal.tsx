import React from 'react';
import { X, Cpu, Zap, CircleDot, User, Activity, Bot } from 'lucide-react';
import { useSimulatorStore, type SpriteType } from '../../../stores/simulator.store';

interface PresetSprite {
  name: string;
  type: SpriteType;
  icon: React.ReactNode;
  desc: string;
}

const PRESETS: PresetSprite[] = [
  {
    name: 'Red LED',
    type: 'led',
    icon: <Zap size={24} className="text-red-500" />,
    desc: 'Digital Output: Glows when HIGH',
  },
  {
    name: 'Push Button',
    type: 'button',
    icon: <CircleDot size={24} className="text-blue-500" />,
    desc: 'Digital Input: Press to read HIGH',
  },
  {
    name: 'Servo Motor',
    type: 'servo',
    icon: <Activity size={24} className="text-amber-500" />,
    desc: 'PWM Output: Rotates 0-180°',
  },
  {
    name: 'Potentiometer',
    type: 'potentiometer',
    icon: <Cpu size={24} className="text-emerald-500" />,
    desc: 'Analog Input: Read 0-1023',
  },
  {
    name: 'Tinker Mascot',
    type: 'character',
    icon: <User size={24} className="text-indigo-500" />,
    desc: 'Virtual Character',
  },
  {
    name: 'Smart Robot Car',
    type: 'robot_car',
    icon: <Bot size={24} className="text-violet-500" />,
    desc: 'Virtual Hardware Toy Car',
  },
];

export function AddSpriteModal({ onClose }: { onClose: () => void }) {
  const addSprite = useSimulatorStore((s) => s.addSprite);

  const handleSelect = (preset: PresetSprite) => {
    addSprite({
      name: preset.name,
      type: preset.type,
      x: 240, // Center of a 480x360 stage
      y: 180,
      size: 100,
      direction: 90,
      visible: true,
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
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-[#1a1a1a] flex items-center justify-center group-hover:scale-110 transition-transform">
                  {preset.icon}
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
