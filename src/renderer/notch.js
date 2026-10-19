'use strict';
// Notch = Clicky's home. Collapsed: exact-fit black pill with live state in the wings.
// Open: conversation thread (streams as Clicky talks), composer, agent/approval cards, quick actions.
const $ = (id) => document.getElementById(id);
const island = $('island');
const thread = $('thread');
const bars = [...document.querySelectorAll('#wave i')];
const FACES = { idle: '🙂', ready: '👋', listening: '👂', thinking: '🤔', talking: '😄', drawing: '✍️', done: '✨', error: '😵', agent: '🤖', dictating: '🎙️' };
const LABEL = { idle: '', ready: 'Ready', listening: 'Listening…', thinking: 'Thinking…', talking: 'Speaking', drawing: 'Showing you', done: '', error: 'Something went wrong', agent: 'Agent working', dictating: 'Dictating' };
let open = false;
let busyState = 'idle';
let unread = 0;
const msgs = new Map();

function applyClass() {
  island.className = [busyState, open ? 'open' : '', busyState !== 'idle' && busyState !== 'done' && !open ? 'active' : '', unread ? 'unread' : ''].filter(Boolean).join(' ');
}
function setOpen(v, { focus } = {}) {
  open = v;
  if (v) { unread = 0; $('badge').textContent = ''; }
  applyClass();
  island.setAttribute('aria-expanded', String(v));
  window.clicky.notchOpen(v);
  if (v) setTimeout(() => (focus === 'composer' || !msgs.size ? $('input') : $('input')).focus({ preventScroll: true }), 120);
}

// Pointer handling: only the island catches the mouse; the rest of the window is click-through.
island.addEventListener('mouseenter', () => { window.clicky.notchHover(true); if (!open) island.classList.add('hover'); });
island.addEventListener('mouseleave', () => { window.clicky.notchHover(false); island.classList.remove('hover'); });
island.addEventListener('click', (e) => { if (!open && !e.target.closest('button')) setOpen(true); });
island.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { setOpen(false); e.stopPropagation(); }
  else if ((e.key === 'Enter' || e.key === ' ') && !open && e.target === island) { e.preventDefault(); setOpen(true); }
});
window.addEventListener('blur', () => { if (open && !document.querySelector('.card.approval')) setOpen(false); });

// ----- thread -----
function bubble(id, role, text, { streaming, error } = {}) {
  $('empty')?.remove();
  let el = msgs.get(id);
  if (!el) { el = document.createElement('div'); el.className = `msg ${role}`; msgs.set(id, el); thread.appendChild(el); }
  el.textContent = text || (streaming ? '' : '…');
  el.classList.toggle('streaming', !!streaming);
  el.classList.toggle('err', !!error);
  thread.scrollTop = thread.scrollHeight;
  if (!open && role === 'assistant' && !streaming) { unread += 1; $('badge').textContent = String(unread); applyClass(); }
  return el;
}
window.clicky.onChat(({ id, role, text, streaming }) => bubble(id, role, text, { streaming }));
window.clicky.onChatUpdate(({ id, text, done, error }) => bubble(id, 'assistant', text, { streaming: !done, error }));

// ----- composer -----
function send() {
  const t = $('input').value.trim();
  if (!t) return;
  $('input').value = '';
  window.clicky.utter({ text: t, source: 'typed' });
}
$('input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
$('sendBtn').onclick = send;
$('mic').onclick = () => window.clicky.notchAction('talk');
$('stopBtn').onclick = () => window.clicky.cancel();
$('clearBtn').onclick = () => { window.clicky.clearHistory(); thread.replaceChildren(); msgs.clear(); };
$('setBtn').onclick = () => { setOpen(false); window.clicky.notchAction('settings'); };
$('closeBtn').onclick = () => setOpen(false);
$('grid').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'agent') { $('input').value = 'agent '; $('input').focus(); return; }
  setOpen(false);
  window.clicky.notchAction(act);
});

// ----- agent progress + approvals as cards -----
function card(html, cls) { const c = document.createElement('div'); c.className = `card ${cls || ''}`; c.innerHTML = html; $('cards').appendChild(c); return c; }
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let agentCard = null;
window.clicky.onAgent((e) => {
  if (!agentCard) agentCard = card('<b>Agent</b><div class="log"></div>', 'agent');
  const log = agentCard.querySelector('.log');
  const line = e.type === 'plan' ? `→ ${e.say}` : e.type === 'step' ? `${e.verified ? '✓' : '?'} ${e.action.kind} ${e.action.target || ''}`
    : e.type === 'handback' ? `👉 your turn: ${e.reason}` : e.type === 'blocked' ? `⛔ ${e.reason}` : e.type === 'say' ? e.text
    : e.type === 'end' ? `done: ${e.status}${e.error ? ` — ${e.error}` : ''}` : '';
  if (line) { const d = document.createElement('div'); d.textContent = line; log.appendChild(d); }
  if (e.type === 'end') { const c = agentCard; agentCard = null; setTimeout(() => c.remove(), 8000); }
});
window.clicky.onApproval(({ action }) => {
  const sensitive = /pass|otp|card|cvv/i.test(action.target || '');
  const c = card(`<b>Allow ${esc(action.kind)}</b> “${esc(action.target || 'this')}”${action.value && !sensitive ? ` → “${esc(action.value)}”` : ''}?
    <div class="row"><button class="btn primary" data-ok="1">Allow once</button><button class="btn" data-ok="0">Not now</button></div>`, 'approval');
  c.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ok]'); if (!b) return;
    window.clicky.approve({ id: action.id, ok: b.dataset.ok === '1' }); c.remove();
  });
  setOpen(true);
  c.querySelector('.btn.primary').focus();
});

// ----- state from main -----
window.clicky.onBuddy(({ state, text }) => {
  busyState = state || 'idle';
  $('status').textContent = LABEL[busyState] || '';
  applyClass();
  void text;
});
window.clicky.onBuddyHide(() => { busyState = 'idle'; $('status').textContent = ''; applyClass(); });
window.clicky.onMicLevel(({ level }) => {
  const t = performance.now() / 120;
  bars.forEach((b, i) => { b.style.height = `${Math.max(3, Math.min(16, 3 + level * 18 * (0.55 + 0.45 * Math.sin(t + i))))}px`; });
  $('mic').classList.toggle('rec', level > 0);
});
window.clicky.onNotchGeom(({ w, h, hasNotch, offset }) => {
  const r = document.documentElement.style;
  r.setProperty('--nw', `${w}px`); r.setProperty('--nh', `${h}px`); r.setProperty('--off', `${offset || 0}px`);
  document.body.classList.toggle('hasnotch', !!hasNotch);
});
window.clicky.onNotchOpenReq((o) => setOpen(true, o || {}));
window.clicky.onNotchInfo(() => {});
