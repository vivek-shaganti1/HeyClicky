'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Narrow, explicit surface. No Node, no key, no arbitrary channel access in renderers.
const invoke = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
const on = (ch) => (cb) => { const h = (_e, d) => cb(d); ipcRenderer.on(ch, h); return () => ipcRenderer.removeListener(ch, h); };

contextBridge.exposeInMainWorld('clicky', {
  ask: invoke('ask'), cancel: invoke('cancel'), recapture: invoke('recapture'), close: invoke('close'),
  transcribe: invoke('transcribe'), speak: invoke('speak'), stopSpeaking: invoke('stopSpeaking'),
  getState: invoke('getState'), saveSettings: invoke('saveSettings'), setApiKey: invoke('setApiKey'),
  checkModels: invoke('checkModels'), openPermissions: invoke('openPermissions'),
  setPassthrough: invoke('setPassthrough'), dictate: invoke('dictate'),
  startAgent: invoke('startAgent'), agentControl: invoke('agentControl'), approve: invoke('approve'),
  clearHistory: invoke('clearHistory'), permStatus: invoke('permStatus'), requestPerm: invoke('requestPerm'),
  finishOnboarding: invoke('finishOnboarding'), replayOnboarding: invoke('replayOnboarding'), readLicense: invoke('readLicense'), testHotkey: invoke('testHotkey'),
  onHotkeyFired: on('hotkeyFired'), submitExport: (d) => ipcRenderer.send('overlay:export', d),
  onActivate: on('activate'), onResult: on('result'), onBusy: on('busy'), onExportRequest: on('overlay:export-request'),
  onAnnotations: on('annotations'), onMode: on('mode'), onApproval: on('approval'), onAgent: on('agent'), onError: on('error'),
  onSettings: on('settings'), onReset: on('reset'), onFrame: on('frame'), onTour: on('tour'), onStopAudio: on('stop-audio'), onSpeakAnswer: on('speak-answer'), onDictateStart: on('dictate-start'), onSpeechDone: on('speech-done'),
  deleteAllData: invoke('deleteAllData'), openPanel: invoke('openPanel'), log: (m) => ipcRenderer.send('log', String(m).slice(0, 300)),
  onBuddy: on('buddy'), utter: invoke('utter'), onChat: on('chat'), onChatUpdate: on('chat-update'), onNotchOpenReq: on('notch-open-req'),
  onGoLive: on('go-live'), onLiveStart: on('live-start'), onLiveStep: on('live-step'), onLiveEnd: on('live-end'), onBuddyHide: on('buddy-hide'), onNotchInfo: on('notch-info'), onNotchGeom: on('notch-geom'),
  notchHover: (v) => ipcRenderer.send('notch-hover', !!v), notchOpen: (v) => ipcRenderer.send('notch-open', !!v), notchAction: (a) => ipcRenderer.send('notch-action', String(a)), onPttUp: on('ptt-up'), onMicLevel: on('mic-level'), micLevel: (l) => ipcRenderer.send('mic-level', l), micState: (on) => ipcRenderer.send('mic-state', on),
  tourStep: (t) => ipcRenderer.send('tour-step', t), speaking: (t) => ipcRenderer.send('speaking', t), tourDone: () => ipcRenderer.send('tour-done'),
});
