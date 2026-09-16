import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EntityEngine } from '../../engine/entityEngine';

/**
 * EditorCanvas — interactive canvas for placing, selecting, and moving entities.
 * In play mode, renders via the EntityEngine. In edit mode, renders the scene statically with selection UI.
 */
export default function EditorCanvas({
  schema, selectedId, onSelectEntity, onAddEntityAt, onMoveEntity, onMoveEnd, onDeleteEntity, isPlayMode,
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const dragRef = useRef(null); // { entityId, offsetX, offsetY }

  // ── Drag & Drop from Toolbox onto Canvas ──
  const handleDragOver = useCallback((e) => {
    if (isPlayMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, [isPlayMode]);

  const handleDrop = useCallback((e) => {
    if (isPlayMode || !canvasRef.current || !onAddEntityAt) return;
    e.preventDefault();
    const type = e.dataTransfer.getData('application/gamio-entity-type');
    if (!type) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const dropX = Math.round((e.clientX - rect.left) * scaleX - 16);
    const dropY = Math.round((e.clientY - rect.top) * scaleY - 16);

    onAddEntityAt(type, Math.max(0, dropX), Math.max(0, dropY));
  }, [isPlayMode, onAddEntityAt]);

  // ── Play Mode: mount EntityEngine ──
  useEffect(() => {
    if (!isPlayMode || !canvasRef.current) {
      if (engineRef.current) { engineRef.current.detachEvents(); engineRef.current = null; }
      return;
    }
    try {
      engineRef.current = new EntityEngine(canvasRef.current, schema, undefined, {
        onScoreChange: () => {},
        onGameOver: () => {},
      });
      engineRef.current.startPlay();
    } catch (e) {
      console.error('Engine init failed:', e);
    }
    return () => {
      if (engineRef.current) { engineRef.current.detachEvents(); engineRef.current = null; }
    };
  }, [isPlayMode]); // intentionally only re-mount on play mode toggle

  // ── Edit Mode: render static scene ──
  useEffect(() => {
    if (isPlayMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderEditScene(ctx, canvas, schema, selectedId);
  }, [schema, selectedId, isPlayMode]);

  // ── Mouse handlers for edit mode ──
  const handleMouseDown = useCallback((e) => {
    if (isPlayMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Hit test entities in reverse order (topmost first)
    let hit = null;
    for (let i = schema.entities.length - 1; i >= 0; i--) {
      const ent = schema.entities[i];
      if (!ent.isVisible || ent.isLocked) continue;
      const t = ent.transform;
      if (mx >= t.x && mx <= t.x + t.width && my >= t.y && my <= t.y + t.height) {
        hit = ent;
        break;
      }
    }

    if (hit) {
      onSelectEntity(hit.id);
      const t = hit.transform;
      dragRef.current = { entityId: hit.id, offsetX: mx - t.x, offsetY: my - t.y };
    } else {
      onSelectEntity(null);
    }
  }, [schema, isPlayMode, onSelectEntity]);

  const handleMouseMove = useCallback((e) => {
    if (isPlayMode || !dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const newX = Math.round(mx - dragRef.current.offsetX);
    const newY = Math.round(my - dragRef.current.offsetY);
    onMoveEntity(dragRef.current.entityId, newX, newY);
  }, [isPlayMode, onMoveEntity]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      onMoveEnd?.(dragRef.current.entityId);
      dragRef.current = null;
    }
  }, [onMoveEnd]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    if (isPlayMode) return;
    const handler = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !e.target.closest('input, textarea')) {
          const ent = schema.entities.find(en => en.id === selectedId);
          // Don't allow deleting if there's only one player
          if (ent?.type === 'player') return;
          onDeleteEntity(selectedId);
        }
      }
      if (e.ctrlKey && e.key === 'z') e.preventDefault(); // handled by toolbar
      if (e.ctrlKey && e.key === 'y') e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlayMode, selectedId, schema, onDeleteEntity]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#080412] p-3">
      <div className="relative rounded-xl overflow-hidden border border-purple-800/50 shadow-2xl bg-black" style={{ maxWidth: 800, width: '100%' }}>
        {/* Mode indicator */}
        <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            isPlayMode
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50'
              : 'bg-purple-950/80 text-purple-300 border-purple-700/50'
          }`}>
            {isPlayMode ? '▶ PLAYING' : '✏️ EDITING'}
          </span>
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          className="w-full h-auto aspect-[16/9] block cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      </div>
    </div>
  );
}

/**
 * Renders the game scene statically for the editor (no physics simulation).
 */
function renderEditScene(ctx, canvas, schema, selectedId) {
  const { width, height } = canvas;
  const scene = schema.scene;

  // Background
  ctx.fillStyle = scene.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Grid
  if (scene.gridVisible !== false) {
    ctx.strokeStyle = scene.gridColor || 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    const gs = scene.gridSize || 32;
    for (let x = 0; x < width; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }

  // Render entities
  for (const ent of schema.entities) {
    if (!ent.isVisible) continue;
    const t = ent.transform;
    const a = ent.appearance;

    ctx.save();
    ctx.globalAlpha = a.opacity ?? 1;

    if (a.glow && a.glowColor) {
      ctx.shadowColor = a.glowColor;
      ctx.shadowBlur = a.glowRadius || 10;
    }

    if (a.shape === 'circle') {
      const r = Math.min(t.width, t.height) / 2;
      ctx.beginPath();
      ctx.arc(t.x + t.width / 2, t.y + t.height / 2, r, 0, Math.PI * 2);
      if (a.color) { ctx.fillStyle = a.color; ctx.fill(); }
      if (a.strokeColor) { ctx.strokeStyle = a.strokeColor; ctx.lineWidth = a.strokeWidth || 1; ctx.stroke(); }
    } else if (a.shape === 'text') {
      ctx.font = `${a.fontSize || 16}px ${a.fontFamily || 'monospace'}`;
      ctx.fillStyle = a.color || '#fff';
      ctx.fillText(a.text || '', t.x, t.y + (a.fontSize || 16));
    } else {
      if (a.color) { ctx.fillStyle = a.color; ctx.fillRect(t.x, t.y, t.width, t.height); }
      if (a.strokeColor) { ctx.strokeStyle = a.strokeColor; ctx.lineWidth = a.strokeWidth || 1; ctx.strokeRect(t.x, t.y, t.width, t.height); }
    }

    ctx.restore();

    // Entity label (small text above)
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(ent.name, t.x, t.y - 4);
    ctx.restore();

    // Selection highlight
    if (ent.id === selectedId) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(t.x - 2, t.y - 2, t.width + 4, t.height + 4);
      ctx.setLineDash([]);

      // Resize handles (visual only for now)
      const hs = 6;
      ctx.fillStyle = '#00f0ff';
      const corners = [
        [t.x - hs / 2, t.y - hs / 2],
        [t.x + t.width - hs / 2, t.y - hs / 2],
        [t.x - hs / 2, t.y + t.height - hs / 2],
        [t.x + t.width - hs / 2, t.y + t.height - hs / 2],
      ];
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx, cy, hs, hs);
      }
      ctx.restore();
    }
  }

  // Scene bounds indicator
  ctx.save();
  ctx.strokeStyle = 'rgba(179, 71, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(0, 0, scene.width, scene.height);
  ctx.setLineDash([]);
  ctx.restore();
}
