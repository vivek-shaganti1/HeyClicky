'use strict';
// Streaming "talk" responses: plain spoken text with inline drawing tags, parsed incrementally so
// each sentence can be spoken (and its pointer move/drawing played) while the model is still writing.
//
// Tags (coordinates are 0..1000 of the screenshot, origin top-left; or el=<id> from the UI element list):
//   [POINT:x,y:label]            [POINT:el=12:label]
//   [CIRCLE:x,y,r:label]         [CIRCLE:el=12:label]
//   [ARROW:x1,y1,x2,y2:label]
//   [HIGHLIGHT:x,y,w,h:label]    [HIGHLIGHT:el=12:label]
//   [DRAG:x1,y1,x2,y2:label]     [DRAG:el=3>el=9:label]
//   [STEP:n:x,y:label]           [STEP:n:el=12:label]

const { validateAnnotation } = require('./annotations');
const { groundAnnotation } = require('./grounding');

const TAG_RE = /\[(POINT|CIRCLE|ARROW|HIGHLIGHT|DRAG|STEP):([^\]]*)\]/gi;
const n = (v) => Math.min(1, Math.max(0, Number(v) / 1000));
const nums = (s) => String(s).split(',').map((x) => Number(x.trim()));
const ok = (arr, len) => arr.length === len && arr.every(Number.isFinite);

/** Convert one tag to {point, annotation}; null if malformed. byId: Map of grounded UI elements. */
function tagToDraw(kind, body, byId) {
  const parts = body.split(':');
  const K = kind.toUpperCase();
  let geom = parts[0] || '';
  let label = parts.slice(1).join(':').trim() || undefined;
  let stepN;
  if (K === 'STEP') { stepN = Number(parts[0]) || 1; geom = parts[1] || ''; label = parts.slice(2).join(':').trim() || undefined; }
  const elRef = (g) => { const m = String(g).match(/^\s*el\s*=\s*(\d+)\s*$/i); return m ? Number(m[1]) : null; };
  let a = null;
  if (K === 'DRAG' && geom.includes('>')) {
    const [f, t] = geom.split('>');
    a = { type: 'drag', el: elRef(f), toEl: elRef(t), from: { x: 0.5, y: 0.5 }, to: { x: 0.5, y: 0.5 }, label };
    if (a.el == null || a.toEl == null || !byId) return null;
  } else if (elRef(geom) != null) {
    const type = { POINT: 'target', CIRCLE: 'circle', HIGHLIGHT: 'highlight', STEP: 'step' }[K];
    if (!type || !byId) return null;
    a = { type, el: elRef(geom), label, n: stepN };
  } else {
    const v = nums(geom);
    if (K === 'POINT' && ok(v, 2)) a = { type: 'target', center: { x: n(v[0]), y: n(v[1]) }, radius: 0.018, label };
    else if (K === 'CIRCLE' && ok(v, 3)) a = { type: 'circle', center: { x: n(v[0]), y: n(v[1]) }, radius: Math.max(0.01, Math.min(0.5, n(v[2]))), label };
    else if (K === 'ARROW' && ok(v, 4)) a = { type: 'arrow', start: { x: n(v[0]), y: n(v[1]) }, end: { x: n(v[2]), y: n(v[3]) }, label };
    else if (K === 'HIGHLIGHT' && ok(v, 4)) a = { type: 'highlight', x: n(v[0]), y: n(v[1]), w: Math.max(0.002, n(v[2])), h: Math.max(0.002, n(v[3])), label };
    else if (K === 'DRAG' && ok(v, 4)) a = { type: 'drag', from: { x: n(v[0]), y: n(v[1]) }, to: { x: n(v[2]), y: n(v[3]) }, label };
    else if (K === 'STEP' && ok(v, 2)) a = { type: 'step', at: { x: n(v[0]), y: n(v[1]) }, n: stepN, label };
    if (!a) return null;
  }
  if (byId && (a.el != null || a.toEl != null)) {
    if (a.el != null && !byId.has(a.el)) return null;
    a = groundAnnotation(a, byId);
    delete a.el; delete a.toEl;
  }
  if (a.type === 'highlight' && a.x + a.w > 1) a.w = 1 - a.x;
  if (a.type === 'highlight' && a.y + a.h > 1) a.h = 1 - a.y;
  if (!validateAnnotation(a).ok) return null;
  const point = a.center || a.at || a.from || a.start || { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  return { point, annotation: a };
}

/**
 * Incremental parser. feed(delta) returns newly completed segments:
 *   {say: string (tags removed, speakable), draw: [annotations], point: {x,y}|null}
 * Call end() to flush the rest.
 */
class TalkStreamParser {
  constructor({ elements } = {}) {
    this.buf = '';
    this.byId = elements && elements.length ? new Map(elements.map((e) => [e.id, e])) : null;
    this.full = '';
  }

  feed(delta) {
    this.buf += delta; this.full += delta;
    const out = [];
    for (;;) {
      const seg = this._take(false);
      if (!seg) break;
      if (seg.say || seg.draw.length) out.push(seg);
    }
    return out;
  }

  end() {
    const seg = this._take(true);
    return seg && (seg.say || seg.draw.length) ? [seg] : [];
  }

  // Cut one sentence off the buffer (never inside an unfinished [tag]).
  _take(final) {
    const b = this.buf;
    if (!b) return null;
    let cut = -1;
    let depth = 0;
    for (let i = 0; i < b.length; i += 1) {
      const c = b[i];
      if (c === '[') depth += 1;
      else if (c === ']') depth = Math.max(0, depth - 1);
      else if (depth === 0 && /[.!?\n]/.test(c)) {
        const next = b[i + 1];
        if (c === '\n' || next === undefined ? (c === '\n' || final) : /\s/.test(next)) {
          // don't split decimals like 3.5 or "e.g."
          if (c === '.' && /\d/.test(b[i - 1] || '') && /\d/.test(next || '')) continue;
          cut = i + 1; break;
        }
      }
    }
    if (cut < 0) {
      if (!final) {
        // Very long run-on text: speak at a comma once it gets long, to keep latency low.
        if (b.length > 220 && depth === 0) { const k = b.lastIndexOf(', '); if (k > 60) cut = k + 1; }
        if (cut < 0) return null;
      } else cut = b.length;
    }
    const raw = b.slice(0, cut);
    this.buf = b.slice(cut);
    const draw = [];
    let point = null;
    const say = raw.replace(TAG_RE, (_m, kind, body) => {
      const d = tagToDraw(kind, body, this.byId);
      if (d) { draw.push(d.annotation); point = point || d.point; }
      return ' ';
    }).replace(/\[[^\]]*$/, '').replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim();
    return { say, draw, point };
  }
}

/** Strip tags for display/memory. */
const stripTags = (s) => String(s || '').replace(TAG_RE, '').replace(/\s+/g, ' ').trim();

module.exports = { TalkStreamParser, tagToDraw, stripTags, TAG_RE };
