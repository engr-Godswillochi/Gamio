import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, isConnected, listMemoryGames, memoryStore } from '../db.js';
import { DEFAULT_RUNNER_SCHEMA, PRESET_THEMES, GameSchema } from '../types/gameSchema.js';

export const gameRouter = Router();

// 1. GET /api/templates - Starter templates metadata & default schemas
gameRouter.get('/templates', (_req: Request, res: Response) => {
  res.json({
    templates: [
      {
        id: 'runner',
        name: 'Endless Runner',
        description: 'Dodge obstacles, jump over hazards, collect power orbs, and survive as speed increases.',
        defaultSchema: DEFAULT_RUNNER_SCHEMA,
      },
      {
        id: 'dodge',
        name: 'Top-Down Survival',
        description: 'Navigate in 360 degrees to avoid incoming hazards and stay alive as long as possible.',
        defaultSchema: {
          ...DEFAULT_RUNNER_SCHEMA,
          title: 'Cyber Survival Dodge',
          slug: 'cyber-survival-dodge',
          template: 'dodge',
        },
      },
      {
        id: 'platformer',
        name: 'Precision Platformer',
        description: 'Jump across platforms, collect coins, and reach the finish portal.',
        defaultSchema: {
          ...DEFAULT_RUNNER_SCHEMA,
          title: 'Neon Jumper',
          slug: 'neon-jumper',
          template: 'platformer',
        },
      },
      {
        id: 'quiz',
        name: 'Speed Trivia Challenge',
        description: 'Answer rapid-fire trivia questions against the clock.',
        defaultSchema: {
          ...DEFAULT_RUNNER_SCHEMA,
          title: 'Arcade Trivia Dash',
          slug: 'arcade-trivia-dash',
          template: 'quiz',
        },
      },
    ],
    presetThemes: PRESET_THEMES,
  });
});

// 2. POST /api/games - Create game draft
gameRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      template = 'runner',
      schema: inputSchema,
      remixOfId,
      isPublished,
      creationPath,
      creation_path: legacyCreationPath,
    } = req.body;
    const gameId = uuidv4();
    const resolvedTemplate = inputSchema?.template || template;
    const resolvedCreationPath = creationPath || legacyCreationPath || 'manual';
    const published = Boolean(isPublished);
    const slug = (title || 'untitled-game')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + gameId.slice(0, 8);

    const fullSchema: GameSchema = inputSchema || {
      ...DEFAULT_RUNNER_SCHEMA,
      id: gameId,
      title: title || 'My Gamio Game',
      slug,
      template: resolvedTemplate,
      remixOfId: remixOfId || null,
    };
    fullSchema.id = gameId;
    fullSchema.slug = slug;
    fullSchema.template = resolvedTemplate;

    if (isConnected()) {
      const sql = `
        INSERT INTO games (id, title, slug, template, creation_path, schema, remix_of_id, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const result = await query(sql, [
        gameId,
        fullSchema.title,
        slug,
        resolvedTemplate,
        resolvedCreationPath,
        JSON.stringify(fullSchema),
        remixOfId || null,
        published,
      ]);
      return res.status(201).json(result.rows[0]);
    } else {
      const record = {
        id: gameId,
        creator_id: null,
        title: fullSchema.title,
        slug,
        template: resolvedTemplate,
        creation_path: resolvedCreationPath,
        schema: fullSchema,
        remix_of_id: remixOfId || null,
        is_published: published,
        play_count: 0,
        remix_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.games.set(gameId, record);
      memoryStore.games.set(slug, record);
      return res.status(201).json(record);
    }
  } catch (error: any) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: error.message || 'Failed to create game' });
  }
});

// 3. GET /api/games/:slugOrId - Fetch game schema & details
gameRouter.get('/:slugOrId', async (req: Request, res: Response) => {
  try {
    const slugOrId = String(req.params.slugOrId);

    if (isConnected()) {
      const sql = `SELECT * FROM games WHERE id::text = $1 OR slug = $1 LIMIT 1;`;
      const result = await query(sql, [slugOrId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }
      return res.json(result.rows[0]);
    } else {
      const record = memoryStore.games.get(slugOrId);
      if (!record) {
        // Return default runner schema if not found in memory
        return res.json({
          id: 'demo-runner',
          title: DEFAULT_RUNNER_SCHEMA.title,
          slug: DEFAULT_RUNNER_SCHEMA.slug,
          template: DEFAULT_RUNNER_SCHEMA.template,
          creation_path: 'manual',
          schema: DEFAULT_RUNNER_SCHEMA,
          is_published: true,
          play_count: 42,
          created_at: new Date().toISOString(),
        });
      }
      return res.json(record);
    }
  } catch (error: any) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. PUT /api/games/:id - Save / Update Game Schema from Visual Builder
gameRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { schema, isPublished, title } = req.body;

    if (!schema) {
      return res.status(400).json({ error: 'Missing schema payload' });
    }

    if (isConnected()) {
      const sql = `
        UPDATE games
        SET schema = $1, title = COALESCE($2, title), is_published = COALESCE($3, is_published), updated_at = now()
        WHERE id::text = $4
        RETURNING *;
      `;
      const result = await query(sql, [JSON.stringify(schema), title, isPublished, id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }
      return res.json(result.rows[0]);
    } else {
      let record = memoryStore.games.get(id);
      if (!record) {
        record = {
          id,
          title: title || schema.title || 'Untitled Game',
          slug: schema.slug || `game-${id}`,
          template: schema.template || 'runner',
          creation_path: 'manual',
          schema,
          is_published: Boolean(isPublished),
          play_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else {
        record.schema = schema;
        record.title = title || schema.title || record.title;
        if (isPublished !== undefined) record.is_published = isPublished;
        record.updated_at = new Date().toISOString();
      }
      memoryStore.games.set(id, record);
      memoryStore.games.set(record.slug, record);
      return res.json(record);
    }
  } catch (error: any) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GET /api/feed - Public discovery feed (trending / newest / most remixed)
gameRouter.get('/', async (req: Request, res: Response) => {
  try {
    const sort = String(req.query.sort || 'trending');
    const templateFilter = String(req.query.template || 'all');

    if (isConnected()) {
      let orderBy = 'created_at DESC';
      if (sort === 'trending') {
        orderBy = '(play_count * 2 + remix_count * 5) DESC, created_at DESC';
      } else if (sort === 'remixed') {
        orderBy = 'remix_count DESC, created_at DESC';
      }

      let whereClause = 'WHERE is_published = true';
      const params: any[] = [];
      if (templateFilter !== 'all') {
        params.push(templateFilter);
        whereClause += ` AND template = $${params.length}`;
      }

      const sql = `
        SELECT id, title, slug, template, creation_path, schema, play_count, remix_count, created_at
        FROM games
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT 30;
      `;
      const result = await query(sql, params);
      return res.json({ games: result.rows });
    } else {
      let games = listMemoryGames().filter((g) => g.is_published);

      if (templateFilter !== 'all') {
        games = games.filter((g) => g.template === templateFilter);
      }

      if (sort === 'trending') {
        games.sort((a, b) => (b.play_count * 2 + (b.remix_count || 0) * 5) - (a.play_count * 2 + (a.remix_count || 0) * 5));
      } else if (sort === 'remixed') {
        games.sort((a, b) => (b.remix_count || 0) - (a.remix_count || 0));
      }

      if (games.length === 0) {
        games = [
          {
            id: 'demo-runner',
            title: DEFAULT_RUNNER_SCHEMA.title,
            slug: DEFAULT_RUNNER_SCHEMA.slug,
            template: 'runner',
            creation_path: 'manual',
            schema: DEFAULT_RUNNER_SCHEMA,
            play_count: 142,
            remix_count: 8,
            created_at: new Date().toISOString(),
          },
          {
            id: 'demo-dodge',
            title: 'Cyber Survival Dodge',
            slug: 'cyber-survival-dodge',
            template: 'dodge',
            creation_path: 'manual',
            schema: { ...DEFAULT_RUNNER_SCHEMA, title: 'Cyber Survival Dodge', template: 'dodge' },
            play_count: 98,
            remix_count: 5,
            created_at: new Date().toISOString(),
          },
          {
            id: 'demo-platformer',
            title: 'Neon Platformer Jump',
            slug: 'neon-platformer-jump',
            template: 'platformer',
            creation_path: 'manual',
            schema: { ...DEFAULT_RUNNER_SCHEMA, title: 'Neon Platformer Jump', template: 'platformer' },
            play_count: 76,
            remix_count: 3,
            created_at: new Date().toISOString(),
          },
        ];
      }
      return res.json({ games });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
