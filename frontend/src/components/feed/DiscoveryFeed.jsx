import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../lib/api';

export default function DiscoveryFeed({ onPlayGame, onRemixGame }) {
  const [games, setGames] = useState([]);
  const [activeSort, setActiveSort] = useState('trending');
  const [activeTemplate, setActiveTemplate] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ sort: activeSort, template: activeTemplate });
        const res = await fetch(apiUrl(`/feed?${params}`));
        const data = await res.json();
        setGames(data.games || []);
      } catch (err) {
        console.warn('Failed to load feed from backend:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFeed();
  }, [activeSort, activeTemplate]);

  return (
    <section id="trending" className="py-16 px-4 max-w-7xl mx-auto">
      {/* Feed Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-purple-900/40 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-wider flex items-center space-x-3">
            <span>DISCOVERY FEED</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50 uppercase font-mono">
              PHASE 2 LIVE
            </span>
          </h2>
          <p className="text-xs text-purple-300/70 mt-1">Play community games, compete on leaderboards, and remix anything.</p>
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sort Tabs */}
          <div className="flex rounded-xl bg-purple-950/60 p-1 border border-purple-900/50">
            {[
              { id: 'trending', label: '🔥 Trending' },
              { id: 'newest', label: '⚡ Newest' },
              { id: 'remixed', label: '🔄 Most Remixed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSort(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeSort === tab.id
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-purple-300/70 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category Chips */}
          <div className="flex rounded-xl bg-purple-950/60 p-1 border border-purple-900/50">
            {[
              { id: 'all', label: 'All' },
              { id: 'runner', label: 'Runner' },
              { id: 'dodge', label: 'Dodge' },
              { id: 'platformer', label: 'Platformer' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTemplate(cat.id)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTemplate === cat.id
                    ? 'bg-fuchsia-600 text-white'
                    : 'text-purple-300/60 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Games Grid */}
      {isLoading ? (
        <div className="text-center py-16 font-mono text-cyan-400 animate-pulse">Loading games...</div>
      ) : games.length === 0 ? (
        <div className="text-center py-16 text-purple-400/60 font-body">No games found matching filter.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => {
            const schema = game.schema || {};
            const themeColor = schema.theme?.playerColor || '#00f0ff';

            return (
              <div
                key={game.id}
                className="bg-[#0f091f]/90 border border-purple-900/40 rounded-2xl p-5 shadow-xl hover:border-purple-600 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-purple-950 text-cyan-400 border border-purple-800/60">
                      {game.template}
                    </span>
                    <div className="flex items-center space-x-3 text-xs text-purple-300/70 font-mono">
                      <span>▶ {game.play_count || 0}</span>
                      <span>🔄 {game.remix_count || 0}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-purple-300/60 line-clamp-2 mt-1">
                    {schema.description || 'Created using Gamio visual editor.'}
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-2 border-t border-purple-900/30">
                  <button
                    onClick={() => onPlayGame && onPlayGame(game.slug)}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center space-x-1"
                  >
                    <span>▶ PLAY NOW</span>
                  </button>
                  <button
                    onClick={() => onRemixGame && onRemixGame(schema)}
                    className="px-3 py-2 rounded-xl bg-purple-950 border border-purple-800/60 hover:bg-purple-900 text-purple-200 font-bold text-xs transition-all active:scale-95"
                    title="Remix this game in Visual Builder"
                  >
                    🔄
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
