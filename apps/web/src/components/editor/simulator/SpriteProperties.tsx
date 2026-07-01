import React from 'react';
import { Eye, EyeOff, RotateCw, Settings2 } from 'lucide-react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { useEditorStore } from '../../../stores/editor.store';

// A simple properties panel for the active sprite
export function SpriteProperties() {
  const { sprites, activeSpriteId, updateSprite } = useSimulatorStore();
  const board = useEditorStore((s) => s.board);

  const activeSprite = sprites.find((s) => s.id === activeSpriteId);

  if (!activeSprite) {
    return (
      <div className="h-[120px] bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <Settings2 size={24} className="opacity-50" />
          <span className="text-xs font-medium">Select a sprite to edit properties</span>
        </div>
      </div>
    );
  }

  // Generate pin options based on board
  const getPinOptions = () => {
    let digital = Array.from({ length: 14 }, (_, i) => String(i));
    let analog = Array.from({ length: 6 }, (_, i) => `A${i}`);

    if (board === 'arduino:avr:mega') {
      digital = Array.from({ length: 54 }, (_, i) => String(i));
      analog = Array.from({ length: 16 }, (_, i) => `A${i}`);
    } else if (board === 'esp8266:esp8266:nodemcuv2') {
      digital = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'RX', 'TX'];
      analog = ['A0'];
    }

    return { digital, analog };
  };

  const { digital, analog } = getPinOptions();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    let parsedValue: any = value;
    if (['x', 'y', 'size', 'direction'].includes(name)) {
      parsedValue = parseFloat(value) || 0;
    }

    updateSprite(activeSprite.id, { [name]: parsedValue });
  };

  const toggleVisible = () => {
    updateSprite(activeSprite.id, { visible: !activeSprite.visible });
  };

  return (
    <div className="bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-3 shrink-0">
      {/* Name and Pin Row */}
      <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 min-w-[120px]">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Sprite
        </label>
        <input
          name="name"
          value={activeSprite.name}
          onChange={handleChange}
          className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-surface text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-primary-500 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1 w-full sm:w-auto min-w-[100px]">
        <label className="text-[10px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1">
          <RotateCw size={10} /> Pin Target
        </label>
        <select
          name="pin"
          value={activeSprite.pin || ''}
          onChange={handleChange}
          className="h-8 px-2 rounded-lg border border-primary-200 dark:border-primary-900/50 bg-primary-50 dark:bg-primary-900/10 text-sm font-semibold text-primary-700 dark:text-primary-400 outline-none focus:border-primary-500 cursor-pointer"
        >
          <option value="">None (Virtual)</option>
          <optgroup label="Digital Pins">
            {digital.map((p) => (
              <option key={p} value={p}>
                Pin {p}
              </option>
            ))}
          </optgroup>
          <optgroup label="Analog Pins">
            {analog.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Coordinates */}
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1 w-16">
          <label className="text-[10px] font-bold text-slate-500 uppercase text-center tracking-wider">
            X
          </label>
          <input
            name="x"
            type="number"
            value={activeSprite.x}
            onChange={handleChange}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-surface text-sm font-medium text-slate-800 dark:text-white text-center outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1 w-16">
          <label className="text-[10px] font-bold text-slate-500 uppercase text-center tracking-wider">
            Y
          </label>
          <input
            name="y"
            type="number"
            value={activeSprite.y}
            onChange={handleChange}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-surface text-sm font-medium text-slate-800 dark:text-white text-center outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Size and Direction */}
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1 w-16">
          <label className="text-[10px] font-bold text-slate-500 uppercase text-center tracking-wider">
            Size
          </label>
          <input
            name="size"
            type="number"
            min="10"
            max="300"
            value={activeSprite.size}
            onChange={handleChange}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-surface text-sm font-medium text-slate-800 dark:text-white text-center outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1 w-16">
          <label className="text-[10px] font-bold text-slate-500 uppercase text-center tracking-wider">
            Dir
          </label>
          <input
            name="direction"
            type="number"
            value={activeSprite.direction}
            onChange={handleChange}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-surface text-sm font-medium text-slate-800 dark:text-white text-center outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Visibility */}
      <div className="flex flex-col gap-1 justify-center ml-auto">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
          Show
        </label>
        <button
          onClick={toggleVisible}
          className="h-8 px-3 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-surface text-slate-500 hover:text-primary-500 hover:border-primary-500 transition-colors"
        >
          {activeSprite.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
    </div>
  );
}
