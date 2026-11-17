// XSS payloads through the URL, forms and content.json; CSP/referrer present; no console errors or broken links.
import { test, expect } from '@playwright/test';
import { watchConsole, openInvite, withContent } from './helpers.js';

const PAYLOADS = [
  '<img src=x onerror="window.__xss=1">',
  '"><script>window.__xss=1</script>',
  "'><svg/onload=window.__xss=1>",
  'javascript:window.__xss=1',
  '‮evil‬<iframe src=javascript:window.__xss=1>',
  '{{constructor.constructor("window.__xss=1")()}}',
  'A'.repeat(500),
];

async function noInjection(page) {
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  const injected = await page.evaluate(() => document.querySelectorAll('img[src="x"], main script, main iframe:not([src^="https://www.google.com/maps"]), svg[onload], [onerror], [onload]').length);
  expect(injected).toBe(0);
}

for (const p of PAYLOADS) {
  test(`?to= payload is rendered as inert text: ${p.slice(0, 24)}`, async ({ page }) => {
    let dialog = false;
    page.on('dialog', (d) => { dialog = true; d.dismiss(); });
    const c = watchConsole(page);
    await page.goto(`./?to=${encodeURIComponent(p)}`);
    await page.locator('#seal').click();
    await expect(page.locator('html')).toHaveClass(/opened/);
    await noInjection(page);
    const dear = await page.locator('#dear').textContent();
    expect(dear.length).toBeLessThanOrEqual('Dear ,'.length + 60);
    expect(dear).not.toMatch(/[<>‮]/);
    expect(await page.locator('#env-for').textContent()).not.toMatch(/[<>]/);
    expect(dialog).toBe(false);
    c.assertClean();
  });
}

test('?e= ignores unknown event ids', async ({ page }) => {
  await openInvite(page, 'e=<script>,nikah,../../etc');
  await expect(page.locator('.wtab')).toHaveCount(1);
});

test('hostile content.json values stay inert', async ({ page }) => {
  const c = watchConsole(page);
  await withContent(page, (j) => {
    j.couple.groom.name = '<img src=x onerror=window.__xss=1>';
    j.wording.memorial = '<script>window.__xss=1</script>';
    j.wording.duaLines = ['<svg onload=window.__xss=1>'];
    j.events[0].mapsUrl = 'javascript:window.__xss=1';
    j.events[0].venue = '"><svg onload=window.__xss=1>';
    j.events[0].programme = [{ time: '<b>7</b>', title: '<img src=x onerror=window.__xss=1>', note: '' }];
    j.music.src = 'javascript:alert(1)';
    j.afterparty.mapsUrl = 'javascript:window.__xss=1';
    j.dayOf = { photoAlbumUrl: 'javascript:alert(1)', parking: '<script>x</script>', note: '' };
    j.couple.hashtag = '<script>';
  });
  await openInvite(page, 'mode=day');
  await noInjection(page);
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
  for (const h of hrefs) expect(h).not.toMatch(/^s*(javascript|data):/i);
  await expect(page.locator('#music-btn')).toBeHidden();
  await expect(page.locator('#venue-nikah .big')).toHaveText('"svg onload=window.__xss=1');
  c.assertClean();
});

test('generator sanitises and URL-encodes names', async ({ page }) => {
  await page.goto('./create/');
  await page.fill('#name', '<script>alert(1)</script>&e=walima');
  const link = await page.locator('#link').textContent();
  const u = new URL(link);
  expect(u.searchParams.get('to')).toBe('scriptalert(1)/script&e=walima');
  expect(u.searchParams.getAll('e').length).toBe(0);
  await expect(page.locator('#name-err')).toContainText('removed');
});

test('admin sanitises pasted content and rejects bad URLs', async ({ page }) => {
  await page.goto('./admin/');
  await page.fill('[name="couple.groom.name"]', '<img src=x onerror=window.__xss=1>');
  await page.fill('[name="site.rsvpEndpoint"]', 'https://evil.example/collect');
  await expect(page.locator('[name="site.rsvpEndpoint"]')).toHaveAttribute('aria-invalid', 'true');
  await page.fill('[name="site.rsvpEndpoint"]', '');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
  const json = JSON.parse(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8'));
  expect(json.couple.groom.name).toBe('img src=x onerror=window.__xss=1');
  await expect(page.frameLocator('#preview').locator('#groom-name')).toHaveText('img src=x onerror=window.__xss=1');
  expect(await page.frameLocator('#preview').locator('body').evaluate(() => window.__xss)).toBeUndefined();
});

test('afterparty name field cannot inject markup', async ({ page }) => {
  await openInvite(page);
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(k);
  await page.fill('#ah-name', '<img src=x onerror=window.__xss=1>');
  await page.click('#ah-add');
  await expect(page.locator('#ah-msg')).toContainText('img src=x');
  await noInjection(page);
});

for (const path of ['./', './create/', './admin/', './dashboard/']) {
  test(`security headers + clean console + links on ${path}`, async ({ page, request }) => {
    const c = watchConsole(page);
    await page.goto(path);
    await page.waitForTimeout(800);
    const csp = await page.locator('meta[http-equiv=Content-Security-Policy]').getAttribute('content');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    expect(await page.locator('meta[name=referrer]').count()).toBe(1);
    expect(await page.evaluate(() => document.documentElement.innerHTML.includes('__CSP__'))).toBe(false);
    const urls = await page.evaluate(() => [...document.querySelectorAll('a[href], link[href], script[src], img[src]')]
      .map((n) => n.href || n.src).filter((u) => u.startsWith(location.origin)));
    for (const u of new Set(urls)) {
      const r = await request.get(u.split('#')[0]);
      expect(r.status(), u).toBe(200);
    }
    c.assertClean();
  });
}
