import React, { useState } from 'react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { AddSpriteModal } from './AddSpriteModal';
import { DeleteIcon, AddSpriteIcon } from './ScratchIcons';
import { Tooltip } from '../../ui/Tooltip';

/**
 * SpriteList — Scratch-style grid of sprite thumbnail cards.
 */
export function SpriteList() {
  const { sprites, activeSpriteId, setActiveSprite, removeSprite } = useSimulatorStore();
  const [showAddModal, setShowAddModal] = useState(false);

  // Get a display initial or type icon for sprite thumbnails if no image
  const getSpriteThumbContent = (sprite: (typeof sprites)[0]) => {
    if (sprite.image) {
      return <img src={sprite.image} alt={sprite.name} />;
    }

    const typeIcons: Record<string, string> = {
      led: '💡',
      button: '🔘',
      servo: '⚙️',
      potentiometer: '🎛️',
      robot_car: '🤖',
      board: '🔌',
    };
    return <span style={{ fontSize: '24px' }}>{typeIcons[sprite.type] || '📦'}</span>;
  };

  return (
    <>
      <div className="scratch-sprite-list">
        {sprites.map((sprite) => (
          <div
            key={sprite.id}
            onClick={() => setActiveSprite(sprite.id)}
            className={`scratch-item-card ${activeSpriteId === sprite.id ? 'selected' : ''}`}
          >
            <div className="scratch-item-thumb">{getSpriteThumbContent(sprite)}</div>
            <div className="scratch-item-name">{sprite.name}</div>

            <Tooltip content="Delete sprite" position="top" className="scratch-item-delete">
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeSprite(sprite.id);
                }}
              >
                <DeleteIcon size={12} />
              </div>
            </Tooltip>
          </div>
        ))}

        <Tooltip content="Add Sprite" position="top" className="scratch-fab">
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setShowAddModal(true)}
          >
            <AddSpriteIcon size={24} />
          </div>
        </Tooltip>
      </div>

      {/* Add Sprite Modal */}
      {showAddModal && <AddSpriteModal onClose={() => setShowAddModal(false)} />}
    </>
  );
}
