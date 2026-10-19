# Setup, permissions, Groq, testing, troubleshooting
```bash
npm install          # if ~/.npm has root-owned files: npm install --cache /tmp/npmcache
cp .env.example .env # or paste the key in Settings (encrypted by OS keychain)
npm start
npm test
```
Env vars: `GROQ_API_KEY`, optional `CLICKY_VISION_MODEL`, `CLICKY_REASONING_MODEL`, `CLICKY_STT_MODEL`, `CLICKY_TTS_MODEL`, `CLICKY_HOTKEY`. Use Settings -> "Verify models" to check IDs against Groq's live catalog.

macOS permissions (System Settings -> Privacy & Security): **Screen Recording** (capture), **Microphone** (voice), **Accessibility** (typing/dictation into other apps). Missing permissions degrade to text mode with a message.

Troubleshooting: shortcut not firing -> conflict, pick another in Settings; 401 -> bad key; 404 on model -> run Verify models; blank capture -> grant Screen Recording and restart the app.

## Build a downloadable installer (DMG)
```bash
npm install
npm install-scripts approve electron electron-builder   # npm 11 blocks install scripts by default; without this Electron's binary is not downloaded
npm install
npm run dist     # -> dist/Clicky AI-0.1.0-arm64.dmg (and x64)
```
The DMG shows the license agreement (`build/license_en.txt`, a draft template - replace with legal text) when opened, then drag-to-Applications. On first launch a colorful onboarding wizard runs: welcome -> license acceptance -> Groq key -> Screen/Mic/Accessibility prompts -> shortcut test.
Unsigned builds trigger Gatekeeper ("right-click -> Open"). For public distribution you need an Apple Developer ID certificate + notarization (not configured).

## Known install issue (Node 26)
Electron's postinstall unzip (`extract-zip`) silently fails on Node 26, leaving a 256 KB stub `node_modules/electron/dist`. Fix:
```bash
cd node_modules/electron && rm -rf dist && ditto -x -k ~/Library/Caches/electron/*/electron-v33*-darwin-arm64.zip dist && printf 'Electron.app/Contents/MacOS/Electron' > path.txt
```

## Diagnose screen vision
```bash
./node_modules/.bin/electron scripts/diag-vision.js
```
Uses your saved key and a real screenshot; prints which Groq models accept images and whether the streamed talk path works. Screenshots are token-heavy, so Groq's free tier may rate-limit (429) after a few questions per minute.
