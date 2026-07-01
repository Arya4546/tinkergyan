import React, { useState } from 'react';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { AddSpriteModal } from './AddSpriteModal';

export function SpriteList() {
  const { sprites, activeSpriteId, setActiveSprite, removeSprite, backdrop, setBackdrop } =
    useSimulatorStore();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0 bg-white dark:bg-dark-surface rounded-xl p-3 border border-slate-100 dark:border-dark-border">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-1">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sprites</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-7 h-7 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
            title="Add Sprite"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sprites.map((sprite) => (
            <div
              key={sprite.id}
              onClick={() => setActiveSprite(sprite.id)}
              className={`relative group aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                activeSpriteId === sprite.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                  : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-1 flex items-center justify-center text-xs">
                {sprite.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate w-full text-center px-1">
                {sprite.name}
              </span>

              {/* Delete button (shows on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSprite(sprite.id);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 scale-75"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Backdrop Section */}
      <div className="pt-3 mt-auto border-t border-slate-100 dark:border-dark-border shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          <ImageIcon size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Stage</span>
        </div>
        <select
          value={backdrop}
          onChange={(e) => setBackdrop(e.target.value)}
          className="h-7 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a1a1a] text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="grid">Grid</option>
          <option value="breadboard">Breadboard</option>
          <option value="space">Space</option>
        </select>
      </div>

      {showAddModal && <AddSpriteModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
