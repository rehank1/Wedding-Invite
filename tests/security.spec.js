// XSS payloads through the URL, forms and content.json; CSP/referrer present; no console errors or broken links.
import { expect } from '@playwright/test';
import { test, watchConsole, openInvite, withContent, personal, decodeLink } from './helpers.js';

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
  test(`signed name payload is rendered as inert text: ${p.slice(0, 24)}`, async ({ page }) => {
    let dialog = false;
    page.on('dialog', (d) => { dialog = true; d.dismiss(); });
    const c = watchConsole(page);
    await page.goto(await personal(p));
    await page.locator('#seal').click();
    await expect(page.locator('html')).toHaveClass(/opened/, { timeout: 12000 });
    await noInjection(page);
    const dear = await page.locator('#dear').textContent();
    expect(dear.length).toBeLessThanOrEqual('Dear ,'.length + 60);
    expect(dear).not.toMatch(/[<>‮]/);
    expect(await page.locator('#env-for').textContent()).not.toMatch(/[<>]/);
    expect(dialog).toBe(false);
    c.assertClean();
  });
}

test('personalised names: tags are dropped whole, and one long unbroken word wraps on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(await personal('Mr & Mrs Shaikh <b>Ali</b>'));
  await expect(page.locator('#env-for')).toHaveText(/Mr & Mrs Shaikh Ali/);
  await page.goto(await personal('Supercalifragilisticexpialidociousnessbutlonger'));
  const fits = await page.locator('#env-for').evaluate((e) => e.getBoundingClientRect().right <= innerWidth && e.scrollWidth <= e.clientWidth + 1);
  expect(fits).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  // the footer credit logo loads on personalised links too
  await page.locator('#env-skip').click();
  await page.locator('.made-by').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.made-by img').first().evaluate((i) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
});

test('personal links: the name is never in the URL, an edited code or a plain ?to= shows no name, and the address bar is tidied', async ({ page }) => {
  const good = await personal('Saima Sayyad', ['nikah']);
  expect(decodeURIComponent(good)).not.toMatch(/saima/i);
  await page.goto(good);
  await expect(page.locator('#env-for')).toHaveText('For Saima Sayyad');
  await expect(page).toHaveURL(/\/$/); // code removed from the address bar
  await expect(page).toHaveTitle(/Nikah$/);
  await page.reload(); // still personal after a reload (kept for this tab)
  await expect(page.locator('#env-for')).toHaveText('For Saima Sayyad');
  const i = new URL(good, 'http://x').searchParams.get('i');
  const edited = i.slice(0, 8) + (i[8] === 'A' ? 'B' : 'A') + i.slice(9);
  for (const url of [`./?i=${edited}`, './?to=Someone%20Else&e=nikah']) {
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(url);
    await expect(page.locator('#env-for')).toHaveText('');
    await expect(page).toHaveTitle(/Nikah & Reception/);
    await expect(page).toHaveURL(/\/$/);
  }
});

test('signed event list: unknown ids are dropped, and a plain ?e= is ignored', async ({ page }) => {
  await openInvite(page, (await personal('', ['<script>', 'nikah', '../../etc'])).slice(3));
  await expect(page.locator('.wtab')).toHaveCount(1);
  await page.evaluate(() => sessionStorage.clear());
  await openInvite(page, 'e=nikah'); // unsigned: can't narrow (or widen) a guest's invitation
  await expect(page.locator('.wtab')).toHaveCount(2);
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
  await expect(page.locator('#venue-nikah .big')).toHaveText('"');
  c.assertClean();
});

test('generator sanitises and URL-encodes names', async ({ page }) => {
  await page.goto('./create/');
  await page.fill('#name', '<script>alert(1)</script>&e=walima');
  const link = await page.locator('#link').textContent();
  expect(new URL(link).searchParams.has('to')).toBe(false);
  expect(await decodeLink(link)).toEqual({ to: 'alert(1)&e=walima', events: ['nikah', 'walima'] });
  await expect(page.locator('#name-err')).toContainText('removed');
});

test('admin sanitises pasted content and rejects bad URLs', async ({ page }) => {
  await page.goto('./admin/');
  await page.fill('[name="couple.groom.name"]', '<img src=x onerror=window.__xss=1>Rehan');
  await page.fill('[name="site.rsvpEndpoint"]', 'https://evil.example/collect');
  await expect(page.locator('[name="site.rsvpEndpoint"]')).toHaveAttribute('aria-invalid', 'true');
  await page.fill('[name="site.rsvpEndpoint"]', '');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
  const json = JSON.parse(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8'));
  expect(json.couple.groom.name).toBe('Rehan');
  await expect(page.frameLocator('#preview').locator('#groom-name')).toHaveText('Rehan');
  expect(await page.frameLocator('#preview').locator('body').evaluate(() => window.__xss)).toBeUndefined();
});

test('afterparty name field cannot inject markup', async ({ page }) => {
  await openInvite(page);
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(k);
  await page.fill('#ah-name', '<img src=x onerror=window.__xss=1>Zara');
  await page.click('#ah-add');
  await expect(page.locator('#ah-msg')).toContainText('Zara');
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
