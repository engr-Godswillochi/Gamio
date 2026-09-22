import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import { api, post, navigate, safeNext, shareLink } from './lib/client';
import EditorWorkspace from './components/editor/EditorWorkspace';
import { createRunnerTemplate, createDodgeTemplate, createPlatformerTemplate } from './types/gameModel';
import { EntityEngine } from './engine/entityEngine';
import { Soundtrack } from './engine/soundtrack';
import { renderClip } from './engine/renderClip';
import './platform.css';

const Account = createContext(null);
export function Link({to,children,...props}) {
  return <a href={to} {...props} onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){e.preventDefault();navigate(to);}}}>{children}</a>;
}
function useLoad(path, version=0) {
  const [state,set]=useState({data:null,error:'',loading:true});
  useEffect(()=>{let active=true;set({data:null,error:'',loading:true});
    api(path).then(data=>active&&set({data,error:'',loading:false})).catch(e=>active&&set({data:null,error:e.message,loading:false}));
    return()=>{active=false;};
  },[path,version]); return state;
}
function Notice({children}) { return children?<p className="notice" role="status">{children}</p>:null; }
function Loading({state,children}) {
  if(state.loading)return <div className="empty" role="status">Loading the good stuff…</div>;
  if(state.error)return <div className="empty"><h2>We couldn’t load this page.</h2><Notice>{state.error}</Notice><button onClick={()=>location.reload()}>Try again</button> <Link to="/discover">Back to the arcade</Link></div>;
  return children(state.data);
}
function Header() {
  const {user,setUser}=useContext(Account);
  return <header className="site-header"><Link className="brand" to="/">g<span>▲</span>mio<span className="brand-dot">.</span></Link><nav aria-label="Main navigation">
    <Link to="/discover">Arcade</Link><Link to="/create">Create</Link><Link to="/dashboard">My games</Link>{user&&<Link to="/settings">Settings</Link>}
    {user?<><Link to={'/u/'+user.username} className="account-link">@{user.username}</Link><button className="quiet" onClick={async()=>{try{await post('/auth/logout',{});setUser(null);navigate('/');}catch(e){alert(e.message);}}}>Log out</button></>:<Link className="button small" to="/login">Sign in</Link>}
  </nav></header>;
}
function Footer(){return <footer className="site-footer"><Link className="brand" to="/">gamio.</Link><span>Small games. Big rivalries.</span><Link to="/community">Community & privacy</Link></footer>;}
function Cards({games,editable=false,onUnpublish}){
  if(!games.length)return <div className="empty"><h2>Be the first to make a little chaos.</h2><p>No games here yet.</p><Link className="button" to="/create">Create a game</Link></div>;
  return <div className="game-grid">{games.map((g,i)=><article className="game-card" key={g.id}>
    <Link className="game-art" style={{'--card-accent':g.schema?.theme?.accentColor||'#a78bfa','--card-bg':g.schema?.scene?.backgroundColor||'#121321'}} to={editable?'/create/'+g.id+'/edit':'/game/'+g.slug} aria-label={g.title}>
      <span className="card-category">{g.template} {g.remix_of_id?'↳ remix':''}</span><div className={'pixel-scene scene-'+i%3}><i/><i/><i/><b>✦</b></div><span className="card-play">{editable?'EDIT ↗':'PLAY ↗'}</span>
    </Link><div className="card-body"><Link to={editable?'/create/'+g.id+'/edit':'/game/'+g.slug}><h3>{g.title}</h3></Link>
      <div className="card-meta">{g.creator?<Link to={'/u/'+g.creator}>@{g.creator}</Link>:<span>{g.hidden?'Under review':g.is_published?'Published':'Draft'}</span>}<span>{g.play_count} plays · {g.remix_count} remixes</span></div>
      {editable&&g.is_published&&<Link className="text-link" to={'/game/'+g.slug}>Open published game →</Link>}
      {editable&&g.is_published&&onUnpublish&&<button className="quiet" onClick={()=>onUnpublish(g)}>Unpublish</button>}
    </div></article>)}</div>;
}
function Home(){
 const state=useLoad('/feed?sort=trending');
 return <><section className="hero-platform"><div><span className="eyebrow">THE ARCADE IS YOURS</span><h1>Make a game.<br/>Make a <em>rival.</em></h1><p>That “one more try” feeling? Create it. Play tiny games, challenge your friends, and remix their rules.</p><div className="actions"><Link className="button" to="/discover">Find your next obsession ↗</Link><Link className="button secondary" to="/create">Make something playable</Link></div><div className="loop-label">PLAY <span>→</span> BEAT <span>→</span> SHARE <span>→</span> REMIX <span>↻</span></div></div>
 <Link to="/game/neon-dash-runner" className="hero-game" aria-label="Play Neon Dash Runner"><div className="hero-game-top"><span>FEATURED / 01</span><span>⚡ QUICK PLAY</span></div><div className="neon-scene"><span className="sun"/><span className="hero-avatar"/><span className="hero-hazard"/><span className="hero-coin">✦</span><span className="hero-ground"/></div><div className="hero-game-bottom"><div><small>JUMP. COLLECT. REPEAT.</small><h2>Neon Dash Runner</h2></div><span className="round-arrow">↗</span></div></Link></section>
 <section className="page-section"><div className="section-title"><div><span className="eyebrow">YOUR NEXT “ONE MORE”</span><h2>Fresh from the arcade</h2></div><Link to="/discover">Explore all games ↗</Link></div><Loading state={state}>{d=><Cards games={d.games.slice(0,6)}/>}</Loading></section>
 <section className="how-grid"><div><span>01 / PLAY</span><h3>Find your rhythm.</h3><p>No installation. No account needed to play. Just a good game and one more attempt.</p></div><div><span>02 / CHALLENGE</span><h3>Make it personal.</h3><p>Share your score or a gameplay clip. Your friends land right where the rivalry starts.</p></div><div><span>03 / REMIX</span><h3>Change the rules.</h3><p>New colors. Different obstacles. Your own soundtrack. Give a great game a second life.</p></div></section></>;
}
function Discover(){
 const params=new URLSearchParams(location.search),sort=params.get('sort')||'trending',template=params.get('template')||'all',q=params.get('q')||'';
 const [search,setSearch]=useState(q);
 const state=useLoad('/feed?'+params.toString());
 function filter(key,value){const next=new URLSearchParams(location.search);next.set(key,value);next.delete('offset');navigate('/discover?'+next);}
 return <section className="page-section"><span className="eyebrow">PICK A RIVALRY</span><h1>The arcade</h1><p className="muted">Short games. Long group-chat arguments.</p>
 <form className="filters" onSubmit={e=>{e.preventDefault();filter('q',search);}}><input aria-label="Search games" placeholder="Find a game…" value={search} onChange={e=>setSearch(e.target.value)}/><button>Search</button>
 <select aria-label="Sort games" value={sort} onChange={e=>filter('sort',e.target.value)}><option value="trending">Trending</option><option value="newest">Newest</option><option value="played">Most played</option><option value="remixed">Most remixed</option></select>
 <select aria-label="Game genre" value={template} onChange={e=>filter('template',e.target.value)}><option value="all">Every genre</option><option value="runner">Runner</option><option value="dodge">Dodge</option><option value="platformer">Platformer</option><option value="custom">Custom</option></select></form>
 <Loading state={state}>{d=><><Cards games={d.games}/><div className="actions">{Number(params.get('offset'))>0&&<button onClick={()=>{params.set('offset',String(Math.max(0,Number(params.get('offset'))-30)));navigate('/discover?'+params);}}>Previous</button>}{d.hasMore&&<button onClick={()=>{params.set('offset',String(Number(params.get('offset')||0)+30));navigate('/discover?'+params);}}>More games →</button>}</div></>}</Loading></section>;
}
function Auth({mode}){
 const {setUser}=useContext(Account),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[recovery,setRecovery]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');const form=Object.fromEntries(new FormData(e.currentTarget));
 try{const data=await post('/auth/'+mode,form);if(data.user)setUser(data.user);if(data.recoveryCode)setRecovery(data.recoveryCode);else navigate(safeNext());}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 const suffix='?next='+encodeURIComponent(safeNext());
 return <section className="auth-card"><span className="eyebrow">YOUR NEXT HIGH SCORE STARTS HERE</span><h1>{mode==='signup'?'Join the arcade.':mode==='recover'?'Get back in.':'Welcome back.'}</h1>
 {recovery?<><h2>Save your recovery code</h2><p>This is the only way to reset your password. Keep it somewhere private; it is shown only once.</p><code className="recovery-code">{recovery}</code><button onClick={()=>navigate(mode==='recover'?'/login':safeNext())}>I saved my code — continue</button></>:<form onSubmit={submit}>
 <label>Username<input name="username" required minLength={3} maxLength={24} autoComplete="username"/></label>
 {mode==='recover'&&<label>Recovery code<input name="recoveryCode" required autoComplete="off"/></label>}
 <label>{mode==='recover'?'New password':'Password'}<input type="password" name="password" required minLength={mode==='login'?1:12} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'}/></label>
 {mode!=='login'&&<small>At least 12 characters. A few unrelated words work well.</small>}
 <Notice>{message}</Notice><button disabled={busy}>{busy?'One moment…':mode==='signup'?'Create account':mode==='recover'?'Reset password':'Sign in'}</button>
 <p>{mode==='login'?<><Link to={'/signup'+suffix}>Create an account</Link> · <Link to="/recover">Forgot password?</Link></>:<Link to={'/login'+suffix}>Already a player? Sign in</Link>}</p>
 </form>}</section>;
}
function RequireAccount({children}){
 const {user}=useContext(Account);
 if(!user)return <section className="empty"><h1>Make it yours.</h1><p>Sign in to create, save, remix, and join the leaderboard. Playing is always open.</p><Link className="button" to={'/login?next='+encodeURIComponent(location.pathname+location.search)}>Sign in to continue</Link></section>;
 return children;
}
function Create(){
 const [busy,setBusy]=useState(''),[error,setError]=useState('');
 const templates=[['runner','↗','Runner','Jump hazards, collect sparks, race to the finish.',createRunnerTemplate],['dodge','✦','Dodge arena','Stay alive in a neon arena. Make every coin count.',createDodgeTemplate],['platformer','▦','Platformer','Build a tiny world of platforms, coins, and surprises.',createPlatformerTemplate]];
 async function choose(t){setBusy(t[0]);setError('');try{const schema=t[4]();schema.soundtrack='neon';const g=await post('/games',{schema,template:t[0]});navigate('/create/manual/'+g.id);}catch(e){setError(e.message);setBusy('');}}
 return <section className="page-section"><span className="eyebrow">A LITTLE GAME. ALL YOU.</span><h1>Start with a spark.</h1><p className="muted">Pick a playable starting point. Change the scene, tune the rules, add your soundtrack.</p><Notice>{error}</Notice><div className="template-grid">{templates.map(t=><button className="template-card" key={t[0]} disabled={!!busy} onClick={()=>choose(t)}><span>{t[1]}</span><h2>{t[2]}</h2><p>{t[3]}</p><b>{busy===t[0]?'Creating your draft…':'Make it yours ↗'}</b></button>)}</div><p className="muted">Looking for inspiration? <Link to="/discover">Remix a game from the arcade →</Link></p></section>;
}
function Dashboard(){
 const [version,bump]=useState(0),[message,setMessage]=useState(''),state=useLoad('/dashboard',version);
 async function unpublish(g){try{await api('/games/'+g.id,{method:'PUT',body:JSON.stringify({schema:g.schema,revision:g.revision,isPublished:false})});setMessage('Game unpublished. Its public game and clip links are now unavailable.');bump(v=>v+1);}catch(e){setMessage(e.message);}}
 return <section className="page-section"><div className="section-title"><div><span className="eyebrow">YOUR CORNER OF THE ARCADE</span><h1>My games</h1></div><Link className="button" to="/create">+ New game</Link></div><Notice>{message}</Notice><Loading state={state}>{d=><Cards games={d.games} editable onUnpublish={unpublish}/>}</Loading></section>;
}
function Settings(){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 return <section className="auth-card"><h1>Account settings</h1><p>Change your password. Other signed-in sessions will be logged out.</p><form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;setBusy(true);try{await post('/auth/password',Object.fromEntries(new FormData(form)));form.reset();setMessage('Password updated.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}}>
 <label>Current password<input type="password" name="currentPassword" autoComplete="current-password" required/></label><label>New password<input type="password" name="password" minLength={12} maxLength={128} autoComplete="new-password" required/></label><button disabled={busy}>Update password</button></form><Notice>{message}</Notice><Link to="/dashboard">Manage your published games →</Link></section>;
}
function Edit({id}){
 const {user}=useContext(Account);
 const state=useLoad('/games/'+id);
 return <Loading state={state}>{g=>g.creator_id!==user.id?<section className="empty"><h1>Make your own version.</h1><p>Only the original creator can edit this game. Create an attributed remix to change it.</p><Link className="button" to={'/remix/'+g.id}>Remix this game</Link></section>:<EditorWorkspace key={g.id} initialSchema={{...g.schema,_existingId:g.id,_revision:g.revision,_published:g.is_published}} onPublishSuccess={slug=>navigate('/game/'+slug)} onBack={()=>navigate('/dashboard')}/>}</Loading>;
}
function Remix({id}){
 const state=useLoad('/games/'+id),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function remix(){setBusy(true);try{const g=await post('/remix/'+id,{});navigate('/create/'+g.id+'/edit');}catch(e){setError(e.message);setBusy(false);}}
 return <Loading state={state}>{g=><section className="auth-card"><span className="eyebrow">GREAT GAMES DESERVE ANOTHER LIFE</span><h1>Make it your own.</h1><p>Remix <strong>{g.title}</strong> by @{g.creator}. Change the obstacles, palette, rules, or soundtrack. Your remix keeps a link back to the original.</p><Notice>{error}</Notice><button disabled={busy} onClick={remix}>{busy?'Creating your remix…':'Remix this game ↗'}</button><Link to={'/game/'+g.slug}>Back to the original</Link></section>}</Loading>;
}
function Scores({scores}){
 return scores.length?<ol className="scores">{scores.map((s,i)=><li key={s.username}><span className="rank">{String(i+1).padStart(2,'0')}</span><Link to={'/u/'+s.username}>@{s.username}</Link><b>{Number(s.value).toLocaleString()}</b></li>)}</ol>:<p className="muted">No ranked scores yet. Set the first one!</p>;
}
function Game({slug}){
 const state=useLoad('/games/'+encodeURIComponent(slug));
 return <Loading state={state}>{g=><Play key={g.id} game={g}/>}</Loading>;
}
function Play({game}){
 const {user}=useContext(Account),canvas=useRef(null),engine=useRef(null),music=useRef(null),alive=useRef(true),abort=useRef(new AbortController());
 const [score,setScore]=useState(0),[status,setStatus]=useState('ready'),[message,setMessage]=useState(''),[result,setResult]=useState(null),[clip,setClip]=useState(null),[muted,setMuted]=useState(true),[revision,bump]=useState(0),[exporting,setExporting]=useState(false),[reporting,setReporting]=useState(false);
 const runRef=useRef(null),lastRef=useRef(null);
 const lb=useLoad('/leaderboards/'+game.id,revision),tree=useLoad('/remix/tree/'+game.id,revision);
 const rawTarget=new URLSearchParams(location.search).get('beat'),target=/^\d{1,9}$/.test(rawTarget||'')?Number(rawTarget):null;
 useEffect(()=>{alive.current=true;abort.current=new AbortController();
   try{engine.current=new EntityEngine(canvas.current,game.schema);}catch(e){setMessage('This game could not start: '+e.message);}
   return()=>{alive.current=false;abort.current.abort();engine.current?.detachEvents();music.current?.stop();};
 },[game.id]);
 async function finish(run,replay){
   lastRef.current={run,replay};setStatus('saving');
   try{const saved=await post('/runs/'+run.id+'/finish',{token:run.token,inputLog:replay.inputLog,ticks:replay.ticks});if(!alive.current)return;setResult({...saved,replay});lastRef.current=null;setStatus('ended');bump(v=>v+1);setMessage(saved.ranked?'Verified. Your score is on the board.':'Run saved. Sign in before your next run to join the leaderboard.');}
   catch(e){if(alive.current){setStatus('save-error');setMessage(e.message);}}
 }
 async function start(){
   setStatus('starting');setResult(null);setClip(null);setMessage('');setScore(0);music.current?.stop();engine.current?.detachEvents();
   try{
     if(!muted){music.current=new Soundtrack(game.schema.soundtrack);await music.current.start();}
     const run=await post('/runs',{gameId:game.id});if(!alive.current)return;
     runRef.current=run;
     engine.current=new EntityEngine(canvas.current,run.schema,run.rngSeed,{onScoreChange:setScore,onGameOver:(value,replay)=>{music.current?.stop();setScore(value);finish(run,replay);}});
     engine.current.startPlay();setStatus('playing');canvas.current.focus();
   }catch(e){music.current?.stop();setMessage(e.message);setStatus('ready');}
 }
 async function shareScore(){try{setMessage(await shareLink('/game/'+game.slug+(result?'?beat='+result.score:''),result?'I scored '+result.score+' on '+game.title+'. Beat that!':'Play '+game.title+' on Gamio'));}catch(e){setMessage(e.message);}}
 async function createClip(video=false){
   setExporting(true);setMessage('');
   try{
     const c=clip||await post('/clips',{replayId:result.replayId,shareToken:result.shareToken});if(!alive.current)return;setClip(c);
     if(video){
       setMessage('Making your video — keep this tab open. Up to 20 seconds of your run.');
       const blob=await renderClip(runRef.current.schema,result.replay,abort.current.signal);
       await api('/clips/'+c.id+'/video',{method:'PUT',body:blob,headers:{'Content-Type':blob.type,'X-Share-Token':result.shareToken}});
       const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=game.slug+'-gameplay.'+(blob.type==='video/mp4'?'mp4':'webm');a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
       setMessage('Video ready and downloaded. Your clip page now includes the video.');
     }else setMessage(await shareLink('/clip/'+c.id,'Can you beat my '+result.score+' on '+game.title+'?'));
   }catch(e){if(alive.current)setMessage(e.message);}finally{if(alive.current)setExporting(false);}
 }
 const busy=['starting','saving'].includes(status);
 return <section className="page-section game-page"><Link className="text-link" to="/discover">← Back to the arcade</Link>
 <div className="section-title"><div><span className="eyebrow">{game.template} / MADE TO BE REMIXED</span><h1>{game.title}</h1><p className="muted">{game.schema.description} <Link to={'/u/'+game.creator}>by @{game.creator}</Link></p></div><Link className="button secondary" to={'/remix/'+game.id}>↻ Remix this game</Link></div>
 {target!==null&&<div className="challenge-banner">THE CHALLENGE <strong>Beat {target.toLocaleString()} points.</strong>{result&&<span>{result.score>target?'You beat it! Send the challenge back.':'So close. One more try?'}</span>}</div>}
 <div className="player-grid"><div><div className="game-frame"><div className="frame-header"><span>{status==='playing'?'● LIVE RUN':'GAMIO / QUICK PLAY'}</span><strong>{score} PTS</strong></div><canvas ref={canvas} width="800" height="450" tabIndex={0} aria-label={game.title+' game. Use arrow keys or WASD to move; Space to jump.'}/></div>
 <div className="touch-controls" aria-label="Touch controls">{[['ArrowLeft','←'],['ArrowUp','↑'],['ArrowDown','↓'],['ArrowRight','→'],['Space','Jump']].map(([key,label])=><button key={key} aria-label={key==='Space'?'Jump':key} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);engine.current?.setKey(key,true);}} onPointerUp={()=>engine.current?.setKey(key,false)} onPointerCancel={()=>engine.current?.setKey(key,false)}>{label}</button>)}</div>
 <div className="actions"><button onClick={start} disabled={busy||status==='playing'||exporting}>{status==='starting'?'Starting…':status==='playing'?'Run in progress':result?'↻ Try again':'▶ Start run'}</button>
 <button className="secondary" onClick={shareScore}>↗ {result?'Beat my score':'Share game'}</button><button className="quiet" onClick={()=>{setMuted(!muted);music.current?.stop();if(muted&&status==='playing'){music.current=new Soundtrack(game.schema.soundtrack);music.current.start().catch(()=>{});}}}>{muted?'♫ Sound off':'♫ Sound on'}</button></div>
 <p className="muted controls-copy">Arrows / WASD to move · Space to jump · Maximum run: 2 minutes</p><Notice>{message}</Notice>
 {status==='save-error'&&<button onClick={()=>finish(lastRef.current.run,lastRef.current.replay)}>Retry saving this run</button>}
 {result&&<div className="run-result"><span className="eyebrow">THAT WAS YOUR MOMENT</span><h2>{result.score.toLocaleString()} points. Who can beat it?</h2><div className="actions"><button className="secondary" disabled={exporting} onClick={()=>{engine.current?.startReplay(result.replay);setMessage('Watching your verified run.');}}>Watch replay</button><button disabled={exporting} onClick={()=>createClip(false)}>Share replay link ↗</button><button className="secondary" disabled={exporting} onClick={()=>createClip(true)}>{exporting?'Preparing clip…':'Download gameplay video'}</button></div>{clip&&<Link className="text-link" to={'/clip/'+clip.id}>Open your shareable clip page →</Link>}</div>}
 {!user&&<p className="muted"><Link to={'/signup?next='+encodeURIComponent('/game/'+game.slug)}>Create an account</Link> to put your next score on the board.</p>}
 <button className="quiet" onClick={()=>setReporting(!reporting)}>Report this game</button>{reporting&&<form className="report-form" onSubmit={async e=>{e.preventDefault();const reason=new FormData(e.currentTarget).get('reason');try{await post('/reports',{gameId:game.id,reason});setReporting(false);setMessage('Report received. Thank you for helping keep Gamio welcoming.');}catch(e){setMessage(e.message);}}}><label>What should we review?<textarea name="reason" maxLength={1000} required/></label><button>Send report</button></form>}
 </div><aside className="leaderboard-card"><span className="eyebrow">THE PEOPLE TO BEAT</span><h2>Leaderboard</h2><Loading state={lb}>{d=><Scores scores={d.scores.slice(0,10)}/>}</Loading><Link className="text-link" to={'/leaderboard/'+game.id}>Full leaderboard →</Link><div className="lineage"><h3>The remix family</h3><Loading state={tree}>{d=><>{d.parent&&<p>Original: <Link to={'/game/'+d.parent.slug}>{d.parent.title}</Link></p>}{d.children.map(c=><p key={c.id}>↳ <Link to={'/game/'+c.slug}>{c.title}</Link></p>)}{!d.children.length&&<p className="muted">Give this game its first remix.</p>}</>}</Loading></div></aside></div></section>;
}
function Leaderboard({id}){
 const state=useLoad('/leaderboards/'+id);
 return <Loading state={state}>{d=><section className="narrow page-section"><span className="eyebrow">ONE GAME. MANY RIVALS.</span><h1>{d.game.title}</h1><h2>Leaderboard</h2><p className="muted">Each player’s best verified score for the current version.</p><Scores scores={d.scores}/><Link className="button" to={'/game/'+d.game.slug}>Take your shot ↗</Link></section>}</Loading>;
}
function Profile({username}){
 const state=useLoad('/u/'+encodeURIComponent(username));
 return <Loading state={state}>{d=><section className="page-section"><span className="eyebrow">PLAYER / CREATOR / RIVAL</span><h1>@{d.username}</h1><p className="muted">Joined {new Date(d.created_at).toLocaleDateString()} · {d.createdGames.length} published games</p><h2>Made by {d.username}</h2><Cards games={d.createdGames}/><h2 className="spaced">Personal bests</h2>{d.recentScores.length?<ul className="scores">{d.recentScores.map(s=><li key={s.slug}><Link to={'/game/'+s.slug}>{s.title}</Link><b>{s.value} pts</b></li>)}</ul>:<p className="muted">The next high score is still out there.</p>}</section>}</Loading>;
}
function Clip({id}){
 const state=useLoad('/clips/'+id);
 return <Loading state={state}>{c=><ClipPlayer key={c.id} clip={c}/>}</Loading>;
}
function ClipPlayer({clip}){
 const canvas=useRef(null),engine=useRef(null),[message,setMessage]=useState('');
 const replay={gameId:clip.game_id,rngSeed:clip.rng_seed,inputLog:clip.input_log,durationMs:clip.duration_ms,ticks:clip.ticks};
 useEffect(()=>()=>engine.current?.detachEvents(),[]);
 function watch(){engine.current?.detachEvents();engine.current=new EntityEngine(canvas.current,clip.schema_snapshot,clip.rng_seed);engine.current.startReplay(replay);}
 return <section className="page-section narrow"><span className="eyebrow">A LITTLE BRAG. A BIG CHALLENGE.</span><h1>Can you beat {clip.score}?</h1><p className="muted">{clip.title} · {Math.round(clip.duration_ms/1000)} second run</p>
 {clip.video_url?<video src={clip.video_url} controls playsInline preload="metadata" aria-label="Shared gameplay video"/>:<><div className="game-frame"><canvas ref={canvas} width="800" height="450" aria-label="Shared game replay"/></div><button onClick={watch}>▶ Watch the run</button><p className="muted">A lightweight replay — no video download required.</p></>}
 <div className="actions"><Link className="button" to={'/game/'+clip.slug+'?beat='+clip.score}>Beat this score ↗</Link><Link className="button secondary" to={'/remix/'+clip.game_id}>Remix the game</Link><button className="quiet" onClick={async()=>{try{setMessage(await shareLink('/clip/'+clip.id,'Beat '+clip.score+' on '+clip.title));}catch(e){setMessage(e.message);}}}>Share clip</button></div><Notice>{message}</Notice></section>;
}
function Community(){
 return <section className="page-section narrow prose"><span className="eyebrow">KEEP THE ARCADE WELCOMING</span><h1>Play fair. Make good things.</h1><h2>Community rules</h2><p>Share games you have the right to publish. No harassment, hateful content, sexual content, scams, or personal information about others. Give original creators credit; remix attribution stays attached automatically.</p><p>Use “Report this game” on a game page to flag content for review. Accounts are required to report so we can limit spam. Reports are reviewed by the site operator, who can remove games from public access.</p><h2>Your account and privacy</h2><p>We store your username, a securely hashed password and recovery code, games, scores, replay inputs, clips you choose to share, and reports. Your username, published games, ranked scores, and explicitly shared clips are public. Drafts are private. Session cookies keep you signed in and expire after 30 days. We do not use advertising trackers.</p><p>No email address is needed. Save the recovery code shown at signup: it is how you recover your account. Never put private information in your username, game, or description.</p><h2>Gameplay and sharing</h2><p>Play is open to everyone. Sign in before playing to enter a verified score. Sharing a replay or video makes it public. Music included here is generated by Gamio; external soundtrack uploads are not supported yet.</p></section>;
}
function Admin(){
 const [version,bump]=useState(0),state=useLoad('/admin/reports',version),[error,setError]=useState('');
 return <section className="page-section"><h1>Community reports</h1><Notice>{error}</Notice><Loading state={state}>{d=>d.reports.length?d.reports.map(r=><article className="run-result" key={r.id}><Link to={'/game/'+r.slug}><h2>{r.title}</h2></Link><p>{r.reason}</p><div className="actions">{['hide','dismiss'].map(action=><button key={action} onClick={async()=>{try{await post('/admin/reports/'+r.id,{action});bump(v=>v+1);}catch(e){setError(e.message);}}}>{action==='hide'?'Hide game':'Dismiss report'}</button>)}</div></article>):<p>No open reports.</p>}</Loading></section>;
}
class Boundary extends React.Component {
 state={error:false};
 static getDerivedStateFromError(){return{error:true};}
 render(){return this.state.error?<section className="empty"><h1>Something went wrong.</h1><p>Your saved games are safe. Reload this page to try again.</p><button onClick={()=>location.reload()}>Reload</button></section>:this.props.children;}
}
export default function App(){
 const [url,setUrl]=useState(location.pathname+location.search),[user,setUser]=useState(null),[ready,setReady]=useState(false);
 useEffect(()=>{const fn=()=>setUrl(location.pathname+location.search);window.addEventListener('popstate',fn);api('/auth/me').then(d=>setUser(d.user)).catch(()=>{}).finally(()=>setReady(true));return()=>window.removeEventListener('popstate',fn);},[]);
 useEffect(()=>{document.title='Gamio — Play. Beat. Remix.';},[url]);
 const path=url.split('?')[0];let page,editor=false;const parts=path.split('/').filter(Boolean);
 if(path==='/')page=<Home/>;
 else if(path==='/discover')page=<Discover key={url}/>;
 else if(['/login','/signup','/recover'].includes(path))page=<Auth key={path} mode={parts[0]}/>;
 else if(path==='/create')page=<RequireAccount><Create/></RequireAccount>;
 else if(path==='/dashboard')page=<RequireAccount><Dashboard/></RequireAccount>;
 else if(path==='/settings')page=<RequireAccount><Settings/></RequireAccount>;
 else if(parts[0]==='create'&&parts.length===3&&(parts[1]==='manual'||parts[2]==='edit')){editor=true;page=<RequireAccount><Edit id={parts[1]==='manual'?parts[2]:parts[1]}/></RequireAccount>;}
 else if(parts[0]==='game'&&parts.length===2)page=<Game slug={parts[1]}/>;
 else if(parts[0]==='remix'&&parts.length===2)page=<RequireAccount><Remix id={parts[1]}/></RequireAccount>;
 else if(parts[0]==='leaderboard'&&parts.length===2)page=<Leaderboard id={parts[1]}/>;
 else if(parts[0]==='u'&&parts.length===2)page=<Profile username={parts[1]}/>;
 else if(parts[0]==='clip'&&parts.length===2)page=<Clip id={parts[1]}/>;
 else if(path==='/community')page=<Community/>;
 else if(path==='/admin/reports')page=<RequireAccount><Admin/></RequireAccount>;
 else page=<section className="empty"><h1>This level doesn’t exist.</h1><Link className="button" to="/discover">Back to the arcade</Link></section>;
 return <Account.Provider value={{user,setUser}}><div className={'platform '+(editor?'editor-route':'')}><a className="skip-link" href="#main-content">Skip to content</a>{!editor&&<Header/>}<main id="main-content"><Boundary key={path}>{ready?page:<div className="empty">Opening the arcade…</div>}</Boundary></main>{!editor&&<Footer/>}</div></Account.Provider>;
}
