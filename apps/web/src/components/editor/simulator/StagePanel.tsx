import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { ScratchControlBar } from './ScratchControlBar';
import { StageCanvas } from './StageCanvas';
import { SpriteProperties } from './SpriteProperties';
import { SpriteList } from './SpriteList';
import { ScratchBackdropPanel } from './ScratchBackdropPanel';
import { AIWebcamOverlay } from '../AIWebcamOverlay';
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

        {/* Positioned absolutely (not in the flex flow below the canvas) so it
            stays on screen regardless of the canvas's computed aspect-ratio
            size — a flex-flow button here could get pushed off the viewport
            on some screen sizes with no way to tell it was ever rendered. */}
        <button
          onClick={() => setStageViewMode('large')}
          aria-label="Exit fullscreen"
          title="Exit fullscreen (Esc)"
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 2147483646,
            padding: '10px 18px',
            backgroundColor: '#1E293B',
            color: 'white',
            border: '2px solid #F8FAFC',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}
        >
          <ExitFullscreenIcon size={16} />
          Exit Fullscreen
        </button>
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
        <div
          className="scratch-stage-canvas-container"
          style={{ gap: '12px', alignItems: 'flex-start' }}
        >
          <div
            className="scratch-stage-canvas"
            style={{ maxWidth: stageViewMode === 'small' ? '240px' : '480px' }}
          >
            <StageCanvas />
          </div>
          <AIWebcamOverlay />
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
