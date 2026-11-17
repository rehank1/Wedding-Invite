// Fails if anything that looks like a credential is in the source. Run: npm run check:secrets (also part of test:ci).
// The GA4 measurement ID and the passphrase *hash* are public by design and are not flagged.
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOTS = ['site', 'scripts', 'apps-script', 'tests', '.github'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'fonts', 'img', 'audio', 'video']);
const TEXT = new Set(['.js', '.mjs', '.json', '.html', '.css', '.gs', '.yml', '.yaml', '.md', '.txt', '.env']);
const RULES = [
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['OpenAI/Anthropic-style key', /\b(sk|sk-ant)-[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /\b(ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[abpr]-[A-Za-z0-9-]{10,}/],
  ['Private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Bearer token', /Bearer\s+[A-Za-z0-9._-]{24,}/],
  ['Hard-coded password', /\b(password|passwd|pwd)\s*[:=]\s*['"][^'"\s]{6,}['"]/i],
];

async function* walk(dir) {
  for (const d of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (d.isDirectory()) { if (!SKIP_DIRS.has(d.name)) yield* walk(join(dir, d.name)); }
    else if (TEXT.has(extname(d.name))) yield join(dir, d.name);
  }
}

const hits = [];
for (const root of ROOTS) for await (const f of walk(root)) {
  if (f.endsWith('secrets-check.mjs')) continue;
  (await readFile(f, 'utf8')).split('\n').forEach((line, i) => {
    for (const [name, re] of RULES) if (re.test(line)) hits.push(`${f}:${i + 1}  ${name}`);
  });
}
if (hits.length) { console.error('Possible secrets found:\n' + hits.join('\n')); process.exit(1); }
console.log('secrets check: clean');
