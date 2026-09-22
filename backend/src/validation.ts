export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function assert(value: unknown, message: string, status = 400): asserts value {
  if (!value) throw new HttpError(status, message);
}
export function text(value: unknown, name: string, max = 80) {
  assert(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `Invalid ${name}`);
  return value.trim();
}
export function validateSchema(schema: any) {
  assert(schema && typeof schema === 'object' && schema.version === 3, 'A version 3 game is required');
  // Bound size and numeric magnitude before allowing an untrusted schema into the engine.
  let nodes = 0;
  function visit(v: any, depth = 0) {
    assert(depth < 18 && ++nodes < 18000, 'Game is too complex');
    if (typeof v === 'number') assert(Number.isFinite(v) && Math.abs(v) <= 100000, 'Number out of range');
    if (typeof v === 'string') assert(v.length <= 2000, 'Text is too long');
    if (v && typeof v === 'object') for (const [k, item] of Object.entries(v)) {
      assert(!['__proto__', 'constructor', 'prototype'].includes(k), 'Invalid property');
      if(k==='glowRadius') assert(typeof item==='number' && item>=0 && item<=40,'Glow must be 0–40');
      if(k==='fontSize') assert(typeof item==='number' && item>=1 && item<=128,'Font size must be 1–128');
      visit(item, depth + 1);
    }
  }
  visit(schema);
  text(schema.title, 'title');
  assert(typeof schema.description === 'string' && schema.description.length <= 1000, 'Description is too long');
  assert(schema.scene && schema.physics && schema.theme && schema.logic, 'Incomplete game');
  assert(schema.scene.width >= 100 && schema.scene.width <= 10000 && schema.scene.height >= 100 && schema.scene.height <= 10000, 'Invalid scene size');
  assert(schema.scene.bounds && ['left','right','top','bottom'].every(k => Number.isFinite(schema.scene.bounds[k])), 'Invalid bounds');
  assert(typeof schema.scene.gridVisible === 'boolean' && schema.scene.gridSize >= 8 && schema.scene.gridSize <= 200, 'Grid size must be 8–200');
  assert(Number.isFinite(schema.physics.gravity) && schema.physics.gameSpeed >= 0.25 && schema.physics.gameSpeed <= 3, 'Invalid physics');
  assert(Array.isArray(schema.entities) && schema.entities.length > 0 && schema.entities.length <= 80, 'Use 1–80 objects');
  assert(schema.entities.every((e:any) => e && typeof e === 'object'), 'Invalid object');
  assert(new Set(schema.entities.map((e: any) => e.id)).size === schema.entities.length, 'Duplicate object IDs');
  assert(schema.entities.some((e: any) => e.type === 'player' && e.isVisible), 'Add a visible player');
  for (const e of schema.entities) {
    text(e.id, 'object ID', 100);
    assert(e.transform && e.physics && e.movement && e.appearance && Array.isArray(e.tags), 'Incomplete object');
    assert(['x','y','width','height'].every(k => Number.isFinite(e.transform[k])) && e.transform.width > 0 && e.transform.height > 0, 'Invalid object dimensions');
    assert(e.tags.length <= 12 && e.tags.every((t: any) => typeof t === 'string'), 'Invalid object tags');
  }
  for (const [key, max] of [['rules', 40], ['spawners', 8], ['variables', 20], ['inputBindings', 20]] as const)
    assert(Array.isArray(schema.logic[key]) && schema.logic[key].length <= max, `Too many ${key}`);
  for (const r of schema.logic.rules) {
    assert(r && r.event && Array.isArray(r.conditions) && r.conditions.length <= 10 && Array.isArray(r.actions) && r.actions.length <= 10, 'Invalid rule');
    text(r.id,'rule ID',100);
    assert(['game_start','key_pressed','key_released','key_held','input_pressed','input_held','input_released','collision_start','every_interval','after_delay','every_frame','variable_reached','out_of_bounds'].includes(r.event.type), 'Unsupported rule event');
    for(const condition of r.conditions) assert(condition && ['is_grounded','is_alive','entity_exists','variable_compare','game_state_is','has_tag','key_is_held'].includes(condition.type),'Invalid condition');
    for(const action of r.actions) {
      assert(action && ['move','jump','destroy','teleport','set_velocity','apply_force','start_spawner','stop_spawner','spawn_entity','set_variable','add_variable','subtract_variable','end_game','win_game','set_game_speed','add_score','remove_life','camera_shake','spawn_particles'].includes(action.type),'Unsupported action');
      for(const k of ['value','vx','vy','x','y']) assert(action[k] === undefined || typeof action[k] === 'number','Action values must be numbers');
    }
    assert(r.event.interval === undefined || r.event.interval >= 0.1, 'Timer interval must be at least 0.1 seconds');
    for (const a of r.actions) if (a.type === 'set_game_speed') assert(a.value >= 0.25 && a.value <= 3, 'Invalid game speed');
  }
  assert(new Set(schema.logic.rules.map((r:any)=>r.id)).size === schema.logic.rules.length,'Duplicate rule IDs');
  for(const binding of schema.logic.inputBindings) {
    assert(binding && Array.isArray(binding.keys) && binding.keys.length<=12 && binding.keys.every((key:any)=>typeof key==='string' && key.length<=24),'Invalid key bindings');
    text(binding.name,'input name',60);
  }
  for(const variable of schema.logic.variables) {
    assert(variable && ['number','boolean','string'].includes(variable.type) && typeof variable.defaultValue === variable.type,'Invalid variable default');
    text(variable.name,'variable name',60);
    if(['score','lives'].includes(variable.name)) assert(variable.type==='number' && variable.defaultValue>=0 && variable.defaultValue<=10000,'Invalid score or lives');
  }
  for (const s of schema.logic.spawners) {
    assert(s && s.spawnPosition && Array.isArray(s.entityTags) && s.entityTags.every((v:any)=>typeof v==='string') && s.interval >= 0.25 && s.maxActive >= 1 && s.maxActive <= 30, 'Spawners require an interval and a 1–30 active limit');
    text(s.id,'spawner ID',100);
    for(const axis of ['x','y']) assert(Number.isFinite(s.spawnPosition[axis]) || (s.spawnPosition[axis]==='random' && Number.isFinite(s.spawnPosition[axis+'Min']) && Number.isFinite(s.spawnPosition[axis+'Max'])),'Invalid spawn position');
  }
  if(schema.scoring) {
    assert(['none','reach_score','survive_time','reach_goal','collect_all'].includes(schema.scoring.winCondition),'Invalid win condition');
    if(['reach_score','survive_time'].includes(schema.scoring.winCondition)) assert(schema.scoring.targetValue>0,'Set a target score or time');
  }
  assert(['none','neon','arcade','chill'].includes(schema.soundtrack || 'none'), 'Unknown soundtrack');
  return schema;
}
