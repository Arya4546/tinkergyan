import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Trash2 } from 'lucide-react';

const COLORS = [
  '#000000',
  '#575E75',
  '#FF4136',
  '#FF851B',
  '#FFDC00',
  '#2ECC40',
  '#0074D9',
  '#B10DC9',
  '#FFFFFF',
];

interface CostumePaintModalProps {
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

/**
 * CostumePaintModal — a minimal freehand costume editor.
 *
 * Not a full vector tool like Scratch's own paint editor — just a brush,
 * an eraser, and a color picker on a fixed-size canvas, exported as a PNG
 * data URL. Enough for a student to doodle a quick custom costume.
 */
export function CostumePaintModal({ onClose, onSave }: CostumePaintModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(6);
  const [erasing, setErasing] = useState(false);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    lastPosRef.current = getPos(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPosRef.current) return;
    const pos = getPos(e);
    ctx.strokeStyle = erasing ? '#ffffff' : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    lastPosRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#15152b] rounded-3xl shadow-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Paint New Costume</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-2 w-36">
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setErasing(false);
                  }}
                  title={c}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c && !erasing
                      ? 'border-purple-500 scale-110'
                      : 'border-slate-200 dark:border-white/10'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Brush size
            </label>
            <input
              type="range"
              min={2}
              max={24}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
            <button
              type="button"
              onClick={() => setErasing((v) => !v)}
              className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                erasing
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Eraser size={13} /> Eraser
            </button>
            <button
              type="button"
              onClick={clearCanvas}
              className="h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200"
            >
              <Trash2 size={13} /> Clear
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            className="rounded-xl border border-slate-200 dark:border-white/10 touch-none cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="h-10 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold transition-colors"
        >
          Save Costume
        </button>
      </div>
    </div>
  );
}
