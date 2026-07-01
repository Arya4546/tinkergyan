import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore, type SimulatorSprite } from '../../../stores/simulator.store';

// A mock library of icons/SVGs for different sprite types.
const renderSpriteVisual = (sprite: SimulatorSprite, updateSprite: any, isRunning: boolean) => {
  if (sprite.type === 'led') {
    return (
      <div className="relative w-12 h-16 flex flex-col items-center justify-center select-none">
        {/* Glow effect */}
        {sprite.state?.on && (
          <div className="absolute top-0 w-12 h-12 bg-red-500 rounded-full blur-md opacity-70 animate-pulse" />
        )}

        {/* LED Plastic Bulb */}
        <div
          className={`w-8 h-8 rounded-t-full border border-red-400 relative flex items-center justify-center shadow-lg transition-colors duration-100 ${
            sprite.state?.on
              ? 'bg-gradient-to-b from-red-400 to-red-500'
              : 'bg-gradient-to-b from-red-950 to-red-900 opacity-90'
          }`}
        >
          {/* Internal filament */}
          <div className="w-2 h-4 border-l border-t border-red-300/40 absolute bottom-0 left-2.5" />
          <div className="w-1.5 h-3 border-r border-t border-red-300/40 absolute bottom-0 right-2.5" />
        </div>

        {/* LED Rim Base */}
        <div
          className={`w-9 h-1 rounded-sm border-x border-red-400/50 ${
            sprite.state?.on ? 'bg-red-500' : 'bg-red-900'
          }`}
        />

        {/* Cathode & Anode Legs */}
        <div className="flex gap-2">
          <div className="w-0.5 h-4 bg-slate-400/80 rounded-b" />
          <div className="w-0.5 h-5 bg-slate-400/80 rounded-b" />
        </div>
      </div>
    );
  }
  if (sprite.type === 'button') {
    return (
      <div className="relative w-14 h-14 flex items-center justify-center select-none bg-slate-900/40 p-1 rounded-lg border border-slate-800/80">
        {/* Outer body frame */}
        <div className="w-10 h-10 bg-slate-700 rounded border border-slate-600 shadow-md relative flex items-center justify-center">
          {/* Metal Corner Prongs */}
          <div className="absolute -left-1 top-1 w-1.5 h-1.5 bg-slate-400 rounded-sm" />
          <div className="absolute -left-1 bottom-1 w-1.5 h-1.5 bg-slate-400 rounded-sm" />
          <div className="absolute -right-1 top-1 w-1.5 h-1.5 bg-slate-400 rounded-sm" />
          <div className="absolute -right-1 bottom-1 w-1.5 h-1.5 bg-slate-400 rounded-sm" />

          {/* Button Cap circle */}
          <button
            onMouseDown={() =>
              updateSprite(sprite.id, { state: { ...sprite.state, pressed: true } })
            }
            onMouseUp={() =>
              updateSprite(sprite.id, { state: { ...sprite.state, pressed: false } })
            }
            onMouseLeave={() =>
              updateSprite(sprite.id, { state: { ...sprite.state, pressed: false } })
            }
            className={`w-7 h-7 rounded-full bg-red-600 border border-red-500 flex items-center justify-center transition-all ${
              sprite.state?.pressed
                ? 'scale-90 shadow-inner bg-red-700'
                : 'shadow-md active:scale-95'
            }`}
          >
            {/* Center ring */}
            <div className="w-4 h-4 rounded-full border border-red-400/30 bg-red-600/30" />
          </button>
        </div>
      </div>
    );
  }
  if (sprite.type === 'servo') {
    const angle = sprite.state?.angle ?? 0;
    return (
      <div className="relative w-16 h-16 flex items-center justify-center select-none">
        {/* Shadow */}
        <div className="absolute w-12 h-8 bg-black/20 rounded-md blur-sm top-6" />

        {/* Main Casing */}
        <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded border border-blue-500 flex flex-col items-center justify-center relative shadow-md">
          {/* Wire Tail */}
          <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 flex gap-0.5">
            <div className="w-0.5 h-2 bg-amber-700" />
            <div className="w-0.5 h-2 bg-red-600" />
            <div className="w-0.5 h-2 bg-yellow-500" />
          </div>

          {/* Mounting tabs */}
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-blue-700 rounded-l border-y border-l border-blue-500 flex items-center justify-center">
            <div className="w-0.5 h-0.5 bg-slate-900 rounded-full" />
          </div>
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-blue-700 rounded-r border-y border-r border-blue-500 flex items-center justify-center">
            <div className="w-0.5 h-0.5 bg-slate-900 rounded-full" />
          </div>

          <span className="text-[7px] text-blue-200 font-bold font-mono">SERVO</span>
        </div>

        {/* Rotating Output Shaft and Horn */}
        <div
          className="absolute top-2 w-10 h-10 transition-transform origin-center flex items-center justify-center"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {/* Servo Horn (2-arm spinner) */}
          <div className="w-10 h-2.5 bg-slate-100 rounded-full border border-slate-300 shadow absolute flex justify-between px-1 items-center">
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
          </div>
          {/* Top cap */}
          <div className="w-3.5 h-3.5 bg-white rounded-full border border-slate-300 absolute shadow-sm" />
        </div>
      </div>
    );
  }
  if (sprite.type === 'potentiometer') {
    const val = sprite.state?.value ?? 0;
    return (
      <div className="relative w-16 h-18 flex flex-col items-center justify-center select-none bg-slate-900/50 dark:bg-black/30 p-1.5 rounded-xl border border-slate-800 shadow-inner">
        {/* Potentiometer Base */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 border border-blue-400 flex items-center justify-center relative shadow-md">
          {/* Terminal Pins Representation at bottom */}
          <div className="absolute -bottom-1 flex gap-1.5">
            <div className="w-1 h-1.5 bg-yellow-500 rounded-t-sm" />
            <div className="w-1 h-1.5 bg-yellow-500 rounded-t-sm" />
            <div className="w-1 h-1.5 bg-yellow-500 rounded-t-sm" />
          </div>

          {/* Rotating Knob Dial */}
          <div
            className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 relative shadow-inner flex items-center justify-center transition-transform"
            style={{ transform: `rotate(${(val / 1023) * 270 - 135}deg)` }}
          >
            {/* White Dial Pointer line */}
            <div className="w-0.5 h-3 bg-white absolute top-0.5 rounded-full shadow-sm" />
          </div>
        </div>

        <span className="text-[8px] text-emerald-400 font-bold font-mono mt-1">POT: {val}</span>

        {/* Custom Range Slider */}
        <input
          type="range"
          min="0"
          max="1023"
          value={val}
          onChange={(e) => {
            updateSprite(sprite.id, {
              state: { ...sprite.state, value: parseInt(e.target.value) },
            });
          }}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-1"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }
  if (sprite.type === 'robot_car') {
    return (
      <div className="relative w-16 h-20 flex items-center justify-center select-none">
        {/* Shadow */}
        <div className="absolute w-12 h-16 bg-black/30 rounded-2xl blur-sm top-3" />

        {/* Left Wheel */}
        <div className="absolute left-0 top-4 w-3.5 h-12 bg-zinc-900 rounded-md border-r-2 border-zinc-700 overflow-hidden flex flex-col justify-between py-1">
          {/* Wheel treads */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-1 bg-zinc-800 w-full ${isRunning ? 'animate-pulse' : ''}`} />
          ))}
        </div>

        {/* Right Wheel */}
        <div className="absolute right-0 top-4 w-3.5 h-12 bg-zinc-900 rounded-md border-l-2 border-zinc-700 overflow-hidden flex flex-col justify-between py-1">
          {/* Wheel treads */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-1 bg-zinc-800 w-full ${isRunning ? 'animate-pulse' : ''}`} />
          ))}
        </div>

        {/* Chassis Body */}
        <div className="w-11 h-16 bg-gradient-to-b from-indigo-600 to-indigo-800 rounded-2xl relative flex flex-col items-center border border-indigo-400 shadow-inner overflow-hidden">
          {/* Top Plate Accent */}
          <div className="absolute top-0 inset-x-0 h-4 bg-indigo-500/30 border-b border-indigo-400/50" />

          {/* Ultrasonic Sensor */}
          <div className="mt-2 flex gap-1 bg-[#1e293b] px-1 py-0.5 rounded border border-slate-600 shadow-sm z-10">
            {/* Left Eye */}
            <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center relative overflow-hidden">
              <div className="w-3 h-3 rounded-full bg-zinc-900 flex items-center justify-center">
                <div
                  className={`w-1 h-1 rounded-full bg-cyan-400 ${isRunning ? 'animate-ping' : ''}`}
                />
              </div>
            </div>
            {/* Right Eye */}
            <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center relative overflow-hidden">
              <div className="w-3 h-3 rounded-full bg-zinc-900 flex items-center justify-center">
                <div
                  className={`w-1 h-1 rounded-full bg-cyan-400 ${isRunning ? 'animate-ping' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* Microcontroller board detail on chassis */}
          <div className="w-8 h-6 bg-emerald-800/90 rounded border border-emerald-600 mt-2 p-0.5 flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-sm" />
              <div className="w-3 h-1 bg-zinc-400 rounded-sm" />
            </div>
            <div className="flex gap-0.5 justify-center">
              {/* Gold pins */}
              <div className="w-0.5 h-1 bg-yellow-400" />
              <div className="w-0.5 h-1 bg-yellow-400" />
              <div className="w-0.5 h-1 bg-yellow-400" />
              <div className="w-0.5 h-1 bg-yellow-400" />
            </div>
          </div>

          {/* Status LED */}
          <div className="absolute bottom-1 right-2 flex items-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse shadow-emerald-400 shadow' : 'bg-red-500'}`}
            />
          </div>
        </div>
      </div>
    );
  }
  if (sprite.type === 'character') {
    return (
      <div className="w-full h-full bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg">
        {sprite.name[0]?.toUpperCase()}
      </div>
    );
  }
  // Default box
  return <div className="w-full h-full bg-slate-500 rounded" />;
};

export function StageCanvas() {
  const { sprites, activeSpriteId, setActiveSprite, updateSprite, backdrop, isRunning } =
    useSimulatorStore();
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Backgrounds map
  const bgMap: Record<string, string> = {
    grid: 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNjYmQ1ZTEiLz48L3N2Zz4=")] bg-repeat',
    breadboard: 'bg-amber-100', // Mock
    space: 'bg-slate-900', // Mock
  };

  return (
    <div
      className={`relative w-full aspect-video sm:aspect-[4/3] rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-inner ${bgMap[backdrop] || bgMap.grid} transition-colors`}
      ref={constraintsRef}
      onClick={() => setActiveSprite(null)}
    >
      {/* 0,0 is center in Scratch, but for DOM it's top-left. Let's use framer-motion x,y mapping. */}
      {sprites
        .filter((s) => s.visible)
        .map((sprite) => (
          <motion.div
            key={sprite.id}
            drag
            dragConstraints={constraintsRef}
            dragElastic={0}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              // Very simple update, normally would need to map relative to center
              updateSprite(sprite.id, {
                x: Math.round(sprite.x + info.offset.x),
                y: Math.round(sprite.y + info.offset.y),
              });
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveSprite(sprite.id);
            }}
            initial={false}
            animate={{
              x: sprite.x,
              y: sprite.y,
              scale: sprite.size / 100,
              rotate: sprite.direction - 90, // Scratch default 90 is pointing right (0 deg in CSS)
            }}
            className={`absolute top-1/2 left-1/2 -ml-8 -mt-8 w-16 h-16 cursor-grab active:cursor-grabbing ${activeSpriteId === sprite.id ? 'ring-4 ring-primary-500 ring-offset-2 ring-offset-transparent rounded-sm' : ''}`}
          >
            {renderSpriteVisual(sprite, updateSprite, isRunning)}
          </motion.div>
        ))}

      {/* Coordinate Hint */}
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/80 dark:bg-black/50 backdrop-blur rounded text-[10px] font-mono text-slate-500 font-semibold pointer-events-none">
        X:0 Y:0 = Center
      </div>
    </div>
  );
}
