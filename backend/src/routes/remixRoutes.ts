import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, isConnected, listMemoryGames, memoryStore } from '../db.js';

export const remixRouter = Router();

// 1. POST /api/remix/:parentGameId - Create draft remix of existing game
remixRouter.post('/:parentGameId', async (req: Request, res: Response) => {
  try {
    const parentGameId = String(req.params.parentGameId);

    let parentGame: any = null;
    if (isConnected()) {
      const resDb = await query(`SELECT * FROM games WHERE id::text = $1 OR slug = $1 LIMIT 1;`, [parentGameId]);
      parentGame = resDb.rows[0];
    } else {
      parentGame = memoryStore.games.get(parentGameId);
    }

    if (!parentGame) {
      return res.status(404).json({ error: 'Parent game not found to remix' });
    }

    const remixId = uuidv4();
    const remixTitle = `${parentGame.title} (Remix)`;
    const remixSlug = (parentGame.slug || 'game') + '-remix-' + remixId.slice(0, 8);
    
    const clonedSchema = {
      ...(typeof parentGame.schema === 'string' ? JSON.parse(parentGame.schema) : parentGame.schema),
      id: remixId,
      title: remixTitle,
      slug: remixSlug,
      remixOfId: parentGame.id,
    };

    if (isConnected()) {
      const sql = `
        INSERT INTO games (id, title, slug, template, creation_path, schema, remix_of_id, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const result = await query(sql, [
        remixId,
        remixTitle,
        remixSlug,
        parentGame.template,
        'manual',
        JSON.stringify(clonedSchema),
        parentGame.id,
        false,
      ]);

      // Increment parent game remix_count
      await query(`UPDATE games SET remix_count = remix_count + 1 WHERE id = $1;`, [parentGame.id]);

      return res.status(201).json(result.rows[0]);
    } else {
      const record = {
        id: remixId,
        title: remixTitle,
        slug: remixSlug,
        template: parentGame.template,
        creation_path: 'manual',
        schema: clonedSchema,
        remix_of_id: parentGame.id,
        is_published: false,
        play_count: 0,
        remix_count: 0,
        created_at: new Date().toISOString(),
      };
      memoryStore.games.set(remixId, record);
      memoryStore.games.set(remixSlug, record);

      // Increment in-memory parent remix count
      if (parentGame.remix_count !== undefined) {
        parentGame.remix_count = (parentGame.remix_count || 0) + 1;
      }

      return res.status(201).json(record);
    }
  } catch (error: any) {
    console.error('Error creating remix:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/remix/tree/:gameId - Fetch lineage graph (parent, ancestors, children)
remixRouter.get('/tree/:gameId', async (req: Request, res: Response) => {
  try {
    const gameId = String(req.params.gameId);

    if (isConnected()) {
      // Query children remixes
      const childSql = `SELECT id, title, slug, template, play_count, remix_count, created_at FROM games WHERE remix_of_id::text = $1;`;
      const childrenRes = await query(childSql, [gameId]);
      
      // Query target game
      const targetSql = `SELECT id, title, slug, template, remix_of_id, play_count, created_at FROM games WHERE id::text = $1 OR slug = $1 LIMIT 1;`;
      const targetRes = await query(targetSql, [gameId]);

      const currentGame = targetRes.rows[0] || null;
      let parentGame = null;

      if (currentGame?.remix_of_id) {
        const parentSql = `SELECT id, title, slug, template, play_count, created_at FROM games WHERE id::text = $1 LIMIT 1;`;
        const parentRes = await query(parentSql, [currentGame.remix_of_id]);
        parentGame = parentRes.rows[0] || null;
      }

      return res.json({
        current: currentGame,
        parent: parentGame,
        children: childrenRes.rows,
      });
    } else {
      const currentGame = memoryStore.games.get(gameId);
      const allGames = listMemoryGames();
      
      const children = allGames.filter((g) => g.remix_of_id === gameId);
      const parent = currentGame?.remix_of_id ? memoryStore.games.get(currentGame.remix_of_id) || null : null;

      return res.json({
        current: currentGame || { id: gameId, title: 'Neon Runner', slug: 'neon-runner' },
        parent,
        children,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
