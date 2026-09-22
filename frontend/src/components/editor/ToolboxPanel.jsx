import React from 'react';
import { entityTypeIcon, entityTypeLabel } from '../../types/gameModel';

/**
 * ToolboxPanel — left sidebar listing draggable entity types and a future asset library section.
 */

const ENTITY_TYPES = [
  'player', 'platform', 'wall', 'enemy', 'coin', 'spike', 'goal',
  'powerup', 'text', 'rectangle', 'circle',
];

export default function ToolboxPanel({ onAddEntity }) {
  return (
    <div className="w-56 shrink-0 bg-[#0d071a]/95 border-r border-purple-900/40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-purple-900/30">
        <h3 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Objects</h3>
        <p className="text-[10px] text-purple-400/60 mt-0.5">Click to add to canvas</p>
      </div>

      {/* Entity Type List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {ENTITY_TYPES.map((type) => (
          <button
            key={type}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData('application/gamio-entity-type', type);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => onAddEntity(type)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-purple-900/30 border border-transparent hover:border-purple-700/40 transition-all cursor-grab active:cursor-grabbing group"
            title="Click to add or drag onto canvas"
          >
            <span className="text-lg w-7 text-center shrink-0 pointer-events-none">{entityTypeIcon(type)}</span>
            <span className="text-xs font-semibold text-purple-200 group-hover:text-white transition-colors pointer-events-none">
              {entityTypeLabel(type)}
            </span>
          </button>
        ))}
      </div>

      {/* Assets Section (placeholder) */}
      <div className="px-4 py-3 border-t border-purple-900/30">
        <h3 className="text-[11px] font-bold text-purple-400/60 uppercase tracking-wider">Make it yours</h3>
        <div className="mt-2 text-[10px] text-purple-500/50 text-center py-4 border border-dashed border-purple-800/30 rounded-lg">
          Select an object to change its color, size, and movement. Add rules with the Logic button.
        </div>
      </div>
    </div>
  );
}
