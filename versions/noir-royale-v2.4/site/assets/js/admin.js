// Content editor: builds a form for every field in content.json, validates, previews live, exports JSON.
import { el, cleanText, safeUrl, loadJSON, sha256, gate, validDate, validTime, download, initTheme } from './core.js';

const $ = (id) => document.getElementById(id);
initTheme();
const published = await loadJSON('../content/content.json');
await gate($('gate'), published.site?.passHash);
$('app').hidden = false;
$('nopass').hidden = !!published.site?.passHash;

let data = structuredClone(published);
try {
  const draft = JSON.parse(sessionStorage.getItem('content-draft') || 'null');
  if (draft && typeof draft === 'object') data = draft;
} catch {}

// templates for "Add" buttons, keyed by array name
const TEMPLATES = {
  events: { id: '', name: '', occasion: '', date: '', time: '19:00', endTime: '23:00', timeNote: '', hijri: '', venue: '', address: '', mapsUrl: '', notes: '', programme: [] },
  programme: { time: '', title: '', note: '' },
  duaLines: '',
};
const HINTS = {
  'site.url': 'Your live address, e.g. https://yourname.github.io/wedding-invite/ (used for the WhatsApp preview image).',
  'site.ga4': 'Google Analytics 4 Measurement ID, e.g. G-AB12CD34EF. Leave G-XXXXXXX to switch analytics off.',
  'site.rsvpEndpoint': 'Google Apps Script Web App URL (starts with https://script.google.com/). Receives duas and afterparty sign-ups.',
  'events.programme.time': 'Places the moment on the pocket watch, e.g. 7:00 PM (or text like After Maghrib).',
  'wording.duaLines': 'Ready-made duas guests can choose before sealing.',
  'dayOf.photoAlbumUrl': 'A shared Google Photos album link, shown on the wedding days.',
  'site.lookerUrl': 'Looker Studio embed URL (File → Embed report), starts with https://lookerstudio.google.com/embed/.',
  'site.passHash': 'Type a new passphrase in the box below to set this. Only the fingerprint (hash) is stored.',
  'events.id': 'Short lowercase code used in invite links, e.g. nikah or walima.',
  'events.timeNote': 'How the time reads on the card, e.g. 7:00 PM onwards (after Namaz-e-Maghrib).',
  'music.src': 'e.g. content/music/nasheed.mp3 (leave empty to hide the music button).',
};
const LONG = /^(text|request|closing|memorial|note|notes|description|occasion|closingDua\w*|bismillah\w*|thanks|parents|dressCode)$/;
const human = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).replace('Url', 'URL').replace('Ga4', 'GA4 ID').replace('Pass Hash', 'Passphrase');

// ---------- validation ----------
function validate(key, v, pathKey) {
  if (typeof v !== 'string' || v === '') return '';
  if (key === 'date' || key === 'deadline') return validDate(v) ? '' : 'Use a real date (YYYY-MM-DD).';
  if (key === 'time' || key === 'endTime') return validTime(v) ? '' : 'Use 24-hour time, e.g. 19:00.';
  if (key === 'hex') return /^#[0-9a-f]{6}$/i.test(v) ? '' : 'Use a colour like #D9C08A.';
  if (key === 'ga4') return /^G-[A-Z0-9]{4,}$/.test(v) ? '' : 'Looks like G-AB12CD34EF.';
  if (key === 'passHash') return /^[0-9a-f]{64}$/.test(v) ? '' : 'Must be a 64-character SHA-256 hash. Use the passphrase box.';
  if (key === 'id') return /^[a-z0-9-]{2,20}$/.test(v) ? '' : 'Lowercase letters, numbers and dashes only.';
  if (key === 'src' || key === 'photo') return safeUrl(v, { relative: true }) && /^content\//.test(v) ? '' : 'Must be a path inside content/, e.g. content/photos/gallery/01.jpg';
  if (key === 'rsvpEndpoint') return v.startsWith('https://script.google.com/') ? '' : 'Must start with https://script.google.com/';
  if (key === 'lookerUrl') return v.startsWith('https://lookerstudio.google.com/') ? '' : 'Must start with https://lookerstudio.google.com/';
  if (/url$/i.test(key)) return /^https:\/\//.test(v) && safeUrl(v) ? '' : 'Must be a full https:// link.';
  if (key === 'phone') return /^\+?[\d\s-]{6,20}$/.test(v) ? '' : 'Digits, spaces, dashes and an optional +.';
  if (pathKey === 'events.id') return '';
  return '';
}

// ---------- form builder ----------
const getAt = (path) => path.reduce((o, k) => o?.[k], data);
const setAt = (path, v) => { const last = path.at(-1); getAt(path.slice(0, -1))[last] = v; };

function field(path, value) {
  const key = String(path.at(-1));
  const pathKey = path.filter((p) => typeof p === 'string').join('.');
  const id = 'f-' + path.join('-');
  const hint = HINTS[pathKey];
  const err = el('small', { class: 'err-text', id: id + '-err', 'aria-live': 'polite' });
  const attrs = { id, name: pathKey, 'aria-describedby': id + '-err' + (hint ? ` ${id}-hint` : ''), autocomplete: 'off' };
  let input;
  if (typeof value === 'number') input = el('input', { ...attrs, type: 'number', value });
  else if (key === 'date' || key === 'deadline') input = el('input', { ...attrs, type: 'date', value });
  else if (key === 'time' || key === 'endTime') input = el('input', { ...attrs, type: 'time', value });
  else if (LONG.test(key)) input = el('textarea', { ...attrs, rows: 2, text: value });
  else input = el('input', { ...attrs, type: /url$/i.test(key) ? 'url' : 'text', value, maxlength: key === 'passHash' ? 64 : 300 });
  if (/Arabic$/.test(key)) { input.setAttribute('lang', 'ar'); input.setAttribute('dir', 'rtl'); input.classList.add('ar'); }
  const check = () => {
    const msg = validate(key, input.value, pathKey);
    err.textContent = msg;
    input.setAttribute('aria-invalid', String(!!msg));
  };
  input.addEventListener('input', () => {
    setAt(path, typeof value === 'number' ? Number(input.value) : input.value);
    check();
    changed();
  });
  check();
  const label = el('label', { class: 'field', for: id }, el('span', { text: human(key) }));
  const wrap = el('div', {}, label);
  if (key === 'hex') {
    const picker = el('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000', 'aria-label': 'Pick colour' });
    picker.addEventListener('input', () => { input.value = picker.value.toUpperCase(); input.dispatchEvent(new Event('input')); });
    label.append(el('span', { class: 'color-row' }, picker, input));
  } else label.append(input);
  if (hint) label.append(el('span', { class: 'hint', id: id + '-hint', text: hint }));
  label.append(err);
  if (key === 'passHash') {
    const pass = el('input', { type: 'password', autocomplete: 'new-password', id: 'newpass', placeholder: 'New passphrase (min 8 characters)' });
    const set = el('button', { class: 'btn', type: 'button', text: 'Set passphrase' });
    set.addEventListener('click', async () => {
      if (pass.value.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
      input.value = await sha256(pass.value);
      pass.value = '';
      input.dispatchEvent(new Event('input'));
      status('Passphrase set. Download content.json and publish it to apply.');
    });
    wrap.append(el('label', { class: 'field', for: 'newpass' }, el('span', { text: 'New passphrase' }), pass), set);
  }
  return wrap;
}

function group(path, value, title) {
  const key = String(path.at(-1) ?? '');
  if (Array.isArray(value)) {
    const fs = el('fieldset', {}, el('legend', { text: title }));
    value.forEach((item, i) => {
      const itemPath = [...path, i];
      const label = item && typeof item === 'object' ? cleanText(item.name || item.title || item.src || '', 40) : '';
      const tools = el('div', { class: 'item-tools' },
        el('button', { class: 'btn', type: 'button', disabled: i === 0, 'aria-label': `Move ${title} ${i + 1} up`, text: 'Up', onclick: () => move(path, i, -1) }),
        el('button', { class: 'btn', type: 'button', disabled: i === value.length - 1, 'aria-label': `Move ${title} ${i + 1} down`, text: 'Down', onclick: () => move(path, i, 1) }),
        el('button', { class: 'btn', type: 'button', 'aria-label': `Remove ${title} ${i + 1}`, text: 'Remove', onclick: () => remove(path, i) }));
      if (item && typeof item === 'object') {
        const sub = group(itemPath, item, `${title.replace(/s$/, '')} ${i + 1}${label ? ' · ' + label : ''}`);
        sub.classList.add('item');
        sub.insertBefore(tools, sub.children[1]);
        fs.append(sub);
      } else fs.append(field(itemPath, item ?? ''), tools);
    });
    fs.append(el('button', { class: 'btn add', type: 'button', text: `Add ${title.replace(/s$/, '').toLowerCase()}`, onclick: () => add(path, key) }));
    return fs;
  }
  const fs = el('fieldset', {}, el('legend', { text: title }));
  for (const [k, v] of Object.entries(value)) {
    if (v && typeof v === 'object') fs.append(group([...path, k], v, human(k)));
    else fs.append(field([...path, k], v ?? ''));
  }
  return fs;
}

function build() {
  const y = scrollY;
  const form = $('editor');
  form.replaceChildren(...Object.entries(data).map(([k, v]) => group([k], v, human(k))));
  scrollTo(0, y);
}
function move(path, i, d) { const a = getAt(path); [a[i], a[i + d]] = [a[i + d], a[i]]; build(); changed(); }
function remove(path, i) { getAt(path).splice(i, 1); build(); changed(); }
function add(path, key) { getAt(path).push(structuredClone(TEMPLATES[key] ?? '')); build(); changed(); }

// ---------- sanitize + export ----------
function sanitize(v, key = '') {
  if (Array.isArray(v)) return v.map((x) => sanitize(x, key));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sanitize(x, k)]));
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean') return v;
  const s = cleanText(v, 600);
  if (/url$/i.test(key) || key === 'rsvpEndpoint') return safeUrl(s);
  if (key === 'src' || key === 'photo') return safeUrl(s, { relative: true });
  return s;
}
const errors = () => [...$('editor').querySelectorAll('[aria-invalid=true]')];
function status(msg, bad = false) { const s = $('status'); s.textContent = msg; s.classList.toggle('bad', bad); }
function exportJson() {
  const bad = errors();
  if (bad.length) { status(`Fix ${bad.length} highlighted field${bad.length > 1 ? 's' : ''} first.`, true); bad[0].focus(); return null; }
  return JSON.stringify(sanitize(data), null, 2) + '\n';
}

let t = 0;
function changed() {
  try { sessionStorage.setItem('content-draft', JSON.stringify(data)); } catch {}
  const n = errors().length;
  status(n ? `${n} field${n > 1 ? 's need' : ' needs'} attention.` : 'Draft saved in this tab. Download to publish.', !!n);
  clearTimeout(t);
  t = setTimeout(sendPreview, 250);
}
function sendPreview() {
  $('preview').contentWindow?.postMessage({ type: 'content', content: sanitize(data) }, location.origin);
}
addEventListener('message', (e) => { if (e.origin === location.origin && e.data?.type === 'preview-ready') sendPreview(); });

$('dl').addEventListener('click', () => { const j = exportJson(); if (j) { download('content.json', j, 'application/json'); status('Downloaded content.json.'); } });
$('copy').addEventListener('click', async () => {
  const j = exportJson();
  if (!j) return;
  try { await navigator.clipboard.writeText(j); status('JSON copied.'); } catch { status('Copy is blocked here; use Download instead.', true); }
});
$('reset').addEventListener('click', () => { data = structuredClone(published); build(); changed(); status('Reset to the published content.'); });
$('load').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const parsed = JSON.parse(await f.text());
    if (!parsed || typeof parsed !== 'object' || !parsed.couple || !Array.isArray(parsed.events)) throw new Error('shape');
    data = sanitize(parsed);
    build(); changed(); status(`Loaded ${cleanText(f.name, 60)}.`);
  } catch { status('That file is not a valid content.json.', true); }
  e.target.value = '';
});
build();
changed();
