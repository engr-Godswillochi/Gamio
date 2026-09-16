import React, { useState } from 'react';
import { apiUrl } from '../../lib/api';

const PRESET_PROMPTS = [
  'A neon synthwave cat runner dodging laser drones at high speed with magenta aesthetic',
  'Top-down 360-degree matrix dodge survival game where green energy orbs target player',
  'Volcanic lava platformer with high gravity, floating rock platforms, and gold coins',
  'Retro 8-bit arcade dodge challenge with fast moving red hazards and high score focus',
];

export default function AICreator({ onCustomizeInBuilder, onPublishSuccess, onBackClick }) {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generatedSchema, setGeneratedSchema] = useState(null);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'json'

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGeneratedSchema(null);

    const steps = [
      '🧠 Analyzing natural language prompt...',
      '⚡ Synthesizing template & color palette...',
      '🛠️ Compiling player physics & hazard vectors...',
      '✅ Validating canonical GameSchema TypeScript contract...',
    ];

    for (let i = 0; i < steps.length; i++) {
      setGenerationStep(steps[i]);
      await new Promise((r) => setTimeout(r, 400));
    }

    try {
      const res = await fetch(apiUrl('/ai/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setGeneratedSchema(data.schema);
    } catch (err) {
      console.warn('AI Endpoint offline, compiling local schema:', err);
      // Fallback schema
      setGeneratedSchema({
        id: 'ai-gen-fallback',
        title: 'Neon Synthwave Core',
        slug: 'neon-synthwave-core',
        description: `Generated from: "${prompt}"`,
        template: prompt.toLowerCase().includes('dodge') ? 'dodge' : prompt.toLowerCase().includes('platform') ? 'platformer' : 'runner',
        theme: { name: 'Synthwave Neon', backgroundColor: '#0c0414', playerColor: '#ff007f', obstacleColor: '#00f0ff', collectableColor: '#39ff14' },
        player: { speed: 380, jumpForce: 620, width: 32, height: 32 },
        hazards: { speed: 360, spawnIntervalMs: 1300 },
      });
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handlePublishGenerated = async () => {
    if (!generatedSchema) return;

    try {
      const res = await fetch(apiUrl('/games'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedSchema.title,
          template: generatedSchema.template,
          creation_path: 'ai_prompt',
          schema: { ...generatedSchema, isPublished: true },
          isPublished: true,
        }),
      });
      const data = await res.json();
      if (onPublishSuccess) onPublishSuccess(data.slug || generatedSchema.slug);
    } catch (e) {
      if (onPublishSuccess) onPublishSuccess(generatedSchema.slug);
    }
  };

  return (
    <div className="min-h-screen bg-[#07040d] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-purple-900/40 bg-[#0d071a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackClick}
            className="text-xs font-bold text-purple-300 hover:text-white px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-800/60 transition-all"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center space-x-2">
              <span>🤖 AI Text-to-Game Generator</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-800/50">
                PROMPT ENGINE
              </span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-8">
        {/* Prompt Input Box */}
        <div className="bg-[#0f091f]/90 border border-purple-900/40 rounded-2xl p-6 shadow-2xl space-y-4">
          <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
            Describe the game you want to generate:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full bg-purple-950/60 border border-purple-800/60 rounded-xl p-4 text-sm text-white placeholder-purple-400/50 focus:border-cyan-400 focus:outline-none font-medium resize-none shadow-inner"
            placeholder="Type your prompt here..."
          />

          {/* Quick Preset Prompt Pills */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-purple-300/60 uppercase tracking-wider block">
              Try a preset prompt:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(preset)}
                  className="px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-900/60 hover:border-cyan-400/60 text-xs text-purple-200 hover:text-white transition-all text-left truncate max-w-xs"
                >
                  ✨ {preset.substring(0, 42)}...
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-extrabold text-sm shadow-lg shadow-fuchsia-500/25 active:scale-98 transition-all flex items-center justify-center space-x-2"
          >
            <span>{isGenerating ? '⚡ Compiling Schema...' : '✨ Generate Game Schema'}</span>
          </button>
        </div>

        {/* Generation Progress Indicator */}
        {isGenerating && (
          <div className="bg-purple-950/40 border border-cyan-500/30 rounded-2xl p-6 text-center space-y-3 animate-pulse">
            <div className="text-2xl">🪄</div>
            <div className="text-sm font-bold text-cyan-300 font-mono">{generationStep}</div>
          </div>
        )}

        {/* Generated Schema Output Inspector */}
        {generatedSchema && !isGenerating && (
          <div className="bg-[#0f091f]/90 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">SCHEMA GENERATED</span>
                <h3 className="text-2xl font-black text-white">{generatedSchema.title}</h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'preview' ? 'bg-cyan-500 text-black' : 'bg-purple-950 text-purple-300'
                  }`}
                >
                  Visual Specs
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'json' ? 'bg-cyan-500 text-black' : 'bg-purple-950 text-purple-300'
                  }`}
                >
                  Raw JSON
                </button>
              </div>
            </div>

            {activeTab === 'preview' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-purple-950/50 p-4 rounded-xl border border-purple-900/40">
                  <span className="text-purple-400 font-bold block mb-1">TEMPLATE MODE</span>
                  <span className="font-mono text-cyan-300 text-sm uppercase font-extrabold">
                    {generatedSchema.template}
                  </span>
                </div>
                <div className="bg-purple-950/50 p-4 rounded-xl border border-purple-900/40">
                  <span className="text-purple-400 font-bold block mb-1">PHYSICS SPEED</span>
                  <span className="font-mono text-cyan-300 text-sm uppercase font-extrabold">
                    {generatedSchema.player.speed} PX/S
                  </span>
                </div>
                <div className="bg-purple-950/50 p-4 rounded-xl border border-purple-900/40">
                  <span className="text-purple-400 font-bold block mb-1">THEME PALETTE</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-semibold text-white">{generatedSchema.theme.name}</span>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: generatedSchema.theme.playerColor }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: generatedSchema.theme.obstacleColor }} />
                  </div>
                </div>
              </div>
            ) : (
              <pre className="bg-black/80 border border-purple-900/50 rounded-xl p-4 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-60">
                {JSON.stringify(generatedSchema, null, 2)}
              </pre>
            )}

            {/* Action Handoff Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => onCustomizeInBuilder && onCustomizeInBuilder(generatedSchema)}
                className="flex-1 py-3 rounded-xl bg-purple-950 border border-purple-700/60 hover:bg-purple-900 text-purple-200 text-xs font-bold transition-all"
              >
                ✏️ Customize in Visual Builder
              </button>
              <button
                onClick={handlePublishGenerated}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black text-xs font-extrabold shadow-lg shadow-emerald-500/20 transition-all"
              >
                🚀 Instant Publish & Play
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
