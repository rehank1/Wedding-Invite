// Side-by-side screenshots of the invite vs the Ramadan app (design-DNA source) to confirm they look distinct.
// Clones github.com/rehank1/Ramadan-App-2026 into .cache/ (gitignored). Needs a server on :4173.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const repo = '.cache/ramadan';
if (!existsSync(repo)) execFileSync('git', ['clone', '--depth', '1', 'https://github.com/rehank1/Ramadan-App-2026', repo], { stdio: 'inherit' });
await mkdir('reports/compare', { recursive: true });
const ramadanUrl = pathToFileURL(resolve(repo, 'index.html')).href;
const b = await chromium.launch();
const out = [];
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const shots = [];
  for (const [name, url] of [['ramadan', ramadanUrl], ['invite-envelope', 'http://localhost:4173/'], ['invite-card', 'http://localhost:4173/?skip=1']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(url, { waitUntil: 'load' }).catch(() => {});
    await p.waitForTimeout(2500);
    const png = await p.screenshot();
    await p.close();
    // palette fingerprint: 4×4×4 colour histogram
    const { data } = await sharp(png).resize(64, 64, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    const hist = new Array(64).fill(0);
    for (let i = 0; i < data.length; i += 3) hist[(data[i] >> 6) * 16 + (data[i + 1] >> 6) * 4 + (data[i + 2] >> 6)]++;
    shots.push({ name, png, hist: hist.map((v) => v / (data.length / 3)) });
  }
  const gap = 24, label = 0;
  const composite = shots.map((s, i) => ({ input: s.png, left: i * (w + gap), top: label }));
  await sharp({ create: { width: shots.length * w + gap * (shots.length - 1), height: h, channels: 3, background: '#777' } })
    .composite(composite).png().toFile(`reports/compare/side-by-side-${w}.png`);
  const overlap = (a, c) => a.reduce((s, v, i) => s + Math.min(v, c[i]), 0); // 1 = identical palettes
  for (const s of shots.slice(1)) out.push({ width: w, vs: s.name, paletteOverlapWithRamadan: +overlap(shots[0].hist, s.hist).toFixed(3) });
}
await b.close();
console.table(out);
await writeFile('reports/compare/summary.json', JSON.stringify(out, null, 2));
