import { GameSchema, ReplayPayload } from '../../types/gameSchema';
import { SeededRNG } from '../seededRNG';
import { InputRecorder, ReplayPlayer } from '../inputRecorder';

export interface GameCallbacks {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number, replay: ReplayPayload) => void;
}

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export class PlatformerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private schema: GameSchema;
  private rng: SeededRNG;
  private recorder: InputRecorder;
  private callbacks: GameCallbacks;

  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  public state: 'ready' | 'playing' | 'gameover' | 'win' = 'ready';
  private tickCount: number = 0;

  // Physics state
  private px: number = 40;
  private py: number = 200;
  private vx: number = 0;
  private vy: number = 0;
  private isGrounded: boolean = false;
  private score: number = 0;
  private timeMs: number = 0;

  // World elements
  private platforms: Platform[] = [];
  private coins: Coin[] = [];
  private goalX: number = 1800;

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

    this.boundKeyDown = (e) => {
      this.pressedKeys.add(e.code);
      if (this.state === 'playing') {
        this.recorder.handleKeyDown(e.code);
      } else if (this.state === 'ready' && (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp')) {
        this.startPlay();
      } else if ((this.state === 'gameover' || this.state === 'win') && (e.code === 'Space' || e.code === 'Enter')) {
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

    this.generateLevel();
    this.drawInitialFrame();
  }

  private generateLevel(): void {
    this.platforms = [
      { x: 0, y: 300, w: 250, h: 60 },
      { x: 300, y: 250, w: 180, h: 20 },
      { x: 540, y: 200, w: 160, h: 20 },
      { x: 750, y: 270, w: 200, h: 20 },
      { x: 1000, y: 220, w: 180, h: 20 },
      { x: 1240, y: 170, w: 160, h: 20 },
      { x: 1450, y: 280, w: 400, h: 80 },
    ];

    this.coins = [
      { x: 360, y: 210, collected: false },
      { x: 600, y: 160, collected: false },
      { x: 820, y: 230, collected: false },
      { x: 1080, y: 180, collected: false },
      { x: 1300, y: 130, collected: false },
    ];
    this.goalX = 1750;
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

    this.px = 40;
    this.py = 200;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = false;
    this.score = 0;
    this.timeMs = 0;
    this.tickCount = 0;
    this.state = 'ready';
    this.generateLevel();
    this.drawInitialFrame();
  }

  private loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = timestamp;

    if (this.state === 'playing') {
      this.update(dt);
      this.render();
      this.tickCount++;
      this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }
  }

  private update(dt: number): void {
    this.recorder.recordTick(this.tickCount);
    this.timeMs += dt * 1000;

    // Left/Right Controls
    let moveDir = 0;
    if (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft')) moveDir -= 1;
    if (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) moveDir += 1;

    const moveSpeed = this.schema.player.speed;
    this.vx = moveDir * moveSpeed;

    // Jump
    const isJumpPressed = this.pressedKeys.has('Space') || this.pressedKeys.has('ArrowUp') || this.pressedKeys.has('KeyW');
    if (isJumpPressed && this.isGrounded) {
      this.vy = -this.schema.player.jumpForce;
      this.isGrounded = false;
    }

    // Apply Gravity
    this.vy += this.schema.player.gravity * dt;
    this.px += this.vx * dt;
    this.py += this.vy * dt;

    const pSize = this.schema.player.size;
    this.isGrounded = false;

    // Platform collisions
    for (const plat of this.platforms) {
      if (
        this.px + pSize > plat.x &&
        this.px < plat.x + plat.w &&
        this.py + pSize >= plat.y &&
        this.py + pSize <= plat.y + 15 &&
        this.vy >= 0
      ) {
        this.py = plat.y - pSize;
        this.vy = 0;
        this.isGrounded = true;
      }
    }

    // Collect Coins
    for (const coin of this.coins) {
      if (!coin.collected) {
        if (
          this.px < coin.x + 20 &&
          this.px + pSize > coin.x &&
          this.py < coin.y + 20 &&
          this.py + pSize > coin.y
        ) {
          coin.collected = true;
          this.score += 100;
          if (this.callbacks.onScoreChange) {
            this.callbacks.onScoreChange(this.score);
          }
        }
      }
    }

    // Goal Reach Win
    if (this.px >= this.goalX) {
      this.winGame();
      return;
    }

    // Fall in pit
    if (this.py > this.canvas.height + 100) {
      this.gameOver();
    }
  }

  private winGame(): void {
    this.state = 'win';
    this.score += Math.max(0, 1000 - Math.floor(this.timeMs / 100));
    const replayPayload = this.recorder.stop();
    this.render();
    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver(this.score, replayPayload);
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

    // Camera offset tracking player X
    const cameraX = Math.max(0, this.px - 150);

    this.ctx.save();
    this.ctx.fillStyle = theme.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.translate(-cameraX, 0);

    // Platforms
    this.ctx.fillStyle = theme.surfaceColor;
    this.ctx.strokeStyle = theme.accentColor;
    this.ctx.lineWidth = 2;
    for (const plat of this.platforms) {
      this.ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      this.ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    }

    // Coins
    for (const coin of this.coins) {
      if (coin.collected) continue;
      this.ctx.save();
      this.ctx.shadowColor = theme.collectibleColor;
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = theme.collectibleColor;
      this.ctx.beginPath();
      this.ctx.arc(coin.x + 10, coin.y + 10, 8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Goal Portal
    this.ctx.save();
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.fillRect(this.goalX, 200, 30, 80);
    this.ctx.restore();

    // Player
    if (this.state !== 'gameover') {
      this.ctx.save();
      this.ctx.shadowColor = theme.playerColor;
      this.ctx.shadowBlur = 12;
      this.ctx.fillStyle = theme.playerColor;
      this.ctx.fillRect(this.px, this.py, this.schema.player.size, this.schema.player.size);
      this.ctx.restore();
    }

    this.ctx.restore();

    // HUD
    this.ctx.save();
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillStyle = theme.accentColor;
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 36);
    this.ctx.restore();

    if (this.state === 'ready') {
      this.drawOverlayText('PRECISION PLATFORMER', 'A/D or Arrows to Move — Space to Jump');
    } else if (this.state === 'gameover') {
      this.drawOverlayText('FELL INTO THE VOID', 'Press Space to Retry');
    } else if (this.state === 'win') {
      this.drawOverlayText('STAGE CLEARED! 🏆', `FINAL SCORE: ${this.score} — Press Space`);
    }
  }

  private drawOverlayText(title: string, subtitle: string): void {
    const { width, height } = this.canvas;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(10, 5, 20, 0.75)';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.shadowColor = this.schema.theme.accentColor;
    this.ctx.shadowBlur = 16;
    this.ctx.font = 'bold 28px monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, width / 2, height / 2 - 10);

    this.ctx.font = '15px monospace';
    this.ctx.fillStyle = this.schema.theme.accentColor;
    this.ctx.fillText(subtitle, width / 2, height / 2 + 30);
    this.ctx.restore();
  }
}
