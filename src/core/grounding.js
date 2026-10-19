'use strict';
// Accessibility grounding: real UI elements (from the native helper) give exact positions, so
// the model can reference an element id instead of guessing pixel coordinates.

/**
 * @param elements AX items {id, role, label, x, y, w, h, secure?, value?, disabled?} in global screen points
 * @param display  {x, y, width, height} of the captured display (same coordinate space)
 * @returns elements visible on that display with normalized frames {nx, ny, nw, nh}
 */
function normalizeElements(elements, display) {
  const out = [];
  for (const e of elements || []) {
    if (![e.x, e.y, e.w, e.h].every(Number.isFinite) || e.w <= 0 || e.h <= 0) continue;
    const x0 = Math.max(e.x, display.x), y0 = Math.max(e.y, display.y);
    const x1 = Math.min(e.x + e.w, display.x + display.width), y1 = Math.min(e.y + e.h, display.y + display.height);
    if (x1 - x0 < 2 || y1 - y0 < 2) continue; // off this display
    out.push({ ...e, nx: (x0 - display.x) / display.width, ny: (y0 - display.y) / display.height,
      nw: (x1 - x0) / display.width, nh: (y1 - y0) / display.height });
  }
  return out;
}

const SHORT_ROLE = { AXButton: 'button', AXTextField: 'textfield', AXTextArea: 'textarea', AXCheckBox: 'checkbox',
  AXRadioButton: 'radio', AXPopUpButton: 'popup', AXComboBox: 'combobox', AXLink: 'link', AXMenuItem: 'menuitem',
  AXMenuButton: 'menubutton', AXTab: 'tab', AXSlider: 'slider', AXStaticText: 'text', AXHeading: 'heading',
  AXImage: 'image', AXSearchField: 'search', AXSecureTextField: 'password', AXCell: 'cell' };

/** Compact text listing for the prompt. Labels are untrusted page content. Secure values never included. */
function describeElements(els, { max = 160 } = {}) {
  // Interactive elements first, then text; keep the list short to save tokens.
  const rank = (e) => (e.role === 'AXStaticText' || e.role === 'AXHeading' || e.role === 'AXImage' ? 1 : 0);
  return [...els].sort((a, b) => rank(a) - rank(b)).slice(0, max).map((e) => {
    const r = SHORT_ROLE[e.role] || e.role.replace(/^AX/, '').toLowerCase();
    const lbl = (e.label || '').replace(/\s+/g, ' ').slice(0, 60);
    const val = !e.secure && e.value ? ` value="${String(e.value).slice(0, 30)}"` : '';
    return `[${e.id}] ${r} "${lbl}"${val}${e.disabled ? ' (disabled)' : ''} @${e.nx.toFixed(3)},${e.ny.toFixed(3)} ${e.nw.toFixed(3)}x${e.nh.toFixed(3)}`;
  }).join('\n');
}

// Replace a model annotation's geometry with the referenced element's real frame.
function groundAnnotation(a, byId) {
  if (!a || typeof a !== 'object') return a;
  if (a.el == null && a.type === 'drag' && a.toEl != null) {
    const t = byId.get(Number(a.toEl));
    return t ? { ...a, to: { x: t.nx + t.nw / 2, y: t.ny + t.nh / 2 } } : a;
  }
  if (a.el == null) return a;
  const e = byId.get(Number(a.el));
  if (!e) { const { el, ...rest } = a; return rest; } // unknown id: keep model's own coords (validated later)
  const cx = e.nx + e.nw / 2, cy = e.ny + e.nh / 2;
  const pad = 0.004;
  switch (a.type) {
    case 'circle': case 'target':
      return { ...a, center: { x: cx, y: cy }, radius: Math.min(0.5, Math.max(0.012, Math.max(e.nw, e.nh) * 0.62)) };
    case 'rectangle': case 'highlight':
      return { ...a, x: Math.max(0, e.nx - pad), y: Math.max(0, e.ny - pad), w: Math.min(1 - Math.max(0, e.nx - pad), e.nw + 2 * pad), h: Math.min(1 - Math.max(0, e.ny - pad), e.nh + 2 * pad) };
    case 'drag': {
      // "el" = thing to grab, "toEl" = drop target.
      const t = a.toEl != null ? byId.get(Number(a.toEl)) : null;
      return { ...a, from: { x: cx, y: cy }, to: t ? { x: t.nx + t.nw / 2, y: t.ny + t.nh / 2 } : a.to };
    }
    case 'arrow': {
      // Arrow ends at the element edge; keep the model's start if valid, else come from lower-left.
      const end = { x: Math.max(0, Math.min(1, e.nx - 0.004)), y: cy };
      const start = a.start && Number.isFinite(a.start.x) ? a.start : { x: Math.max(0, end.x - 0.12), y: Math.min(1, cy + 0.08) };
      return { ...a, start, end };
    }
    case 'step': case 'label':
      return { ...a, at: { x: Math.max(0, e.nx - 0.012), y: cy } };
    default: return a;
  }
}

/** Mutates nothing; returns raw model JSON with every `el` reference snapped to real geometry. */
function groundRaw(raw, elements) {
  if (!raw || typeof raw !== 'object' || !elements || !elements.length) return raw;
  const byId = new Map(elements.map((e) => [e.id, e]));
  const center = (id) => { const e = byId.get(Number(id)); return e ? { x: e.nx + e.nw / 2, y: e.ny + e.nh / 2 } : null; };
  const out = { ...raw };
  if (Array.isArray(raw.annotations)) out.annotations = raw.annotations.map((a) => groundAnnotation(a, byId));
  if (Array.isArray(raw.tour)) {
    out.tour = raw.tour.map((st) => (st && typeof st === 'object' ? {
      ...st,
      point: st.el != null && center(st.el) ? center(st.el) : st.point,
      draw: Array.isArray(st.draw) ? st.draw.map((a) => groundAnnotation(a, byId)) : st.draw,
    } : st));
  }
  return out;
}

module.exports = { normalizeElements, describeElements, groundAnnotation, groundRaw };
