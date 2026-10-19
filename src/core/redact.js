'use strict';
// Secret redaction for logs and error messages. Best-effort, not a guarantee.

const PATTERNS = [
  [/gsk_[A-Za-z0-9]{20,}/g, 'gsk_[REDACTED]'],
  [/(Bearer\s+)[A-Za-z0-9._\-]{16,}/gi, '$1[REDACTED]'],
  [/\b(?:\d[ -]?){13,19}\b/g, '[REDACTED_CARD]'],
  [/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]'],
  [/(password|passwd|pwd|otp|token|secret|api[_-]?key)(["']?\s*[:=]\s*["']?)[^\s"',;]+/gi, '$1$2[REDACTED]'],
];

function redact(input) {
  let s = typeof input === 'string' ? input : JSON.stringify(input);
  if (s === undefined) return '';
  for (const [re, rep] of PATTERNS) s = s.replace(re, rep);
  return s;
}

function safeError(err) {
  return redact(err && err.message ? err.message : String(err)).slice(0, 300);
}

module.exports = { redact, safeError };
