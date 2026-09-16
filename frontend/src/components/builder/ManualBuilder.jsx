import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_RUNNER_SCHEMA, PRESET_THEMES } from '../../types/gameSchema';
import { EndlessRunnerEngine } from '../../engine/templates/endlessRunner';
import { TopDownDodgeEngine } from '../../engine/templates/topDownDodge';
import { PlatformerEngine } from '../../engine/templates/platformer';
import { apiUrl } from '../../lib/api';

export default function ManualBuilder({ initialSchema, onPublishSuccess }) {
  const [schema, setSchema] = useState(initialSchema || DEFAULT_RUNNER_SCHEMA);
  const [activeTab, setActiveTab] = useState('template');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  // Dynamically initialize the correct canvas engine based on template type
  useEffect(() => {
    if (!canvasRef.current) return;

    if (engineRef.current) {
      engineRef.current.detachEvents();
    }

    try {
      const callbacks = {
        onScoreChange: (score) => console.log('Score:', score),
        onGameOver: (finalScore) => console.log('Game over score:', finalScore),
      };

      if (schema.template === 'dodge') {
        engineRef.current = new TopDownDodgeEngine(canvasRef.current, schema, 'builder-preview-seed', callbacks);
      } else if (schema.template === 'platformer') {
        engineRef.current = new PlatformerEngine(canvasRef.current, schema, 'builder-preview-seed', callbacks);
      } else {
        engineRef.current = new EndlessRunnerEngine(canvasRef.current, schema, 'builder-preview-seed', callbacks);
      }
    } catch (e) {
      console.error('Failed to initialize canvas engine:', e);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.detachEvents();
      }
    };
  }, [schema.template]);

  const updateSchema = (updater) => {
    setSchema((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (engineRef.current) {
        engineRef.current.resetGame('builder-preview-seed');
      }
      return next;
    });
  };

  const handleSaveAndPublish = async (isPublished = true) => {
    setIsSaving(true);
    setSaveStatus('Saving game...');
    try {
      const res = await fetch(apiUrl('/games'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: schema.title,
          template: schema.template,
          schema: { ...schema, isPublished },
          remixOfId: schema.remixOfId || null,
          isPublished,
        })
      });
      const data = await res.json();
      setIsSaving(false);
      setSaveStatus(isPublished ? '🚀 Published successfully!' : '💾 Saved draft!');
      if (onPublishSuccess && data.slug) {
        setTimeout(() => onPublishSuccess(data.slug), 800);
      }
    } catch (err) {
      console.error('Failed to publish:', err);
      setIsSaving(false);
      setSaveStatus('⚠️ Saved locally (Backend offline)');
      if (onPublishSuccess && schema.slug) {
        setTimeout(() => onPublishSuccess(schema.slug), 800);
      }
    }
  };

  const handleStartTestPlay = () => {
    if (engineRef.current) {
      engineRef.current.resetGame();
      engineRef.current.startPlay();
    }
  };

  return (
    <div className="min-h-screen bg-[#07040d] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-purple-900/40 bg-[#0d071a]/80 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-cyan-500/20">
            G
          </div>
          <div>
            <input
              type="text"
              value={schema.title}
              onChange={(e) => updateSchema({ title: e.target.value })}
              className="bg-transparent text-xl font-extrabold text-white border-b border-transparent hover:border-purple-500 focus:border-cyan-400 focus:outline-none transition-all px-1"
              placeholder="Name your game..."
            />
            <div className="text-xs text-purple-300/60 px-1 flex items-center space-x-2">
              <span>Visual Builder — Manual Creation</span>
              {schema.remixOfId && (
                <span className="px-2 py-0.5 rounded bg-purple-900/80 text-purple-300 font-mono text-[10px]">
                  🔄 Remixing Game
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {saveStatus && (
            <span className="text-sm font-medium text-cyan-300 animate-pulse">{saveStatus}</span>
          )}
          <button
            onClick={() => handleSaveAndPublish(false)}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-purple-900/30 border border-purple-700/50 hover:bg-purple-800/40 text-purple-200 text-sm font-semibold transition-all"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSaveAndPublish(true)}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-fuchsia-500/25 active:scale-95 transition-all flex items-center space-x-2"
          >
            <span>Publish Game 🚀</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left Column Controls */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex rounded-xl bg-purple-950/40 p-1.5 border border-purple-900/30">
            {[
              { id: 'template', label: '🎮 Template' },
              { id: 'physics', label: '⚡ Physics' },
              { id: 'hazards', label: '🔥 Hazards' },
              { id: 'theme', label: '🎨 Aesthetics' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md'
                    : 'text-purple-300/60 hover:text-purple-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-[#0f091f]/90 border border-purple-900/40 rounded-2xl p-5 flex-1 shadow-xl space-y-5 overflow-y-auto max-h-[600px]">
            {activeTab === 'template' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Choose Game Template</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'runner', title: 'Endless Runner', icon: '🏃‍♂️', desc: 'Dodge ground hazards & flying drones as speed increases over distance.' },
                    { id: 'dodge', title: 'Top-Down Survival', icon: '🎯', desc: 'Navigate 360° to survive incoming hazards targeting your position.' },
                    { id: 'platformer', title: 'Precision Platformer', icon: '🧩', desc: 'Jump across platforms, collect coins, and reach the finish portal.' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => updateSchema({ template: tpl.id })}
                      className={`p-4 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                        schema.template === tpl.id
                          ? 'border-cyan-400 bg-purple-900/40 shadow-lg shadow-cyan-500/10'
                          : 'border-purple-900/40 bg-purple-950/20 hover:border-purple-700'
                      }`}
                    >
                      <span className="text-2xl">{tpl.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-white">{tpl.title}</div>
                        <div className="text-xs text-purple-300/70 mt-0.5">{tpl.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'physics' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Player Physics</h3>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1 text-purple-200">
                    <span>Base Speed</span>
                    <span className="text-cyan-400">{schema.player.speed} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="180"
                    max="650"
                    step="20"
                    value={schema.player.speed}
                    onChange={(e) =>
                      updateSchema((prev) => ({
                        ...prev,
                        player: { ...prev.player, speed: Number(e.target.value) }
                      }))
                    }
                    className="w-full accent-cyan-400 bg-purple-950 rounded-lg cursor-pointer"
                  />
                </div>

                {schema.template !== 'dodge' && (
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1 text-purple-200">
                      <span>Jump Force</span>
                      <span className="text-cyan-400">{schema.player.jumpForce}</span>
                    </div>
                    <input
                      type="range"
                      min="300"
                      max="900"
                      step="10"
                      value={schema.player.jumpForce}
                      onChange={(e) =>
                        updateSchema((prev) => ({
                          ...prev,
                          player: { ...prev.player, jumpForce: Number(e.target.value) }
                        }))
                      }
                      className="w-full accent-cyan-400 bg-purple-950 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'hazards' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-fuchsia-400 uppercase tracking-wider">Hazard Parameters</h3>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1 text-purple-200">
                    <span>Hazard Speed</span>
                    <span className="text-fuchsia-400">{schema.hazards.speed} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="650"
                    step="25"
                    value={schema.hazards.speed}
                    onChange={(e) =>
                      updateSchema((prev) => ({
                        ...prev,
                        hazards: { ...prev.hazards, speed: Number(e.target.value) }
                      }))
                    }
                    className="w-full accent-fuchsia-500 bg-purple-950 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activeTab === 'theme' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">Color Aesthetics</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(PRESET_THEMES).map(([key, themePreset]) => (
                    <button
                      key={key}
                      onClick={() =>
                        updateSchema((prev) => ({
                          ...prev,
                          theme: themePreset
                        }))
                      }
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-2 transition-all ${
                        schema.theme.name === themePreset.name
                          ? 'border-cyan-400 bg-purple-900/40 shadow-lg shadow-cyan-500/10'
                          : 'border-purple-900/40 bg-purple-950/20 hover:border-purple-700'
                      }`}
                    >
                      <span className="text-xs font-bold text-white">{themePreset.name}</span>
                      <div className="flex space-x-1.5">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: themePreset.backgroundColor }} />
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: themePreset.playerColor }} />
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: themePreset.obstacleColor }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column Engine Canvas */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-[#0f091f]/90 border border-purple-900/40 rounded-2xl p-4 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <div className="w-full flex justify-between items-center mb-3 px-2">
              <span className="text-xs font-bold text-purple-300/80 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Canvas Preview ({schema.template.toUpperCase()})</span>
              </span>
              <button
                onClick={handleStartTestPlay}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black text-xs font-extrabold shadow-md transition-all active:scale-95"
              >
                🎮 Test Play
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-purple-800/50 shadow-2xl w-full flex items-center justify-center bg-black">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full max-w-[640px] h-auto aspect-[16/9] block cursor-pointer"
                onClick={handleStartTestPlay}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
