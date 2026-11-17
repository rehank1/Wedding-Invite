// One-time: make the key pair that signs personal invite links. Run: npm run keys
// - the PUBLIC key goes into site/content/content.json (site.inviteKey): the site uses it to check links.
// - the PRIVATE key is written to .keys/invite-signing-key.txt (git-ignored). Paste it once into /dashboard or /create
//   on your own device; it is stored only in that browser. Anyone with it can make personal links, so keep it private.
// Re-running makes a NEW pair: every personal link made with the old key stops showing names. Use --force to confirm.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';

const contentPath = 'site/content/content.json';
const c = JSON.parse(await readFile(contentPath, 'utf8'));
if (c.site?.inviteKey && !process.argv.includes('--force')) {
  console.log('A signing key already exists (site.inviteKey). Re-run with --force to replace it; old links will stop showing names.');
  process.exit(0);
}
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
const priv = Buffer.from(await crypto.subtle.exportKey('pkcs8', kp.privateKey)).toString('base64url');
c.site = { ...c.site, inviteKey: `${pub.x}.${pub.y}` };
await writeFile(contentPath, JSON.stringify(c, null, 2) + '\n');
await mkdir('.keys', { recursive: true });
await writeFile('.keys/invite-signing-key.txt', priv + '\n', { mode: 0o600 });
console.log('Public key saved to site.inviteKey in content.json.');
console.log('Private signing key saved to .keys/invite-signing-key.txt (never commit or share it).');
