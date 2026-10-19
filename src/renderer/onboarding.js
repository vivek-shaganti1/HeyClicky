'use strict';
const $ = (id) => document.getElementById(id);
const sections = [...document.querySelectorAll('section[data-s]')];
const COLORS = { red: '#ef4444', blue: '#3b82f6', yellow: '#eab308', green: '#22c55e' };
let i = 0;
const choice = { style: 'blobs', color: 'blue' };

function show(n) {
  i = Math.max(0, Math.min(sections.length - 1, n));
  sections.forEach((s, k) => { s.classList.toggle('on', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
  $('back').style.visibility = i === 0 || sections[i].dataset.s === 'ready' ? 'hidden' : 'visible';
  const s = sections[i].dataset.s;
  if (s === 'perms') refreshPerms();
  if (s === 'greet') $('hi').textContent = `hi, ${($('name').value || 'friend').trim()}.`;
  const focusable = sections[i].querySelector('input:not([type=checkbox]), .btn:not(:disabled)');
  if (focusable) setTimeout(() => focusable.focus(), 300);
}

async function next() {
  const s = sections[i].dataset.s;
  if (s === 'key') {
    const k = $('key').value.trim();
    if (k) {
      const r = await window.clicky.setApiKey(k); $('key').value = '';
      if (!r.ok) { $('keyMsg').textContent = 'secure storage is unavailable here — set GROQ_API_KEY instead.'; return; }
    }
  }
  show(i + 1);
}
document.querySelectorAll('[data-next]').forEach((b) => { b.onclick = next; });
$('back').onclick = () => show(i - 1);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); next(); }
});

$('accept').onchange = () => { $('licNext').disabled = !$('accept').checked; };
window.clicky.readLicense().then((t) => { $('lic').textContent = t; });

async function refreshPerms() {
  const p = await window.clicky.permStatus();
  [['screen', p.screen === 'granted'], ['mic', p.mic === 'granted'], ['access', p.access === true]].forEach(([k, ok]) => {
    const b = $(`b-${k}`); b.textContent = ok ? '✓ on' : 'off'; b.classList.toggle('ok', ok);
  });
}
document.querySelectorAll('[data-perm]').forEach((b) => {
  b.onclick = async () => { await window.clicky.requestPerm(b.dataset.perm); setTimeout(refreshPerms, 800); if (b.dataset.perm !== 'mic') window.clicky.openPermissions(b.dataset.perm); };
});
setInterval(() => { if (sections[i].dataset.s === 'perms') refreshPerms(); }, 2000);

function radio(selector, key, attr) {
  document.querySelectorAll(selector).forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll(selector).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      choice[key] = b.dataset[attr];
      if (key === 'color') document.documentElement.style.setProperty('--c', COLORS[choice.color]);
    };
  });
}
radio('[data-style]', 'style', 'style');
radio('[data-color]', 'color', 'color');

// "give me a home": the pointer flies up into the notch, then setup finishes.
$('home').onclick = async () => {
  $('ptr').classList.add('fly');
  await new Promise((r) => setTimeout(r, 1100));
  show(sections.findIndex((s) => s.dataset.s === 'ready'));
};
$('done').onclick = () => window.clicky.finishOnboarding({
  licenseAccepted: $('accept').checked, name: $('name').value.trim().slice(0, 40), style: choice.style, pointerColor: choice.color,
});
show(0);
