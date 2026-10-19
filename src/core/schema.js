'use strict';
// Validates structured model responses. Malformed output degrades to a plain-text answer.

const { filterAnnotations, validateAnnotation } = require('./annotations');
const { groundRaw } = require('./grounding');

const INTENTS = ['explain_screen', 'explain_field', 'explain_error', 'teach_step', 'fill_form',
  'video_explain', 'agent_task', 'dictation', 'chat', 'clarify', 'stop'];
const ACTION_KINDS = ['click', 'type', 'select', 'check', 'scroll', 'navigate', 'press_key',
  'submit', 'wait', 'ask_user'];

const strArr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 20) : []);

function extractJson(text) {
  if (typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(candidate.slice(start, end + 1)); } catch { return null; }
}

// Narrated walkthrough: the AI cursor moves to `point`, draws `draw`, while speaking `say`.
function validateTour(tour) {
  if (!Array.isArray(tour)) return [];
  const out = [];
  for (const st of tour.slice(0, 10)) {
    if (!st || typeof st.say !== 'string' || !st.say.trim()) continue;
    const pt = st.point && validateAnnotation({ type: 'label', at: st.point }).ok ? { x: st.point.x, y: st.point.y } : null;
    out.push({ say: st.say.slice(0, 400), point: pt, draw: filterAnnotations(st.draw).kept.slice(0, 8) });
  }
  return out;
}

function validateAction(a) {
  if (!a || typeof a !== 'object' || !ACTION_KINDS.includes(a.kind)) return null;
  const out = { kind: a.kind };
  if (typeof a.target === 'string') out.target = a.target.slice(0, 300);
  if (typeof a.value === 'string') out.value = a.value.slice(0, 2000);
  if (typeof a.reason === 'string') out.reason = a.reason.slice(0, 300);
  if (Number.isInteger(a.el) && a.el > 0) out.el = a.el;
  return out;
}

// Always returns a safe, normalized response object.
function parseModelResponse(text, { elements } = {}) {
  const raw = groundRaw(extractJson(text), elements);
  if (!raw || typeof raw !== 'object') {
    return { ok: false, malformed: true, intent: 'chat', answer: String(text || '').slice(0, 4000),
      observations: [], assumptions: [], annotations: [], tour: [], rejectedAnnotations: [],
      suggested_actions: [], requires_confirmation: false, confidence: 0 };
  }
  const { kept, rejected } = filterAnnotations(raw.annotations);
  let confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.min(1, Math.max(0, confidence));
  return {
    ok: true,
    malformed: false,
    intent: INTENTS.includes(raw.intent) ? raw.intent : 'chat',
    answer: typeof raw.answer === 'string' ? raw.answer.slice(0, 6000) : '',
    observations: strArr(raw.observations),
    assumptions: strArr(raw.assumptions),
    annotations: kept,
    tour: validateTour(raw.tour),
    rejectedAnnotations: rejected,
    suggested_actions: (Array.isArray(raw.suggested_actions) ? raw.suggested_actions : [])
      .map(validateAction).filter(Boolean).slice(0, 10),
    requires_confirmation: raw.requires_confirmation === true,
    // Self-reported; NOT a calibrated probability. See docs/EVALUATION.md.
    confidence,
  };
}

module.exports = { validateTour, parseModelResponse, extractJson, validateAction, INTENTS, ACTION_KINDS };
