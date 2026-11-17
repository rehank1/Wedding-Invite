// Hand-painted watercolour florals (Freepik free licence, recoloured to the site palette), in ONE fixed layer behind the page,
// so they never clip against a section edge. As each chapter scrolls by, its corner pair blooms in, sways, then fades,
// and the next chapter's pair (mirrored corners) takes over. Compositor-only: opacity + transform.
import { reducedMotion } from './core.js';

const SRC = { bouquet: 'assets/img/wc/bouquet.webp', gl: 'assets/img/wc/garden-l.webp', gr: 'assets/img/wc/garden-r.webp' };
const PAIRS = [[['wc-tr', SRC.bouquet], ['wc-bl', SRC.gl]], [['wc-tl', SRC.bouquet], ['wc-br', SRC.gr]]];
const ease = (t) => t * t * (3 - 2 * t);

export async function initWatercolors(chapters) {
  const layer = document.createElement('div');
  layer.className = 'wc-layer';
  layer.setAttribute('aria-hidden', 'true');
  const pairs = PAIRS.map((pair) => pair.map(([cls, src]) => {
    const wrap = document.createElement('div'), img = new Image();
    wrap.className = `wc ${cls}`;
    img.src = src; img.alt = ''; img.decoding = 'async';
    wrap.append(img); layer.append(wrap);
    return wrap;
  }));
  document.body.prepend(layer);
  if (reducedMotion()) { pairs[0].forEach((w) => w.style.setProperty('opacity', '.5')); return; }

  let raf = 0;
  const update = () => {
    raf = 0;
    const mid = innerHeight * 0.5;
    let c = 0, p = 0;
    chapters.forEach((ch, i) => { const b = ch.getBoundingClientRect(); if (b.top <= mid && b.bottom > mid) { c = i; p = (mid - b.top) / b.height; } });
    // bloom over the first 30% of a chapter, rest, fade over the last 22%
    const bloom = p < 0.3 ? ease(p / 0.3) : p > 0.78 ? ease((1 - p) / 0.22) : 1;
    const grow = p < 0.3 ? 0.84 + 0.16 * ease(p / 0.3) : 1 + (p > 0.78 ? 0.05 * ease((p - 0.78) / 0.22) : 0);
    pairs.forEach((pair, k) => pair.forEach((w) => {
      const on = k === c % 2;
      w.style.setProperty('opacity', on ? (bloom * 0.92).toFixed(3) : '0');
      w.style.setProperty('transform', on ? `scale(${grow.toFixed(3)}) rotate(${((p - 0.5) * 6).toFixed(2)}deg)` : 'scale(.84)');
    }));
  };
  addEventListener('scroll', () => { raf ||= requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', () => { raf ||= requestAnimationFrame(update); });
  update();
}
