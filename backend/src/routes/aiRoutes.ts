import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const aiRouter = Router();

// Preset color palettes matching prompt aesthetics
const THEME_PALETTES: Record<string, any> = {
  cyberpunk: { name: 'Cyberpunk Neon', backgroundColor: '#090514', playerColor: '#00f0ff', obstacleColor: '#ff2d7c', collectableColor: '#39ff14', accentColor: '#00f0ff' },
  synthwave: { name: 'Synthwave Sunset', backgroundColor: '#120420', playerColor: '#ff007f', obstacleColor: '#7928ca', collectableColor: '#ff00d4', accentColor: '#ff007f' },
  matrix: { name: 'Matrix Terminal', backgroundColor: '#020d04', playerColor: '#00ff66', obstacleColor: '#008833', collectableColor: '#ccff00', accentColor: '#00ff66' },
  fire: { name: 'Volcanic Inferno', backgroundColor: '#1a0505', playerColor: '#ff4500', obstacleColor: '#ff8c00', collectableColor: '#ffd700', accentColor: '#ff4500' },
  ocean: { name: 'Abyssal Deep', backgroundColor: '#03101e', playerColor: '#00bfff', obstacleColor: '#1e90ff', collectableColor: '#00ffff', accentColor: '#00bfff' },
  retro: { name: 'Retro Arcade', backgroundColor: '#111111', playerColor: '#ffff00', obstacleColor: '#ff0000', collectableColor: '#00ffff', accentColor: '#ffff00' },
};

/**
 * Compiles or patches a v3 Logic Engine GameModelSchema from a user prompt.
 */
function patchV3Schema(prompt: string, baseSchema?: any) {
  const p = prompt.toLowerCase();

  // Deep clone or create initial v3 schema structure
  const schema = baseSchema
    ? JSON.parse(JSON.stringify(baseSchema))
    : {
        id: uuidv4(),
        title: 'AI Created Game',
        version: 3,
        scene: { width: 800, height: 450, backgroundColor: '#0f051d', gridVisible: true, gridSize: 32, camera: 'static', scrollType: 'none', bounds: { left: 0, right: 800, top: 0, bottom: 450 } },
        physics: { gravity: 1600, gameSpeed: 1, friction: 0.1 },
        entities: [
          {
            id: 'player-1', name: 'Player', type: 'player', isVisible: true, isLocked: false, tags: ['player'],
            transform: { x: 100, y: 300, width: 32, height: 32, rotation: 0, scale: 1 },
            physics: { enabled: true, isStatic: false, gravity: 1, bounciness: 0, friction: 0.1 },
            movement: { type: 'platformer', speed: 320, jumpForce: 650 },
            appearance: { shape: 'rect', color: '#00f0ff', glow: true, glowColor: '#00f0ff', opacity: 1 },
          },
          {
            id: 'ground-1', name: 'Ground', type: 'platform', isVisible: true, isLocked: false, tags: ['solid', 'ground'],
            transform: { x: 0, y: 420, width: 800, height: 30, rotation: 0, scale: 1 },
            physics: { enabled: true, isStatic: true },
            movement: { type: 'none' },
            appearance: { shape: 'rect', color: '#1a0b36', strokeColor: '#00f0ff', strokeWidth: 1, opacity: 1 },
          },
        ],
        logic: {
          inputBindings: [
            { name: 'Move Left', keys: ['ArrowLeft', 'KeyA'] },
            { name: 'Move Right', keys: ['ArrowRight', 'KeyD'] },
            { name: 'Jump', keys: ['Space', 'ArrowUp', 'KeyW'] },
          ],
          variables: [
            { name: 'score', type: 'number', defaultValue: 0 },
            { name: 'lives', type: 'number', defaultValue: 3 },
            { name: 'health', type: 'number', defaultValue: 100 },
            { name: 'gameSpeed', type: 'number', defaultValue: 1 },
          ],
          spawners: [],
          rules: [
            {
              id: 'lr_start',
              name: 'Game Start Announcement',
              enabled: true,
              event: { type: 'game_start' },
              conditions: [],
              actions: [{ type: 'camera_shake', value: 4 }],
            },
            {
              id: 'lr_left',
              name: 'Move Left Action',
              enabled: true,
              event: { type: 'input_held', inputAction: 'Move Left' },
              conditions: [],
              actions: [{ type: 'move', entityRef: { mode: 'tag', tag: 'player' }, vx: -320 }],
            },
            {
              id: 'lr_right',
              name: 'Move Right Action',
              enabled: true,
              event: { type: 'input_held', inputAction: 'Move Right' },
              conditions: [],
              actions: [{ type: 'move', entityRef: { mode: 'tag', tag: 'player' }, vx: 320 }],
            },
            {
              id: 'lr_jump',
              name: 'Jump Action',
              enabled: true,
              event: { type: 'input_pressed', inputAction: 'Jump' },
              conditions: [{ type: 'is_grounded', entityRef: { mode: 'tag', tag: 'player' } }],
              actions: [{ type: 'jump', entityRef: { mode: 'tag', tag: 'player' }, value: 650 }],
            },
            {
              id: 'lr_coin',
              name: 'Collect Gem/Coin',
              enabled: true,
              event: { type: 'collision_start', subjectRef: { mode: 'tag', tag: 'player' }, objectRef: { mode: 'tag', tag: 'collectible' } },
              conditions: [],
              actions: [
                { type: 'add_score', value: 10 },
                { type: 'destroy', entityRef: { mode: 'other' } },
                { type: 'spawn_particles', entityRef: { mode: 'other' } },
              ],
            },
            {
              id: 'lr_hazard',
              name: 'Touch Hazard',
              enabled: true,
              event: { type: 'collision_start', subjectRef: { mode: 'tag', tag: 'player' }, objectRef: { mode: 'tag', tag: 'hazard' } },
              conditions: [],
              actions: [
                { type: 'remove_life', value: 1 },
                { type: 'camera_shake', value: 10 },
              ],
            },
            {
              id: 'lr_goal',
              name: 'Reach Finish Goal',
              enabled: true,
              event: { type: 'collision_start', subjectRef: { mode: 'tag', tag: 'player' }, objectRef: { mode: 'tag', tag: 'goal' } },
              conditions: [],
              actions: [{ type: 'win_game' }],
            },
          ],
        },
        theme: { name: 'Default Dark', backgroundColor: '#0f051d', accentColor: '#00f0ff', particleColor: '#00f0ff', fontFamily: 'monospace' },
      };

  // Ensure schema has v3 logic structure initialized
  if (!schema.logic) {
    schema.logic = { inputBindings: [], variables: [], spawners: [], rules: [] };
  }

  // 1. Title / Aesthetics
  if (p.includes('cyberpunk') || p.includes('neon')) applyTheme(schema, THEME_PALETTES.cyberpunk);
  else if (p.includes('synthwave') || p.includes('sunset') || p.includes('pink')) applyTheme(schema, THEME_PALETTES.synthwave);
  else if (p.includes('matrix') || p.includes('hacker') || p.includes('green')) applyTheme(schema, THEME_PALETTES.matrix);
  else if (p.includes('fire') || p.includes('volcano') || p.includes('lava')) applyTheme(schema, THEME_PALETTES.fire);
  else if (p.includes('ocean') || p.includes('water') || p.includes('blue')) applyTheme(schema, THEME_PALETTES.ocean);
  else if (p.includes('retro') || p.includes('arcade')) applyTheme(schema, THEME_PALETTES.retro);

  // 2. Physics & Gravity
  if (p.includes('moon') || p.includes('low gravity') || p.includes('float')) {
    schema.physics.gravity = 600;
  } else if (p.includes('heavy') || p.includes('high gravity')) {
    schema.physics.gravity = 2500;
  } else if (p.includes('zero gravity') || p.includes('space') || p.includes('fly')) {
    schema.physics.gravity = 0;
  }

  // Speed & Jump
  const player = schema.entities.find((e: any) => e.type === 'player');
  if (player) {
    if (p.includes('fast') || p.includes('super speed') || p.includes('sonic')) {
      player.movement.speed = 500;
      // Update rules for movement speed
      for (const r of schema.logic.rules) {
        if (r.name?.includes('Left') && r.actions?.[0]) r.actions[0].vx = -500;
        if (r.name?.includes('Right') && r.actions?.[0]) r.actions[0].vx = 500;
      }
    }
    if (p.includes('super jump') || p.includes('high jump')) {
      player.movement.jumpForce = 900;
      for (const r of schema.logic.rules) {
        if (r.name?.includes('Jump') && r.actions?.[0]) r.actions[0].value = 900;
      }
    }
  }

  // 3. Spawners & Dynamic Obstacles
  if (p.includes('spawner') || p.includes('dodge') || p.includes('rain')) {
    schema.logic.spawners.push({
      id: `spw_${uuidv4().slice(0, 4)}`,
      name: 'Dynamic Spawner',
      entityType: 'hazard',
      entityTags: ['hazard'],
      entityAppearance: { color: '#ff0055' },
      interval: 2.0,
      spawnPosition: { x: 400, y: 50 },
      initialVelocity: { vx: 0, vy: 200 },
      maxActive: 8,
      autoStart: true,
    });
  }

  // 4. Entity Additions
  if (p.includes('coin') || p.includes('collectible') || p.includes('gem')) {
    const existingCoins = schema.entities.filter((e: any) => e.type === 'coin').length;
    for (let i = 0; i < 4; i++) {
      const cx = 200 + (existingCoins * 40) + (i * 90);
      const cy = 250 - (i % 2 === 0 ? 0 : 40);
      schema.entities.push({
        id: `coin-${uuidv4().slice(0, 4)}`,
        name: `Coin ${existingCoins + i + 1}`,
        type: 'coin',
        isVisible: true,
        isLocked: false,
        tags: ['collectible'],
        transform: { x: cx, y: cy, width: 20, height: 20, rotation: 0, scale: 1 },
        physics: { enabled: true, isStatic: true },
        movement: { type: 'none' },
        appearance: { shape: 'circle', color: '#ffea00', glow: true, glowColor: '#ffea00', opacity: 1 },
      });
    }
  }

  if (p.includes('enemy') || p.includes('monster') || p.includes('patrol')) {
    const enemyCount = schema.entities.filter((e: any) => e.type === 'enemy').length;
    for (let i = 0; i < 2; i++) {
      const ex = 350 + (i * 180);
      schema.entities.push({
        id: `enemy-${uuidv4().slice(0, 4)}`,
        name: `Enemy ${enemyCount + i + 1}`,
        type: 'enemy',
        isVisible: true,
        isLocked: false,
        tags: ['enemy', 'hazard'],
        transform: { x: ex, y: 388, width: 32, height: 32, rotation: 0, scale: 1 },
        physics: { enabled: true, isStatic: false, gravity: 1 },
        movement: { type: 'horizontal', speed: 120, patrolDistance: 120 },
        appearance: { shape: 'rect', color: '#ff0055', glow: true, glowColor: '#ff0055', opacity: 1 },
      });
    }
  }

  if (p.includes('spike') || p.includes('trap') || p.includes('hazard')) {
    schema.entities.push({
      id: `spike-${uuidv4().slice(0, 4)}`,
      name: 'Spike Trap',
      type: 'spike',
      isVisible: true,
      isLocked: false,
      tags: ['hazard', 'spike'],
      transform: { x: 480, y: 404, width: 32, height: 16, rotation: 0, scale: 1 },
      physics: { enabled: true, isStatic: true },
      movement: { type: 'none' },
      appearance: { shape: 'rect', color: '#ff2a00', glow: true, glowColor: '#ff2a00', opacity: 1 },
    });
  }

  if (p.includes('platform') || p.includes('bridge') || p.includes('floating')) {
    schema.entities.push({
      id: `platform-${uuidv4().slice(0, 4)}`,
      name: 'Floating Platform',
      type: 'platform',
      isVisible: true,
      isLocked: false,
      tags: ['solid', 'platform'],
      transform: { x: 300, y: 280, width: 140, height: 20, rotation: 0, scale: 1 },
      physics: { enabled: true, isStatic: true },
      movement: { type: 'none' },
      appearance: { shape: 'rect', color: '#2a1b4e', strokeColor: schema.theme.accentColor, strokeWidth: 1, opacity: 1 },
    });
  }

  if (p.includes('goal') || p.includes('portal') || p.includes('finish')) {
    if (!schema.entities.some((e: any) => e.type === 'goal')) {
      schema.entities.push({
        id: `goal-${uuidv4().slice(0, 4)}`,
        name: 'Goal Portal',
        type: 'goal',
        isVisible: true,
        isLocked: false,
        tags: ['goal'],
        transform: { x: 720, y: 356, width: 32, height: 64, rotation: 0, scale: 1 },
        physics: { enabled: true, isStatic: true },
        movement: { type: 'none' },
        appearance: { shape: 'rect', color: '#00ffaa', glow: true, glowColor: '#00ffaa', opacity: 1 },
      });
    }
  }

  return schema;
}

function applyTheme(schema: any, themePalette: any) {
  schema.scene.backgroundColor = themePalette.backgroundColor;
  schema.theme = { ...schema.theme, backgroundColor: themePalette.backgroundColor, accentColor: themePalette.accentColor, particleColor: themePalette.accentColor };

  for (const ent of schema.entities) {
    if (ent.type === 'player') { ent.appearance.color = themePalette.playerColor; ent.appearance.glowColor = themePalette.playerColor; }
    else if (ent.type === 'coin') { ent.appearance.color = themePalette.collectableColor; ent.appearance.glowColor = themePalette.collectableColor; }
    else if (ent.type === 'enemy' || ent.type === 'spike') { ent.appearance.color = themePalette.obstacleColor; ent.appearance.glowColor = themePalette.obstacleColor; }
    else if (ent.type === 'platform') { ent.appearance.strokeColor = themePalette.accentColor; }
  }
}

// 1. POST /api/ai/generate - Generate fresh GameModelSchema from text prompt
aiRouter.post('/generate', (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required' });
    }

    const compiledSchema = patchV3Schema(prompt);
    return res.json({
      prompt,
      schema: compiledSchema,
      compilerNotes: 'Successfully generated v3 logic engine game schema from prompt.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/ai/patch-schema - Patch existing schema with text prompt
aiRouter.post('/patch-schema', (req: Request, res: Response) => {
  try {
    const { prompt, schema } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required' });
    }

    const patchedSchema = patchV3Schema(prompt, schema);
    return res.json({
      prompt,
      schema: patchedSchema,
      compilerNotes: 'Successfully applied AI prompt patch to v3 logic game schema.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/ai/remix - Modify existing schema using text prompt
aiRouter.post('/remix', (req: Request, res: Response) => {
  try {
    const { prompt, parentSchema } = req.body;
    if (!prompt || !parentSchema) {
      return res.status(400).json({ error: 'Prompt and parentSchema are required' });
    }

    const remixedSchema = patchV3Schema(prompt, parentSchema);
    return res.json({
      prompt,
      schema: remixedSchema,
      compilerNotes: 'Applied AI remix prompt modifications to v3 logic parent schema.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

