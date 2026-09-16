import React from 'react';

/**
 * EditorToolbar — top bar with game name, play, undo/redo, save, publish.
 */
export default function EditorToolbar({
  schema, onTitleChange, onUndo, onRedo, canUndo, canRedo,
  isPlayMode, onTogglePlay, onSave, onPublish, isSaving, saveStatus, onBack,
  showRules, onToggleRules, onOpenAI,
}) {
  return (
    <header className="border-b border-purple-900/40 bg-[#0d071a]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3 z-50 shrink-0">
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onBack} className="text-xs font-bold text-purple-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-purple-950 border border-purple-800/60 transition-all shrink-0" title="Back">
          ←
        </button>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center font-bold text-sm shadow-lg shadow-cyan-500/20 shrink-0">G</div>
        <input
          type="text"
          value={schema.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="bg-transparent text-lg font-extrabold text-white border-b border-transparent hover:border-purple-500 focus:border-cyan-400 focus:outline-none transition-all px-1 min-w-0 w-48"
          placeholder="Name your game..."
        />
        <span className="text-[10px] text-purple-400/60 hidden sm:inline">v{schema.version || 1}</span>
      </div>

      {/* Center: Play + Undo/Redo + Rules */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center gap-1.5 ${
            isPlayMode
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black'
          }`}
        >
          {isPlayMode ? '⏹ Stop' : '▶ Play'}
        </button>

        <div className="flex items-center bg-purple-950/50 rounded-lg border border-purple-900/40 overflow-hidden">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="px-2.5 py-1.5 text-xs font-bold transition-all disabled:opacity-30 hover:bg-purple-800/40 text-purple-200"
            title="Undo (Ctrl+Z)"
          >
            ↩
          </button>
          <div className="w-px h-5 bg-purple-800/50" />
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="px-2.5 py-1.5 text-xs font-bold transition-all disabled:opacity-30 hover:bg-purple-800/40 text-purple-200"
            title="Redo (Ctrl+Y)"
          >
            ↪
          </button>
        </div>

        {!isPlayMode && (
          <>
            <button
              onClick={onToggleRules}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                showRules
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/20'
                  : 'bg-purple-950/50 text-purple-300 border-purple-900/40 hover:bg-purple-900/40'
              }`}
            >
              ⚡ Logic Engine ({(schema.logic?.rules || schema.rules || []).length})
            </button>

            <button
              onClick={onOpenAI}
              className="px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border border-cyan-500/50 bg-gradient-to-r from-purple-900/80 to-cyan-950/80 text-cyan-300 hover:from-purple-800 hover:to-cyan-900 shadow-md flex items-center gap-1.5 active:scale-95"
            >
              ✨ AI Assistant
            </button>
          </>
        )}
      </div>

      {/* Right: Save + Publish */}
      <div className="flex items-center gap-2">
        {saveStatus && (
          <span className="text-xs font-medium text-cyan-300 animate-pulse hidden sm:inline">{saveStatus}</span>
        )}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-3.5 py-2 rounded-xl bg-purple-900/30 border border-purple-700/50 hover:bg-purple-800/40 text-purple-200 text-xs font-semibold transition-all"
        >
          💾 Save
        </button>
        <button
          onClick={onPublish}
          disabled={isSaving}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white text-xs font-bold shadow-lg shadow-fuchsia-500/25 active:scale-95 transition-all"
        >
          🚀 Publish
        </button>
      </div>
    </header>
  );
}
