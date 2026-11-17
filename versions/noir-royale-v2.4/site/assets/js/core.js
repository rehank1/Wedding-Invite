// Shared helpers for every page. No innerHTML anywhere: build DOM with el().

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Create an element. Text goes in via textContent only. */
export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid instanceof Node ? kid : String(kid));
  return n;
}

const SVGNS = 'http://www.w3.org/2000/svg';
export function svgUse(id, cls = 'ico') {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('class', cls);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', '#' + id);
  s.append(u);
  return s;
}

/** Clean free text: strip control/bidi-override chars and angle brackets, collapse spaces, cap length. */
export function cleanText(v, max = 60) {
  return String(v ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Only http(s) absolute URLs, or (optionally) same-site relative paths. Anything else → ''. */
export function safeUrl(v, { relative = false } = {}) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (relative && /^[\w\-./%]+$/.test(s) && !s.includes('..') && !s.startsWith('/')) return s;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch { return ''; }
}

export const isPlaceholderGa = (id) => !/^G-[A-Z0-9]{6,}$/.test(id || '') || id === 'G-XXXXXXX';

export async function loadJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

/** SHA-256 hex of a string (for the passphrase gate). */
export async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Passphrase gate shared by /admin and /dashboard. Resolves when unlocked. Obscurity, not security. */
export function gate(form, hash) {
  return new Promise((resolve) => {
    const open = () => { form.hidden = true; resolve(); };
    let ok = false;
    try { ok = !!hash && sessionStorage.getItem('gate') === hash; } catch {}
    if (!hash || ok) return open();
    form.hidden = false;
    form.querySelector('input').focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      if ((await sha256(input.value)) === hash) {
        try { sessionStorage.setItem('gate', hash); } catch {}
        open();
      } else {
        form.querySelector('[role=alert]').textContent = 'That passphrase did not match.';
        input.select();
      }
    });
  });
}

/** Read guest + event selection from the URL. */
export function readInvite(search, validIds) {
  const p = new URLSearchParams(search);
  const to = cleanText(p.get('to'), 60);
  const wanted = (p.get('e') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const events = wanted.filter((id) => validIds.includes(id));
  return { to, events: events.length ? events : validIds.slice() };
}

/** Build an invite link. */
export function inviteLink(base, name, eventIds, allIds) {
  const u = new URL(base);
  u.search = '';
  u.hash = '';
  const n = cleanText(name, 60);
  if (n) u.searchParams.set('to', n);
  if (eventIds.length && eventIds.length < allIds.length) u.searchParams.set('e', eventIds.join(','));
  return u.href;
}

// ---------- dates & calendar (all event times are IST, UTC+05:30, no DST) ----------
export function istDate(date, time = '00:00') {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - 330 * 60000);
}
export const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s));
export const validTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '');

export function formatLongDate(date) {
  if (!validDate(date)) return '';
  return istDate(date, '12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

function eventTimes(ev) {
  const start = istDate(ev.date, validTime(ev.time) ? ev.time : '19:00');
  const end = validTime(ev.endTime) ? istDate(ev.date, ev.endTime) : new Date(start.getTime() + 4 * 3600e3);
  if (end <= start) end.setTime(end.getTime() + 24 * 3600e3);
  return { start, end };
}

export function icsFor(ev, title) {
  const { start, end } = eventTimes(ev);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Heirloom Invite//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id}-${ev.date}@heirloom-invite`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${icsEsc(title)}`,
    `LOCATION:${icsEsc([ev.venue, ev.address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${icsEsc([ev.timeNote, ev.hijri, safeUrl(ev.mapsUrl)].filter(Boolean).join('\n'))}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

export function googleCalUrl(ev, title) {
  const { start, end } = eventTimes(ev);
  const u = new URL('https://calendar.google.com/calendar/render');
  u.searchParams.set('action', 'TEMPLATE');
  u.searchParams.set('text', title);
  u.searchParams.set('dates', `${stamp(start)}/${stamp(end)}`);
  u.searchParams.set('details', [ev.timeNote, ev.hijri].filter(Boolean).join(' · '));
  u.searchParams.set('location', [ev.venue, ev.address].filter(Boolean).join(', '));
  u.searchParams.set('ctz', 'Asia/Kolkata');
  return u.href;
}

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a', { href: url, download: filename, hidden: true });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---------- theme ----------
export function initTheme(btn) {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch {}
  if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;
  if (!btn) return;
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  const sync = () => btn.setAttribute('aria-pressed', String(isDark()));
  sync();
  btn.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch {}
    sync();
  });
}

// ---------- analytics (GA4, loaded only after the guest says yes) ----------
let gaReady = false;
export function track(name, params = {}) {
  if (gaReady && typeof window.gtag === 'function') window.gtag('event', name, params);
}

export function initAnalytics(id, bar) {
  if (isPlaceholderGa(id)) return;
  let choice = null;
  try { choice = localStorage.getItem('consent'); } catch {}
  const load = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true });
    document.head.append(el('script', { async: true, src: 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id) }));
    gaReady = true;
  };
  if (choice === 'yes') return load();
  if (choice === 'no' || !bar) return;
  bar.hidden = false;
  bar.addEventListener('click', (e) => {
    const v = e.target.closest('button')?.value;
    if (!v) return;
    try { localStorage.setItem('consent', v); } catch {}
    bar.hidden = true;
    if (v === 'yes') load();
  });
}
