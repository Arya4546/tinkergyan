import React, { useState } from 'react';
import { useSimulatorStore } from '../../../stores/simulator.store';
import { AddSpriteModal } from './AddSpriteModal';
import { DeleteIcon, AddSpriteIcon } from './ScratchIcons';

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

            <div
              className="scratch-item-delete"
              onClick={(e) => {
                e.stopPropagation();
                removeSprite(sprite.id);
              }}
              title="Delete sprite"
            >
              <DeleteIcon size={12} />
            </div>
          </div>
        ))}

        <div className="scratch-fab" onClick={() => setShowAddModal(true)} title="Add Sprite">
          <AddSpriteIcon size={24} />
        </div>
      </div>

      {/* Add Sprite Modal */}
      {showAddModal && <AddSpriteModal onClose={() => setShowAddModal(false)} />}
    </>
  );
}
