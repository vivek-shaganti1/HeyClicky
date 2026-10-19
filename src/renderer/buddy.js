'use strict';
// Cursor companion: a small glowing pointer beside yours, with a glass status pill.
const bubble = document.getElementById('bubble');
const pill = document.getElementById('pill');
const bars = [...document.querySelectorAll('#wave i')];
const COLORS = { blue: '#0a84ff', yellow: '#ffd60a', orange: '#ff9f0a', red: '#ff453a', green: '#30d158' };
const DEFAULT_TEXT = { ready: 'Ready', thinking: 'Looking…', dictating: 'Dictating', agent: 'Working on it' };

window.clicky.onBuddy(({ state, text, color }) => {
  document.body.className = state;
  if (color && COLORS[color]) document.documentElement.style.setProperty('--ai', COLORS[color]);
  let t = text != null ? text : DEFAULT_TEXT[state] || '';
  if (state === 'listening' || state === 'dictating') t = text || '';
  bubble.textContent = t.length > 140 ? `${t.slice(0, 137)}…` : t;
  pill.classList.toggle('empty', !t && state !== 'listening' && state !== 'dictating');
});

let phase = 0;
window.clicky.onMicLevel(({ level }) => {
  phase += 0.7;
  bars.forEach((b, i) => {
    const wobble = 0.55 + 0.45 * Math.sin(phase + i * 0.9);
    b.style.height = `${Math.max(3, Math.min(14, 3 + level * 16 * wobble))}px`;
  });
});
