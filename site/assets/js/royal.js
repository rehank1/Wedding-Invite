// Royal layer: floating gold dust, pointer-driven 3D tilt with glare, hero parallax, scratch-to-reveal.
// Everything animates transform/opacity only and stands still under prefers-reduced-motion.
import { el, reducedMotion } from './core.js';

const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Gold dust drifting in three depth layers; the layers lean with the mouse. */
export function initFloat(layer) {
  if (!layer || reducedMotion()) return;
  const count = innerWidth < 600 ? 12 : 22;
  const depths = [0.6, 1, 1.6].map((k) => {
    const d = el('div', { class: 'depth' });
    d.dataset.k = k;
    layer.append(d);
    return d;
  });
  for (let i = 0; i < count; i++) {
    const m = el('span', { class: 'mote' });
    const set = (k, v) => m.style.setProperty(k, v);
    set('--x', `${Math.random() * 100}%`);
    set('--y', `${Math.random() * 100}%`);
    set('--s', `${2 + Math.random() * 5}px`);
    set('--o', (0.35 + Math.random() * 0.5).toFixed(2));
    set('--d', `${9 + Math.random() * 12}s`);
    set('--dl', `${-Math.random() * 12}s`);
    set('--dx', `${(Math.random() - 0.5) * 120}px`);
    set('--dy', `${-40 - Math.random() * 120}px`);
    depths[i % 3].append(m);
  }
  if (!fine()) return;
  let raf = 0;
  addEventListener('pointermove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const dx = e.clientX / innerWidth - 0.5, dy = e.clientY / innerHeight - 0.5;
      for (const d of depths) d.style.transform = `translate3d(${dx * -24 * d.dataset.k}px, ${dy * -18 * d.dataset.k}px, 0)`;
      document.querySelectorAll('.floater').forEach((f, i) => { f.style.translate = `${dx * (20 + i * 10)}px ${dy * (16 + i * 8)}px`; });
    });
  }, { passive: true });
}

/** 3D tilt + moving glare on any [data-tilt] (value = max degrees). Mouse only; touch gets the CSS idle float. */
export function initTilt() {
  if (reducedMotion() || !fine()) return;
  let cur = null, raf = 0, last = null;
  const reset = (t) => {
    t.classList.remove('tilting');
    t.style.setProperty('--rx', '0deg');
    t.style.setProperty('--ry', '0deg');
  };
  const apply = () => {
    raf = 0;
    const e = last;
    const t = e.target.closest?.('[data-tilt]') || null;
    if (t !== cur) {
      if (cur) reset(cur);
      cur = t;
      if (t) {
        if (!t.querySelector(':scope > .glare')) t.append(el('span', { class: 'glare', 'aria-hidden': 'true' }));
        t.classList.add('tilting');
      }
    }
    if (!t) return;
    const r = t.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    const max = Number(t.dataset.tilt) || 7;
    t.style.setProperty('--ry', `${((px - 0.5) * max * 2).toFixed(2)}deg`);
    t.style.setProperty('--rx', `${((0.5 - py) * max * 2).toFixed(2)}deg`);
    t.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
    t.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
  };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    last = e;
    raf ||= requestAnimationFrame(apply);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (cur) reset(cur); cur = null; });
}

/** Champagne foil you scratch off to reveal the date. A button + the real text underneath keep it accessible. */
export function initScratch({ text, onReveal }) {
  const box = document.getElementById('scratch');
  const canvas = document.getElementById('scratch-canvas');
  const date = document.getElementById('scratch-date');
  const hint = document.getElementById('scratch-hint');
  const btn = document.getElementById('scratch-reveal');
  if (!box || !canvas) return;
  date.textContent = text;
  box.hidden = !text;
  if (!text || canvas.dataset.ready) return;
  canvas.dataset.ready = '1';
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let painted = false, done = false, moves = 0, prev = null;

  const paint = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || done) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, r.width, r.height);
    [['#8A6E3A', 0], ['#D9C08A', 0.22], ['#F6E7BF', 0.38], ['#B89B5E', 0.55], ['#E6D29E', 0.75], ['#8A6E3A', 1]].forEach(([c, o]) => g.addColorStop(o, c));
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);
    for (let i = 0; i < 160; i++) { // foil sparkle
      ctx.fillStyle = `rgba(255,250,230,${Math.random() * 0.5})`;
      ctx.fillRect(Math.random() * r.width, Math.random() * r.height, 1, 1);
    }
    ctx.fillStyle = 'rgba(60,44,16,.75)';
    ctx.font = '400 13px Jost, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S C R A T C H   H E R E', r.width / 2, r.height / 2);
    painted = true;
  };

  const reveal = () => {
    if (done) return;
    done = true;
    canvas.classList.add('done');
    btn.hidden = true;
    hint.textContent = 'InshaAllah, we will see you there.';
    onReveal?.();
  };

  const progress = () => {
    if (done || !canvas.width) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0, total = 0;
    for (let i = 3; i < data.length; i += 4 * 24) { total++; if (data[i] < 40) clear++; }
    if (clear / total > 0.4) reveal();
  };

  const scratch = (e) => {
    if (done || !painted) return;
    const r = canvas.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo((prev || p).x, (prev || p).y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    prev = p;
    if (++moves % 10 === 0) progress();
  };

  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture?.(e.pointerId); prev = null; scratch(e); });
  canvas.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType !== 'mouse') scratch(e); });
  canvas.addEventListener('pointerup', () => { prev = null; progress(); });
  btn.addEventListener('click', reveal);
  new IntersectionObserver(([en], io) => { if (en.isIntersecting) { paint(); io.disconnect(); } }).observe(canvas);
  addEventListener('resize', paint);
}

/**
 * Background videos. Each `.bgv[data-video=name]` shows its poster immediately; the muted loop is only
 * fetched once the section is near the screen, plays while visible and pauses off-screen.
 * Guests with reduced motion, Data Saver or a 2G connection get the still poster only.
 */
export function initBgVideos(base = 'assets/video/') {
  const nodes = [...document.querySelectorAll('.bgv[data-video]')];
  const conn = navigator.connection || {};
  const stillOnly = reducedMotion() || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  for (const n of nodes) {
    const name = n.dataset.video.replace(/[^a-z0-9-]/gi, '');
    // clips with portrait + landscape cuts (data-orient) pick the sharper one for this screen
    const full = n.dataset.orient ? name + (matchMedia('(orientation: portrait)').matches ? '-p' : '-l') : name;
    n.style.backgroundImage = `url("${base}${full}-poster.webp")`;
    n.dataset.name = full;
  }
  if (stillOnly || !('IntersectionObserver' in window)) return;
  // the petals WebM is larger than its MP4 here, so MP4 goes first for that one
  const order = { roses: ['webm', 'mp4'], 'liquidgold-p': ['mp4'], 'liquidgold-l': ['mp4'] }; // smallest file first
  const mount = (n) => {
    const v = el('video', { muted: true, playsinline: true, loop: true, autoplay: true, preload: 'auto', disablepictureinpicture: true, disableremoteplayback: true, 'aria-hidden': 'true', tabindex: '-1' });
    v.muted = true;
    for (const ext of order[n.dataset.name] || ['mp4', 'webm']) v.append(el('source', { src: `${base}${n.dataset.name}.${ext}`, type: `video/${ext}` }));
    v.addEventListener('playing', () => v.classList.add('playing'), { once: true });
    n.append(v);
    v.play().catch(() => {});
    return v;
  };
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    const n = en.target;
    const v = n.querySelector('video') || (en.isIntersecting ? mount(n) : null);
    if (!v) return;
    if (en.isIntersecting) v.play().catch(() => {}); else v.pause();
  }), { rootMargin: '250px 0px' });
  // let the first paint happen before any video bytes are requested
  requestAnimationFrame(() => requestAnimationFrame(() => nodes.forEach((n) => io.observe(n))));
}
