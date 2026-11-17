import {
  el, svgUse, cleanText, safeUrl, loadJSON, readInvite, formatLongDate, verifyInvite, validDate, validTime, istDate,
  icsFor, googleCalUrl, download, initAnalytics, track, reducedMotion, initTheme,
} from './core.js';
import { initFloat, initScratch } from './royal.js';
initTheme(document.getElementById('theme-btn'));
import { getPhase, renderPhase, initDock } from './moments.js';
import { createWatch } from './watch.js';
import { createDuas } from './duas.js';
import { drawBotanicals, blossom } from './botanic.js';
import { initWatercolors } from './watercolor.js';
import { createMusic } from './music.js';

const root = document.documentElement;
root.classList.add('js');
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const PREVIEW = params.get('preview') === '1';
const state = { content: null, invite: { to: '', events: [] }, events: [], phase: 'invite', dock: null, current: 'couple', duaLines: [] };

const txt = (v, max = 400) => cleanText(v, max);
const setText = (id, v) => { const n = $(id); if (n) n.textContent = v; };
const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const endpoint = () => { const u = safeUrl(obj(state.content?.site).rsvpEndpoint); return u.startsWith('https://script.google.com/') ? u : ''; };
async function post(payload) {
  const url = endpoint();
  if (!url) return { ok: true, preview: true };
  const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'failed');
  return data;
}
const PICKS = ['coke', 'green', 'barood', 'lsd', 'shroom', 'anything'];
const DEFAULT_DUAS = [
  'May Allah bless your union and fill your home with mercy.',
  'May your love be a source of peace, and your home a place of tranquillity.',
  'May Allah unite you both in goodness, in this world and the next.',
];

// ---------- render (re-runnable: /admin live preview calls it on every edit) ----------
function render() {
  const c = state.content;
  const couple = obj(c.couple), w = obj(c.wording);
  const groom = obj(couple.groom), bride = obj(couple.bride);
  const all = arr(c.events).map(obj).filter((e) => e.id);
  const ids = all.map((e) => String(e.id));
  // with a signing key set, only a genuine signed code (?i=) can name a guest; plain ?to= links are ignored
  state.invite = obj(c.site).inviteKey ? (state.signed || { to: '', events: ids }) : readInvite(location.search, ids);
  const events = all.filter((e) => state.invite.events.includes(String(e.id)));
  state.events = events;
  state.phase = getPhase(events, new Date(), params.get('mode') || '');
  const g = txt(groom.name, 40) || 'Groom', b = txt(bride.name, 40) || 'Bride';
  const to = state.invite.to;

  // opening + couple
  setText('env-names', `${g} & ${b}`);
  setText('env-for', to ? `For ${to}` : '');
  $('dear').hidden = !to;
  setText('dear', to ? `Dear ${to},` : '');
  setText('n-groom', g);
  setText('n-bride', b);
  const place = [events[0]?.venue, String(events[0]?.address || '').split(',').pop()].map((v) => txt(v, 60)).filter(Boolean).join(' · ');
  $('hero-when').replaceChildren(
    ...events.flatMap((e, i) => [
      i ? el('span', { class: 'sep', 'aria-hidden': 'true' }) : '',
      el('span', { text: `${txt(e.name, 40)} · ${validDate(e.date) ? istDate(e.date, '12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }) : ''}` }),
    ]),
    place ? el('span', { class: 'sep', 'aria-hidden': 'true' }) : '',
    place ? el('span', { text: place }) : '');

  // invitation
  setText('bism', txt(w.bismillahArabic, 200));
  setText('bism-en', txt(w.bismillahEnglish, 200));
  setText('memorial', txt(w.memorial, 400));
  const occ = events.map((e) => txt(e.occasion, 200)).filter(Boolean);
  const SUF = / of their beloved son$/;
  const joined = occ.length > 1 && occ.every((o) => SUF.test(o)) ? occ.map((o) => o.replace(SUF, '')).join(' and ') + ' of their beloved son' : occ.join(', and ');
  setText('request', `${txt(w.request, 400)} ${joined}.`.trim());
  setText('groom-name', g);
  setText('groom-of', txt(groom.parents, 200));
  setText('bride-name', b);
  setText('bride-of', txt(bride.parents, 200));
  setText('closing', txt(w.closing, 400));

  // closing chapter
  $('dua').replaceChildren(
    w.closingDuaArabic ? el('p', { class: 'ar', lang: 'ar', dir: 'rtl', text: txt(w.closingDuaArabic, 300) }) : '',
    w.closingDuaEnglish ? el('p', { class: 'accent', text: txt(w.closingDuaEnglish, 300) }) : '');
  $('credits').replaceChildren(
    el('div', {}, el('p', { class: 'label', text: 'With best compliments from' }), el('p', { class: 'who', text: txt(w.compliments, 200) })),
    el('div', {}, el('p', { class: 'label', text: 'With love and duas from' }), el('p', { class: 'who', text: txt(w.duasFrom, 200) })));
  const tag = txt(couple.hashtag, 40).replace(/^#/, '');
  $('f-hashtag').hidden = !tag;
  setText('f-hashtag', tag ? `#${tag}` : '');
  setText('f-thanks', txt(obj(c.footer).thanks, 160) || 'Thank you for being part of our story.');

  state.duaLines = arr(w.duaLines).map((s) => txt(s, 200)).filter(Boolean);
  if (!state.duaLines.length) state.duaLines = DEFAULT_DUAS;
  duas?.render(state.duaLines);

  renderTour(events, g, b);
  renderCountdown(events);
  renderAfterHours(obj(c.afterparty));
  renderPhase({ phase: state.phase, events, content: c });
  document.title = `${g} & ${b} · ${events.map((e) => txt(e.name, 30)).join(' & ')}`;
  buildRail();
  observeReveals();
}

// ---------- IV. the evening (pocket watch: see watch.js) ----------
let watch = null;
function renderTour(events, g, b) { (watch ||= createWatch($('watch'))).render(events, g, b); }

// ---------- III. seal your dua: see duas.js ----------
let duas = null;

function burst(from) {
  if (reducedMotion() || !from) return;
  const r = from.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + Math.random() * 0.3, dist = 80 + Math.random() * 140;
    const s = el('span', { class: `spark${i % 3 ? '' : ' rose'}`, 'aria-hidden': 'true' });
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    s.style.setProperty('--tx', `${Math.cos(a) * dist}px`);
    s.style.setProperty('--ty', `${Math.sin(a) * dist}px`);
    s.style.setProperty('--d', `${0.8 + Math.random() * 0.7}s`);
    document.body.append(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

// ---------- V. flip countdown ----------
let cdTimer = 0, cdIo = null;
function flipUnit(label) {
  const mk = (cls) => el('div', { class: `h ${cls}` }, el('span'));
  const flip = el('div', { class: 'flip', 'aria-hidden': 'true' }, mk('t'), mk('b'), mk('t leaf'), mk('b leaf'));
  const sr = el('span', { class: 'sr-only' });
  const unit = el('div', { class: 'unit' }, flip, el('span', { class: 'label', text: label }), sr);
  let cur = null;
  unit.set = (v) => {
    const s = String(v).padStart(2, '0');
    if (s === cur) return;
    const [top, bot, ltop, lbot] = flip.querySelectorAll('span');
    sr.textContent = `${s} ${label}`;
    if (cur === null || reducedMotion() || document.hidden) {
      [top, bot, ltop, lbot].forEach((n) => (n.textContent = s));
    } else {
      top.textContent = s; lbot.textContent = s; ltop.textContent = cur; bot.textContent = cur;
      flip.classList.remove('go');
      void flip.offsetWidth;
      flip.classList.add('go');
      setTimeout(() => { bot.textContent = s; ltop.textContent = s; flip.classList.remove('go'); }, 650);
    }
    cur = s;
  };
  return unit;
}
function renderCountdown(events) {
  clearInterval(cdTimer);
  const next = events.filter((e) => validDate(e.date)).sort((a, b) => a.date.localeCompare(b.date))[0];
  $('countdown').hidden = !next;
  if (!next) return;
  const target = istDate(next.date, validTime(next.time) ? next.time : '19:00').getTime();
  setText('cd-label', `Counting down to the ${txt(next.name, 40)}`);
  setText('cd-under', txt(next.timeNote, 120));
  initScratch({ text: formatLongDate(next.date).replace(/,/g, ''), onReveal: () => { burst($('scratch-canvas')); track('scratch_reveal'); } });
  const units = ['Days', 'Hours', 'Minutes', 'Seconds'].map(flipUnit);
  $('flips').replaceChildren(...units);
  const tick = () => {
    let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
    if (s === 0) { clearInterval(cdTimer); $('flips').replaceChildren(); setText('cd-h', 'The celebrations have begun'); return; }
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    [d, h, Math.floor(s / 60), s % 60].forEach((v, i) => units[i].set(v));
  };
  tick();
  cdIo?.disconnect();
  cdIo = new IntersectionObserver(([en]) => { clearInterval(cdTimer); if (en.isIntersecting) { tick(); cdTimer = setInterval(tick, 1000); } });
  cdIo.observe($('flips'));
}

// ---------- after hours (easter egg) ----------
function renderAfterHours(a) {
  setText('ah-h', txt(a.name, 40) || 'After Hours');
  const when = [validDate(a.date) ? formatLongDate(a.date) : '', txt(a.time, 30)].filter(Boolean).join(' · ');
  const maps = safeUrl(a.mapsUrl);
  $('ah-details').replaceChildren(
    el('div', {}, el('dt', { text: 'When' }), el('dd', { text: when || 'Whispered closer to the day' })),
    el('div', {}, el('dt', { text: 'Where' }), el('dd', { text: txt(a.venue, 80) || 'Revealed on the night' })),
    maps ? el('div', {}, el('a', { class: 'btn', href: maps, target: '_blank', rel: 'noopener noreferrer', onclick: () => track('maps_click', { event_id: 'afterparty', kind: 'open' }) }, svgUse('i-ext'), 'Open in Maps')) : '',
    el('div', {}, el('dt', { text: 'Dress code' }), el('dd', { text: txt(a.dressCode, 120) || 'Sharp, comfortable, ready to dance' })));
  setText('ah-note', txt(a.note, 300));
  if (state.invite.to && !$('ah-name').value) $('ah-name').value = state.invite.to;
}
function initEgg() {
  const dlg = $('afterhours'), card = $('ah-card'), crest = $('crest-btn'), form = $('ah-form'), hype = $('ah-hype');
  hype.addEventListener('input', () => setText('ah-hype-out', hype.value));
  const unlock = () => {
    if (dlg.open || !root.classList.contains('opened')) return;
    dlg.showModal();
    hype.focus({ preventScroll: true });
    track('egg_unlock');
    const flip = () => card.classList.add('flipped');
    if (reducedMotion()) flip(); else requestAnimationFrame(() => requestAnimationFrame(flip));
  };
  dlg.addEventListener('close', () => card.classList.remove('flipped'));
  $('ah-close').addEventListener('click', () => dlg.close());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const name = cleanText(f.get('name'), 60);
    if (name.length < 2) { setText('ah-msg', 'Tell us who is coming.'); $('ah-name').focus(); return; }
    const payload = {
      kind: 'afterparty', name, invitee: state.invite.to, website: String(f.get('website') || ''),
      hype: Math.min(10, Math.max(1, parseInt(f.get('hype'), 10) || 1)),
      headcount: Math.min(10, Math.max(0, parseInt(f.get('headcount'), 10) || 0)),
      picks: f.getAll('picks').map(String).filter((p) => PICKS.includes(p)),
    };
    $('ah-add').disabled = true;
    try {
      const r = await post(payload);
      setText('ah-msg', `You're on the list, ${name}.${r.preview ? ' (Preview mode: not saved yet.)' : ''}`);
      track('afterparty_join', { hype: payload.hype, headcount: payload.headcount });
      burst($('ah-add'));
    } catch (err) {
      setText('ah-msg', err.message === 'rate_limited' ? 'You have already signed up a few times. Try again later.' : 'Could not send that just now. Please try again.');
    } finally { $('ah-add').disabled = false; }
  });
  // hidden on purpose: 7 quick taps (within 6 s) on the small monogram at the very end, no visual feedback
  let taps = [];
  crest.addEventListener('click', () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < 6000).concat(now);
    if (taps.length >= 7) { taps = []; unlock(); }
  });
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let k = 0;
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select')) return;
    const key = (e.key || '').toLowerCase();
    k = key === KONAMI[k] ? k + 1 : key === KONAMI[0] ? 1 : 0;
    if (k === KONAMI.length) { k = 0; unlock(); }
  });
}

// ---------- chapters: rail, progress, next ----------
let railIo = null;
const chapters = () => [...document.querySelectorAll('#main .ch')].filter((s) => !s.hidden && getComputedStyle(s).display !== 'none');
function buildRail() {
  const rail = $('rail');
  const list = chapters();
  rail.replaceChildren(...list.map((s) => el('a', { href: `#${s.id}`, 'aria-label': s.dataset.title }, el('span', { text: s.dataset.title }))));
  railIo?.disconnect();
  railIo = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    state.current = en.target.id;
    rail.querySelectorAll('a').forEach((a) => {
      const on = a.getAttribute('href') === `#${en.target.id}`;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
  }), { threshold: 0.45 });
  list.forEach((s) => railIo.observe(s));
}
function nextChapter() {
  const list = chapters();
  const i = list.findIndex((s) => s.id === state.current);
  const target = i >= list.length - 1 ? list[0] : list[i + 1];
  target?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}
function initProgress() {
  const bar = el('div', { class: 'progress', 'aria-hidden': 'true' });
  document.body.append(bar);
  let raf = 0;
  addEventListener('scroll', () => {
    raf ||= requestAnimationFrame(() => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : '0');
    });
  }, { passive: true });
}

// ---------- first page: botanicals draw in, blossoms drift down ----------
function initFirstPage() {
  const art = document.querySelector('#envelope .art');
  if (art) drawBotanicals(art);
  if (reducedMotion() || document.getElementById('env-film')) return; // the envelope film is the opening now
  const fall = document.querySelector('#envelope .falling');
  for (let i = 0; i < 7; i++) {
    const b = blossom(10 + Math.random() * 10);
    b.style.setProperty('--x', `${8 + Math.random() * 84}vw`);
    b.style.setProperty('--d', `${9 + Math.random() * 7}s`);
    b.style.setProperty('--dl', `${2.5 + i * 1.6 + Math.random()}s`);
    b.style.setProperty('--sway', `${(Math.random() - 0.5) * 30}vw`);
    fall.append(b);
  }
}

// ---------- opening ----------
function initEnvelope() {
  const env = $('envelope'), main = $('main');
  const seen = () => { try { return sessionStorage.getItem('opened') === '1'; } catch { return false; } };
  const lock = (on) => { main.inert = on; $('footer').inert = on; };
  const finish = () => {
    if (root.classList.contains('opened')) return;
    root.classList.add('opened');
    lock(false);
    try { sessionStorage.setItem('opened', '1'); } catch {}
    setTimeout(() => state.startMusic?.(), 700); // music begins just after the invitation opens (never competes with the reveal)
    track('invite_open', { personalised: !!state.invite.to });
    $('names').focus({ preventScroll: true });
  };
  if (PREVIEW || seen() || params.get('skip') === '1') {
    $('env-film')?.remove(); // the envelope isn't shown: don't keep a video element (and its decoder) around
    root.classList.add('opened');
    return;
  }
  lock(true);
  const film = document.getElementById('env-film');
  // fetch the film once the page has settled, so it never competes with first paint (the poster is the first frame)
  if (film && !reducedMotion()) addEventListener('load', () => setTimeout(() => { film.preload = 'auto'; film.load(); }, 600), { once: true });
  const reveal = () => {
    if (env.classList.contains('opening')) return;
    env.classList.add('opening');
    root.classList.add('revealing');
    setTimeout(finish, 1350);
  };
  const open = () => {
    if (env.classList.contains('opening') || env.classList.contains('playing')) return;
    if (reducedMotion()) { finish(); return; }
    state.startMusic?.(); // inside the tap, so phones allow the sound
    if (!film) { reveal(); return; }
    env.classList.add('playing');
    // the seal breaks and golden light floods the frame; fade into the invitation as the light peaks
    const peak = () => { if (film.duration && film.currentTime >= film.duration - 1.5) reveal(); };
    film.addEventListener('timeupdate', peak);
    film.addEventListener('ended', reveal, { once: true });
    film.addEventListener('error', reveal, { once: true });
    // never strand a guest: if the film isn't actually playing within 1.5 s (slow network), open with the plain fade;
    // once it plays, it can't run past its own length
    const stall = setTimeout(() => { if (film.paused || film.currentTime < 0.2) reveal(); }, 1500);
    film.addEventListener('playing', () => { clearTimeout(stall); setTimeout(reveal, Math.max(1000, ((film.duration || 8) - film.currentTime) * 1000)); }, { once: true });
    const p = film.play();
    if (p) p.catch(reveal);
  };
  $('seal').addEventListener('click', open);
  $('env-skip').addEventListener('click', finish);
  env.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); });
}

// ---------- music: generative score (music.js), or your own MP3 if content.music.src is set ----------
function initMusic(m) {
  // m.src: one file or a playlist; tracks play in turn and loop, softly faded in
  const list = [].concat(m.src || []).map((u) => safeUrl(u, { relative: true })).filter(Boolean);
  const src = list[0] || '';
  let track_ = 0;
  const btn = $('music-btn');
  const canSynth = !!(window.AudioContext || window.webkitAudioContext);
  btn.hidden = !src && !canSynth; // no Web Audio and no file: no music button
  if (btn.hidden) return;
  let audio = null;
  const gen = src ? null : createMusic();
  const set = (on) => { btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Pause music' : 'Play music'); };
  const play = () => {
    if (src) {
      if (!audio) {
        audio = Object.assign(new Audio(src), { loop: list.length === 1, preload: 'auto', volume: 0 });
        audio.addEventListener('ended', () => { track_ = (track_ + 1) % list.length; audio.src = list[track_]; audio.play().catch(() => {}); });
      }
      // gentle fade up to a quiet level, so it never startles
      clearInterval(audio._fade); audio._fade = setInterval(() => { audio.volume = Math.min(0.42, audio.volume + 0.02); if (audio.volume >= 0.42) clearInterval(audio._fade); }, 120);
      audio.play().then(() => set(true)).catch(() => { // Safari: wait for the next tap
        set(false);
        addEventListener('pointerdown', () => { if (wanted()) audio.play().then(() => set(true)).catch(() => {}); }, { once: true });
      });
    } else { gen.start(); set(true); }
  };
  const pause = () => { if (src) audio?.pause(); else gen.stop(); set(false); };
  const wanted = () => { try { return localStorage.getItem('music') !== 'off'; } catch { return true; } };
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    try { localStorage.setItem('music', on ? 'on' : 'off'); } catch {}
    if (on) play(); else pause();
    track('music_toggle', { on });
  });
  // browsers only allow sound after a tap: start on "Open the invitation", or the first tap anywhere if it's already open
  state.startMusic = () => { if (wanted() && btn.getAttribute('aria-pressed') !== 'true') play(); };
  // music is on by default from the start: try straight away (some browsers allow it), and otherwise begin on the very
  // first tap or key anywhere, even on the intro. A guest who switched it off stays off.
  if (wanted() && !PREVIEW) {
    if (src) play();
    const first = (e) => {
      removeEventListener('pointerdown', first, true); removeEventListener('keydown', first, true);
      if (!e.target.closest?.('#music-btn')) state.startMusic();
    };
    addEventListener('pointerdown', first, true);
    addEventListener('keydown', first, true);
  }
  document.addEventListener('visibilitychange', () => {
    if (btn.getAttribute('aria-pressed') !== 'true') return;
    if (src) { if (document.hidden) audio?.pause(); else audio?.play().catch(() => {}); }
    else if (document.hidden) gen.suspend(); else gen.resume();
  });
}

// ---------- reveal on scroll ----------
let io = null;
function observeReveals() {
  const nodes = document.querySelectorAll('[data-reveal]:not(.in)');
  if (!('IntersectionObserver' in window) || reducedMotion()) { nodes.forEach((n) => n.classList.add('in')); return; }
  io ||= new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  nodes.forEach((n) => io.observe(n));
}

// ---------- signed personal link: check it once, then tidy the address bar to just the site ----------
async function readSignedInvite() {
  const key = obj(state.content.site).inviteKey;
  if (!key) return;
  let token = params.get('i');
  try { if (token) sessionStorage.setItem('invite', token); else token = sessionStorage.getItem('invite'); } catch {}
  const ids = arr(state.content.events).map(obj).filter((e) => e.id).map((e) => String(e.id));
  state.signed = token ? await verifyInvite(token, key, ids) : null;
  // the code (and any old ?to=/?e=) leave the address bar, so the link a guest sees is just the site
  if (['i', 'to', 'e'].some((k) => params.has(k)) && !PREVIEW) {
    const u = new URL(location.href);
    ['i', 'to', 'e'].forEach((k) => u.searchParams.delete(k));
    history.replaceState(null, '', u.pathname + (u.search === '?' ? '' : u.search) + u.hash);
  }
}

// ---------- boot ----------
async function boot() {
  initFirstPage();
  initEnvelope();
  state.content = obj(await loadJSON('content/content.json'));
  await readSignedInvite();
  const ep = endpoint();
  duas = createDuas({ root: $('duas'), post, burst, getInvitee: () => state.invite.to, statsUrl: ep ? `${ep}?action=stats` : '' });
  render();
  requestAnimationFrame(() => document.dispatchEvent(new Event('invite-rendered')));
  initEgg();
  initProgress();
  initMusic(obj(state.content.music));
  state.dock = initDock({ events: state.events, phase: state.phase, onNext: nextChapter });
  (window.requestIdleCallback || setTimeout)(() => initFloat($('float-layer')), { timeout: 2500 });
  (window.requestIdleCallback || setTimeout)(() => initWatercolors([...document.querySelectorAll('#main .ch')]).catch(() => {}), { timeout: 3000 });
  if (PREVIEW) {
    addEventListener('message', (e) => {
      if (e.origin !== location.origin || e.data?.type !== 'content') return;
      state.content = obj(e.data.content);
      try { render(); } catch (err) { console.warn('Preview render failed', err); }
    });
    parent.postMessage({ type: 'preview-ready' }, location.origin);
    return;
  }
  initAnalytics(obj(state.content.site).ga4, $('consent'));
  if (state.invite.to) track('personalised_open');
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot().catch((err) => {
  console.warn('Invite failed to load', err);
  root.classList.add('opened');
  $('main').inert = false;
});
