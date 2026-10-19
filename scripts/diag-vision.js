'use strict';
// Diagnostic: which Groq models accept a real screenshot with this key? Run: npx electron scripts/diag-vision.js
const { app, desktopCapturer, screen } = require('electron');
const path = require('node:path');
app.setName('project-clicky-ai'); // reuse the real app's userData (settings + encrypted key)
app.setPath('userData', path.join(app.getPath('appData'), 'project-clicky-ai'));
app.whenReady().then(async () => {
  const store = require('../src/main/store');
  const { GroqClient } = require('../src/core/groq');
  const key = store.getApiKey();
  if (!key) { console.log('NO KEY'); app.exit(1); return; }
  const d = screen.getPrimaryDisplay();
  const src = (await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 832 } }))[0];
  const url = `data:image/jpeg;base64,${src.thumbnail.toJPEG(80).toString('base64')}`;
  console.log('screenshot bytes', url.length, 'display', d.size);
  const g = new GroqClient({ getApiKey: () => key, retries: 0 });
  console.log('resolved', JSON.stringify(await g.resolveModels()), 'candidates', g.visionCandidates);
  const { buildTalkMessages } = require('../src/core/orchestrator');
  const messages = buildTalkMessages({ question: 'what am I looking at?', imageDataUrl: url, history: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] });
  try {
    let n = 0;
    const r = await g._chatStream({ model: 'qwen/qwen3.8-27b', messages, onDelta: () => { n += 1; } });
    console.log('STREAM OK deltas', n, 'first', r.firstTokenMs, 'ms ->', r.text.replace(/\s+/g, ' ').slice(0, 160));
  } catch (e) { console.log('STREAM FAIL ->', e.status, e.message.slice(0, 300)); }
  try {
    const r = await g.chatStream({ hasImage: true, messages });
    console.log('chatStream picked', r.model);
  } catch (e) { console.log('chatStream FAIL ->', e.status, e.message.slice(0, 300)); }
  app.exit(0);
});
