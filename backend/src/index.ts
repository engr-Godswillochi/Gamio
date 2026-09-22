import express from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool, query, initDb } from './db.js';
import { hash, passwordHash, passwordMatches, session, user, signIn, cookieToken } from './auth.js';
import { assert, HttpError, text, validateSchema } from './validation.js';
const app = express();
const port = Number(process.env.PORT || 3001);
const origin = process.env.PUBLIC_ORIGIN || 'http://localhost:' + port;
assert(process.env.NODE_ENV !== 'production' || /^https:\/\//.test(origin), 'Set PUBLIC_ORIGIN to your HTTPS domain');
const mediaRoot = resolve(process.env.MEDIA_DIR || '../.local/media');
const frontend = resolve(process.env.FRONTEND_DIST || '../frontend/dist');
const wrap = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security','max-age=31536000');
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
  if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
    const supplied = req.headers.origin;
    const allowed = [origin, ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173','http://127.0.0.1:5173'] : [])];
    if ((supplied && !allowed.includes(supplied)) || req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({error:'Request origin is not allowed'});
  }
  next();
});
const buckets = new Map<string,{n:number;until:number}>();
function limit(prefix: string, max: number, windowMs = 60000) {
  return (req: any,res: any,next: any) => {
    const key = prefix + ':' + req.ip;
    let b = buckets.get(key);
    if (!b || b.until < Date.now()) { b = {n:0,until:Date.now()+windowMs}; buckets.set(key,b); }
    if (++b.n > max) { res.set('Retry-After',String(Math.ceil((b.until-Date.now())/1000))); return res.status(429).json({error:'Too many requests. Please try again shortly.'}); }
    next();
  };
}
setInterval(() => { for (const [k,b] of buckets) if (b.until < Date.now()) buckets.delete(k); },60000).unref();
app.use('/api', limit('api', 240));
app.use(express.json({limit:'512kb'}));
app.use('/api', session);
app.get('/api/health', wrap(async (_req: any,res: any) => { await query('SELECT 1'); res.json({status:'ok',database:'postgresql'}); }));
app.get('/api/auth/me', (req,res) => res.json({user:(req as any).user || null}));
app.post('/api/auth/signup', limit('auth',12,3600000), wrap(async (req: any,res: any) => {
  const username = text(req.body.username,'username',24);
  assert(/^[a-zA-Z][a-zA-Z0-9_]{2,23}$/.test(username), 'Username must be 3–24 letters, numbers or underscores');
  const reserved=['gamio',...(process.env.ADMIN_USERNAMES||'').split(',')].map(n=>n.toLowerCase());
  assert(!reserved.includes(username.toLowerCase()),'That username is reserved',409);
  const password = text(req.body.password,'password',128);
  assert(password.length>=12, 'Use a password with at least 12 characters');
  const recovery = randomBytes(24).toString('hex');
  const result = await query('INSERT INTO users(username,email,password_hash,recovery_hash) VALUES($1,$2,$3,$4) RETURNING id,username',
    [username,username.toLowerCase()+'@account.gamio.invalid',await passwordHash(password),hash(recovery)]);
  await signIn(res,result.rows[0].id);
  res.status(201).json({user:result.rows[0],recoveryCode:recovery});
}));
app.post('/api/auth/login',limit('login',20,900000),wrap(async(req: any,res: any)=>{
  const username=text(req.body.username,'username',24), password=text(req.body.password,'password',128);
  const result=await query('SELECT * FROM users WHERE lower(username)=lower($1)',[username]);
  const account=result.rows[0];
  const valid=await passwordMatches(password,account?.password_hash || ('0'.repeat(32)+':'+ '0'.repeat(128)));
  assert(account&&valid,'Incorrect username or password',401);
  await signIn(res,account.id); res.json({user:{id:account.id,username:account.username}});
}));
app.post('/api/auth/logout',wrap(async(req: any,res: any)=>{ if(cookieToken(req)) await query('DELETE FROM sessions WHERE token_hash=$1',[hash(cookieToken(req)!)]); res.clearCookie('gamio_session',{path:'/'}); res.json({ok:true}); }));
app.post('/api/auth/recover',limit('recover',10,3600000),wrap(async(req: any,res: any)=>{
  const username=text(req.body.username,'username',24), code=text(req.body.recoveryCode,'recovery code',64), password=text(req.body.password,'password',128);
  assert(password.length>=12,'Use at least 12 characters');
  const nextCode=randomBytes(24).toString('hex');
  const result=await query('UPDATE users SET password_hash=$1,recovery_hash=$2 WHERE lower(username)=lower($3) AND recovery_hash=$4 RETURNING id',
    [await passwordHash(password),hash(nextCode),username,hash(code)]);
  assert(result.rowCount,'Incorrect username or recovery code',401);
  await query('DELETE FROM sessions WHERE user_id=$1',[result.rows[0].id]);
  res.json({recoveryCode:nextCode});
}));
app.post('/api/auth/password',limit('password',10,3600000),wrap(async(req:any,res:any)=>{
  const u=user(req), current=text(req.body.currentPassword,'current password',128), next=text(req.body.password,'new password',128);
  assert(next.length>=12,'Use at least 12 characters');
  const account=(await query('SELECT password_hash FROM users WHERE id=$1',[u.id])).rows[0];
  assert(await passwordMatches(current,account.password_hash),'Incorrect password',401);
  await query('UPDATE users SET password_hash=$1 WHERE id=$2',[await passwordHash(next),u.id]);
  await query('DELETE FROM sessions WHERE user_id=$1',[u.id]);
  await signIn(res,u.id);res.json({ok:true});
}));
async function game(key: string, req: any, ownerOnly=false) {
  const result=await query('SELECT g.*,u.username AS creator FROM games g LEFT JOIN users u ON g.creator_id=u.id WHERE g.id::text=$1 OR g.slug=$1',[key]);
  const g=result.rows[0];
  assert(g && !g.hidden && (g.is_published || g.creator_id === req.user?.id),'Game not found',404);
  if(ownerOnly) assert(g.creator_id===user(req).id,'Only the creator can edit this game',403);
  return g;
}
app.get(['/api/games','/api/feed'],wrap(async(req: any,res: any)=>{
  const sort=String(req.query.sort||'trending'), category=String(req.query.template||'all'), search=String(req.query.q||'').slice(0,80);
  const orders:Record<string,string>={newest:'g.created_at DESC',played:'g.play_count DESC',remixed:'g.remix_count DESC',trending:'(g.play_count + 5*g.remix_count) / power(1 + extract(epoch from (now()-g.created_at))/86400,0.6) DESC'};
  const offset=Math.min(10000,Math.max(0,Number(req.query.offset)||0));
  const result=await query(`SELECT g.*,u.username AS creator FROM games g LEFT JOIN users u ON u.id=g.creator_id
    WHERE g.is_published AND NOT g.hidden AND ($1='all' OR g.template=$1) AND g.title ILIKE $2 ORDER BY ${orders[sort]||orders.trending},g.id LIMIT 30 OFFSET $3`,
    [category,'%'+search+'%',offset]);
  res.json({games:result.rows,hasMore:result.rows.length===30});
}));
app.get('/api/dashboard',wrap(async(req: any,res: any)=>{ const u=user(req); res.json({games:(await query('SELECT * FROM games WHERE creator_id=$1 ORDER BY updated_at DESC LIMIT 200',[u.id])).rows}); }));
app.post('/api/games',limit('create',30,3600000),wrap(async(req: any,res: any)=>{
  const u=user(req), schema=validateSchema(req.body.schema);
  const id=randomUUID(), title=text(schema.title,'title'), slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-'+id.slice(0,8);
  assert(!req.body.remixOfId,'Use the remix endpoint to preserve attribution');
  const clean={...schema,id,slug,creationPath:'manual',remixOfId:null}; delete clean._existingId; delete clean._revision; delete clean._published;
  const template=['runner','dodge','platformer'].includes(req.body.template)?req.body.template:'custom';
  const result=await query('INSERT INTO games(id,creator_id,title,slug,template,schema,is_published) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [id,u.id,title,slug,template,clean,req.body.isPublished===true]);
  res.status(201).json(result.rows[0]);
}));
app.get('/api/games/:key',wrap(async(req: any,res: any)=>res.json(await game(req.params.key,req))));
app.put('/api/games/:key',wrap(async(req: any,res: any)=>{
  const g=await game(req.params.key,req,true), schema=validateSchema(req.body.schema);
  assert(req.body.revision===g.revision,'This game changed in another tab. Reload before saving.',409);
  const clean={...schema,id:g.id,slug:g.slug,creationPath:'manual',remixOfId:g.remix_of_id}; delete clean._existingId; delete clean._revision; delete clean._published;
  const result=await query('UPDATE games SET title=$1,schema=$2,is_published=$3,revision=revision+1,updated_at=now() WHERE id=$4 AND revision=$5 RETURNING *',
    [text(clean.title,'title'),clean,req.body.isPublished===undefined?g.is_published:req.body.isPublished===true,g.id,g.revision]);
  assert(result.rowCount,'Another save completed first. Reload this game.',409);
  res.json(result.rows[0]);
}));
app.post('/api/remix/:key',limit('create',30,3600000),wrap(async(req: any,res: any)=>{
  const u=user(req), parent=await game(req.params.key,req);
  assert(parent.is_published,'Publish the original before remixing');
  const id=randomUUID(), title=(parent.title.slice(0,65)+' · Remix'),slug='remix-'+id.slice(0,12);
  const schema={...parent.schema,id,title,slug,remixOfId:parent.id};
  validateSchema(schema);
  const result=await query("INSERT INTO games(id,creator_id,title,slug,template,schema,remix_of_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",[id,u.id,title,slug,parent.template,schema,parent.id]);
  res.status(201).json(result.rows[0]);
}));
app.get('/api/remix/tree/:key',wrap(async(req: any,res: any)=>{
  const g=await game(req.params.key,req);
  const published='is_published AND NOT hidden';
  res.json({current:g,parent:g.remix_of_id?(await query('SELECT id,title,slug FROM games WHERE id=$1 AND '+published,[g.remix_of_id])).rows[0]||null:null,
    children:(await query('SELECT id,title,slug,play_count FROM games WHERE remix_of_id=$1 AND '+published+' ORDER BY created_at DESC LIMIT 30',[g.id])).rows});
}));
app.get('/api/u/:username',wrap(async(req: any,res: any)=>{
  const account=(await query('SELECT id,username,created_at FROM users WHERE lower(username)=lower($1)',[req.params.username])).rows[0];
  assert(account,'Player not found',404);
  res.json({...account,createdGames:(await query('SELECT id,title,slug,template,play_count,remix_count,schema FROM games WHERE creator_id=$1 AND is_published AND NOT hidden ORDER BY created_at DESC LIMIT 100',[account.id])).rows,
    recentScores:(await query('SELECT g.title,g.slug,MAX(s.value) AS value FROM scores s JOIN games g ON g.id=s.game_id WHERE s.user_id=$1 AND s.revision=g.revision AND g.is_published AND NOT g.hidden GROUP BY g.id ORDER BY value DESC LIMIT 20',[account.id])).rows});
}));
app.post('/api/runs',limit('runs',40),wrap(async(req: any,res: any)=>{
  const g=await game(text(req.body.gameId,'game',100),req);
  assert(g.is_published,'Publish a game before recording a ranked run');
  validateSchema(g.schema);
  const token=randomBytes(32).toString('hex'),seed=randomBytes(12).toString('hex');
  const row=(await query('INSERT INTO runs(game_id,user_id,rng_seed,schema_snapshot,revision,token_hash) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[g.id,req.user?.id||null,seed,g.schema,g.revision,hash(token)])).rows[0];
  res.status(201).json({id:row.id,token,rngSeed:seed,schema:g.schema});
}));
let verifying=0;
function verify(schema:any,payload:any):Promise<any> {
  assert(verifying<2,'Score verifier is busy; retry in a moment',429); verifying++;
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./verifyWorker.js',import.meta.url),{workerData:{schema,payload},resourceLimits:{maxOldGenerationSizeMb:96}});
    const timeout=setTimeout(()=>{worker.terminate();reject(new HttpError(422,'Game simulation exceeded its time budget'));},4000);
    worker.once('message',v=>{clearTimeout(timeout);worker.terminate();v.error?reject(new HttpError(422,v.error)):resolve(v);});
    worker.once('error',e=>{clearTimeout(timeout);reject(e);});
  }).finally(()=>{verifying--;});
}
app.post('/api/runs/:id/finish',limit('finish',30),wrap(async(req:any,res:any)=>{
  const r=(await query("SELECT * FROM runs WHERE id::text=$1 AND created_at>now()-interval '1 hour'",[req.params.id])).rows[0];
  assert(r && hash(String(req.body.token))===r.token_hash,'Run not found',404);
  assert(!r.completed,'Run already submitted',409);
  const {inputLog,ticks}=req.body;
  assert(Number.isInteger(ticks)&&ticks>=1&&ticks<=7200,'A run must be at most 120 seconds');
  assert(Date.now()-new Date(r.created_at).getTime()>=ticks*1000/60-2000,'Run is faster than real time');
  assert(Array.isArray(inputLog)&&inputLog.length<=ticks,'Invalid replay input');
  let previous=-1;
  for(const event of inputLog) {
    assert(Number.isInteger(event.tick)&&event.tick>previous&&event.tick<ticks&&Array.isArray(event.keys)&&event.keys.length<=12&&event.keys.every((k:any)=>typeof k==='string'&&/^(Key[A-Z]|Arrow(Up|Down|Left|Right)|Space|Enter|Digit[0-9])$/.test(k)),'Invalid input event');
    previous=event.tick;
  }
  const result=await verify(r.schema_snapshot,{rngSeed:r.rng_seed,inputLog,ticks,gameId:r.game_id,durationMs:Math.round(ticks*1000/60)});
  assert(result.terminal&&result.ticks===ticks&&Number.isSafeInteger(result.score)&&result.score>=0&&result.score<=100000000,'Replay did not reach a valid game ending',422);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const claimed=await client.query('UPDATE runs SET completed=true WHERE id=$1 AND completed=false RETURNING id',[r.id]);
    assert(claimed.rowCount,'Run already submitted',409);
    const replayId=randomUUID(),shareToken=randomBytes(32).toString('hex');
    await client.query('INSERT INTO replays(id,game_id,user_id,rng_seed,input_log,duration_ms,schema_snapshot,ticks,score,revision,share_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [replayId,r.game_id,r.user_id,r.rng_seed,JSON.stringify(inputLog),Math.round(ticks*1000/60),r.schema_snapshot,ticks,result.score,r.revision,hash(shareToken)]);
    if(r.user_id) await client.query("INSERT INTO scores(game_id,user_id,username,value,metric_type,replay_id,revision) SELECT $1,id,username,$2,'score',$3,$4 FROM users WHERE id=$5",[r.game_id,result.score,replayId,r.revision,r.user_id]);
    await client.query('UPDATE games SET play_count=play_count+1 WHERE id=$1',[r.game_id]);
    await client.query('COMMIT');
    res.status(201).json({replayId,shareToken,score:result.score,ranked:!!r.user_id});
  } catch(e){await client.query('ROLLBACK');throw e;} finally{client.release();}
}));
app.get('/api/leaderboards/:key',wrap(async(req:any,res:any)=>{
  const g=await game(req.params.key,req);
  res.json({game:g,scores:(await query('SELECT u.username,MAX(s.value) AS value FROM scores s JOIN users u ON u.id=s.user_id WHERE s.game_id=$1 AND s.revision=$2 GROUP BY u.id ORDER BY value DESC,u.username LIMIT 50',[g.id,g.revision])).rows});
}));
app.post('/api/clips',wrap(async(req:any,res:any)=>{
  const r=(await query('SELECT * FROM replays WHERE id::text=$1',[req.body.replayId])).rows[0];
  assert(r&&(r.user_id===req.user?.id||hash(String(req.body.shareToken))===r.share_hash),'Replay not found',404);
  await game(r.game_id,req);
  const c=(await query('INSERT INTO clips(replay_id) VALUES($1) ON CONFLICT(replay_id) DO UPDATE SET replay_id=excluded.replay_id RETURNING *',[r.id])).rows[0];
  res.status(201).json(c);
}));
app.get('/api/clips/:id',wrap(async(req:any,res:any)=>{
  const row=(await query('SELECT c.*,r.game_id,r.rng_seed,r.input_log,r.duration_ms,r.ticks,r.score,r.schema_snapshot,g.slug,g.title FROM clips c JOIN replays r ON r.id=c.replay_id JOIN games g ON g.id=r.game_id WHERE c.id::text=$1 AND g.is_published AND NOT g.hidden',[req.params.id])).rows[0];
  assert(row,'Clip not found',404); res.json(row);
}));
app.put('/api/clips/:id/video',limit('video',8,3600000),express.raw({type:['video/webm','video/mp4'],limit:'25mb'}),wrap(async(req:any,res:any)=>{
  const row=(await query('SELECT c.*,r.share_hash,r.user_id FROM clips c JOIN replays r ON r.id=c.replay_id WHERE c.id::text=$1',[req.params.id])).rows[0];
  assert(row&&(row.user_id===req.user?.id||hash(String(req.headers['x-share-token']))===row.share_hash),'Clip not found',404);
  assert(Buffer.isBuffer(req.body)&&req.body.length>16,'A video file is required');
  const mp4=req.is('video/mp4');
  assert(mp4?req.body.subarray(4,8).toString()==='ftyp':req.body.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])),'Invalid video');
  const path=row.id+(mp4?'.mp4':'.webm');
  await writeFile(resolve(mediaRoot,path),req.body,{flag:'w'});
  await query("UPDATE clips SET video_url=$1,render_status='ready' WHERE id=$2",['/media/'+path,row.id]);
  res.json({videoUrl:'/media/'+path});
}));
app.get('/media/:file',wrap(async(req:any,res:any)=>{
  assert(/^[a-f0-9-]{36}\.(webm|mp4)$/.test(req.params.file),'Not found',404);
  const row=(await query('SELECT c.id FROM clips c JOIN replays r ON r.id=c.replay_id JOIN games g ON g.id=r.game_id WHERE c.video_url=$1 AND g.is_published AND NOT g.hidden',['/media/'+req.params.file])).rows[0];
  assert(row,'Clip not found',404); res.sendFile(resolve(mediaRoot,req.params.file));
}));
app.post('/api/reports',limit('reports',10,3600000),wrap(async(req:any,res:any)=>{
  const u=user(req),g=await game(text(req.body.gameId,'game',100),req),reason=text(req.body.reason,'reason',1000);
  await query("INSERT INTO reports(game_id,reporter_id,reason) VALUES($1,$2,$3) ON CONFLICT(game_id,reporter_id) DO UPDATE SET reason=excluded.reason,status='open'",[g.id,u.id,reason]);
  res.status(201).json({ok:true});
}));
function admin(req:any){assert((process.env.ADMIN_USERNAMES||'').split(',').includes(user(req).username),'Admin access required',403);}
app.get('/api/admin/reports',wrap(async(req:any,res:any)=>{admin(req);res.json({reports:(await query("SELECT r.*,g.title,g.slug FROM reports r JOIN games g ON g.id=r.game_id WHERE r.status='open' ORDER BY r.created_at LIMIT 100")).rows});}));
app.post('/api/admin/reports/:id',wrap(async(req:any,res:any)=>{
  admin(req);assert(['hide','dismiss'].includes(req.body.action),'Invalid review action');
  const r=(await query("UPDATE reports SET status=$1 WHERE id::text=$2 RETURNING game_id",[req.body.action,req.params.id])).rows[0];assert(r,'Report not found',404);
  if(req.body.action==='hide') await query('UPDATE games SET hidden=true WHERE id=$1',[r.game_id]);res.json({ok:true});
}));
app.use('/api',(_req,res)=>res.status(404).json({error:'Endpoint not found'}));
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
app.use(express.static(frontend,{index:false}));
app.get('*',wrap(async(req:any,res:any)=>{
  let title='Gamio — Play. Beat. Remix.',description='Create a little game. Start a big rivalry.',video='';
  if(req.path.startsWith('/game/')){
    const g=(await query('SELECT title,schema FROM games WHERE slug=$1 AND is_published AND NOT hidden',[req.path.split('/')[2]])).rows[0];
    if(g){title=g.title+' · Gamio';description=g.schema.description||description;}else res.status(404);
  }
  if(req.path.startsWith('/clip/')){
    const c=(await query('SELECT c.video_url,g.title,r.score FROM clips c JOIN replays r ON r.id=c.replay_id JOIN games g ON g.id=r.game_id WHERE c.id::text=$1 AND g.is_published AND NOT g.hidden',[req.path.split('/')[2]])).rows[0];
    if(c){title=c.title+' — Beat my '+c.score+'!';video=c.video_url?origin+c.video_url:'';}else res.status(404);
  }
  const html=await readFile(resolve(frontend,'index.html'),'utf8');
  const meta=`<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(origin+req.path)}"><meta property="og:type" content="${video?'video.other':'website'}">${video?`<meta property="og:video" content="${escapeHtml(video)}"><meta property="og:video:type" content="${video.endsWith('.mp4')?'video/mp4':'video/webm'}"><meta property="og:video:width" content="800"><meta property="og:video:height" content="450">`:''}`;
  res.type('html').send(html.replace(/<title>.*?<\/title>/s,'<title>'+escapeHtml(title)+'</title>').replace('</head>',meta+'</head>'));
}));
app.use((err:any,_req:any,res:any,_next:any)=>{
  const status=err instanceof HttpError?err.status:err.code==='23505'?409:err.type==='entity.too.large'?413:err.type==='entity.parse.failed'?400:500;
  if(status===500) console.error(err);
  res.status(status).json({error:status===500?'Something went wrong. Please try again.':err.code==='23505'?'That username is already taken':status===413?'Upload is too large':status===400&&err.type?'Invalid JSON':err.message});
});
await initDb();
await mkdir(mediaRoot,{recursive:true});
// Published remix counts exclude private drafts.
await query('UPDATE games g SET remix_count=(SELECT count(*) FROM games child WHERE child.remix_of_id=g.id AND child.is_published AND NOT child.hidden)');
setInterval(()=>{query("DELETE FROM sessions WHERE expires_at<now(); DELETE FROM runs WHERE created_at<now()-interval '1 day'; UPDATE games g SET remix_count=(SELECT count(*) FROM games child WHERE child.remix_of_id=g.id AND child.is_published AND NOT child.hidden)").catch(console.error);},60000).unref();
const server=app.listen(port,process.env.HOST || '127.0.0.1',()=>console.log('Gamio listening on '+origin));
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{server.close(()=>{pool.end().then(()=>process.exit(0));});});
