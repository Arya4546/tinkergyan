import React, { useRef, useState } from 'react';
import { Upload, Pencil, Copy, Trash2 } from 'lucide-react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { CostumePaintModal } from './CostumePaintModal';

/**
 * CostumesPanel — Scratch-style "Costumes" tab for the active sprite.
 * Grid of costume thumbnails with select / rename / duplicate / delete,
 * plus adding a new costume by upload or by painting one from scratch.
 */
export function CostumesPanel() {
  const sprite = useSimulatorStore((s) => s.sprites.find((sp) => sp.id === s.activeSpriteId));
  const updateSprite = useSimulatorStore((s) => s.updateSprite);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paintOpen, setPaintOpen] = useState(false);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);

  if (!sprite) {
    return (
      <div className="h-full flex items-center justify-center bg-ed-well text-sm text-ed-mid">
        No sprite selected.
      </div>
    );
  }

  const costumes = sprite.costumes;
  const names =
    sprite.costumeNames?.length === costumes.length
      ? sprite.costumeNames
      : costumes.map((_, i) => sprite.costumeNames?.[i] ?? `costume${i + 1}`);

  const selectCostume = (idx: number) => {
    updateSprite(sprite.id, { costumeIndex: idx, image: costumes[idx]!, costume: names[idx]! });
  };

  const addCostume = (dataUrl: string, name: string) => {
    const newCostumes = [...costumes, dataUrl];
    const newNames = [...names, name];
    updateSprite(sprite.id, {
      costumes: newCostumes,
      costumeNames: newNames,
      costumeIndex: newCostumes.length - 1,
      image: dataUrl,
      costume: name,
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const baseName = file.name.replace(/\.[^.]+$/, '') || `costume${costumes.length + 1}`;
      addCostume(dataUrl, baseName);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const deleteCostume = (idx: number) => {
    if (costumes.length <= 1) return; // a sprite always needs at least one costume
    const newCostumes = costumes.filter((_, i) => i !== idx);
    const newNames = names.filter((_, i) => i !== idx);
    const newIndex = Math.min(sprite.costumeIndex, newCostumes.length - 1);
    updateSprite(sprite.id, {
      costumes: newCostumes,
      costumeNames: newNames,
      costumeIndex: newIndex,
      image: newCostumes[newIndex]!,
      costume: newNames[newIndex]!,
    });
  };

  const duplicateCostume = (idx: number) => {
    const newCostumes = [...costumes];
    const newNames = [...names];
    newCostumes.splice(idx + 1, 0, costumes[idx]!);
    newNames.splice(idx + 1, 0, `${names[idx]} copy`);
    updateSprite(sprite.id, { costumes: newCostumes, costumeNames: newNames });
  };

  const renameCostume = (idx: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const newNames = names.map((n, i) => (i === idx ? trimmed : n));
    updateSprite(sprite.id, {
      costumeNames: newNames,
      ...(idx === sprite.costumeIndex ? { costume: trimmed } : {}),
    });
  };

  return (
    <div className="h-full flex flex-col bg-ed-well overflow-y-auto p-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {costumes.map((img, idx) => (
          <div
            key={idx}
            onClick={() => selectCostume(idx)}
            className={`relative rounded-xl border p-2 cursor-pointer group transition-colors ${
              idx === sprite.costumeIndex
                ? 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-50/40 dark:bg-purple-950/20'
                : 'border-ed-line bg-ed-panel hover:bg-ed-raised'
            }`}
          >
            <div className="w-full aspect-square flex items-center justify-center bg-white rounded-lg overflow-hidden mb-1">
              <img src={img} alt={names[idx]} className="max-w-full max-h-full object-contain" />
            </div>
            {renamingIndex === idx ? (
              <input
                autoFocus
                defaultValue={names[idx]}
                onBlur={(e) => {
                  renameCostume(idx, e.target.value);
                  setRenamingIndex(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-xs text-center rounded border border-ed-line px-1 bg-ed-well text-ed-hi"
              />
            ) : (
              <div
                className="text-xs text-center truncate text-ed-hi font-medium"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenamingIndex(idx);
                }}
                title="Double-click to rename"
              >
                {idx + 1}. {names[idx]}
              </div>
            )}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                title="Duplicate"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateCostume(idx);
                }}
                className="w-5 h-5 rounded bg-white/90 shadow flex items-center justify-center text-slate-600 hover:text-slate-900"
              >
                <Copy size={11} />
              </button>
              {costumes.length > 1 && (
                <button
                  type="button"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCostume(idx);
                  }}
                  className="w-5 h-5 rounded bg-white/90 shadow flex items-center justify-center text-red-500 hover:text-red-700"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 h-9 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Upload size={14} /> Upload Costume
        </button>
        <button
          type="button"
          onClick={() => setPaintOpen(true)}
          className="flex-1 h-9 rounded-xl bg-ed-raised border border-ed-line text-ed-hi text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-ed-panel transition-colors"
        >
          <Pencil size={14} /> Paint New
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {paintOpen && (
        <CostumePaintModal
          onClose={() => setPaintOpen(false)}
          onSave={(dataUrl) => {
            addCostume(dataUrl, `costume${costumes.length + 1}`);
            setPaintOpen(false);
          }}
        />
      )}
    </div>
  );
}
