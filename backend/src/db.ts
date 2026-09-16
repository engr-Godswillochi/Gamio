import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gamio';

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 3000,
});

let isPostgresConnected = false;

// Fallback in-memory DB store if PostgreSQL service is offline locally
const memoryStore = {
  games: new Map<string, any>(),
  replays: new Map<string, any>(),
  scores: new Map<string, any[]>(),
};

export async function initDb(): Promise<boolean> {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully to:', connectionString.replace(/:[^:@]+@/, ':****@'));
    
    // Auto-create database tables if they do not exist yet
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username      TEXT UNIQUE NOT NULL,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url    TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS games (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        creator_id      UUID REFERENCES users(id),
        title           TEXT NOT NULL,
        slug            TEXT UNIQUE NOT NULL,
        template        TEXT NOT NULL,
        creation_path   TEXT NOT NULL DEFAULT 'manual',
        schema          JSONB NOT NULL,
        remix_of_id     UUID REFERENCES games(id),
        is_published    BOOLEAN NOT NULL DEFAULT false,
        play_count      INTEGER NOT NULL DEFAULT 0,
        remix_count     INTEGER NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Keep existing developer databases compatible with the discovery and
      -- remix queries below. CREATE TABLE IF NOT EXISTS alone cannot do that.
      ALTER TABLE games ADD COLUMN IF NOT EXISTS remix_count INTEGER NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS replays (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        user_id     UUID REFERENCES users(id),
        rng_seed    TEXT NOT NULL,
        input_log   JSONB NOT NULL,
        duration_ms INTEGER NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS scores (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        user_id     UUID REFERENCES users(id),
        username    TEXT NOT NULL DEFAULT 'Anonymous',
        value       INTEGER NOT NULL,
        metric_type TEXT NOT NULL DEFAULT 'score',
        replay_id   UUID REFERENCES replays(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS clips (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        replay_id     UUID NOT NULL REFERENCES replays(id) ON DELETE CASCADE,
        video_url     TEXT,
        render_status TEXT NOT NULL DEFAULT 'pending',
        view_count    INTEGER NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log('✅ PostgreSQL Database schema verified and initialized!');
    client.release();
    isPostgresConnected = true;
    return true;
  } catch (error) {
    console.warn('⚠️ PostgreSQL connection failed. Falling back to robust in-memory database store for dev session.');
    isPostgresConnected = false;
    return false;
  }
}

export function isConnected(): boolean {
  return isPostgresConnected;
}

/**
 * Games are addressable by both ID and slug in the fallback store. List views
 * must use this accessor so one game is not returned once for each key.
 */
export function listMemoryGames(): any[] {
  return Array.from(
    new Map(Array.from(memoryStore.games.values()).map((game) => [game.id, game])).values()
  );
}

export async function query(text: string, params?: any[]) {
  if (isPostgresConnected) {
    return pool.query(text, params);
  }
  throw new Error('PostgreSQL not connected');
}

export { memoryStore };
