import React from 'react';
import { ZoomInIcon, ZoomOutIcon, ZoomResetIcon } from './ScratchIcons';
import { Tooltip } from '../../ui/Tooltip';
import { useSimulatorStore } from '../../../stores/simulator.store';

/**
 * ScratchZoomRail — Vertical zoom controls overlaid on the stage canvas.
 * Three buttons: zoom in (+), zoom out (−), and reset/fit (=).
 */
export function ScratchZoomRail() {
  const stageZoom = useSimulatorStore((s) => s.stageZoom);
  const zoomIn = useSimulatorStore((s) => s.zoomIn);
  const zoomOut = useSimulatorStore((s) => s.zoomOut);
  const resetZoom = useSimulatorStore((s) => s.resetZoom);

  return (
    <div className="flex flex-col gap-1 items-center" style={{ pointerEvents: 'auto' }}>
      <Tooltip content="Zoom In (+)" position="left">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            zoomIn();
          }}
          disabled={stageZoom >= 2}
          className="w-8 h-8 rounded-full bg-ed-raised border border-ed-line shadow-md flex items-center justify-center text-ed-mid hover:text-ed-hi hover:bg-ed-panel transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ZoomInIcon size={14} />
        </button>
      </Tooltip>
      <span className="text-[10px] font-bold text-ed-mid tabular-nums">
        {Math.round(stageZoom * 100)}%
      </span>
      <Tooltip content="Zoom Out (-)" position="left">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            zoomOut();
          }}
          disabled={stageZoom <= 0.5}
          className="w-8 h-8 rounded-full bg-ed-raised border border-ed-line shadow-md flex items-center justify-center text-ed-mid hover:text-ed-hi hover:bg-ed-panel transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ZoomOutIcon size={14} />
        </button>
      </Tooltip>
      <Tooltip content="Reset Zoom & Center" position="left">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
          }}
          className="w-8 h-8 rounded-full bg-ed-raised border border-ed-line shadow-md flex items-center justify-center text-ed-mid hover:text-ed-hi hover:bg-ed-panel transition-colors"
        >
          <ZoomResetIcon size={14} />
        </button>
      </Tooltip>
    </div>
  );
}
