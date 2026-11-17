// Background videos: downloads the free Pexels clips (Pexels licence, no attribution required),
// cuts seamless "boomerang" loops, strips audio, colour-grades lightly and writes small MP4 (H.264) + WebM (VP9)
// plus a WebP poster to site/assets/video/. Run once: `npm run videos` (needs ffmpeg-static).
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';

const CLIPS = [
  { name: 'galaxy', url: 'https://videos.pexels.com/video-files/34645505/14684054_1280_720_30fps.mp4', page: 'https://www.pexels.com/video/golden-glitter-particle-swirl-in-abstract-space-34645505/', w: 854, h: 480, start: 1, len: 4, crf: 35, grade: 'eq=saturation=1.05:contrast=1.05' },
  // liquid gold behind the names: slowed to half speed with motion interpolation; portrait + landscape crops so both stay sharp
  { name: 'liquidgold', url: 'https://videos.pexels.com/video-files/32106378/13687256_720_1280_25fps.mp4', page: 'https://www.pexels.com/video/golden-reflection-on-rippling-water-32106378/', start: 3, len: 2.5, slow: 2, crf: 35, mp4Only: true,
    grade: 'hqdn3d=3:3:8:8,colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=1.28:saturation=1.7:brightness=-0.05:gamma=0.95,unsharp=5:5:0.5', variants: [{ suffix: '-p', w: 720, h: 1280 }, { suffix: '-l', w: 1280, h: 720 }] },
  { name: 'roses', url: 'https://videos.pexels.com/video-files/12031326/12031326-hd_720_1280_30fps.mp4', page: 'https://www.pexels.com/video/roses-and-leaves-12031326/', w: 540, h: 960, start: 0, len: 5, grade: 'eq=saturation=0.9:brightness=-0.05' },
  { name: 'beam', url: 'https://videos.pexels.com/video-files/39513793/16833678_720_1280_24fps.mp4', page: 'https://www.pexels.com/video/ethereal-dust-particles-in-sunbeam-39513793/', w: 540, h: 960, start: 0, len: 5, grade: 'eq=contrast=1.05' },
];
const SRC = '.cache/video-src', OUT = 'site/assets/video';
await mkdir(SRC, { recursive: true });
await mkdir(OUT, { recursive: true });
const run = (args) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

for (const clip of CLIPS.filter((x) => !process.env.ONLY || x.name === process.env.ONLY)) for (const v of clip.variants || [{ suffix: '', w: clip.w, h: clip.h }]) {
  const c = { ...clip, w: v.w, h: v.h, name: clip.name + v.suffix };
  const src = `${SRC}/${clip.url.split('/').pop()}`;
  if (!existsSync(src)) {
    const r = await fetch(c.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error(`${c.url} → ${r.status}`);
    await writeFile(src, Buffer.from(await r.arrayBuffer()));
  }
  // forward + reversed = a loop with no visible jump
  const slow = c.slow ? `,setpts=${c.slow}*PTS,framerate=fps=24` : ',fps=24';
  const vf = `[0:v]trim=${c.start}:${c.start + c.len},setpts=PTS-STARTPTS${slow},scale=${c.w}:${c.h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${c.w}:${c.h},${c.grade},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]`;
  run(['-i', src, '-filter_complex', vf, '-map', '[v]', '-an', '-c:v', 'libx264', '-profile:v', 'high', '-crf', String(c.crf || 30), '-preset', 'slow', '-tune', 'film', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${OUT}/${c.name}.mp4`]);
  if (!c.mp4Only) run(['-i', src, '-filter_complex', vf, '-map', '[v]', '-an', '-c:v', 'libvpx-vp9', '-crf', String((c.crf || 30) + 10), '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', `${OUT}/${c.name}.webm`]);
  const frame = `${SRC}/${c.name}-poster.png`;
  run(['-ss', String(c.start), '-i', src, '-frames:v', '1', '-vf', `scale=${c.w}:${c.h}:force_original_aspect_ratio=increase,crop=${c.w}:${c.h},${c.grade}`, frame]);
  await sharp(frame).resize(Math.round(c.w / 2)).webp({ quality: 55 }).toFile(`${OUT}/${c.name}-poster.webp`);
  console.log('video', c.name);
}
await writeFile(`${OUT}/CREDITS.md`, '# Background video credits\n\nFree stock footage from Pexels (Pexels licence: free to use and modify, attribution not required, thanks anyway).\n\n' +
  CLIPS.map((c) => `- \`${c.name}\`: ${c.page}`).join('\n') + '\n');
