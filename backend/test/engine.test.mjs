import test from 'node:test';
import assert from 'node:assert/strict';
import { EntityEngine } from '../dist/frontend/src/engine/entityEngine.js';
import { createRunnerTemplate, createDodgeTemplate } from '../dist/frontend/src/types/gameModel.js';
import { validateSchema } from '../dist/backend/src/validation.js';
const canvas={width:800,height:450,getContext:()=>({})};
function simulate(schema,log=[],ticks=7200,seed='test-seed'){
  return new EntityEngine(canvas,schema,seed,{},true).simulate({rngSeed:seed,inputLog:log,ticks,gameId:schema.id,durationMs:ticks*1000/60});
}
test('runner moves, reaches a terminal state and reproduces exactly',()=>{
 const schema=createRunnerTemplate();validateSchema(schema);
 const a=simulate(schema),b=simulate(schema);
 assert.deepEqual(a,b);assert.equal(a.terminal,true);assert.ok(a.ticks>60);assert.ok(a.score>0);
});
test('top-down movement releases cleanly and fixed ticks reproduce input',()=>{
 const schema=createDodgeTemplate();schema.entities=schema.entities.filter(e=>e.type!=='enemy');
 schema.scoring.winCondition='survive_time';schema.scoring.targetValue=3000;
 const log=[{tick:0,keys:['ArrowLeft']},{tick:30,keys:[]},{tick:60,keys:['ArrowUp']},{tick:90,keys:[]}];
 assert.deepEqual(simulate(schema,log),simulate(schema,log));
 const engine=new EntityEngine(canvas,schema,'x',{},true);engine.simulate({rngSeed:'x',inputLog:log,ticks:150});
 assert.equal(engine.runtimeEntities.find(e=>e.type==='player').vx,0);
});
test('bad schemas cannot freeze rendering or overload simulation',()=>{
 for(const change of [s=>s.scene.gridSize=0,s=>s.entities=[],s=>s.logic.rules=Array(41).fill(s.logic.rules[0]),s=>s.physics.gameSpeed=0,s=>s.soundtrack='remote-url']){
   const schema=createRunnerTemplate();change(schema);assert.throws(()=>validateSchema(schema));
 }
});
test('factories do not share mutable world bounds',()=>{
 createRunnerTemplate();assert.equal(createDodgeTemplate().scene.bounds.right,800);
});
test('live runs at 30Hz and 144Hz produce the same server-verifiable replay',()=>{
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 function live(hz){
  let replay,score;
  const engine=new EntityEngine(canvas,createRunnerTemplate(),'frame-rate-seed',{onGameOver:(s,r)=>{score=s;replay=r;}},true);
  engine.startPlay();const start=engine.lastTs;
  for(let i=1;engine.state==='playing'&&i<20000;i++)engine.loop(start+i*1000/hz);
  assert(replay);const verified=simulate(engine.schema,replay.inputLog,replay.ticks,replay.rngSeed);
  assert.equal(verified.ticks,replay.ticks);assert.equal(verified.score,score);assert(verified.terminal);
  return {ticks:replay.ticks,score};
 }
 assert.deepEqual(live(30),live(144));
});
test('the two-minute limit produces exactly 7200 ticks, not an extra tick',()=>{
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 const schema=createDodgeTemplate();schema.entities=schema.entities.filter(e=>e.type!=='enemy');
 let replay;
 const engine=new EntityEngine(canvas,schema,'maximum-run',{onGameOver:(_s,r)=>replay=r},true);
 engine.startPlay();const start=engine.lastTs;
 for(let i=1;engine.state==='playing'&&i<8000;i++)engine.loop(start+i*1000/60);
 assert.equal(replay.ticks,7200);assert.equal(simulate(schema,replay.inputLog,replay.ticks,replay.rngSeed).ticks,7200);
});
test('sustained contact only fires collision-start damage once',()=>{
 const schema=createDodgeTemplate();
 const player=schema.entities.find(e=>e.type==='player'),enemy=schema.entities.find(e=>e.type==='enemy');
 enemy.transform.x=player.transform.x;enemy.transform.y=player.transform.y;enemy.movement={};
 schema.entities=schema.entities.filter(e=>e===player||e===enemy);
 const engine=new EntityEngine(canvas,schema,'collision',{},true);
 engine.simulate({rngSeed:'collision',inputLog:[],ticks:120});
 assert.equal(engine.logicRuntime.variables.getNumber('lives'),2);
});
test('destroying lasers at solid edges keeps their bounded spawner active',()=>{
 const schema=createDodgeTemplate();
 schema.entities=schema.entities.filter(e=>e.type!=='enemy'&&e.type!=='coin');
 schema.logic.rules=[{id:'cleanup',name:'Laser cleanup',enabled:true,
  event:{type:'collision_start',subjectRef:{mode:'tag',tag:'hazard'},objectRef:{mode:'tag',tag:'solid'}},
  conditions:[],actions:[{type:'destroy',entityRef:{mode:'self'}}]}];
 schema.logic.spawners=[{id:'lasers',name:'Lasers',entityType:'enemy',entityTags:['hazard'],
  interval:0.7,spawnPosition:{x:100,y:18},initialVelocity:{vx:0,vy:185},maxActive:16,autoStart:true}];
 schema.scoring.winCondition='survive_time';schema.scoring.targetValue=45000;
 const engine=new EntityEngine(canvas,schema,'lasers',{},true);
 let spawned=0;const spawn=engine.spawnFromTemplate.bind(engine);
 engine.spawnFromTemplate=(...args)=>{spawned++;return spawn(...args);};
 const result=engine.simulate({rngSeed:'lasers',inputLog:[],ticks:2700});
 assert.equal(result.ticks,2700);assert.ok(spawned>=60,`Only ${spawned} lasers spawned`);
 assert.ok(engine.runtimeEntities.filter(e=>e.alive&&e.tags.includes('hazard')).length<16);
});
