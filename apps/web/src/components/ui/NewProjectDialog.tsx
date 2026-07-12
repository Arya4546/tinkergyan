import { Play, Cpu, X } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewProjectDialog({ open, onClose }: NewProjectDialogProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = (mode: 'software' | 'hardware') => {
    navigate(`/editor?engine=${mode}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 relative flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
          title="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Title / Description */}
        <div className="text-center pt-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Choose Coding Mode</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Select the environment for your new project.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Software Coding Card */}
          <button
            onClick={() => handleSelect('software')}
            className="flex flex-col items-center text-center p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#16181D] hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-200 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Play size={22} className="fill-current" />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Software Coding
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Code using blockly logic or text and run/test inside the interactive browser
              simulator.
            </p>
          </button>

          {/* Hardware Coding Card */}
          <button
            onClick={() => handleSelect('hardware')}
            className="flex flex-col items-center text-center p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#16181D] hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-200 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Cpu size={22} />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Hardware Coding
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Code using blocks or C++ text and compile/upload directly to real Arduino & ESP
              boards.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
