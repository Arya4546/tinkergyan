import React from 'react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import {
  GreenFlagIcon,
  StopIcon,
  SmallStageIcon,
  LargeStageIcon,
  FullscreenIcon,
  ResetIcon,
} from './ScratchIcons';
import { Tooltip } from '../../ui/Tooltip';
import { scratchEngine } from './ScratchEngine';

interface ScratchControlBarProps {
  /** Called when the user confirms resetting the project back to a blank slate. */
  onReset?: (() => void) | undefined;
}

/**
 * ScratchControlBar — Top control bar with green flag, stop button, and stage view toggles.
 */
export function ScratchControlBar({ onReset }: ScratchControlBarProps) {
  const { isRunning, startSimulation, stopSimulation, stageViewMode, setStageViewMode } =
    useSimulatorStore();

  /**
   * Stop the engine directly, then clear the flag state.
   *
   * Going through `isRunning` alone is not enough any more: "when key pressed"
   * and "when this sprite clicked" scripts start themselves without the green
   * flag, so `isRunning` is already false while they run and setting it false
   * again changes nothing — the effect that calls the engine would never fire
   * and Stop would do nothing at all for those scripts.
   */
  const handleStop = () => {
    scratchEngine.stop();
    stopSimulation();
  };

  return (
    <div className="scratch-control-bar">
      {/* Left: Flag + Stop + Reset */}
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
          <div onClick={handleStop} className={`scratch-stop-btn ${isRunning ? 'running' : ''}`}>
            <StopIcon size={20} />
          </div>
        </Tooltip>
        {onReset && (
          <Tooltip content="Reset Project (removes all blocks & sprites)" position="bottom">
            <div onClick={onReset} className="scratch-reset-btn">
              <ResetIcon size={16} />
            </div>
          </Tooltip>
        )}
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
