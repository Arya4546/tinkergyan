import React from 'react';
import { ZoomInIcon, ZoomOutIcon, ZoomResetIcon } from './ScratchIcons';

/**
 * ScratchZoomRail — Vertical zoom controls overlaid on the stage canvas.
 * Three buttons: zoom in (+), zoom out (−), and reset/fit (=).
 */
export function ScratchZoomRail() {
  return (
    <div className="flex flex-col gap-1">
      <button
        className="w-7 h-7 rounded-full bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        title="Zoom In"
      >
        <ZoomInIcon size={14} />
      </button>
      <button
        className="w-7 h-7 rounded-full bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        title="Zoom Out"
      >
        <ZoomOutIcon size={14} />
      </button>
      <button
        className="w-7 h-7 rounded-full bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        title="Reset Zoom"
      >
        <ZoomResetIcon size={14} />
      </button>
    </div>
  );
}
