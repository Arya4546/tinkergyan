import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { ScratchControlBar } from './ScratchControlBar';
import { StageCanvas } from './StageCanvas';
import { SpriteProperties } from './SpriteProperties';
import { SpriteList } from './SpriteList';
import { ScratchBackdropPanel } from './ScratchBackdropPanel';
import { ExitFullscreenIcon } from './ScratchIcons';
import './scratch-stage.css';

interface StagePanelProps {
  /** Called when the user confirms resetting the project back to a blank slate. */
  onReset?: () => void;
}

/**
 * StagePanel — Root container for the Scratch-style Stage & Sprite Management panel.
 */
export function StagePanel({ onReset }: StagePanelProps) {
  const { stageViewMode, setStageViewMode } = useSimulatorStore();

  // ESC key to exit fullscreen
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stageViewMode === 'fullscreen') {
        setStageViewMode('large');
      }
    },
    [stageViewMode, setStageViewMode],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Fullscreen Overlay ────────────────────────────────────────────────
  if (stageViewMode === 'fullscreen') {
    return createPortal(
      <div className="scratch-fullscreen-overlay">
        <div className="scratch-fullscreen-stage">
          <div className="scratch-fullscreen-canvas">
            <StageCanvas />
          </div>
        </div>

        <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setStageViewMode('large')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            <ExitFullscreenIcon size={16} />
            Exit Fullscreen
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  // ── Normal Layout (small or large stage) ──────────────────────────────
  return (
    <div className="scratch-panel-root">
      {/* Top: Stage Area */}
      <div className="scratch-stage-area">
        <ScratchControlBar onReset={onReset} />
        <div className="scratch-stage-canvas-container">
          <div
            className="scratch-stage-canvas"
            style={{ maxWidth: stageViewMode === 'small' ? '240px' : '480px' }}
          >
            <StageCanvas />
          </div>
        </div>
      </div>

      {/* Bottom: Sprite Management Area */}
      <div className="scratch-sprite-area">
        <SpriteProperties />
        <div className="scratch-bottom-panels">
          <SpriteList />
          <ScratchBackdropPanel />
        </div>
      </div>
    </div>
  );
}
