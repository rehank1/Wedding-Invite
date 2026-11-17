import { el, cleanText, loadJSON, inviteLink, initTheme, gate, signOut, logLink, safeUrl, sessionSigningKey } from './core.js';

const $ = (id) => document.getElementById(id);
const base = new URL('../', location.href).href;
initTheme();

const content = await loadJSON('../content/content.json');
await gate(content.site?.createLogin, 'create', 'create');
document.body.classList.add('in');
$('signout').addEventListener('click', signOut);
const events = (content.events || []).filter((e) => e && e.id);
const ids = events.map((e) => String(e.id));
const couple = content.couple || {};
$('events').replaceChildren(...events.map((e) =>
  el('label', { class: 'chk' }, el('input', { type: 'checkbox', value: cleanText(e.id, 20), checked: true }), cleanText(e.name, 40))));

let timer = 0;
let current = null; // the link on screen, logged when it is actually used
const endpoint = safeUrl(content.site?.rsvpEndpoint);
const used = (via) => current && logLink(endpoint, { ...current, source: 'create', via });
const pub = content.site?.inviteKey || '';
const signingKey = sessionSigningKey();
let seq = 0;
async function update() {
  const my = ++seq;
  const raw = $('name').value;
  const name = cleanText(`${$('hon').value} ${raw}`, 60);
  $('name-err').textContent = raw.length >= 60 ? 'Names are capped at 60 characters.' : /[<>]/.test(raw) ? 'Angle brackets are removed.' : '';
  const chosen = [...$('events').querySelectorAll('input:checked')].map((i) => i.value);
  current = null;
  if (pub && !signingKey) { $('link').textContent = 'Sign out and sign in again to make personal links.'; $('open').removeAttribute('href'); $('wa').removeAttribute('href'); return; }
  const link = await inviteLink(base, name, chosen.length ? chosen : ids, ids, signingKey);
  if (my !== seq) return;
  $('link').textContent = link;
  $('open').href = link;
  current = { link, name, events: events.filter((e) => (chosen.length ? chosen : ids).includes(String(e.id))).map((e) => cleanText(e.name, 40)).join(' & ') };
  const names = `${cleanText(couple.groom?.name, 40)} & ${cleanText(couple.bride?.name, 40)}`;
  const what = events.filter((e) => (chosen.length ? chosen : ids).includes(String(e.id))).map((e) => cleanText(e.name, 40)).join(' and ');
  const msg = `Assalamu Alaikum${name ? ' ' + name : ''}, you are warmly invited to the ${what} of ${names}. Your invitation: ${link}`;
  $('wa').href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  drawQr(link);
  clearTimeout(timer);
  timer = setTimeout(() => {
    const u = new URL(link);
    u.searchParams.set('preview', '1');
    $('preview').src = u.href;
  }, 450);
}

function drawQr(text) {
  if (typeof window.qrcode !== 'function') return;
  const qr = window.qrcode(0, 'M');
  qr.addData(unescape(encodeURIComponent(text)));
  qr.make();
  const n = qr.getModuleCount(), cv = $('qr'), scale = Math.floor(720 / (n + 8));
  cv.width = cv.height = scale * (n + 8);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#FFFDF5';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#0B3D2E';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + 4) * scale, (r + 4) * scale, scale, scale);
}

$('form').addEventListener('input', update);
$('form').addEventListener('submit', (e) => e.preventDefault());
$('copy').addEventListener('click', async () => {
  used('copy');
  try { await navigator.clipboard.writeText($('link').textContent); $('copied').textContent = 'Link copied.'; }
  catch { getSelection().selectAllChildren($('link')); $('copied').textContent = 'Press Ctrl+C (or long-press) to copy.'; }
});
$('wa').addEventListener('click', () => used('whatsapp'));
$('open').addEventListener('click', () => used('open'));
$('qr-dl').addEventListener('click', () => {
  used('qr');
  $('qr').toBlob((b) => {
    const a = el('a', { href: URL.createObjectURL(b), download: `invite-qr-${cleanText($('name').value, 40).replace(/\W+/g, '-') || 'guest'}.png` });
    document.body.append(a); a.click(); a.remove();
  });
});
if (document.readyState === 'complete') update(); else addEventListener('load', update);
