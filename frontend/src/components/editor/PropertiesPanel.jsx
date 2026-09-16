import React, { useState } from 'react';

/**
 * PropertiesPanel — right sidebar for editing selected entity or scene-level properties.
 */
export default function PropertiesPanel({
  entity, schema, onUpdateEntity, onUpdateScene, onUpdatePhysics, onUpdateScoring,
}) {
  const [activeSection, setActiveSection] = useState('transform');

  // When no entity selected → show scene properties
  if (!entity) {
    return (
      <div className="w-64 shrink-0 bg-[#0d071a]/95 border-l border-purple-900/40 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-purple-900/30">
          <h3 className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Scene Properties</h3>
          <p className="text-[10px] text-purple-500/50 mt-0.5">Select an entity to edit it</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {/* Scene Background */}
          <PropertySection title="Background">
            <ColorInput label="Color" value={schema.scene.backgroundColor}
              onChange={(v) => onUpdateScene({ backgroundColor: v })} />
          </PropertySection>

          {/* Global Physics */}
          <PropertySection title="Physics">
            <SliderInput label="Gravity" value={schema.physics.gravity} min={0} max={3200} step={50}
              onChange={(v) => onUpdatePhysics({ gravity: v })} unit="px/s²" />
            <SliderInput label="Game Speed" value={schema.physics.gameSpeed} min={0.2} max={3} step={0.1}
              onChange={(v) => onUpdatePhysics({ gameSpeed: v })} unit="x" />
          </PropertySection>

          {/* Scoring */}
          <PropertySection title="Scoring">
            <SelectInput label="Win Condition" value={schema.scoring?.winCondition || 'none'}
              options={[
                { value: 'none', label: 'None (endless)' },
                { value: 'reach_score', label: 'Reach Score' },
                { value: 'survive_time', label: 'Survive Time' },
                { value: 'reach_goal', label: 'Reach Goal' },
                { value: 'collect_all', label: 'Collect All' },
              ]}
              onChange={(v) => onUpdateScoring({ winCondition: v })} />
            <SliderInput label="Max Lives" value={schema.scoring?.maxLives || 3} min={1} max={10} step={1}
              onChange={(v) => onUpdateScoring({ maxLives: v })} />
          </PropertySection>

          {/* Scene Size */}
          <PropertySection title="Scene Dimensions">
            <NumberInput label="Width" value={schema.scene.width}
              onChange={(v) => onUpdateScene({ width: v, bounds: { ...schema.scene.bounds, right: v } })} />
            <NumberInput label="Height" value={schema.scene.height}
              onChange={(v) => onUpdateScene({ height: v, bounds: { ...schema.scene.bounds, bottom: v } })} />
            <SelectInput label="Camera" value={schema.scene.scrollType}
              options={[
                { value: 'none', label: 'Static' },
                { value: 'follow_player', label: 'Follow Player' },
                { value: 'auto_scroll', label: 'Auto-Scroll' },
              ]}
              onChange={(v) => onUpdateScene({ scrollType: v })} />
          </PropertySection>
        </div>
      </div>
    );
  }

  // Entity selected → show entity properties
  const sections = [
    { id: 'transform', label: '📐 Transform' },
    { id: 'physics', label: '⚡ Physics' },
    { id: 'movement', label: '🏃 Movement' },
    { id: 'appearance', label: '🎨 Appearance' },
  ];

  const update = (patch) => onUpdateEntity(entity.id, patch);

  return (
    <div className="w-64 shrink-0 bg-[#0d071a]/95 border-l border-purple-900/40 flex flex-col overflow-hidden">
      {/* Entity Header */}
      <div className="px-4 py-3 border-b border-purple-900/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white truncate">{entity.name}</h3>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-950 text-cyan-400 border border-purple-800/50">
            {entity.type}
          </span>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex px-2 py-1.5 gap-0.5 border-b border-purple-900/30 bg-purple-950/30">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
              activeSection === s.id ? 'bg-cyan-600/30 text-cyan-300' : 'text-purple-400/60 hover:text-purple-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Property Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {activeSection === 'transform' && (
          <>
            <NumberInput label="X" value={entity.transform.x} onChange={(v) => update({ transform: { x: v } })} />
            <NumberInput label="Y" value={entity.transform.y} onChange={(v) => update({ transform: { y: v } })} />
            <NumberInput label="Width" value={entity.transform.width} onChange={(v) => update({ transform: { width: v } })} />
            <NumberInput label="Height" value={entity.transform.height} onChange={(v) => update({ transform: { height: v } })} />
            <SliderInput label="Rotation" value={entity.transform.rotation} min={0} max={360} step={1}
              onChange={(v) => update({ transform: { rotation: v } })} unit="°" />
          </>
        )}

        {activeSection === 'physics' && (
          <>
            <ToggleInput label="Physics Enabled" value={entity.physics.enabled}
              onChange={(v) => update({ physics: { enabled: v } })} />
            <ToggleInput label="Static (Immovable)" value={entity.physics.isStatic}
              onChange={(v) => update({ physics: { isStatic: v } })} />
            <SliderInput label="Mass" value={entity.physics.mass || 1} min={0.1} max={10} step={0.1}
              onChange={(v) => update({ physics: { mass: v } })} />
            <SliderInput label="Friction" value={entity.physics.friction || 0} min={0} max={1} step={0.05}
              onChange={(v) => update({ physics: { friction: v } })} />
            <SliderInput label="Bounciness" value={entity.physics.bounciness || 0} min={0} max={1} step={0.05}
              onChange={(v) => update({ physics: { bounciness: v } })} />
            <SliderInput label="Drag" value={entity.physics.drag || 0} min={0} max={1} step={0.05}
              onChange={(v) => update({ physics: { drag: v } })} />
          </>
        )}

        {activeSection === 'movement' && (
          <>
            <SliderInput label="Speed" value={entity.movement.speed || 0} min={0} max={800} step={10}
              onChange={(v) => update({ movement: { speed: v } })} unit="px/s" />
            <SliderInput label="Jump Force" value={entity.movement.jumpForce || 0} min={0} max={1200} step={10}
              onChange={(v) => update({ movement: { jumpForce: v } })} />
            <SliderInput label="Air Control" value={entity.movement.airControl || 0} min={0} max={1} step={0.05}
              onChange={(v) => update({ movement: { airControl: v } })} />
            <SelectInput label="Pattern" value={entity.movement.pattern || 'none'}
              options={[
                { value: 'none', label: 'None' },
                { value: 'horizontal', label: 'Horizontal Patrol' },
                { value: 'vertical', label: 'Vertical Patrol' },
                { value: 'patrol', label: 'Patrol' },
                { value: 'follow_player', label: 'Follow Player' },
              ]}
              onChange={(v) => update({ movement: { pattern: v } })} />
            {(entity.movement.pattern && entity.movement.pattern !== 'none') && (
              <SliderInput label="Patrol Distance" value={entity.movement.patrolDistance || 150} min={50} max={600} step={10}
                onChange={(v) => update({ movement: { patrolDistance: v } })} unit="px" />
            )}
          </>
        )}

        {activeSection === 'appearance' && (
          <>
            {/* Quick Color & Style Presets */}
            <PropertySection title="Quick Presets">
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: 'Cyber Blue', color: '#00f0ff', glow: '#00f0ff' },
                  { label: 'Neon Pink', color: '#ff007f', glow: '#ff007f' },
                  { label: 'Lava Red', color: '#ff2a00', glow: '#ff2a00' },
                  { label: 'Matrix Green', color: '#00ff66', glow: '#00ff66' },
                  { label: 'Gold Gem', color: '#ffea00', glow: '#ffea00' },
                  { label: 'Void Purple', color: '#a855f7', glow: '#a855f7' },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => update({
                      appearance: { color: preset.color, glow: true, glowColor: preset.glow }
                    })}
                    className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-800/40 hover:border-cyan-400 flex flex-col items-center gap-1 transition-all"
                  >
                    <div className="w-4 h-4 rounded-full shadow" style={{ backgroundColor: preset.color, boxShadow: `0 0 8px ${preset.glow}` }} />
                    <span className="text-[9px] text-purple-300 font-semibold truncate w-full text-center">{preset.label}</span>
                  </button>
                ))}
              </div>
            </PropertySection>

            <SelectInput label="Shape" value={entity.appearance.shape}
              options={[
                { value: 'rect', label: 'Rectangle' },
                { value: 'circle', label: 'Circle' },
                { value: 'text', label: 'Text' },
              ]}
              onChange={(v) => update({ appearance: { shape: v } })} />
            <ColorInput label="Fill Color" value={entity.appearance.color || '#888'}
              onChange={(v) => update({ appearance: { color: v } })} />
            <ColorInput label="Stroke Color" value={entity.appearance.strokeColor || ''}
              onChange={(v) => update({ appearance: { strokeColor: v || undefined } })} />
            <SliderInput label="Opacity" value={entity.appearance.opacity ?? 1} min={0} max={1} step={0.05}
              onChange={(v) => update({ appearance: { opacity: v } })} />
            <ToggleInput label="Glow Effect" value={entity.appearance.glow || false}
              onChange={(v) => update({ appearance: { glow: v } })} />
            {entity.appearance.glow && (
              <ColorInput label="Glow Color" value={entity.appearance.glowColor || entity.appearance.color || '#fff'}
                onChange={(v) => update({ appearance: { glowColor: v } })} />
            )}
            {entity.appearance.shape === 'text' && (
              <>
                <TextInput label="Text" value={entity.appearance.text || ''}
                  onChange={(v) => update({ appearance: { text: v } })} />
                <NumberInput label="Font Size" value={entity.appearance.fontSize || 16}
                  onChange={(v) => update({ appearance: { fontSize: v } })} />
              </>
            )}
          </>
        )}

        {/* Tags */}
        <PropertySection title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {(entity.tags || []).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-purple-950 border border-purple-800/50 rounded text-[10px] font-mono text-cyan-300">
                {tag}
              </span>
            ))}
            {(!entity.tags || entity.tags.length === 0) && (
              <span className="text-[10px] text-purple-500/50 italic">No tags</span>
            )}
          </div>
        </PropertySection>
      </div>
    </div>
  );
}

// ── Reusable Input Components ──

function PropertySection({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

function SliderInput({ label, value, min, max, step, onChange, unit = '' }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] font-semibold mb-1">
        <span className="text-purple-300">{label}</span>
        <span className="text-cyan-400 font-mono">{typeof value === 'number' ? (Number.isInteger(step) || step >= 1 ? value : value.toFixed(2)) : value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400 bg-purple-950 rounded cursor-pointer h-1.5"
      />
    </div>
  );
}

function NumberInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-purple-300">{label}</span>
      <input type="number" value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 bg-purple-950/60 border border-purple-800/50 rounded-lg px-2 py-1 text-xs text-white text-right focus:border-cyan-400 focus:outline-none"
      />
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-purple-300">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded border border-purple-800/50 cursor-pointer bg-transparent"
        />
        <span className="text-[10px] font-mono text-purple-400">{value || 'none'}</span>
      </div>
    </div>
  );
}

function ToggleInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-purple-300">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full transition-all relative ${value ? 'bg-cyan-500' : 'bg-purple-800'}`}
      >
        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${value ? 'left-[18px]' : 'left-[3px]'}`} />
      </button>
    </div>
  );
}

function SelectInput({ label, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-purple-300 shrink-0">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-purple-950/60 border border-purple-800/50 rounded-lg px-2 py-1 text-xs text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <div>
      <span className="text-[11px] font-semibold text-purple-300 block mb-1">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-purple-950/60 border border-purple-800/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
      />
    </div>
  );
}
