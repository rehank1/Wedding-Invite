// RSVP dashboard: aggregate stats from the Apps Script endpoint (no personal data), charted in the palette.
// Charts are single-series with direct value labels + a table view, so colour never carries identity alone.
import { el, cleanText, safeUrl, loadJSON, gate, signOut, initTheme, inviteLink, logLink, listLinks, sessionSigningKey } from './core.js';

const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
initTheme();
const content = await loadJSON('../content/content.json');
await gate(content.site?.adminLogin, 'dashboard', 'admin');
document.body.classList.add('in');
$('signout').addEventListener('click', signOut);
$('app').hidden = false;

// ---- send an invite: both celebrations, or just one ----
{
  const evs = (content.events || []).filter((e) => e && e.id);
  const ids = evs.map((e) => String(e.id));
  const opts = [['all', 'Both'], ...evs.map((e) => [String(e.id), `${cleanText(e.name, 30)} only`])];
  $('s-which').replaceChildren(...opts.map(([v, l], i) => el('label', {}, el('input', { type: 'radio', name: 'which', value: v, checked: i === 0 }), el('span', { text: l }))));
  const base = new URL('../', location.href).href;
  const couple = `${cleanText(content.couple?.groom?.name, 40)} & ${cleanText(content.couple?.bride?.name, 40)}`;
  const pub = content.site?.inviteKey || '';
  const signingKey = sessionSigningKey();
  let seq = 0;
  let current = null;
  const used = (via) => { if (current) { logLink(safeUrl(content.site?.rsvpEndpoint), { ...current, source: 'dashboard', via }); loadLinks(); } };
  const update = async () => {
    current = null;
    const my = ++seq;
    const which = document.querySelector('input[name=which]:checked')?.value || 'all';
    const chosen = which === 'all' ? ids : [which];
    const name = cleanText($('s-name').value, 60);
    if (pub && !signingKey) { $('s-link').textContent = 'Sign out and sign in again to make personal links.'; $('s-wa').removeAttribute('href'); return; }
    const link = await inviteLink(base, name, chosen, ids, signingKey);
    if (my !== seq) return; // a newer keystroke won
    $('s-link').textContent = link;
    current = { link, name, events: evs.filter((e) => chosen.includes(String(e.id))).map((e) => cleanText(e.name, 30)).join(' & ') };
    const what = evs.filter((e) => chosen.includes(String(e.id))).map((e) => cleanText(e.name, 30)).join(' and ');
    $('s-wa').href = `https://wa.me/?text=${encodeURIComponent(`Assalamu Alaikum${name ? ' ' + name : ''}, you are warmly invited to the ${what} of ${couple}. Your invitation: ${link}`)}`;
  };
  $('s-name').addEventListener('input', update);
  $('s-which').addEventListener('change', update);
  $('s-wa').addEventListener('click', () => used('whatsapp'));
  $('s-copy').addEventListener('click', async () => {
    used('copy');
    try { await navigator.clipboard.writeText($('s-link').textContent); $('s-msg').textContent = 'Copied.'; } catch { $('s-msg').textContent = 'Select the link and copy it.'; }
  });
  update();
}

const events = (content.events || []).filter((e) => e && e.id);
const endpoint = safeUrl(content.site?.rsvpEndpoint);

// ---- personal links: every link made in /create or above, with its details ----
let allLinks = [];
const VIA = { copy: 'Copied', whatsapp: 'WhatsApp', open: 'Opened', qr: 'QR' };
const day = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
function drawLinks() {
  const q = $('ll-search').value.trim().toLowerCase();
  const rows = allLinks.filter((x) => !q || x.name.toLowerCase().includes(q));
  $('ll-rows').replaceChildren(...rows.map((x) => el('tr', {},
    el('th', { scope: 'row', text: x.name || '(no name)' }),
    el('td', { text: x.events || 'All' }),
    el('td', { text: x.source === 'dashboard' ? 'Dashboard' : 'Create' }),
    el('td', { text: x.via.map((v) => VIA[v] || v).join(', ') }),
    el('td', { text: day(x.created) }),
    el('td', {}, el('button', { class: 'btn ll-copy', type: 'button', text: 'Copy', 'data-link': x.link })),
  )));
  if (!rows.length) $('ll-rows').replaceChildren(el('tr', {}, el('td', { colspan: '6', class: 'muted', text: allLinks.length ? 'No match.' : 'No personal links yet. They appear here as soon as one is copied, shared, opened or its QR saved.' })));
}
async function loadLinks() {
  const { sheet, links } = await listLinks(endpoint);
  allLinks = links;
  const count = (f) => links.filter(f).length;
  const tiles = [['Links made', links.length], ['From Create', count((x) => x.source !== 'dashboard')], ['From here', count((x) => x.source === 'dashboard')], ['Sent on WhatsApp', count((x) => x.via.includes('whatsapp'))]];
  for (const e of events) tiles.push([`${cleanText(e.name, 20)} invites`, count((x) => !x.events || x.events.includes(cleanText(e.name, 30)))]);
  $('ll-tiles').replaceChildren(...tiles.map(([k, v]) => el('div', { class: 'll-tile' }, el('span', { class: 'v', text: String(v) }), el('span', { class: 'k', text: k }))));
  $('ll-note').textContent = sheet === 'ok' ? 'All devices (synced with the Sheet).' : sheet === 'denied' ? 'This device only: the Sheet refused the token.' : 'Links made on this device.';
  drawLinks();
}
$('ll-search').addEventListener('input', drawLinks);
$('ll-rows').addEventListener('click', async (e) => {
  const b = e.target.closest('.ll-copy');
  if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.link); b.textContent = 'Copied'; } catch { b.textContent = 'Copy failed'; }
});
$('ll-csv').addEventListener('click', () => {
  const cell = (v) => { const s = String(v ?? '').replace(/"/g, '""'); return `"${/^[=+\-@]/.test(s) ? "'" + s : s}"`; }; // no spreadsheet formulas
  const csv = [['Guest', 'Invited to', 'Made in', 'Shared via', 'Created', 'Last shared', 'Link'], ...allLinks.map((x) => [x.name, x.events || 'All', x.source, x.via.join(' '), x.created, x.last, x.link])].map((r) => r.map(cell).join(',')).join('\n');
  const a = el('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'personal-links.csv' });
  document.body.append(a); a.click(); a.remove();
});
loadLinks();

const SAMPLE = {
  ok: true, sample: true, updated: new Date().toISOString(), duas: 146,
  afterparty: { responses: 21, headcount: 38, hypeAvg: 8.4, hypeDist: [0, 0, 1, 0, 1, 2, 3, 5, 4, 5], picks: { coke: 4, green: 9, barood: 5, lsd: 2, shroom: 6, anything: 7 } },
};

function svg(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

const tip = el('div', { class: 'tip', hidden: true, role: 'presentation' });
document.body.append(tip);

/** Vertical bar chart, single series, labelled values, keyboard + hover tooltips. */
function barChart(title, sub, rows, alt = false) {
  const W = 520, H = 260, pad = { t: 24, r: 8, b: 40, l: 8 };
  const max = Math.max(1, ...rows.map((r) => r.v));
  const bw = (W - pad.l - pad.r) / rows.length;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${title}. ${rows.map((r) => `${r.k}: ${r.v}`).join(', ')}` });
  s.append(svg('line', { class: 'base', x1: pad.l, x2: W - pad.r, y1: H - pad.b, y2: H - pad.b }));
  rows.forEach((r, i) => {
    const h = ((H - pad.t - pad.b) * r.v) / max;
    const x = pad.l + i * bw + Math.max(2, bw * 0.18);
    const w = Math.max(4, bw - 2 * Math.max(2, bw * 0.18));
    const y = H - pad.b - h;
    const g = svg('g', { class: 'm', tabindex: 0, 'aria-label': `${r.k}: ${r.v}` });
    g.append(svg('rect', { class: 'hit', x: pad.l + i * bw, y: pad.t - 20, width: bw, height: H - pad.t - pad.b + 20 }));
    // 4px rounded data-end, square at the baseline
    const rr = Math.min(4, w / 2, h);
    const path = h > 0
      ? `M${x},${H - pad.b} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${H - pad.b} Z`
      : '';
    g.append(svg('path', { class: `bar${alt ? ' alt' : ''}`, d: path }));
    const val = svg('text', { class: 'val', x: x + w / 2, y: y - 6, 'text-anchor': 'middle' });
    val.textContent = r.v;
    if (rows.length <= 10 && r.v > 0) g.append(val);
    const lab = svg('text', { x: pad.l + i * bw + bw / 2, y: H - pad.b + 22, 'text-anchor': 'middle' });
    lab.textContent = r.k;
    g.append(lab);
    const show = (ev) => {
      tip.textContent = `${r.k}: ${r.v}${r.unit ? ' ' + r.unit : ''}`;
      tip.hidden = false;
      const b = g.getBoundingClientRect();
      tip.style.left = `${Math.min(innerWidth - 160, (ev?.clientX ?? b.left + b.width / 2) + 12)}px`;
      tip.style.top = `${(ev?.clientY ?? b.top) - 36}px`;
    };
    g.addEventListener('pointermove', show);
    g.addEventListener('focus', () => show());
    g.addEventListener('pointerleave', () => (tip.hidden = true));
    g.addEventListener('blur', () => (tip.hidden = true));
    s.append(g);
  });
  return el('section', { class: 'box chart' }, el('h2', { text: title }), el('p', { class: 'note', text: sub }), s);
}

function table(caption, head, rows) {
  return el('table', {}, el('caption', { class: 'label', text: caption }),
    el('thead', {}, el('tr', {}, ...head.map((h) => el('th', { scope: 'col', text: h })))),
    el('tbody', {}, ...rows.map((r) => el('tr', {}, ...r.map((c) => el('td', { text: String(c) }))))));
}

function render(d) {
  const ap = d.afterparty || {};
  const num = (v) => (Number.isFinite(+v) ? +v : 0);
  $('sample').hidden = !d.sample;
  $('updated').textContent = d.updated ? `Updated ${new Date(d.updated).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : '';
  const tiles = [['Duas sent', num(d.duas)], ['Afterparty sign-ups', num(ap.responses)], ['Afterparty headcount', num(ap.headcount)], ['Average hype', ap.responses ? (+ap.hypeAvg || 0).toFixed(1) : '–']];
  $('tiles').replaceChildren(...tiles.map(([k, v]) => el('div', { class: 'tile' }, el('span', { class: 'v', text: String(v) }), el('span', { class: 'k', text: k }))));
  const dist = Array.from({ length: 10 }, (_, i) => ({ k: String(i + 1), v: num(ap.hypeDist?.[i]), unit: 'guests' }));
  const LABELS = { coke: '❄️ Coke', green: '🌿 Green', barood: '🍫 Barood', lsd: '🌀 LSD', shroom: '🍄 Shroom', anything: '🫡 Anything' };
  const picks = Object.keys(LABELS).map((k) => ({ k: LABELS[k], v: num(ap.picks?.[k]), unit: 'votes' }));
  $('charts').replaceChildren(barChart('How hyped are you?', `After-hours sign-ups by score (1 to 10). ${num(ap.responses)} sign-ups.`, dist, true), barChart('Pick your poison', 'Votes from the After Hours card (guests can pick several).', picks));
  $('tables').replaceChildren(table('Hype scores', ['Score', 'Sign-ups'], dist.map((p) => [p.k, p.v])), table('Pick your poison', ['Pick', 'Votes'], picks.map((p) => [p.k, p.v])), table('Totals', ['Measure', 'Value'], tiles.map(([k, v]) => [k, v])));
}

async function load() {
  if (!endpoint.startsWith('https://script.google.com/')) return render(SAMPLE);
  try {
    const u = new URL(endpoint);
    u.searchParams.set('action', 'stats');
    const r = await fetch(u.href);
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'bad');
    render(d);
  } catch {
    render(SAMPLE);
    $('sample').textContent = 'Could not reach the RSVP sheet, so this is sample data. Check the Apps Script deployment.';
  }
}

$('refresh').addEventListener('click', load);
$('toggle-table').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  e.currentTarget.textContent = on ? 'Show as charts' : 'Show as table';
  $('tables').hidden = !on;
  $('charts').hidden = on;
});

const looker = safeUrl(content.site?.lookerUrl);
$('looker').replaceChildren(looker.startsWith('https://lookerstudio.google.com/')
  ? el('iframe', { src: looker, title: 'Looker Studio report', loading: 'lazy', sandbox: 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox', referrerpolicy: 'no-referrer' })
  : el('p', { class: 'note', text: 'Add your Looker Studio embed link in the content editor (Site → Looker URL) to show visits, opens, duas and other events here. The README explains how.' }));
load();
