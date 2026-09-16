export type TemplateType = 'runner' | 'dodge' | 'platformer' | 'quiz' | 'shooter';
export type CreationPath = 'manual' | 'ai';
export type MetricType = 'score' | 'time_ms' | 'level_reached';

export interface ThemeConfig {
  name: string;
  backgroundColor: string;
  surfaceColor: string;
  playerColor: string;
  obstacleColor: string;
  collectibleColor: string;
  particleColor: string;
  accentColor: string;
  fontFamily?: string;
}

export interface PlayerConfig {
  size: number;
  speed: number;
  jumpForce: number;
  gravity: number;
  color: string;
  maxLives: number;
  spriteShape: 'rect' | 'circle' | 'hero';
}

export interface HazardConfig {
  spawnRateMs: number;
  speed: number;
  minGap: number;
  height: number;
  width: number;
  color: string;
  types: Array<'ground' | 'flying'>;
}

export interface CollectibleConfig {
  spawnChance: number;
  scoreValue: number;
  color: string;
  size: number;
}

export interface ControlsConfig {
  jumpKeys: string[];
  moveLeftKeys: string[];
  moveRightKeys: string[];
}

export interface RulesConfig {
  lives: number;
  winCondition: 'none' | 'reach_score' | 'survive_time';
  targetValue?: number;
  metricType: MetricType;
  speedMultiplierPerSecond: number;
}

export interface GameSchema {
  id?: string;
  title: string;
  slug: string;
  template: TemplateType;
  creationPath: CreationPath;
  description?: string;
  theme: ThemeConfig;
  player: PlayerConfig;
  hazards: HazardConfig;
  collectibles: CollectibleConfig;
  controls: ControlsConfig;
  rules: RulesConfig;
  remixOfId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReplayTickInput {
  tick: number;
  timeMs: number;
  keys: string[];
}

export interface ReplayPayload {
  id?: string;
  gameId: string;
  userId?: string | null;
  rngSeed: string;
  inputLog: ReplayTickInput[];
  durationMs: number;
  createdAt?: string;
}

export interface ScoreEntry {
  id?: string;
  gameId: string;
  userId?: string | null;
  username?: string;
  value: number;
  metricType: MetricType;
  replayId?: string | null;
  createdAt?: string;
}

export const PRESET_THEMES: Record<string, ThemeConfig> = {
  neon_synthwave: {
    name: 'Neon Synthwave',
    backgroundColor: '#0f051d',
    surfaceColor: '#1a0b2e',
    playerColor: '#00f0ff',
    obstacleColor: '#ff0055',
    collectibleColor: '#ffe600',
    particleColor: '#a100ff',
    accentColor: '#00f0ff',
  },
  cyberpunk_arcade: {
    name: 'Cyberpunk Arcade',
    backgroundColor: '#0a0a0f',
    surfaceColor: '#12121c',
    playerColor: '#39ff14',
    obstacleColor: '#ff2a6d',
    collectibleColor: '#05d9e8',
    particleColor: '#d1f7ff',
    accentColor: '#39ff14',
  },
  sunset_glow: {
    name: 'Sunset Glow',
    backgroundColor: '#1b1424',
    surfaceColor: '#2b1b3a',
    playerColor: '#ff7b00',
    obstacleColor: '#ff0055',
    collectibleColor: '#ffdd00',
    particleColor: '#ff5400',
    accentColor: '#ff7b00',
  },
  matrix_green: {
    name: 'Matrix Core',
    backgroundColor: '#051109',
    surfaceColor: '#0c2214',
    playerColor: '#00ff66',
    obstacleColor: '#008833',
    collectibleColor: '#ccff00',
    particleColor: '#00ffaa',
    accentColor: '#00ff66',
  }
};

export const DEFAULT_RUNNER_SCHEMA: GameSchema = {
  title: 'Neon Dash Runner',
  slug: 'neon-dash-runner',
  template: 'runner',
  creationPath: 'manual',
  description: 'Dodge the neon hazards and collect power orbs to set a record high score!',
  theme: PRESET_THEMES.neon_synthwave,
  player: {
    size: 32,
    speed: 360,
    jumpForce: 620,
    gravity: 1600,
    color: '#00f0ff',
    maxLives: 1,
    spriteShape: 'hero'
  },
  hazards: {
    spawnRateMs: 1400,
    speed: 340,
    minGap: 220,
    height: 48,
    width: 32,
    color: '#ff0055',
    types: ['ground', 'flying']
  },
  collectibles: {
    spawnChance: 0.6,
    scoreValue: 50,
    color: '#ffe600',
    size: 20
  },
  controls: {
    jumpKeys: ['Space', 'ArrowUp', 'KeyW'],
    moveLeftKeys: [],
    moveRightKeys: []
  },
  rules: {
    lives: 1,
    winCondition: 'none',
    metricType: 'score',
    speedMultiplierPerSecond: 0.015
  }
};
