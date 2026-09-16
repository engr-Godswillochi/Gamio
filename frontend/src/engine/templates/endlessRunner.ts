import { GameSchema, ReplayPayload } from '../../types/gameSchema';
import { SeededRNG } from '../seededRNG';
import { InputRecorder, ReplayPlayer } from '../inputRecorder';

export interface GameCallbacks {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number, replay: ReplayPayload) => void;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: 'ground' | 'flying';
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  value: number;
  collected: boolean;
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

export class EndlessRunnerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private schema: GameSchema;
  private rng: SeededRNG;
  private recorder: InputRecorder;
  private replayPlayer: ReplayPlayer | null = null;
  private callbacks: GameCallbacks;

  // Loop & state
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  public state: 'ready' | 'playing' | 'gameover' | 'replaying' = 'ready';
  private tickCount: number = 0;

  // Player physics state
  private playerX: number = 80;
  private playerY: number = 0;
  private playerVY: number = 0;
  private isGrounded: boolean = true;
  private lives: number = 1;
  private score: number = 0;
  private distance: number = 0;
  private speedMultiplier: number = 1;

  // World entities
  private groundY: number = 0;
  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];
  private particles: Particle[] = [];
  private nextObstacleTimer: number = 0;
  private nextEntityId: number = 1;

  // Input tracking
  private pressedKeys: Set<string> = new Set();
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    schema: GameSchema,
    seed?: string,
    callbacks: GameCallbacks = {}
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context from canvas');
    this.ctx = context;
    this.schema = schema;
    this.callbacks = callbacks;

    const rngSeed = seed || SeededRNG.generateRandomSeed();
    this.rng = new SeededRNG(rngSeed);
    this.recorder = new InputRecorder(schema.id || schema.slug, rngSeed);

    this.groundY = canvas.height - 60;
    this.playerY = this.groundY - this.schema.player.size;

    // Event listeners
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);

    this.attachEvents();
    this.drawInitialFrame();
  }

  private attachEvents(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: true });
    this.canvas.addEventListener('touchend', this.boundTouchEnd);
  }

  public detachEvents(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    this.canvas.removeEventListener('touchend', this.boundTouchEnd);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
    }
    this.pressedKeys.add(e.code);
    if (this.state === 'playing') {
      this.recorder.handleKeyDown(e.code);
    } else if (this.state === 'ready') {
      if (this.schema.controls.jumpKeys.includes(e.code) || e.code === 'Space') {
        this.startPlay();
      }
    } else if (this.state === 'gameover') {
      if (e.code === 'Space' || e.code === 'Enter') {
        this.resetGame();
        this.startPlay();
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.pressedKeys.delete(e.code);
    if (this.state === 'playing') {
      this.recorder.handleKeyUp(e.code);
    }
  }

  private handleTouchStart(): void {
    const tapKey = 'Space';
    this.pressedKeys.add(tapKey);
    if (this.state === 'playing') {
      this.recorder.handleKeyDown(tapKey);
    } else if (this.state === 'ready') {
      this.startPlay();
    } else if (this.state === 'gameover') {
      this.resetGame();
      this.startPlay();
    }
  }

  private handleTouchEnd(): void {
    const tapKey = 'Space';
    this.pressedKeys.delete(tapKey);
    if (this.state === 'playing') {
      this.recorder.handleKeyUp(tapKey);
    }
  }

  public startPlay(): void {
    if (this.state === 'playing') return;
    this.state = 'playing';
    this.recorder.start();
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  public startReplay(replayPayload: ReplayPayload): void {
    this.resetGame(replayPayload.rngSeed);
    this.state = 'replaying';
    this.replayPlayer = new ReplayPlayer(replayPayload.inputLog);
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
    this.replayPlayer = null;

    this.groundY = this.canvas.height - 60;
    this.playerX = 80;
    this.playerY = this.groundY - this.schema.player.size;
    this.playerVY = 0;
    this.isGrounded = true;
    this.lives = this.schema.rules.lives;
    this.score = 0;
    this.distance = 0;
    this.speedMultiplier = 1;
    this.tickCount = 0;

    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.nextObstacleTimer = 0;
    this.state = 'ready';

    this.drawInitialFrame();
  }

  private loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05); // cap delta time
    this.lastTimestamp = timestamp;

    if (this.state === 'playing' || this.state === 'replaying') {
      this.update(dt);
      this.render();
      this.tickCount++;
      this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }
  }

  private update(dt: number): void {
    // 1. Get active inputs
    let activeKeys: Set<string>;
    if (this.state === 'replaying' && this.replayPlayer) {
      activeKeys = this.replayPlayer.getKeysForTick(this.tickCount);
    } else {
      activeKeys = this.pressedKeys;
      this.recorder.recordTick(this.tickCount);
    }

    // 2. Speed progression
    this.speedMultiplier += this.schema.rules.speedMultiplierPerSecond * dt;
    const currentSpeed = this.schema.player.speed * this.speedMultiplier;
    this.distance += (currentSpeed * dt) / 10;
    this.score = Math.floor(this.distance);
    if (this.callbacks.onScoreChange) {
      this.callbacks.onScoreChange(this.score);
    }

    // 3. Player physics & jump
    const isJumpPressed = this.schema.controls.jumpKeys.some((k) => activeKeys.has(k)) || activeKeys.has('Space');
    if (isJumpPressed && this.isGrounded) {
      this.playerVY = -this.schema.player.jumpForce;
      this.isGrounded = false;
      this.spawnParticles(this.playerX + 16, this.groundY, 8, this.schema.theme.particleColor);
    }

    // Apply gravity
    this.playerVY += this.schema.player.gravity * dt;
    this.playerY += this.playerVY * dt;

    // Ground collision
    if (this.playerY >= this.groundY - this.schema.player.size) {
      this.playerY = this.groundY - this.schema.player.size;
      this.playerVY = 0;
      this.isGrounded = true;
    }

    // Spawn player speed particles
    if (this.tickCount % 4 === 0) {
      this.particles.push({
        x: this.playerX,
        y: this.playerY + this.schema.player.size - 4,
        vx: -this.rng.nextFloat() * 60 - 20,
        vy: (this.rng.nextFloat() - 0.5) * 20,
        color: this.schema.theme.accentColor,
        size: this.rng.nextFloat() * 3 + 2,
        alpha: 0.8,
        life: 0.3
      });
    }

    // 4. Spawn Hazards
    this.nextObstacleTimer -= dt * 1000;
    if (this.nextObstacleTimer <= 0) {
      const obstacleSpeed = this.schema.hazards.speed * this.speedMultiplier;
      const type = this.schema.hazards.types.length > 0
        ? this.rng.choice(this.schema.hazards.types)
        : 'ground';
      const isFlying = type === 'flying';
      const yPos = isFlying
        ? this.groundY - this.schema.player.size - 60 - this.rng.nextFloat() * 40
        : this.groundY - this.schema.hazards.height;

      this.obstacles.push({
        id: this.nextEntityId++,
        x: this.canvas.width + 50,
        y: yPos,
        width: this.schema.hazards.width,
        height: this.schema.hazards.height,
        color: this.schema.hazards.color,
        type
      });

      // Spawn collectible above or after obstacle
      if (this.rng.chance(this.schema.collectibles.spawnChance)) {
        this.collectibles.push({
          id: this.nextEntityId++,
          x: this.canvas.width + 120,
          y: yPos - 50 - this.rng.nextFloat() * 30,
          size: this.schema.collectibles.size,
          color: this.schema.collectibles.color,
          value: this.schema.collectibles.scoreValue,
          collected: false
        });
      }

      const spawnVariation = (this.rng.nextFloat() - 0.5) * 400;
      this.nextObstacleTimer = Math.max(
        600,
        (this.schema.hazards.spawnRateMs / this.speedMultiplier) + spawnVariation
      );
    }

    // 5. Update & move obstacles
    const moveDist = currentSpeed * dt;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= moveDist;

      // AABB Collision check
      if (
        this.playerX < obs.x + obs.width &&
        this.playerX + this.schema.player.size > obs.x &&
        this.playerY < obs.y + obs.height &&
        this.playerY + this.schema.player.size > obs.y
      ) {
        this.lives--;
        this.spawnParticles(this.playerX + 16, this.playerY + 16, 20, this.schema.hazards.color);
        if (this.lives <= 0) {
          this.gameOver();
          return;
        }
      }

      if (obs.x + obs.width < -100) {
        this.obstacles.splice(i, 1);
      }
    }

    // 6. Update collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.x -= moveDist;

      if (!col.collected) {
        const dx = (this.playerX + 16) - (col.x + col.size / 2);
        const dy = (this.playerY + 16) - (col.y + col.size / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 16 + col.size / 2) {
          col.collected = true;
          this.score += col.value;
          this.distance += col.value; // boost score
          this.spawnParticles(col.x, col.y, 10, col.color);
          this.collectibles.splice(i, 1);
          continue;
        }
      }

      if (col.x < -50) {
        this.collectibles.splice(i, 1);
      }
    }

    // 7. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 0.3);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private gameOver(): void {
    this.state = 'gameover';
    const replayPayload = this.recorder.stop();
    this.render(); // draw game over screen
    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver(this.score, replayPayload);
    }
  }

  private spawnParticles(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = this.rng.nextFloat() * Math.PI * 2;
      const speed = this.rng.nextFloat() * 140 + 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: this.rng.nextFloat() * 4 + 2,
        alpha: 1,
        life: 0.35
      });
    }
  }

  private drawInitialFrame(): void {
    this.render();
  }

  private render(): void {
    const { width, height } = this.canvas;
    const theme = this.schema.theme;

    // Background
    this.ctx.fillStyle = theme.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    // Draw background grid lines (arcade synthwave effect)
    this.ctx.strokeStyle = theme.surfaceColor;
    this.ctx.lineWidth = 1;
    const gridSpacing = 40;
    const offset = (this.distance * 2) % gridSpacing;
    for (let x = -offset; x < width; x += gridSpacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.groundY);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = this.groundY; y < height; y += 15) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    // Ground surface line
    this.ctx.strokeStyle = theme.accentColor;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(width, this.groundY);
    this.ctx.stroke();

    // Draw Particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Draw Collectibles
    for (const col of this.collectibles) {
      if (col.collected) continue;
      this.ctx.save();
      this.ctx.shadowColor = col.color;
      this.ctx.shadowBlur = 12;
      this.ctx.fillStyle = col.color;
      this.ctx.beginPath();
      this.ctx.arc(col.x + col.size / 2, col.y + col.size / 2, col.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Draw Obstacles
    for (const obs of this.obstacles) {
      this.ctx.save();
      this.ctx.shadowColor = obs.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = obs.color;
      this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      // Inner border stroke
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4);
      this.ctx.restore();
    }

    // Draw Player
    if (this.state !== 'gameover' || this.lives > 0) {
      this.ctx.save();
      const pSize = this.schema.player.size;
      this.ctx.shadowColor = theme.playerColor;
      this.ctx.shadowBlur = 14;
      this.ctx.fillStyle = theme.playerColor;

      if (this.schema.player.spriteShape === 'hero') {
        // Futuristic runner avatar
        this.ctx.fillRect(this.playerX, this.playerY, pSize, pSize);
        // Visor
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(this.playerX + pSize - 12, this.playerY + 6, 8, 8);
      } else {
        this.ctx.fillRect(this.playerX, this.playerY, pSize, pSize);
      }
      this.ctx.restore();
    }

    // HUD: Score & Speed
    this.ctx.save();
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillStyle = theme.accentColor;
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 36);

    this.ctx.font = '12px monospace';
    this.ctx.fillStyle = '#8888aa';
    this.ctx.fillText(`SPEED: ${this.speedMultiplier.toFixed(2)}x`, 20, 56);
    this.ctx.restore();

    // State Overlay Messages
    if (this.state === 'ready') {
      this.drawOverlayText('PRESS SPACE / TAP TO START', 'Get ready to jump!');
    } else if (this.state === 'gameover') {
      this.drawOverlayText('GAME OVER', `FINAL SCORE: ${this.score} — Press Space to Restart`);
    } else if (this.state === 'replaying') {
      this.ctx.save();
      this.ctx.font = 'bold 14px monospace';
      this.ctx.fillStyle = '#ffaa00';
      this.ctx.fillText('🔴 REPLAY MODE', width - 150, 36);
      this.ctx.restore();
    }
  }

  private drawOverlayText(title: string, subtitle: string): void {
    const { width, height } = this.canvas;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(10, 5, 20, 0.75)';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.shadowColor = this.schema.theme.accentColor;
    this.ctx.shadowBlur = 16;
    this.ctx.font = 'bold 32px monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, width / 2, height / 2 - 10);

    this.ctx.font = '16px monospace';
    this.ctx.fillStyle = this.schema.theme.accentColor;
    this.ctx.fillText(subtitle, width / 2, height / 2 + 30);
    this.ctx.restore();
  }
}
