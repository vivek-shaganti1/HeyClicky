# Architecture
```
Renderer (sandboxed, contextIsolation)      Main process (trusted)                    Network
 panel.html/js  --- preload bridge ---->  main.js  IPC, windows, hotkey
 overlay.html/js (draw + annotations)       core/groq.js        -> api.groq.com (key only here)
                                            core/orchestrator.js (prompt, route, repair)
                                            core/schema.js, annotations.js (validate model output)
                                            core/policy.js  <- TRUSTED permission engine
                                            core/agent.js   (observe/propose/authorize/execute/verify)
                                            core/forms.js, video.js, redact.js, retry.js
                                            main/capture.js (desktopCapturer, in-memory only)
                                            main/store.js   (settings; key via safeStorage)
```
- **Key isolation**: Groq key lives in main (`safeStorage`-encrypted file or `GROQ_API_KEY`). Renderers never receive it; no local HTTP proxy exists.
- **Model vs. authority**: the model returns JSON that is schema-validated; `policy.decide()` alone authorizes actions. On-screen/caption text is wrapped as `<untrusted_context>` and actions with `provenance: 'screen'` are always denied.
- **Capture flow**: hotkey -> capture display under cursor -> frozen frame in transparent full-screen overlay (exact alignment) -> user draws/redacts -> overlay exports composed JPEG + normalized marks -> downscaled to 1568px -> Groq vision. Image is held in memory and dropped on close.
- **Coordinates**: annotations are normalized 0..1 per display; conversion helpers handle multi-monitor and DPI (`core/annotations.js`).
- **Model routing**: image present -> vision model; else reasoning model. Models resolved against `/models` with fallbacks; TTS falls back to macOS `say`.
- **Voice**: turn-based (MediaRecorder -> Groq Whisper -> ask -> speak). Barge-in stops playback when recording starts. Not full-duplex streaming.
- **Agent**: keyboard text entry via `osascript` after approval; clicks/navigation are *guided* (ring shown, user acts) so the real pointer is never moved. Verification is a weak "screen changed" check plus the next vision pass.
