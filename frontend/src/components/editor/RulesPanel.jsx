import React, { useState } from 'react';
import { generateRuleId } from '../../types/gameModel';

/**
 * RulesPanel — visual rule builder for event-driven game logic.
 * Structured as: WHEN [subjectTag] [triggerType] [objectTag] DO [actionType] [value].
 */

const TRIGGER_TYPES = [
  { value: 'collision', label: 'Touches' },
  { value: 'game_start', label: 'Game Starts' },
  { value: 'timer', label: 'Every N Seconds' },
  { value: 'score_reached', label: 'Score Reaches' },
];

const ACTION_TYPES = [
  { value: 'add_score', label: 'Add Score', hasValue: true, defaultValue: 10 },
  { value: 'remove_life', label: 'Remove Life', hasValue: true, defaultValue: 1 },
  { value: 'apply_force', label: 'Apply Force / Jump', hasValue: true, defaultValue: -500 },
  { value: 'destroy_entity', label: 'Destroy Object', targetOptions: ['object', 'subject'] },
  { value: 'camera_shake', label: 'Camera Shake', hasValue: true, defaultValue: 10 },
  { value: 'spawn_entity', label: 'Spawn Particles' },
  { value: 'win_game', label: 'Win Game' },
  { value: 'end_game', label: 'Game Over' },
];

export default function RulesPanel({ rules = [], tags = [], onAddRule, onUpdateRule, onDeleteRule, onClose }) {
  const [editingRuleId, setEditingRuleId] = useState(null);

  const availableTags = Array.from(new Set(['player', 'solid', 'hazard', 'collectible', 'goal', 'powerup', ...tags]));

  const handleCreateRule = () => {
    const newRule = {
      id: generateRuleId(),
      name: 'Custom Rule',
      enabled: true,
      trigger: {
        type: 'collision',
        subjectTag: 'player',
        objectTag: 'collectible',
      },
      actions: [
        {
          type: 'add_score',
          value: 10,
          target: 'object',
        },
      ],
    };
    onAddRule(newRule);
    setEditingRuleId(newRule.id);
  };

  return (
    <div className="bg-[#0d071a]/95 border-t border-purple-900/40 p-4 flex flex-col gap-3 max-h-72 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Game Rules & Logic</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/50">
            {rules.length} Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateRule}
            className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1"
          >
            <span>+</span> Add Rule
          </button>
          {onClose && (
            <button onClick={onClose} className="text-xs text-purple-400 hover:text-white px-2 py-1">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="text-center py-6 text-xs text-purple-400/50 border border-dashed border-purple-800/30 rounded-xl">
          No rules configured yet. Click "+ Add Rule" to create collision, score, or game-over behaviors!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rules.map((rule) => {
            const isEditing = editingRuleId === rule.id;
            return (
              <div
                key={rule.id}
                className={`p-3 rounded-xl border transition-all text-xs flex flex-col gap-2 ${
                  rule.enabled
                    ? 'bg-purple-950/40 border-purple-800/40 hover:border-purple-600/60'
                    : 'bg-purple-950/20 border-purple-900/20 opacity-50'
                }`}
              >
                {/* Rule Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateRule(rule.id, { enabled: !rule.enabled })}
                      className={`w-3.5 h-3.5 rounded transition-all flex items-center justify-center text-[9px] font-bold ${
                        rule.enabled ? 'bg-cyan-500 text-black' : 'bg-purple-800 text-transparent'
                      }`}
                    >
                      ✓
                    </button>
                    <input
                      type="text"
                      value={rule.name}
                      onChange={(e) => onUpdateRule(rule.id, { name: e.target.value })}
                      className="bg-transparent font-bold text-purple-200 focus:text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingRuleId(isEditing ? null : rule.id)}
                      className="text-[10px] text-cyan-400 hover:underline px-1.5 py-0.5"
                    >
                      {isEditing ? 'Done' : 'Edit'}
                    </button>
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Read-Only Summary */}
                {!isEditing && (
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-purple-300/80">
                    <span className="text-purple-400 font-bold">WHEN</span>
                    {rule.trigger.type === 'game_start' ? (
                      <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-cyan-300 border border-purple-700/50">
                        Game Starts
                      </span>
                    ) : (
                      <>
                        <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-cyan-300 border border-purple-700/50">
                          [{rule.trigger.subjectTag || 'any'}]
                        </span>
                        <span className="text-purple-400">{getTriggerLabel(rule.trigger.type)}</span>
                        {rule.trigger.type === 'collision' && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-cyan-300 border border-purple-700/50">
                            [{rule.trigger.objectTag || 'any'}]
                          </span>
                        )}
                      </>
                    )}
                    <span className="text-purple-400 font-bold">DO</span>
                    {rule.actions.map((act, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800/50">
                        {getActionLabel(act)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Editable Controls */}
                {isEditing && (
                  <div className="space-y-2 pt-1 border-t border-purple-900/30">
                    {/* Trigger row */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-bold text-purple-400">WHEN</span>
                      <select
                        value={rule.trigger.type}
                        onChange={(e) =>
                          onUpdateRule(rule.id, {
                            trigger: { ...rule.trigger, type: e.target.value },
                          })
                        }
                        className="bg-purple-900/60 border border-purple-700/50 rounded px-2 py-1 text-purple-200 focus:outline-none font-bold"
                      >
                        {TRIGGER_TYPES.map((tt) => (
                          <option key={tt.value} value={tt.value}>
                            {tt.label}
                          </option>
                        ))}
                      </select>

                      {rule.trigger.type !== 'game_start' && (
                        <select
                          value={rule.trigger.subjectTag || 'player'}
                          onChange={(e) =>
                            onUpdateRule(rule.id, {
                              trigger: { ...rule.trigger, subjectTag: e.target.value },
                            })
                          }
                          className="bg-purple-900/60 border border-purple-700/50 rounded px-2 py-1 text-cyan-300 focus:outline-none"
                        >
                          {availableTags.map((t) => (
                            <option key={t} value={t}>
                              [{t}]
                            </option>
                          ))}
                        </select>
                      )}

                      {rule.trigger.type === 'collision' && (
                        <select
                          value={rule.trigger.objectTag || 'collectible'}
                          onChange={(e) =>
                            onUpdateRule(rule.id, {
                              trigger: { ...rule.trigger, objectTag: e.target.value },
                            })
                          }
                          className="bg-purple-900/60 border border-purple-700/50 rounded px-2 py-1 text-cyan-300 focus:outline-none"
                        >
                          {availableTags.map((t) => (
                            <option key={t} value={t}>
                              [{t}]
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Actions list editing */}
                    {rule.actions.map((action, actIdx) => (
                      <div key={actIdx} className="flex flex-wrap items-center gap-2 text-[11px] bg-purple-900/20 p-2 rounded-lg">
                        <span className="font-bold text-fuchsia-400">DO</span>
                        <select
                          value={action.type}
                          onChange={(e) => {
                            const actDef = ACTION_TYPES.find((a) => a.value === e.target.value);
                            const updated = [...rule.actions];
                            updated[actIdx] = {
                              ...action,
                              type: e.target.value,
                              value: actDef?.hasValue ? actDef.defaultValue : undefined,
                            };
                            onUpdateRule(rule.id, { actions: updated });
                          }}
                          className="bg-purple-900/60 border border-purple-700/50 rounded px-2 py-1 text-fuchsia-200 focus:outline-none"
                        >
                          {ACTION_TYPES.map((at) => (
                            <option key={at.value} value={at.value}>
                              {at.label}
                            </option>
                          ))}
                        </select>

                        {/* If action accepts a numeric value */}
                        {ACTION_TYPES.find((at) => at.value === action.type)?.hasValue && (
                          <input
                            type="number"
                            value={action.value ?? 10}
                            onChange={(e) => {
                              const updated = [...rule.actions];
                              updated[actIdx] = { ...action, value: Number(e.target.value) };
                              onUpdateRule(rule.id, { actions: updated });
                            }}
                            className="w-16 bg-purple-950 border border-purple-700/50 rounded px-2 py-1 text-white text-right focus:outline-none"
                          />
                        )}

                        {/* Target selector if action targets subject vs object */}
                        {action.type === 'destroy_entity' && (
                          <select
                            value={action.target || 'object'}
                            onChange={(e) => {
                              const updated = [...rule.actions];
                              updated[actIdx] = { ...action, target: e.target.value };
                              onUpdateRule(rule.id, { actions: updated });
                            }}
                            className="bg-purple-900/60 border border-purple-700/50 rounded px-2 py-1 text-purple-200 focus:outline-none"
                          >
                            <option value="object">Object Touched</option>
                            <option value="subject">Subject</option>
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTriggerLabel(type) {
  const found = TRIGGER_TYPES.find((t) => t.value === type);
  return found ? found.label.toLowerCase() : type;
}

function getActionLabel(act) {
  const found = ACTION_TYPES.find((a) => a.value === act.type);
  const base = found ? found.label : act.type;
  if (act.value !== undefined) return `${base} (${act.value})`;
  return base;
}
