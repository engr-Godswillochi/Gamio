import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../lib/api';

export default function UserProfile({ username = 'CyberRunner', onPlayGame, onBackClick }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(apiUrl(`/u/${encodeURIComponent(username)}`));
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.warn('Failed to load profile:', err);
      }
    }
    loadProfile();
  }, [username]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#07040d] text-white p-8 flex items-center justify-center">
        <div className="text-cyan-400 font-mono animate-pulse">Loading Arcade Profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07040d] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-purple-900/40 bg-[#0d071a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <button
          onClick={onBackClick}
          className="text-xs font-bold text-purple-300 hover:text-white px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-800/60 transition-all"
        >
          ← Back to Feed
        </button>
        <span className="font-display font-extrabold text-sm text-cyan-400">ARCADE PROFILE</span>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl w-full mx-auto p-6 space-y-8">
        {/* Profile Card Hero */}
        <div className="bg-[#0f091f]/90 border border-purple-900/40 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-fuchsia-600 p-1 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full rounded-xl bg-purple-950 flex items-center justify-center text-3xl">
                🎮
              </div>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h2 className="text-2xl font-black text-white">{profile.username}</h2>
              <div className="flex items-center space-x-2 text-xs text-purple-300/80">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50 font-bold">
                  ⚡ {profile.reputationScore} REPUTATION
                </span>
                <span>•</span>
                <span>{profile.createdCount} Games Created</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wider">Earned Badges</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {profile.badges.map((badge) => (
              <div
                key={badge.id}
                className="bg-[#0f091f]/90 border border-purple-900/40 rounded-xl p-4 flex items-center space-x-4 shadow-lg hover:border-cyan-500/50 transition-all"
              >
                <span className="text-3xl">{badge.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{badge.name}</div>
                  <div className="text-xs text-purple-300/70">{badge.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Created Games Showcase */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wider">Created Games</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.createdGames.map((game) => (
              <div
                key={game.id}
                className="bg-[#0f091f]/90 border border-purple-900/40 rounded-xl p-5 flex items-center justify-between shadow-lg hover:border-purple-600 transition-all"
              >
                <div>
                  <h4 className="font-extrabold text-white text-base">{game.title}</h4>
                  <div className="text-xs text-purple-400/60 mt-1 flex items-center space-x-2">
                    <span className="uppercase font-mono">{game.template}</span>
                    <span>•</span>
                    <span>▶ {game.play_count || 0} plays</span>
                  </div>
                </div>
                <button
                  onClick={() => onPlayGame && onPlayGame(game.slug)}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  ▶ Play
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
