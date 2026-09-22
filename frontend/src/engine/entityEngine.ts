/**
 * Generalized Entity Engine (v3)
 *
 * Renders and simulates games defined via the entity-based GameModelSchema.
 * Powered by LogicRuntime for EVENT -> CONDITION -> ACTION visual game logic execution.
 * Reuses SeededRNG and InputRecorder for deterministic replay support.
 */
import { GameModelSchema, Entity, migrateToV3 } from '../types/gameModel.js';
import { ReplayPayload } from '../types/gameSchema.js';
import { SeededRNG } from './seededRNG.js';
import { InputRecorder, ReplayPlayer } from './inputRecorder.js';
import { LogicRuntime, RuntimeEntity, LogicHostEngine } from './logicRuntime.js';

export interface EngineCallbacks {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number, replay: ReplayPayload) => void;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; alpha: number; life: number;
}

export class EntityEngine implements LogicHostEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public schema: GameModelSchema;
  private rng: SeededRNG;
  private recorder: InputRecorder;
  private replayPlayer: ReplayPlayer | null = null;
  private callbacks: EngineCallbacks;

  private animFrameId: number | null = null;
  private lastTs = 0;
  private accumulator = 0;
  private headless = false;
  private boundBlur = () => { this.pressedKeys.clear(); this.recorder.clearKeys(); };
  public state: 'ready' | 'playing' | 'gameover' | 'win' | 'replaying' = 'ready';
  private tickCount = 0;
  private spawnCount = 0;
  private contacts = new Set<string>();

  public runtimeEntities: RuntimeEntity[] = [];
  public particles: Particle[] = [];
  public elapsedMs = 0;
  public gameSpeed = 1.0;
  private cameraX = 0;
  private cameraY = 0;
  private scrollOffset = 0;
  private shakeTime = 0;
  private shakeMagnitude = 0;

  public logicRuntime: LogicRuntime;

  private pressedKeys = new Set<string>();
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, rawSchema: GameModelSchema, seed?: string, callbacks: EngineCallbacks = {}, headless = false) {
    this.headless = headless;
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    this.ctx = ctx;

    // Ensure schema is v3 with logic block
    this.schema = migrateToV3(rawSchema);
    this.callbacks = callbacks;

    const rngSeed = seed || SeededRNG.generateRandomSeed();
    this.rng = new SeededRNG(rngSeed);
    this.recorder = new InputRecorder(this.schema.id || this.schema.slug, rngSeed);

    this.logicRuntime = new LogicRuntime(this.schema.logic);
    this.gameSpeed = this.schema.physics.gameSpeed || 1;

    this.boundKeyDown = (e) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea, select, button, [contenteditable]')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.pressedKeys.add(e.code);
      if (this.state === 'playing') this.recorder.handleKeyDown(e.code);
    };
    this.boundKeyUp = (e) => {
      this.pressedKeys.delete(e.code);
      if (this.state === 'playing') this.recorder.handleKeyUp(e.code);
    };

    if (!headless) {
      window.addEventListener('keydown', this.boundKeyDown);
      window.addEventListener('keyup', this.boundKeyUp);
      window.addEventListener('blur', this.boundBlur);
    }

    this.buildRuntime();
    this.render();
  }

  public detachEvents(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private buildRuntime(): void {
    this.runtimeEntities = this.schema.entities
      .filter(e => e.isVisible)
      .map(e => ({
        ...JSON.parse(JSON.stringify(e)),
        vx: 0, vy: 0, alive: true,
        patrolOriginX: e.transform.x,
        patrolOriginY: e.transform.y,
        patrolDir: 1,
      }));
  }

  public startPlay(): void {
    if (this.state === 'playing') return;
    this.state = 'playing';
    this.recorder.start();
    this.pressedKeys.clear();
    this.accumulator = 0;
    this.lastTs = performance.now();
    this.logicRuntime.triggerGameStart(this);
    this.loop(this.lastTs);
  }

  public startReplay(payload: ReplayPayload): void {
    this.resetGame(payload.rngSeed);
    this.state = 'replaying';
    this.replayPlayer = new ReplayPlayer(payload.inputLog);
    this.lastTs = performance.now();
    this.logicRuntime.triggerGameStart(this);
    this.loop(this.lastTs);
  }

  public resetGame(newSeed?: string): void {
    if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }
    const seed = newSeed || SeededRNG.generateRandomSeed();
    this.rng = new SeededRNG(seed);
    this.recorder = new InputRecorder(this.schema.id || this.schema.slug, seed);
    this.replayPlayer = null;
    this.elapsedMs = 0;
    this.tickCount = 0;
    this.accumulator = 0;
    this.pressedKeys.clear();
    this.shakeTime = 0;
    this.spawnCount = 0;
    this.contacts.clear();
    this.cameraX = 0;
    this.cameraY = 0;
    this.scrollOffset = 0;
    this.particles = [];
    this.gameSpeed = this.schema.physics.gameSpeed || 1.0;
    this.state = 'ready';

    this.logicRuntime.reset();
    this.buildRuntime();
    this.render();
  }

  private loop(ts: number): void {
    // Fixed simulation ticks make replay independent of refresh rate or dropped frames.
    this.accumulator += Math.min((ts - this.lastTs) / 1000, 0.1);
    this.lastTs = ts;
    if (this.state === 'playing' || this.state === 'replaying') {
      while (this.accumulator >= 1 / 60 && (this.state === 'playing' || this.state === 'replaying')) {
        this.step();
        this.accumulator -= 1 / 60;
      }
      this.render();
      this.animFrameId = requestAnimationFrame(t => this.loop(t));
    }
  }

  public setKey(key: string, down: boolean): void {
    if (down) { this.pressedKeys.add(key); this.recorder.handleKeyDown(key); }
    else { this.pressedKeys.delete(key); this.recorder.handleKeyUp(key); }
  }

  private step(): void {
    this.update((1 / 60) * Math.max(0.25, Math.min(3, this.gameSpeed)));
    this.tickCount++;
    if (this.tickCount >= 7200 && (this.state === 'playing' || this.state === 'replaying')) this.endGame(true);
  }

  public simulate(payload: ReplayPayload): { score: number; ticks: number; terminal: boolean } {
    this.resetGame(payload.rngSeed);
    this.state = 'replaying';
    this.replayPlayer = new ReplayPlayer(payload.inputLog);
    this.logicRuntime.triggerGameStart(this);
    const limit = payload.ticks || 0;
    for (let i = 0; i < limit && this.state === 'replaying'; i++) this.step();
    return { score: this.logicRuntime.variables.getNumber('score'), ticks: this.tickCount, terminal: this.state !== 'replaying' };
  }

  private getActiveKeys(): Set<string> {
    if (this.state === 'replaying' && this.replayPlayer) {
      return this.replayPlayer.getKeysForTick(this.tickCount);
    }
    this.recorder.recordTick(this.tickCount);
    return this.pressedKeys;
  }

  public spawnFromTemplate(
    template: Partial<Entity>,
    x: number,
    y: number,
    vx = 0,
    vy = 0,
    spawnerId?: string
  ): RuntimeEntity {
    const newEnt: RuntimeEntity = {
      // Entity IDs participate in rule targeting, so they must be stable when
      // the same replay seed and input log are rendered again.
      id: `spawn_${this.tickCount}_${this.spawnCount++}`,
      name: template.name || `Spawned ${template.type || 'Object'}`,
      type: template.type || 'platform',
      isVisible: true,
      isLocked: false,
      tags: template.tags || [],
      transform: {
        x,
        y,
        width: template.transform?.width || 32,
        height: template.transform?.height || 32,
        rotation: 0,
        scale: 1,
      },
      physics: {
        enabled: true,
        isStatic: false,
        gravity: 1,
        ...template.physics,
      },
      movement: { ...template.movement },
      appearance: {
        shape: 'rect',
        color: '#ff0055',
        opacity: 1,
        ...template.appearance,
      },
      vx,
      vy,
      alive: true,
      patrolOriginX: x,
      patrolOriginY: y,
      patrolDir: 1,
      isSpawned: true,
      spawnerId,
    };

    if (this.runtimeEntities.length < 160) this.runtimeEntities.push(newEnt);
    return newEnt;
  }

  /**
   * The logic runtime receives randomness through its host so every gameplay
   * decision shares this engine's seeded RNG (PRD Section 7 replay contract).
   */
  public nextRandom(): number {
    return this.rng.nextFloat();
  }

  private update(dt: number): void {
    this.runtimeEntities = this.runtimeEntities.filter(e => e.alive);
    const keys = this.getActiveKeys();
    const { physics, scoring } = this.schema;
    this.elapsedMs += dt * 1000;
    for (const ent of this.runtimeEntities) if (ent.type === 'player') {
      ent.vx = 0;
      if (physics.gravity === 0) ent.vy = 0;
    }

    // 1. Evaluate logic engine (Rules, Inputs, Spawners, Timers)
    this.logicRuntime.update(dt, keys, this);
    if (this.isTerminal()) return;

    // 2. Auto-scroll
    if (this.schema.scene.scrollType === 'auto_scroll' && this.schema.scene.scrollSpeed) {
      this.scrollOffset += this.schema.scene.scrollSpeed * dt;
    }

    // 3. Difficulty ramp / enemy patrol updates
    const ramp = 1 + (scoring?.difficultyRamp || 0) * (this.elapsedMs / 1000);

    for (const ent of this.runtimeEntities) {
      if (!ent.alive) continue;

      // Enemy patrol movement
      if (ent.type === 'enemy' && ent.movement.pattern && ent.movement.pattern !== 'none') {
        const pSpd = (ent.movement.patrolSpeed || ent.movement.speed || 100) * ramp;
        const pDist = ent.movement.patrolDistance || 150;
        if (ent.movement.pattern === 'horizontal' || ent.movement.pattern === 'patrol') {
          ent.vx = pSpd * ent.patrolDir;
          if (Math.abs(ent.transform.x - ent.patrolOriginX) > pDist) ent.patrolDir *= -1;
        } else if (ent.movement.pattern === 'vertical') {
          ent.vy = pSpd * ent.patrolDir;
          if (Math.abs(ent.transform.y - ent.patrolOriginY) > pDist) ent.patrolDir *= -1;
        }
      }

      // Physics: gravity
      if (ent.physics.enabled && !ent.physics.isStatic && physics.gravity !== 0) {
        const entGrav = ent.physics.gravity !== undefined ? ent.physics.gravity : 1;
        ent.vy += physics.gravity * entGrav * dt;
      }

      // Apply velocity
      if (!ent.physics.isStatic) {
        ent.transform.x += ent.vx * dt;
        ent.transform.y += ent.vy * dt;
      }

      // Drag
      if (ent.physics.drag) {
        ent.vx *= (1 - ent.physics.drag);
      }
    }

    // 4. Collision detection + resolution + logic collision events
    const alive = this.runtimeEntities.filter(e => e.alive);
    const contacts = new Set<string>();
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], b = alive[j];
        if (!a.alive || !b.alive) continue;
        if (a.physics.isStatic && b.physics.isStatic) continue;
        if (!this.aabb(a, b)) continue;

        // Solid collision resolution
        this.resolveSolidCollision(a, b);

        // Logic engine collision trigger
        const pair = [a.id, b.id].sort().join(':');
        contacts.add(pair);
        if (!this.contacts.has(pair)) this.logicRuntime.handleCollision(a, b, this);
        if (this.isTerminal()) return;
      }
    }

    this.contacts = contacts;

    // 5. Out of bounds check
    for (const ent of this.runtimeEntities) {
      if (!ent.alive || ent.physics.isStatic) continue;
      const s = this.schema.scene;
      if (ent.transform.y > s.bounds.bottom + 200 || ent.transform.y < s.bounds.top - 500 ||
          ent.transform.x < s.bounds.left - 500 || ent.transform.x > s.bounds.right + 500) {
        this.logicRuntime.handleOutOfBounds(ent, this);
        if (ent.type === 'player' && ent.alive) {
          this.endGame(false);
          return;
        }
        if (ent.isSpawned) ent.alive = false;
      }
    }

    // 6. Update camera
    this.updateCamera();

    // 7. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt; p.alpha = Math.max(0, p.life / 0.4);
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 8. Update Score Callback
    const scoreVal = this.logicRuntime.variables.getNumber('score');
    this.callbacks.onScoreChange?.(scoreVal);

    // 9. Legacy Win Condition Checks (if set on scoring config)
    if (scoring) {
      if (scoring.winCondition === 'reach_score' && scoring.targetValue && scoreVal >= scoring.targetValue) {
        this.endGame(true);
      } else if (scoring.winCondition === 'survive_time' && scoring.targetValue && this.elapsedMs >= scoring.targetValue) {
        this.endGame(true);
      } else if (scoring.winCondition === 'collect_all') {
        const remaining = this.runtimeEntities.filter(e => e.alive && e.tags.includes('collectible'));
        if (remaining.length === 0) this.endGame(true);
      }
    }
  }

  private isTerminal(): boolean { return this.state === 'gameover' || this.state === 'win'; }

  private aabb(a: RuntimeEntity, b: RuntimeEntity): boolean {
    const at = a.transform, bt = b.transform;
    return at.x < bt.x + bt.width && at.x + at.width > bt.x &&
           at.y < bt.y + bt.height && at.y + at.height > bt.y;
  }

  private resolveSolidCollision(a: RuntimeEntity, b: RuntimeEntity): void {
    let mover: RuntimeEntity | null = null;
    let solid: RuntimeEntity | null = null;

    if (!a.physics.isStatic && b.tags.includes('solid')) { mover = a; solid = b; }
    else if (!b.physics.isStatic && a.tags.includes('solid')) { mover = b; solid = a; }
    if (!mover || !solid) return;

    const mt = mover.transform, st = solid.transform;
    const incomingVy = mover.vy;
    const overlapX = Math.min(mt.x + mt.width - st.x, st.x + st.width - mt.x);
    const overlapY = Math.min(mt.y + mt.height - st.y, st.y + st.height - mt.y);

    if (overlapX < overlapY) {
      if (mt.x + mt.width / 2 < st.x + st.width / 2) mt.x -= overlapX;
      else mt.x += overlapX;
      mover.vx = 0;
    } else {
      if (mt.y + mt.height / 2 < st.y + st.height / 2) {
        mt.y = st.y - mt.height;
        mover.vy = 0;
      } else {
        mt.y = st.y + st.height;
        mover.vy = 0;
      }
    }

    const bounce = mover.physics.bounciness || 0;
    if (bounce > 0 && overlapY <= overlapX) {
      mover.vy = -incomingVy * bounce;
    }
  }

  public isOnGround(ent: RuntimeEntity): boolean {
    const t = ent.transform;
    const testY = t.y + t.height + 2;
    for (const other of this.runtimeEntities) {
      if (other === ent || !other.alive || !other.tags.includes('solid')) continue;
      const ot = other.transform;
      if (t.x + t.width > ot.x && t.x < ot.x + ot.width &&
          testY >= ot.y && testY <= ot.y + 10) return true;
    }
    return false;
  }

  public triggerCameraShake(durationSec = 0.3, magnitude = 8): void {
    this.shakeTime = durationSec;
    this.shakeMagnitude = magnitude;
  }

  public endGame(isWin: boolean): void {
    if (this.state !== 'playing' && this.state !== 'replaying') return;
    const wasLivePlay = this.state === 'playing';
    this.state = isWin ? 'win' : 'gameover';
    const replay = this.recorder.stop();
    replay.ticks = Math.min(7200, this.tickCount + 1);
    replay.durationMs = Math.round(replay.ticks * 1000 / 60);
    const finalScore = this.logicRuntime.variables.getNumber('score');
    this.render();
    // Replaying a previous run must not submit another replay or score.
    if (wasLivePlay) this.callbacks.onGameOver?.(finalScore, replay);
  }

  private updateCamera(): void {
    const player = this.runtimeEntities.find(e => e.type === 'player' && e.alive);
    if (!player) return;
    const scene = this.schema.scene;

    if (scene.scrollType === 'follow_player') {
      this.cameraX = player.transform.x - this.canvas.width / 3;
      this.cameraY = Math.max(0, player.transform.y - this.canvas.height / 2);
      this.cameraX = Math.max(0, Math.min(scene.width - this.canvas.width, this.cameraX));
      this.cameraY = Math.max(0, Math.min(scene.height - this.canvas.height, this.cameraY));
    } else if (scene.scrollType === 'auto_scroll') {
      this.cameraX = this.scrollOffset;
    }
  }

  public spawnBurst(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = this.rng.nextFloat() * Math.PI * 2;
      const speed = this.rng.nextFloat() * 150 + 50;
      this.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color, size: this.rng.nextFloat() * 4 + 2, alpha: 1, life: 0.4,
      });
    }
  }

  // ─── Rendering ──────────────────────────────────────────────

  private render(): void {
    if (this.headless) return;
    const { width, height } = this.canvas;
    const scene = this.schema.scene;
    const theme = this.schema.theme;

    // Background
    this.ctx.fillStyle = scene.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    // Grid
    if (scene.gridVisible) {
      this.ctx.strokeStyle = scene.gridColor || 'rgba(0,240,255,0.04)';
      this.ctx.lineWidth = 1;
      const gs = scene.gridSize || 32;
      const ox = this.cameraX % gs;
      const oy = this.cameraY % gs;
      for (let x = -ox; x < width; x += gs) { this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, height); this.ctx.stroke(); }
      for (let y = -oy; y < height; y += gs) { this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(width, y); this.ctx.stroke(); }
    }

    this.ctx.save();

    // Camera shake
    let shakeX = 0, shakeY = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= 0.016;
      // Rendering must never consume the simulation's RNG.
      shakeX = Math.sin(this.tickCount * 2.3) * this.shakeMagnitude;
      shakeY = Math.cos(this.tickCount * 3.1) * this.shakeMagnitude;
    }

    this.ctx.translate(-this.cameraX + shakeX, -this.cameraY + shakeY);

    // Entities
    for (const ent of this.runtimeEntities) {
      if (!ent.alive) continue;
      this.renderEntity(ent);
    }

    // Particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.restore();

    // HUD
    const scoreVal = this.logicRuntime.variables.getNumber('score');
    const livesVal = this.logicRuntime.variables.getNumber('lives');

    this.ctx.save();
    this.ctx.font = `bold 18px ${theme.fontFamily || 'monospace'}`;
    this.ctx.fillStyle = theme.hudColor || theme.accentColor;
    this.ctx.fillText(`SCORE: ${scoreVal}`, 16, 30);
    if (livesVal !== undefined && livesVal > 0) {
      this.ctx.fillText(`LIVES: ${Math.max(0, livesVal)}`, 16, 54);
    }
    this.ctx.restore();

    // State overlays
    if (this.state === 'ready') this.drawOverlay('READY WHEN YOU ARE', `${this.schema.title}`);
    else if (this.state === 'gameover') this.drawOverlay('ONE MORE TRY?', `SCORE: ${scoreVal}`);
    else if (this.state === 'win') this.drawOverlay('YOU DID IT!', `SCORE: ${scoreVal}`);
    else if (this.state === 'replaying') {
      this.ctx.save();
      this.ctx.font = 'bold 13px monospace';
      this.ctx.fillStyle = '#ffaa00';
      this.ctx.fillText('🔴 REPLAY', width - 110, 28);
      this.ctx.restore();
    }
  }

  private renderEntity(ent: RuntimeEntity): void {
    const t = ent.transform;
    const a = ent.appearance;
    this.ctx.save();
    this.ctx.globalAlpha = a.opacity ?? 1;
    if (t.rotation) {
      this.ctx.translate(t.x + t.width / 2, t.y + t.height / 2);
      this.ctx.rotate(t.rotation * Math.PI / 180);
      this.ctx.translate(-t.x - t.width / 2, -t.y - t.height / 2);
    }

    if (a.glow && a.glowColor) {
      this.ctx.shadowColor = a.glowColor;
      this.ctx.shadowBlur = a.glowRadius || 10;
    }

    if (a.shape === 'circle') {
      const r = Math.min(t.width, t.height) / 2;
      this.ctx.beginPath();
      this.ctx.arc(t.x + t.width / 2, t.y + t.height / 2, r, 0, Math.PI * 2);
      if (a.color) { this.ctx.fillStyle = a.color; this.ctx.fill(); }
      if (a.strokeColor) { this.ctx.strokeStyle = a.strokeColor; this.ctx.lineWidth = a.strokeWidth || 1; this.ctx.stroke(); }
    } else if (a.shape === 'text') {
      this.ctx.font = `${a.fontSize || 16}px ${a.fontFamily || 'monospace'}`;
      this.ctx.fillStyle = a.color || '#fff';
      this.ctx.fillText(a.text || '', t.x, t.y + (a.fontSize || 16));
    } else {
      if (a.color) { this.ctx.fillStyle = a.color; this.ctx.fillRect(t.x, t.y, t.width, t.height); }
      if (a.strokeColor) {
        this.ctx.strokeStyle = a.strokeColor;
        this.ctx.lineWidth = a.strokeWidth || 1;
        this.ctx.strokeRect(t.x, t.y, t.width, t.height);
      }
      if (ent.type === 'player') {
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#10101b';
        this.ctx.fillRect(t.x + t.width * 0.58, t.y + t.height * 0.22, Math.max(2, t.width * 0.13), Math.max(2, t.height * 0.16));
      }
    }

    this.ctx.restore();
  }

  private drawOverlay(title: string, sub: string): void {
    const { width, height } = this.canvas;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(10, 5, 20, 0.78)';
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.shadowColor = this.schema.theme.accentColor;
    this.ctx.shadowBlur = 16;
    this.ctx.font = 'bold 30px monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, width / 2, height / 2 - 12);
    this.ctx.font = '14px monospace';
    this.ctx.fillStyle = this.schema.theme.accentColor;
    this.ctx.fillText(sub, width / 2, height / 2 + 24);
    this.ctx.restore();
  }
}
