// The single sign-in for the private pages (/create, /admin, /dashboard). On success: back to the page you came from.
import { loadJSON, checkPass, loginKey, openKey, initTheme } from './core.js';

initTheme();
const $ = (id) => document.getElementById(id);
const PAGES = { create: '../create/', admin: '../dashboard/', dashboard: '../dashboard/', content: '../admin/' }; // Admin opens on its Dashboard tab
const next = PAGES[new URLSearchParams(location.search).get('next')] || PAGES.dashboard; // only our own pages
// listen at once (a quick Enter must never fall through to a plain form submit); the settings arrive in the background
const area = new URLSearchParams(location.search).get('next') === 'create' ? 'create' : 'admin';
const ready = loadJSON('../content/content.json').then((c) => {
  const stored = (area === 'create' ? c.site?.createLogin : c.site?.adminLogin) || '';
  if (!stored) $('nopass').hidden = false;
  return { stored, seal: (area === 'create' ? c.site?.createSeal : c.site?.adminSeal) || '' };
});

$('login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { stored, seal } = await ready;
  const pass = loginKey($('user').value, $('pass').value);
  $('go').disabled = true;
  const ok = !stored || (await checkPass(pass, stored));
  $('go').disabled = false;
  if (!ok) { $('login-msg').textContent = 'That username and password did not match.'; $('pass').select(); return; }
  try { sessionStorage.setItem(`gate:${area}`, stored); } catch {}
  const key = seal ? await openKey(pass, seal) : ''; // personal links can be made without pasting anything
  try { if (key) sessionStorage.setItem('inviteSigningKey', key); } catch {}
  location.replace(next);
});
$('user').focus();
