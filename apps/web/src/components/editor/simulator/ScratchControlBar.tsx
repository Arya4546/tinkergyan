import React from 'react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import {
  GreenFlagIcon,
  StopIcon,
  SmallStageIcon,
  LargeStageIcon,
  FullscreenIcon,
} from './ScratchIcons';

/**
 * ScratchControlBar — Top control bar with green flag, stop button, and stage view toggles.
 */
export function ScratchControlBar() {
  const { isRunning, startSimulation, stopSimulation, stageViewMode, setStageViewMode } =
    useSimulatorStore();

  return (
    <div className="scratch-control-bar">
      {/* Left: Flag + Stop */}
      <div className="scratch-flag-stop">
        <div
          onClick={startSimulation}
          className={`scratch-flag-btn ${isRunning ? 'running' : ''}`}
          title="Go"
        >
          <GreenFlagIcon size={20} />
        </div>
        <div
          onClick={stopSimulation}
          className={`scratch-stop-btn ${isRunning ? 'running' : ''}`}
          title="Stop"
        >
          <StopIcon size={20} />
        </div>
      </div>

      {/* Right: View mode toggles */}
      <div className="scratch-view-toggles">
        <div
          onClick={() => setStageViewMode('small')}
          className={`scratch-view-btn ${stageViewMode === 'small' ? 'active' : ''}`}
          title="Small Stage"
        >
          <SmallStageIcon size={20} />
        </div>
        <div
          onClick={() => setStageViewMode('large')}
          className={`scratch-view-btn ${stageViewMode === 'large' ? 'active' : ''}`}
          title="Large Stage"
        >
          <LargeStageIcon size={20} />
        </div>
        <div
          onClick={() => setStageViewMode('fullscreen')}
          className={`scratch-view-btn ${stageViewMode === 'fullscreen' ? 'active' : ''}`}
          title="Fullscreen"
        >
          <FullscreenIcon size={20} />
        </div>
      </div>
    </div>
  );
}
