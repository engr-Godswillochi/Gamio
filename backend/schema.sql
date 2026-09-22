-- PostgreSQL Schema for Gamio (PRD Section 8)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Games: schema JSONB is the single source of truth (PRD Section 5.0)
CREATE TABLE IF NOT EXISTS games (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID REFERENCES users(id),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  template        TEXT NOT NULL,             -- 'runner' | 'dodge' | 'platformer' | 'quiz' | 'shooter'
  creation_path   TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'ai'
  schema          JSONB NOT NULL,            -- entities, controls, rules, theme
  remix_of_id     UUID REFERENCES games(id), -- null if original
  is_published    BOOLEAN NOT NULL DEFAULT false,
  play_count      INTEGER NOT NULL DEFAULT 0,
  remix_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CREATE TABLE does not add columns to an existing local database. Keep this
-- migration idempotent because the discovery and remix routes depend on it.
ALTER TABLE games ADD COLUMN IF NOT EXISTS remix_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_games_creator ON games(creator_id);
CREATE INDEX IF NOT EXISTS idx_games_remix_of ON games(remix_of_id);
CREATE INDEX IF NOT EXISTS idx_games_published ON games(is_published, created_at DESC);

-- Replays: cheap-to-store record of a play session (PRD Section 7)
CREATE TABLE IF NOT EXISTS replays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),   -- null for anonymous play
  rng_seed    TEXT NOT NULL,
  input_log   JSONB NOT NULL,              -- timestamped input/tick events
  duration_ms INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_replays_game ON replays(game_id);

-- Scores: leaderboard entries per game
CREATE TABLE IF NOT EXISTS scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  username    TEXT NOT NULL DEFAULT 'Anonymous',
  value       INTEGER NOT NULL,   -- score, time, or metric
  metric_type TEXT NOT NULL DEFAULT 'score', -- 'score' | 'time_ms' | 'level_reached'
  replay_id   UUID REFERENCES replays(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scores_leaderboard ON scores(game_id, value DESC);

-- Clips: rendered video lazily generated from a replay (PRD Section 7.2)
CREATE TABLE IF NOT EXISTS clips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  replay_id     UUID NOT NULL REFERENCES replays(id) ON DELETE CASCADE,
  video_url     TEXT,             -- null until first render completes
  render_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'rendering' | 'ready' | 'failed'
  view_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Additive migration: preserve games, replay logs and clip separation (PRD §8).
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_hash TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE games ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE replays ADD COLUMN IF NOT EXISTS schema_snapshot JSONB;
ALTER TABLE replays ADD COLUMN IF NOT EXISTS ticks INTEGER;
ALTER TABLE replays ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE replays ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE replays ADD COLUMN IF NOT EXISTS share_hash TEXT;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS scores_replay_once ON scores(replay_id) WHERE replay_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clips_replay_once ON clips(replay_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users(lower(username));
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL REFERENCES games(id),
  user_id UUID REFERENCES users(id), rng_seed TEXT NOT NULL, schema_snapshot JSONB NOT NULL,
  revision INTEGER NOT NULL, token_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS runs_created ON runs(created_at);
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL REFERENCES games(id),
  reporter_id UUID NOT NULL REFERENCES users(id), reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, reporter_id)
);
