import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, isConnected, memoryStore } from '../db.js';

export const socialRouter = Router();

// 1. POST /api/replays - Record play session replay log (PRD Section 7)
socialRouter.post('/replays', async (req: Request, res: Response) => {
  try {
    const { gameId, userId = null, rngSeed, inputLog, durationMs } = req.body;

    if (!gameId || !rngSeed || !inputLog) {
      return res.status(400).json({ error: 'Missing required replay parameters' });
    }

    const replayId = uuidv4();

    if (isConnected()) {
      const sql = `
        INSERT INTO replays (id, game_id, user_id, rng_seed, input_log, duration_ms)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const result = await query(sql, [
        replayId,
        gameId,
        userId,
        rngSeed,
        JSON.stringify(inputLog),
        durationMs || 0,
      ]);
      return res.status(201).json(result.rows[0]);
    } else {
      const record = {
        id: replayId,
        game_id: gameId,
        user_id: userId,
        rng_seed: rngSeed,
        input_log: inputLog,
        duration_ms: durationMs || 0,
        created_at: new Date().toISOString(),
      };
      memoryStore.replays.set(replayId, record);
      return res.status(201).json(record);
    }
  } catch (error: any) {
    console.error('Error logging replay:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/replays/:id - Get replay payload
socialRouter.get('/replays/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    if (isConnected()) {
      const sql = `SELECT * FROM replays WHERE id::text = $1 LIMIT 1;`;
      const result = await query(sql, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Replay not found' });
      }
      return res.json(result.rows[0]);
    } else {
      const record = memoryStore.replays.get(id);
      if (!record) {
        return res.status(404).json({ error: 'Replay not found' });
      }
      return res.json(record);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/scores - Submit score to game leaderboard
socialRouter.post('/scores', async (req: Request, res: Response) => {
  try {
    const { gameId, userId = null, username = 'Anonymous Runner', value, metricType = 'score', replayId = null } = req.body;

    if (!gameId || value === undefined) {
      return res.status(400).json({ error: 'Missing gameId or value' });
    }

    const scoreId = uuidv4();

    if (isConnected()) {
      const sql = `
        INSERT INTO scores (id, game_id, user_id, username, value, metric_type, replay_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const result = await query(sql, [scoreId, gameId, userId, username, value, metricType, replayId]);

      // Increment game play count
      await query(`UPDATE games SET play_count = play_count + 1 WHERE id::text = $1;`, [gameId]);

      return res.status(201).json(result.rows[0]);
    } else {
      const record = {
        id: scoreId,
        game_id: gameId,
        user_id: userId,
        username,
        value: Number(value),
        metric_type: metricType,
        replay_id: replayId,
        created_at: new Date().toISOString(),
      };
      const existing = memoryStore.scores.get(gameId) || [];
      existing.push(record);
      existing.sort((a, b) => b.value - a.value);
      memoryStore.scores.set(gameId, existing);
      return res.status(201).json(record);
    }
  } catch (error: any) {
    console.error('Error recording score:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. GET /api/leaderboards/:gameId - Fetch leaderboard for a game
socialRouter.get('/leaderboards/:gameId', async (req: Request, res: Response) => {
  try {
    const gameId = String(req.params.gameId);

    if (isConnected()) {
      const sql = `
        SELECT id, game_id, username, value, metric_type, replay_id, created_at
        FROM scores
        WHERE game_id::text = $1 OR game_id IN (SELECT id FROM games WHERE slug = $1)
        ORDER BY value DESC
        LIMIT 50;
      `;
      const result = await query(sql, [gameId]);
      return res.json({ scores: result.rows });
    } else {
      const list = memoryStore.scores.get(gameId) || [
        { id: '1', username: 'CyberRider', value: 1420, metric_type: 'score', created_at: new Date().toISOString() },
        { id: '2', username: 'NeonPulse', value: 980, metric_type: 'score', created_at: new Date().toISOString() },
        { id: '3', username: 'PixelKnight', value: 650, metric_type: 'score', created_at: new Date().toISOString() },
      ];
      return res.json({ scores: list });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
