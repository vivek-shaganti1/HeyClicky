'use strict';
// Video context: timestamp-bounded transcript windows. Never claims to have "watched" a video.

function parseTimestamp(s) {
  if (typeof s === 'number') return s;
  const parts = String(s).trim().split(':').map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(r).padStart(2, '0')}`;
}

/** Parse "[m:ss] text" lines, WebVTT/SRT-ish blocks, or [{start,text}] */
function parseTranscript(input) {
  if (Array.isArray(input)) return input.filter((x) => Number.isFinite(x.start)).map((x) => ({ start: x.start, text: String(x.text) }));
  const out = [];
  const lines = String(input || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const cue = lines[i].match(/^(?:\[)?(\d{1,2}:)?(\d{1,2}):(\d{2})(?:[.,]\d+)?(?:\])?\s*(?:-->.*)?$/);
    if (cue) {
      const start = parseTimestamp(`${cue[1] || ''}${cue[2]}:${cue[3]}`);
      const text = (lines[i + 1] || '').trim();
      if (text) out.push({ start, text });
      continue;
    }
    const inline = lines[i].match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(.+)$/);
    if (inline) out.push({ start: parseTimestamp(inline[1]), text: inline[2].trim() });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Transcript lines in [now - windowSec, now]. Returns {text, hasTranscript}. */
function transcriptWindow(segments, nowSec, windowSec = 30) {
  const from = Math.max(0, nowSec - windowSec);
  const sel = segments.filter((s) => s.start >= from && s.start <= nowSec);
  return { hasTranscript: segments.length > 0, covered: sel.length > 0,
    text: sel.map((s) => `[${fmt(s.start)}] ${s.text}`).join('\n') };
}

function youtubeLink(url, sec) {
  try {
    const u = new URL(url);
    if (!/(^|\.)youtube\.com$|^youtu\.be$/.test(u.hostname)) return null;
    u.searchParams.set('t', `${Math.floor(sec)}s`);
    return u.toString();
  } catch { return null; }
}

module.exports = { parseTimestamp, parseTranscript, transcriptWindow, youtubeLink, fmt };
