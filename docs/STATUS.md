# Feature status (honest)
Legend: PASS = unit tests pass; WRITTEN = code exists, not run; MISSING.

| Area | Status | Evidence / gap |
|---|---|---|
| Action policy (approval, sensitive, CAPTCHA, screen-provenance) | PASS | test/core.test.js |
| Agent loop: cancel, step limit, no retry of submit, handback | PASS | tests with fake executor |
| Groq client: retry/429, 401, cancel, model fallback, key not leaked | PASS | mocked fetch tests |
| Structured output validation, annotation validation, coordinate mapping | PASS | tests |
| Form mapping (no invention, sensitive left to user) | PASS | tests |
| Video transcript window / honesty / link | PASS | tests |
| Global hotkey | WRITTEN | default `Control+Alt+Space`. **Modifier-only Control+Option is not possible with Electron `globalShortcut`**; needs native helper (MISSING) |
| Capture, overlay drawing, asking, panel UI | USER-VERIFIED | confirmed working by user on macOS (2026-10-19) |
| Voice STT/TTS/dictation | WRITTEN | untested; Groq TTS model unset by default (macOS `say` used) |
| Real form filling in browsers / clicking | MISSING | only keyboard typing after approval + guided clicks |
| YouTube auto timestamp / frame sampling | MISSING | user enters time + pastes transcript |
| Skills/agents manager, task history, tutorial | MISSING | |
| Accuracy benchmark ("10x") | MISSING | No baseline or eval run; no accuracy claim is made |
| E2E tests, accessibility audit | MISSING | |
