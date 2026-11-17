// Lighthouse (mobile + desktop) for the invite, saved to reports/lighthouse/. Needs `npm run build` and a server on :4173.
import { mkdir, writeFile } from 'node:fs/promises';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const base = process.env.LH_URL || 'http://localhost:4173/';
const pages = [['invite', base], ['invite-personalised', base + '?to=Ahmed%20Khan'], ['create', base + 'create/'], ['admin', base + 'admin/'], ['dashboard', base + 'dashboard/']];
await mkdir('reports/lighthouse', { recursive: true });
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
const rows = [];
for (const [name, url] of pages) {
  for (const formFactor of name.startsWith('invite') ? ['mobile', 'desktop'] : ['desktop']) {
    const config = formFactor === 'desktop'
      ? { extends: 'lighthouse:default', settings: { formFactor, screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } } }
      : { extends: 'lighthouse:default', settings: { formFactor } }; // default mobile = simulated slow 4G, 4x CPU
    const r = await lighthouse(url, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, config);
    await writeFile(`reports/lighthouse/${name}-${formFactor}.html`, r.report[0]);
    await writeFile(`reports/lighthouse/${name}-${formFactor}.json`, r.report[1]);
    const c = r.lhr.categories, a = r.lhr.audits;
    rows.push({ page: name, formFactor, performance: Math.round(c.performance.score * 100), accessibility: Math.round(c.accessibility.score * 100),
      bestPractices: Math.round(c['best-practices'].score * 100), seo: Math.round(c.seo.score * 100),
      LCP: a['largest-contentful-paint'].displayValue, CLS: a['cumulative-layout-shift'].displayValue, TBT: a['total-blocking-time'].displayValue,
      transferKB: Math.round(a['total-byte-weight'].numericValue / 1024) });
  }
}
await chrome.kill();
console.table(rows);
await writeFile('reports/lighthouse/summary.json', JSON.stringify(rows, null, 2));
