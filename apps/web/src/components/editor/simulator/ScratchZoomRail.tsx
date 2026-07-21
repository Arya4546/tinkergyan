import React from 'react';
import { ZoomInIcon, ZoomOutIcon, ZoomResetIcon } from './ScratchIcons';
import { Tooltip } from '../../ui/Tooltip';

/**
 * ScratchZoomRail — Vertical zoom controls overlaid on the stage canvas.
 * Three buttons: zoom in (+), zoom out (−), and reset/fit (=).
 */
export function ScratchZoomRail() {
  return (
    <div className="flex flex-col gap-1">
      <Tooltip content="Zoom In (+)" position="left">
        <button className="w-7 h-7 rounded-full bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <ZoomInIcon size={14} />
        </button>
      </Tooltip>
      <Tooltip content="Zoom Out (-)" position="left">
        <button className="w-7 h-7 rounded-full bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <ZoomOutIcon size={14} />
        </button>
      </Tooltip>
      <Tooltip content="Reset Zoom & Center" position="left">
        <button className="w-7 h-7 rounded-full bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <ZoomResetIcon size={14} />
        </button>
      </Tooltip>
    </div>
  );
}
