// Generative wedding music, synthesized live with Web Audio (no files, no licence): a soft string pad under harp-like
// arpeggios in D major (I–vi–IV–V), a kanun-like melody now and then, and a long hall reverb. ~66 bpm, endless, never loops.
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const CHORDS = [[50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57]]; // D, Bm, G, A
const SCALE = [74, 76, 78, 81, 83, 86, 88, 90]; // D major pentatonic, upper register
const BEAT = 60 / 66;

export function createMusic() {
  let ac = null, master = null, wet = null, timer = 0, next = 0, bar = 0, on = false;

  function setup() {
    master = ac.createGain(); master.gain.value = 0.0001;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    // hall reverb: a generated 3.5 s stereo impulse
    const len = ac.sampleRate * 3.5, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
    const rev = ac.createConvolver(); rev.buffer = ir;
    wet = ac.createGain(); wet.gain.value = 0.55;
    wet.connect(rev).connect(master);
  }
  const out = (node, dry = 0.7) => { const g = ac.createGain(); g.gain.value = dry; node.connect(g).connect(master); node.connect(wet); };

  function pad(notes, t, dur) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.3;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(0.05, t + 1.8); env.gain.setValueAtTime(0.05, t + dur - 1.2); env.gain.linearRampToValueAtTime(0.0001, t + dur + 1.5);
    lp.connect(env); out(env, 0.5);
    notes.forEach((m) => [-6, 6].forEach((cents) => {
      const o = ac.createOscillator(); o.type = cents < 0 ? 'sine' : 'triangle';
      o.frequency.value = mtof(m); o.detune.value = cents; o.connect(lp); o.start(t); o.stop(t + dur + 1.6);
    }));
  }

  function pluck(m, t, vel = 1, len = 2.6) {
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(0.09 * vel, t + 0.008); env.gain.exponentialRampToValueAtTime(0.0001, t + len);
    out(env, 0.8);
    [[1, 1, 'triangle'], [2, 0.35, 'sine'], [3, 0.12, 'sine']].forEach(([h, g, type]) => {
      const o = ac.createOscillator(), og = ac.createGain(); o.type = type; o.frequency.value = mtof(m) * h; og.gain.value = g;
      o.connect(og).connect(env); o.start(t); o.stop(t + len + 0.1);
    });
  }

  function scheduleBar(t) {
    const chord = CHORDS[Math.floor(bar / 2) % 4];
    if (bar % 2 === 0) pad(chord, t, BEAT * 8);
    if (bar % 8 === 0) pluck(chord[0] - 12, t, 0.9, 4.5); // a low root every phrase
    // harp arpeggio: up through two octaves, then back down, with a little human variation
    const arp = [...chord, ...chord.map((n) => n + 12)];
    const order = bar % 2 ? [7, 5, 6, 4, 3, 1, 2, 0] : [0, 2, 1, 3, 4, 6, 5, 7];
    order.forEach((k, i) => { if (Math.random() < 0.88) pluck(arp[k], t + i * BEAT / 2 + Math.random() * 0.02, 0.55 + Math.random() * 0.3); });
    // a short kanun-like melody every fourth bar
    if (bar % 4 === 3) {
      let s = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < 4; i++) {
        s = Math.max(0, Math.min(SCALE.length - 1, s + (Math.random() < 0.5 ? -1 : 1)));
        const at = t + i * BEAT;
        pluck(SCALE[s], at, 0.5, 1.8);
        if (i === 3) pluck(SCALE[Math.max(0, s - 1)], at + 0.11, 0.3, 1.4); // grace note
      }
    }
    bar++;
  }

  const loop = () => { while (next < ac.currentTime + 1.2) { scheduleBar(next); next += BEAT * 4; } };

  return {
    get playing() { return on; },
    start(delay = 0) {
      if (on) return;
      on = true;
      // the audio context must be created inside the tap; the heavier graph + first bars are built a moment later
      // so they never compete with the opening animation
      ac ||= new (window.AudioContext || window.webkitAudioContext)();
      // Safari only lets audio start inside a tap: if it's still suspended, resume on the guest's next tap or key
      ac.resume().finally(() => {
        if (ac.state === 'running') return;
        const kick = () => { ac.resume(); removeEventListener('pointerdown', kick); removeEventListener('keydown', kick); };
        addEventListener('pointerdown', kick); addEventListener('keydown', kick);
      });
      setTimeout(() => {
        if (!on) return;
        if (!master) setup();
        next = Math.max(next, ac.currentTime + 0.1);
        loop();
        clearInterval(timer);
        timer = setInterval(loop, 300);
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ac.currentTime);
        master.gain.exponentialRampToValueAtTime(0.8, ac.currentTime + 4); // gentle fade-in
      }, delay);
    },
    stop() {
      if (!on) return;
      on = false;
      clearInterval(timer);
      if (!master) return;
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ac.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
      setTimeout(() => { if (!on) ac.suspend(); }, 1300);
    },
    suspend() { if (ac && on) { clearInterval(timer); ac.suspend(); } },
    resume() { if (master && on) { ac.resume(); next = Math.max(next, ac.currentTime + 0.1); timer = setInterval(loop, 300); } },
  };
}
