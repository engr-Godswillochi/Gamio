/**
 * Gamio — Generalized Game Model (v2)
 *
 * Replaces the flat template-centric schema with an entity-based scene graph.
 * Both manual editor and AI assistant operate on this same model.
 * The engine renders this model. Publishing serializes it.
 *
 * Design decisions:
 * - Entities are the scene graph nodes — everything on canvas is an entity.
 * - Rules define game logic as trigger → action pairs (no hardcoded game-type logic).
 * - Physics, scoring, and controls are scene-global but entities can override.
 * - Assets are referenced by ID, stored separately from the schema.
 */

// ─── Entity Types ───────────────────────────────────────────────

export type EntityType =
  | 'player'
  | 'platform'
  | 'wall'
  | 'enemy'
  | 'coin'
  | 'spike'
  | 'goal'
  | 'powerup'
  | 'text'
  | 'image'
  | 'rectangle'
  | 'circle'
  | 'particle_emitter'
  | 'custom';

export interface EntityTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;   // degrees
  scale: number;
}

export interface EntityPhysics {
  enabled: boolean;
  gravity?: number;       // per-entity gravity override (multiplier of global)
  mass?: number;
  friction?: number;      // 0–1
  bounciness?: number;    // 0–1
  drag?: number;          // 0–1
  isStatic?: boolean;     // true = immovable (platforms, walls)
}

export interface EntityMovement {
  speed?: number;
  acceleration?: number;
  jumpForce?: number;
  airControl?: number;    // 0–1
  pattern?: 'none' | 'horizontal' | 'vertical' | 'follow_player' | 'patrol';
  patrolDistance?: number;
  patrolSpeed?: number;
}

export interface EntityAppearance {
  shape: 'rect' | 'circle' | 'sprite' | 'text';
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;       // 0–1
  spriteAssetId?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  glow?: boolean;
  glowColor?: string;
  glowRadius?: number;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  transform: EntityTransform;
  physics: EntityPhysics;
  movement: EntityMovement;
  appearance: EntityAppearance;
  tags: string[];
  isLocked: boolean;
  isVisible: boolean;
}

// ─── Legacy Rules (DEPRECATED — kept for migration) ─────────────

/** @deprecated Use LogicEventType instead */
export type TriggerType =
  | 'collision' | 'timer' | 'input' | 'score_reached'
  | 'game_start' | 'entity_destroyed' | 'out_of_bounds';

/** @deprecated Use LogicActionType instead */
export type ActionType =
  | 'add_score' | 'remove_life' | 'destroy_entity' | 'play_sound'
  | 'spawn_entity' | 'end_game' | 'win_game' | 'change_property'
  | 'apply_force' | 'set_variable' | 'camera_shake';

/** @deprecated Use LogicEvent instead */
export interface RuleTrigger {
  type: TriggerType;
  subjectTag?: string;
  objectTag?: string;
  key?: string;
  value?: number;
}

/** @deprecated Use LogicAction instead */
export interface RuleAction {
  type: ActionType;
  target?: 'subject' | 'object' | 'all';
  value?: number | string;
  property?: string;
  entityTemplate?: Partial<Entity>;
}

/** @deprecated Use LogicRule instead */
export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: RuleTrigger;
  actions: RuleAction[];
}

// ─── Logic System v3 (EVENT → CONDITION → ACTION) ──────────────

export type Comparator = '==' | '!=' | '>' | '<' | '>=' | '<=';
export type GameState = 'ready' | 'playing' | 'paused' | 'gameover' | 'win' | 'replaying';

/** How a rule references an entity — by specific id, type, tag, or contextual role. */
export interface EntityRef {
  mode: 'id' | 'type' | 'tag' | 'self' | 'other';
  id?: string;
  type?: EntityType;
  tag?: string;
}

// ── Events ──

export type LogicEventType =
  // Lifecycle
  | 'game_start' | 'game_over' | 'game_restart'
  // Input (raw keys)
  | 'key_pressed' | 'key_released' | 'key_held'
  // Input (named bindings)
  | 'input_pressed' | 'input_held' | 'input_released'
  // Collision
  | 'collision_start'
  // Time
  | 'every_interval' | 'after_delay' | 'every_frame'
  // State
  | 'variable_changed' | 'variable_reached'
  // Entity
  | 'entity_destroyed' | 'out_of_bounds';

export interface LogicEvent {
  type: LogicEventType;
  key?: string;                // for key_pressed / key_released / key_held
  inputAction?: string;        // for input_pressed / input_held / input_released
  subjectRef?: EntityRef;      // which entity triggers (collision subject)
  objectRef?: EntityRef;       // collision target
  interval?: number;           // seconds — for every_interval
  delay?: number;              // seconds — for after_delay
  variableName?: string;       // for variable_changed / variable_reached
  comparator?: Comparator;     // for variable_reached
  compareValue?: number;       // for variable_reached
}

// ── Conditions ──

export type LogicConditionType =
  | 'is_grounded' | 'is_alive' | 'entity_exists'
  | 'variable_compare'
  | 'game_state_is'
  | 'has_tag'
  | 'key_is_held';

export interface LogicCondition {
  type: LogicConditionType;
  entityRef?: EntityRef;
  variableName?: string;
  comparator?: Comparator;
  compareValue?: number | boolean | string;
  gameState?: GameState;
  tag?: string;
  key?: string;
  negate?: boolean;
}

// ── Actions ──

export type LogicActionType =
  // Entity
  | 'move' | 'jump' | 'destroy' | 'teleport'
  | 'set_velocity' | 'apply_force'
  | 'show' | 'hide' | 'freeze' | 'unfreeze'
  // Spawner
  | 'start_spawner' | 'stop_spawner' | 'spawn_entity'
  // Variables
  | 'set_variable' | 'add_variable' | 'subtract_variable'
  // Game
  | 'end_game' | 'win_game' | 'restart_game' | 'set_game_speed'
  // Score / Lives (convenience — wrap built-in variables)
  | 'add_score' | 'remove_life'
  // Visual / Audio
  | 'camera_shake' | 'spawn_particles' | 'play_sound';

export interface LogicAction {
  type: LogicActionType;
  entityRef?: EntityRef;       // which entity to act on
  value?: number;
  stringValue?: string;
  variableName?: string;
  spawnerName?: string;
  x?: number; y?: number;     // for teleport / set_position
  vx?: number; vy?: number;   // for move / set_velocity
}

// ── Rule ──

export interface LogicRule {
  id: string;
  name: string;
  enabled: boolean;
  event: LogicEvent;
  conditions: LogicCondition[];
  actions: LogicAction[];
}

// ── Input Bindings ──

export interface InputBinding {
  name: string;                // e.g. "Jump", "Move Left", "Fire"
  keys: string[];              // e.g. ["Space", "ArrowUp"]
}

// ── Game Variables ──

export type VariableType = 'number' | 'boolean' | 'string';

export interface GameVariable {
  name: string;
  type: VariableType;
  defaultValue: number | boolean | string;
}

// ── Spawners ──

export interface SpawnerPosition {
  x: number | 'random';
  y: number | 'random';
  xMin?: number; xMax?: number;
  yMin?: number; yMax?: number;
}

export interface SpawnerConfig {
  id: string;
  name: string;
  entityType: EntityType;
  entityTags: string[];
  entityAppearance?: Partial<EntityAppearance>;
  interval: number;            // seconds between spawns
  spawnPosition: SpawnerPosition;
  initialVelocity?: { vx: number; vy: number };
  maxActive?: number;
  autoStart?: boolean;
}

// ── Logic Container ──

export interface LogicConfig {
  rules: LogicRule[];
  variables: GameVariable[];
  inputBindings: InputBinding[];
  spawners: SpawnerConfig[];
}

// ─── Scene Configuration ────────────────────────────────────────

export type ScrollType = 'none' | 'follow_player' | 'auto_scroll';

export interface SceneConfig {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundAssetId?: string;
  scrollType: ScrollType;
  scrollSpeed?: number;
  bounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  gridVisible?: boolean;
  gridSize?: number;
  gridColor?: string;
}

// ─── Global Physics ─────────────────────────────────────────────

export interface PhysicsConfig {
  gravity: number;          // pixels per second² (e.g. 1600 default, 0 for space)
  gameSpeed: number;        // global time multiplier (1.0 = normal)
  airFriction: number;      // 0–1
}

// ─── Controls ───────────────────────────────────────────────────

export interface ControlsConfig {
  jumpKeys: string[];
  moveLeftKeys: string[];
  moveRightKeys: string[];
  moveUpKeys: string[];
  moveDownKeys: string[];
}

// ─── Scoring ────────────────────────────────────────────────────

export type MetricType = 'score' | 'time_ms' | 'level_reached';
export type WinCondition = 'none' | 'reach_score' | 'survive_time' | 'reach_goal' | 'collect_all';

export interface ScoringConfig {
  metricType: MetricType;
  winCondition: WinCondition;
  targetValue?: number;
  livesEnabled: boolean;
  maxLives: number;
  difficultyRamp?: number;  // speed multiplier increase per second (e.g. 0.015)
}

// ─── Theme ──────────────────────────────────────────────────────

export interface ThemeConfig {
  name: string;
  accentColor: string;
  particleColor: string;
  hudColor: string;
  fontFamily?: string;
}

// ─── Assets ─────────────────────────────────────────────────────

export type AssetType = 'image' | 'audio' | 'sprite_sheet';
export type AssetSource = 'system' | 'user';

export interface AssetRef {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  source: AssetSource;
}

// ─── Default Configurations ─────────────────────────────────────

export const DEFAULT_SCENE: SceneConfig = {
  width: 800,
  height: 450,
  backgroundColor: '#07040d',
  scrollType: 'none',
  scrollSpeed: 0,
  bounds: { left: 0, right: 800, top: 0, bottom: 450 },
  gridVisible: true,
  gridSize: 32,
  gridColor: 'rgba(0, 240, 255, 0.05)',
};

export const DEFAULT_PHYSICS: PhysicsConfig = {
  gravity: 1600,
  gameSpeed: 1.0,
  airFriction: 0.05,
};

export const DEFAULT_THEME: ThemeConfig = {
  name: 'Neon Synthwave',
  accentColor: '#00f0ff',
  particleColor: '#a100ff',
  hudColor: '#00f0ff',
  fontFamily: 'Space Grotesk',
};

export const DEFAULT_SCORING: ScoringConfig = {
  metricType: 'score',
  winCondition: 'none',
  livesEnabled: true,
  maxLives: 3,
};

export const DEFAULT_CONTROLS: ControlsConfig = {
  jumpKeys: ['Space', 'ArrowUp', 'KeyW'],
  moveLeftKeys: ['ArrowLeft', 'KeyA'],
  moveRightKeys: ['ArrowRight', 'KeyD'],
  moveUpKeys: ['ArrowUp', 'KeyW'],
  moveDownKeys: ['ArrowDown', 'KeyS'],
};

// ─── The Game Schema (v2) ───────────────────────────────────────

export interface GameModelSchema {
  soundtrack?: 'neon' | 'arcade' | 'chill' | 'none';
  // Identity
  id: string;
  title: string;
  slug: string;
  description: string;
  version: number;
  creationPath: 'manual' | 'ai';
  remixOfId?: string | null;

  // The world
  scene: SceneConfig;
  entities: Entity[];
  physics: PhysicsConfig;
  theme: ThemeConfig;
  assets: AssetRef[];

  // Logic System v3
  logic: LogicConfig;

  // Deprecated — kept for backward compatibility / migration
  controls?: ControlsConfig;
  scoring?: ScoringConfig;
  rules?: Rule[];

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ─── Factory Functions ──────────────────────────────────────────

let _nextId = 1;
export function generateEntityId(): string {
  return `ent_${Date.now().toString(36)}_${(_nextId++).toString(36)}`;
}

export function generateRuleId(): string {
  return `rule_${Date.now().toString(36)}_${(_nextId++).toString(36)}`;
}

export function generateLogicRuleId(): string {
  return `lr_${Date.now().toString(36)}_${(_nextId++).toString(36)}`;
}

export function generateSpawnerId(): string {
  return `spw_${Date.now().toString(36)}_${(_nextId++).toString(36)}`;
}

export function generateVariableId(): string {
  return `var_${Date.now().toString(36)}_${(_nextId++).toString(36)}`;
}

export function generateInputBindingId(): string {
  return `in_${Date.now().toString(36)}_${(_nextId++).toString(36)}`;
}

/**
 * Create a default entity for a given type.
 * These are sensible starting configurations, not exhaustive.
 */
export function createDefaultEntity(type: EntityType, x = 100, y = 100): Entity {
  const id = generateEntityId();

  const base: Entity = {
    id,
    name: entityTypeLabel(type),
    type,
    transform: { x, y, width: 32, height: 32, rotation: 0, scale: 1 },
    physics: { enabled: false, isStatic: true },
    movement: {},
    appearance: { shape: 'rect', color: '#888888', opacity: 1 },
    tags: [],
    isLocked: false,
    isVisible: true,
  };

  switch (type) {
    case 'player':
      return {
        ...base,
        name: 'Player',
        transform: { ...base.transform, width: 32, height: 32 },
        physics: { enabled: true, isStatic: false, mass: 1, friction: 0.2, bounciness: 0, drag: 0 },
        movement: { speed: 300, jumpForce: 600, airControl: 0.7 },
        appearance: { shape: 'rect', color: '#00f0ff', opacity: 1, glow: true, glowColor: '#00f0ff', glowRadius: 12 },
        tags: ['player'],
      };

    case 'platform':
      return {
        ...base,
        name: 'Platform',
        transform: { ...base.transform, width: 200, height: 24 },
        physics: { enabled: true, isStatic: true },
        appearance: { shape: 'rect', color: '#1a0b2e', strokeColor: '#00f0ff', strokeWidth: 2, opacity: 1 },
        tags: ['solid'],
      };

    case 'wall':
      return {
        ...base,
        name: 'Wall',
        transform: { ...base.transform, width: 24, height: 120 },
        physics: { enabled: true, isStatic: true },
        appearance: { shape: 'rect', color: '#1a0b2e', strokeColor: '#a100ff', strokeWidth: 2, opacity: 1 },
        tags: ['solid'],
      };

    case 'enemy':
      return {
        ...base,
        name: 'Enemy',
        transform: { ...base.transform, width: 28, height: 28 },
        physics: { enabled: true, isStatic: false, mass: 1 },
        movement: { speed: 120, pattern: 'horizontal', patrolDistance: 200 },
        appearance: { shape: 'rect', color: '#ff2d7c', opacity: 1, glow: true, glowColor: '#ff2d7c', glowRadius: 10 },
        tags: ['hazard'],
      };

    case 'coin':
      return {
        ...base,
        name: 'Coin',
        transform: { ...base.transform, width: 20, height: 20 },
        physics: { enabled: false, isStatic: true },
        appearance: { shape: 'circle', color: '#ffe600', opacity: 1, glow: true, glowColor: '#ffe600', glowRadius: 8 },
        tags: ['collectible'],
      };

    case 'spike':
      return {
        ...base,
        name: 'Spike',
        transform: { ...base.transform, width: 32, height: 16 },
        physics: { enabled: true, isStatic: true },
        appearance: { shape: 'rect', color: '#ff0055', opacity: 1 },
        tags: ['hazard'],
      };

    case 'goal':
      return {
        ...base,
        name: 'Goal',
        transform: { ...base.transform, width: 32, height: 64 },
        physics: { enabled: false, isStatic: true },
        appearance: { shape: 'rect', color: '#39ff14', opacity: 0.8, glow: true, glowColor: '#39ff14', glowRadius: 16 },
        tags: ['goal'],
      };

    case 'powerup':
      return {
        ...base,
        name: 'Power-Up',
        transform: { ...base.transform, width: 24, height: 24 },
        physics: { enabled: false, isStatic: true },
        appearance: { shape: 'circle', color: '#b347ff', opacity: 1, glow: true, glowColor: '#b347ff', glowRadius: 10 },
        tags: ['powerup'],
      };

    case 'text':
      return {
        ...base,
        name: 'Text',
        transform: { ...base.transform, width: 200, height: 40 },
        physics: { enabled: false, isStatic: true },
        appearance: { shape: 'text', text: 'Hello World', color: '#ffffff', fontSize: 24, fontFamily: 'monospace', opacity: 1 },
        tags: [],
      };

    case 'rectangle':
      return {
        ...base,
        name: 'Rectangle',
        transform: { ...base.transform, width: 100, height: 60 },
        physics: { enabled: false, isStatic: true },
        appearance: { shape: 'rect', color: '#2a2a3a', strokeColor: '#555', strokeWidth: 1, opacity: 1 },
        tags: [],
      };

    case 'circle':
      return {
        ...base,
        name: 'Circle',
        transform: { ...base.transform, width: 40, height: 40 },
        physics: { enabled: false, isStatic: true },
        appearance: { shape: 'circle', color: '#2a2a3a', strokeColor: '#555', strokeWidth: 1, opacity: 1 },
        tags: [],
      };

    default:
      return base;
  }
}

/**
 * Human-readable label for an entity type.
 */
export function entityTypeLabel(type: EntityType): string {
  const labels: Record<EntityType, string> = {
    player: 'Player',
    platform: 'Platform',
    wall: 'Wall',
    enemy: 'Enemy',
    coin: 'Coin',
    spike: 'Spike',
    goal: 'Goal',
    powerup: 'Power-Up',
    text: 'Text',
    image: 'Image',
    rectangle: 'Rectangle',
    circle: 'Circle',
    particle_emitter: 'Particle Emitter',
    custom: 'Custom',
  };
  return labels[type] || type;
}

/**
 * Emoji icon for an entity type (used in toolbox).
 */
export function entityTypeIcon(type: EntityType): string {
  const icons: Record<EntityType, string> = {
    player: '🧍',
    platform: '▬',
    wall: '🧱',
    enemy: '👾',
    coin: '🪙',
    spike: '⚠️',
    goal: '🏁',
    powerup: '⚡',
    text: '📝',
    image: '🖼️',
    rectangle: '⬜',
    circle: '⭕',
    particle_emitter: '✨',
    custom: '🔧',
  };
  return icons[type] || '📦';
}

// ─── Default Logic Config ───────────────────────────────────────

export function createDefaultLogic(): LogicConfig {
  return {
    inputBindings: [
      { name: 'Move Left', keys: ['ArrowLeft', 'KeyA'] },
      { name: 'Move Right', keys: ['ArrowRight', 'KeyD'] },
      { name: 'Move Up', keys: ['ArrowUp', 'KeyW'] },
      { name: 'Move Down', keys: ['ArrowDown', 'KeyS'] },
      { name: 'Jump', keys: ['Space', 'ArrowUp', 'KeyW'] },
    ],
    variables: [
      { name: 'score', type: 'number', defaultValue: 0 },
      { name: 'lives', type: 'number', defaultValue: 3 },
    ],
    spawners: [],
    rules: [
      // Movement — horizontal
      {
        id: generateLogicRuleId(), name: 'Move Left', enabled: true,
        event: { type: 'input_held', inputAction: 'Move Left' },
        conditions: [],
        actions: [{ type: 'move', entityRef: { mode: 'tag', tag: 'player' }, vx: -300, vy: 0 }],
      },
      {
        id: generateLogicRuleId(), name: 'Move Right', enabled: true,
        event: { type: 'input_held', inputAction: 'Move Right' },
        conditions: [],
        actions: [{ type: 'move', entityRef: { mode: 'tag', tag: 'player' }, vx: 300, vy: 0 }],
      },
      // Jump — with grounded condition
      {
        id: generateLogicRuleId(), name: 'Jump', enabled: true,
        event: { type: 'input_pressed', inputAction: 'Jump' },
        conditions: [{ type: 'is_grounded', entityRef: { mode: 'tag', tag: 'player' } }],
        actions: [
          { type: 'jump', entityRef: { mode: 'tag', tag: 'player' }, value: 600 },
          { type: 'spawn_particles', entityRef: { mode: 'tag', tag: 'player' } },
        ],
      },
      // Collision: hazard → remove life
      {
        id: generateLogicRuleId(), name: 'Hazard Damage', enabled: true,
        event: { type: 'collision_start', subjectRef: { mode: 'tag', tag: 'player' }, objectRef: { mode: 'tag', tag: 'hazard' } },
        conditions: [],
        actions: [
          { type: 'remove_life', value: 1 },
          { type: 'camera_shake', value: 10 },
        ],
      },
      // Collision: collectible → score + destroy
      {
        id: generateLogicRuleId(), name: 'Collect Coin', enabled: true,
        event: { type: 'collision_start', subjectRef: { mode: 'tag', tag: 'player' }, objectRef: { mode: 'tag', tag: 'collectible' } },
        conditions: [],
        actions: [
          { type: 'destroy', entityRef: { mode: 'other' } },
          { type: 'add_score', value: 10 },
          { type: 'spawn_particles', entityRef: { mode: 'other' } },
        ],
      },
      // Collision: goal → win
      {
        id: generateLogicRuleId(), name: 'Reach Goal', enabled: true,
        event: { type: 'collision_start', subjectRef: { mode: 'tag', tag: 'player' }, objectRef: { mode: 'tag', tag: 'goal' } },
        conditions: [],
        actions: [{ type: 'win_game' }],
      },
    ],
  };
}

// ─── v2 → v3 Migration ─────────────────────────────────────────

/**
 * Migrate a v2 schema (flat rules/controls/scoring) to v3 (logic block).
 * Safe to call on schemas that are already v3 — returns them unchanged.
 */
export function migrateToV3(schema: any): GameModelSchema {
  // Already migrated
  if (schema.logic) return schema as GameModelSchema;

  const logic = createDefaultLogic();

  // Migrate controls → inputBindings
  if (schema.controls) {
    const c = schema.controls as ControlsConfig;
    logic.inputBindings = [
      { name: 'Move Left', keys: c.moveLeftKeys || ['ArrowLeft', 'KeyA'] },
      { name: 'Move Right', keys: c.moveRightKeys || ['ArrowRight', 'KeyD'] },
      { name: 'Move Up', keys: c.moveUpKeys || ['ArrowUp', 'KeyW'] },
      { name: 'Move Down', keys: c.moveDownKeys || ['ArrowDown', 'KeyS'] },
      { name: 'Jump', keys: c.jumpKeys || ['Space'] },
    ];
  }

  // Migrate scoring → variables
  if (schema.scoring) {
    const s = schema.scoring as ScoringConfig;
    logic.variables = [
      { name: 'score', type: 'number', defaultValue: 0 },
      { name: 'lives', type: 'number', defaultValue: s.maxLives || 3 },
    ];
  }

  // Migrate old rules → new LogicRule format
  if (schema.rules && Array.isArray(schema.rules) && schema.rules.length > 0) {
    const migratedRules: LogicRule[] = [];
    for (const oldRule of schema.rules as Rule[]) {
      const newRule: LogicRule = {
        id: generateLogicRuleId(),
        name: oldRule.name || 'Migrated Rule',
        enabled: oldRule.enabled !== false,
        event: migrateEvent(oldRule.trigger),
        conditions: [],
        actions: oldRule.actions.map(migrateAction),
      };
      migratedRules.push(newRule);
    }
    // Replace auto-generated collision/movement rules with migrated ones,
    // but keep the movement rules (they don't exist in old format)
    const movementRules = logic.rules.filter(r =>
      r.event.type === 'input_held' || (r.event.type === 'input_pressed' && r.event.inputAction === 'Jump')
    );
    logic.rules = [...movementRules, ...migratedRules];
  }

  return {
    ...schema,
    logic,
    version: schema.version || 1,
  } as GameModelSchema;
}

function migrateEvent(trigger: RuleTrigger): LogicEvent {
  switch (trigger.type) {
    case 'collision':
      return {
        type: 'collision_start',
        subjectRef: trigger.subjectTag ? { mode: 'tag', tag: trigger.subjectTag } : undefined,
        objectRef: trigger.objectTag ? { mode: 'tag', tag: trigger.objectTag } : undefined,
      };
    case 'game_start':
      return { type: 'game_start' };
    case 'timer':
      return { type: 'every_interval', interval: trigger.value || 2 };
    case 'score_reached':
      return { type: 'variable_reached', variableName: 'score', comparator: '>=', compareValue: trigger.value || 0 };
    case 'input':
      return { type: 'key_pressed', key: trigger.key };
    case 'entity_destroyed':
      return { type: 'entity_destroyed' };
    case 'out_of_bounds':
      return { type: 'out_of_bounds' };
    default:
      return { type: 'game_start' };
  }
}

function migrateAction(action: RuleAction): LogicAction {
  switch (action.type) {
    case 'add_score':
      return { type: 'add_score', value: Number(action.value) || 10 };
    case 'remove_life':
      return { type: 'remove_life', value: Number(action.value) || 1 };
    case 'destroy_entity':
      return { type: 'destroy', entityRef: { mode: action.target === 'subject' ? 'self' : 'other' } };
    case 'apply_force':
      return { type: 'apply_force', entityRef: { mode: 'tag', tag: 'player' }, vy: Number(action.value) || -400 };
    case 'spawn_entity':
      return { type: 'spawn_particles' };
    case 'end_game':
      return { type: 'end_game' };
    case 'win_game':
      return { type: 'win_game' };
    case 'camera_shake':
      return { type: 'camera_shake', value: Number(action.value) || 10 };
    case 'set_variable':
      return { type: 'set_variable', variableName: String(action.property || 'score'), value: Number(action.value) || 0 };
    default:
      return { type: 'spawn_particles' };
  }
}

// ─── Schema Factories ───────────────────────────────────────────

/**
 * Create a blank game — empty canvas with just a Player entity.
 * Uses the v3 logic system with rule-driven movement and default game rules.
 */
export function createBlankGame(title = 'Untitled Game'): GameModelSchema {
  const id = crypto.randomUUID ? crypto.randomUUID() : `game_${Date.now().toString(36)}`;
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${id.slice(-8)}`;

  const player = createDefaultEntity('player', 100, 300);
  const ground = createDefaultEntity('platform', 0, 420);
  ground.name = 'Ground';
  ground.transform = { x: 0, y: 420, width: 800, height: 30, rotation: 0, scale: 1 };

  return {
    id,
    title,
    slug,
    description: '',
    version: 3,
    creationPath: 'manual',
    scene: { ...DEFAULT_SCENE, bounds: { ...DEFAULT_SCENE.bounds } },
    entities: [player, ground],
    physics: { ...DEFAULT_PHYSICS },
    theme: { ...DEFAULT_THEME },
    scoring: { ...DEFAULT_SCORING },
    controls: { ...DEFAULT_CONTROLS },
    assets: [],
    logic: createDefaultLogic(),
  };
}

/**
 * Create a platformer template game — pre-placed platforms, coins, goal.
 */
export function createPlatformerTemplate(): GameModelSchema {
  const game = createBlankGame('My Platformer');

  // Add several platforms
  const plats = [
    { x: 250, y: 360, w: 160 },
    { x: 460, y: 300, w: 140 },
    { x: 650, y: 240, w: 120 },
    { x: 350, y: 180, w: 160 },
    { x: 100, y: 140, w: 120 },
  ];
  for (const p of plats) {
    const plat = createDefaultEntity('platform', p.x, p.y);
    plat.transform.width = p.w;
    game.entities.push(plat);
  }

  // Add coins
  const coinPositions = [
    { x: 310, y: 330 }, { x: 510, y: 270 }, { x: 700, y: 210 },
    { x: 410, y: 150 }, { x: 140, y: 110 },
  ];
  for (const c of coinPositions) {
    game.entities.push(createDefaultEntity('coin', c.x, c.y));
  }

  // Add a goal
  const goal = createDefaultEntity('goal', 140, 76);
  game.entities.push(goal);

  // Add an enemy
  const enemy = createDefaultEntity('enemy', 480, 272);
  game.entities.push(enemy);

  game.scene.scrollType = 'none';
  if (!game.scoring) {
    game.scoring = { ...DEFAULT_SCORING };
  }
  game.scoring.winCondition = 'reach_goal';

  return game;
}

/**
 * Create a dodge/survival template — top-down, no gravity.
 */
export function createDodgeTemplate(): GameModelSchema {
  const game = createBlankGame('Dodge Arena');

  // Override physics for top-down (no gravity)
  game.physics.gravity = 0;

  // Player in center
  const player = game.entities.find(e => e.type === 'player')!;
  player.transform.x = 384;
  player.transform.y = 209;
  player.movement.speed = 300;

  // Remove ground (not needed for top-down)
  game.entities = game.entities.filter(e => e.name !== 'Ground');

  // Add boundary walls
  const walls = [
    { x: 0, y: 0, w: 800, h: 12 },    // top
    { x: 0, y: 438, w: 800, h: 12 },   // bottom
    { x: 0, y: 0, w: 12, h: 450 },     // left
    { x: 788, y: 0, w: 12, h: 450 },   // right
  ];
  for (const w of walls) {
    const wall = createDefaultEntity('wall', w.x, w.y);
    wall.transform.width = w.w;
    wall.transform.height = w.h;
    wall.appearance.color = '#1a0b2e';
    wall.appearance.strokeColor = '#ff2d7c';
    game.entities.push(wall);
  }

  // Add some enemies
  for (let i = 0; i < 4; i++) {
    const enemy = createDefaultEntity('enemy', 200 + i * 120, 100 + i * 80);
    enemy.movement.pattern = 'patrol';
    enemy.movement.patrolDistance = 150;
    enemy.movement.speed = 80 + i * 30;
    game.entities.push(enemy);
  }

  // Coins to collect
  const coinSpots = [
    { x: 150, y: 150 }, { x: 650, y: 100 }, { x: 400, y: 350 },
    { x: 100, y: 380 }, { x: 700, y: 300 },
  ];
  for (const c of coinSpots) {
    game.entities.push(createDefaultEntity('coin', c.x, c.y));
  }

  // Top-down 4-way movement rules
  game.logic.rules = [
    {
      id: generateLogicRuleId(), name: 'Move Left', enabled: true,
      event: { type: 'input_held', inputAction: 'Move Left' },
      conditions: [],
      actions: [{ type: 'move', entityRef: { mode: 'tag', tag: 'player' }, vx: -300, vy: 0 }],
    },
    {
      id: generateLogicRuleId(), name: 'Move Right', enabled: true,
      event: { type: 'input_held', inputAction: 'Move Right' },
      conditions: [],
      actions: [{ type: 'move', entityRef: { mode: 'tag', tag: 'player' }, vx: 300, vy: 0 }],
    },
    {
      id: generateLogicRuleId(), name: 'Move Up', enabled: true,
      event: { type: 'input_held', inputAction: 'Move Up' },
      conditions: [],
      actions: [{ type: 'move', entityRef: { mode: 'tag', tag: 'player' }, vx: 0, vy: -300 }],
    },
    {
      id: generateLogicRuleId(), name: 'Move Down', enabled: true,
      event: { type: 'input_held', inputAction: 'Move Down' },
      conditions: [],
      actions: [{ type: 'move', entityRef: { mode: 'tag', tag: 'player' }, vx: 0, vy: 300 }],
    },
    {
      id: generateLogicRuleId(), name: 'Hazard Damage', enabled: true,
      event: { type: 'collision_start', subjectRef: { mode: 'tag', tag: 'player' }, objectRef: { mode: 'tag', tag: 'hazard' } },
      conditions: [],
      actions: [{ type: 'remove_life', value: 1 }, { type: 'camera_shake', value: 10 }],
    },
    {
      id: generateLogicRuleId(), name: 'Collect Coin', enabled: true,
      event: { type: 'collision_start', subjectRef: { mode: 'tag', tag: 'player' }, objectRef: { mode: 'tag', tag: 'collectible' } },
      conditions: [],
      actions: [{ type: 'destroy', entityRef: { mode: 'other' } }, { type: 'add_score', value: 10 }],
    },
  ];

  return game;
}

/**
 * Create a runner template — auto-scrolling, jump over hazards.
 */
export function createRunnerTemplate(): GameModelSchema {
  const game = createBlankGame('Neon Runner');

  game.scene.scrollType = 'auto_scroll';
  game.scene.scrollSpeed = 200;
  game.scene.width = 4000;
  game.scene.bounds.right = 4000;

  // Player positioned left
  const player = game.entities.find(e => e.type === 'player')!;
  player.transform.x = 80;
  player.transform.y = 380;
  player.movement.speed = 0;

  // Extend ground
  const ground = game.entities.find(e => e.name === 'Ground')!;
  ground.transform.width = 4000;

  // Add spikes at intervals
  const spikePositions = [400, 700, 950, 1300, 1600, 2000, 2400, 2800, 3200, 3600];
  for (const sx of spikePositions) {
    const spike = createDefaultEntity('spike', sx, 404);
    game.entities.push(spike);
  }

  // Add coins above spikes
  const coinPositions = [550, 850, 1150, 1450, 1800, 2200, 2600, 3000, 3400];
  for (const cx of coinPositions) {
    const coin = createDefaultEntity('coin', cx, 360);
    game.entities.push(coin);
  }

  // Goal at the end
  const goal = createDefaultEntity('goal', 3900, 356);
  game.entities.push(goal);

  game.logic.rules = game.logic.rules.filter(r => !['Move Left', 'Move Right'].includes(r.name));
  game.logic.rules.unshift({ id: generateLogicRuleId(), name: 'Run forward', enabled: true,
    event: { type: 'every_frame' }, conditions: [],
    actions: [{ type: 'move', entityRef: { mode: 'tag', tag: 'player' }, vx: 200 }] });
  game.scene.scrollType = 'follow_player';
  game.logic.rules.push({ id: generateLogicRuleId(), name: 'Distance bonus', enabled: true,
    event: { type: 'every_interval', interval: 1 }, conditions: [], actions: [{ type: 'add_score', value: 5 }] });

  return game;
}

// ─── Detecting Legacy vs New Schema ─────────────────────────────

/**
 * Returns true if the schema uses the old flat template format
 * (has `player`, `hazards`, `collectibles` top-level keys rather than `entities`).
 */
export function isLegacySchema(schema: any): boolean {
  return schema && !Array.isArray(schema.entities) && (schema.player || schema.hazards || schema.template);
}

/**
 * Returns true if the schema is a v2 entity-based model.
 */
export function isEntitySchema(schema: any): schema is GameModelSchema {
  return schema && Array.isArray(schema.entities);
}
