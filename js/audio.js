export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.8;
    this.noiseBuf = null;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sr; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this._ambient();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  _burst({ dur = 0.1, freq = 1000, peak = 0.5, pan = 0, rate = 1, type = 'lowpass', when = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = rate * (0.9 + Math.random() * 0.2);
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(f); f.connect(g); g.connect(p); p.connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  _tone({ freq = 440, dur = 0.1, peak = 0.2, type = 'sine', pan = 0, slide = 0, when = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    o.connect(g); g.connect(p); p.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  shot(kind, pan = 0, dist = 0) {
    const att = 1 / (1 + dist * 0.07);
    const baseFreq = kind === 'awp' ? 700 : kind === 'deagle' ? 1300 : 1000;
    const freq = Math.max(150, baseFreq - dist * 6);
    const dur = kind === 'awp' ? 0.32 : kind === 'deagle' ? 0.2 : 0.15;
    const peak = att * (kind === 'awp' ? 0.95 : 0.7);
    this._burst({ dur, freq, peak, pan });
    this._burst({ dur: 0.03, freq: 2600, peak: peak * 0.5, pan, type: 'highpass' });
    if (kind === 'awp') {
      this._tone({ freq: 70, dur: 0.32, peak: 0.55 * att, type: 'sine', slide: 38, pan });
    } else {
      this._tone({ freq: 120, dur: 0.09, peak: 0.32 * att, type: 'triangle', slide: 55, pan });
    }
  }

  dry() { this._tone({ freq: 1800, dur: 0.03, peak: 0.14, type: 'square' }); }

  reload() {
    [0, 0.3, 0.55, 1.05, 1.55].forEach(w => {
      this._tone({ freq: 850 + Math.random() * 350, dur: 0.04, peak: 0.17, type: 'square', when: w });
    });
    this._burst({ dur: 0.05, freq: 480, peak: 0.12, when: 0.35 });
    this._burst({ dur: 0.05, freq: 380, peak: 0.12, when: 1.0 });
  }

  step(run) {
    this._burst({ dur: 0.055, freq: run ? 430 : 320, peak: 0.11, rate: 0.8 });
  }

  hit(head) {
    this._tone({ freq: head ? 1750 : 1150, dur: 0.05, peak: 0.22, type: 'sine' });
  }

  hurt() {
    this._burst({ dur: 0.18, freq: 300, peak: 0.5 });
    this._tone({ freq: 92, dur: 0.16, peak: 0.3, slide: 48 });
  }

  buy() {
    this._tone({ freq: 780, dur: 0.06, peak: 0.2, type: 'square' });
    this._tone({ freq: 1170, dur: 0.09, peak: 0.15, type: 'square', when: 0.07 });
  }

  denied() { this._tone({ freq: 190, dur: 0.13, peak: 0.2, type: 'square' }); }
  ui() { this._tone({ freq: 620, dur: 0.04, peak: 0.12, type: 'sine' }); }

  roundStart() {
    this._tone({ freq: 520, dur: 0.12, peak: 0.25, type: 'triangle' });
    this._tone({ freq: 780, dur: 0.2, peak: 0.25, type: 'triangle', when: 0.14 });
  }

  win() { [523, 659, 784, 1047].forEach((f, i) => this._tone({ freq: f, dur: 0.24, peak: 0.22, type: 'triangle', when: i * 0.13 })); }
  lose() { [392, 330, 262].forEach((f, i) => this._tone({ freq: f, dur: 0.32, peak: 0.22, type: 'triangle', when: i * 0.18 })); }

  death() {
    this._tone({ freq: 220, dur: 0.5, peak: 0.3, type: 'sawtooth', slide: 55 });
    this._burst({ dur: 0.3, freq: 250, peak: 0.3 });
  }

  _ambient() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 220;
    const g = this.ctx.createGain(); g.gain.value = 0.032;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.014;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(); lfo.start();
  }
}
