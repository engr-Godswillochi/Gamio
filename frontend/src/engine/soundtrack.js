// Original synthesized loops: no remote assets or music licensing dependency.
export class Soundtrack {
  constructor(track = 'none') {
    this.track = track;
    this.context = null;
    this.timer = null;
  }
  async start() {
    if (this.track === 'none') return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    this.context = new Audio();
    await this.context.resume();
    this.output = this.context.createMediaStreamDestination();
    let step = 0;
    const notes = this.track === 'chill' ? [220,261.63,329.63,293.66,220,329.63,392,293.66]
      : this.track === 'arcade' ? [261.63,523.25,392,329.63,293.66,587.33,440,392]
      : [164.81,329.63,246.94,329.63,196,392,293.66,392];
    const tick = () => {
      if (!this.context || this.context.state !== 'running') return;
      const osc = this.context.createOscillator(), gain = this.context.createGain();
      osc.type = this.track === 'arcade' ? 'square' : 'triangle';
      osc.frequency.value = notes[step++ % notes.length];
      const t = this.context.currentTime;
      gain.gain.setValueAtTime(0.0001,t);
      gain.gain.exponentialRampToValueAtTime(0.06,t+0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
      osc.connect(gain); gain.connect(this.context.destination); gain.connect(this.output);
      osc.start(t); osc.stop(t+0.25);
    };
    tick(); this.timer=setInterval(tick,this.track==='chill'?280:170);
  }
  stop() { clearInterval(this.timer); this.context?.close().catch(()=>{}); this.context=null; }
}
