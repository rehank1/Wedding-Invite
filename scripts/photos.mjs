// Photo pipeline: makes AVIF + WebP srcsets and a tiny blur-up placeholder for every photo
// in <dir>/content/photos (hero.*, gallery/*, story/*) and writes <dir>/content/photos/manifest.json.
// Usage: node scripts/photos.mjs [dir=dist]
import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { join, relative, parse, posix } from 'node:path';
import sharp from 'sharp';

const WIDTHS = [480, 960, 1600];
const IMG = /\.(jpe?g|png|webp|avif)$/i;

export async function buildPhotos(dir = 'dist') {
  const base = join(dir, 'content', 'photos');
  const out = join(base, '_gen');
  const files = [];
  const walk = async (d) => {
    for (const ent of await readdir(d, { withFileTypes: true }).catch(() => [])) {
      if (ent.name.startsWith('_') || ent.name.startsWith('.')) continue;
      const p = join(d, ent.name);
      if (ent.isDirectory()) await walk(p);
      else if (IMG.test(ent.name)) files.push(p);
    }
  };
  await walk(base);
  await mkdir(out, { recursive: true });
  const manifest = {};
  for (const file of files) {
    const key = relative(dir, file).split('\\').join('/');
    const slug = relative(base, file).split('\\').join('-').replace(/\.[^.]+$/, '');
    const img = sharp(file).rotate();
    const { width, height } = await img.metadata();
    const widths = WIDTHS.filter((w) => w < width).concat(Math.min(width, 2000)).filter((v, i, a) => a.indexOf(v) === i);
    const set = { avif: [], webp: [] };
    for (const w of widths) {
      for (const fmt of ['avif', 'webp']) {
        const name = `${slug}-${w}.${fmt}`;
        const target = join(out, name);
        if (!(await stat(target).catch(() => null))) {
          await sharp(file).rotate().resize(w).toFormat(fmt, fmt === 'avif' ? { quality: 50 } : { quality: 74 }).toFile(target);
        }
        set[fmt].push(`${posix.join('content/photos/_gen', name)} ${w}w`);
      }
    }
    const blur = await sharp(file).rotate().resize(24).webp({ quality: 40 }).toBuffer();
    const mid = widths.find((w) => w >= 960) || widths.at(-1);
    manifest[key] = {
      width: Math.min(width, 2000), height: Math.round((height * Math.min(width, 2000)) / width),
      avif: set.avif.join(', '), webp: set.webp.join(', '),
      fallback: `content/photos/_gen/${slug}-${mid}.webp`,
      large: `content/photos/_gen/${slug}-${widths.at(-1)}.webp`,
      blur: `data:image/webp;base64,${blur.toString('base64')}`,
    };
    console.log('photo', key, widths.join('/'));
  }
  await writeFile(join(base, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

if (process.argv[1] && parse(process.argv[1]).name === 'photos') await buildPhotos(process.argv[2] || 'dist');
