import React, { useState } from 'react';
import {
  generateLogicRuleId,
  generateVariableId,
  generateSpawnerId,
  generateInputBindingId,
} from '../../types/gameModel';

/**
 * LogicPanel — Visual Game Logic Engine Editor (v3)
 *
 * Dedicated side panel for managing EVENT → CONDITION → ACTION rules,
 * Input Bindings, Game Variables, and Entity Spawners.
 */
export default function LogicPanel({ schema, onUpdateLogic, onClose }) {
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'inputs' | 'variables' | 'spawners'
  const [searchQuery, setSearchQuery] = useState('');

  const logic = schema.logic || {
    inputBindings: [],
    variables: [],
    spawners: [],
    rules: [],
  };

  const availableTags = Array.from(
    new Set(schema.entities.flatMap(e => e.tags || []))
  );
  if (!availableTags.includes('player')) availableTags.push('player');
  if (!availableTags.includes('hazard')) availableTags.push('hazard');
  if (!availableTags.includes('collectible')) availableTags.push('collectible');
  if (!availableTags.includes('goal')) availableTags.push('goal');

  // ── Helper Updaters ──

  const updateRules = (newRules) => {
    onUpdateLogic({ ...logic, rules: newRules });
  };

  const updateInputs = (newInputs) => {
    onUpdateLogic({ ...logic, inputBindings: newInputs });
  };

  const updateVariables = (newVars) => {
    onUpdateLogic({ ...logic, variables: newVars });
  };

  const updateSpawners = (newSpawners) => {
    onUpdateLogic({ ...logic, spawners: newSpawners });
  };

  return (
    <div className="w-[500px] shrink-0 bg-[#0c0719]/98 border-l border-purple-900/40 flex flex-col h-full shadow-2xl backdrop-blur-xl z-40 overflow-hidden text-white font-sans">
      {/* Header */}
      <div className="px-5 py-4 border-b border-purple-900/40 flex items-center justify-between bg-[#110924]/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-cyan-500 flex items-center justify-center text-black font-black text-sm shadow-md shadow-amber-500/20">
            ⚡
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">Logic Engine</h2>
            <p className="text-[11px] text-purple-300/60">Event → Condition → Action Architecture</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-800/40 hover:bg-purple-800 text-purple-300 hover:text-white flex items-center justify-center transition-all text-xs font-bold"
        >
          ✕
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-purple-900/40 bg-[#0d071b] px-3 pt-2 gap-1.5">
        <TabButton
          active={activeTab === 'rules'}
          onClick={() => setActiveTab('rules')}
          icon="⚡"
          label="Rules"
          badge={logic.rules?.length || 0}
        />
        <TabButton
          active={activeTab === 'inputs'}
          onClick={() => setActiveTab('inputs')}
          icon="🎮"
          label="Inputs"
          badge={logic.inputBindings?.length || 0}
        />
        <TabButton
          active={activeTab === 'variables'}
          onClick={() => setActiveTab('variables')}
          icon="📊"
          label="Variables"
          badge={logic.variables?.length || 0}
        />
        <TabButton
          active={activeTab === 'spawners'}
          onClick={() => setActiveTab('spawners')}
          icon="🌀"
          label="Spawners"
          badge={logic.spawners?.length || 0}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'rules' && (
          <RulesTab
            rules={logic.rules || []}
            inputBindings={logic.inputBindings || []}
            variables={logic.variables || []}
            spawners={logic.spawners || []}
            tags={availableTags}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onUpdateRules={updateRules}
          />
        )}

        {activeTab === 'inputs' && (
          <InputsTab
            bindings={logic.inputBindings || []}
            onUpdateInputs={updateInputs}
          />
        )}

        {activeTab === 'variables' && (
          <VariablesTab
            variables={logic.variables || []}
            onUpdateVariables={updateVariables}
          />
        )}

        {activeTab === 'spawners' && (
          <SpawnersTab
            spawners={logic.spawners || []}
            tags={availableTags}
            onUpdateSpawners={updateSpawners}
          />
        )}
      </div>
    </div>
  );
}

// ── Tab Button Component ────────────────────────────────────────

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 border-t border-x ${
        active
          ? 'bg-[#140b2a] text-cyan-300 border-cyan-500/50 border-b-0 -mb-px shadow-lg'
          : 'bg-transparent text-purple-300/70 border-transparent hover:text-purple-200 hover:bg-purple-950/30'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
            active ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-900/40 text-purple-400'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Rules Tab ───────────────────────────────────────────────────

function RulesTab({
  rules,
  inputBindings,
  variables,
  spawners,
  tags,
  searchQuery,
  setSearchQuery,
  onUpdateRules,
}) {
  const filteredRules = rules.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.event?.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRule = () => {
    const newRule = {
      id: generateLogicRuleId(),
      name: `New Rule ${rules.length + 1}`,
      enabled: true,
      event: { type: 'input_pressed', inputAction: inputBindings[0]?.name || 'Jump' },
      conditions: [],
      actions: [{ type: 'jump', entityRef: { mode: 'tag', tag: 'player' }, value: 600 }],
    };
    onUpdateRules([...rules, newRule]);
  };

  return (
    <div className="space-y-4">
      {/* Search & Add */}
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          placeholder="Filter rules..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-purple-950/40 border border-purple-800/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-purple-400/50 focus:outline-none focus:border-cyan-500 flex-1"
        />
        <button
          onClick={handleAddRule}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1 shrink-0"
        >
          <span>+</span> New Rule
        </button>
      </div>

      {filteredRules.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-purple-900/40 rounded-xl bg-purple-950/10">
          <p className="text-xs text-purple-300/60">No logic rules found.</p>
          <button
            onClick={handleAddRule}
            className="mt-2 text-xs text-cyan-400 hover:underline font-bold"
          >
            Create your first rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              inputBindings={inputBindings}
              variables={variables}
              spawners={spawners}
              tags={tags}
              onUpdate={updated =>
                onUpdateRules(rules.map(r => (r.id === rule.id ? updated : r)))
              }
              onDelete={() => onUpdateRules(rules.filter(r => r.id !== rule.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rule Card Component ────────────────────────────────────────

function RuleCard({ rule, inputBindings, variables, spawners, tags, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(true);

  const handleUpdateEvent = event => onUpdate({ ...rule, event });

  const handleAddCondition = () => {
    const newCond = { type: 'is_grounded', entityRef: { mode: 'tag', tag: 'player' } };
    onUpdate({ ...rule, conditions: [...(rule.conditions || []), newCond] });
  };

  const handleUpdateCondition = (index, cond) => {
    const next = [...(rule.conditions || [])];
    next[index] = cond;
    onUpdate({ ...rule, conditions: next });
  };

  const handleDeleteCondition = index => {
    onUpdate({ ...rule, conditions: (rule.conditions || []).filter((_, i) => i !== index) });
  };

  const handleAddAction = () => {
    const newAction = { type: 'add_score', value: 10 };
    onUpdate({ ...rule, actions: [...(rule.actions || []), newAction] });
  };

  const handleUpdateAction = (index, action) => {
    const next = [...(rule.actions || [])];
    next[index] = action;
    onUpdate({ ...rule, actions: next });
  };

  const handleDeleteAction = index => {
    onUpdate({ ...rule, actions: (rule.actions || []).filter((_, i) => i !== index) });
  };

  return (
    <div
      className={`rounded-xl border transition-all ${
        rule.enabled
          ? 'bg-[#120a26] border-purple-800/60 shadow-lg shadow-purple-950/40'
          : 'bg-[#090514]/60 border-purple-950/40 opacity-60'
      }`}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-purple-900/30 bg-purple-950/40 rounded-t-xl gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={e => onUpdate({ ...rule, enabled: e.target.checked })}
            className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
          />
          <input
            type="text"
            value={rule.name}
            onChange={e => onUpdate({ ...rule, name: e.target.value })}
            className="bg-transparent text-xs font-extrabold text-white border-b border-transparent hover:border-purple-600 focus:border-cyan-400 focus:outline-none px-1 py-0.5 flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-purple-400 hover:text-white px-2 py-0.5 rounded bg-purple-900/40"
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/60 px-2 py-0.5 rounded"
          >
            🗑
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3.5 space-y-3 text-xs">
          {/* EVENT SECTION (Yellow/Gold Badge) */}
          <div className="bg-[#180e33] border border-amber-500/30 rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <span>⚡</span> EVENT (WHEN)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={rule.event.type}
                onChange={e => handleUpdateEvent({ ...rule.event, type: e.target.value })}
                className="bg-purple-950 border border-amber-500/40 rounded px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="game_start">🚀 On Game Start</option>
                <option value="input_pressed">🎮 On Input Pressed</option>
                <option value="input_held">🎮 On Input Held</option>
                <option value="input_released">🎮 On Input Released</option>
                <option value="collision_start">💥 On Collision</option>
                <option value="every_interval">⏱ Every Interval (sec)</option>
                <option value="after_delay">⌛ After Delay (sec)</option>
                <option value="every_frame">🔄 Every Frame</option>
                <option value="variable_reached">📊 Variable Reached</option>
                <option value="out_of_bounds">🚫 Out of Bounds</option>
              </select>

              {/* Event specific fields */}
              {(rule.event.type === 'input_pressed' ||
                rule.event.type === 'input_held' ||
                rule.event.type === 'input_released') && (
                <select
                  value={rule.event.inputAction || ''}
                  onChange={e =>
                    handleUpdateEvent({ ...rule.event, inputAction: e.target.value })
                  }
                  className="bg-purple-950 border border-purple-700 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="">Select Input Action...</option>
                  {inputBindings.map(b => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              {rule.event.type === 'collision_start' && (
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <EntityRefSelect
                    label="Subject"
                    value={rule.event.subjectRef}
                    tags={tags}
                    onChange={subjectRef => handleUpdateEvent({ ...rule.event, subjectRef })}
                  />
                  <EntityRefSelect
                    label="Object"
                    value={rule.event.objectRef}
                    tags={tags}
                    onChange={objectRef => handleUpdateEvent({ ...rule.event, objectRef })}
                  />
                </div>
              )}

              {(rule.event.type === 'every_interval' || rule.event.type === 'after_delay') && (
                <input
                  type="number"
                  step="0.1"
                  placeholder="Seconds"
                  value={rule.event.interval || rule.event.delay || 1}
                  onChange={e =>
                    handleUpdateEvent({
                      ...rule.event,
                      interval: Number(e.target.value),
                      delay: Number(e.target.value),
                    })
                  }
                  className="bg-purple-950 border border-purple-700 rounded px-2 py-1 text-xs text-white"
                />
              )}

              {rule.event.type === 'variable_reached' && (
                <div className="col-span-2 grid grid-cols-3 gap-1.5">
                  <select
                    value={rule.event.variableName || 'score'}
                    onChange={e =>
                      handleUpdateEvent({ ...rule.event, variableName: e.target.value })
                    }
                    className="bg-purple-950 border border-purple-700 rounded px-1.5 py-1 text-xs text-white"
                  >
                    {variables.map(v => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rule.event.comparator || '>='}
                    onChange={e =>
                      handleUpdateEvent({ ...rule.event, comparator: e.target.value })
                    }
                    className="bg-purple-950 border border-purple-700 rounded px-1.5 py-1 text-xs text-white"
                  >
                    <option value=">=">&gt;=</option>
                    <option value="==">==</option>
                    <option value="<=">&lt;=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                  </select>
                  <input
                    type="number"
                    value={rule.event.compareValue ?? 10}
                    onChange={e =>
                      handleUpdateEvent({
                        ...rule.event,
                        compareValue: Number(e.target.value),
                      })
                    }
                    className="bg-purple-950 border border-purple-700 rounded px-1.5 py-1 text-xs text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* CONDITIONS SECTION (Cyan Badge) */}
          <div className="bg-[#0b162b] border border-cyan-500/30 rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <span>❓</span> CONDITIONS (IF)
              </span>
              <button
                onClick={handleAddCondition}
                className="text-[10px] text-cyan-300 font-bold hover:underline"
              >
                + Add Condition
              </button>
            </div>

            {(!rule.conditions || rule.conditions.length === 0) ? (
              <p className="text-[11px] text-cyan-300/40 italic">Always executes when Event occurs</p>
            ) : (
              <div className="space-y-1.5">
                {rule.conditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-purple-950/60 p-1.5 rounded border border-cyan-900/40">
                    <select
                      value={cond.type}
                      onChange={e => handleUpdateCondition(idx, { ...cond, type: e.target.value })}
                      className="bg-purple-900/80 text-white rounded px-1.5 py-0.5 text-[11px]"
                    >
                      <option value="is_grounded">🦶 Is Grounded</option>
                      <option value="is_alive">❤️ Is Alive</option>
                      <option value="entity_exists">📦 Entity Exists</option>
                      <option value="variable_compare">📊 Variable Compare</option>
                      <option value="has_tag">🏷 Has Tag</option>
                    </select>

                    <button
                      onClick={() => handleDeleteCondition(idx)}
                      className="text-red-400 text-xs hover:text-red-300 px-1 ml-auto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIONS SECTION (Magenta Badge) */}
          <div className="bg-[#1f0b24] border border-fuchsia-500/30 rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1">
                <span>🎯</span> ACTIONS (THEN)
              </span>
              <button
                onClick={handleAddAction}
                className="text-[10px] text-fuchsia-300 font-bold hover:underline"
              >
                + Add Action
              </button>
            </div>

            {(!rule.actions || rule.actions.length === 0) ? (
              <p className="text-[11px] text-fuchsia-300/40 italic">No actions defined</p>
            ) : (
              <div className="space-y-2">
                {rule.actions.map((act, idx) => (
                  <div key={idx} className="bg-purple-950/80 p-2 rounded-lg border border-fuchsia-900/50 space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <select
                        value={act.type}
                        onChange={e => handleUpdateAction(idx, { ...act, type: e.target.value })}
                        className="bg-purple-900 text-white rounded px-2 py-1 text-xs font-bold border border-fuchsia-700/50"
                      >
                        <option value="move">🏃 Move Entity</option>
                        <option value="jump">🦘 Jump Entity</option>
                        <option value="destroy">💥 Destroy Entity</option>
                        <option value="add_score">🪙 Add Score</option>
                        <option value="remove_life">💔 Remove Life</option>
                        <option value="add_variable">➕ Add Variable</option>
                        <option value="set_variable">📝 Set Variable</option>
                        <option value="start_spawner">🌀 Start Spawner</option>
                        <option value="spawn_particles">✨ Spawn Particles</option>
                        <option value="camera_shake">📳 Camera Shake</option>
                        <option value="win_game">🏆 Win Game</option>
                        <option value="end_game">💀 End Game</option>
                      </select>

                      <button
                        onClick={() => handleDeleteAction(idx)}
                        className="text-red-400 text-xs hover:text-red-300 px-1"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Action parameters */}
                    {(act.type === 'move' || act.type === 'jump' || act.type === 'destroy' || act.type === 'spawn_particles') && (
                      <EntityRefSelect
                        label="Target"
                        value={act.entityRef}
                        tags={tags}
                        onChange={entityRef => handleUpdateAction(idx, { ...act, entityRef })}
                      />
                    )}

                    {act.type === 'move' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          placeholder="Velocity X"
                          value={act.vx ?? 300}
                          onChange={e => handleUpdateAction(idx, { ...act, vx: Number(e.target.value) })}
                          className="bg-purple-900/60 border border-purple-800 rounded px-2 py-0.5 text-xs text-white"
                        />
                        <input
                          type="number"
                          placeholder="Velocity Y"
                          value={act.vy ?? 0}
                          onChange={e => handleUpdateAction(idx, { ...act, vy: Number(e.target.value) })}
                          className="bg-purple-900/60 border border-purple-800 rounded px-2 py-0.5 text-xs text-white"
                        />
                      </div>
                    )}

                    {act.type === 'jump' && (
                      <input
                        type="number"
                        placeholder="Jump Force"
                        value={act.value ?? 600}
                        onChange={e => handleUpdateAction(idx, { ...act, value: Number(e.target.value) })}
                        className="bg-purple-900/60 border border-purple-800 rounded px-2 py-0.5 text-xs text-white w-full"
                      />
                    )}

                    {(act.type === 'add_score' || act.type === 'remove_life' || act.type === 'camera_shake') && (
                      <input
                        type="number"
                        placeholder="Amount"
                        value={act.value ?? 10}
                        onChange={e => handleUpdateAction(idx, { ...act, value: Number(e.target.value) })}
                        className="bg-purple-900/60 border border-purple-800 rounded px-2 py-0.5 text-xs text-white w-full"
                      />
                    )}

                    {act.type === 'start_spawner' && (
                      <select
                        value={act.spawnerName || ''}
                        onChange={e => handleUpdateAction(idx, { ...act, spawnerName: e.target.value })}
                        className="bg-purple-900/60 border border-purple-800 rounded px-2 py-0.5 text-xs text-white w-full"
                      >
                        <option value="">Select Spawner...</option>
                        {spawners.map(s => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Entity Ref Selector Component ──────────────────────────────

function EntityRefSelect({ label, value, tags, onChange }) {
  const mode = value?.mode || 'tag';
  const tag = value?.tag || 'player';

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-purple-300/70 text-[10px] uppercase font-bold shrink-0">{label}:</span>
      <select
        value={mode}
        onChange={e => onChange({ mode: e.target.value, tag })}
        className="bg-purple-900 border border-purple-700/60 rounded px-1.5 py-0.5 text-[11px] text-white"
      >
        <option value="tag">Tag</option>
        <option value="self">Self (Subject)</option>
        <option value="other">Other (Object)</option>
        <option value="type">Type</option>
      </select>

      {mode === 'tag' && (
        <select
          value={tag}
          onChange={e => onChange({ mode: 'tag', tag: e.target.value })}
          className="bg-purple-900 border border-purple-700/60 rounded px-1.5 py-0.5 text-[11px] text-cyan-300 font-bold"
        >
          {tags.map(t => (
            <option key={t} value={t}>
              #{t}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ── Inputs Tab ─────────────────────────────────────────────────

function InputsTab({ bindings, onUpdateInputs }) {
  const handleAdd = () => {
    const newBinding = {
      name: `Action ${bindings.length + 1}`,
      keys: ['KeyE'],
    };
    onUpdateInputs([...bindings, newBinding]);
  };

  const handleUpdate = (index, patch) => {
    const next = [...bindings];
    next[index] = { ...next[index], ...patch };
    onUpdateInputs(next);
  };

  const handleDelete = index => {
    onUpdateInputs(bindings.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Input Action Mappings</h3>
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-md active:scale-95 transition-all"
        >
          + Add Input
        </button>
      </div>

      <div className="space-y-3">
        {bindings.map((b, idx) => (
          <div key={idx} className="bg-[#120a26] border border-purple-800/60 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={b.name}
                onChange={e => handleUpdate(idx, { name: e.target.value })}
                className="bg-purple-950 border border-purple-800 rounded px-2 py-1 text-xs font-extrabold text-white flex-1"
              />
              <button
                onClick={() => handleDelete(idx)}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded"
              >
                🗑
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-400 font-bold uppercase">Keys:</span>
              <input
                type="text"
                value={(b.keys || []).join(', ')}
                onChange={e =>
                  handleUpdate(idx, {
                    keys: e.target.value.split(',').map(k => k.trim()).filter(Boolean),
                  })
                }
                className="bg-purple-950 border border-purple-800 rounded px-2 py-1 text-xs text-cyan-300 font-mono flex-1"
                placeholder="e.g. Space, KeyW"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Variables Tab ──────────────────────────────────────────────

function VariablesTab({ variables, onUpdateVariables }) {
  const handleAdd = () => {
    const newVar = {
      name: `customVar_${variables.length + 1}`,
      type: 'number',
      defaultValue: 0,
    };
    onUpdateVariables([...variables, newVar]);
  };

  const handleUpdate = (index, patch) => {
    const next = [...variables];
    next[index] = { ...next[index], ...patch };
    onUpdateVariables(next);
  };

  const handleDelete = index => {
    onUpdateVariables(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Game Variables</h3>
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-md active:scale-95 transition-all"
        >
          + Add Variable
        </button>
      </div>

      <div className="space-y-3">
        {variables.map((v, idx) => {
          const isBuiltIn = ['score', 'lives', 'health', 'gameSpeed'].includes(v.name);
          return (
            <div
              key={idx}
              className={`border rounded-xl p-3 space-y-2 ${
                isBuiltIn ? 'bg-[#0f172a] border-cyan-500/30' : 'bg-[#120a26] border-purple-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  disabled={isBuiltIn}
                  value={v.name}
                  onChange={e => handleUpdate(idx, { name: e.target.value })}
                  className={`bg-purple-950 border border-purple-800 rounded px-2 py-1 text-xs font-extrabold text-white flex-1 ${
                    isBuiltIn ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                />
                {isBuiltIn && (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold">
                    BUILT-IN
                  </span>
                )}
                {!isBuiltIn && (
                  <button
                    onClick={() => handleDelete(idx)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded"
                  >
                    🗑
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase">Type:</span>
                  <select
                    disabled={isBuiltIn}
                    value={v.type}
                    onChange={e => handleUpdate(idx, { type: e.target.value })}
                    className="bg-purple-950 border border-purple-800 rounded px-2 py-1 text-xs text-white w-full"
                  >
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="string">String</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase">Default:</span>
                  <input
                    type="text"
                    value={v.defaultValue}
                    onChange={e =>
                      handleUpdate(idx, {
                        defaultValue:
                          v.type === 'number' ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className="bg-purple-950 border border-purple-800 rounded px-2 py-1 text-xs text-cyan-300 font-mono w-full"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Spawners Tab ───────────────────────────────────────────────

function SpawnersTab({ spawners, tags, onUpdateSpawners }) {
  const handleAdd = () => {
    const newSpawner = {
      id: generateSpawnerId(),
      name: `Spawner ${spawners.length + 1}`,
      entityType: 'hazard',
      entityTags: ['hazard'],
      entityAppearance: { color: '#ff0055' },
      interval: 2.5,
      spawnPosition: { x: 400, y: 100 },
      initialVelocity: { vx: 0, vy: 150 },
      maxActive: 5,
      autoStart: true,
    };
    onUpdateSpawners([...spawners, newSpawner]);
  };

  const handleUpdate = (index, patch) => {
    const next = [...spawners];
    next[index] = { ...next[index], ...patch };
    onUpdateSpawners(next);
  };

  const handleDelete = index => {
    onUpdateSpawners(spawners.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Dynamic Spawners</h3>
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-md active:scale-95 transition-all"
        >
          + Add Spawner
        </button>
      </div>

      <div className="space-y-3">
        {spawners.map((s, idx) => (
          <div key={s.id || idx} className="bg-[#120a26] border border-purple-800/60 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={s.name}
                onChange={e => handleUpdate(idx, { name: e.target.value })}
                className="bg-purple-950 border border-purple-800 rounded px-2 py-1 text-xs font-extrabold text-white flex-1"
              />
              <label className="flex items-center gap-1 text-[10px] text-purple-300 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.autoStart !== false}
                  onChange={e => handleUpdate(idx, { autoStart: e.target.checked })}
                  className="rounded accent-cyan-500"
                />
                Auto Start
              </label>
              <button
                onClick={() => handleDelete(idx)}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded"
              >
                🗑
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-purple-400 font-bold uppercase">Entity Type:</span>
                <input
                  type="text"
                  value={s.entityType || 'hazard'}
                  onChange={e => handleUpdate(idx, { entityType: e.target.value })}
                  className="bg-purple-950 border border-purple-800 rounded px-2 py-1 text-xs text-white w-full"
                />
              </div>

              <div>
                <span className="text-[10px] text-purple-400 font-bold uppercase">Interval (sec):</span>
                <input
                  type="number"
                  step="0.1"
                  value={s.interval || 2}
                  onChange={e => handleUpdate(idx, { interval: Number(e.target.value) })}
                  className="bg-purple-950 border border-purple-800 rounded px-2 py-1 text-xs text-white w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-purple-400 font-bold uppercase">Spawn X:</span>
                <input
                  type="number"
                  value={s.spawnPosition?.x || 400}
                  onChange={e =>
                    handleUpdate(idx, {
                      spawnPosition: { ...s.spawnPosition, x: Number(e.target.value) },
                    })
                  }
                  className="bg-purple-950 border border-purple-800 rounded px-2 py-1 text-xs text-cyan-300 font-mono w-full"
                />
              </div>
              <div>
                <span className="text-[10px] text-purple-400 font-bold uppercase">Spawn Y:</span>
                <input
                  type="number"
                  value={s.spawnPosition?.y || 100}
                  onChange={e =>
                    handleUpdate(idx, {
                      spawnPosition: { ...s.spawnPosition, y: Number(e.target.value) },
                    })
                  }
                  className="bg-purple-950 border border-purple-800 rounded px-2 py-1 text-xs text-cyan-300 font-mono w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
