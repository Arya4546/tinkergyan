import React, { useRef, useState } from 'react';
import { Upload, Mic, Square, Play, Trash2 } from 'lucide-react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { SOUND_NAMES, scratchEngine } from './ScratchEngine';

/**
 * SoundsPanel — Scratch-style "Sounds" tab for the active sprite.
 *
 * "Built-in tones" are the app's synthesized pop/beep/ding/boop sounds,
 * shared by every sprite (this project ships no licensed audio library).
 * "My sounds" are this sprite's own uploaded or mic-recorded sounds.
 */
export function SoundsPanel() {
  const sprite = useSimulatorStore((s) => s.sprites.find((sp) => sp.id === s.activeSpriteId));
  const updateSprite = useSimulatorStore((s) => s.updateSprite);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  if (!sprite) {
    return (
      <div className="h-full flex items-center justify-center bg-ed-well text-sm text-ed-mid">
        No sprite selected.
      </div>
    );
  }

  const customSounds = sprite.customSounds ?? [];

  const addCustomSound = (dataUrl: string, name: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    updateSprite(sprite.id, { customSounds: [...customSounds, { id, name, dataUrl }] });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const baseName = file.name.replace(/\.[^.]+$/, '') || `sound${customSounds.length + 1}`;
      addCustomSound(reader.result as string, baseName);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () =>
          addCustomSound(reader.result as string, `recording${customSounds.length + 1}`);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setMicError('Could not access the microphone. Check your browser permissions.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const deleteSound = (id: string) => {
    updateSprite(sprite.id, { customSounds: customSounds.filter((s) => s.id !== id) });
  };

  const renameSound = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    updateSprite(sprite.id, {
      customSounds: customSounds.map((s) => (s.id === id ? { ...s, name: trimmed } : s)),
    });
  };

  return (
    <div className="h-full flex flex-col bg-ed-well overflow-y-auto p-3 gap-2">
      <div className="text-xs font-bold text-ed-mid uppercase tracking-wide">Built-in tones</div>
      {SOUND_NAMES.map((name) => (
        <div
          key={name}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ed-panel border border-ed-line"
        >
          <button
            type="button"
            onClick={() => void scratchEngine.previewSound(name)}
            className="w-7 h-7 rounded-full bg-[#D65CD6] text-white flex items-center justify-center shrink-0"
          >
            <Play size={12} />
          </button>
          <span className="text-sm text-ed-hi font-medium capitalize">{name}</span>
        </div>
      ))}

      {customSounds.length > 0 && (
        <div className="text-xs font-bold text-ed-mid uppercase tracking-wide mt-3">My sounds</div>
      )}
      {customSounds.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ed-panel border border-ed-line group"
        >
          <button
            type="button"
            onClick={() => void scratchEngine.previewSound(undefined, s.dataUrl)}
            className="w-7 h-7 rounded-full bg-[#D65CD6] text-white flex items-center justify-center shrink-0"
          >
            <Play size={12} />
          </button>
          {renamingId === s.id ? (
            <input
              autoFocus
              defaultValue={s.name}
              onBlur={(e) => {
                renameSound(s.id, e.target.value);
                setRenamingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              className="flex-1 text-sm rounded border border-ed-line px-1.5 py-0.5 bg-ed-well text-ed-hi"
            />
          ) : (
            <span
              className="flex-1 text-sm text-ed-hi font-medium truncate"
              onDoubleClick={() => setRenamingId(s.id)}
              title="Double-click to rename"
            >
              {s.name}
            </span>
          )}
          <button
            type="button"
            onClick={() => deleteSound(s.id)}
            className="w-6 h-6 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {micError && <div className="text-xs text-red-500 font-medium">{micError}</div>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 h-9 rounded-xl bg-[#D65CD6] hover:bg-[#c04ac0] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Upload size={14} /> Upload Sound
        </button>
        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex-1 h-9 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse"
          >
            <Square size={14} /> Stop Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="flex-1 h-9 rounded-xl bg-ed-raised border border-ed-line text-ed-hi text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-ed-panel transition-colors"
          >
            <Mic size={14} /> Record Sound
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
