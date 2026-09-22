/**
 * Logic Engine Runtime Module (v3)
 *
 * Implements:
 * - VariableStore: Manages built-in and user-defined game variables.
 * - InputManager: Maps input bindings to active key state and detects press/release transitions.
 * - SpawnerManager: Manages interval timers and entity instantiation from SpawnerConfigs.
 * - LogicRuntime: Evaluates rules (EVENT -> CONDITION -> ACTION) deterministically.
 */

import {
  GameModelSchema,
  Entity,
  LogicConfig,
  LogicRule,
  LogicEvent,
  LogicCondition,
  LogicAction,
  EntityRef,
  InputBinding,
  GameVariable,
  SpawnerConfig,
  Comparator,
  GameState,
} from '../types/gameModel.js';

export interface RuntimeEntity extends Entity {
  vx: number;
  vy: number;
  alive: boolean;
  patrolOriginX: number;
  patrolOriginY: number;
  patrolDir: number;
  isSpawned?: boolean;
  spawnerId?: string;
}

export interface LogicHostEngine {
  schema: GameModelSchema;
  state: GameState;
  runtimeEntities: RuntimeEntity[];
  elapsedMs: number;
  gameSpeed: number;
  spawnBurst(x: number, y: number, count: number, color: string): void;
  triggerCameraShake(durationSec?: number, magnitude?: number): void;
  endGame(isWin: boolean): void;
  isOnGround(ent: RuntimeEntity): boolean;
  nextRandom(): number;
  spawnFromTemplate(template: Partial<Entity>, x: number, y: number, vx?: number, vy?: number, spawnerId?: string): RuntimeEntity;
}

// ─── VariableStore ─────────────────────────────────────────────

export class VariableStore {
  private variables: Map<string, number | boolean | string> = new Map();
  private defaults: Map<string, number | boolean | string> = new Map();

  constructor(configs: GameVariable[] = []) {
    // Built-in defaults
    this.defaults.set('score', 0);
    this.defaults.set('lives', 3);
    this.defaults.set('health', 100);
    this.defaults.set('gameSpeed', 1.0);

    for (const v of configs) {
      this.defaults.set(v.name, v.defaultValue);
    }
    this.reset();
  }

  public reset(): void {
    this.variables.clear();
    for (const [k, v] of this.defaults.entries()) {
      this.variables.set(k, v);
    }
  }

  public get(name: string): number | boolean | string {
    return this.variables.get(name) ?? 0;
  }

  public getNumber(name: string): number {
    const val = this.get(name);
    return typeof val === 'number' ? val : Number(val) || 0;
  }

  public set(name: string, value: number | boolean | string): { name: string; oldVal: any; newVal: any } | null {
    const oldVal = this.variables.get(name);
    this.variables.set(name, value);
    if (oldVal !== value) {
      return { name, oldVal, newVal: value };
    }
    return null;
  }

  public add(name: string, delta: number): { name: string; oldVal: any; newVal: any } {
    const current = this.getNumber(name);
    const newVal = current + delta;
    this.variables.set(name, newVal);
    return { name, oldVal: current, newVal };
  }

  public subtract(name: string, delta: number): { name: string; oldVal: any; newVal: any } {
    return this.add(name, -delta);
  }
}

// ─── InputManager ──────────────────────────────────────────────

export class InputManager {
  private bindings: Map<string, string[]> = new Map();
  private prevActiveInputs: Set<string> = new Set();
  private currentActiveInputs: Set<string> = new Set();
  private prevPressedKeys: Set<string> = new Set();

  constructor(bindings: InputBinding[] = []) {
    this.updateBindings(bindings);
  }

  public updateBindings(bindings: InputBinding[]): void {
    this.bindings.clear();
    for (const b of bindings) {
      this.bindings.set(b.name, b.keys || []);
    }
  }

  public update(pressedKeys: Set<string>): {
    pressedInputs: string[];
    releasedInputs: string[];
    heldInputs: string[];
    pressedKeysList: string[];
    releasedKeysList: string[];
  } {
    const pressedInputs: string[] = [];
    const releasedInputs: string[] = [];
    const heldInputs: string[] = [];

    const newActiveInputs = new Set<string>();

    for (const [name, keys] of this.bindings.entries()) {
      const isActive = keys.some(k => pressedKeys.has(k));
      if (isActive) {
        newActiveInputs.add(name);
        heldInputs.push(name);
        if (!this.prevActiveInputs.has(name)) {
          pressedInputs.push(name);
        }
      } else if (this.prevActiveInputs.has(name)) {
        releasedInputs.push(name);
      }
    }

    const pressedKeysList: string[] = [];
    const releasedKeysList: string[] = [];

    for (const k of pressedKeys) {
      if (!this.prevPressedKeys.has(k)) {
        pressedKeysList.push(k);
      }
    }
    for (const k of this.prevPressedKeys) {
      if (!pressedKeys.has(k)) {
        releasedKeysList.push(k);
      }
    }

    this.prevActiveInputs = newActiveInputs;
    this.currentActiveInputs = newActiveInputs;
    this.prevPressedKeys = new Set(pressedKeys);

    return {
      pressedInputs,
      releasedInputs,
      heldInputs,
      pressedKeysList,
      releasedKeysList,
    };
  }

  public isInputActive(name: string): boolean {
    return this.currentActiveInputs.has(name);
  }

  public isKeyHeld(key: string): boolean { return this.prevPressedKeys.has(key); }

  public reset(): void {
    this.prevActiveInputs.clear();
    this.currentActiveInputs.clear();
    this.prevPressedKeys.clear();
  }
}

// ─── SpawnerManager ────────────────────────────────────────────

interface ActiveSpawnerState {
  config: SpawnerConfig;
  timer: number;
  enabled: boolean;
}

export class SpawnerManager {
  private spawners: Map<string, ActiveSpawnerState> = new Map();

  constructor(configs: SpawnerConfig[] = []) {
    this.init(configs);
  }

  public init(configs: SpawnerConfig[] = []): void {
    this.spawners.clear();
    for (const cfg of configs) {
      this.spawners.set(cfg.id, {
        config: cfg,
        timer: cfg.interval || 2,
        enabled: cfg.autoStart !== false,
      });
    }
  }

  public reset(): void {
    for (const [, state] of this.spawners) {
      state.timer = state.config.interval || 2;
      state.enabled = state.config.autoStart !== false;
    }
  }

  public setSpawnerEnabled(idOrName: string, enabled: boolean): void {
    for (const [id, state] of this.spawners) {
      if (id === idOrName || state.config.name === idOrName) {
        state.enabled = enabled;
      }
    }
  }

  public update(dt: number, engine: LogicHostEngine): void {
    for (const [id, state] of this.spawners) {
      if (!state.enabled) continue;

      state.timer -= dt;
      if (state.timer <= 0) {
        state.timer = state.config.interval || 2;

        // Check active count
        if (state.config.maxActive) {
          const currentCount = engine.runtimeEntities.filter(
            e => e.alive && e.spawnerId === id
          ).length;
          if (currentCount >= state.config.maxActive) continue;
        }

        // Calculate spawn position
        const pos = state.config.spawnPosition;
        let x = typeof pos.x === 'number' ? pos.x : 400;
        let y = typeof pos.y === 'number' ? pos.y : 200;

        if (pos.x === 'random' && pos.xMin !== undefined && pos.xMax !== undefined) {
          x = pos.xMin + engine.nextRandom() * (pos.xMax - pos.xMin);
        }
        if (pos.y === 'random' && pos.yMin !== undefined && pos.yMax !== undefined) {
          y = pos.yMin + engine.nextRandom() * (pos.yMax - pos.yMin);
        }

        const vx = state.config.initialVelocity?.vx || 0;
        const vy = state.config.initialVelocity?.vy || 0;

        const template: Partial<Entity> = {
          type: state.config.entityType,
          tags: state.config.entityTags,
          appearance: {
            shape: 'rect',
            color: '#ff0055',
            ...state.config.entityAppearance,
          },
          physics: { enabled: true, isStatic: false },
          movement: {},
        };

        engine.spawnFromTemplate(template, x, y, vx, vy, id);
      }
    }
  }

  public spawnOneShot(spawnerNameOrId: string, engine: LogicHostEngine): void {
    for (const [id, state] of this.spawners) {
      if (id === spawnerNameOrId || state.config.name === spawnerNameOrId) {
        const pos = state.config.spawnPosition;
        const x = typeof pos.x === 'number' ? pos.x : 400;
        const y = typeof pos.y === 'number' ? pos.y : 200;
        const vx = state.config.initialVelocity?.vx || 0;
        const vy = state.config.initialVelocity?.vy || 0;

        engine.spawnFromTemplate(
          {
            type: state.config.entityType,
            tags: state.config.entityTags,
            appearance: { shape: 'rect', color: '#ff0055', ...state.config.entityAppearance },
            physics: { enabled: true, isStatic: false },
            movement: {},
          },
          x, y, vx, vy, id
        );
      }
    }
  }
}

// ─── LogicRuntime Engine ───────────────────────────────────────

export class LogicRuntime {
  private config: LogicConfig;
  public variables: VariableStore;
  public input: InputManager;
  public spawners: SpawnerManager;

  private intervalTimers: Map<string, number> = new Map();
  private delayTimers: Map<string, number> = new Map();

  constructor(config: LogicConfig) {
    this.config = config;
    this.variables = new VariableStore(config.variables);
    this.input = new InputManager(config.inputBindings);
    this.spawners = new SpawnerManager(config.spawners);
  }

  public setConfig(config: LogicConfig): void {
    this.config = config;
    this.variables = new VariableStore(config.variables);
    this.input.updateBindings(config.inputBindings);
    this.spawners.init(config.spawners);
  }

  public reset(): void {
    this.variables.reset();
    this.input.reset();
    this.spawners.reset();
    this.intervalTimers.clear();
    this.delayTimers.clear();
  }

  public triggerGameStart(engine: LogicHostEngine): void {
    for (const rule of this.config.rules) {
      if (!rule.enabled || rule.event.type !== 'game_start') continue;
      if (this.evaluateConditions(rule.conditions, engine)) {
        this.executeActions(rule.actions, engine);
      }
    }
  }

  public update(dt: number, pressedKeys: Set<string>, engine: LogicHostEngine): void {
    // 1. Update Spawners
    this.spawners.update(dt, engine);

    // 2. Update Inputs
    const inputState = this.input.update(pressedKeys);

    // 3. Evaluate Per-Tick Rules
    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;
      const ev = rule.event;

      let shouldFire = false;

      switch (ev.type) {
        case 'every_frame':
          shouldFire = true;
          break;

        case 'input_pressed':
          shouldFire = Boolean(ev.inputAction && inputState.pressedInputs.includes(ev.inputAction));
          break;

        case 'input_held':
          shouldFire = Boolean(ev.inputAction && inputState.heldInputs.includes(ev.inputAction));
          break;

        case 'input_released':
          shouldFire = Boolean(ev.inputAction && inputState.releasedInputs.includes(ev.inputAction));
          break;

        case 'key_pressed':
          shouldFire = Boolean(ev.key && inputState.pressedKeysList.includes(ev.key));
          break;

        case 'key_held':
          shouldFire = Boolean(ev.key && pressedKeys.has(ev.key));
          break;

        case 'key_released':
          shouldFire = Boolean(ev.key && inputState.releasedKeysList.includes(ev.key));
          break;

        case 'every_interval': {
          const interval = ev.interval || 2;
          const current = (this.intervalTimers.get(rule.id) || 0) + dt;
          if (current >= interval) {
            this.intervalTimers.set(rule.id, 0);
            shouldFire = true;
          } else {
            this.intervalTimers.set(rule.id, current);
          }
          break;
        }

        case 'after_delay': {
          const delay = ev.delay || 1;
          const current = (this.delayTimers.get(rule.id) || 0) + dt;
          if (current >= delay) {
            shouldFire = true;
          } else {
            this.delayTimers.set(rule.id, current);
          }
          break;
        }

        case 'variable_reached': {
          if (ev.variableName) {
            const currentVal = this.variables.getNumber(ev.variableName);
            const targetVal = ev.compareValue ?? 0;
            shouldFire = compareValues(currentVal, ev.comparator || '>=', targetVal);
          }
          break;
        }
      }

      if (shouldFire && this.evaluateConditions(rule.conditions, engine)) {
        this.executeActions(rule.actions, engine);
        if (engine.state === 'gameover' || engine.state === 'win') return;
      }
    }
  }

  public handleCollision(subject: RuntimeEntity, object: RuntimeEntity, engine: LogicHostEngine): void {
    for (const rule of this.config.rules) {
      if (!rule.enabled || rule.event.type !== 'collision_start') continue;
      const ev = rule.event;

      let match = false;
      let matchedSubject = subject;
      let matchedObject = object;

      if (!ev.subjectRef && !ev.objectRef) {
        match = true;
      } else {
        const subMatch1 = ev.subjectRef ? matchEntityRef(ev.subjectRef, subject) : true;
        const objMatch1 = ev.objectRef ? matchEntityRef(ev.objectRef, object) : true;

        if (subMatch1 && objMatch1) {
          match = true;
        } else {
          // Check inverted pair
          const subMatch2 = ev.subjectRef ? matchEntityRef(ev.subjectRef, object) : true;
          const objMatch2 = ev.objectRef ? matchEntityRef(ev.objectRef, subject) : true;
          if (subMatch2 && objMatch2) {
            match = true;
            matchedSubject = object;
            matchedObject = subject;
          }
        }
      }

      if (match && this.evaluateConditions(rule.conditions, engine, matchedSubject, matchedObject)) {
        this.executeActions(rule.actions, engine, matchedSubject, matchedObject);
      }
    }
  }

  public handleOutOfBounds(entity: RuntimeEntity, engine: LogicHostEngine): void {
    for (const rule of this.config.rules) {
      if (!rule.enabled || rule.event.type !== 'out_of_bounds') continue;
      if (this.evaluateConditions(rule.conditions, engine, entity)) {
        this.executeActions(rule.actions, engine, entity);
      }
    }
  }

  // ── Condition Evaluation ──

  private evaluateConditions(
    conditions: LogicCondition[],
    engine: LogicHostEngine,
    subject?: RuntimeEntity,
    object?: RuntimeEntity
  ): boolean {
    for (const cond of conditions) {
      let result = this.evalSingleCondition(cond, engine, subject, object);
      if (cond.negate) result = !result;
      if (!result) return false;
    }
    return true;
  }

  private evalSingleCondition(
    cond: LogicCondition,
    engine: LogicHostEngine,
    subject?: RuntimeEntity,
    object?: RuntimeEntity
  ): boolean {
    switch (cond.type) {
      case 'is_grounded': {
        const target = this.resolveEntities(cond.entityRef, engine, subject, object)[0];
        return target ? engine.isOnGround(target) : false;
      }

      case 'is_alive': {
        const target = this.resolveEntities(cond.entityRef, engine, subject, object)[0];
        return target ? target.alive : false;
      }

      case 'entity_exists': {
        const targets = this.resolveEntities(cond.entityRef, engine, subject, object);
        return targets.some(e => e.alive);
      }

      case 'variable_compare': {
        const currentVal = this.variables.get(cond.variableName || 'score');
        return compareValues(currentVal, cond.comparator || '==', cond.compareValue ?? 0);
      }

      case 'game_state_is':
        return (engine.state === 'replaying' ? 'playing' : engine.state) === cond.gameState;

      case 'has_tag': {
        const target = this.resolveEntities(cond.entityRef, engine, subject, object)[0];
        return target && cond.tag ? target.tags.includes(cond.tag) : false;
      }

      case 'key_is_held':
        return cond.key ? this.input.isKeyHeld(cond.key) : false;

      default:
        return true;
    }
  }

  // ── Action Execution ──

  private executeActions(
    actions: LogicAction[],
    engine: LogicHostEngine,
    subject?: RuntimeEntity,
    object?: RuntimeEntity
  ): void {
    for (const act of actions) {
      this.executeSingleAction(act, engine, subject, object);
      if (engine.state === 'gameover' || engine.state === 'win') break;
    }
  }

  private executeSingleAction(
    act: LogicAction,
    engine: LogicHostEngine,
    subject?: RuntimeEntity,
    object?: RuntimeEntity
  ): void {
    const targets = this.resolveEntities(act.entityRef, engine, subject, object);

    switch (act.type) {
      case 'move':
        for (const t of targets) {
          if (act.vx !== undefined) t.vx = act.vx;
          if (act.vy !== undefined && !(act.vy === 0 && act.vx && engine.schema.physics.gravity !== 0)) t.vy = act.vy;
        }
        break;

      case 'jump':
        for (const t of targets) {
          t.vy = -(act.value || 600);
        }
        break;

      case 'destroy':
        for (const t of targets) {
          t.alive = false;
        }
        break;

      case 'teleport':
        for (const t of targets) {
          if (act.x !== undefined) t.transform.x = act.x;
          if (act.y !== undefined) t.transform.y = act.y;
        }
        break;

      case 'set_velocity':
        for (const t of targets) {
          if (act.vx !== undefined) t.vx = act.vx;
          if (act.vy !== undefined) t.vy = act.vy;
        }
        break;

      case 'apply_force':
        for (const t of targets) {
          if (act.vx !== undefined) t.vx += act.vx;
          if (act.vy !== undefined) t.vy += act.vy;
        }
        break;

      case 'add_variable':
        if (act.variableName) {
          this.variables.add(act.variableName, act.value || 1);
        }
        break;

      case 'subtract_variable':
        if (act.variableName) {
          this.variables.subtract(act.variableName, act.value || 1);
        }
        break;

      case 'set_variable':
        if (act.variableName) {
          this.variables.set(act.variableName, act.value ?? act.stringValue ?? 0);
        }
        break;

      case 'add_score': {
        const delta = act.value || 10;
        const res = this.variables.add('score', delta);
        if (object) {
          engine.spawnBurst(
            object.transform.x + object.transform.width / 2,
            object.transform.y,
            8,
            object.appearance.color || '#fff'
          );
        }
        break;
      }

      case 'remove_life': {
        const delta = act.value || 1;
        const res = this.variables.subtract('lives', delta);
        if (subject) {
          engine.spawnBurst(
            subject.transform.x + subject.transform.width / 2,
            subject.transform.y + subject.transform.height / 2,
            15,
            '#ff0055'
          );
        }
        engine.triggerCameraShake(0.3, 10);
        if (Number(res.newVal) <= 0) {
          engine.endGame(false);
        }
        break;
      }

      case 'start_spawner':
        if (act.spawnerName) {
          this.spawners.setSpawnerEnabled(act.spawnerName, true);
        }
        break;

      case 'stop_spawner':
        if (act.spawnerName) {
          this.spawners.setSpawnerEnabled(act.spawnerName, false);
        }
        break;

      case 'spawn_entity':
        if (act.spawnerName) {
          this.spawners.spawnOneShot(act.spawnerName, engine);
        } else if (subject) {
          engine.spawnBurst(subject.transform.x + subject.transform.width / 2, subject.transform.y, 12, '#00f0ff');
        }
        break;

      case 'camera_shake':
        engine.triggerCameraShake(0.4, act.value || 12);
        break;

      case 'spawn_particles':
        for (const t of targets) {
          engine.spawnBurst(t.transform.x + t.transform.width / 2, t.transform.y + t.transform.height / 2, 10, t.appearance.color || '#00f0ff');
        }
        break;

      case 'win_game':
        engine.endGame(true);
        break;

      case 'end_game':
        engine.endGame(false);
        break;

      case 'set_game_speed':
        if (act.value !== undefined) {
          engine.gameSpeed = act.value;
        }
        break;
    }
  }

  // ── Entity Reference Resolver ──

  private resolveEntities(
    ref: EntityRef | undefined,
    engine: LogicHostEngine,
    subject?: RuntimeEntity,
    object?: RuntimeEntity
  ): RuntimeEntity[] {
    if (!ref) {
      if (subject) return [subject];
      const player = engine.runtimeEntities.find(e => e.alive && e.type === 'player');
      return player ? [player] : [];
    }

    switch (ref.mode) {
      case 'self':
        return subject ? [subject] : [];
      case 'other':
        return object ? [object] : [];
      case 'id':
        return engine.runtimeEntities.filter(e => e.alive && e.id === ref.id);
      case 'type':
        return engine.runtimeEntities.filter(e => e.alive && e.type === ref.type);
      case 'tag':
        return engine.runtimeEntities.filter(e => e.alive && ref.tag && e.tags.includes(ref.tag));
      default:
        return [];
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function matchEntityRef(ref: EntityRef, entity: RuntimeEntity): boolean {
  if (ref.mode === 'id' && ref.id) return entity.id === ref.id;
  if (ref.mode === 'type' && ref.type) return entity.type === ref.type;
  if (ref.mode === 'tag' && ref.tag) return entity.tags.includes(ref.tag);
  return true;
}

function compareValues(a: any, comp: Comparator, b: any): boolean {
  const numA = Number(a);
  const numB = Number(b);
  const useNum = !isNaN(numA) && !isNaN(numB);

  switch (comp) {
    case '==':
      return useNum ? numA === numB : a == b;
    case '!=':
      return useNum ? numA !== numB : a != b;
    case '>':
      return useNum ? numA > numB : a > b;
    case '<':
      return useNum ? numA < numB : a < b;
    case '>=':
      return useNum ? numA >= numB : a >= b;
    case '<=':
      return useNum ? numA <= numB : a <= b;
    default:
      return false;
  }
}
