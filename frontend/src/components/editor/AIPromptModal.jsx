import React, { useState } from 'react';
import { apiUrl } from '../../lib/api';

/**
 * AIPromptModal — In-editor AI Co-Creator assistant.
 * Provides quick AI patch templates & natural language prompt input.
 */

const QUICK_PROMPTS = [
  { label: '🚀 Moon Gravity & Super Jump', prompt: 'Set moon gravity and super jump' },
  { label: '🪙 Add Line of Coins', prompt: 'Add floating line of coins across the stage' },
  { label: '👾 Add Patrolling Enemies', prompt: 'Add patrolling enemies' },
  { label: '🎨 Cyberpunk Neon Aesthetic', prompt: 'Apply Cyberpunk Neon aesthetic' },
  { label: '🌅 Synthwave Sunset Theme', prompt: 'Apply Synthwave Sunset theme' },
  { label: '🌋 Volcanic Lava Theme', prompt: 'Apply Volcanic Inferno lava theme' },
  { label: '🏁 Add Goal Portal', prompt: 'Add goal portal' },
];

export default function AIPromptModal({ schema, onApplyPatch, onClose }) {
  const [promptText, setPromptText] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleSendPrompt = async (textToSend) => {
    const query = textToSend || promptText;
    if (!query.trim()) return;

    setIsApplying(true);
    setStatusMsg('✨ AI is generating schema modifications...');

    try {
      const res = await fetch(apiUrl('/ai/patch-schema'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, schema }),
      });
      const data = await res.json();
      setIsApplying(false);

      if (data.schema) {
        onApplyPatch(data.schema, `AI Prompt: "${query}"`);
        setStatusMsg('✅ Applied AI changes!');
        setTimeout(() => onClose?.(), 600);
      } else {
        setStatusMsg('⚠️ Could not generate patch. Try another prompt.');
      }
    } catch {
      setIsApplying(false);
      setStatusMsg('⚠️ Server connection error. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0d071a] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div>
              <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">AI Game Co-Creator</h2>
              <p className="text-[11px] text-purple-300/70">Type any prompt to modify gravity, theme, entities, or rules</p>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-400 hover:text-white text-xs px-2 py-1">
            ✕
          </button>
        </div>

        {/* Quick prompt chips */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Quick Suggestions</label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                disabled={isApplying}
                onClick={() => handleSendPrompt(qp.prompt)}
                className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/40 hover:border-cyan-500/60 hover:bg-purple-900/40 text-purple-200 hover:text-cyan-300 text-xs transition-all text-left"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="flex flex-col gap-2 pt-2 border-t border-purple-900/30"
        >
          <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Custom AI Prompt</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promptText}
              disabled={isApplying}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder='e.g., "Add 3 coins and set gravity to moon gravity"'
              className="flex-1 bg-purple-950/80 border border-purple-800/60 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-400/50 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isApplying || !promptText.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-40 text-black font-extrabold text-xs transition-all flex items-center gap-1 shadow-lg"
            >
              {isApplying ? '...' : 'Generate ✨'}
            </button>
          </div>
        </form>

        {/* Status indicator */}
        {statusMsg && (
          <div className="text-center text-xs font-semibold text-cyan-300 animate-pulse pt-1">
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}
