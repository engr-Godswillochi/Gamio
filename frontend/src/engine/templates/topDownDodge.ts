import { GameSchema, ReplayPayload } from '../../types/gameSchema';
import { SeededRNG } from '../seededRNG';
import { InputRecorder, ReplayPlayer } from '../inputRecorder';

export interface GameCallbacks {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number, replay: ReplayPayload) => void;
}

interface Hazard {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  value: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

export class TopDownDodgeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private schema: GameSchema;
  private rng: SeededRNG;
  private recorder: InputRecorder;
  private replayPlayer: ReplayPlayer | null = null;
  private callbacks: GameCallbacks;

  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  public state: 'ready' | 'playing' | 'gameover' | 'replaying' = 'ready';
  private tickCount: number = 0;

  // Player state
  private playerX: number = 0;
  private playerY: number = 0;
  private score: number = 0;
  private surviveTimeSec: number = 0;
  private speedMultiplier: number = 1;

  // Entities
  private hazards: Hazard[] = [];
  private collectibles: Collectible[] = [];
  private particles: Particle[] = [];
  private spawnTimer: number = 0;
  private nextEntityId: number = 1;

  // Input listeners
  private pressedKeys: Set<string> = new Set();
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    schema: GameSchema,
    seed?: string,
    callbacks: GameCallbacks = {}
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.schema = schema;
    this.callbacks = callbacks;

    const rngSeed = seed || SeededRNG.generateRandomSeed();
    this.rng = new SeededRNG(rngSeed);
    this.recorder = new InputRecorder(schema.id || schema.slug, rngSeed);

    this.playerX = canvas.width / 2;
    this.playerY = canvas.height / 2;

    this.boundKeyDown = (e) => {
      this.pressedKeys.add(e.code);
      if (this.state === 'playing') {
        this.recorder.handleKeyDown(e.code);
      } else if (this.state === 'ready' && e.code === 'Space') {
        this.startPlay();
      } else if (this.state === 'gameover' && (e.code === 'Space' || e.code === 'Enter')) {
        this.resetGame();
        this.startPlay();
      }
    };

    this.boundKeyUp = (e) => {
      this.pressedKeys.delete(e.code);
      if (this.state === 'playing') {
        this.recorder.handleKeyUp(e.code);
      }
    };

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.drawInitialFrame();
  }

  public detachEvents(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public startPlay(): void {
    if (this.state === 'playing') return;
    this.state = 'playing';
    this.recorder.start();
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  public resetGame(newSeed?: string): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const seed = newSeed || SeededRNG.generateRandomSeed();
    this.rng = new SeededRNG(seed);
    this.recorder = new InputRecorder(this.schema.id || this.schema.slug, seed);

    this.playerX = this.canvas.width / 2;
    this.playerY = this.canvas.height / 2;
    this.score = 0;
    this.surviveTimeSec = 0;
    this.speedMultiplier = 1;
    this.tickCount = 0;
    this.hazards = [];
    this.collectibles = [];
    this.particles = [];
    this.state = 'ready';

    this.drawInitialFrame();
  }

  private loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = timestamp;

    if (this.state === 'playing' || this.state === 'replaying') {
      this.update(dt);
      this.render();
      this.tickCount++;
      this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }
  }

  private update(dt: number): void {
    const activeKeys = this.pressedKeys;
    this.recorder.recordTick(this.tickCount);

    this.speedMultiplier += this.schema.rules.speedMultiplierPerSecond * dt;
    this.surviveTimeSec += dt;
    this.score = Math.floor(this.surviveTimeSec * 10);
    if (this.callbacks.onScoreChange) {
      this.callbacks.onScoreChange(this.score);
    }

    // Move player in 360 space
    let moveX = 0;
    let moveY = 0;
    if (activeKeys.has('KeyA') || activeKeys.has('ArrowLeft')) moveX -= 1;
    if (activeKeys.has('KeyD') || activeKeys.has('ArrowRight')) moveX += 1;
    if (activeKeys.has('KeyW') || activeKeys.has('ArrowUp')) moveY -= 1;
    if (activeKeys.has('KeyS') || activeKeys.has('ArrowDown')) moveY += 1;

    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.7071;
      moveY *= 0.7071;
    }

    const currentSpeed = this.schema.player.speed * this.speedMultiplier;
    this.playerX += moveX * currentSpeed * dt;
    this.playerY += moveY * currentSpeed * dt;

    // Bounds clamp
    const pRadius = this.schema.player.size / 2;
    this.playerX = Math.max(pRadius, Math.min(this.canvas.width - pRadius, this.playerX));
    this.playerY = Math.max(pRadius, Math.min(this.canvas.height - pRadius, this.playerY));

    // Trail particles
    if (moveX !== 0 || moveY !== 0) {
      this.particles.push({
        x: this.playerX,
        y: this.playerY,
        vx: (this.rng.nextFloat() - 0.5) * 40,
        vy: (this.rng.nextFloat() - 0.5) * 40,
        color: this.schema.theme.accentColor,
        size: this.rng.nextFloat() * 3 + 2,
        alpha: 0.8,
        life: 0.3,
      });
    }

    // Spawn Hazards from borders
    this.spawnTimer -= dt * 1000;
    if (this.spawnTimer <= 0) {
      const side = this.rng.nextInt(0, 3); // 0=Top, 1=Right, 2=Bottom, 3=Left
      let hx = 0, hy = 0;
      const w = this.canvas.width;
      const h = this.canvas.height;

      if (side === 0) { hx = this.rng.nextFloat() * w; hy = -20; }
      else if (side === 1) { hx = w + 20; hy = this.rng.nextFloat() * h; }
      else if (side === 2) { hx = this.rng.nextFloat() * w; hy = h + 20; }
      else { hx = -20; hy = this.rng.nextFloat() * h; }

      const angle = Math.atan2(this.playerY - hy, this.playerX - hx) + (this.rng.nextFloat() - 0.5) * 0.4;
      const hSpeed = (this.schema.hazards.speed + this.rng.nextFloat() * 100) * this.speedMultiplier;

      this.hazards.push({
        id: this.nextEntityId++,
        x: hx,
        y: hy,
        vx: Math.cos(angle) * hSpeed,
        vy: Math.sin(angle) * hSpeed,
        radius: this.schema.hazards.width / 2,
        color: this.schema.hazards.color,
      });

      this.spawnTimer = Math.max(300, (this.schema.hazards.spawnRateMs / this.speedMultiplier));
    }

    // Update hazards & collision
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hz = this.hazards[i];
      hz.x += hz.vx * dt;
      hz.y += hz.vy * dt;

      // Circle collision check
      const dx = this.playerX - hz.x;
      const dy = this.playerY - hz.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pRadius + hz.radius) {
        this.gameOver();
        return;
      }

      // Remove out of bounds
      if (hz.x < -60 || hz.x > this.canvas.width + 60 || hz.y < -60 || hz.y > this.canvas.height + 60) {
        this.hazards.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 0.3);
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private gameOver(): void {
    this.state = 'gameover';
    const replayPayload = this.recorder.stop();
    this.render();
    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver(this.score, replayPayload);
    }
  }

  private drawInitialFrame(): void {
    this.render();
  }

  private render(): void {
    const { width, height } = this.canvas;
    const theme = this.schema.theme;

    this.ctx.fillStyle = theme.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    // Grid overlay
    this.ctx.strokeStyle = theme.surfaceColor;
    this.ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
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

    // Hazards
    for (const hz of this.hazards) {
      this.ctx.save();
      this.ctx.shadowColor = hz.color;
      this.ctx.shadowBlur = 12;
      this.ctx.fillStyle = hz.color;
      this.ctx.beginPath();
      this.ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Player
    if (this.state !== 'gameover') {
      this.ctx.save();
      this.ctx.shadowColor = theme.playerColor;
      this.ctx.shadowBlur = 16;
      this.ctx.fillStyle = theme.playerColor;
      this.ctx.beginPath();
      this.ctx.arc(this.playerX, this.playerY, this.schema.player.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // HUD
    this.ctx.save();
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillStyle = theme.accentColor;
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 36);
    this.ctx.restore();

    if (this.state === 'ready') {
      this.drawOverlayText('TOP-DOWN SURVIVAL', 'Press Space / Arrow Keys to Move & Dodge!');
    } else if (this.state === 'gameover') {
      this.drawOverlayText('CRASHED!', `SURVIVED: ${Math.floor(this.surviveTimeSec)}s — Press Space to Retry`);
    }
  }

  private drawOverlayText(title: string, subtitle: string): void {
    const { width, height } = this.canvas;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(10, 5, 20, 0.75)';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.shadowColor = this.schema.theme.accentColor;
    this.ctx.shadowBlur = 16;
    this.ctx.font = 'bold 30px monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, width / 2, height / 2 - 10);

    this.ctx.font = '15px monospace';
    this.ctx.fillStyle = this.schema.theme.accentColor;
    this.ctx.fillText(subtitle, width / 2, height / 2 + 30);
    this.ctx.restore();
  }
}
