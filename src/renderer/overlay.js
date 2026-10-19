'use strict';
// Overlay: shows a frozen frame for exact alignment, collects user marks (normalized), renders AI annotations.
const frame = document.getElementById('frame');
const marksC = document.getElementById('marks');
const aiC = document.getElementById('ai');
const bar = document.getElementById('bar');
const hint = document.getElementById('hint');
let tool = 'pen';
let shapes = [];       // user shapes, normalized
let drawing = null;
let ai = [];
let live = false;
let reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const COLORS = { pen: '#3b82f6', circle: '#3b82f6', rect: '#3b82f6', arrow: '#3b82f6', highlight: 'rgba(56,189,248,.35)', redact: '#000' };
const POINTER_COLORS = { blue: ['#22d3ee', '#2563eb'], yellow: ['#facc15', '#ca8a04'], orange: ['#fb923c', '#ea580c'], red: ['#f87171', '#dc2626'], green: ['#4ade80', '#16a34a'] };
let AI_COLOR = '#22d3ee';
function setPointerColor(name) {
  const [c, dark] = POINTER_COLORS[name] || POINTER_COLORS.blue;
  AI_COLOR = c;
  document.documentElement.style.setProperty('--ai', c); document.documentElement.style.setProperty('--ai-dark', dark);
}

function fit(c) {
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
}
function resize() { fit(marksC); fit(aiC); drawUser(); drawAI(); }
addEventListener('resize', resize);

const norm = (e) => ({ x: Math.min(1, Math.max(0, e.clientX / innerWidth)), y: Math.min(1, Math.max(0, e.clientY / innerHeight)) });
const px = (p, W = innerWidth, H = innerHeight) => ({ x: p.x * W, y: p.y * H });

function arrowHead(ctx, a, b, size) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - size * Math.cos(ang - 0.4), b.y - size * Math.sin(ang - 0.4));
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - size * Math.cos(ang + 0.4), b.y - size * Math.sin(ang + 0.4));
  ctx.stroke();
}

function drawShape(ctx, s, W, H, color) {
  ctx.save();
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = color || COLORS[s.tool]; ctx.fillStyle = color || COLORS[s.tool];
  const p = s.points.map((q) => px(q, W, H));
  const a = p[0], b = p[p.length - 1];
  if (s.tool === 'pen') { ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke(); }
  else if (s.tool === 'circle') { ctx.beginPath(); ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2 || 1, Math.abs(b.y - a.y) / 2 || 1, 0, 0, 7); ctx.stroke(); }
  else if (s.tool === 'rect') ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  else if (s.tool === 'highlight' || s.tool === 'redact') ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  else if (s.tool === 'arrow') { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); arrowHead(ctx, a, b, 16); }
  ctx.restore();
}

function drawUser() {
  const ctx = marksC.getContext('2d');
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  [...shapes, drawing].filter(Boolean).forEach((s) => drawShape(ctx, s, innerWidth, innerHeight));
}

function label(ctx, text, at) {
  if (!text) return;
  ctx.save();
  ctx.font = '500 13px -apple-system,BlinkMacSystemFont,system-ui,sans-serif';
  const w = ctx.measureText(text).width + 20, h = 26;
  const x = Math.min(Math.max(6, at.x), innerWidth - w - 6), y = Math.min(Math.max(h + 4, at.y), innerHeight - 8);
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(28,28,30,.88)';
  ctx.beginPath(); ctx.roundRect(x, y - h + 6, w, h, 8); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 0.75; ctx.stroke();
  ctx.fillStyle = AI_COLOR; ctx.beginPath(); ctx.arc(x + 9, y - h / 2 + 6, 2.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#f5f5f7'; ctx.fillText(text, x + 15, y - 3);
  ctx.restore();
}

// Geometry of an annotation as a polyline in px, used both to draw progressively and to move the AI cursor along it.
function pathOf(a) {
  const W = innerWidth, H = innerHeight;
  switch (a.type) {
    case 'circle': case 'target': {
      const c = px(a.center); const r = a.radius * Math.min(W, H); const pts = [];
      for (let i = 0; i <= 48; i += 1) { const t = -Math.PI / 2 + (i / 48) * Math.PI * 2; pts.push({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) }); }
      return pts; }
    case 'arrow': return [px(a.start), px(a.end)];
    case 'drag': { // gentle arc, like a hand pulling something across
      const f = px(a.from), t = px(a.to); const pts = [];
      const dx = t.x - f.x, dy = t.y - f.y, len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(90, len * 0.2), nx = -dy / len, ny = dx / len;
      for (let i = 0; i <= 32; i += 1) { const u = i / 32, k = 4 * u * (1 - u); pts.push({ x: f.x + dx * u + nx * bend * k, y: f.y + dy * u + ny * bend * k }); }
      return pts; }
    case 'rectangle': { const x = a.x * W, y = a.y * H, w = a.w * W, h = a.h * H; return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }]; }
    case 'highlight': { const y = (a.y + a.h / 2) * H; return [{ x: a.x * W, y }, { x: (a.x + a.w) * W, y }]; }
    case 'freehand': case 'polygon': { const p = a.points.map((q) => px(q)); if (a.type === 'polygon') p.push(p[0]); return p; }
    case 'step': case 'label': return [px(a.at)];
    default: return [];
  }
}

// Point at fraction p along a polyline + the partial polyline.
function partial(pts, p) {
  if (pts.length < 2) return { pts, tip: pts[0] };
  const seg = []; let total = 0;
  for (let i = 1; i < pts.length; i += 1) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); total += d; }
  let left = total * Math.min(1, Math.max(0, p)); const out = [pts[0]];
  for (let i = 1; i < pts.length; i += 1) {
    if (left >= seg[i - 1]) { out.push(pts[i]); left -= seg[i - 1]; continue; }
    const f = seg[i - 1] ? left / seg[i - 1] : 0;
    out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f });
    break;
  }
  return { pts: out, tip: out[out.length - 1] };
}

function drawAI(t = 1) {
  const ctx = aiC.getContext('2d');
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ai.forEach((a) => {
    const p = a._p == null ? 1 : a._p;
    if (p <= 0) return;
    const W = innerWidth, H = innerHeight;
    ctx.save();
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = AI_COLOR; ctx.fillStyle = AI_COLOR;
    ctx.shadowColor = 'rgba(34,211,238,.8)'; ctx.shadowBlur = 12;
    if (a.type === 'highlight') {
      ctx.globalAlpha = 0.3; ctx.shadowBlur = 0; ctx.fillRect(a.x * W, a.y * H, a.w * W * p, a.h * H);
    } else if (a.type === 'step') {
      const c = px(a.at); const r = 15 * Math.min(1, p * 1.4);
      ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.fill();
      if (p > 0.5) { ctx.shadowBlur = 0; ctx.fillStyle = '#04122e'; ctx.font = '700 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(a.n || 1), c.x, c.y + 6); }
    } else if (a.type !== 'label') {
      const { pts } = partial(pathOf(a), p);
      if (a.type === 'drag') ctx.setLineDash([10, 9]);
      if (a.type === 'target' && p >= 1) { const pulse = 1 + 0.08 * Math.sin(t * 6); const c = px(a.center); const r = a.radius * Math.min(W, H);
        ctx.beginPath(); ctx.arc(c.x, c.y, r * pulse, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.35, 0, 7); ctx.stroke(); }
      else { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke(); }
      if (a.type === 'arrow' && p > 0.92) arrowHead(ctx, px(a.start), px(a.end), 18);
      if (a.type === 'drag') {
        const all = pathOf(a);
        const f = all[0], t = all[all.length - 1];
        ctx.setLineDash([]); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, 18, 0, 7); ctx.stroke();                    // grab ring
        if (p > 0.95) { ctx.beginPath(); ctx.arc(t.x, t.y, 22, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(t.x, t.y, 6, 0, 7); ctx.fill(); arrowHead(ctx, all[all.length - 3], t, 16); }
      }
    }
    ctx.restore();
    if (a.label && p > 0.6) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (p - 0.6) / 0.4);
      const anchor = a.type === 'arrow' ? { x: px(a.start).x, y: px(a.start).y - 8 }
        : a.type === 'drag' ? { x: px(a.from).x + 22, y: px(a.from).y - 14 }
        : a.center ? { x: px(a.center).x + a.radius * Math.min(W, H) + 6, y: px(a.center).y }
        : a.at ? { x: px(a.at).x + (a.type === 'step' ? 20 : 0), y: px(a.at).y } : { x: a.x * W, y: a.y * H - 6 };
      label(ctx, a.label, anchor); ctx.restore();
    }
  });
}

function animate() {
  if (!ai.some((a) => a.type === 'target') || reduceMotion) return;
  const loop = (ms) => { if (!ai.some((a) => a.type === 'target')) return; drawAI(ms / 1000); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

// ----- input -----
marksC.addEventListener('pointerdown', (e) => {
  if (live) return;
  marksC.setPointerCapture(e.pointerId);
  const p = norm(e); drawing = { tool, points: [p, p] };
});
marksC.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  const p = norm(e);
  if (drawing.tool === 'pen') drawing.points.push(p); else drawing.points[1] = p;
  drawUser();
});
marksC.addEventListener('pointerup', () => { if (drawing) { shapes.push(drawing); drawing = null; drawUser(); } });

bar.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tool) setTool(b.dataset.tool);
  else if (b.id === 'undo') { shapes.pop(); drawUser(); }
  else if (b.id === 'clear') { shapes = []; ai = []; drawUser(); drawAI(); }
  else if (b.id === 'live') setLive(!live);
  else if (b.id === 'done') window.clicky.close();
});
function setTool(t) { tool = t; bar.querySelectorAll('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tool === t))); }
function setLive(on) {
  live = on; frame.classList.toggle('hidden', on); hint.classList.toggle('hidden', on);
  document.getElementById('live').setAttribute('aria-pressed', String(on));
  window.clicky.setPassthrough(on);
  if (on) bar.classList.add('hidden'); // controls return when the panel's "Redraw" re-captures
}
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { stopTour(); window.clicky.close(); }
  const map = { 1: 'pen', 2: 'circle', 3: 'rect', 4: 'arrow', 5: 'highlight', 6: 'redact' };
  if (map[e.key]) setTool(map[e.key]);
  if (e.key.toLowerCase() === 'c' && !e.metaKey) { shapes = []; drawUser(); }
  if (e.key.toLowerCase() === 'l') setLive(!live);
  if (e.key.toLowerCase() === 't' || e.key === '/') { e.preventDefault(); window.clicky.openPanel(); }
  if (e.key.toLowerCase() === 'z' && e.metaKey) { shapes.pop(); drawUser(); }
});

// ----- IPC -----
window.clicky.onActivate(() => {});
let buddyStart = null;
window.clicky.onFrame(({ dataUrl, mode, cursor: cp, display }) => {
  buddyStart = cp && display ? { x: cp.x - display.x + 30, y: cp.y - display.y + 30 } : null;
  frame.src = dataUrl; shapes = []; ai = []; live = false; frame.classList.remove('hidden'); bar.classList.remove('hidden');
  resize(); if (mode === 'draw') setTool('pen');
  window.clicky.setPassthrough(false);
});
window.clicky.onAnnotations(({ annotations, pointerColor }) => { if (pointerColor) setPointerColor(pointerColor); stopTour(); ai = annotations; drawAI(); animate(); });

// Compose frozen frame + user's marks (incl. redactions) into one image for the model. Held in memory only.
window.clicky.onExportRequest(() => {
  const c = document.createElement('canvas');
  const W = frame.naturalWidth || innerWidth, H = frame.naturalHeight || innerHeight;
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(frame, 0, 0, W, H);
  shapes.filter((s) => s.tool === 'redact').forEach((s) => drawShape(ctx, s, W, H));      // redactions first, opaque
  shapes.filter((s) => s.tool !== 'redact').forEach((s) => drawShape(ctx, s, W, H));
  const marks = shapes.filter((s) => s.tool !== 'redact').map((s) => ({
    tool: s.tool, points: s.tool === 'pen' ? s.points.filter((_, i) => i % 4 === 0) : s.points }));
  window.clicky.submitExport({ dataUrl: c.toDataURL('image/jpeg', 0.9), marks, redactions: shapes.filter((s) => s.tool === 'redact').length });
});

// ================= AI cursor + narrated tour =================
const cursor = document.getElementById('aicursor');
const ghost = document.getElementById('ghost');
const ripple = document.getElementById('ripple');
const caption = document.getElementById('caption');
let cur = { x: innerWidth / 2, y: innerHeight / 2 };
let tourId = 0;
let tourAudio = null;

function placeCursor(p) { cur = p; cursor.style.transform = `translate(${p.x}px, ${p.y}px)`; }
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (id) => id === tourId;

// Glide along a gentle arc, like a hand moving a pointer.
function glide(to, id, ms) {
  const from = { ...cur };
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const dur = reduceMotion ? 0 : ms || Math.min(1100, 350 + dist * 0.6);
  const bend = Math.min(120, dist * 0.18);
  const nx = -(to.y - from.y) / (dist || 1), ny = (to.x - from.x) / (dist || 1);
  const ctrl = { x: (from.x + to.x) / 2 + nx * bend, y: (from.y + to.y) / 2 + ny * bend };
  return new Promise((resolve) => {
    if (!dur) { placeCursor(to); resolve(); return; }
    const t0 = performance.now();
    const step = (now) => {
      if (!alive(id)) { resolve(); return; }
      const t = ease(Math.min(1, (now - t0) / dur)), u = 1 - t;
      placeCursor({ x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x, y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y });
      if (t < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}

// Draw one annotation progressively with the cursor riding the stroke tip.
// Drag demo: glide to the item, "grab" (hand closes), pull a ghost along the path, "drop" with a ripple.
async function demoDrag(a, id) {
  const pts = pathOf(a);
  await glide(pts[0], id);
  if (!alive(id)) return;
  cursor.classList.add('grab'); ghost.classList.remove('hidden');
  await wait(reduceMotion ? 0 : 350);
  a._p = 0; ai.push(a);
  const len = pts.reduce((s, q, i) => (i ? s + Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) : 0), 0);
  const dur = reduceMotion ? 0 : Math.min(2200, Math.max(900, len * 2.2));
  await new Promise((resolve) => {
    if (!dur) { a._p = 1; resolve(); return; }
    const t0 = performance.now();
    const step = (now) => {
      if (!alive(id)) { a._p = 1; resolve(); return; }
      const t = Math.min(1, (now - t0) / dur); a._p = ease(t);
      const { tip } = partial(pts, a._p);
      placeCursor(tip); ghost.style.transform = `translate(${tip.x}px, ${tip.y}px)`;
      drawAI(now / 1000);
      if (t < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
  cursor.classList.remove('grab'); ghost.classList.add('hidden');
  const end = pts[pts.length - 1];
  ripple.style.transform = `translate(${end.x}px, ${end.y}px)`; ripple.classList.remove('go'); void ripple.offsetWidth; ripple.classList.add('go');
  drawAI();
}

function drawWithCursor(a, id) {
  if (a.type === 'drag') return demoDrag(a, id);
  const pts = pathOf(a);
  const len = pts.reduce((s, q, i) => (i ? s + Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) : 0), 0);
  const dur = reduceMotion ? 0 : Math.min(1400, Math.max(350, len * 1.6));
  a._p = 0; ai.push(a);
  return new Promise((resolve) => {
    if (!dur) { a._p = 1; drawAI(); resolve(); return; }
    const t0 = performance.now();
    const step = (now) => {
      if (!alive(id)) { a._p = 1; drawAI(); resolve(); return; }
      const t = Math.min(1, (now - t0) / dur);
      a._p = ease(t);
      const { tip } = partial(pts, a._p);
      if (tip) placeCursor(tip);
      drawAI(now / 1000);
      if (t < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}

// Fetch speech for a line; resolves to a function that plays it and resolves on end.
function prepareSpeech(text, enabled) {
  if (!enabled) return Promise.resolve(() => wait(Math.min(6000, 900 + text.length * 45)));
  const fetched = window.clicky.speak(text).catch(() => null);
  return fetched.then((r) => () => new Promise((resolve) => {
    if (!r || !r.wav) { resolve(); return; } // native voice already finished inside speak()
    tourAudio = new Audio('data:audio/wav;base64,' + r.wav);
    tourAudio.onended = resolve; tourAudio.onerror = resolve; tourAudio.onpause = resolve;
    tourAudio.play().catch(resolve);
  }));
}

function stopTour() {
  tourId += 1;
  if (tourAudio) { tourAudio.pause(); tourAudio = null; }
  caption.classList.add('hidden');
}

async function runTour(steps, speak) {
  stopTour();
  const id = tourId;
  ai = [];
  cursor.classList.remove('hidden');
  placeCursor(buddyStart || { x: innerWidth / 2, y: innerHeight * 0.55 }); // fly out from the buddy
  // Prefetch speech one step ahead so narration has no gaps.
  let next = prepareSpeech(steps[0].say, speak);
  for (let i = 0; i < steps.length && alive(id); i += 1) {
    const st = steps[i];
    const playFn = next;
    if (steps[i + 1]) next = prepareSpeech(steps[i + 1].say, speak);
    const target = st.point ? px(st.point) : (st.draw[0] && pathOf(st.draw[0])[0]);
    if (target) await glide(target, id);
    if (!alive(id)) break;
    caption.textContent = st.say; caption.classList.remove('hidden'); window.clicky.tourStep(st.say);
    const play = (await playFn)();
    const drawing = (async () => { for (const a of st.draw) { if (!alive(id)) break; await drawWithCursor(a, id); await wait(120); } })();
    await Promise.all([play, drawing]);
    await wait(250);
  }
  if (alive(id)) { caption.classList.add('hidden'); animate(); window.clicky.tourDone(); }
}

window.clicky.onTour(({ steps, speak, pointerColor }) => { setPointerColor(pointerColor); runTour(steps, speak); });
window.clicky.onStopAudio(() => stopTour());

// ================= live (streamed) talk =================
// Sentences arrive while the model is still writing. Each one is spoken while the cursor moves and draws.
let liveQ = [];
let liveEnded = true;
let liveRunning = false;
let liveSpeak = true;
let liveId = -1;

function speechFor(item) {
  if (!item.play) item.play = item.seg.say ? prepareSpeech(item.seg.say, liveSpeak) : Promise.resolve(() => wait(250));
  return item.play;
}

async function pumpLive() {
  if (liveRunning) return;
  liveRunning = true;
  const id = liveId;
  while (alive(id)) {
    if (!liveQ.length) { if (liveEnded) break; await wait(40); continue; }
    const item = liveQ.shift();
    if (liveQ[0]) speechFor(liveQ[0]); // prefetch the next sentence's audio while this one plays
    const { seg } = item;
    const target = seg.point ? px(seg.point) : (seg.draw[0] && pathOf(seg.draw[0])[0]);
    const playFn = speechFor(item);
    if (target && seg.draw[0]?.type !== 'drag') await glide(target, id);
    if (!alive(id)) break;
    if (seg.say) { caption.textContent = seg.say; caption.classList.remove('hidden'); window.clicky.tourStep(seg.say); }
    const play = (await playFn)();
    const drawing = (async () => { for (const a of seg.draw) { if (!alive(id)) break; await drawWithCursor(a, id); await wait(100); } })();
    await Promise.all([play, drawing]);
  }
  liveRunning = false;
  if (alive(id)) { caption.classList.add('hidden'); animate(); window.clicky.tourDone(); }
  else if (liveId !== id && !liveEnded) pumpLive(); // a new turn started while the old loop was winding down
}

window.clicky.onLiveStart(({ speak, pointerColor }) => {
  stopTour();
  setPointerColor(pointerColor);
  liveId = tourId; liveQ = []; liveEnded = false; liveSpeak = speak !== false;
  ai = []; drawAI();
  cursor.classList.remove('hidden');
  placeCursor(buddyStart || { x: innerWidth / 2, y: innerHeight * 0.5 });
  pumpLive();
});
window.clicky.onLiveStep((seg) => { liveQ.push({ seg }); if (liveQ.length <= 2) speechFor(liveQ[liveQ.length - 1]); pumpLive(); });
window.clicky.onLiveEnd(() => { liveEnded = true; pumpLive(); });
window.clicky.onGoLive(() => setLive(true));
