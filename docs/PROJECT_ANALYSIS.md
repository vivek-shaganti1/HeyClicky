# Project analysis
- Repository state at start: **empty** (only `.claude/`). No prior code, tests, env files or features to preserve.
- Toolchain: Node 26, npm 11, macOS (Darwin). Baseline: no tests/lint/build existed.
- Decision: **Electron + plain CommonJS** (no build step). A web app cannot do global hotkeys, desktop capture or OS permissions; Electron gives `globalShortcut`, `desktopCapturer`, `safeStorage`, transparent overlays.
- Not done: https://www.heyclicky.com/ (home, changelog, trust) and Groq docs were **not fetched in this session**; the feature matrix is based on the request text, not verified reference behavior. Model IDs in `src/core/groq.js` are defaults checked at runtime against `GET /models`, not verified against current docs.
- npm in this environment had a root-owned cache; installs used a temp cache. The Electron binary download did not complete here (see STATUS).
