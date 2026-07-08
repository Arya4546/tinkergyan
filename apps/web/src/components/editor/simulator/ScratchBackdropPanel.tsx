import React from 'react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { AddBackdropIcon } from './ScratchIcons';

/**
 * ScratchBackdropPanel — Narrow right-side panel showing current backdrop.
 */
export function ScratchBackdropPanel() {
  const { backdrop, backdropCount, setBackdrop } = useSimulatorStore();

  return (
    <div className="scratch-backdrop-panel">
      {/* Label */}
      <span
        style={{
          fontSize: '0.65rem',
          fontWeight: 'bold',
          color: 'var(--scratch-text)',
          marginBottom: '8px',
          letterSpacing: '0.5px',
        }}
      >
        STAGE
      </span>

      {/* Backdrop Thumbnail */}
      <div
        onClick={() => {
          // Cycle through backdrops on click
          const options = ['white', 'grid', 'breadboard', 'space'];
          const idx = options.indexOf(backdrop);
          setBackdrop(options[(idx + 1) % options.length] ?? 'white');
        }}
        className="scratch-item-card"
        style={{
          width: '64px',
          height: '64px',
          padding: '4px',
          cursor: 'pointer',
          marginBottom: '8px',
        }}
      >
        <div
          className="scratch-backdrop-thumbnail"
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid var(--scratch-border)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          {backdrop === 'white' && (
            <div style={{ width: '100%', height: '100%', backgroundColor: 'white' }} />
          )}
          {backdrop === 'grid' && (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'white',
                backgroundImage:
                  'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjAuNSIgZmlsbD0iI2NiZDVlMSIvPjwvc3ZnPg==")',
                backgroundRepeat: 'repeat',
              }}
            />
          )}
          {backdrop === 'breadboard' && (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#fef3c7' }} />
          )}
          {backdrop === 'space' && (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#0f172a' }} />
          )}
        </div>
      </div>

      {/* Backdrops counter */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--scratch-text-light)' }}>Backdrops</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--scratch-text)' }}>
          {backdropCount}
        </span>
      </div>

      {/* Add Backdrop FAB */}
      <div
        className="scratch-fab"
        style={{ width: '40px', height: '40px', bottom: '12px', right: '12px' }}
        title="Add Backdrop"
      >
        <AddBackdropIcon size={20} />
      </div>
    </div>
  );
}
