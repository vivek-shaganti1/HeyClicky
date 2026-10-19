'use strict';
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const { systemPreferences, app, BrowserWindow, globalShortcut, ipcMain, screen, shell, Tray, Menu, nativeImage, clipboard, session: electronSession } = require('electron');

const store = require('./store');
const capture = require('./capture');
const { GroqClient } = require('../core/groq');
const { Orchestrator, buildTalkMessages } = require('../core/orchestrator');
const { TalkStreamParser, stripTags } = require('../core/stream');
const { AgentRun } = require('../core/agent');
const { safeError } = require('../core/redact');
const video = require('../core/video');
const crypto = require('node:crypto');
const { Helper } = require('./helper');
const grounding = require('../core/grounding');
const helper = new Helper();

const PRELOAD = path.join(__dirname, 'preload.js');
const R = (f) => path.join(__dirname, '..', 'renderer', f);

let panel = null;
let onboardWin = null;
let buddy = null;
let notch = null;
let notchOpen = false;
let buddyTimer = null;
let buddyHide = null;
let overlay = null;
let tray = null;
let settings;
let groq;
let orchestrator;
let usage = { requests: 0, tokens: 0 };
const state = { display: null, image: null, history: [], abort: null, say: null, agent: null, approvals: new Map(), marksSession: 0 };

// ---------- setup ----------
function buildGroq() {
  groq = new GroqClient({
    getApiKey: store.getApiKey,
    models: Object.fromEntries(Object.entries(settings.models).filter(([, v]) => v)),
    onUsage: (u) => { usage.requests += 1; usage.tokens += u.usage?.total_tokens || 0; },
  });
  groq.onResolve = (r, ids) => console.log('[clicky] Groq models available:', ids.join(', '), '\n[clicky] using:', JSON.stringify(r));
  orchestrator = new Orchestrator(groq);
}

function secureWebPrefs(extra = {}) {
  return { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, ...extra };
}

function createPanel() {
  panel = new BrowserWindow({
    width: 440, height: 560, show: false, frame: false, resizable: true, alwaysOnTop: true, skipTaskbar: true,
    transparent: false, backgroundColor: '#071633', webPreferences: secureWebPrefs({ backgroundThrottling: false }),
  });
  panel.setAlwaysOnTop(true, 'screen-saver', 2);
  panel.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  panel.loadFile(R('panel.html'));
  panel.on('closed', () => { panel = null; });
}

// ---------- cursor buddy ----------
// A small click-through window that rides next to the pointer while Clicky is active.
// Pointer position is polled only while the buddy is visible; nothing is recorded.
function createBuddy() {
  buddy = new BrowserWindow({ width: 340, height: 170, show: false, frame: false, transparent: true, hasShadow: false,
    resizable: false, focusable: false, skipTaskbar: true, alwaysOnTop: true, webPreferences: secureWebPrefs() });
  buddy.setAlwaysOnTop(true, 'screen-saver', 3);
  buddy.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  buddy.setIgnoreMouseEvents(true);
  buddy.loadFile(R('buddy.html'));
  buddy.on('closed', () => { buddy = null; });
}
function followCursor() {
  if (buddyTimer) return;
  let last = null;
  buddyTimer = setInterval(() => {
    if (!buddy || buddy.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    if (last && last.x === p.x && last.y === p.y) return;
    last = p;
    const b = screen.getDisplayNearestPoint(p).bounds;
    const x = Math.min(p.x + 6, b.x + b.width - 340), y = Math.min(p.y + 10, b.y + b.height - 170);
    buddy.setPosition(Math.round(x), Math.round(y));
  }, 16);
}
function setBuddy(st, text, { hideAfterMs } = {}) {
  if (!buddy || buddy.isDestroyed()) createBuddy();
  if (buddyHide) { clearTimeout(buddyHide); buddyHide = null; }
  send(notch, 'buddy', { state: st, text });
  const go = () => { send(buddy, 'buddy', { state: st, text, style: settings.buddyStyle, color: settings.pointerColor }); if (!buddy.isVisible()) buddy.showInactive(); followCursor(); };
  if (buddy.webContents.isLoading()) buddy.webContents.once('did-finish-load', go); else go();
  if (hideAfterMs) buddyHide = setTimeout(hideBuddy, hideAfterMs);
}
function hideBuddy() {
  send(notch, 'buddy-hide', {});
  if (buddyTimer) { clearInterval(buddyTimer); buddyTimer = null; }
  if (buddy && !buddy.isDestroyed()) buddy.hide();
}

// ---------- notch island ----------
// Sits flush with the top-center of the built-in display (the notch). Click-through except over the island.
const NOTCH_W = 500, NOTCH_H = 560;
let notchGeom = null; // exact notch geometry from macOS via the helper
function notchDisplay() {
  const all = screen.getAllDisplays();
  if (notchGeom) { const d = all.find((x) => String(x.id) === String(notchGeom.id)); if (d) return d; }
  return all.find((d) => d.internal) || screen.getPrimaryDisplay();
}
async function loadNotchGeometry() {
  const r = await helper.call('screens', {}, 2000);
  const scr = r.ok ? (r.screens.find((x) => x.hasNotch) || null) : null;
  notchGeom = scr ? { id: scr.id, x: scr.notchX, w: scr.notchW, h: scr.notchH, screenW: scr.w } : null;
  const sig = JSON.stringify(notchGeom);
  if (sig === state.notchSig) return; state.notchSig = sig;
  console.log('[clicky] notch:', notchGeom ? `${notchGeom.w}x${notchGeom.h}pt at x=${notchGeom.x} (screen ${notchGeom.screenW}pt wide)` : 'none detected (menu-bar pill fallback)');
}
function placeNotch() {
  if (!notch) return;
  const d = notchDisplay();
  const centerX = notchGeom ? d.bounds.x + notchGeom.x + notchGeom.w / 2 : d.bounds.x + d.bounds.width / 2;
  const want = { x: Math.round(centerX - NOTCH_W / 2), y: d.bounds.y, width: NOTCH_W, height: NOTCH_H };
  const cur = notch.getBounds();
  if (cur.x !== want.x || cur.y !== want.y || cur.width !== want.width || cur.height !== want.height) notch.setBounds(want);
  const menuBar = d.workArea.y - d.bounds.y || 24;
  send(notch, 'notch-geom', notchGeom ? { w: notchGeom.w, h: notchGeom.h, hasNotch: true, offset: (centerX - Math.round(centerX - NOTCH_W / 2)) - NOTCH_W / 2 }
    : { w: 190, h: menuBar, hasNotch: false, offset: 0 });
}
function createNotch() {
  const d = notchDisplay().bounds;
  notch = new BrowserWindow({ x: Math.round(d.x + d.width / 2 - NOTCH_W / 2), y: d.y, width: NOTCH_W, height: NOTCH_H,
    show: false, frame: false, transparent: true, hasShadow: false, resizable: false, movable: false, skipTaskbar: true,
    alwaysOnTop: true, fullscreenable: false, enableLargerThanScreen: true, webPreferences: secureWebPrefs() });
  notch.setAlwaysOnTop(true, 'screen-saver', 4);           // above the menu bar, beside the notch
  notch.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  notch.setIgnoreMouseEvents(true, { forward: true });    // forward lets the page see hover to re-enable clicks
  notch.loadFile(R('notch.html'));
  notch.webContents.once('did-finish-load', async () => { await loadNotchGeometry(); placeNotch(); notch.showInactive(); });
  notch.on('closed', () => { notch = null; });
  let deb = null;
  const replace = () => { clearTimeout(deb); deb = setTimeout(async () => { await loadNotchGeometry(); placeNotch(); }, 300); };
  screen.on('display-metrics-changed', replace); screen.on('display-added', replace); screen.on('display-removed', replace);
}
function openPanelTab(tab) {
  showPanel(); if (panel) panel.moveTop();
  send(panel, 'activate', { mode: 'tab', tab });
}
function startDictation() {
  if (!settings.onboarded) return;
  if (!panel) createPanel();
  const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds;
  panel.setPosition(Math.round(d.x + d.width - 460), Math.round(d.y + d.height - 600));
  panel.showInactive();
  state.dictating = true; setBuddy('dictating');
  send(panel, 'dictate-start', {});
  console.log('[clicky] dictation started');
}

function createOnboarding() {
  if (onboardWin) { onboardWin.focus(); return; }
  onboardWin = new BrowserWindow({ width: 580, height: 620, resizable: false, title: 'Welcome to Clicky', frame: false, transparent: true,
    vibrancy: 'hud', visualEffectState: 'active', roundedCorners: true, hasShadow: true, center: true, webPreferences: secureWebPrefs() });
  onboardWin.loadFile(R('onboarding.html'));
  onboardWin.on('closed', () => { onboardWin = null; });
}

function createOverlay(display) {
  if (overlay && !overlay.isDestroyed()) overlay.destroy();
  overlay = new BrowserWindow({
    x: display.x, y: display.y, width: display.width, height: display.height, show: false, frame: false,
    transparent: true, hasShadow: false, resizable: false, movable: false, enableLargerThanScreen: true,
    skipTaskbar: true, alwaysOnTop: true, focusable: true, fullscreenable: false, webPreferences: secureWebPrefs(),
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.loadFile(R('overlay.html'));
  overlay.on('closed', () => { overlay = null; });
  return overlay;
}

const send = (win, ch, data) => { if (win && !win.isDestroyed()) win.webContents.send(ch, data); };

// ---------- activation ----------
async function activate({ mode = 'quick' } = {}) {
  // One activation at a time: the hold-to-talk chord and Control+Option+Space can both fire for one press.
  const now = Date.now();
  if (state.activating || now - (state.lastActivate || 0) < 1200) { console.log('[clicky] duplicate trigger ignored'); return; }
  state.activating = true; state.lastActivate = now;
  try { return await activateInner({ mode }); } finally { state.activating = false; }
}
async function activateInner({ mode = 'quick' } = {}) {
  cancelAll();
  console.log('[clicky] hotkey/activate; screen permission =', capture.permissionStatus());
  if (capture.permissionStatus() !== 'granted') {
    notchSay('system', 'Screen Recording is off, so I can only chat by text. Turn it on in Settings.');
    openNotch({ focus: 'composer' });
    if (!panel) createPanel();
    send(panel, 'activate', { mode: mode === 'voice' ? 'voice' : 'text', hasFrame: false });
    return;
  }
  try {
    if (panel && panel.isVisible()) { panel.hide(); await new Promise((r) => setTimeout(r, 120)); }
    const [cap] = await Promise.all([capture.captureDisplay(), readTree()]);
    state.display = cap.display; state.image = cap.image;
    if (state.ax) state.ax.elements = grounding.normalizeElements(state.ax.raw, cap.display);
    const ov = createOverlay(cap.display);
    await new Promise((r) => ov.webContents.once('did-finish-load', r));
    send(ov, 'frame', { cursor: screen.getCursorScreenPoint(), dataUrl: capture.toJpegDataUrl(cap.image, 88).replace(/^/, ''), display: cap.display, mode });
    ov.show();
    const voice = mode === 'voice';
    if (!panel) createPanel();
    if (panel.isVisible()) panel.hide();
    if (mode === 'live') send(ov, 'go-live', {});
    if (voice) { ov.focus(); setBuddy('listening'); }
    else if (mode !== 'live') { ov.focus(); setBuddy('ready', 'Draw, then talk or type'); openNotch({ focus: 'composer' }); }
    console.log('[clicky] activated on display', cap.display.id);
    send(panel, 'activate', { mode, hasFrame: true });
  } catch (e) {
    console.error('[clicky] capture failed:', safeError(e));
    showPanel();
    send(panel, 'error', { code: 'CAPTURE', message: safeError(e) });
  }
}

function showPanel(display) {
  if (!panel) createPanel();
  const d = display || screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds;
  panel.setPosition(Math.round(d.x + d.width - 460), Math.round(d.y + d.height - 600));
  panel.show(); panel.focus();
}

function deactivate() {
  cancelAll();
  hideBuddy();
  if (overlay && !overlay.isDestroyed()) overlay.destroy();
  overlay = null; state.image = null; // drop in-memory screenshot
  if (panel) panel.hide();
}

function cancelAll() {
  if (state.abort) { state.abort.abort(); state.abort = null; }
  stopSpeaking();
  if (state.agent) state.agent.cancel();
  for (const r of state.approvals.values()) r(false);
  state.approvals.clear();
  send(panel, 'busy', { busy: false });
}

function registerHotkey() {
  globalShortcut.unregisterAll();
  const ok = globalShortcut.register(settings.hotkey, () => {
    if (onboardWin) send(onboardWin, 'hotkeyFired', {});
    else if (settings.onboarded) activate({ mode: settings.voiceOnHotkey ? 'voice' : 'quick' });
  });
  // Dictation: record speech and type it into whatever app is focused. Panel shown without stealing focus.
  if (settings.dictationHotkey) {
    const dok = globalShortcut.register(settings.dictationHotkey, startDictation);
    if (!dok) console.error('[clicky] dictation shortcut unavailable:', settings.dictationHotkey);
  }
  if (!ok) send(panel, 'error', { code: 'HOTKEY', message: `Shortcut "${settings.hotkey}" is in use by another app. Choose another in Settings.` });
  return ok;
}

// ---------- speech ----------
function stopSpeaking() {
  send(panel, 'stop-audio', {}); send(overlay, 'stop-audio', {}); if (state.say) { try { state.say.kill('SIGTERM'); } catch { /* gone */ } state.say = null; } }
// Fallback only (when Groq TTS is unavailable). Resolves when speech finishes or is stopped.
function speakNative(text) {
  stopSpeaking();
  if (process.platform !== 'darwin' || !text) return Promise.resolve();
  return new Promise((resolve) => {
    state.say = spawn('say', ['-v', 'Samantha', '-r', String(settings.speechRate), '--', text.slice(0, 1500)]);
    state.say.on('exit', () => { state.say = null; resolve(); });
    state.say.on('error', () => { state.say = null; resolve(); });
  });
}

// ---------- notch home: conversation thread ----------
let chatSeq = 0;
function notchSay(role, text) { const id = ++chatSeq; send(notch, 'chat', { id, role, text }); return id; }
function openNotch(opts = {}) {
  if (!notch) return;
  notchOpen = true; notch.setIgnoreMouseEvents(false); notch.focus();
  send(notch, 'notch-open-req', opts);
}

// One spoken, streamed turn: words are spoken sentence by sentence while the pointer moves/draws in sync.
async function talk(question, { source = 'voice' } = {}) {
  question = String(question || '').trim();
  if (!question) return;
  // A typed question from the notch needs a fresh look at the screen first (activation resets state).
  if (!overlay || overlay.isDestroyed()) await activateInner({ mode: 'live' });
  if (state.abort) state.abort.abort();
  stopSpeaking();
  const ac = new AbortController(); state.abort = ac;
  notchSay('user', question);
  const replyId = ++chatSeq;
  send(notch, 'chat', { id: replyId, role: 'assistant', text: '', streaming: true });
  setBuddy('thinking');
  try {
    const { dataUrl, marks } = await imageForAsk('quick');
    const ax = axInput();
    let extraContext = '';
    if (settings.memoryEnabled) {
      const mem = store.loadMemory().slice(-6).map((m) => `- Q: ${m.q} | A: ${m.a}`).join('\n');
      if (mem) extraContext = `Earlier conversations (text summaries only):\n${mem}`;
    }
    if (settings.userName) extraContext = `The user's name is ${settings.userName}.\n${extraContext}`;
    const messages = buildTalkMessages({ question, imageDataUrl: dataUrl, userMarks: marks, history: state.history, extraContext, ...ax });
    const parser = new TalkStreamParser({ elements: ax.elements });
    send(overlay, 'live-start', { speak: settings.speakAnswers, pointerColor: settings.pointerColor });
    let steps = 0; let shown = '';
    const push = (segs) => { for (const seg of segs) { steps += 1; send(overlay, 'live-step', seg); } };
    const t0 = Date.now();
    const res = await groq.chatStream({ messages, hasImage: !!dataUrl, signal: ac.signal, onDelta: (d) => {
      push(parser.feed(d));
      const clean = stripTags(parser.full);
      if (clean !== shown) { shown = clean; send(notch, 'chat-update', { id: replyId, text: clean }); }
    } });
    push(parser.end());
    send(overlay, 'live-end', {});
    const answer = stripTags(res.text);
    send(notch, 'chat-update', { id: replyId, text: answer, done: true, model: res.model });
    console.log(`[clicky] talk (${source}) by ${res.model} | first token ${res.firstTokenMs}ms | total ${Date.now() - t0}ms | ${steps} spoken steps`);
    state.history.push({ role: 'user', content: question }, { role: 'assistant', content: res.text });
    state.history = state.history.slice(-12);
    if (settings.memoryEnabled && answer) store.addMemory({ q: question.slice(0, 200), a: answer.slice(0, 300) });
  } catch (e) {
    const msg = e.status === 429 ? 'Groq rate limit reached. Try again in about 30 seconds.' : /Cancelled/.test(e.message) ? 'Stopped.' : safeError(e);
    console.error('[clicky] talk failed:', msg);
    send(notch, 'chat-update', { id: replyId, text: msg, done: true, error: true });
    setBuddy('error', msg, { hideAfterMs: 5000 });
    send(panel, 'speech-done', { failed: true });
  } finally { if (state.abort === ac) state.abort = null; }
}

// Route anything the user says or types: agent tasks, stop, or a normal talk turn.
function routeUtterance(text, source) {
  const t = String(text || '').trim();
  if (!t) return;
  const agent = t.match(/^\s*(?:hey\s*,?\s*clicky\s*,?\s*)?agent\b[\s,:-]*(.+)$/i);
  if (agent && agent[1]) { notchSay('user', t); startAgentTask(agent[1]); return; }
  if (/^\s*(stop|cancel|never ?mind|shut up)\b[.!]?\s*$/i.test(t)) { cancelAll(); setBuddy('done', 'Stopped', { hideAfterMs: 1500 }); return; }
  talk(t, { source });
}

async function startAgentTask(goal) {
    if (state.agent && ['running', 'paused'].includes(state.agent.status)) return { ok: false, error: 'An agent task is already running.' };
    const emit = (evt) => {
      send(panel, 'agent', evt); send(notch, 'agent', evt);
      if (evt.type === 'plan') setBuddy('agent', evt.say);
      else if (evt.type === 'approval_needed') { setBuddy('agent', 'Needs your approval'); openNotch({}); }
      else if (evt.type === 'end') setBuddy(evt.status === 'completed' ? 'done' : 'error', `agent: ${evt.status}`, { hideAfterMs: 6000 });
    };
    const deps = {
      observe: async () => {
        const [cap] = await Promise.all([capture.captureDisplay(state.display?.id), readTree(state.ax?.pid)]);
        if (state.ax) state.ax.elements = grounding.normalizeElements(state.ax.raw, cap.display);
        return { summary: '', imageDataUrl: capture.toJpegDataUrl(cap.image, 80), hash: crypto.createHash('sha1').update(cap.image.resize({ width: 320 }).toBitmap()).digest('hex') };
      },
      propose: async (g, obs, history) => {
        const res = await orchestrator.ask({ mode: 'agent', question: 'What is the single next action toward the goal? If the goal is complete, return intent "stop" with no actions.',
          agentGoal: g, imageDataUrl: obs.imageDataUrl, ...axInput(), extraContext: `Completed so far: ${JSON.stringify(history.map((h) => ({ k: h.action.kind, t: h.action.target, r: h.result })))}` });
        if (res.annotations.length) send(overlay, 'annotations', { annotations: res.annotations });
        if (res.intent === 'stop' || !res.suggested_actions.length) return { done: true, say: res.answer };
        emit({ type: 'plan', say: res.answer });
        return { action: res.suggested_actions[0] };
      },
      // Semantic actions through Accessibility (no pointer movement). Falls back to guidance.
      execute: async (a) => {
        a._verified = undefined;
        const el = a.el && state.ax ? state.ax.raw.find((e) => e.id === a.el) : null;
        if (el && el.secure) throw new Error('Refusing to touch a password field; please type it yourself.');
        if ((a.kind === 'click' || a.kind === 'check' || a.kind === 'submit' || a.kind === 'select') && el) {
          const r = await helper.call('press', { id: a.el });
          if (!r.ok) throw new Error(`Could not press "${el.label}" (${r.error})`);
        } else if (a.kind === 'type' && a.value && el) {
          const r = await helper.call('setValue', { id: a.el, value: a.value });
          if (!r.ok) throw new Error(`Could not fill "${el.label}" (${r.error})`);
          a._verified = !!r.verified;
        } else if (a.kind === 'type' && a.value) {
          if (state.ax?.pid) await helper.call('activate', { pid: state.ax.pid });
          await new Promise((r) => setTimeout(r, 250));
          await osascriptType(a.value);
        } else if (a.kind === 'wait') await new Promise((r) => setTimeout(r, 1500));
        else {
          emit({ type: 'say', text: `Please ${a.kind} "${a.target || 'the highlighted item'}" yourself. I can't do that one safely.` });
          await new Promise((r) => setTimeout(r, 6000));
        }
      },
      verify: async (a, before) => {
        if (a.kind === 'wait') return true;
        if (a._verified === true) return true; // field value read back equals what we set
        await new Promise((r) => setTimeout(r, 600));
        const after = await deps.observe();
        return after.hash !== before.hash; // weak signal: screen changed. Next propose() re-checks with vision.
      },
      requestApproval: (action) => new Promise((resolve) => { state.approvals.set(action.id, resolve); emit({ type: 'approval_needed', action }); send(notch, 'approval', { action }); }),
      onEvent: emit,
    };
    state.agent = new AgentRun({ goal, mode: settings.policy, deps, maxSteps: 12 });
    state.agent.run().catch((e) => emit({ type: 'end', status: 'error', error: safeError(e) }));
    return { ok: true };
  }

// ---------- accessibility grounding ----------
async function readTree(pid) {
  if (!helper.running) { state.ax = null; return; }
  const target = pid || state.lastAppPid;
  const r = await helper.call('tree', target ? { pid: target } : {}, 2500);
  if (!r.ok) { state.ax = null; if (r.error === 'accessibility_not_granted' && !state.axWarned) { state.axWarned = true; console.log('[clicky] grant Accessibility for precise pointing + agent actions'); } return; }
  if (!r.elements.length) { await new Promise((ok) => setTimeout(ok, 350)); const again = await helper.call('tree', { pid: r.pid }, 2500); if (again.ok) Object.assign(r, again); }
  state.ax = { pid: r.pid, app: r.app, window: r.window, raw: r.elements, elements: [] };
  console.log(`[clicky] read ${r.elements.length} UI elements from ${r.app}`);
}
const axInput = () => (state.ax && state.ax.elements.length
  ? { elements: state.ax.elements, elementsText: grounding.describeElements(state.ax.elements), appName: `${state.ax.app} - ${state.ax.window}` } : {});

// ---------- helpers ----------
async function imageForAsk(mode) {
  // Prefer the user's composed (annotated/redacted) canvas from the overlay when open.
  if (overlay && !overlay.isDestroyed()) {
    const exp = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), 3000);
      ipcMain.once('overlay:export', (_e, d) => { clearTimeout(t); resolve(d); });
      send(overlay, 'overlay:export-request', {});
    });
    if (exp && exp.dataUrl) return { dataUrl: capture.toJpegDataUrl(capture.dataUrlToImage(exp.dataUrl), 82), marks: exp.marks || [] };
  }
  if (state.image) return { dataUrl: capture.toJpegDataUrl(state.image, 82), marks: [] };
  return { dataUrl: null, marks: [] };
}

async function desktopCapturerProbe() {
  try { await require('electron').desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }); } catch { /* prompt shown by macOS */ }
}

function osascriptType(text) {
  return new Promise((resolve, reject) => execFile('osascript', ['-e', 'on run argv', '-e', 'tell application "System Events" to keystroke (item 1 of argv)', '-e', 'end run', text],
    (err) => (err ? reject(new Error('Typing failed. Grant Accessibility permission to this app.')) : resolve())));
}
function osascriptPaste() {
  return new Promise((resolve, reject) => execFile('osascript', ['-e', 'tell application "System Events" to keystroke "v" using command down'],
    (err) => (err ? reject(new Error('Paste failed. Grant Accessibility permission to this app.')) : resolve())));
}

// ---------- IPC ----------
function wireIpc() {
  ipcMain.handle('getState', () => ({
    settings, hasKey: store.hasApiKey(), screen: capture.permissionStatus(), usage,
    models: groq.models, platform: process.platform,
  }));

  ipcMain.handle('ask', async (_e, { question, mode = 'quick', extraContext = '', video: v }) => {
    if (!question || !question.trim()) return { ok: false, error: 'Type or say a question first.' };
    if (state.abort) state.abort.abort();
    state.abort = new AbortController();
    const { signal } = state;
    send(panel, 'busy', { busy: true });
    setBuddy('thinking');
    try {
      if (mode === 'video' && v) {
        const now = video.parseTimestamp(v.timestamp);
        const segs = video.parseTranscript(v.transcript);
        const win = now == null ? null : video.transcriptWindow(segs, now, v.windowSec || 30);
        extraContext = [`Video URL: ${v.url || 'unknown'}`, `Playback time: ${now == null ? 'unknown' : video.fmt(now)}`,
          win && win.covered ? `Transcript excerpt:\n${win.text}` : 'No transcript available for this moment: only the captured frame is known.'].join('\n');
      }
      const { dataUrl, marks } = await imageForAsk(mode);
      if (settings.memoryEnabled) {
        const mem = store.loadMemory().slice(-6).map((m) => `- Q: ${m.q} | A: ${m.a}`).join('\n');
        if (mem) extraContext = `${extraContext}\nEarlier conversations (text summaries only):\n${mem}`.trim();
      }
      const res = await orchestrator.ask({ mode, question, imageDataUrl: dataUrl, userMarks: marks, history: state.history, extraContext, ...axInput() }, { signal: state.abort.signal });
      if (settings.memoryEnabled && res.answer) store.addMemory({ q: question.slice(0, 200), a: res.answer.slice(0, 300) });
      state.history.push({ role: 'user', content: question }, { role: 'assistant', content: res.answer });
      state.history = state.history.slice(-12);
      send(panel, 'result', res);
      const hasOverlay = overlay && !overlay.isDestroyed();
      setBuddy(res.tour.length && hasOverlay ? 'drawing' : 'talking', res.tour.length && hasOverlay ? res.tour[0].say : res.answer);
      if (hasOverlay && res.tour.length) send(overlay, 'tour', { steps: res.tour, speak: settings.speakAnswers, pointerColor: settings.pointerColor });
      else if (res.annotations.length) send(overlay, 'annotations', { annotations: res.annotations, pointerColor: settings.pointerColor });
      if (settings.speakAnswers && res.answer && !(hasOverlay && res.tour.length)) send(panel, 'speak-answer', { text: res.answer });
      console.log('[clicky] answered by', res.model, '| tour steps:', res.tour.length + (res.tourSynthesized ? ' (built by app)' : ''), '| annotations:', res.annotations.map((a) => a.type).join(',') || 0, '| tour draws:', res.tour.flatMap((t) => t.draw.map((a) => a.type)).join(',') || 0);
      return { ok: true };
    } catch (e) {
      let msg = e.name === 'GroqError' || /Cancelled/.test(e.message) ? e.message : safeError(e);
      if (e.status === 429) msg = 'Groq rate limit reached (free tier allows only a few requests per minute). Wait about 30 seconds and ask again.';
      console.error('[clicky] ask failed:', msg);
      setBuddy('error', /rate limit/i.test(msg) ? 'Rate limited. Try again in about 30 seconds.' : 'Something went wrong', { hideAfterMs: 5000 });
      if (!panel.isVisible()) showPanel();
      send(panel, 'error', { code: 'ASK', message: msg });
      return { ok: false, error: msg };
    } finally {
      send(panel, 'busy', { busy: false });
      state.abort = null;
    }
  });

  ipcMain.handle('cancel', () => { cancelAll(); return true; });
  ipcMain.handle('utter', (_e, { text, source }) => { routeUtterance(text, source || 'voice'); return true; });
  ipcMain.handle('close', () => { deactivate(); return true; });
  ipcMain.handle('recapture', () => activate());
  ipcMain.handle('setPassthrough', (_e, on) => {
    if (overlay && !overlay.isDestroyed()) { overlay.setIgnoreMouseEvents(!!on, { forward: true }); }
    return true;
  });

  ipcMain.handle('transcribe', async (_e, { audio, mime, filename }) => {
    state.abort = new AbortController();
    setBuddy('thinking', 'got it…');
    try {
      console.log('[clicky] transcribing', Buffer.byteLength(Buffer.from(audio)), 'bytes');
      const out = await groq.transcribe({ audio: Buffer.from(audio), mime, filename, language: settings.language || undefined, signal: state.abort.signal });
      return { ok: true, ...out };
    } catch (e) { return { ok: false, error: e.message }; } finally { state.abort = null; }
  });
  ipcMain.handle('speak', async (_e, text) => {
    try {
      const wav = await groq.speak({ text });
      if (wav) { if (!state.ttsLogged) { console.log('[clicky] voice:', groq.models.tts, '/', groq.voice); state.ttsLogged = true; } return { ok: true, wav: wav.toString('base64') }; }
    } catch (e) { console.error('[clicky] Groq TTS failed, using macOS voice:', safeError(e)); }
    await speakNative(text); return { ok: true, native: true };
  });
  ipcMain.handle('stopSpeaking', () => { stopSpeaking(); return true; });

  ipcMain.handle('dictate', async (_e, text) => {
    // Insert into the previously focused app: hide our UI so focus returns, then paste (clipboard restored).
    const prev = clipboard.readText();
    try {
      if (panel) panel.hide();
      if (overlay && !overlay.isDestroyed()) { overlay.destroy(); overlay = null; }
      clipboard.writeText(text);
      await new Promise((r) => setTimeout(r, 200));
      await osascriptPaste();
      state.dictating = false; setBuddy('done', 'Inserted', { hideAfterMs: 2000 });
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; } finally { setTimeout(() => clipboard.writeText(prev), 600); }
  });

  ipcMain.handle('saveSettings', (_e, patch) => {
    settings = { ...settings, ...patch, models: { ...settings.models, ...(patch.models || {}) } };
    store.saveSettings(settings);
    buildGroq();
    const hotkeyOk = patch.hotkey || patch.dictationHotkey ? registerHotkey() : true;
    send(panel, 'settings', settings);
    return { ok: true, hotkeyOk };
  });
  ipcMain.handle('setApiKey', (_e, key) => ({ ok: store.setApiKey((key || '').trim()), secure: true }));
  ipcMain.handle('checkModels', async () => {
    try { const r = await groq.resolveModels(); return { ok: true, models: r }; } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('openPermissions', (_e, which) => {
    const pane = { screen: 'Privacy_ScreenCapture', mic: 'Privacy_Microphone', access: 'Privacy_Accessibility' }[which] || 'Privacy';
    return shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${pane}`);
  });
  ipcMain.handle('readLicense', () => fs.readFileSync(path.join(__dirname, '..', '..', 'build', 'license_en.txt'), 'utf8'));
  ipcMain.handle('permStatus', () => ({
    screen: capture.permissionStatus(),
    mic: process.platform === 'darwin' ? systemPreferences.getMediaAccessStatus('microphone') : 'granted',
    access: process.platform === 'darwin' ? systemPreferences.isTrustedAccessibilityClient(false) : true,
    hasKey: store.hasApiKey(), licenseAccepted: settings.licenseAccepted,
  }));
  ipcMain.handle('requestPerm', async (_e, which) => {
    // Each call triggers the genuine macOS prompt; the user decides. Nothing is granted silently.
    if (which === 'mic') await systemPreferences.askForMediaAccess('microphone');
    else if (which === 'access') systemPreferences.isTrustedAccessibilityClient(true);
    else if (which === 'screen') await desktopCapturerProbe();
    return true;
  });
  ipcMain.handle('testHotkey', () => true);
  ipcMain.handle('replayOnboarding', () => { createOnboarding(); return true; });
  ipcMain.handle('finishOnboarding', (_e, { licenseAccepted, name, style, pointerColor }) => {
    if (!licenseAccepted) return false;
    settings = { ...settings, onboarded: true, licenseAccepted: true,
      userName: String(name || settings.userName || '').slice(0, 40),
      buddyStyle: ['blobs', 'critters'].includes(style) ? style : settings.buddyStyle || 'blobs',
      pointerColor: ['red', 'blue', 'yellow', 'green', 'orange'].includes(pointerColor) ? pointerColor : settings.pointerColor };
    if (!notch) createNotch();
    store.saveSettings(settings);
    if (onboardWin) onboardWin.close();
    registerHotkey();
    setTimeout(() => { notchSay('assistant', `Hi ${settings.userName || 'there'}. Hold Control + Option anywhere and just talk.`); openNotch({}); }, 900);
    return true;
  });
  ipcMain.handle('clearHistory', () => { state.history = []; return true; });
  ipcMain.handle('deleteAllData', () => {
    state.history = []; store.deleteAllData();
    settings = store.loadSettings(); buildGroq(); registerHotkey();
    console.log('[clicky] all local data deleted');
    return true;
  });
  ipcMain.on('log', (_e, m) => console.log('[panel]', safeError(m)));
  ipcMain.on('tour-done', () => { send(panel, 'speech-done', {}); setBuddy('done', 'Anything else?', { hideAfterMs: settings.handsFree ? 0 : 6000 }); });
  ipcMain.on('tour-step', (_e, text) => setBuddy('drawing', String(text || '').slice(0, 300)));
  ipcMain.on('speaking', (_e, text) => setBuddy('talking', String(text || '').slice(0, 300)));
  ipcMain.on('mic-level', (_e, level) => { const l = { level: Number(level) || 0 }; send(buddy, 'mic-level', l); send(notch, 'mic-level', l); });
  ipcMain.on('notch-hover', (_e, on) => { if (notch && !notchOpen) notch.setIgnoreMouseEvents(!on, { forward: true }); });
  ipcMain.on('notch-open', (_e, on) => {
    notchOpen = !!on;
    if (!notch) return;
    notch.setIgnoreMouseEvents(!on, { forward: true });
    if (on) { notch.focus(); send(notch, 'notch-info', { model: groq.models.vision || groq.models.reasoning }); }
  });
  ipcMain.on('notch-action', (_e, act) => {
    console.log('[clicky] notch action:', act);
    if (act === 'talk') activate({ mode: 'voice' });
    else if (act === 'draw' || act === 'redraw') activate({ mode: 'quick' });
    else if (act === 'dictate') startDictation();
    else if (['type', 'agent', 'teach', 'video', 'settings'].includes(act)) openPanelTab(act === 'type' ? 'ask' : act === 'teach' ? 'teach' : act);
  });
  ipcMain.on('mic-state', (_e, on) => { if (on) setBuddy(state.dictating ? 'dictating' : 'listening'); else send(notch, 'mic-level', { level: 0 }); });
  ipcMain.handle('openPanel', () => { showPanel(state.display || undefined); if (panel) panel.moveTop(); return true; });

  // ----- computer agent (permissioned). Keyboard-only automation; clicks are guided, never injected. -----
  ipcMain.handle('startAgent', async (_e, { goal }) => startAgentTask(goal));
  ipcMain.handle('agentControl', (_e, cmd) => {
    if (!state.agent) return false;
    if (cmd === 'pause') state.agent.pause(); else if (cmd === 'resume') state.agent.resume(); else if (cmd === 'cancel') cancelAll();
    return true;
  });
  ipcMain.handle('approve', (_e, { id, ok }) => { const r = state.approvals.get(id); if (r) { state.approvals.delete(id); r(!!ok); } return true; });
}

// ---------- lifecycle ----------
function buildTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle('◎');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Ask about screen', click: () => activate() },
    { label: 'Text mode', click: () => { showPanel(); send(panel, 'activate', { mode: 'text', hasFrame: false }); } },
    { label: 'Settings', click: () => { showPanel(); send(panel, 'activate', { mode: 'settings' }); } },
    { type: 'separator' }, { label: 'Quit', click: () => app.quit() },
  ]));
}

app.whenReady().then(() => {
  if (!app.requestSingleInstanceLock()) return app.quit();
  settings = store.loadSettings();
  buildGroq();
  // Deny all permission prompts except media (mic) for our own windows; block navigation/new windows.
  electronSession.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(perm === 'media'));
  app.on('web-contents-created', (_e, wc) => {
    wc.on('console-message', (_ev, level, message, line, src) => { if (level >= 2) console.log('[renderer]', safeError(message), String(src).split('/').pop() + ':' + line); });
    wc.on('preload-error', (_ev, p, err) => console.error('[preload]', safeError(err)));
    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
    wc.on('will-navigate', (ev) => ev.preventDefault());
  });
  if (process.platform === 'darwin') app.dock.hide();
  wireIpc(); createPanel(); buildTray();
  if (settings.onboarded) createNotch();
  if (process.platform === 'darwin' && helper.start()) {
    let pending = null;
    // Remember the last app that isn't Clicky so grounding/agent target it even after clicking the notch.
    helper.on('app', (m) => { if (m.pid && m.pid !== process.pid && !/^(Electron|Clicky AI)$/.test(m.app)) { state.lastAppPid = m.pid; state.lastApp = m.app; } });
    helper.on('ready', (m) => console.log('[helper] ready; accessibility trusted =', m.trusted));
    // Hold Control+Option to talk; release to send. A short delay ignores Control+Option+<key> shortcuts.
    helper.on('chord', (m) => {
      if (!settings.onboarded || !settings.holdToTalk) return;
      if (m.down) { pending = setTimeout(() => { pending = null; state.holding = true; activate({ mode: 'voice' }); }, 280); }
      else {
        if (pending) { clearTimeout(pending); pending = null; }
        if (state.holding) { state.holding = false; send(panel, 'ptt-up', {}); }
      }
    });
    helper.on('chord-combo', () => { if (pending) { clearTimeout(pending); pending = null; } });
  }
  registerHotkey();
  if (!settings.onboarded) createOnboarding();
  panel.webContents.once('did-finish-load', () => {
    if (settings.onboarded && !store.hasApiKey()) { showPanel(); send(panel, 'activate', { mode: 'settings', onboarding: true }); }
  });
});
app.on('will-quit', () => { globalShortcut.unregisterAll(); helper.stop(); });
app.on('window-all-closed', (e) => e.preventDefault());
