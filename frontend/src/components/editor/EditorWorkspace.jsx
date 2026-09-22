import React, { useState, useCallback, useRef, useEffect } from 'react';
import EditorToolbar from './EditorToolbar';
import EditorCanvas from './EditorCanvas';
import ToolboxPanel from './ToolboxPanel';
import PropertiesPanel from './PropertiesPanel';
import LogicPanel from './LogicPanel';
import AIPromptModal from './AIPromptModal';
import { createBlankGame, createDefaultEntity } from '../../types/gameModel';
import { apiUrl } from '../../lib/api';

/**
 * EditorWorkspace — top-level editor layout and state management.
 *
 * Owns the game schema, selection state, and undo/redo history.
 * All child panels read from and write to this state via callbacks.
 */
export default function EditorWorkspace({ initialSchema, onPublishSuccess, onBack }) {
  const [schema, setSchema] = useState(() => initialSchema || createBlankGame());
  const [selectedId, setSelectedId] = useState(null);
  const [isPlayMode, setIsPlayMode] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const savedRef = useRef(JSON.stringify(schema));
  const schemaRef = useRef(schema);
  schemaRef.current = schema;
  const dirty = JSON.stringify(schema) !== savedRef.current;
  useEffect(() => {
    const warn = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ── Undo / Redo History ──
  const historyRef = useRef([{ label: 'Initial', snapshot: JSON.stringify(schema) }]);
  const historyIndexRef = useRef(0);

  const pushHistory = useCallback((label) => {
    const h = historyRef.current;
    // Trim any redo entries
    historyRef.current = h.slice(0, historyIndexRef.current + 1);
    historyRef.current.push({ label, snapshot: JSON.stringify(schema) });
    if (historyRef.current.length > 80) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, [schema]);

  const updateSchema = useCallback((updaterOrPatch, historyLabel) => {
    const prev = schemaRef.current;
      const next = typeof updaterOrPatch === 'function' ? updaterOrPatch(prev) : { ...prev, ...updaterOrPatch };
      schemaRef.current = next;
      setSchema(next);
        if (historyLabel) {
          const h = historyRef.current;
          historyRef.current = h.slice(0, historyIndexRef.current + 1);
          historyRef.current.push({ label: historyLabel, snapshot: JSON.stringify(next) });
          if (historyRef.current.length > 80) historyRef.current.shift();
          historyIndexRef.current = historyRef.current.length - 1;
        }
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const entry = historyRef.current[historyIndexRef.current];
    setSchema(JSON.parse(entry.snapshot));
    setSelectedId(null);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current];
    setSchema(JSON.parse(entry.snapshot));
    setSelectedId(null);
  }, []);

  useEffect(() => {
    const shortcut = e => {
      if (e.target.closest('input,textarea,select') || !(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [undo, redo]);

  // ── Save / Publish ──
  const [saveStatus, setSaveStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (publish = false) => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus(publish ? 'Publishing...' : 'Saving...');
    try {
      const method = schema._existingId ? 'PUT' : 'POST';
      const url = schema._existingId
        ? apiUrl(`/games/${encodeURIComponent(schema._existingId)}`)
        : apiUrl('/games');

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: schema.title,
          revision: schema._revision,
          schema,
          isPublished: publish || schema._published,
          remixOfId: schema.remixOfId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setIsSaving(false);
      setSaveStatus(publish ? '🚀 Published!' : '💾 Saved!');

      // Store the server-side ID for future PUT requests
      if (data.id) {
        const next = { ...data.schema, _existingId: data.id, _revision: data.revision, _published: data.is_published };
        savedRef.current = JSON.stringify(next);
        setSchema(next);
        historyRef.current = [{ label: 'Saved', snapshot: JSON.stringify(next) }];
        historyIndexRef.current = 0;
      }

      if (publish && onPublishSuccess && data.slug) {
        onPublishSuccess(data.slug);
      }
    } catch (error) {
      setIsSaving(false);
      setSaveStatus('Not saved: ' + error.message);
    }
  };

  const selectedEntity = selectedId ? schema.entities.find(e => e.id === selectedId) : null;

  return (
    <div className="editor-workspace h-screen bg-[#07040d] text-white flex flex-col overflow-hidden" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <EditorToolbar
        schema={schema}
        onTitleChange={(title) => updateSchema({ title })}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndexRef.current > 0}
        canRedo={historyIndexRef.current < historyRef.current.length - 1}
        isPlayMode={isPlayMode}
        onTogglePlay={() => setIsPlayMode(p => !p)}
        onSave={() => handleSave(false)}
        onPublish={() => handleSave(true)}
        isSaving={isSaving}
        saveStatus={saveStatus}
        onBack={() => { if (!dirty || window.confirm('Leave without saving your changes?')) onBack(); }}
        showRules={showRules}
        onToggleRules={() => setShowRules(s => !s)}
        onOpenAI={() => setShowAI(true)}
      />

      <div className="editor-details">
        <label>Description<input aria-label="Game description" maxLength={1000} value={schema.description || ''} onChange={e => updateSchema({ description: e.target.value })} placeholder="Tell friends how to play…" /></label>
        <label>Soundtrack<select aria-label="Soundtrack" value={schema.soundtrack || 'none'} onChange={e => updateSchema({ soundtrack: e.target.value }, 'Changed soundtrack')}>
          <option value="none">Silent</option><option value="neon">Neon pulse</option><option value="arcade">8-bit arcade</option><option value="chill">After-hours chill</option>
        </select></label>
        <span role="status">{saveStatus || (dirty ? 'Unsaved changes' : 'All changes saved')}</span>
      </div>
      {schema._published && <p className="published-edit-note">Saving changes updates the live game and starts a fresh leaderboard. Previously shared replays keep the original game.</p>}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Left — Toolbox */}
          {!isPlayMode && (
            <ToolboxPanel
              onAddEntity={(type) => {
                if (schema.entities.length >= 80) { setSaveStatus('The limit is 80 objects per game.'); return; }
                const ent = createDefaultEntity(type, 200 + Math.random() * 300, 150 + Math.random() * 150);
                updateSchema(prev => ({
                  ...prev,
                  entities: [...prev.entities, ent],
                }), `Added ${ent.name}`);
                setSelectedId(ent.id);
              }}
            />
          )}

          {/* Center — Canvas */}
          <div className="flex-1 relative">
            <EditorCanvas
              schema={schema}
              selectedId={selectedId}
              onSelectEntity={setSelectedId}
              onAddEntityAt={(type, x, y) => {
                if (schema.entities.length >= 80) { setSaveStatus('The limit is 80 objects per game.'); return; }
                const ent = createDefaultEntity(type, x, y);
                updateSchema(prev => ({
                  ...prev,
                  entities: [...prev.entities, ent],
                }), `Added ${ent.name}`);
                setSelectedId(ent.id);
              }}
              onMoveEntity={(id, x, y) => {
                updateSchema(prev => ({
                  ...prev,
                  entities: prev.entities.map(e =>
                    e.id === id ? { ...e, transform: { ...e.transform, x, y } } : e
                  ),
                }));
              }}
              onMoveEnd={(id) => {
                pushHistory(`Moved ${schema.entities.find(e => e.id === id)?.name || 'entity'}`);
              }}
              onDeleteEntity={(id) => {
                updateSchema(prev => ({
                  ...prev,
                  entities: prev.entities.filter(e => e.id !== id),
                }), `Deleted entity`);
                if (selectedId === id) setSelectedId(null);
              }}
              isPlayMode={isPlayMode}
            />
          </div>

          {/* Right — Logic Engine Side Panel or Properties Panel */}
          {!isPlayMode && showRules && (
            <LogicPanel
              schema={schema}
              onUpdateLogic={(newLogic) => {
                updateSchema(prev => ({ ...prev, logic: newLogic }), 'Updated game logic');
              }}
              onClose={() => setShowRules(false)}
            />
          )}

          {!isPlayMode && !showRules && (
            <PropertiesPanel
              entity={selectedEntity}
              schema={schema}
              onUpdateEntity={(id, patch) => {
                updateSchema(prev => {
                  const isPlayer = prev.entities.find(e => e.id === id)?.type === 'player';
                  const logic = !isPlayer || !patch.movement ? prev.logic : { ...prev.logic, rules: prev.logic.rules.map(r => ({
                    ...r, actions: r.actions.map(a => {
                      if (a.entityRef?.tag !== 'player') return a;
                      if (a.type === 'jump' && patch.movement.jumpForce !== undefined) return { ...a, value: patch.movement.jumpForce };
                      if (a.type === 'move' && patch.movement.speed !== undefined) return { ...a,
                        ...(a.vx ? { vx: Math.sign(a.vx) * patch.movement.speed } : {}),
                        ...(a.vy ? { vy: Math.sign(a.vy) * patch.movement.speed } : {}) };
                      return a;
                    })
                  })) };
                  return { ...prev, logic, entities: prev.entities.map(e => e.id === id ? deepMerge(e, patch) : e) };
                }, `Updated ${schema.entities.find(e => e.id === id)?.name || 'entity'}`);
              }}
              onUpdateScene={(patch) => {
                updateSchema(prev => ({ ...prev, scene: { ...prev.scene, ...patch } }), 'Updated scene');
              }}
              onUpdatePhysics={(patch) => {
                updateSchema(prev => ({ ...prev, physics: { ...prev.physics, ...patch } }), 'Updated physics');
              }}
              onUpdateScoring={(patch) => {
                updateSchema(prev => ({ ...prev, scoring: { ...prev.scoring, ...patch },
                  logic: { ...prev.logic, variables: prev.logic.variables.map(v => v.name === 'lives' && patch.maxLives !== undefined ? { ...v, defaultValue: patch.maxLives } : v) }
                }), 'Updated scoring');
              }}
            />
          )}
        </div>
      </div>

      {/* Floating Modal — AI Prompt Co-Creator */}
      {showAI && (
        <AIPromptModal
          schema={schema}
          onApplyPatch={(patchedSchema, label) => {
            updateSchema(patchedSchema, label);
          }}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  );
}

/** Deep-merge helper for nested entity patches */
function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key] && typeof target[key] === 'object') {
      out[key] = deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}
