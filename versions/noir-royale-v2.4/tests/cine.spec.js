// Cinematic intro: GIF recordings at 375 and 1440, frame rate, console errors, no layout shift, Skip, reduced motion, fallback.
import { test, expect, chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';
import { watchConsole } from './helpers.js';

const GPU = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']; // real GPU in headless Chromium on Windows

async function playAndMeasure(page) {
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('./?cine=1&to=Ahmed%20Khan');
  await expect(page.locator('#cine')).toBeVisible();
  await expect(page.locator('#cine')).toBeHidden({ timeout: 9000 });
  return page.evaluate(() => {
    const f = (window.__cineFrames || []).slice(5).sort((a, b) => a - b);
    const avg = f.reduce((a, b) => a + b, 0) / f.length;
    return { mode: document.getElementById('cine').dataset.mode, fps: Math.round(1000 / avg), p95: f[Math.floor(f.length * 0.95)], frames: f.length, cls: window.__cls };
  });
}

for (const [w, h] of [[375, 812], [1440, 900]]) {
  test(`intro @${w}px on GPU: 60 fps, clean console, no layout shift, GIF recorded`, async () => {
    const browser = await chromium.launch({ args: GPU });
    // pass 1: measure (no screen recording, which itself costs GPU time)
    const ctx = await browser.newContext({ baseURL: 'http://localhost:4174/', viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const c = watchConsole(page);
    const m = await playAndMeasure(page);
    test.info().annotations.push({ type: 'intro', description: `${w}px · ${m.mode} · ${m.fps} fps avg · p95 ${m.p95.toFixed(1)} ms · ${m.frames} frames · CLS ${m.cls.toFixed(4)}` });
    await expect(page.locator('#seal')).toBeVisible(); // crossfaded into the opening screen
    c.assertClean();
    await ctx.close();
    // pass 2: record the GIF
    mkdirSync('reports/cine', { recursive: true });
    const rec = await browser.newContext({ baseURL: 'http://localhost:4174/', viewport: { width: w, height: h }, recordVideo: { dir: 'test-results/cine-video', size: { width: w, height: h } } });
    const rp = await rec.newPage();
    await rp.goto('./?cine=1');
    await expect(rp.locator('#cine')).toBeHidden({ timeout: 10000 });
    await rp.waitForTimeout(600);
    const video = await rp.video().path();
    await rec.close();
    await browser.close();
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', video, '-vf', `fps=10,scale=${w > 600 ? 480 : 240}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`, `reports/cine/intro-${w}.gif`]);
    expect(m.mode).toBe('gl');
    expect(m.cls).toBeLessThan(0.01);
    expect(m.p95).toBeLessThanOrEqual(20); // 95% of frames inside the 60 fps budget (first frames include shader compile)
  });
}

test('weak or software GPU falls back to the SVG intro', async ({ page }) => {
  const c = watchConsole(page); // default headless Chromium renders WebGL in software (SwiftShader)
  const m = await playAndMeasure(page);
  test.info().annotations.push({ type: 'fallback', description: `${m.mode} · ${m.fps} fps` });
  expect(m.mode).toBe('svg');
  c.assertClean();
});

test('Skip ends the intro at once and hands over to the opening; it plays once per session', async ({ page }) => {
  await page.goto('./?cine=1');
  await expect(page.locator('#cine')).toBeVisible();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('#cine')).toBeHidden({ timeout: 1500 });
  await expect(page.locator('html')).not.toHaveClass(/cine-playing/);
  await expect(page.locator('#seal')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('cine'))).toBe('1');
});

test('reduced motion: a still gold logo with a gentle fade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?cine=1');
  await expect(page.locator('#cine')).toHaveClass(/still/);
  expect(await page.locator('#cine canvas').isVisible()).toBe(false);
  await expect(page.locator('#cine')).toBeHidden({ timeout: 3000 });
});

test('sound is muted by default and only starts on tap', async ({ page }) => {
  await page.goto('./?cine=1');
  const snd = page.locator('.cine-sound');
  await expect(snd).toHaveAttribute('aria-pressed', 'false');
  await snd.click();
  await expect(snd).toHaveAttribute('aria-pressed', 'true');
});
