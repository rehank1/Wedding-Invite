import { expect } from '@playwright/test';

/** Collect console errors + page errors; call `assertClean()` at the end of a test. */
export function watchConsole(page) {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = m.location()?.url || '';
    if (url && !url.startsWith('http://localhost')) return; // third-party frames (Google Maps) log their own noise
    errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return { errors, assertClean: () => expect(errors, errors.join('\n')).toEqual([]) };
}

export async function openInvite(page, query = '') {
  await page.goto(`./?skip=1${query ? '&' + query : ''}`);
  await expect(page.locator('#n-groom')).not.toHaveText('');
  await page.waitForFunction(() => document.querySelectorAll('.jewel').length > 0);
}

/** Serve a modified content.json for this page. */
export async function withContent(page, mutate) {
  await page.route('**/content/content.json', async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    mutate(json);
    await route.fulfill({ response: res, json });
  });
}

export const ENDPOINT = 'https://script.google.com/macros/s/TEST/exec';
