// Time-aware invite: the page knows whether it is weeks before, the week of, the day of, or after the wedding,
// and a floating action dock keeps Directions / Calendar / RSVP one tap away.
import { el, svgUse, cleanText, safeUrl, istDate, validDate, validTime, icsFor, download, track } from './core.js';

const HOUR = 3600e3, DAY = 24 * HOUR;
const txt = (v, n = 200) => cleanText(v, n);
const timesOf = (e) => {
  const start = istDate(e.date, validTime(e.time) ? e.time : '19:00');
  let end = validTime(e.endTime) ? istDate(e.date, e.endTime) : new Date(start.getTime() + 4 * HOUR);
  if (end <= start) end = new Date(end.getTime() + DAY);
  return { start, end };
};
const istDay = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

/** 'invite' | 'week' | 'day' | 'after'. `?mode=` overrides it (for previews). */
export function getPhase(events, now = new Date(), override = '') {
  if (['invite', 'week', 'day', 'after'].includes(override)) return override;
  const evs = events.filter((e) => validDate(e.date));
  if (!evs.length) return 'invite';
  const spans = evs.map(timesOf).sort((a, b) => a.start - b.start);
  const first = spans[0].start, last = spans.at(-1).end;
  if (now > new Date(last.getTime() + 6 * HOUR)) return 'after';
  if (evs.some((e) => e.date === istDay(now))) return 'day';
  if (now >= new Date(first.getTime() - 7 * DAY)) return 'week';
  return 'invite';
}

/** The next event that hasn't finished yet (or the last one). */
export function nextEvent(events, now = new Date()) {
  const evs = events.filter((e) => validDate(e.date)).sort((a, b) => a.date.localeCompare(b.date));
  return evs.find((e) => timesOf(e).end > now) || evs.at(-1);
}

function statusOf(e, now) {
  const { start, end } = timesOf(e);
  const at = start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  if (now < start) return { k: 'soon', t: `Begins at ${at}${/maghrib/i.test(e.timeNote || '') ? ', after Maghrib' : ''}` };
  if (now < end) return { k: 'live', t: 'Happening now' };
  return { k: 'done', t: 'Concluded. JazakAllah khair for coming.' };
}

/** Hero line + the "Today" card + phase attribute on <html>. */
export function renderPhase({ phase, events, content, now = new Date() }) {
  document.documentElement.dataset.phase = phase;
  const line = document.getElementById('hero-phase');
  const nxt = nextEvent(events, now);
  const day = nxt && validDate(nxt.date) ? istDate(nxt.date, '12:00').toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Asia/Kolkata' }) : '';
  line.textContent = {
    invite: '',
    week: nxt ? `See you on ${day}, InshaAllah` : '',
    day: nxt ? `Today · ${txt(nxt.name, 40)}` : '',
    after: 'Thank you for celebrating with us',
  }[phase];
  line.hidden = !line.textContent;

  const today = document.getElementById('today');
  const todays = phase === 'day' ? events.filter((e) => e.date === istDay(now)) : [];
  const list = todays.length ? todays : phase === 'day' && nxt ? [nxt] : [];
  today.hidden = !list.length;
  if (today.hidden) return;
  const d = content.dayOf || {};
  const album = safeUrl(d.photoAlbumUrl);
  today.querySelector('.today-list').replaceChildren(...list.map((e) => {
    const s = statusOf(e, now);
    return el('li', { class: `today-item ${s.k}` },
      el('span', { class: 'dot', 'aria-hidden': 'true' }),
      el('div', {}, el('strong', { text: txt(e.name, 40) }), el('span', { text: s.t })));
  }));
  today.querySelector('.today-extra').replaceChildren(
    txt(d.parking, 300) ? el('p', {}, el('span', { class: 'label', text: 'Parking' }), el('br'), txt(d.parking, 300)) : '',
    txt(d.note, 300) ? el('p', { text: txt(d.note, 300) }) : '',
    album ? el('a', { class: 'btn solid', href: album, target: '_blank', rel: 'noopener noreferrer', onclick: () => track('album_open') }, 'Add your photos to our album') : '');
}

/** Floating glass dock: Directions · Calendar · Next chapter. */
export function initDock({ events, phase, onNext }) {
  const dock = document.getElementById('dock');
  if (!dock) return;
  const nxt = nextEvent(events);
  const query = nxt ? [nxt.venue, nxt.address].map((v) => txt(v, 120)).filter(Boolean).join(', ') : '';
  const maps = nxt ? safeUrl(nxt.mapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
  const item = (icon, label, attrs) => el(attrs.href ? 'a' : 'button', { class: 'dock-btn', type: attrs.href ? null : 'button', ...attrs }, svgUse(icon), el('span', { text: label }));
  const items = [];
  if (maps) items.push(item('i-pin', 'Directions', { href: maps, target: '_blank', rel: 'noopener noreferrer', onclick: () => track('maps_click', { event_id: nxt.id, kind: 'dock' }) }));
  if (nxt && phase !== 'after') {
    items.push(item('i-cal', 'Calendar', {
      onclick: () => {
        download(`${txt(nxt.id, 20) || 'event'}.ics`, icsFor(nxt, txt(nxt.name, 40)), 'text/calendar;charset=utf-8');
        track('calendar_add', { event_id: nxt.id, kind: 'dock' });
      },
    }));
  }
  items.push(item('i-down', 'Next', { class: 'dock-btn primary', 'aria-label': 'Next chapter', onclick: onNext }));
  dock.replaceChildren(...items);
  dock.hidden = false;
}
