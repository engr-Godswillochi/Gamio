import React from 'react';
import { createBlankGame, createPlatformerTemplate, createDodgeTemplate, createRunnerTemplate } from '../../types/gameModel';

/**
 * CreateGameModal — entry point for game creation.
 * Offers: Blank Game, Templates, and placeholders for Remix/AI.
 */
export default function CreateGameModal({ onStartEditor, onBack }) {
  const templates = [
    {
      id: 'platformer',
      title: 'Platformer',
      icon: '🧩',
      desc: 'Jump across platforms, collect coins, and reach the goal.',
      color: 'from-cyan-500 to-blue-600',
      factory: createPlatformerTemplate,
    },
    {
      id: 'runner',
      title: 'Runner',
      icon: '🏃',
      desc: 'Auto-scrolling obstacle course. Jump over hazards and collect coins.',
      color: 'from-fuchsia-500 to-purple-600',
      factory: createRunnerTemplate,
    },
    {
      id: 'dodge',
      title: 'Dodge Arena',
      icon: '🎯',
      desc: 'Top-down survival. Navigate to avoid enemies and collect all coins.',
      color: 'from-red-500 to-orange-600',
      factory: createDodgeTemplate,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07040d] text-white flex flex-col" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="border-b border-purple-900/40 bg-[#0d071a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-xs font-bold text-purple-300 hover:text-white px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-800/60 transition-all">
            ← Back
          </button>
          <h1 className="text-xl font-extrabold text-white">Create New Game</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-8 space-y-10">
        {/* Blank Game */}
        <section>
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">Start Fresh</h2>
          <button
            onClick={() => onStartEditor(createBlankGame())}
            className="w-full p-6 rounded-2xl border-2 border-dashed border-purple-700/50 hover:border-cyan-400/60 bg-purple-950/20 hover:bg-purple-950/40 transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-purple-700/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                ✨
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">Blank Game</h3>
                <p className="text-xs text-purple-300/70 mt-0.5">Empty canvas with a player. Build anything from scratch.</p>
              </div>
            </div>
          </button>
        </section>

        {/* Templates */}
        <section>
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">Start from Template</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onStartEditor(tpl.factory())}
                className="p-5 rounded-2xl border border-purple-900/40 bg-[#0f091f]/80 hover:border-purple-600 transition-all text-left group flex flex-col gap-3"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tpl.color} flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {tpl.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{tpl.title}</h3>
                  <p className="text-[11px] text-purple-300/60 mt-1 leading-relaxed">{tpl.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* AI Creation (placeholder) */}
        <section>
          <h2 className="text-sm font-bold text-purple-400/60 uppercase tracking-wider mb-4">AI Assisted</h2>
          <div className="p-5 rounded-2xl border border-purple-900/30 bg-purple-950/10 opacity-60">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-950/50 border border-purple-800/40 flex items-center justify-center text-2xl">
                🤖
              </div>
              <div>
                <h3 className="text-sm font-bold text-purple-300">Create with AI</h3>
                <p className="text-[11px] text-purple-400/50 mt-0.5">Describe your game and let AI build it. Coming in Phase 7.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
