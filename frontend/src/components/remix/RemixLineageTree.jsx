import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../lib/api';

export default function RemixLineageTree({ gameId, onSelectGame }) {
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    async function fetchTree() {
      try {
        const res = await fetch(apiUrl(`/remix/tree/${encodeURIComponent(gameId)}`));
        const data = await res.json();
        setTreeData(data);
      } catch (err) {
        console.warn('Failed to fetch remix tree:', err);
      }
    }
    if (gameId) fetchTree();
  }, [gameId]);

  if (!treeData) return null;

  const { current, parent, children } = treeData;

  return (
    <div className="bg-[#0f091f]/90 border border-purple-900/40 rounded-2xl p-4 shadow-xl space-y-3">
      <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
        <span>🔄 Remix Lineage Tree</span>
      </h4>

      <div className="flex flex-col items-center space-y-2 text-xs">
        {/* Parent Ancestor */}
        {parent ? (
          <button
            onClick={() => onSelectGame && onSelectGame(parent.slug)}
            className="w-full p-2 rounded-lg bg-purple-950/60 border border-purple-800/50 hover:border-cyan-400 transition-all text-left flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] text-purple-400 font-bold">ORIGIN PARENT</div>
              <div className="font-semibold text-white">{parent.title}</div>
            </div>
            <span className="text-[10px] bg-purple-900 text-purple-200 px-2 py-0.5 rounded">
              {parent.play_count || 0} plays
            </span>
          </button>
        ) : (
          <div className="text-[10px] text-purple-400/60 font-semibold uppercase tracking-wider">
            👑 Root Original Game (No Parents)
          </div>
        )}

        {/* Tree Line Connector */}
        <div className="w-0.5 h-4 bg-gradient-to-b from-purple-500 to-cyan-400" />

        {/* Current Game */}
        <div className="w-full p-2.5 rounded-xl bg-gradient-to-r from-purple-900/60 to-cyan-950/60 border border-cyan-400 text-left">
          <div className="text-[10px] text-cyan-300 font-extrabold uppercase">CURRENT GAME</div>
          <div className="font-bold text-white text-sm">{current?.title || 'Active Game'}</div>
        </div>

        {/* Children Remixes */}
        {children && children.length > 0 && (
          <React.Fragment>
            <div className="w-0.5 h-4 bg-gradient-to-b from-cyan-400 to-fuchsia-500" />
            <div className="w-full space-y-1.5">
              <div className="text-[10px] text-purple-300/70 font-bold text-center">
                COMMUNITY REMIXES ({children.length})
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onSelectGame && onSelectGame(child.slug)}
                    className="p-2 rounded-lg bg-purple-950/40 border border-purple-900/40 hover:border-fuchsia-400 transition-all text-left flex items-center justify-between"
                  >
                    <span className="font-medium text-purple-200 truncate">{child.title}</span>
                    <span className="text-[10px] text-fuchsia-400 font-mono">▶ Play</span>
                  </button>
                ))}
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}
