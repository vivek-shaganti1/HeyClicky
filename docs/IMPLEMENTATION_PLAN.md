# Implementation plan (priority order)
1. Core: policy, schema, annotations, Groq client, retry, redaction - DONE (unit tested)
2. Shell: hotkey, panel, overlay, capture, settings - written, **not launched/verified**
3. Voice + dictation - written, unverified
4. Teacher / form / video / agent modes - written, unverified end to end
5. Next: modifier-only Ctrl+Option trigger (native CGEventTap flagsChanged helper), Playwright browser executor with DOM/accessibility targeting, Accessibility-API (AXUIElement) grounding, eval harness with fixtures, skills/agents manager, task history UI, e2e tests (Playwright for Electron).
