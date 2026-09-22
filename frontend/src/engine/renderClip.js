import { EntityEngine } from './entityEngine';
import { Soundtrack } from './soundtrack';
export async function renderClip(schema, replay, signal) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error('Video export is unavailable here. You can still share the replay link.');
  const canvas=document.createElement('canvas');
  canvas.width=800;canvas.height=450;
  const engine=new EntityEngine(canvas,schema,replay.rngSeed);
  const music=new Soundtrack(schema.soundtrack || 'none');
  await music.start();
  const stream=canvas.captureStream(30);
  music.output?.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  const mime=['video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!mime){engine.detachEvents();music.stop();stream.getTracks().forEach(t=>t.stop());throw new Error('Video export is unavailable. Share the replay link instead.');}
  return new Promise((resolve,reject)=>{
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1800000});
    const chunks=[];
    let error=null;
    const stop=()=>{if(recorder.state!=='inactive')recorder.stop();};
    const abort=()=>{error=new Error('Video rendering stopped. Your replay link is still available.');stop();};
    const visibility=()=>{if(document.hidden)abort();};
    document.addEventListener('visibilitychange',visibility);
    signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(stop,Math.min(replay.durationMs,20000)+180);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>{error=new Error('Video export failed. Share the replay link instead.');stop();};
    recorder.onstop=()=>{
      clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);signal?.removeEventListener('abort',abort);
      engine.detachEvents();music.stop();stream.getTracks().forEach(t=>t.stop());
      if(error)reject(error);else resolve(new Blob(chunks,{type:mime.split(';')[0]}));
    };
    recorder.start(200);engine.startReplay(replay);
    if(signal?.aborted)abort();
  });
}
