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
    .replace(/<\/?[a-z][^<>]*>/gi, '') // drop whole tags ("<b>Ali</b>" → "Ali"), not just the brackets
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
// ---------- private pages: one login, salted slow hash ----------
// site.createLogin / site.adminLogin are "pbkdf2$<iterations>$<salt>$<hash>" (PBKDF2-SHA256, base64url) — or, for older content, a plain
// 64-hex SHA-256. It is public (the site is static), so the passphrase must be long; the slow hash makes guessing costly.
const PBKDF2_ITER = 210000;
async function pbkdf2(pass, salt, iter) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
export async function hashPass(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITER}$${b64u.enc(salt)}$${b64u.enc(await pbkdf2(pass, salt, PBKDF2_ITER))}`;
}
export async function checkPass(pass, stored) {
  stored = String(stored || '');
  if (/^[0-9a-f]{64}$/.test(stored)) return (await sha256(pass)) === stored;
  const [kind, iter, salt, hash] = stored.split('$');
  if (kind !== 'pbkdf2' || !hash) return false;
  return b64u.enc(await pbkdf2(pass, b64u.dec(salt), Number(iter))) === hash;
}
/** The login secret is the username (case-insensitive) and password together, so neither is stored on its own. */
export const loginKey = (user, pass) => `${String(user || '').trim().toLowerCase()}\n${pass}`;
export const validPassHash = (v) => /^[0-9a-f]{64}$/.test(v) || /^pbkdf2\$\d{5,7}\$[\w-]{16,}\$[\w-]{40,}$/.test(v);

/** Private pages call this first: signed in → resolves; otherwise off to /login/ (the page never renders). */
export function gate(stored, page, area) {
  return new Promise((resolve) => {
    let ok = false;
    try { ok = !!stored && sessionStorage.getItem(`gate:${area}`) === stored; } catch {}
    if (!stored || ok) return resolve();
    location.replace(`../login/?next=${encodeURIComponent(page)}`);
  });
}
export function signOut() {
  try { ['gate:create', 'gate:admin', 'inviteSigningKey'].forEach((k) => sessionStorage.removeItem(k)); } catch {}
  location.replace('../login/');
}

/** Read guest + event selection from the URL. */
export function readInvite(search, validIds) {
  const p = new URLSearchParams(search);
  const to = cleanText(p.get('to'), 60);
  const wanted = (p.get('e') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const events = wanted.filter((id) => validIds.includes(id));
  return { to, events: events.length ? events : validIds.slice() };
}

// ---------- signed personal links ----------
// A personal link carries one opaque code (?i=…): the guest's name and events, lightly scrambled so they can't be read,
// plus an ECDSA P-256 signature made with the couple's private key (it lives only on their own device, never in the site).
// The site checks it with the public key in content.json: change one character and it's rejected (the guest sees the
// general invitation, no name).
const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const b64u = {
  enc: (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), (c) => c.charCodeAt(0)),
};
const scramble = (u8) => u8.map((v, i) => v ^ ((i * 151 + 89) & 255)); // so the name isn't readable in the link

export async function signInvite(privateKey, name, events) {
  const key = await crypto.subtle.importKey('pkcs8', b64u.dec(privateKey.trim()), ALG, false, ['sign']);
  const data = scramble(new TextEncoder().encode(JSON.stringify([cleanText(name, 60), events])));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data));
  return `${b64u.enc(data)}.${b64u.enc(sig)}`;
}

/** → { to, events } for a genuine code, or null (missing, edited, or signed with another key). */
export async function verifyInvite(token, publicKey, validIds) {
  try {
    const [d, s] = String(token || '').split('.');
    const [x, y] = String(publicKey || '').split('.');
    if (!d || !s || !x || !y || d.length > 400) return null;
    const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, ext: true }, ALG, false, ['verify']);
    const data = b64u.dec(d);
    if (!(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64u.dec(s), data))) return null;
    const [n, ev] = JSON.parse(new TextDecoder().decode(scramble(data)));
    const events = (Array.isArray(ev) ? ev : []).map(String).filter((id) => validIds.includes(id));
    return { to: cleanText(n, 60), events: events.length ? events : validIds.slice() };
  } catch { return null; }
}

/** The couple's signing key for /dashboard and /create: kept only in this browser, checked against the site's public key.
 *  Calls onChange(key or '') whenever it becomes valid or invalid; returns a getter for the current valid key. */
export function bindSigningKey(input, box, publicKey, onChange) {
  let valid = '';
  const check = async (k) => {
    k = String(k || '').trim();
    valid = k && (await verifyInvite(await signInvite(k, 'check', []).catch(() => ''), publicKey, ['x']).catch(() => null)) ? k : '';
    input.setAttribute('aria-invalid', String(!!k && !valid));
    if (valid) { try { localStorage.setItem('inviteSigningKey', valid); } catch {} box.open = false; } else box.open = true;
    onChange(valid);
  };
  let saved = '';
  try { saved = localStorage.getItem('inviteSigningKey') || ''; } catch {}
  input.value = saved;
  input.addEventListener('input', () => check(input.value));
  check(saved);
  return () => valid;
}

// ---------- personal-link log (for the dashboard) ----------
// A link is logged when it's actually used (copied, sent on WhatsApp, opened or its QR saved), not on every keystroke.
// Kept in this browser, and also in the Sheet's "Links" tab when an endpoint and the couple's Sheet token are set.
const LOG_KEY = 'linkLog';
const readLog = () => { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; } };
export function bindToken(input, onChange = () => {}) {
  input.value = sheetToken();
  input.addEventListener('change', () => { try { localStorage.setItem('adminToken', input.value.trim()); } catch {} onChange(); });
}
export const sheetToken = () => { try { return localStorage.getItem('adminToken') || ''; } catch { return ''; } };
export function logLink(endpoint, { link, name, events, source, via }) {
  if (!/[?&]i=/.test(link)) return; // only signed personal links
  const log = readLog(), now = new Date().toISOString();
  const hit = log.find((x) => x.link === link);
  if (hit) { if (!hit.via.includes(via)) hit.via.push(via); hit.last = now; }
  else log.unshift({ created: now, last: now, name: cleanText(name, 60), events: cleanText(events, 60), source, via: [via], link });
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 2000))); } catch {}
  const token = sheetToken();
  if (endpoint && token) {
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ kind: 'link', adminToken: token, link, name, events, source, via }) }).catch(() => {});
  }
}
/** Every logged link: this browser's log merged with the Sheet's (when available), newest first, one row per link. */
export async function listLinks(endpoint) {
  const byLink = new Map(readLog().map((x) => [x.link, { ...x, via: [...x.via] }]));
  let sheet = 'off';
  const token = sheetToken();
  if (endpoint && token) {
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ kind: 'links', adminToken: token }) });
      const data = await res.json();
      if (data.ok) {
        sheet = 'ok';
        for (const r of data.links || []) {
          const via = String(r.via || '').split(', ').filter(Boolean);
          const cur = byLink.get(r.link);
          if (cur) { cur.via = [...new Set([...cur.via, ...via])]; if (String(r.last) > cur.last) cur.last = String(r.last); }
          else byLink.set(r.link, { created: String(r.created), last: String(r.last), name: cleanText(r.name, 60), events: cleanText(r.events, 60), source: r.source === 'dashboard' ? 'dashboard' : 'create', via, link: String(r.link) });
        }
      } else sheet = 'denied';
    } catch { sheet = 'error'; }
  }
  return { sheet, links: [...byLink.values()].sort((a, b) => String(b.created).localeCompare(String(a.created))) };
}

// ---------- the signing key, sealed with a login ----------
// content.json carries the private signing key encrypted (AES-GCM, key from PBKDF2 of the username + password), once
// for the Create login and once for the Admin login. Signing in unlocks it for this tab only; nothing to paste.
const SEAL_ITER = 210000;
async function sealingKey(secret, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: SEAL_ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function sealKey(secret, text) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await sealingKey(secret, salt), new TextEncoder().encode(text)));
  return `${b64u.enc(salt)}.${b64u.enc(iv)}.${b64u.enc(ct)}`;
}
export async function openKey(secret, sealed) {
  try {
    const [s, i, c] = String(sealed || '').split('.');
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64u.dec(i) }, await sealingKey(secret, b64u.dec(s)), b64u.dec(c));
    return new TextDecoder().decode(pt);
  } catch { return ''; }
}
/** The signing key unlocked at sign-in (this tab only), or ''. */
export const sessionSigningKey = () => { try { return sessionStorage.getItem('inviteSigningKey') || ''; } catch { return ''; } };

/** Build an invite link: signed (?i=…) when a signing key is given, otherwise the plain legacy form. */
export async function inviteLink(base, name, eventIds, allIds, signingKey = '') {
  const u = new URL(base);
  u.search = '';
  u.hash = '';
  const n = cleanText(name, 60);
  const ev = eventIds.length && eventIds.length < allIds.length ? eventIds.map(String) : [];
  if (signingKey) {
    if (n || ev.length) u.searchParams.set('i', await signInvite(signingKey, n, ev));
    return u.href;
  }
  if (n) u.searchParams.set('to', n);
  if (ev.length) u.searchParams.set('e', ev.join(','));
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
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : true); // dark unless the guest picked light
  const sync = () => btn.setAttribute('aria-pressed', String(isDark()));
  sync();
  const flip = () => { root.dataset.theme = isDark() ? 'light' : 'dark'; try { localStorage.setItem('theme', root.dataset.theme); } catch {} sync(); };
  btn.addEventListener('click', () => {
    // the new theme spreads out in a circle from the button (View Transitions); instant where unsupported or reduced motion
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return flip();
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(flip).ready.then(() => {
      root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] }, { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
  });
  themeHint(btn, isDark);
}

// a small one-time bubble beside the toggle, shown once the invitation is open, so guests know light mode exists
function themeHint(btn, isDark) {
  try { if (localStorage.getItem('themeHint') === '1') return; } catch {}
  const root = document.documentElement;
  const tip = document.createElement('span');
  tip.className = 'theme-hint';
  tip.setAttribute('role', 'status');
  btn.after(tip);
  let timer = 0;
  const hide = () => { clearTimeout(timer); tip.classList.remove('show'); setTimeout(() => tip.remove(), 500); try { localStorage.setItem('themeHint', '1'); } catch {} };
  const show = () => {
    tip.textContent = isDark() ? 'Prefer it bright? Tap for light mode' : 'Tap for dark mode';
    tip.classList.add('show');
    timer = setTimeout(hide, 7000);
  };
  btn.addEventListener('click', hide, { once: true });
  tip.addEventListener('click', () => { btn.click(); });
  const ready = () => setTimeout(show, 1600);
  if (root.classList.contains('opened')) ready();
  else new MutationObserver((_, o) => { if (root.classList.contains('opened')) { o.disconnect(); ready(); } }).observe(root, { attributes: true, attributeFilter: ['class'] });
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
