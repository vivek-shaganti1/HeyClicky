# Security & privacy
- Capture only on explicit activation; no background capture or keylogging; only `globalShortcut` is used.
- Screenshots are processed in memory; never written to disk. They **are sent to Groq's cloud** and handled under Groq's policies. Not a local-only product.
- Manual redaction boxes are burned into the image before sending. Redaction is manual and not guaranteed complete.
- API key: main process only, `safeStorage` encrypted; logs/errors pass through `redact.js` (best effort).
- Renderers: sandbox, contextIsolation, CSP, navigation and window.open blocked.
- Policy engine enforces approvals independent of model output; CAPTCHA/MFA/OTP always handed back; password/card fields are never filled by the agent.
- Known gaps: no audit-log persistence, no skill signing (skills system not built), model output is not calibrated.
