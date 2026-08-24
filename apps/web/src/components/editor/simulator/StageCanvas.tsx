import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useSimulatorStore, type SimulatorSprite } from '../../../stores/simulator.store';
import { ScratchZoomRail } from './ScratchZoomRail';
import { scratchEngine, normalizeKeyName } from './ScratchEngine';

/** Effects (0-200 color hue units, 0-100 ghost/brightness) rendered as a CSS filter. */
const spriteEffectsStyle = (effects: SimulatorSprite['effects']): React.CSSProperties => {
  if (!effects.color && !effects.ghost && !effects.brightness) return {};
  return {
    filter: `hue-rotate(${effects.color * 1.8}deg) brightness(${100 + effects.brightness}%)`,
    opacity: Math.max(0, 1 - effects.ghost / 100),
  };
};

/** All-around rotates freely; left-right mirrors instead of rotating; don't-rotate stays fixed. */
const spriteRotationTransform = (sprite: SimulatorSprite): string => {
  if (sprite.rotationStyle === "don't rotate") return 'rotate(0deg)';
  if (sprite.rotationStyle === 'left-right') {
    const normalized = ((sprite.direction + 180) % 360) - 180;
    return normalized < 0 ? 'scaleX(-1)' : 'scaleX(1)';
  }
  return `rotate(${sprite.direction - 90}deg)`;
};

/** Inverse of spriteRotationTransform, so the speech/thought bubble stays upright and unscaled. */
const spriteCounterTransform = (sprite: SimulatorSprite): string => {
  const unscale = `scale(${1 / (sprite.size / 100)})`;
  if (sprite.rotationStyle === "don't rotate") return unscale;
  if (sprite.rotationStyle === 'left-right') {
    const normalized = ((sprite.direction + 180) % 360) - 180;
    return normalized < 0 ? `${unscale} scaleX(-1)` : unscale;
  }
  return `${unscale} rotate(${-(sprite.direction - 90)}deg)`;
};

// Base render size (px) at 100% sprite scale. Character sprites (like the
// Stemmantra logo) are portrait SVGs rendered with object-fit: contain, so
// they need a larger box than the compact hardware components.
const CHARACTER_BASE_SIZE = 130;
const HARDWARE_BASE_SIZE = 64;

// ── Sprite Visual Renderers (preserved from original hardware simulation) ─────
const renderSpriteVisual = (
  sprite: SimulatorSprite,
  updateSprite: (id: string, updates: Partial<SimulatorSprite>) => void,
  isRunning: boolean,
) => {
  if (sprite.type === 'character') {
    if (sprite.image) {
      return (
        <img
          src={sprite.image}
          alt={sprite.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
        />
      );
    }
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--scratch-purple)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        {sprite.name[0]?.toUpperCase()}
      </div>
    );
  }

  // Preserve existing hardware renderers but using inline styles for isolation where possible
  // Using Tailwind classes here is okay for the *inner* hardware components, as they are specific to Tinkergyan
  if (sprite.type === 'led') {
    // 0-1, written by hardware-binding from the pin's PWM duty. Defaults to
    // full so a plain digitalWrite (and any Scratch-side LED) looks unchanged.
    const brightness = Math.max(0, Math.min(1, (sprite.state?.brightness as number) ?? 1));
    return (
      <div className="relative w-12 h-16 flex flex-col items-center justify-center select-none pointer-events-none">
        {sprite.state?.on && (
          <div
            className="absolute top-0 w-12 h-12 bg-red-500 rounded-full blur-md animate-pulse"
            style={{ opacity: 0.7 * brightness }}
          />
        )}
        <div
          className={`w-8 h-8 rounded-t-full border border-red-400 relative flex items-center justify-center shadow-lg transition-colors duration-100 ${sprite.state?.on ? 'bg-gradient-to-b from-red-400 to-red-500' : 'bg-gradient-to-b from-red-950 to-red-900 opacity-90'}`}
          // Dim the lens itself as well as the glow, so a low duty reads as a
          // faint LED rather than a bright one with a weak halo.
          style={sprite.state?.on ? { filter: `brightness(${0.35 + 0.65 * brightness})` } : {}}
        >
          <div className="w-2 h-4 border-l border-t border-red-300/40 absolute bottom-0 left-2.5" />
          <div className="w-1.5 h-3 border-r border-t border-red-300/40 absolute bottom-0 right-2.5" />
        </div>
        <div
          className={`w-9 h-1 rounded-sm border-x border-red-400/50 ${sprite.state?.on ? 'bg-red-500' : 'bg-red-900'}`}
        />
        <div className="flex gap-2">
          <div className="w-0.5 h-4 bg-slate-400/80 rounded-b" />
          <div className="w-0.5 h-5 bg-slate-400/80 rounded-b" />
        </div>
      </div>
    );
  }
  if (sprite.type === 'button') {
    return (
      <div className="relative w-14 h-14 flex items-center justify-center select-none bg-slate-900/40 p-1 rounded-lg border border-slate-800/80 pointer-events-none">
        <div className="w-10 h-10 bg-slate-700 rounded border border-slate-600 shadow-md relative flex items-center justify-center">
          <div className="absolute -left-1 top-1 w-1.5 h-1.5 bg-slate-400 rounded-sm" />
          <div className="absolute -left-1 bottom-1 w-1.5 h-1.5 bg-slate-400 rounded-sm" />
          <div className="absolute -right-1 top-1 w-1.5 h-1.5 bg-slate-400 rounded-sm" />
          <div className="absolute -right-1 bottom-1 w-1.5 h-1.5 bg-slate-400 rounded-sm" />
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              updateSprite(sprite.id, { state: { ...sprite.state, pressed: true } });
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              updateSprite(sprite.id, { state: { ...sprite.state, pressed: false } });
            }}
            onPointerLeave={() =>
              updateSprite(sprite.id, { state: { ...sprite.state, pressed: false } })
            }
            className={`pointer-events-auto cursor-pointer w-7 h-7 rounded-full bg-red-600 border border-red-500 flex items-center justify-center transition-all ${sprite.state?.pressed ? 'scale-90 shadow-inner bg-red-700' : 'shadow-md active:scale-95'}`}
          >
            <div className="w-4 h-4 rounded-full border border-red-400/30 bg-red-600/30" />
          </div>
        </div>
      </div>
    );
  }
  if (sprite.type === 'servo') {
    const angle = sprite.state?.angle ?? 0;
    return (
      <div className="relative w-16 h-16 flex items-center justify-center select-none pointer-events-none">
        <div className="absolute w-12 h-8 bg-black/20 rounded-md blur-sm top-6" />
        <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded border border-blue-500 flex flex-col items-center justify-center relative shadow-md">
          <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 flex gap-0.5">
            <div className="w-0.5 h-2 bg-amber-700" />
            <div className="w-0.5 h-2 bg-red-600" />
            <div className="w-0.5 h-2 bg-yellow-500" />
          </div>
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-blue-700 rounded-l border-y border-l border-blue-500 flex items-center justify-center">
            <div className="w-0.5 h-0.5 bg-slate-900 rounded-full" />
          </div>
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-blue-700 rounded-r border-y border-r border-blue-500 flex items-center justify-center">
            <div className="w-0.5 h-0.5 bg-slate-900 rounded-full" />
          </div>
          <span className="text-[7px] text-blue-200 font-bold font-mono">SERVO</span>
        </div>
        <div
          className="absolute top-2 w-10 h-10 transition-transform origin-center flex items-center justify-center"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div className="w-10 h-2.5 bg-slate-100 rounded-full border border-slate-300 shadow absolute flex justify-between px-1 items-center">
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
          </div>
          <div className="w-3.5 h-3.5 bg-white rounded-full border border-slate-300 absolute shadow-sm" />
        </div>
      </div>
    );
  }
  if (sprite.type === 'potentiometer') {
    const val = sprite.state?.value ?? 0;
    return (
      <div className="relative w-16 h-18 flex flex-col items-center justify-center select-none bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 shadow-inner">
        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 border border-blue-400 flex items-center justify-center relative shadow-md pointer-events-none">
          <div className="absolute -bottom-1 flex gap-1.5">
            <div className="w-1 h-1.5 bg-yellow-500 rounded-t-sm" />
            <div className="w-1 h-1.5 bg-yellow-500 rounded-t-sm" />
            <div className="w-1 h-1.5 bg-yellow-500 rounded-t-sm" />
          </div>
          <div
            className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 relative shadow-inner flex items-center justify-center transition-transform"
            style={{ transform: `rotate(${(val / 1023) * 270 - 135}deg)` }}
          >
            <div className="w-0.5 h-3 bg-white absolute top-0.5 rounded-full shadow-sm" />
          </div>
        </div>
        <span className="text-[8px] text-emerald-400 font-bold font-mono mt-1">POT: {val}</span>
        <input
          type="range"
          min="0"
          max="1023"
          value={val}
          onPointerDown={(e) => e.stopPropagation()} // Stop drag when sliding
          onChange={(e) =>
            updateSprite(sprite.id, { state: { ...sprite.state, value: parseInt(e.target.value) } })
          }
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-1 pointer-events-auto"
        />
      </div>
    );
  }
  if (sprite.type === 'robot_car') {
    /**
     * Driven by its own pin when one is wired, otherwise by the global
     * running flag.
     *
     * The wheels used to animate purely off `isRunning`, which is the Scratch
     * green-flag state and is never set in hardware mode — so a car wired to a
     * pin sat motionless no matter what the sketch did. Preferring `state.moving`
     * (written by hardware-binding) makes `digitalWrite(8, HIGH)` actually drive
     * it, while an unwired car in a Scratch project behaves exactly as before.
     */
    const driving = sprite.state?.pin !== undefined ? Boolean(sprite.state?.moving) : isRunning;
    return (
      <div className="relative w-16 h-20 flex items-center justify-center select-none pointer-events-none">
        <div className="absolute w-12 h-16 bg-black/30 rounded-2xl blur-sm top-3" />
        <div className="absolute left-0 top-4 w-3.5 h-12 bg-zinc-900 rounded-md border-r-2 border-zinc-700 overflow-hidden flex flex-col justify-between py-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-1 bg-zinc-800 w-full ${driving ? 'animate-pulse' : ''}`} />
          ))}
        </div>
        <div className="absolute right-0 top-4 w-3.5 h-12 bg-zinc-900 rounded-md border-l-2 border-zinc-700 overflow-hidden flex flex-col justify-between py-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-1 bg-zinc-800 w-full ${driving ? 'animate-pulse' : ''}`} />
          ))}
        </div>
        <div className="w-11 h-16 bg-gradient-to-b from-indigo-600 to-indigo-800 rounded-2xl relative flex flex-col items-center border border-indigo-400 shadow-inner overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-4 bg-indigo-500/30 border-b border-indigo-400/50" />
          <div className="mt-2 flex gap-1 bg-slate-800 px-1 py-0.5 rounded border border-slate-600 shadow-sm z-10">
            <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center relative overflow-hidden">
              <div className="w-3 h-3 rounded-full bg-zinc-900 flex items-center justify-center">
                <div
                  className={`w-1 h-1 rounded-full bg-cyan-400 ${driving ? 'animate-ping' : ''}`}
                />
              </div>
            </div>
            <div className="w-4 h-4 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center relative overflow-hidden">
              <div className="w-3 h-3 rounded-full bg-zinc-900 flex items-center justify-center">
                <div
                  className={`w-1 h-1 rounded-full bg-cyan-400 ${driving ? 'animate-ping' : ''}`}
                />
              </div>
            </div>
          </div>
          <div className="w-8 h-6 bg-emerald-800/90 rounded border border-emerald-600 mt-2 p-0.5 flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-sm" />
              <div className="w-3 h-1 bg-zinc-400 rounded-sm" />
            </div>
            <div className="flex gap-0.5 justify-center">
              <div className="w-0.5 h-1 bg-yellow-400" />
              <div className="w-0.5 h-1 bg-yellow-400" />
              <div className="w-0.5 h-1 bg-yellow-400" />
              <div className="w-0.5 h-1 bg-yellow-400" />
            </div>
          </div>
          <div className="absolute bottom-1 right-2 flex items-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${driving ? 'bg-emerald-400 animate-pulse shadow-emerald-400 shadow' : 'bg-red-500'}`}
            />
          </div>
        </div>
      </div>
    );
  }
  // Default box
  return (
    <div
      style={{ width: '100%', height: '100%', backgroundColor: '#9ca3af', borderRadius: '4px' }}
    />
  );
};

// ── Stage Canvas Component ───────────────────────────────────────────────────
export function StageCanvas() {
  const {
    sprites,
    activeSpriteId,
    setActiveSprite,
    updateSprite,
    backdrop,
    isRunning,
    cameraX,
    cameraY,
    setCamera,
    setMouse,
    setMouseDown,
    setKeyDown,
    askPrompt,
    variables,
    submitAnswer,
  } = useSimulatorStore();

  const stageRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    spriteId: string;
    startX: number;
    startY: number;
    startSpriteX: number;
    startSpriteY: number;
  } | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);

  // Global keyboard tracking for "key pressed?" sensing + "when key pressed" events.
  useEffect(() => {
    /**
     * True while the user is typing somewhere that isn't the stage.
     *
     * "when key pressed" hats now fire without the green flag, which makes this
     * mandatory rather than merely tidy: without it, renaming a sprite or
     * editing a number in a block would run the project one keystroke at a time.
     */
    const isTyping = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el || typeof el.closest !== 'function') return false;
      return Boolean(
        el.closest('input, textarea, select, [contenteditable="true"], .blocklyHtmlInput'),
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const key = normalizeKeyName(e.key);
      setKeyDown(key, true);
      if (!e.repeat) scratchEngine.notifyKeyPressed(key);
    };
    // Deliberately unguarded: releasing a key must always clear it, or focus
    // moving into a field mid-press would leave the key stuck down forever.
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeyDown(normalizeKeyName(e.key), false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setKeyDown]);

  // Background styles
  const getBackgroundStyle = () => {
    const bgX = `calc(50% - ${cameraX}px * (100% / 480))`;
    const bgY = `calc(50% + ${cameraY}px * (100% / 360))`;

    const baseStyle = {
      backgroundPosition: `${bgX} ${bgY}`,
    };

    switch (backdrop) {
      case 'grid':
        return {
          ...baseStyle,
          backgroundColor: 'white',
          backgroundImage:
            'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNjYmQ1ZTEiLz48L3N2Zz4=")',
          backgroundRepeat: 'repeat',
        };
      case 'breadboard':
        return { ...baseStyle, backgroundColor: '#fef3c7' };
      case 'space':
        return { ...baseStyle, backgroundColor: '#0f172a' };
      default:
        return { ...baseStyle, backgroundColor: 'white' };
    }
  };

  // Convert Scratch coordinates (relative to camera viewport) to percentages
  const scratchToPercent = useCallback(
    (x: number, y: number) => {
      const pctX = ((x - cameraX + 240) / 480) * 100;
      const pctY = ((180 - (y - cameraY)) / 360) * 100;
      return { pctX, pctY };
    },
    [cameraX, cameraY],
  );

  const pixelDeltaToScratch = useCallback(() => {
    if (!stageRef.current) return { scaleX: 1, scaleY: 1 };
    const rect = stageRef.current.getBoundingClientRect();
    const scaleX = 480 / rect.width;
    const scaleY = 360 / rect.height;
    return { scaleX, scaleY };
  }, []);

  const handleSpritePointerDown = useCallback(
    (e: React.PointerEvent, sprite: SimulatorSprite) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setActiveSprite(sprite.id);
      setMouseDown(true);
      setDragState({
        spriteId: sprite.id,
        startX: e.clientX,
        startY: e.clientY,
        startSpriteX: sprite.x,
        startSpriteY: sprite.y,
      });
    },
    [setActiveSprite, setMouseDown],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const scratchX = Math.round((relX / rect.width) * 480 - 240 + cameraX);
        const scratchY = Math.round(180 - (relY / rect.height) * 360 + cameraY);
        setMouseCoords({ x: scratchX, y: scratchY });
        setMouse(scratchX, scratchY);
      }

      if (!dragState) return;

      const { scaleX, scaleY } = pixelDeltaToScratch();
      const dx = (e.clientX - dragState.startX) * scaleX;
      const dy = -(e.clientY - dragState.startY) * scaleY;

      const proposedX = dragState.startSpriteX + dx;
      const proposedY = dragState.startSpriteY + dy;

      const sprite = sprites.find((s) => s.id === dragState.spriteId);
      if (!sprite) return;

      const halfSize =
        ((sprite.type === 'character' ? CHARACTER_BASE_SIZE : HARDWARE_BASE_SIZE) *
          (sprite.size / 100)) /
        2;

      let currentCameraX = cameraX;
      let currentCameraY = cameraY;

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

      if (currentCameraX !== cameraX || currentCameraY !== cameraY) {
        setCamera(currentCameraX, currentCameraY);
      }

      const newX = Math.round(
        Math.max(
          -240 + currentCameraX + halfSize,
          Math.min(240 + currentCameraX - halfSize, proposedX),
        ),
      );
      const newY = Math.round(
        Math.max(
          -180 + currentCameraY + halfSize,
          Math.min(180 + currentCameraY - halfSize, proposedY),
        ),
      );

      updateSprite(dragState.spriteId, { x: newX, y: newY });
    },
    [dragState, pixelDeltaToScratch, updateSprite, sprites, cameraX, cameraY, setCamera, setMouse],
  );

  const CLICK_DRAG_THRESHOLD_PX = 4;

  const handlePointerUp = useCallback(
    (e?: React.PointerEvent) => {
      setMouseDown(false);
      if (dragState && e) {
        const movedPx = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
        if (movedPx < CLICK_DRAG_THRESHOLD_PX) {
          scratchEngine.notifySpriteClicked();
        }
      }
      setDragState(null);
    },
    [dragState, setMouseDown],
  );

  const handleStageClick = useCallback(() => {
    if (!dragState) {
      setActiveSprite(null);
    }
  }, [dragState, setActiveSprite]);

  return (
    <div
      ref={stageRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        ...getBackgroundStyle(),
      }}
      onPointerDown={() => setMouseDown(true)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        setMouseCoords(null);
        handlePointerUp();
      }}
      onClick={handleStageClick}
    >
      {sprites
        .filter((s) => s.visible && s.id === activeSpriteId)
        .map((sprite, index) => {
          const { pctX, pctY } = scratchToPercent(sprite.x, sprite.y);
          const baseSize = sprite.type === 'character' ? CHARACTER_BASE_SIZE : HARDWARE_BASE_SIZE;

          return (
            <div
              key={sprite.id}
              style={{
                position: 'absolute',
                width: `${baseSize}px`,
                height: `${baseSize}px`,
                left: `${pctX}%`,
                top: `${pctY}%`,
                transform: `translate(-50%, -50%) scale(${sprite.size / 100}) ${spriteRotationTransform(sprite)}`,
                cursor: dragState?.spriteId === sprite.id ? 'grabbing' : 'grab',
                zIndex:
                  dragState?.spriteId === sprite.id || activeSpriteId === sprite.id
                    ? 1000
                    : index + 1,
                touchAction: 'none',
                ...spriteEffectsStyle(sprite.effects),
              }}
              onPointerDown={(e) => handleSpritePointerDown(e, sprite)}
            >
              {sprite.speech && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: `translateX(-50%) ${spriteCounterTransform(sprite)}`,
                    backgroundColor: 'white',
                    border: '2px solid #D9D9D9',
                    borderRadius: sprite.speechIsThought ? '24px' : '16px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: '#575E75',
                    whiteSpace: 'nowrap',
                    marginBottom: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 20,
                    pointerEvents: 'none',
                  }}
                >
                  {sprite.speech}
                  {sprite.speechIsThought ? (
                    // Thought bubble: trailing circles instead of a pointed tail
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-10px',
                          left: '18px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          border: '2px solid #D9D9D9',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-16px',
                          left: '10px',
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          border: '2px solid #D9D9D9',
                        }}
                      />
                    </>
                  ) : (
                    // Speech bubble tail
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '20px',
                        width: '12px',
                        height: '12px',
                        backgroundColor: 'white',
                        borderRight: '2px solid #D9D9D9',
                        borderBottom: '2px solid #D9D9D9',
                        transform: 'rotate(45deg)',
                      }}
                    />
                  )}
                </div>
              )}
              {renderSpriteVisual(sprite, updateSprite, isRunning)}
            </div>
          );
        })}

      <div className="scratch-coord-hint">
        {mouseCoords ? `x: ${mouseCoords.x} y: ${mouseCoords.y}` : 'x: 0 y: 0'}
      </div>

      {/* Variable monitors — Scratch's readouts, top-left of the stage.
          Without these a script like "when flag clicked / set score to 0" runs
          perfectly and shows the student absolutely nothing, which is exactly
          what was reported. Shown for every variable the moment it is written,
          matching Scratch, where a new variable's monitor is visible by
          default. */}
      {Object.keys(variables).length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          {Object.entries(variables).map(([name, value]) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.15)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                fontSize: '10px',
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              <span style={{ background: '#E6F0FF', color: '#33507A', padding: '2px 6px' }}>
                {name}
              </span>
              <span
                style={{
                  background: 'var(--scratch-orange, #FF8C1A)',
                  color: 'white',
                  padding: '2px 8px',
                  minWidth: '24px',
                  textAlign: 'center',
                }}
              >
                {String(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
        <ScratchZoomRail />
      </div>

      {/* "ask and wait" prompt bar — mirrors Scratch's bottom-docked question input */}
      {askPrompt !== null && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '8px 12px',
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderTop: '1px solid var(--scratch-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 50,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span style={{ fontSize: '13px', color: 'var(--scratch-text-dark)', fontWeight: 600 }}>
            {askPrompt}
          </span>
          <input
            key={askPrompt}
            ref={answerInputRef}
            autoFocus
            type="text"
            defaultValue=""
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitAnswer(answerInputRef.current?.value ?? '');
            }}
            className="scratch-input"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => submitAnswer(answerInputRef.current?.value ?? '')}
            className="scratch-flag-btn"
            style={{
              backgroundColor: 'var(--scratch-purple)',
              color: 'white',
              borderRadius: '50%',
            }}
          >
            ➤
          </button>
        </div>
      )}
    </div>
  );
}
