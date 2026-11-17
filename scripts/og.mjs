// Renders the social preview card (1200×630) and app icons. Needs a server on :4173 (npm run serve).
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { readFile, writeFile, rm } from 'node:fs/promises';

const base = process.env.OG_BASE || 'http://localhost:4173/';
const c = JSON.parse(await readFile('site/content/content.json', 'utf8'));
const esc = (s) => String(s || '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const index = await readFile('dist/index.html', 'utf8');
const sprite = index.match(/<svg class="sprite"[\s\S]*?<\/svg>/)[0];
const when = c.events.map((e) => `${esc(e.name)} · ${new Date(e.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}`).join('<br>');
const page = (inner, w, h) => `<!doctype html><html><head><base href="${base}"><link rel="stylesheet" href="assets/css/base.css"><style>
body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:linear-gradient(118deg,transparent 30%,rgba(255,255,255,.55) 45%,transparent 60%),linear-gradient(180deg,#F6EEE6,#EFE4D8)}
body::before{content:none}${inner.css}</style></head><body>${sprite}${inner.html}</body></html>`;
const og = page({
  css: `.wrap{position:absolute;inset:34px;border:1px solid rgba(138,106,46,.4);border-radius:26px;display:grid;grid-template-columns:300px 1fr;align-items:center;gap:40px;padding:0 70px}
.wrap::after{content:"";position:absolute;inset:10px;border:1px solid rgba(138,106,46,.16);border-radius:18px}
svg.m{width:260px}.n{font:400 124px/1.1 "Great Vibes";letter-spacing:0;margin:0;padding:0 .12em}.a{font:italic 500 44px Cormorant;color:#A9853F;margin:6px 0}
.l{font:500 21px/1.8 Jost;letter-spacing:.24em;text-transform:uppercase;color:#2F2520;margin:26px 0 0}.k{font:500 18px Jost;letter-spacing:.5em;color:#8A6A2E;margin:0 0 14px}`,
  html: `<div class="wrap"><svg class="m" viewBox="0 0 240 290"><use href="#mono"/></svg><div><p class="k">YOU ARE INVITED</p><p class="n gold-text">${esc(c.couple.groom.name)}</p><p class="a">&amp;</p><p class="n gold-text">${esc(c.couple.bride.name)}</p><p class="l">${when}<br>${esc(c.events[0].venue)} · Pune</p></div></div>`,
}, 1200, 630);
const icon = page({ css: 'svg{width:70%;margin:12% auto 0;display:block}', html: '<svg viewBox="0 0 240 290"><use href="#mono"/></svg>' }, 512, 512);

const b = await chromium.launch();
async function shot(html, w, h) {
  await writeFile('dist/_og.html', html); // same origin so fonts load
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(base + '_og.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const png = await p.screenshot();
  await p.close();
  return png;
}
await sharp(await shot(og, 1200, 630)).jpeg({ quality: 84, mozjpeg: true }).toFile('site/assets/img/og.jpg');
const ic = await shot(icon, 512, 512);
await sharp(ic).png().toFile('site/assets/img/icon-512.png');
await sharp(ic).resize(192).png().toFile('site/assets/img/icon-192.png');
await rm('dist/_og.html');
await b.close();
console.log('wrote og.jpg + icons');
