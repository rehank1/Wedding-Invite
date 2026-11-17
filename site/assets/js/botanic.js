// Gold line-art botanicals drawn in code (original art): a camellia, a garden rose, snowberry sprigs and leaves
// that grow around the monogram. Every stroke uses pathLength=1 so CSS can "draw" it in order.
const NS = 'http://www.w3.org/2000/svg';
// note: the draw delay goes through the style API (CSSOM), not a style attribute, so the strict CSP stays happy
const mk = (tag, a) => { const n = document.createElementNS(NS, tag); for (const k in a) { if (k === 'style') n.style.setProperty('--d', a[k].split(':')[1]); else n.setAttribute(k, a[k]); } return n; };
const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const pol = (cx, cy, r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

/** a soft petal from the centre outwards (rounded, slightly notched tip) */
function petal(cx, cy, r, a, w) {
  const [bx, by] = pol(cx, cy, r * 0.18, a);
  const [tx, ty] = pol(cx, cy, r, a);
  const [l1x, l1y] = pol(cx, cy, r * 0.75, a - w), [r1x, r1y] = pol(cx, cy, r * 0.75, a + w);
  const [lnx, lny] = pol(cx, cy, r * 1.04, a - w * 0.35), [rnx, rny] = pol(cx, cy, r * 1.04, a + w * 0.35);
  return `M${P(bx, by)}C${P(l1x, l1y)} ${P(lnx, lny)} ${P(tx, ty)}C${P(rnx, rny)} ${P(r1x, r1y)} ${P(bx, by)}`;
}
function leaf(x, y, len, a, bend = 0.25) {
  const [tx, ty] = pol(x, y, len, a);
  const [c1x, c1y] = pol(x, y, len * 0.5, a - bend), [c2x, c2y] = pol(x, y, len * 0.5, a + bend);
  const [mx, my] = pol(x, y, len * 0.9, a + 0.02);
  return [`M${P(x, y)}Q${P(c1x, c1y)} ${P(tx, ty)}Q${P(c2x, c2y)} ${P(x, y)}`, `M${P(x, y)}L${P(mx, my)}`];
}

function camellia(g, cx, cy, r, d0) {
  const out = [];
  for (let i = 0; i < 7; i++) out.push(petal(cx, cy, r, i * 0.9 + 0.2, 0.42));
  for (let i = 0; i < 5; i++) out.push(petal(cx, cy, r * 0.62, i * 1.26 + 0.7, 0.5));
  out.push(`M${P(cx + r * 0.16, cy)}A${r * 0.16} ${r * 0.16} 0 1 1 ${P(cx + r * 0.16, cy - 0.01)}`);
  for (let i = 0; i < 14; i++) { const [x, y] = pol(cx, cy, r * 0.3, i * 0.45); const [x0, y0] = pol(cx, cy, r * 0.12, i * 0.45); out.push(`M${P(x0, y0)}L${P(x, y)}`); }
  out.forEach((d, i) => g.append(mk('path', { d, pathLength: 1, class: i < 12 ? 'petal' : '', style: `--d:${(d0 + i * 0.05).toFixed(2)}s` })));
  for (let i = 0; i < 14; i++) { const [x, y] = pol(cx, cy, r * 0.32, i * 0.45); g.append(mk('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 1.3, class: 'dot', style: `--d:${(d0 + 1).toFixed(2)}s` })); }
}

function rose(g, cx, cy, r, d0) {
  const out = [];
  let s = `M${P(cx, cy)}`; // inner spiral of folded petals
  for (let a = 0; a < Math.PI * 5; a += 0.5) s += `L${P(...pol(cx, cy, r * 0.06 * a, a))}`;
  out.push(s);
  for (let i = 0; i < 6; i++) { // cupped outer petals
    const a = i * 1.05 + 0.3;
    const [x1, y1] = pol(cx, cy, r * 0.72, a - 0.55), [x2, y2] = pol(cx, cy, r * 0.72, a + 0.55), [qx, qy] = pol(cx, cy, r * 1.15, a);
    out.push(`M${P(x1, y1)}Q${P(qx, qy)} ${P(x2, y2)}`);
  }
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + 1;
    const [x1, y1] = pol(cx, cy, r * 0.45, a - 0.7), [x2, y2] = pol(cx, cy, r * 0.45, a + 0.7), [qx, qy] = pol(cx, cy, r * 0.78, a);
    out.push(`M${P(x1, y1)}Q${P(qx, qy)} ${P(x2, y2)}`);
  }
  out.forEach((d, i) => g.append(mk('path', { d, pathLength: 1, style: `--d:${(d0 + i * 0.06).toFixed(2)}s` })));
}

function berries(g, pts, d0) {
  pts.forEach(([x, y, rr, sx, sy], i) => {
    g.append(mk('path', { d: `M${P(sx, sy)}Q${P((sx + x) / 2 + 3, (sy + y) / 2)} ${P(x, y + rr)}`, pathLength: 1, style: `--d:${(d0 + i * 0.07).toFixed(2)}s` }));
    g.append(mk('circle', { cx: x, cy: y, r: rr, pathLength: 1, style: `--d:${(d0 + 0.2 + i * 0.07).toFixed(2)}s` }));
    g.append(mk('path', { d: `M${P(x - rr * 0.5, y - rr * 0.2)}Q${P(x - rr * 0.3, y - rr * 0.6)} ${P(x, y - rr * 0.6)}`, pathLength: 1, class: 'fine', style: `--d:${(d0 + 0.5 + i * 0.07).toFixed(2)}s` }));
  });
}

/** Fill `svg` (viewBox 0 0 400 600) with the composition. */
export function drawBotanicals(svg) {
  if (svg.querySelector('.bot')) return;
  const g = mk('g', { class: 'bot' });
  [ // main stem from the rose (bottom-left) up behind the monogram to the camellia (top-right) and a berry spray
    'M118 492C142 430 160 392 176 342C192 292 214 246 248 196',
    'M248 196C262 170 276 140 286 104',
    'M176 342C150 326 132 300 124 268',
    'M214 252C240 250 262 262 278 282',
    'M152 438C120 440 96 428 82 404',
    'M278 282C296 290 308 296 318 300',
    'M82 404C76 412 70 416 64 418',
  ].forEach((d, i) => g.append(mk('path', { d, pathLength: 1, style: `--d:${(0.2 + i * 0.15).toFixed(2)}s` })));
  [[150, 410, 46, -2.4], [164, 372, 40, -0.4], [128, 284, 34, -2.0], [232, 226, 40, -0.3], [262, 268, 34, 0.5], [270, 140, 30, -2.6], [100, 418, 30, -2.9], [196, 300, 30, 0.2], [140, 450, 34, -1.2], [292, 286, 26, 0.9]]
    .forEach(([x, y, l, a], i) => leaf(x, y, l, a).forEach((d, k) => g.append(mk('path', { d, pathLength: 1, class: k ? '' : 'petal', style: `--d:${(0.7 + i * 0.12).toFixed(2)}s` }))));
  camellia(g, 258, 196, 66, 1.1);
  rose(g, 112, 474, 62, 1.3);
  camellia(g, 336, 498, 12, 2.4); // two small blossoms resting lower right
  camellia(g, 306, 540, 9, 2.5);
  berries(g, [[292, 92, 6, 286, 104], [304, 80, 5, 290, 98], [282, 76, 5.5, 286, 100], [298, 64, 4.5, 292, 84], [276, 60, 4, 282, 80], [312, 98, 4.5, 292, 102]], 1.8);
  berries(g, [[132, 262, 5, 124, 268], [120, 250, 4.5, 124, 266], [140, 248, 4, 128, 262]], 2.0);
  svg.append(g); // in front of the letters
}

/** A tiny five-petal blossom (for the falling ones). */
export function blossom(size = 14) {
  const s = mk('svg', { viewBox: '-10 -10 20 20', width: size, height: size, 'aria-hidden': 'true', class: 'blossom' });
  for (let i = 0; i < 5; i++) s.append(mk('path', { d: petal(0, 0, 9, i * 1.2566, 0.55) }));
  s.append(mk('circle', { cx: 0, cy: 0, r: 1.6 }));
  return s;
}
