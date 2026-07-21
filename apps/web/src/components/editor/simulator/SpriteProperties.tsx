import React from 'react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { XArrowIcon, YArrowIcon, EyeOpenIcon, EyeClosedIcon } from './ScratchIcons';
import { Tooltip } from '../../ui/Tooltip';

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
      <Tooltip content="Sprite Name" position="top">
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
      </Tooltip>

      {/* X Coordinate */}
      <Tooltip content="Horizontal X Position (-240 to 240)" position="top">
        <div className="scratch-info-group">
          <XArrowIcon
            size={14}
            className="scratch-x-icon"
            style={{ color: 'var(--scratch-blue)' }}
          />
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
      </Tooltip>

      {/* Y Coordinate */}
      <Tooltip content="Vertical Y Position (-180 to 180)" position="top">
        <div className="scratch-info-group">
          <YArrowIcon
            size={14}
            className="scratch-y-icon"
            style={{ color: 'var(--scratch-blue)' }}
          />
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
      </Tooltip>

      {/* Show/Hide Toggle */}
      <div className="scratch-info-group">
        <span className="scratch-info-label">Show</span>
        <div className="scratch-toggle-group">
          <Tooltip content="Show Sprite on Stage" position="top">
            <div
              onClick={() => toggleVisible(true)}
              className={`scratch-toggle-btn ${activeSprite.visible ? 'active' : ''}`}
            >
              <EyeOpenIcon size={16} />
            </div>
          </Tooltip>
          <Tooltip content="Hide Sprite on Stage" position="top">
            <div
              onClick={() => toggleVisible(false)}
              className={`scratch-toggle-btn ${!activeSprite.visible ? 'active' : ''}`}
            >
              <EyeClosedIcon size={16} />
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Size */}
      <Tooltip content="Sprite Scale Percentage" position="top">
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
      </Tooltip>

      {/* Direction */}
      <Tooltip content="Sprite Angle Direction (degrees)" position="top">
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
      </Tooltip>
    </div>
  );
}
