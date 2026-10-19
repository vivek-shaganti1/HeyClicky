'use strict';
// Annotation schema, validation, and coordinate conversion.
// All annotation coordinates are normalized 0..1 relative to the captured display.

const TYPES = ['drag', 'circle', 'arrow', 'rectangle', 'freehand', 'highlight', 'step', 'label', 'target', 'polygon'];

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const inUnit = (n) => isNum(n) && n >= 0 && n <= 1;
const validPoint = (p) => !!p && inUnit(p.x) && inUnit(p.y);

// Returns {ok, annotation|errors}. Never throws; model output is untrusted.
function validateAnnotation(a) {
  const errors = [];
  if (!a || typeof a !== 'object') return { ok: false, errors: ['not an object'] };
  if (!TYPES.includes(a.type)) errors.push(`unknown type ${a.type}`);
  switch (a.type) {
    case 'drag':
      if (!validPoint(a.from)) errors.push('drag.from invalid');
      if (!validPoint(a.to)) errors.push('drag.to invalid');
      break;
    case 'arrow':
      if (!validPoint(a.start)) errors.push('arrow.start invalid');
      if (!validPoint(a.end)) errors.push('arrow.end invalid');
      break;
    case 'circle':
    case 'target':
      if (!validPoint(a.center)) errors.push('center invalid');
      if (!(isNum(a.radius) && a.radius > 0 && a.radius <= 0.5)) errors.push('radius invalid');
      break;
    case 'rectangle':
    case 'highlight':
      if (!inUnit(a.x) || !inUnit(a.y) || !isNum(a.w) || !isNum(a.h) || a.w <= 0 || a.h <= 0 ||
          a.x + a.w > 1.0001 || a.y + a.h > 1.0001) errors.push('rect invalid');
      break;
    case 'freehand':
    case 'polygon':
      if (!Array.isArray(a.points) || a.points.length < 2 || a.points.length > 2000 ||
          !a.points.every(validPoint)) errors.push('points invalid');
      break;
    case 'step':
    case 'label':
      if (!validPoint(a.at)) errors.push('at invalid');
      break;
    default:
  }
  if (a.confidence !== undefined && !inUnit(a.confidence)) errors.push('confidence out of range');
  if (a.label !== undefined && (typeof a.label !== 'string' || a.label.length > 200)) errors.push('label invalid');
  if (errors.length) return { ok: false, errors };
  return { ok: true, annotation: a };
}

// Keep valid annotations, report rejected ones (never render unvalidated coordinates).
function filterAnnotations(list) {
  const kept = [];
  const rejected = [];
  for (const a of Array.isArray(list) ? list : []) {
    const r = validateAnnotation(a);
    if (r.ok) kept.push(r.annotation);
    else rejected.push({ annotation: a, errors: r.errors });
  }
  return { kept, rejected };
}

// display: {x,y,width,height} in DIP (Electron "bounds"); scaleFactor for pixel mapping.
function normalizedToDisplayPoint(p, display) {
  return { x: display.x + p.x * display.width, y: display.y + p.y * display.height };
}

function displayPointToNormalized(pt, display) {
  return {
    x: Math.min(1, Math.max(0, (pt.x - display.x) / display.width)),
    y: Math.min(1, Math.max(0, (pt.y - display.y) / display.height)),
  };
}

// Normalize a screen-space rect (DIP) to the display it lives in.
function rectToNormalized(rect, display) {
  const x = Math.max(rect.x, display.x);
  const y = Math.max(rect.y, display.y);
  const r = Math.min(rect.x + rect.width, display.x + display.width);
  const b = Math.min(rect.y + rect.height, display.y + display.height);
  if (r <= x || b <= y) return null;
  return { x: (x - display.x) / display.width, y: (y - display.y) / display.height,
           w: (r - x) / display.width, h: (b - y) / display.height };
}

// Which display contains the point (multi-monitor); falls back to nearest.
function displayForPoint(pt, displays) {
  const hit = displays.find((d) => pt.x >= d.x && pt.x < d.x + d.width && pt.y >= d.y && pt.y < d.y + d.height);
  if (hit) return hit;
  let best = displays[0];
  let bestD = Infinity;
  for (const d of displays) {
    const cx = Math.min(Math.max(pt.x, d.x), d.x + d.width);
    const cy = Math.min(Math.max(pt.y, d.y), d.y + d.height);
    const dist = (pt.x - cx) ** 2 + (pt.y - cy) ** 2;
    if (dist < bestD) { bestD = dist; best = d; }
  }
  return best;
}

// Euclidean error between predicted and expected normalized points (evaluation metric).
function placementError(pred, truth) {
  return Math.hypot(pred.x - truth.x, pred.y - truth.y);
}

module.exports = {
  TYPES, validateAnnotation, filterAnnotations, normalizedToDisplayPoint,
  displayPointToNormalized, rectToNormalized, displayForPoint, placementError,
};
