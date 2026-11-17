// Performance checks run serially (npm test runs them with one worker) so parallel tests don't skew the numbers.
import { test, expect } from '@playwright/test';

test('layout stability (CLS) and scroll smoothness', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('./?skip=1');
  await page.waitForTimeout(1500);
  const frames = await page.evaluate(async () => {
    document.documentElement.style.scrollSnapType = 'none';
    document.documentElement.style.scrollBehavior = 'auto';
    const times = [];
    let last = performance.now();
    const step = () => new Promise((r) => requestAnimationFrame((t) => { times.push(t - last); last = t; r(); }));
    for (let y = 0; y < document.body.scrollHeight; y += 120) { scrollTo(0, y); await step(); }
    return times.sort((a, b) => a - b);
  });
  const cls = await page.evaluate(() => window.__cls);
  const p95 = frames[Math.floor(frames.length * 0.95)];
  test.info().annotations.push({ type: 'metrics', description: `CLS ${cls.toFixed(4)} · p95 frame ${p95.toFixed(1)}ms over ${frames.length} frames` });
  expect(cls).toBeLessThan(0.05);
  expect(p95).toBeLessThan(50);
});

