import React from 'react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { XArrowIcon, YArrowIcon, EyeOpenIcon, EyeClosedIcon } from './ScratchIcons';

/**
 * SpriteProperties — Scratch-style horizontal info bar.
 */
export function SpriteProperties() {
  const { sprites, activeSpriteId, updateSprite } = useSimulatorStore();

  const activeSprite = sprites.find((s) => s.id === activeSpriteId);

  if (!activeSprite) {
    return (
      <div
        className="scratch-info-bar"
        style={{ justifyContent: 'center', color: 'var(--scratch-text-light)' }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Select a sprite to edit</span>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    if (['x', 'y', 'size', 'direction'].includes(name)) {
      parsedValue = parseFloat(value) || 0;
    }
    updateSprite(activeSprite.id, { [name]: parsedValue });
  };

  const toggleVisible = (visible: boolean) => {
    updateSprite(activeSprite.id, { visible });
  };

  return (
    <div className="scratch-info-bar">
      {/* Sprite Name */}
      <div className="scratch-info-group">
        <span className="scratch-info-label">Sprite</span>
        <input
          name="name"
          value={activeSprite.name}
          onChange={handleChange}
          className="scratch-input"
          style={{ width: '80px' }}
        />
      </div>

      {/* X Coordinate */}
      <div className="scratch-info-group">
        <XArrowIcon size={14} className="scratch-x-icon" style={{ color: 'var(--scratch-blue)' }} />
        <span className="scratch-info-label">x</span>
        <input
          name="x"
          type="number"
          value={activeSprite.x}
          onChange={handleChange}
          className="scratch-input"
          style={{ width: '56px' }}
        />
      </div>

      {/* Y Coordinate */}
      <div className="scratch-info-group">
        <YArrowIcon size={14} className="scratch-y-icon" style={{ color: 'var(--scratch-blue)' }} />
        <span className="scratch-info-label">y</span>
        <input
          name="y"
          type="number"
          value={activeSprite.y}
          onChange={handleChange}
          className="scratch-input"
          style={{ width: '56px' }}
        />
      </div>

      {/* Show/Hide Toggle */}
      <div className="scratch-info-group">
        <span className="scratch-info-label">Show</span>
        <div className="scratch-toggle-group">
          <div
            onClick={() => toggleVisible(true)}
            className={`scratch-toggle-btn ${activeSprite.visible ? 'active' : ''}`}
            title="Show sprite"
          >
            <EyeOpenIcon size={16} />
          </div>
          <div
            onClick={() => toggleVisible(false)}
            className={`scratch-toggle-btn ${!activeSprite.visible ? 'active' : ''}`}
            title="Hide sprite"
          >
            <EyeClosedIcon size={16} />
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="scratch-info-group">
        <span className="scratch-info-label">Size</span>
        <input
          name="size"
          type="number"
          value={activeSprite.size}
          onChange={handleChange}
          className="scratch-input"
          style={{ width: '50px' }}
        />
      </div>

      {/* Direction */}
      <div className="scratch-info-group">
        <span className="scratch-info-label">Direction</span>
        <input
          name="direction"
          type="number"
          value={activeSprite.direction}
          onChange={handleChange}
          className="scratch-input"
          style={{ width: '50px' }}
        />
      </div>
    </div>
  );
}
