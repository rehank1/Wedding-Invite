// Original background score in the style of a Pakistani drama OST, synthesized live with Web Audio (no files, no licence):
// a breathing harmonium drone (Sa–Pa), sitar phrases in raag Yaman with meend (glides), santoor shimmer and a soft
// keherwa dholak (8 beats). Sa = D. ~70 bpm, endless, phrases are chosen at random so it never loops.
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const SA = 62; // D4
const YAMAN = [0, 2, 4, 6, 7, 9, 11]; // S R G M# P D N
const note = (deg) => SA + YAMAN[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);
// Yaman-flavoured phrases as scale degrees (0 = Sa). Typical movements: N R G, M# D N S', G R S.
const PHRASES = [[-1, 1, 2, 1, 0], [2, 3, 4, 5, 4, 3, 2], [4, 5, 6, 7, 6, 5, 4], [6, 8, 7, 6, 5, 4], [2, 3, 5, 4, 2, 1, 0], [7, 6, 5, 3, 4, 2, 1, 0]];
const BEAT = 60 / 70;
// keherwa: dha ge na ti | na ka dhi na  (1 = bass "dha/ge", 2 = high "na/ti", 0 = ghost tap)
const THEKA = [1, 1, 2, 2, 2, 0, 1, 2];

export function createMusic() {
  let ac = null, master = null, wet = null, buzz = null, timer = 0, next = 0, bar = 0, on = false;

  function setup() {
    master = ac.createGain(); master.gain.value = 0.0001;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    const len = ac.sampleRate * 3, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.8; }
    const rev = ac.createConvolver(); rev.buffer = ir;
    wet = ac.createGain(); wet.gain.value = 0.5; wet.connect(rev).connect(master);
    // jawari: a gentle wave-shaper gives the sitar its buzzing bridge
    buzz = ac.createWaveShaper();
    const k = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; k[i] = Math.tanh(2.6 * x) + 0.08 * Math.sin(9 * x); }
    buzz.curve = k;
  }
  const out = (node, dry = 0.7, rv = 1) => { const g = ac.createGain(); g.gain.value = dry; node.connect(g).connect(master); if (rv) { const w = ac.createGain(); w.gain.value = rv; node.connect(w).connect(wet); } };

  // harmonium drone: reedy saws through a soft low-pass, Sa + Pa + Sa', with a slow bellows swell
  function drone(t) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.5;
    const env = ac.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(0.035, t + 3);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.01; lfo.connect(lg).connect(env.gain); lfo.start(t);
    lp.connect(env); out(env, 0.55, 0.5);
    [SA - 12, SA - 5, SA].forEach((m, i) => [-4, 5].forEach((c) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = c + i;
      const g = ac.createGain(); g.gain.value = i === 1 ? 0.6 : 1; o.connect(g).connect(lp); o.start(t);
    }));
  }

  // sitar: bright pluck through the jawari, optional meend (a glide up from the previous note)
  function sitar(m, t, dur, from = null, vel = 1) {
    const o = ac.createOscillator(); o.type = 'sawtooth';
    const f = mtof(m);
    if (from !== null) { o.frequency.setValueAtTime(mtof(from), t); o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.28, dur * 0.4)); } else o.frequency.setValueAtTime(f, t);
    const pre = ac.createGain(); pre.gain.value = 0.9;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const env = ac.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(0.07 * vel, t + 0.006); env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    o.connect(pre).connect(buzz).connect(lp).connect(env); out(env, 0.75, 0.9);
    o.start(t); o.stop(t + dur + 0.7);
  }

  // santoor: quick hammered tones with a tremolo of repeats
  function santoor(m, t, reps = 3) {
    for (let r = 0; r < reps; r++) {
      const at = t + r * 0.09, o = ac.createOscillator(), o2 = ac.createOscillator(), env = ac.createGain();
      o.type = 'triangle'; o.frequency.value = mtof(m); o2.type = 'sine'; o2.frequency.value = mtof(m) * 2.01;
      env.gain.setValueAtTime(0.0001, at); env.gain.exponentialRampToValueAtTime(0.03 * (1 - r * 0.2), at + 0.004); env.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
      o.connect(env); o2.connect(env); out(env, 0.6, 1); o.start(at); o2.start(at); o.stop(at + 1.2); o2.stop(at + 1.2);
    }
  }

  // dholak: "dha/ge" = pitched-down low thump, "na/ti" = short bright tap
  function drum(kind, t, vel) {
    const o = ac.createOscillator(), env = ac.createGain();
    if (kind === 1) { o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.25); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.005); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); }
    else { o.type = 'triangle'; o.frequency.setValueAtTime(kind === 2 ? 520 : 440, t); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime((kind === 2 ? 0.05 : 0.02) * vel, t + 0.003); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); }
    o.connect(env); out(env, 0.8, 0.25); o.start(t); o.stop(t + 0.4);
  }

  function scheduleBar(t) {
    // the rhythm enters after an alaap-like opening (4 bars of drone and free sitar)
    if (bar >= 4) THEKA.forEach((k, i) => drum(k, t + i * BEAT / 2, 0.55 + Math.random() * 0.25));
    // a sitar phrase most bars, resting now and then; an occasional santoor shimmer
    if (bar % 6 !== 5) {
      const ph = PHRASES[Math.floor(Math.random() * PHRASES.length)];
      const step = (BEAT * 4) / (ph.length + 1);
      let prev = null;
      ph.forEach((d, i) => {
        const m = note(d) + (bar % 8 > 3 ? 12 : 0);
        const glide = prev !== null && Math.random() < 0.35 ? prev : null;
        sitar(m, t + i * step + Math.random() * 0.015, step * (i === ph.length - 1 ? 2.2 : 1.1), glide, i === 0 ? 1 : 0.8);
        prev = m;
      });
    }
    if (bar % 4 === 2) santoor(note(Math.random() < 0.5 ? 7 : 11) + 12, t + BEAT * 2);
    bar++;
  }

  const loop = () => { while (next < ac.currentTime + 1.2) { scheduleBar(next); next += BEAT * 4; } };

  return {
    get playing() { return on; },
    start(delay = 0) {
      if (on) return;
      on = true;
      // the audio context must be created inside the tap; the graph and first bars are built a moment later
      ac ||= new (window.AudioContext || window.webkitAudioContext)();
      ac.resume().finally(() => {
        if (ac.state === 'running') return;
        const kick = () => { ac.resume(); removeEventListener('pointerdown', kick); removeEventListener('keydown', kick); };
        addEventListener('pointerdown', kick); addEventListener('keydown', kick);
      });
      setTimeout(() => {
        if (!on) return;
        if (!master) { setup(); drone(ac.currentTime + 0.05); }
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
