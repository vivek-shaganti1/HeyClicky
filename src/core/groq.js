'use strict';
// Groq provider. Runs ONLY in the Electron main process; the key never reaches a renderer.
const crypto = require('node:crypto');
const { withRetry } = require('./retry');
const { safeError } = require('./redact');

const BASE = 'https://api.groq.com/openai/v1';

// Defaults are overridable and verified against the live catalog (see resolveModels).
const DEFAULT_MODELS = {
  vision: ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'],
  reasoning: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b'],
  stt: ['whisper-large-v3-turbo', 'whisper-large-v3'],
  tts: ['canopylabs/orpheus-v1-english', 'playai-tts'],
};
// Orpheus voice names vary by provider; tried in order until one is accepted.
const VOICES = ['troy', 'hannah', 'autumn', 'diana', 'austin', 'daniel', 'tara', 'leo', 'Fritz-PlayAI'];

class GroqError extends Error {
  constructor(message, { status, retryable, retryAfterMs, requestId } = {}) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
    this.retryable = !!retryable;
    this.retryAfterMs = retryAfterMs;
    this.requestId = requestId;
  }
}

class GroqClient {
  /**
   * @param {object} o {getApiKey:()=>string|undefined, fetchImpl, timeoutMs, models, onUsage}
   */
  constructor({ getApiKey, fetchImpl = globalThis.fetch, timeoutMs = 30000, models = {}, onUsage, retries = 3 } = {}) {
    this.getApiKey = getApiKey;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.models = { vision: models.vision || DEFAULT_MODELS.vision[0], reasoning: models.reasoning || DEFAULT_MODELS.reasoning[0],
      stt: models.stt || DEFAULT_MODELS.stt[0], tts: models.tts || '' };
    this.onUsage = onUsage || (() => {});
    this.onResolve = null;
    this.catalog = null;
  }

  async _request(path, { method = 'POST', json, form, signal, timeoutMs, raw = false } = {}) {
    const key = this.getApiKey && this.getApiKey();
    if (!key) throw new GroqError('No Groq API key configured. Add one in Settings.', { status: 401 });
    const requestId = crypto.randomUUID();
    return withRetry(async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(new Error('timeout')), timeoutMs || this.timeoutMs);
      const onAbort = () => ctrl.abort(new Error('Cancelled'));
      if (signal) { if (signal.aborted) onAbort(); else signal.addEventListener('abort', onAbort, { once: true }); }
      try {
        const headers = { Authorization: `Bearer ${key}`, 'X-Client-Request-Id': requestId };
        if (json) headers['Content-Type'] = 'application/json';
        const res = await this.fetch(BASE + path, { method, headers, body: json ? JSON.stringify(json) : form, signal: ctrl.signal });
        if (!res.ok) {
          let detail = '';
          try { detail = (await res.json()).error?.message || ''; } catch { /* ignore */ }
          const ra = Number(res.headers.get('retry-after'));
          const status = res.status;
          const friendly = status === 401 ? 'Invalid Groq API key.'
            : status === 429 ? 'Groq rate limit reached.'
            : status === 404 ? 'Model not available for this key.'
            : `Groq request failed (${status}). ${safeError(detail)}`;
          throw new GroqError(friendly, { status, requestId,
            retryable: status === 429 || status >= 500, retryAfterMs: Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined });
        }
        return raw ? res : await res.json();
      } catch (err) {
        if (err instanceof GroqError) throw err;
        if (signal && signal.aborted) throw new GroqError('Cancelled', { requestId });
        const msg = ctrl.signal.aborted ? 'Request timed out.' : 'Network error reaching Groq.';
        throw new GroqError(msg, { requestId, retryable: true });
      } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onAbort);
      }
    }, { retries: this.retries, signal, shouldRetry: (e) => e.retryable });
  }

  async listModels(signal) {
    const data = await this._request('/models', { method: 'GET', signal });
    this.catalog = new Set((data.data || []).map((m) => m.id));
    return [...this.catalog];
  }

  // Pick first available candidate per capability; keep configured one if the catalog lists it.
  async resolveModels(signal) {
    await this.listModels(signal);
    const ids = [...this.catalog];
    const guess = (re, not) => ids.find((id) => re.test(id) && !(not && not.test(id))) || null;
    const NON_CHAT = /whisper|tts|guard|embed|orpheus|playai|distil/i;
    const pick = (cur, cands, re) => (this.catalog.has(cur) ? cur
      : cands.find((c) => this.catalog.has(c)) || (re ? guess(re, NON_CHAT) : null));
    const resolved = {
      vision: pick(this.models.vision, DEFAULT_MODELS.vision, /llama-4|vision|scout|maverick|vl\b|-vl|gemma-3|kimi.*vl/i),
      reasoning: pick(this.models.reasoning, DEFAULT_MODELS.reasoning, /llama-3\.3|gpt-oss|qwen|kimi|llama/i),
      stt: pick(this.models.stt, DEFAULT_MODELS.stt, /whisper/i),
      tts: pick(this.models.tts, DEFAULT_MODELS.tts, /orpheus|tts/i),
    };
    for (const k of Object.keys(resolved)) if (resolved[k]) this.models[k] = resolved[k];
    if (!resolved.vision) this.models.vision = '';
    // Untested image candidates: chat models, most likely multimodal first.
    const NON = /whisper|tts|guard|embed|orpheus|playai|distil|safeguard|allam/i;
    this.visionCandidates = resolved.vision ? [resolved.vision]
      : ids.filter((id) => !NON.test(id)).sort((a, b) => (/qwen|gemma|vl|vision|kimi|llama-4/i.test(b) ? 1 : 0) - (/qwen|gemma|vl|vision|kimi|llama-4/i.test(a) ? 1 : 0));
    return resolved; // null = unavailable; caller must degrade (e.g. TTS -> macOS `say`)
  }

  /** Route by task: image present => vision model; otherwise reasoning model. */
  routeModel({ hasImage, complex }) {
    if (hasImage) return this.models.vision;
    return complex ? this.models.reasoning : this.models.reasoning;
  }

  async ensureModels(signal) {
    if (this.catalog) return;
    try { const r = await this.resolveModels(signal); this.onResolve && this.onResolve(r, [...this.catalog]); } catch (e) { if (e.status === 401) throw e; }
  }

  async chat(opts) {
    await this.ensureModels(opts.signal);
    if (opts.hasImage && !opts.model && !this.models.vision) return this._probeVision(opts);
    try { return await this._chat(opts); } catch (e) {
      if (e.status !== 404 || opts.model) throw e;
      this.models.vision = opts.hasImage ? '' : this.models.vision;
      this.catalog = null; await this.ensureModels(opts.signal); // model retired: refresh catalog once and retry
      return opts.hasImage && !this.models.vision ? this._probeVision(opts) : this._chat(opts);
    }
  }

  // Try candidates with the image; keep the first that accepts it. If none, answer text-only and say so.
  async _probeVision(opts) {
    for (const m of this.visionCandidates || []) {
      try {
        const r = await this._chat({ ...opts, model: m });
        this.models.vision = m;
        this.onResolve && this.onResolve({ vision: m, probed: true }, []);
        return r;
      } catch (e) {
        if (e.status === 401 || e.status === 429 || /Cancelled/.test(e.message)) throw e;
        try { await this._chat({ ...opts, model: m, json: false }); this.models.vision = m; return await this._chat({ ...opts, model: m }); } catch { /* not image-capable */ }
      }
    }
    const textOnly = opts.messages.map((msg) => (Array.isArray(msg.content)
      ? { ...msg, content: msg.content.filter((p) => p.type === 'text').map((p) => p.text).join('\n') + '\n[NOTE: No vision model is available on this Groq key, so you cannot see the screen. Say so briefly in "answer", answer from the text only, and return no annotations.]' }
      : msg));
    const r = await this._chat({ ...opts, messages: textOnly, hasImage: false, model: this.models.reasoning });
    return { ...r, noVision: true };
  }

  async _chat({ messages, hasImage = false, complex = false, model, json = true, temperature = 0.3, maxTokens = 4096, signal }) {
    const m = model || this.routeModel({ hasImage, complex });
    if (!m) throw new GroqError(hasImage ? 'No vision-capable model is available for this Groq key.' : 'No text model available for this Groq key.', { status: 404 });
    const body = { model: m, messages, temperature, max_tokens: maxTokens };
    if (json) body.response_format = { type: 'json_object' };
    const t0 = Date.now();
    const data = await this._request('/chat/completions', { json: body, signal });
    const text = data.choices?.[0]?.message?.content ?? '';
    this.onUsage({ kind: 'chat', model: m, ms: Date.now() - t0, usage: data.usage || null });
    return { text, model: m, usage: data.usage || null };
  }

  /** audio: Buffer; filename extension must reflect the real container (webm/wav/m4a). */
  async transcribe({ audio, filename = 'audio.webm', mime = 'audio/webm', language, signal }) {
    await this.ensureModels(signal);
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mime }), filename);
    form.append('model', this.models.stt);
    form.append('response_format', 'verbose_json');
    form.append('temperature', '0');
    if (language) form.append('language', language);
    const data = await this._request('/audio/transcriptions', { form, signal, timeoutMs: 60000 });
    this.onUsage({ kind: 'stt', model: this.models.stt });
    return { text: (data.text || '').trim(), language: data.language };
  }

  /** Returns audio Buffer, or null when no TTS model is configured/available (caller uses native). */
  // Find an image-capable model once (tiny probe) so streaming requests can go straight to it.
  async ensureVisionModel(signal) {
    await this.ensureModels(signal);
    if (this.models.vision) return this.models.vision;
    const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await this._probeVision({ hasImage: true, json: false, maxTokens: 5, signal,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply ok.' }, { type: 'image_url', image_url: { url: PIXEL } }] }] });
    return this.models.vision || null;
  }

  /**
   * Streaming chat (SSE). Calls onDelta(text) as tokens arrive; resolves with the full text.
   * Retries only happen before the first token (safe: nothing has been shown or spoken yet).
   */
  async chatStream(opts) {
    const { hasImage = false, model, signal } = opts;
    await this.ensureModels(signal);
    if (model || !hasImage || this.models.vision) return this._chatStream({ ...opts, model: model || (hasImage ? this.models.vision : this.models.reasoning) });
    // No known vision model yet: try candidates with the REAL request (a 1x1 probe image gets rejected).
    // A rejection arrives before any token is streamed, so trying the next one is safe.
    for (const m of this.visionCandidates || []) {
      try {
        const r = await this._chatStream({ ...opts, model: m });
        this.models.vision = m;
        if (this.onResolve) this.onResolve({ vision: m, probed: true }, []);
        return r;
      } catch (e) {
        console.log(`[groq] vision candidate ${m} rejected: ${e.status || ''} ${e.message}`);
        if (e.status === 401 || e.status === 429 || /Cancelled/.test(e.message) || e.streamed) throw e;
      }
    }
    console.log('[groq] no vision-capable model accepted the screenshot; answering text-only');
    // Nothing accepts images: answer from words alone and say so (never pretend to see).
    const messages = opts.messages.map((msg) => (Array.isArray(msg.content) ? { ...msg, content: msg.content.filter((p) => p.type === 'text').map((p) => p.text).join('\n')
      + '\n[NOTE: you cannot see the screen right now. Say that briefly, use no tags, and help from the words only.]' } : msg));
    return this._chatStream({ ...opts, messages, hasImage: false, model: this.models.reasoning });
  }

  /** Streaming chat (SSE). Calls onDelta(text) as tokens arrive; resolves with the full text. */
  async _chatStream({ messages, model: m, temperature = 0.4, maxTokens = 1200, signal, onDelta }) {
    if (!m) throw new GroqError('No usable model is available for this Groq key.', { status: 404 });
    const t0 = Date.now();
    const res = await this._request('/chat/completions', { raw: true, signal, timeoutMs: 60000,
      json: { model: m, messages, temperature, max_tokens: maxTokens, stream: true } });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = ''; let full = ''; let firstMs = null; let usage = null;
    const onAbort = () => reader.cancel().catch(() => {});
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          let j; try { j = JSON.parse(data); } catch { continue; }
          const d = j.choices?.[0]?.delta?.content;
          if (j.x_groq?.usage) usage = j.x_groq.usage;
          if (d) { if (firstMs == null) firstMs = Date.now() - t0; full += d; if (onDelta) onDelta(d); }
        }
      }
    } finally { if (signal) signal.removeEventListener('abort', onAbort); }
    if (signal && signal.aborted) throw new GroqError('Cancelled');
    this.onUsage({ kind: 'chat-stream', model: m, ms: Date.now() - t0, firstTokenMs: firstMs, usage });
    return { text: full, model: m, firstTokenMs: firstMs };
  }

  async speak({ text, voice, signal }) {
    await this.ensureModels(signal);
    if (!this.models.tts) return null;
    const voices = [voice, this.voice, ...VOICES].filter(Boolean);
    let lastErr;
    for (const v of [...new Set(voices)]) {
      try {
        const res = await this._request('/audio/speech', {
          json: { model: this.models.tts, input: text.slice(0, 1000), voice: v, response_format: 'wav' }, signal, raw: true });
        this.voice = v;
        return Buffer.from(await res.arrayBuffer());
      } catch (e) {
        lastErr = e;
        if (e.status !== 400 && e.status !== 422) throw e; // only an invalid voice is worth trying the next one
      }
    }
    throw lastErr;
  }
}

module.exports = { GroqClient, GroqError, DEFAULT_MODELS, BASE, VOICES };
