'use strict';
// Settings + secret storage. The Groq key is encrypted with the OS keychain via Electron safeStorage
// and is only ever read in the main process.
const fs = require('node:fs');
const path = require('node:path');
const { app, safeStorage } = require('electron');

const DEFAULTS = {
  hotkey: process.env.CLICKY_HOTKEY || 'Control+Alt+Space',
  policy: 'APPROVAL_REQUIRED',
  onboarded: false,
  licenseAccepted: false,
  speakAnswers: true,
  voiceOnHotkey: true,
  holdToTalk: true,
  conversation: true,
  pointerColor: 'blue',
  handsFree: false,
  memoryEnabled: true,
  dictationHotkey: 'Control+Alt+D',
  speechRate: 190,
  language: '',
  theme: 'system',
  textScale: 1,
  highContrast: false,
  reducedMotion: false,
  models: {
    vision: process.env.CLICKY_VISION_MODEL || '',
    reasoning: process.env.CLICKY_REASONING_MODEL || '',
    stt: process.env.CLICKY_STT_MODEL || '',
    tts: process.env.CLICKY_TTS_MODEL || '',
  },
};

const dir = () => app.getPath('userData');
const settingsFile = () => path.join(dir(), 'settings.json');
const keyFile = () => path.join(dir(), 'groq.key.enc');

function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch { return { ...DEFAULTS }; }
}
function saveSettings(s) { fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2), { mode: 0o600 }); }

function getApiKey() {
  try {
    if (safeStorage.isEncryptionAvailable() && fs.existsSync(keyFile())) {
      return safeStorage.decryptString(fs.readFileSync(keyFile()));
    }
  } catch { /* fall through to env */ }
  return process.env.GROQ_API_KEY || undefined;
}
function setApiKey(key) {
  if (!key) { try { fs.unlinkSync(keyFile()); } catch { /* none */ } return true; }
  if (!safeStorage.isEncryptionAvailable()) return false; // refuse to store plaintext
  fs.writeFileSync(keyFile(), safeStorage.encryptString(key), { mode: 0o600 });
  return true;
}
const hasApiKey = () => !!getApiKey();

// Text-only memory (question + short answer summary). Never screenshots. User can delete all of it.
const memFile = () => path.join(dir(), 'memory.json');
function loadMemory() { try { return JSON.parse(fs.readFileSync(memFile(), 'utf8')); } catch { return []; } }
function addMemory(entry) {
  const m = loadMemory(); m.push({ t: Date.now(), ...entry });
  fs.writeFileSync(memFile(), JSON.stringify(m.slice(-50)), { mode: 0o600 });
}
function deleteAllData() {
  for (const f of [memFile(), settingsFile(), keyFile()]) { try { fs.unlinkSync(f); } catch { /* none */ } }
}

module.exports = { loadMemory, addMemory, deleteAllData, loadSettings, saveSettings, getApiKey, setApiKey, hasApiKey, DEFAULTS };
