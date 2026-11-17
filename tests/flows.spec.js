// End-to-end guest and host flows for the chapter tour.
import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test, watchConsole, openInvite, withContent, ENDPOINT, personal, personalQuery, decodeLink, useTestKey } from './helpers.js';
import { hashPass, loginKey, checkPass } from '../site/assets/js/core.js';
import * as helpers from './helpers.js';

test('opening: the envelope film plays on tap and dissolves into the couple, focus lands on names', async ({ page }) => {
  const c = watchConsole(page);
  await page.goto(await personal('Ahmed Khan'));
  await expect(page.locator('#env-for')).toHaveText('For Ahmed Khan');
  await expect(page.locator('#main')).toHaveJSProperty('inert', true);
  await page.evaluate(() => {
    document.getElementById('seal').addEventListener('click', () => { window.__t0 = performance.now(); }, { capture: true });
    new MutationObserver(() => { if (document.documentElement.classList.contains('opened')) window.__t1 ??= performance.now(); }).observe(document.documentElement, { attributes: true });
  });
  await page.locator('#seal').click();
  await expect(page.locator('#envelope')).toHaveClass(/playing/);
  await expect(page.locator('html')).toHaveClass(/opened/, { timeout: 12000 });
  const ms = await page.evaluate(() => window.__t1 - window.__t0);
  test.info().annotations.push({ type: 'opening', description: `${ms.toFixed(0)}ms` });
  expect(ms).toBeLessThan(10500); // the film is 7.9 s; it dissolves as the light peaks (or a plain fade if it can't load in 1.5 s)
  await expect(page.locator('#envelope')).toBeHidden();
  await expect(page.locator('#names')).toBeFocused();
  await expect(page.locator('#dear')).toHaveText('Dear Ahmed Khan,');
  c.assertClean();
});

test('opening: skip, Escape and reduced motion', async ({ page }) => {
  await page.goto('./');
  await page.locator('#env-skip').click();
  await expect(page.locator('#envelope')).toBeHidden();
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('./');
  await page.locator('#seal').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveClass(/opened/, { timeout: 12000 });
  await page.evaluate(() => sessionStorage.clear());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.locator('#seal').press('Enter');
  await expect(page.locator('html')).toHaveClass(/opened/, { timeout: 300 });
});

test('generator → invite shows only the chosen celebration', async ({ page, context }) => {
  const c = watchConsole(page);
  await page.goto('./create/');
  await page.selectOption('#hon', 'Janab');
  await page.fill('#name', 'Imran Shaikh');
  await page.locator('#events input[value=walima]').uncheck();
  const link = page.locator('#link');
  await expect(link).toContainText('?i=');
  await expect(link).not.toContainText('Imran'); // the name never shows in the link
  expect(await decodeLink(await link.textContent())).toEqual({ to: 'Janab Imran Shaikh', events: ['nikah'] });
  await expect(page.locator('#wa')).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=.*Janab%20Imran%20Shaikh/);
  const dark = await page.evaluate(() => { const d = document.getElementById('qr').getContext('2d').getImageData(0, 0, 400, 400).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 100) n++; return n; });
  expect(dark).toBeGreaterThan(500);
  await expect(page.frameLocator('#preview').locator('#dear')).toHaveText('Dear Janab Imran Shaikh,', { timeout: 6000 });
  const href = await link.textContent();
  const guest = await context.newPage();
  await guest.goto(href.replace(/^http:\/\/localhost:\d+\//, './') + '&skip=1');
  await expect(guest.locator('.wtab')).toHaveCount(1);
  await expect(guest.locator('.watch-tabs')).toBeHidden();
  await expect(guest.locator('#venue-nikah')).toBeAttached();
  await expect(guest.locator('#request')).toContainText('the Nikah of their beloved son.');
  c.assertClean();
});

test('duas: choose, sign in gold, press the seal; it lands in the chest and reaches the Sheet', async ({ page }) => {
  const c = watchConsole(page);
  await withContent(page, (j) => { j.site.rsvpEndpoint = ENDPOINT; });
  let body = null;
  await page.route(ENDPOINT + '**', async (r) => {
    if (r.request().method() === 'GET') return r.fulfill({ json: { ok: true, duas: 41 } });
    body = JSON.parse(r.request().postData());
    await r.fulfill({ json: { ok: true } });
  });
  await openInvite(page, await personalQuery('Sana Ali'));
  await page.evaluate(() => document.getElementById('letter').scrollIntoView({ block: 'center' }));
  await expect(page.locator('#chest-count')).toHaveText('41');
  await page.locator('#dua-choices label', { hasText: 'peace' }).click();
  await expect(page.locator('#dua-chosen')).toContainText('source of peace');
  const b = await page.locator('#sign-canvas').boundingBox();
  await page.mouse.move(b.x + 40, b.y + 60);
  await page.mouse.down();
  for (let i = 0; i < 30; i++) await page.mouse.move(b.x + 40 + i * 6, b.y + 55 + Math.sin(i / 3) * 18);
  await page.mouse.up();
  await expect(page.locator('#duas')).toHaveClass(/signed/);
  await page.click('#seal-btn');
  await expect(page.locator('#dua-sent')).toContainText('Sealed and delivered');
  await expect(page.locator('#chest-count')).toHaveText('42');
  expect(body).toEqual({ kind: 'dua', invitee: 'Sana Ali', dua: 'May your love be a source of peace, and your home a place of tranquillity.', signed: true, website: '' });
  await expect(page.locator('#seal-btn')).toHaveText('Seal another');
  c.assertClean();
});

test('duas: own words, keyboard only, signature optional', async ({ page }) => {
  await openInvite(page);
  await page.locator('#dua-choices input[value="__own__"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#dua-own')).toBeVisible();
  await page.fill('#dua-own', '');
  await page.click('#seal-btn');
  await expect(page.locator('#dua-sent')).toContainText('Write a few words');
  await page.fill('#dua-own', 'Ameen <b>ya Rabb</b>');
  await expect(page.locator('#dua-chosen')).toHaveText('“Ameen ya Rabb”');
  await page.locator('#seal-btn').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#dua-sent')).toContainText('Sealed and delivered');
});

test('the evening: pocket watch hand moves by tap, keyboard and drag; tabs switch celebrations', async ({ page }) => {
  const c = watchConsole(page);
  await openInvite(page);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.documentElement.style.scrollSnapType = 'none'; document.querySelector('.watch-face').scrollIntoView({ block: 'center', behavior: 'instant' }); });
  const face = page.locator('.watch-face');
  await expect(page.locator('.jewel')).toHaveCount(3);
  await expect(face).toHaveAttribute('aria-valuetext', '7:00 PM, Guests arrive');
  await expect(page.locator('.readout .time')).toHaveText('7:00 PM');
  await page.locator('.jewel').nth(2).click();
  await expect(page.locator('.readout .what')).toHaveText('Dinner');
  await face.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(face).toHaveAttribute('aria-valuenow', '2');
  await expect(page.locator('.readout .what')).toHaveText('The Nikah');
  await page.keyboard.press('Home');
  await expect(face).toHaveAttribute('aria-valuenow', '1');
  await page.click('.w-next');
  await expect(face).toHaveAttribute('aria-valuenow', '2');
  // drag the hand round to about X o'clock (300°): the nearest moment is "Dinner" (290°)
  await page.evaluate(() => document.querySelector('.watch-face').scrollIntoView({ block: 'center', behavior: 'instant' }));
  const r = await face.boundingBox();
  const R = r.width * 0.35, cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  await page.mouse.move(cx, cy - R);
  await page.mouse.down();
  await page.mouse.move(cx - 0.866 * R, cy - 0.5 * R, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.readout .what')).toHaveText('Dinner');
  await page.locator('.wtab', { hasText: 'Reception' }).click();
  await expect(page.locator('.wtab', { hasText: 'Reception' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.watch-date')).toContainText('Saturday, 19 December 2026');
  await expect(page.locator('.readout .what')).toHaveText('Guests arrive');
  await expect(page.locator('.venue')).toHaveAttribute('id', 'venue-walima');
  c.assertClean();
});

test('the evening: venue panel has a lazy sandboxed map, directions, calendar (.ics + Google)', async ({ page }) => {
  await page.route('https://www.google.com/maps**', (r) => r.fulfill({ body: '<!doctype html><title>map</title>', contentType: 'text/html' }));
  await openInvite(page);
  const venue = page.locator('#venue-nikah');
  await expect(venue.locator('iframe')).toHaveCount(0);
  await venue.getByRole('button', { name: 'View map' }).click();
  await expect(venue.locator('iframe')).toHaveAttribute('sandbox', /allow-scripts/);
  await expect(venue.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.google\.com\/maps\?q=Krishna%20Lawns.*output=embed$/);
  await expect(venue.getByRole('link', { name: 'Directions' })).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Krishna/);
  const [dl] = await Promise.all([page.waitForEvent('download'), venue.getByRole('button', { name: 'Add to calendar' }).click()]);
  expect(dl.suggestedFilename()).toBe('nikah.ics');
  const ics = await readFile(await dl.path(), 'utf8');
  expect(ics).toContain('DTSTART:20261218T133000Z');
  expect(await venue.getByRole('link', { name: 'Google Calendar' }).getAttribute('href')).toContain('dates=20261218T133000Z%2F20261218T173000Z');
});

test('dock: Directions, Calendar and Next chapter; rail tracks the chapter', async ({ page }) => {
  await openInvite(page);
  const dock = page.locator('#dock');
  await expect(dock).toBeVisible();
  await expect(dock.getByRole('link', { name: /Directions/ })).toHaveAttribute('href', /Krishna/);
  const [dl] = await Promise.all([page.waitForEvent('download'), dock.getByRole('button', { name: /Calendar/ }).click()]);
  expect(dl.suggestedFilename()).toBe('nikah.ics');
  await expect(page.locator('#rail a')).toHaveCount(6);
  await dock.getByRole('button', { name: 'Next chapter' }).click();
  await expect(page.locator('#rail a[href="#invitation"]')).toHaveClass(/active/, { timeout: 4000 });
});

test('countdown flips and the gold foil scratches away', async ({ page }) => {
  const c = watchConsole(page);
  await openInvite(page);
  await page.locator('#countdown').scrollIntoViewIfNeeded();
  const sec = page.locator('#flips .unit').nth(3).locator('.sr-only');
  await expect(sec).not.toHaveText('');
  const a = await sec.textContent();
  await page.waitForTimeout(1200);
  expect(await sec.textContent()).not.toBe(a);
  await expect(page.locator('#scratch-date')).toHaveText('Friday 18 December 2026');
  const canvas = page.locator('#scratch-canvas');
  await expect.poll(() => canvas.evaluate((n) => n.width)).toBeGreaterThan(0);
  const b = await canvas.boundingBox();
  await page.mouse.move(b.x + 5, b.y + 5);
  await page.mouse.down();
  for (let y = 6; y < b.height; y += 16) { await page.mouse.move(b.x + 4, b.y + y, { steps: 2 }); await page.mouse.move(b.x + b.width - 4, b.y + y, { steps: 6 }); }
  await page.mouse.up();
  await expect(canvas).toHaveClass(/done/);
  c.assertClean();
});

test('easter egg: 7 quiet taps on the closing monogram, then afterparty sign-up with picks', async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  await useTestKey(ctx);
  const page = await ctx.newPage();
  const c = watchConsole(page);
  await withContent(page, (j) => { j.site.rsvpEndpoint = ENDPOINT; });
  let body = null;
  await page.route(ENDPOINT, async (r) => { body = JSON.parse(r.request().postData()); await r.fulfill({ json: { ok: true } }); });
  await openInvite(page, await personalQuery('Party Person'));
  const crest = page.locator('#farewell #crest-btn');
  await crest.scrollIntoViewIfNeeded();
  // wait for the reveal animation to settle, so every tap lands on the same spot
  let cb = null;
  await expect.poll(async () => { const b = await crest.boundingBox(); const same = cb && Math.abs(b.y - cb.y) < 0.5; cb = b; return same; }, { intervals: [250] }).toBe(true);
  const tap = () => page.touchscreen.tap(cb.x + cb.width / 2, cb.y + cb.height / 2);
  for (let i = 0; i < 6; i++) await tap();
  await expect(page.locator('#afterhours')).toBeHidden(); // 6 is not enough
  await tap();
  await expect(page.locator('#afterhours')).toBeVisible();
  await expect(page.locator('#ah-card')).toHaveClass(/flipped/);
  await expect(page.locator('#ah-note')).toContainText("The host doesn't drink");
  await expect(page.locator('#ah-name')).toHaveValue('Party Person');
  await page.locator('#ah-hype').fill('10');
  await page.fill('#ah-head', '2');
  await page.locator('label.pick', { hasText: 'Shroom' }).tap();
  await page.locator('label.pick', { hasText: 'Open to anything' }).tap();
  await expect(page.locator('label.pick', { hasText: 'Open to anything' })).toContainText('temple is under renovation');
  await page.locator('#ah-add').tap();
  await expect(page.locator('#ah-msg')).toContainText("You're on the list");
  expect(body).toEqual({ kind: 'afterparty', name: 'Party Person', invitee: 'Party Person', website: '', hype: 10, headcount: 2, picks: ['shroom', 'anything'] });
  c.assertClean();
  await ctx.close();
});

test('easter egg: Konami code opens it; Escape closes; typing in a field does not', async ({ page }) => {
  await openInvite(page);
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  for (const k of code) await page.keyboard.press(k);
  await expect(page.locator('#afterhours')).toBeVisible();
  await expect(page.locator('#ah-hype')).toBeFocused({ timeout: 2000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('#afterhours')).toBeHidden();
});

test('time-aware phases: week, day (Today card) and after', async ({ page }) => {
  await openInvite(page, 'mode=week');
  await expect(page.locator('#hero-phase')).toHaveText('See you on Friday, InshaAllah');
  await openInvite(page, 'mode=day');
  await expect(page.locator('#today')).toBeVisible();
  await expect(page.locator('#today .today-item').first()).toContainText('Nikah');
  await expect(page.locator('#countdown')).toBeHidden();
  await openInvite(page, 'mode=after');
  await expect(page.locator('#hero-phase')).toHaveText('Thank you for celebrating with us');
  await expect(page.locator('#countdown')).toBeHidden();
  await expect(page.locator('#rail a')).toHaveCount(5);
});

test('first page: the envelope film waits on its poster, names over a legible veil, no WebGL', async ({ page }) => {
  const c = watchConsole(page);
  await page.goto(await personal('Ahmed Khan'));
  const film = page.locator('#env-film');
  await expect(film).toHaveAttribute('poster', /envelope-poster/);
  expect(await film.evaluate((v) => v.paused && v.muted)).toBe(true); // nothing plays until the guest taps
  await expect(page.locator('#env-names')).toBeVisible();
  expect(await page.evaluate(() => [...document.querySelectorAll('canvas')].some((c) => c.getContext('2d') === null))).toBe(false);
  c.assertClean();
});

test('admin: edit, validate, add a tour stop, download content.json', async ({ page }) => {
  const c = watchConsole(page);
  await page.goto('./admin/');
  await expect(page.locator('#editor fieldset').first()).toBeVisible();
  await page.fill('[name="couple.hashtag"]', 'RehanWedsSiddiqua');
  await expect(page.frameLocator('#preview').locator('#f-hashtag')).toHaveText('#RehanWedsSiddiqua', { timeout: 6000 });
  const maps = page.locator('[name="events.mapsUrl"]').first();
  await maps.fill('javascript:alert(1)');
  await expect(maps).toHaveAttribute('aria-invalid', 'true');
  await page.click('#dl');
  await expect(page.locator('#status')).toContainText('Fix 1 highlighted field');
  await maps.fill('https://maps.app.goo.gl/example');
  await page.getByRole('button', { name: 'Add programme' }).first().click();
  await page.locator('[name="events.programme.title"]').nth(3).fill('Dessert by the fountain');
  await page.fill('#newuser-admin', 'rehan');
  await page.fill('#newpass-admin', 'correct horse');
  await page.getByRole('button', { name: 'Set Admin login' }).click();
  await expect(page.getByText('Login set.')).toBeVisible(); // the salted hash takes a moment
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
  const json = JSON.parse(await readFile(await dl.path(), 'utf8'));
  expect(json.couple.hashtag).toBe('RehanWedsSiddiqua');
  expect(json.events[0].mapsUrl).toBe('https://maps.app.goo.gl/example');
  expect(json.events[0].programme[3].title).toBe('Dessert by the fountain');
  expect(await checkPass(loginKey('Rehan', 'correct horse'), json.site.adminLogin)).toBe(true);
  expect(json.site.adminLogin).toMatch(/^pbkdf2\$\d+\$[\w-]+\$[\w-]+$/);
  c.assertClean();
});

test('login: separate Create and Admin logins; Admin has Dashboard and Content tabs; Create stays separate', async ({ page }) => {
  const createLogin = await hashPass(loginKey('Create', 'a test password')); // as `npm run login -- create Create "…"` makes
  const adminLogin = await hashPass(loginKey('Admin', 'a test password'));
  await withContent(page, (j) => { j.site.createLogin = createLogin; j.site.adminLogin = adminLogin; });
  const signIn = async (user, pass) => { await page.fill('#user', user); await page.fill('#pass', pass); await page.click('#go'); };
  for (const [path, next, landing] of [['./create/', 'create', /\/create\/$/], ['./admin/', 'content', /\/admin\/$/], ['./dashboard/', 'dashboard', /\/dashboard\/$/]]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login/\\?next=${next}$`)); // nothing renders before signing in
    const mine = next === 'create' ? 'Create' : 'Admin', other = next === 'create' ? 'Admin' : 'Create';
    await signIn(mine, 'wrong password');
    await expect(page.locator('#login-msg')).toContainText('did not match');
    await signIn(other, 'a test password'); // the other area's login doesn't open this one
    await expect(page.locator('#login-msg')).toContainText('did not match');
    await signIn(` ${mine.toUpperCase()} `, 'a test password'); // the username isn't case-sensitive
    await expect(page).toHaveURL(landing);
    await expect(page.locator('body')).toHaveClass(/\bin\b/);
    await expect(page.locator('#signout')).toBeVisible();
    expect(await page.locator('meta[name=robots]').getAttribute('content')).toContain('noindex');
    if (next === 'create') {
      // Create is separate: no way to Admin from here
      expect(await page.locator('a[href*="admin"], a[href*="dashboard"]').count()).toBe(0);
    } else {
      // Admin: exactly the two tabs, and never a link to Create
      await expect(page.locator('.admin-tabs a')).toHaveText(['Dashboard', 'Content']);
      await expect(page.locator('.admin-tabs a[aria-current=page]')).toHaveText(next === 'content' ? 'Content' : 'Dashboard');
      expect(await page.locator('a[href*="create"]').count()).toBe(0);
    }
    await page.click('#signout');
    await expect(page).toHaveURL(/\/login\/$/);
  }
  // signing in to "admin" opens on the Dashboard tab; the Content tab is one click away
  await page.goto('./login/?next=admin');
  await signIn('Admin', 'a test password');
  await expect(page).toHaveURL(/\/dashboard\/$/);
  await page.click('.admin-tabs a:text("Content")');
  await expect(page).toHaveURL(/\/admin\/$/);
  await expect(page.locator('body')).toHaveClass(/\bin\b/);
});

test('no signing-key box: signing in to Create unlocks personal links; a wrong login unlocks nothing', async ({ page }) => {
  const { TEST_PRIV, sealKey: seal, hashPass: hp, loginKey: lk } = helpers;
  const createLogin = await hp(lk('Create', 'a test password'));
  const createSeal = await seal(lk('Create', 'a test password'), TEST_PRIV);
  await withContent(page, (j) => { j.site.createLogin = createLogin; j.site.createSeal = createSeal; });
  await page.addInitScript(() => sessionStorage.setItem('noTestKey', '1')); // start with no key: only the login may unlock it
  await page.goto('./create/');
  await expect(page).toHaveURL(/\/login\/\?next=create$/);
  await page.fill('#user', 'Create');
  await page.fill('#pass', 'a test password');
  await page.click('#go');
  await expect(page).toHaveURL(/\/create\/$/);
  await expect(page.locator('details.signkey, #key, #token')).toHaveCount(0); // the box is gone
  await page.fill('#name', 'Hina Qureshi');
  await expect(page.locator('#link')).toContainText('?i=');
  expect(await decodeLink(await page.locator('#link').textContent())).toEqual({ to: 'Hina Qureshi', events: ['nikah', 'walima'] });
  await page.click('#signout'); // sign-out forgets the key
  expect(await page.evaluate(() => sessionStorage.getItem('inviteSigningKey'))).toBeNull();
});

test('personal links are logged when shared from /create and listed on the dashboard', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./create/');
  await page.fill('#name', 'Zara Ahmed');
  await page.locator('#events input[value=walima]').uncheck();
  await expect(page.locator('#link')).toContainText('?i=');
  await page.click('#copy');
  await page.goto('./dashboard/');
  const row = page.locator('#ll-rows tr', { hasText: 'Zara Ahmed' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Nikah');
  await expect(row).toContainText('Create');
  await expect(row).toContainText('Copied');
});

test('dashboard: duas and afterparty stats from the sheet', async ({ page }) => {
  const c = watchConsole(page);
  await withContent(page, (j) => { j.site.rsvpEndpoint = ENDPOINT; });
  await page.route(`${ENDPOINT}?action=stats`, (r) => r.fulfill({ json: { ok: true, updated: '2026-11-14T10:00:00Z', duas: 321, afterparty: { responses: 4, headcount: 6, hypeAvg: 9.3, hypeDist: [0, 0, 0, 0, 0, 0, 0, 1, 1, 2], picks: { shroom: 3, anything: 2 } } } }));
  await page.goto('./dashboard/');
  await expect(page.locator('#sample')).toBeHidden();
  await expect(page.locator('.tile').nth(0)).toContainText('321');
  await expect(page.locator('.tile').nth(3)).toContainText('9.3');
  await expect(page.locator('.chart svg[role=img]').nth(1)).toHaveAttribute('aria-label', /Shroom: 3/);
  await page.click('#toggle-table');
  await expect(page.locator('#tables table').first()).toContainText('Score');
  c.assertClean();
});

test('analytics stays off with the placeholder ID and asks consent with a real one', async ({ page }) => {
  await openInvite(page);
  await expect(page.locator('#consent')).toBeHidden();
  expect(await page.evaluate(() => typeof window.gtag)).toBe('undefined');
  await page.route('https://www.googletagmanager.com/**', (r) => r.fulfill({ body: '', contentType: 'text/javascript' }));
  await withContent(page, (j) => { j.site.ga4 = 'G-TEST123456'; });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#consent')).toBeVisible();
  await page.getByRole('button', { name: 'Allow' }).click();
  await expect.poll(() => page.evaluate(() => (window.dataLayer || []).length)).toBeGreaterThan(2);
});

test('music: starts with the tap that opens the invitation, mutes, and remembers', async ({ page, request }) => {
  const c = watchConsole(page);
  await page.goto(await personal('Guest'));
  await page.locator('#seal').click();
  await expect(page.locator('html')).toHaveClass(/opened/, { timeout: 12000 });
  const btn = page.locator('#music-btn');
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('music'))).toBe('off');
  await page.goto('./?skip=1');
  await page.mouse.click(10, 300);
  await expect(page.locator('#music-btn')).toHaveAttribute('aria-pressed', 'false'); // stays muted after a reload
  for (const p of ['manifest.webmanifest', 'sw.js', 'assets/img/icon-192.png']) expect((await request.get(p)).status(), p).toBe(200);
  c.assertClean();
});
