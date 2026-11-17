// Set a login: npm run login -- <create|admin> <username> "<password>"
//   create → the Create page only;  admin → Admin (Dashboard and Content) only.
// Only a salted PBKDF2-SHA256 hash of the username and password together is stored (site.createLogin / site.adminLogin
// in content.json); neither is saved on its own. Matches loginKey() + hashPass() in site/assets/js/core.js.
import { readFile, writeFile } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';

const [area = '', user = '', ...rest] = process.argv.slice(2);
const pass = rest.join(' ');
if (!['create', 'admin'].includes(area) || user.trim().length < 3 || pass.length < 8) {
  console.error('Usage: npm run login -- <create|admin> <username (3+ characters)> "<password (8+ characters)>"');
  process.exit(1);
}
const secret = `${user.trim().toLowerCase()}\n${pass}`;
const ITER = 210000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256));
const b64u = (u8) => Buffer.from(u8).toString('base64url');
const path = 'site/content/content.json';
const c = JSON.parse(await readFile(path, 'utf8'));
const { passHash, ...site } = c.site || {}; // the old single login is retired
c.site = { ...site, [area === 'create' ? 'createLogin' : 'adminLogin']: `pbkdf2$${ITER}$${b64u(salt)}$${b64u(bits)}` };

// seal the invite signing key under this login, so signing in unlocks it (no key to paste); same format as sealKey()
const signing = await readFile('.keys/invite-signing-key.txt', 'utf8').then((s) => s.trim()).catch(() => '');
if (signing) {
  const sSalt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
  const aes = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sSalt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(signing)));
  c.site[`${area}Seal`] = `${b64u(sSalt)}.${b64u(iv)}.${b64u(ct)}`;
}
await writeFile(path, JSON.stringify(c, null, 2) + '\n');
console.log(`${area === 'create' ? 'Create' : 'Admin'} login set (only a salted hash is stored)${signing ? '; personal links unlock with it' : '; no signing key found in .keys/, so it cannot make personal links'}. Rebuild and publish to apply.`);
