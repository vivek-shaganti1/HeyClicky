'use strict';
const $ = (id) => document.getElementById(id);
let tab = 'ask';
let state = null;
let recorder = null;
let chunks = [];
let lastAnswer = '';
let dictating = false;
let pendingApproval = null;

function show(t) {
  tab = t;
  document.querySelectorAll('nav [data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === t)));
  ['ask', 'video', 'teach', 'agent', 'settings'].forEach((x) => $('tab-' + x).classList.toggle('hidden', x !== t));
  const first = { ask: 'q', video: 'vts', teach: 'tgoal', agent: 'agoal', settings: 'key' }[t];
  $(first) && $(first).focus();
}
document.querySelector('nav').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });

function setErr(msg) { $('err').textContent = msg || ''; $('err').classList.toggle('hidden', !msg); }
function setBusy(b) { $('busy').classList.toggle('hidden', !b); $('stop').classList.toggle('hidden', !b); $('send').disabled = b; }

function applySettings(s) {
  const r = document.documentElement;
  r.dataset.theme = s.theme === 'system' ? '' : s.theme; if (s.theme === 'system') delete r.dataset.theme;
  r.dataset.contrast = s.highContrast ? 'high' : '';
  r.style.setProperty('--scale', s.textScale || 1);
  $('hotkey').value = s.hotkey; $('policySel').value = s.policy; $('rate').value = s.speechRate;
  $('speak').checked = s.speakAnswers; $('voiceHk').checked = s.voiceOnHotkey; $('holdTalk').checked = s.holdToTalk !== false; $('ptrColor').value = s.pointerColor || 'blue'; $('handsFree').checked = s.handsFree; $('memory').checked = s.memoryEnabled; $('dictHk').value = s.dictationHotkey || ''; $('theme').value = s.theme; $('scale').value = String(s.textScale || 1); $('contrast').checked = s.highContrast;
  $('polTxt').textContent = s.policy;
}
async function refresh() {
  state = await window.clicky.getState();
  applySettings(state.settings);
  $('scrDot').classList.toggle('on', false);
  $('usage').textContent = `Session usage: ${state.usage.requests} requests, ${state.usage.tokens} tokens. Models: vision ${state.models.vision}, text ${state.models.reasoning}, speech ${state.models.stt}.`;
  $('onboard').classList.toggle('hidden', state.hasKey);
}

// ----- asking -----
async function ask(question, mode, extra) {
  setErr('');
  $('out').classList.add('hidden');
  const r = await window.clicky.ask({ question, mode, ...extra });
  if (!r.ok && r.error) setErr(r.error);
}
$('send').onclick = () => window.clicky.utter({ text: $('q').value, source: 'typed' });
$('q').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('send').click(); } });
$('explainFields').onclick = () => ask('Explain every visible form field: what it asks for, whether it looks required, and what I would need to provide. Mark them with numbered steps.', 'form');
$('repeatSlow').onclick = async () => { if (lastAnswer) { await window.clicky.saveSettings({ speechRate: Math.max(90, Math.round((state.settings.speechRate || 190) * 0.7)) }); await refresh(); playSpeech(lastAnswer); } };
$('redraw').onclick = () => window.clicky.recapture();
$('stop').onclick = () => { window.clicky.cancel(); if (recorder) recorder.stop(); };
$('hide').onclick = () => window.clicky.close();
$('vgo').onclick = () => ask($('q').value || 'Explain what is happening at this moment in the video.', 'video',
  { video: { url: $('vurl').value, timestamp: $('vts').value, windowSec: Number($('vwin').value) || 30, transcript: $('vtr').value } });
let teachGoal = '';
$('tnext').onclick = () => { teachGoal = $('tgoal').value || teachGoal; ask(`I want to: ${teachGoal}. Re-read the screen, decide whether my last step is done, and give ONLY the next step.`, 'teacher'); };
$('tagain').onclick = () => ask(`Repeat the current step for: ${teachGoal}, more simply.`, 'teacher');
$('dictate').onclick = () => { dictating = true; toggleMic(); };

addEventListener('keydown', (e) => { if (e.key === 'Escape') { window.clicky.cancel(); window.clicky.close(); } });

// ----- results -----
const li = (arr, el) => { el.replaceChildren(...arr.map((t) => { const x = document.createElement('li'); x.textContent = t; return x; })); };
window.clicky.onResult((r) => {
  lastAnswer = r.answer;
  $('out').classList.remove('hidden');
  $('ans').textContent = r.answer || 'No answer';
  const chips = [];
  chips.push(`intent: ${r.intent}`);
  chips.push(`model-reported confidence ${Math.round(r.confidence * 100)}% (uncalibrated)`);
  if (r.noVision) chips.push('⚠ no vision model on your Groq key: screen not seen');
  if (r.model) chips.push(`model: ${r.model}`);
  if (r.malformed) chips.push('⚠ response was not structured');
  if (r.rejectedAnnotations?.length) chips.push(`${r.rejectedAnnotations.length} invalid drawing(s) discarded`);
  if (r.requires_confirmation) chips.push('needs your confirmation');
  $('meta').replaceChildren(...chips.map((c) => { const s = document.createElement('span'); s.textContent = c; return s; }));
  li(r.observations, $('obs')); li(r.assumptions, $('asm'));
  $('obsWrap').classList.toggle('hidden', !r.observations.length); $('asmWrap').classList.toggle('hidden', !r.assumptions.length);
  $('act').replaceChildren(...r.suggested_actions.map((a) => { const d = document.createElement('div'); d.textContent = `Suggested: ${a.kind} ${a.target || ''} ${a.reason ? '— ' + a.reason : ''}`; return d; }));
  if (dictating) { dictating = false; }
});
window.clicky.onBusy(({ busy }) => setBusy(busy));
window.clicky.onError(({ code, message }) => { setErr(message); if (code === 'SCREEN_PERMISSION') show('settings'); });
window.clicky.onSettings((s) => { state.settings = s; applySettings(s); });
window.clicky.onActivate(({ mode, onboarding, tab }) => {
  $('scrDot').classList.toggle('on', mode !== 'text' && mode !== 'settings');
  $('scrTxt').textContent = mode === 'text' || mode === 'settings' ? 'Screen not captured' : 'Screen captured (this moment only)';
  refresh();
  show(mode === 'tab' && tab ? tab : mode === 'settings' ? 'settings' : 'ask');
  if (onboarding) setErr('');
  if (mode === 'voice') toggleMic();
});

// ----- voice: starts on hotkey, auto-stops on silence (simple energy VAD), Groq Whisper transcription -----
let vadStop = null;
let followUp = false; // listening for a follow-up right after Clicky finished talking
async function toggleMic() {
  if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
  await window.clicky.stopSpeaking(); // barge-in: talking interrupts playback
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunks = [];
    let heardSpeech = false; let peak = 0; let noise = null;
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (vadStop) { vadStop(); vadStop = null; }
      micUi(false);
      const blob = new Blob(chunks, { type: 'audio/webm' });
      window.clicky.log(`mic stopped: heardSpeech=${heardSpeech} bytes=${blob.size} peak=${peak.toFixed(4)} noise=${(noise || 0).toFixed(4)}`);
      if (!heardSpeech || blob.size < 1500) { if (dictating) { dictating = false; window.clicky.close(); } else if (followUp) { followUp = false; window.clicky.close(); } return; }
      followUp = false;
      setBusy(true);
      const res = await window.clicky.transcribe({ audio: await blob.arrayBuffer(), mime: 'audio/webm', filename: 'speech.webm' });
      setBusy(false);
      if (!res.ok) { setErr(res.error); return; }
      const text = res.text.trim();
      $('q').value = text;
      if (dictating) { dictating = false; await window.clicky.dictate(text); return; }
      handleSpoken(text);
    };
    recorder.start(250);
    window.clicky.log(`mic started (${dictating ? 'dictation' : 'question'}) device=${stream.getAudioTracks()[0]?.label || '?'}`);
    micUi(true);
    // Energy-based voice activity detection: stop ~1.3s after speech ends; give up after 8s of silence.
    const ctx = new AudioContext();
    const an = ctx.createAnalyser(); an.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    const t0 = performance.now(); let lastVoice = t0; let alive = true;
    vadStop = () => { alive = false; ctx.close().catch(() => {}); };
    let lastSent = 0;
    const iv = setInterval(() => tick(), 40); // timers keep running while the panel is hidden (rAF would not)
    const prevStop = vadStop; vadStop = () => { clearInterval(iv); prevStop(); };
    const tick = () => {
      if (!alive || !recorder || recorder.state !== 'recording') { clearInterval(iv); return; }
      an.getFloatTimeDomainData(buf);
      let sum = 0; for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      // Noise floor = quietest level seen (so talking immediately can't raise it), capped low.
      noise = Math.min(noise == null ? rms : noise, 0.01); peak = Math.max(peak, rms);
      if (rms > Math.max(0.006, noise * 2.5)) { heardSpeech = true; lastVoice = now; }
      $('micLevel').style.width = `${Math.min(100, rms * 900)}%`;
      if (now - lastSent > 60) { lastSent = now; window.clicky.micLevel(Math.min(1, rms * 12)); }
      if ((heardSpeech && now - lastVoice > 1300) || (!heardSpeech && now - t0 > (followUp ? 6000 : 8000)) || now - t0 > 60000) { clearInterval(iv); recorder.stop(); }
    };
  } catch (e) {
    window.clicky.log(`mic error: ${e.name} ${e.message}`);
    setErr('Microphone unavailable. Use text instead, or grant Microphone permission in Settings.');
    micUi(false);
  }
}

// Voice commands first, then a normal question about the screen.
function handleSpoken(text) {
  if (/repeat (that )?(more )?slow(ly|er)/i.test(text)) { $('repeatSlow').click(); return; }
  window.clicky.utter({ text, source: followUp ? 'follow-up' : 'voice' });
}

// Released Control+Option: finish the recording now (VAD also stops on its own).
window.clicky.onPttUp(() => { if (recorder && recorder.state === 'recording') recorder.stop(); });
window.clicky.onDictateStart(() => { if (recorder && recorder.state === 'recording') { recorder.stop(); return; } dictating = true; toggleMic(); });
// Hands-free: after the answer finishes speaking, listen for a follow-up.
// Smooth discussion: when Clicky finishes speaking, keep listening for a follow-up for a few seconds.
window.clicky.onSpeechDone((d) => {
  if (d && d.failed) return;
  const conv = state?.settings?.conversation !== false || state?.settings?.handsFree;
  if (conv && !(recorder && recorder.state === 'recording')) { followUp = true; toggleMic(); }
});

function micUi(on) { window.clicky.micState(on); $('micDot').classList.toggle('on', on); $('micTxt').textContent = on ? 'Listening… stops when you pause' : 'Microphone off'; $('mic').setAttribute('aria-pressed', String(on)); }
$('mic').onclick = toggleMic;
navigator.mediaDevices?.addEventListener?.('devicechange', () => { if (recorder && recorder.state === 'recording') { recorder.stop(); setErr('Audio device changed; recording stopped.'); } });

// ----- agent -----
$('astart').onclick = async () => { $('alog').replaceChildren(); const r = await window.clicky.startAgent({ goal: $('agoal').value }); if (!r.ok) setErr(r.error); };
$('apause').onclick = () => window.clicky.agentControl('pause');
$('aresume').onclick = () => window.clicky.agentControl('resume');
window.clicky.onAgent((e) => {
  const item = document.createElement('li');
  if (e.type === 'plan') item.textContent = `Plan: ${e.say}`;
  else if (e.type === 'step') item.textContent = `${e.action.kind} ${e.action.target || ''} — ${e.verified ? 'screen changed ✓' : 'could not confirm'}`;
  else if (e.type === 'handback') item.textContent = `Your turn: ${e.reason}`;
  else if (e.type === 'blocked') item.textContent = `Blocked: ${e.reason}`;
  else if (e.type === 'say') item.textContent = e.text;
  else if (e.type === 'end') item.textContent = `Finished: ${e.status}${e.error ? ' — ' + e.error : ''}`;
  else return;
  $('alog').appendChild(item);
});
window.clicky.onApproval(({ action }) => {
  pendingApproval = action;
  $('apText').textContent = `Do you approve: ${action.kind} → ${action.target || ''}${action.value && !/pass|otp|card/i.test(action.target || '') ? ` = "${action.value}"` : ''}?`;
  $('approval').classList.remove('hidden'); $('apYes').focus();
});
const answer = (ok) => { if (pendingApproval) window.clicky.approve({ id: pendingApproval.id, ok }); pendingApproval = null; $('approval').classList.add('hidden'); };
$('apYes').onclick = () => answer(true); $('apNo').onclick = () => answer(false);

// ----- settings -----
$('saveKey').onclick = async () => { const r = await window.clicky.setApiKey($('key').value); $('key').value = ''; setErr(r.ok ? '' : 'Secure storage unavailable on this system; set GROQ_API_KEY in the environment instead.'); refresh(); };
$('checkModels').onclick = async () => { $('models').textContent = 'Checking…'; const r = await window.clicky.checkModels(); $('models').textContent = r.ok ? JSON.stringify(r.models, null, 2) + '\n(null = unavailable; TTS falls back to macOS voice)' : r.error; refresh(); };
$('permScreen').onclick = () => window.clicky.openPermissions('screen');
$('permMic').onclick = () => window.clicky.openPermissions('mic');
$('permAcc').onclick = () => window.clicky.openPermissions('access');
$('saveSet').onclick = async () => {
  const r = await window.clicky.saveSettings({ hotkey: $('hotkey').value, policy: $('policySel').value, speechRate: Number($('rate').value) || 190,
    speakAnswers: $('speak').checked, voiceOnHotkey: $('voiceHk').checked, holdToTalk: $('holdTalk').checked, pointerColor: $('ptrColor').value, handsFree: $('handsFree').checked, memoryEnabled: $('memory').checked, dictationHotkey: $('dictHk').value, theme: $('theme').value, textScale: Number($('scale').value), highContrast: $('contrast').checked });
  setErr(r.hotkeyOk ? '' : 'That shortcut could not be registered (in use?).'); refresh();
};
$('replay').onclick = () => window.clicky.replayOnboarding();
$('delAll').onclick = async () => { if (!confirm('Delete your saved memory, settings and API key from this Mac?')) return; await window.clicky.deleteAllData(); setErr('All local data deleted. Re-enter your Groq key to continue.'); refresh(); };
$('clearHist').onclick = () => { window.clicky.clearHistory(); $('out').classList.add('hidden'); };
refresh();

// ----- natural voice playback (Groq Orpheus wav; macOS voice fallback handled in main) -----
let audio = null;
async function playSpeech(text) {
  if (audio) { audio.pause(); audio = null; }
  window.clicky.speaking(text);
  const r = await window.clicky.speak(text);
  if (r && r.wav) { audio = new Audio('data:audio/wav;base64,' + r.wav); audio.playbackRate = Math.min(1.3, Math.max(0.6, (state?.settings?.speechRate || 190) / 190)); await audio.play().catch(() => {}); }
}
window.clicky.onSpeakAnswer(({ text }) => { lastAnswer = text; playSpeech(text).then(() => { if (audio) audio.onended = () => window.clicky.tourDone(); else window.clicky.tourDone(); }); });
window.clicky.onStopAudio(() => { if (audio) { audio.pause(); audio = null; } });
