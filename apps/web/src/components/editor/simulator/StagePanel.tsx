import React from 'react';
import { StageCanvas } from './StageCanvas';
import { SpriteList } from './SpriteList';
import { SpriteProperties } from './SpriteProperties';
import { Flag, Octagon } from 'lucide-react';
import { useSimulatorStore } from '../../../stores/simulator.store';

export function StagePanel() {
  const { isRunning, toggleSimulation, stopSimulation } = useSimulatorStore();

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden p-2 sm:p-4 gap-3">
      {/* Top Header: Controls */}
      <div className="flex items-center justify-between shrink-0 bg-slate-900 rounded-xl px-4 py-2 border border-slate-800">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          🎮 Hardware Simulator
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSimulation}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              isRunning
                ? 'bg-green-500/20 text-green-400'
                : 'bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-500/20'
            }`}
            title="Start Simulation (Green Flag)"
          >
            <Flag size={18} fill="currentColor" />
          </button>
          <button
            onClick={stopSimulation}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              !isRunning
                ? 'bg-red-500/20 text-red-400 opacity-50'
                : 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20'
            }`}
            title="Stop Simulation"
          >
            <Octagon size={18} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="w-full shrink-0 flex items-center justify-center">
        <StageCanvas />
      </div>

      {/* Properties Bar */}
      <SpriteProperties />

      {/* Sprite List Manager */}
      <SpriteList />
    </div>
  );
}
