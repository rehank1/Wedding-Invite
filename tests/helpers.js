import { expect, test as base } from '@playwright/test';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
// tests serve content.json from the source file (no network round trip), so page- and context-level overrides never race
const CONTENT = readFileSync(new URL('../site/content/content.json', import.meta.url), 'utf8');
const freshContent = () => JSON.parse(CONTENT);
import { signInvite, verifyInvite, sealKey, hashPass, loginKey } from '../site/assets/js/core.js';
export { sealKey, hashPass, loginKey };

// ---- signed personal links: a throwaway test key pair, made fresh for every run (the real private key never enters tests)
const kp = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
export const TEST_PUB = `${jwk.x}.${jwk.y}`;
export const TEST_PRIV = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', kp.privateKey)).toString('base64url');
/** './?i=…' — a genuine signed link for this guest (and optional events) */
export const personal = async (name, events = [], extra = '') => `./?i=${await signInvite(TEST_PRIV, name, events)}${extra ? '&' + extra : ''}`;
export const personalQuery = async (name, events = []) => `i=${await signInvite(TEST_PRIV, name, events)}`;
/** read back what a link carries (null if it isn't genuine) */
export const decodeLink = (href) => verifyInvite(new URL(href).searchParams.get('i'), TEST_PUB, ['nikah', 'walima']);
/** pages in this context see the TEST public key; /create and /dashboard already hold the TEST signing key */
export async function useTestKey(ctx) {
  await ctx.route('**/content/content.json', async (route) => {
    const json = freshContent();
    json.site = { ...json.site, inviteKey: TEST_PUB, createLogin: '', adminLogin: '' }; // tests sign in only where they mean to
    await route.fulfill({ json });
  });
  await ctx.addInitScript((k) => { try { if (!sessionStorage.getItem('noTestKey')) sessionStorage.setItem('inviteSigningKey', k); } catch {} }, TEST_PRIV); // as if unlocked at sign-in
}
export const test = base.extend({ context: async ({ context }, use) => { await useTestKey(context); await use(context); } });

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
    const json = freshContent();
    json.site = { ...json.site, inviteKey: TEST_PUB, createLogin: '', adminLogin: '' }; // tests sign in only where they mean to
    mutate(json);
    await route.fulfill({ json });
  });
}

export const ENDPOINT = 'https://script.google.com/macros/s/TEST/exec';
