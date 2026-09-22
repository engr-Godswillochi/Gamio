import { randomBytes, randomUUID } from 'node:crypto';
import { initDb, pool, query } from './db.js';
import { passwordHash } from './auth.js';
import { createRunnerTemplate, createDodgeTemplate, createPlatformerTemplate, generateLogicRuleId } from '../../frontend/src/types/gameModel.js';
await initDb();
const username='gamio';
let account=(await query('SELECT id FROM users WHERE username=$1',[username])).rows[0];
if(!account)account=(await query('INSERT INTO users(username,email,password_hash) VALUES($1,$2,$3) RETURNING id',[username,'seed@gamio.invalid',await passwordHash(randomBytes(48).toString('hex'))])).rows[0];
const runner=createRunnerTemplate();runner.title='Neon Dash Runner';runner.description='A sunset sprint through ten neon hazards. Tap Jump just before each spike, collect sparks, and reach the finish.';
runner.soundtrack='neon';
const dodge=createDodgeTemplate();dodge.title='Pulse Heist';dodge.description='45 seconds. Five golden signals. A storm of falling lasers. Move with arrows or WASD; collect signals for 100 points each and survive for a time bonus.';
dodge.soundtrack='arcade';
dodge.entities=dodge.entities.filter(e=>e.type!=='enemy');
dodge.entities.filter(e=>e.type==='coin').forEach(e=>{e.appearance.color='#ffd376';e.appearance.glow=true;e.appearance.glowColor='#ffd376';});
dodge.theme.accentColor='#c1fc67';dodge.theme.hudColor='#c1fc67';
dodge.scene.backgroundColor='#101526';
dodge.logic.rules.find(r=>r.name==='Collect Coin')!.actions.find(a=>a.type==='add_score')!.value=100;
dodge.logic.rules.find(r=>r.name==='Hazard Damage')!.actions.push({type:'destroy',entityRef:{mode:'other'}});
dodge.logic.rules.push({id:generateLogicRuleId(),name:'Lasers dissolve at the arena edge',enabled:true,
 event:{type:'collision_start',subjectRef:{mode:'tag',tag:'hazard'},objectRef:{mode:'tag',tag:'solid'}},
 conditions:[],actions:[{type:'destroy',entityRef:{mode:'self'}}]});
dodge.logic.spawners=[{id:'falling-lasers',name:'Laser rain',entityType:'enemy',entityTags:['hazard'],entityAppearance:{shape:'rect',color:'#ff638f',glow:true,glowColor:'#ff638f'},interval:0.7,spawnPosition:{x:'random',xMin:30,xMax:740,y:18},initialVelocity:{vx:0,vy:185},maxActive:16,autoStart:true}];
dodge.logic.rules.push({id:generateLogicRuleId(),name:'Survival bonus',enabled:true,event:{type:'every_interval',interval:1},conditions:[],actions:[{type:'add_score',value:5}]});
dodge.scoring!.winCondition='survive_time';dodge.scoring!.targetValue=45000;
const platformer=createPlatformerTemplate();platformer.title='Cloudstep';platformer.description='Climb a pocket-sized sky. Collect every coin on the way to the green portal. Arrow keys move; Space jumps.';
platformer.soundtrack='chill';platformer.theme.accentColor='#b1b4ff';platformer.scene.backgroundColor='#18182f';
for(const [schema,slug,template] of [[runner,'neon-dash-runner','runner'],[dodge,'pulse-heist','dodge'],[platformer,'cloudstep','platformer']] as const){
 schema.id=randomUUID();schema.slug=slug;
 const existing=(await query('SELECT id,creator_id FROM games WHERE slug=$1',[slug])).rows[0];
 if(existing && process.argv.includes('--refresh') && existing.creator_id===account.id){
   schema.id=existing.id;
   await query('UPDATE games SET schema=$1,title=$2,revision=revision+1,updated_at=now() WHERE id=$3',[schema,schema.title,existing.id]);
 }else{
   await query('INSERT INTO games(id,creator_id,title,slug,template,schema,is_published) VALUES($1,$2,$3,$4,$5,$6,true) ON CONFLICT(slug) DO NOTHING',[schema.id,account.id,schema.title,slug,template,schema]);
 }
}
console.log(process.argv.includes('--refresh')?'Refreshed system-owned starter games. User-created games preserved.':'Seeded starter games. Existing games preserved.');
await pool.end();
