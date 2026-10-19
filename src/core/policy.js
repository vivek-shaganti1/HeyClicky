'use strict';
// Trusted permission engine. The model PROPOSES actions; this module DECIDES.
// Nothing here consults model text for authorization.

const MODES = ['GUIDANCE_ONLY', 'APPROVAL_REQUIRED', 'TRUSTED_LOW_RISK'];

// Always require explicit, per-action user confirmation in every mode.
const SENSITIVE_RE = /\b(submit|send|register|sign\s?up|create account|publish|post|purchase|buy|pay|checkout|order|transfer|wire|delete|remove|erase|security|password|permission|grant|accept|agree|terms|upload|share)\b/i;
// Never automatable: user must do these in the legitimate UI.
const BLOCKED_RE = /\b(captcha|recaptcha|hcaptcha|mfa|2fa|one[- ]time|otp|verification code|authenticator)\b/i;

const LOW_RISK_KINDS = new Set(['scroll', 'wait', 'ask_user', 'select', 'check']);
const WRITE_KINDS = new Set(['click', 'type', 'navigate', 'press_key']);

function classify(action) {
  const text = `${action.kind} ${action.target || ''} ${action.reason || ''}`;
  if (BLOCKED_RE.test(text)) return 'blocked';
  if (action.kind === 'submit' || SENSITIVE_RE.test(text)) return 'sensitive';
  if (action.kind === 'type' && /password|card|cvv|ssn|otp|secret/i.test(action.target || '')) return 'sensitive';
  if (LOW_RISK_KINDS.has(action.kind)) return 'low';
  if (WRITE_KINDS.has(action.kind)) return 'medium';
  return 'sensitive';
}

/**
 * @param {object} ctx {mode, grants:Set<string> (user-authorized low-risk kinds),
 *                      approvedActionIds:Set<string>, provenance}
 * @param {object} action {id, kind, target, value, reason}
 * provenance: 'user' | 'model' | 'screen'. Instructions that originate from screen
 * content are never authorized.
 */
function decide(ctx, action) {
  const mode = MODES.includes(ctx.mode) ? ctx.mode : 'GUIDANCE_ONLY';
  const risk = classify(action);
  if (ctx.provenance === 'screen') {
    return { allow: false, needsApproval: false, risk, reason: 'Instruction originated from on-screen content and is untrusted.' };
  }
  if (risk === 'blocked') {
    return { allow: false, needsApproval: false, risk, handBackToUser: true,
      reason: 'CAPTCHA/MFA/OTP challenges must be completed by the user.' };
  }
  if (mode === 'GUIDANCE_ONLY') {
    return { allow: false, needsApproval: false, risk, reason: 'Guidance-only mode: explain, do not act.' };
  }
  const approved = !!(ctx.approvedActionIds && ctx.approvedActionIds.has(action.id));
  if (risk === 'sensitive') {
    return approved
      ? { allow: true, needsApproval: false, risk, reason: 'Explicitly approved by user.' }
      : { allow: false, needsApproval: true, risk, reason: 'Sensitive/irreversible action requires explicit confirmation.' };
  }
  if (mode === 'TRUSTED_LOW_RISK' && risk === 'low' && ctx.grants && ctx.grants.has(action.kind)) {
    return { allow: true, needsApproval: false, risk, reason: 'Pre-authorized low-risk action.' };
  }
  return approved
    ? { allow: true, needsApproval: false, risk, reason: 'Approved by user.' }
    : { allow: false, needsApproval: true, risk, reason: 'Approval required.' };
}

module.exports = { MODES, classify, decide };
