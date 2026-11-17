// III · Seal your dua: choose a blessing, sign it in gold ink, press the wax seal.
// The letter folds into the keepsake chest and the chest's count goes up (from the Sheet when connected).
import { el, cleanText, track, reducedMotion } from './core.js';

const OWN = '__own__';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createDuas({ root, post, burst, getInvitee, statsUrl }) {
  const choices = root.querySelector('#dua-choices');
  const own = root.querySelector('#dua-own');
  const chosen = root.querySelector('#dua-chosen');
  const letter = root.querySelector('#letter');
  const canvas = root.querySelector('#sign-canvas');
  const clearBtn = root.querySelector('#sign-clear');
  const sealBtn = root.querySelector('#seal-btn');
  const chest = root.querySelector('#chest');
  const countEl = root.querySelector('#chest-count');
  const sent = root.querySelector('#dua-sent');
  const ctx = canvas.getContext('2d');
  let lines = [], pick = 0, signed = false, drawing = false, last = null, busy = false, count = 0;

  const text = () => (pick === OWN ? cleanText(own.value, 160) : lines[pick] || '');
  const showChosen = () => { chosen.textContent = text() ? `“${text()}”` : ''; };

  function renderChoices(list) {
    lines = list;
    choices.replaceChildren(
      ...lines.map((l, i) => el('label', { class: 'pick' }, el('input', { type: 'radio', name: 'dua', value: String(i), checked: i === 0 }), el('span', { text: l }))),
      el('label', { class: 'pick' }, el('input', { type: 'radio', name: 'dua', value: OWN }), el('span', { text: '✍️ In my own words' })));
    pick = 0;
    own.hidden = true;
    showChosen();
  }
  choices.addEventListener('change', (e) => {
    pick = e.target.value === OWN ? OWN : Number(e.target.value);
    own.hidden = pick !== OWN;
    if (pick === OWN) own.focus();
    showChosen();
  });
  own.addEventListener('input', showChosen);

  // ---- gold ink signature ----
  const size = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };
  const ink = () => {
    const g = ctx.createLinearGradient(0, 0, canvas.clientWidth, canvas.clientHeight);
    [['#9C7A3C', 0], ['#F3DFAE', 0.35], ['#D4AF6A', 0.6], ['#FFF1CC', 0.8], ['#B8954F', 1]].forEach(([c, o]) => g.addColorStop(o, c));
    return g;
  };
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; };
  canvas.addEventListener('pointerdown', (e) => {
    if (busy) return;
    if (!canvas.width) size();
    drawing = true;
    canvas.setPointerCapture?.(e.pointerId);
    last = pos(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    const speed = Math.hypot(p.x - last.x, p.y - last.y) / Math.max(1, p.t - last.t);
    ctx.strokeStyle = ink();
    ctx.lineWidth = Math.max(1.4, 3.6 - speed * 1.6); // faster strokes are thinner, like a nib
    ctx.shadowColor = 'rgba(243,223,174,.7)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!reducedMotion() && Math.random() < 0.5) { // glitter left in the ink
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,244,214,${(0.4 + Math.random() * 0.5).toFixed(2)})`;
      ctx.fillRect(p.x + (Math.random() - 0.5) * 10, p.y + (Math.random() - 0.5) * 10, 1.4, 1.4);
    }
    last = p;
    if (!signed) { signed = true; root.classList.add('signed'); }
  });
  const stop = () => { drawing = false; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  clearBtn.addEventListener('click', () => { ctx.clearRect(0, 0, canvas.width, canvas.height); signed = false; root.classList.remove('signed'); });
  new IntersectionObserver(([en], io) => { if (en.isIntersecting) { size(); io.disconnect(); } }).observe(canvas);
  addEventListener('resize', () => { if (!signed) size(); });

  // ---- chest count (from the Sheet when connected) ----
  const setCount = (n) => { count = n; countEl.textContent = String(n); };
  try { setCount(Number(localStorage.getItem('duas-sent') || 0)); } catch { setCount(0); }
  if (statsUrl) {
    new IntersectionObserver(([en], io) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      fetch(statsUrl).then((r) => r.json()).then((d) => { if (d && d.ok && Number.isFinite(+d.duas)) setCount(Math.max(count, +d.duas)); }).catch(() => {});
    }).observe(chest);
  }

  // ---- seal: stamp → fold → into the chest ----
  sealBtn.addEventListener('click', async () => {
    if (busy) return;
    const dua = text();
    if (!dua) { sent.textContent = 'Write a few words first.'; own.focus(); return; }
    busy = true;
    sealBtn.disabled = true;
    sent.textContent = '';
    const still = reducedMotion();
    letter.classList.add('stamped');
    await wait(still ? 0 : 650);
    letter.classList.add('folding');
    chest.classList.add('open');
    await wait(still ? 0 : 1100);
    chest.classList.remove('open');
    burst(chest);
    setCount(count + 1);
    let mine = 1;
    try { mine = Number(localStorage.getItem('duas-sent') || 0) + 1; localStorage.setItem('duas-sent', String(mine)); } catch {}
    sent.textContent = mine > 1 ? `Sealed and delivered (${mine} from you). JazakAllah khair.` : 'Sealed and delivered. JazakAllah khair.';
    track('dua_sent', { signed, own: pick === OWN });
    post({ kind: 'dua', invitee: getInvitee(), dua, signed, website: '' }).catch(() => {});
    await wait(still ? 0 : 900);
    letter.classList.remove('stamped', 'folding');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    signed = false;
    root.classList.remove('signed');
    busy = false;
    sealBtn.disabled = false;
    sealBtn.textContent = 'Seal another';
  });

  return { render: renderChoices };
}
