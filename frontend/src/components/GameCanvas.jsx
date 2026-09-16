import { useEffect, useRef, useState, useCallback } from 'react';
import { SeededRNG } from '../engine/seededRNG';

// ── Pixel Character ──
const CHAR_W = 12;
const CHAR_H = 16;
const GROUND_Y = 200;
const GRAVITY = 0.6;
const JUMP_FORCE = -11;
const OBSTACLE_SPEED = 3.5;
const COIN_SPEED = 3;

function drawPixelChar(ctx, x, y, frame) {
  // Body
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.fillRect(x + 2, y + 2, 8, 8);
  // Head
  ctx.fillStyle = '#b347ff';
  ctx.shadowColor = '#b347ff';
  ctx.fillRect(x + 3, y - 2, 6, 5);
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 0;
  ctx.fillRect(x + 4, y, 2, 2);
  ctx.fillRect(x + 7, y, 2, 2);
  // Legs (animated)
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 4;
  const legOffset = Math.sin(frame * 0.3) * 2;
  ctx.fillRect(x + 3, y + 10, 3, 4 + legOffset);
  ctx.fillRect(x + 7, y + 10, 3, 4 - legOffset);
}

function drawObstacle(ctx, x, y, h) {
  ctx.fillStyle = '#ff2d7c';
  ctx.shadowColor = '#ff2d7c';
  ctx.shadowBlur = 10;
  ctx.fillRect(x, y - h, 14, h);
  // Glow stripe
  ctx.fillStyle = 'rgba(255, 45, 124, 0.3)';
  ctx.fillRect(x + 2, y - h + 2, 10, 3);
}

function drawCoin(ctx, x, y, frame) {
  const scale = 0.7 + Math.sin(frame * 0.1) * 0.3;
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffed4a';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround(ctx, w, frame) {
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + CHAR_H);
  ctx.lineTo(w, GROUND_Y + CHAR_H);
  ctx.stroke();
  
  // Ground grid lines
  const offset = (frame * OBSTACLE_SPEED) % 24;
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
  for (let i = -offset; i < w; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, GROUND_Y + CHAR_H);
    ctx.lineTo(i + 12, GROUND_Y + CHAR_H + 30);
    ctx.stroke();
  }
}

export default function GameCanvas() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    charY: GROUND_Y,
    velY: 0,
    jumping: false,
    frame: 0,
    score: 0,
    obstacles: [],
    coins: [],
    lastObstacle: 0,
    lastCoin: 0,
    particles: [],
    rng: new SeededRNG(),
  });

  const [score, setScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 260 });

  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      const container = canvasRef.current?.parentElement;
      if (!container) return;
      const w = Math.min(container.clientWidth, 500);
      setCanvasSize({ w, h: 260 });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (!s.jumping) {
      s.velY = JUMP_FORCE;
      s.jumping = true;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    const loop = () => {
      const { w, h } = canvasSize;
      ctx.clearRect(0, 0, w, h);
      s.frame++;

      // Physics
      s.velY += GRAVITY;
      s.charY += s.velY;
      if (s.charY >= GROUND_Y) {
        s.charY = GROUND_Y;
        s.velY = 0;
        s.jumping = false;
      }

      // Spawn obstacles
      if (s.frame - s.lastObstacle > 90 + s.rng.nextFloat() * 60) {
        s.obstacles.push({ x: w + 20, h: 20 + s.rng.nextFloat() * 20 });
        s.lastObstacle = s.frame;
      }

      // Spawn coins
      if (s.frame - s.lastCoin > 60 + s.rng.nextFloat() * 40) {
        s.coins.push({ x: w + 20, y: GROUND_Y - 30 - s.rng.nextFloat() * 40 });
        s.lastCoin = s.frame;
      }

      // Update obstacles
      s.obstacles = s.obstacles.filter((ob) => {
        ob.x -= OBSTACLE_SPEED;
        return ob.x > -20;
      });

      // Update coins & check collection
      s.coins = s.coins.filter((coin) => {
        coin.x -= COIN_SPEED;
        const charCenterX = 50 + CHAR_W / 2;
        const charCenterY = s.charY + CHAR_H / 2;
        const dx = charCenterX - coin.x;
        const dy = charCenterY - coin.y;
        if (Math.sqrt(dx * dx + dy * dy) < 18) {
          s.score += 10;
          setScore(s.score);
          // Spawn particles
          for (let i = 0; i < 5; i++) {
            s.particles.push({
              x: coin.x,
              y: coin.y,
              vx: (s.rng.nextFloat() - 0.5) * 4,
              vy: (s.rng.nextFloat() - 0.5) * 4,
              life: 20,
            });
          }
          return false;
        }
        return coin.x > -20;
      });

      // Update particles
      s.particles = s.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });

      // Auto-jump over obstacles
      for (const ob of s.obstacles) {
        if (ob.x > 40 && ob.x < 80 && !s.jumping) {
          s.velY = JUMP_FORCE;
          s.jumping = true;
          break;
        }
      }

      // ── Draw ──
      drawGround(ctx, w, s.frame);

      // Obstacles
      for (const ob of s.obstacles) {
        drawObstacle(ctx, ob.x, GROUND_Y + CHAR_H, ob.h);
      }

      // Coins
      for (const coin of s.coins) {
        drawCoin(ctx, coin.x, coin.y, s.frame);
      }

      // Character
      drawPixelChar(ctx, 50, s.charY, s.frame);

      // Particles
      ctx.shadowBlur = 0;
      for (const p of s.particles) {
        const alpha = p.life / 20;
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.fillRect(p.x, p.y, 3, 3);
      }

      // Score display on canvas
      ctx.font = '700 14px "Orbitron", sans-serif';
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.fillText(`SCORE ${String(s.score).padStart(5, '0')}`, w - 150, 24);
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [canvasSize]);

  // Keyboard & touch jump
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump]);

  return (
    <div className="relative w-full max-w-[500px] mx-auto">
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        onClick={jump}
        onTouchStart={jump}
        className="w-full cursor-pointer rounded-xl border border-void-border/50"
        style={{ imageRendering: 'pixelated' }}
        aria-label="Interactive game demo — click or press space to jump"
        role="img"
      />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-text-secondary font-body opacity-60">
        Tap or press Space to jump
      </div>
    </div>
  );
}
