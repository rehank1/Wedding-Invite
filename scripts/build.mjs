// Build: copy site/ → dist/, run the photo pipeline, inline critical CSS, stamp CSP hashes + site URL.
import { cp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { buildPhotos } from './photos.mjs';
import subsetFont from 'subset-font';

const SRC = 'site', OUT = 'dist';
await rm(OUT, { recursive: true, force: true });
await cp(SRC, OUT, { recursive: true });
await buildPhotos(OUT);

const content = JSON.parse(await readFile(join(SRC, 'content', 'content.json'), 'utf8'));
let siteUrl = String(content.site?.url || '').trim();
if (siteUrl && !/^https:\/\//.test(siteUrl)) throw new Error('site.url must start with https://');
if (siteUrl && !siteUrl.endsWith('/')) siteUrl += '/';

// Amiri is only used for Arabic lines: subset it to exactly the characters in content.json (75KB → a few KB).
{
  const arabic = [...new Set(JSON.stringify(content).match(/[؀-ۿﭐ-﷿ﹰ-﻿]/g) || [])].join('') + ' ‌‍';
  const full = await readFile('node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff2').catch(() => null);
  if (full) {
    const buf = await subsetFont(full, arabic, { targetFormat: 'woff2' });
    await writeFile(join(OUT, 'assets/fonts/amiri-400.woff2'), buf);
    console.log('amiri subset', arabic.length, 'chars,', buf.length, 'bytes');
  }
}

const minCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s{2,}/g, ' ');
const policy = (styleHashes) => [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com",
  `style-src 'self' ${styleHashes.join(' ')}`.trim(),
  "img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com",
  "font-src 'self'",
  "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
  "frame-src 'self' https://www.google.com https://lookerstudio.google.com",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ');

async function htmlFiles(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

for (const file of await htmlFiles(OUT)) {
  let html = await readFile(file, 'utf8');
  // <!--INLINE:assets/css/x.css--> → <style>…</style> (paths relative to this html file)
  const inl = [...html.matchAll(/<!--INLINE:([\w/.-]+)-->/g)];
  for (const [tag, rel] of inl) {
    const cssPath = join(dirname(file), rel);
    const cssDir = dirname(rel);
    const css = minCss(await readFile(cssPath, 'utf8')).replace(/url\(\.\.\//g, `url(${dirname(cssDir)}/`.replace(/^\.\//, ''));
    html = html.replace(tag, `<style>${css}</style>`);
  }
  html = html.replace(/<!--INLINE-JOIN-->/g, '');
  const hashes = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(([, css]) => `'sha256-${createHash('sha256').update(css).digest('base64')}'`);
  html = html.replace('__CSP__', policy([...new Set(hashes)])).replaceAll('__SITE_URL__', siteUrl);
  await writeFile(file, html);
  console.log('built', file.replace(/\\/g, '/'), `${(Buffer.byteLength(html) / 1024).toFixed(1)}KB`);
}
