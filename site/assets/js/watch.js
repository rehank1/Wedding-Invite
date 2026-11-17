// IV · The Evening as a Victorian pocket watch.
// Each moment of a celebration sits on the dial at its real clock time; drag the hand (or use the arrow keys / tap a jewel)
// and it springs to the nearest moment while the readout below changes. A tab switches between the celebrations.
import { el, svgUse, cleanText, safeUrl, formatLongDate, validTime, icsFor, googleCalUrl, download, track, reducedMotion } from './core.js';

const NS = 'http://www.w3.org/2000/svg';
const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const txt = (v, n = 200) => cleanText(v, n);
const svg = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); return n; };

/** Clock angle (0° = XII) for "7:00 PM", "19:30", etc.; null when the text has no time. */
function clockAngle(t) {
  const m = String(t || '').match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  const h = Number(m[1]) % 12, min = Number(m[2] || 0);
  return (h + min / 60) * 30;
}

/** Stops for one celebration, each with a dial angle; untimed moments follow the previous one, at least 40° apart. */
function stopsFor(e) {
  const list = (Array.isArray(e.programme) ? e.programme : []).filter((p) => p && txt(p.title));
  const base = clockAngle(e.time && validTime(e.time) ? `${e.time}` : e.timeNote) ?? 210;
  let prev = null;
  return (list.length ? list : [{ time: e.timeNote || e.time, title: e.name }]).slice(0, 8).map((p) => {
    let a = clockAngle(p.time);
    if (a === null) a = prev === null ? base : prev + 40;
    if (prev !== null && a < prev + 40) a = prev + 40;
    prev = a;
    return { time: txt(p.time, 30), title: txt(p.title, 80), note: txt(p.note, 200), angle: a };
  });
}

export function createWatch(root) {
  const tabs = root.querySelector('.watch-tabs');
  const face = root.querySelector('.watch-face');
  const dial = root.querySelector('.dial');
  const hand = root.querySelector('.hand');
  const markers = root.querySelector('.markers');
  const readout = root.querySelector('.readout');
  const venueBox = root.querySelector('.venue');
  let events = [], ev = 0, stops = [], idx = 0, names = { g: '', b: '' };

  // static dial: minute ticks + Roman numerals
  if (!dial.childElementCount) {
    for (let i = 0; i < 60; i++) {
      const long = i % 5 === 0;
      dial.append(svg('line', { x1: 150, y1: long ? 24 : 27, x2: 150, y2: 33, transform: `rotate(${i * 6} 150 150)`, class: long ? 'tick big' : 'tick' }));
    }
    ROMAN.forEach((r, i) => {
      const a = (i * 30 - 90) * (Math.PI / 180);
      const t = svg('text', { x: (150 + Math.cos(a) * 104).toFixed(1), y: (150 + Math.sin(a) * 104 + 6).toFixed(1), class: 'num', 'text-anchor': 'middle' });
      t.textContent = r;
      dial.append(t);
    });
  }

  const setHand = (deg, animate = true) => {
    hand.style.transition = animate && !reducedMotion() ? '' : 'none';
    hand.style.transform = `rotate(${deg}deg)`;
  };

  function show(i, animate = true) {
    idx = Math.max(0, Math.min(stops.length - 1, i));
    const s = stops[idx];
    setHand(s.angle, animate);
    face.setAttribute('aria-valuenow', String(idx + 1));
    face.setAttribute('aria-valuetext', `${s.time ? s.time + ', ' : ''}${s.title}`);
    [...markers.children].forEach((m, j) => m.setAttribute('aria-pressed', String(j === idx)));
    const fresh = el('div', { class: 'read-in' },
      el('p', { class: 'kicker', text: `Moment ${idx + 1} of ${stops.length}` }),
      el('p', { class: `time gold-text${(s.time || '').length > 8 ? ' long' : ''}`, text: s.time || '·' }),
      el('h3', { class: 'what', text: s.title }),
      s.note ? el('p', { class: 'meta', text: s.note }) : null);
    readout.replaceChildren(fresh);
  }

  function renderVenue(e) {
    const title = `${txt(e.name, 40)} · ${names.g} & ${names.b}`;
    const query = [e.venue, e.address].map((v) => txt(v, 160)).filter(Boolean).join(', ');
    const maps = safeUrl(e.mapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    const mapBox = el('div', { class: 'map', hidden: true });
    const mapBtn = el('button', { class: 'btn', type: 'button', 'aria-expanded': 'false' }, svgUse('i-map'), 'View map');
    mapBtn.addEventListener('click', () => {
      const open = mapBox.hidden;
      mapBox.hidden = !open;
      mapBtn.setAttribute('aria-expanded', String(open));
      if (open && !mapBox.firstChild) {
        mapBox.append(el('iframe', {
          title: `Map of ${txt(e.venue, 80)}`, loading: 'lazy', referrerpolicy: 'no-referrer',
          sandbox: 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox',
          src: `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`,
        }));
        track('maps_click', { event_id: e.id, kind: 'embed' });
      }
    });
    venueBox.id = `venue-${txt(e.id, 20)}`;
    venueBox.replaceChildren(
      el('p', { class: 'label', text: 'The venue' }),
      el('h3', { class: 'big', text: txt(e.venue, 80) }),
      el('p', { class: 'meta', text: txt(e.address, 160) }),
      el('div', { class: 'acts' },
        el('a', { class: 'btn solid', href: maps, target: '_blank', rel: 'noopener noreferrer', onclick: () => track('maps_click', { event_id: e.id, kind: 'open' }) }, svgUse('i-pin'), 'Directions'),
        mapBtn,
        el('button', {
          class: 'btn', type: 'button', onclick: () => {
            download(`${txt(e.id, 20) || 'event'}.ics`, icsFor(e, title), 'text/calendar;charset=utf-8');
            track('calendar_add', { event_id: e.id, kind: 'ics' });
          },
        }, svgUse('i-cal'), 'Add to calendar'),
        el('a', { class: 'btn', href: googleCalUrl(e, title), target: '_blank', rel: 'noopener noreferrer', onclick: () => track('calendar_add', { event_id: e.id, kind: 'google' }) }, svgUse('i-ext'), 'Google Calendar')),
      mapBox);
  }

  function selectEvent(i, focusTab = false) {
    ev = i;
    const e = events[ev];
    stops = stopsFor(e);
    [...tabs.children].forEach((t, j) => { t.setAttribute('aria-selected', String(j === ev)); t.tabIndex = j === ev ? 0 : -1; });
    if (focusTab) tabs.children[ev]?.focus();
    face.setAttribute('aria-valuemax', String(stops.length));
    face.setAttribute('aria-label', `${txt(e.name, 40)} timeline. Turn the hand to see each moment.`);
    root.querySelector('.watch-date').textContent = [formatLongDate(e.date), txt(e.hijri, 60)].filter(Boolean).join(' · ');
    markers.replaceChildren(...stops.map((s, j) => {
      const b = el('button', { class: 'jewel', type: 'button', 'aria-label': `${s.time ? s.time + ': ' : ''}${s.title}`, 'aria-pressed': 'false' }, el('span', { class: 'gem', 'aria-hidden': 'true' }));
      b.style.setProperty('--a', `${s.angle}deg`);
      b.addEventListener('click', () => show(j));
      return b;
    }));
    renderVenue(e);
    show(0, false);
  }

  function render(evs, g, b) {
    events = evs.filter((e) => e);
    names = { g, b };
    tabs.replaceChildren(...events.map((e, i) => {
      const t = el('button', { class: 'wtab', type: 'button', role: 'tab', 'aria-selected': 'false', 'data-event': txt(e.id, 20) },
        el('span', { class: 'wt-name', text: txt(e.name, 40) }), el('span', { class: 'wt-date', text: txt(formatLongDate(e.date).split(',')[0], 20) }));
      t.addEventListener('click', () => selectEvent(i));
      return t;
    }));
    tabs.hidden = events.length < 2;
    if (events.length) selectEvent(Math.min(ev, events.length - 1));
  }

  // drag the hand around the dial; it springs to the nearest moment on release
  const angleAt = (e) => {
    const r = face.getBoundingClientRect();
    const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI + 90;
    return (a + 360) % 360;
  };
  const nearest = (a) => {
    let best = 0, d = Infinity;
    stops.forEach((s, i) => { const x = Math.abs((((a - s.angle) % 360) + 540) % 360 - 180); if (x < d) { d = x; best = i; } });
    return best;
  };
  let dragging = false;
  face.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.jewel')) return;
    dragging = true;
    face.setPointerCapture?.(e.pointerId);
    face.classList.add('dragging');
    const cur = stops[idx]?.angle ?? 0;
    let a = angleAt(e);
    while (a < cur - 180) a += 360;
    while (a > cur + 180) a -= 360;
    setHand(a, false);
  });
  face.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    setHand(angleAt(e) + Math.floor((stops[idx]?.angle ?? 0) / 360) * 360, false);
  });
  const release = (e) => {
    if (!dragging) return;
    dragging = false;
    face.classList.remove('dragging');
    const i = nearest(angleAt(e));
    show(i);
    track('watch_turn', { stop: i + 1 });
  };
  face.addEventListener('pointerup', release);
  face.addEventListener('pointercancel', release);
  face.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowRight', 'ArrowUp'].includes(k)) { e.preventDefault(); show(idx + 1); }
    if (['ArrowLeft', 'ArrowDown'].includes(k)) { e.preventDefault(); show(idx - 1); }
    if (k === 'Home') { e.preventDefault(); show(0); }
    if (k === 'End') { e.preventDefault(); show(stops.length - 1); }
  });
  tabs.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); selectEvent((ev + 1) % events.length, true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); selectEvent((ev - 1 + events.length) % events.length, true); }
  });
  root.querySelector('.w-prev').addEventListener('click', () => show(idx - 1));
  root.querySelector('.w-next').addEventListener('click', () => show(idx + 1));

  return { render, show: (i) => show(i), get index() { return idx; }, get count() { return stops.length; } };
}
