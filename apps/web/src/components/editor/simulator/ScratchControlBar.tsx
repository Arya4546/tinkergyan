import React from 'react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import {
  GreenFlagIcon,
  StopIcon,
  SmallStageIcon,
  LargeStageIcon,
  FullscreenIcon,
} from './ScratchIcons';
import { Tooltip } from '../../ui/Tooltip';

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
        <Tooltip content="Go (Run Code)" position="bottom">
          <div
            onClick={startSimulation}
            className={`scratch-flag-btn ${isRunning ? 'running' : ''}`}
          >
            <GreenFlagIcon size={20} />
          </div>
        </Tooltip>
        <Tooltip content="Stop Code Execution" position="bottom">
          <div
            onClick={stopSimulation}
            className={`scratch-stop-btn ${isRunning ? 'running' : ''}`}
          >
            <StopIcon size={20} />
          </div>
        </Tooltip>
      </div>

      {/* Right: View mode toggles */}
      <div className="scratch-view-toggles">
        <Tooltip content="Small Stage View" position="bottom">
          <div
            onClick={() => setStageViewMode('small')}
            className={`scratch-view-btn ${stageViewMode === 'small' ? 'active' : ''}`}
          >
            <SmallStageIcon size={20} />
          </div>
        </Tooltip>
        <Tooltip content="Large Stage View" position="bottom">
          <div
            onClick={() => setStageViewMode('large')}
            className={`scratch-view-btn ${stageViewMode === 'large' ? 'active' : ''}`}
          >
            <LargeStageIcon size={20} />
          </div>
        </Tooltip>
        <Tooltip content="Fullscreen Stage Mode" position="bottom">
          <div
            onClick={() => setStageViewMode('fullscreen')}
            className={`scratch-view-btn ${stageViewMode === 'fullscreen' ? 'active' : ''}`}
          >
            <FullscreenIcon size={20} />
          </div>
        </Tooltip>
      </div>
    </div>
  );
}
