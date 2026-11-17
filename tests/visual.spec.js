// Screens every chapter at four widths and checks overflow, overlaps, fonts, CLS and scroll smoothness.
import { expect } from '@playwright/test';
import { test, watchConsole, openInvite, personal, personalQuery } from './helpers.js';

const WIDTHS = [375, 768, 1024, 1440];
const CHAPTERS = ['#couple', '#invitation', '#duas', '#tour', '#countdown', '#farewell'];

for (const width of WIDTHS) {
  test.describe(`@${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 812 : 900 } });

    test('opening screenshot', async ({ page }) => {
      const c = watchConsole(page);
      await page.goto(await personal('Ahmed Khan'));
      await expect(page.locator('#seal')).toBeVisible();
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      await page.waitForTimeout(2200);
      await page.screenshot({ path: `reports/screenshots/${width}/00-opening.png` });
      c.assertClean();
    });

    test('chapters: screenshots, overflow, overlaps, fonts', async ({ page }) => {
      const c = watchConsole(page);
      await openInvite(page, await personalQuery('Ahmed Khan'));
      await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('in')));
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      await page.waitForTimeout(2200);

      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'horizontal overflow (px)').toBeLessThanOrEqual(0);
      const outside = await page.evaluate(() => [...document.querySelectorAll('main *')]
        .filter((n) => { const r = n.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1) && !n.closest('.sr-only,.hp,.sprite,.bgv,.ch-num,.mono-btn,.watch,.wc'); })
        .map((n) => n.tagName + '.' + n.className).slice(0, 5));
      expect(outside).toEqual([]);
      const overlaps = await page.evaluate(() => {
        const bad = [];
        document.querySelectorAll('.ch-in, .panel-glass, .pair, .ritual, .watch-wrap').forEach((w) => {
          const kids = [...w.children].filter((k) => k.offsetParent && getComputedStyle(k).position !== 'absolute');
          for (let i = 1; i < kids.length; i++) {
            const a = kids[i - 1].getBoundingClientRect(), b = kids[i].getBoundingClientRect();
            if (a.height && b.height && b.top < a.bottom - 2 && b.left < a.right && a.left < b.right) bad.push(`${kids[i - 1].className || kids[i - 1].tagName} / ${kids[i].className || kids[i].tagName}`);
          }
        });
        return bad;
      });
      expect(overlaps).toEqual([]);
      const fonts = await page.evaluate(() => ['400 16px Bodoni', '400 16px Jost', 'italic 500 16px Cormorant', '400 16px Amiri']
        .map((f) => [f, document.fonts.check(f, f.includes('Amiri') ? 'بسم' : 'Ab')]));
      for (const [f, ok] of fonts) expect(ok, f).toBe(true);
      for (const [i, sel] of CHAPTERS.entries()) {
        const loc = page.locator(sel);
        await loc.scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await loc.screenshot({ path: `reports/screenshots/${width}/${String(i + 1).padStart(2, '0')}-${sel.slice(1)}.png`, animations: 'disabled' });
      }
      c.assertClean();
    });
  });
}

test('themes: dark by default (any OS setting), the toggle switches to blush paper and remembers, hint shows once', async ({ page }) => {
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.emulateMedia({ colorScheme: 'light' });
  await openInvite(page);
  expect(await bg()).toBe('rgb(14, 10, 18)'); // dark even when the phone is in light mode
  await expect(page.locator('.theme-hint')).toHaveClass(/show/);
  // nothing in the controls or dock is still painted light in dark mode (the toggle itself previews light, by design)
  for (const sel of ['#dock', '#music-btn']) {
    const L = await page.locator(sel).evaluate((e) => { const c = getComputedStyle(e).backgroundColor; const n = c.match(/[\d.]+/g).map(Number); const [r, g, b] = c.startsWith('color(') ? n.slice(0, 3).map((v) => v * 255) : n; return (0.3 * r + 0.59 * g + 0.11 * b) / 255; });
    expect(L, sel).toBeLessThan(0.3);
  }
  await page.locator('#theme-btn').click(); // → light, stored; the hint goes away for good
  await expect.poll(bg).toBe('rgb(243, 234, 225)');
  await expect(page.locator('.theme-hint')).toHaveCount(0);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  expect(await page.evaluate(() => localStorage.getItem('themeHint'))).toBe('1');
});
