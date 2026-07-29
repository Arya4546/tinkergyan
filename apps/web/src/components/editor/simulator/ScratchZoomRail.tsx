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
        <button className="w-7 h-7 rounded-full bg-ed-raised border border-ed-line shadow-sm flex items-center justify-center text-ed-mid hover:text-ed-hi hover:bg-ed-panel transition-colors">
          <ZoomInIcon size={14} />
        </button>
      </Tooltip>
      <Tooltip content="Zoom Out (-)" position="left">
        <button className="w-7 h-7 rounded-full bg-ed-raised border border-ed-line shadow-sm flex items-center justify-center text-ed-mid hover:text-ed-hi hover:bg-ed-panel transition-colors">
          <ZoomOutIcon size={14} />
        </button>
      </Tooltip>
      <Tooltip content="Reset Zoom & Center" position="left">
        <button className="w-7 h-7 rounded-full bg-ed-raised border border-ed-line shadow-sm flex items-center justify-center text-ed-mid hover:text-ed-hi hover:bg-ed-panel transition-colors">
          <ZoomResetIcon size={14} />
        </button>
      </Tooltip>
    </div>
  );
}
