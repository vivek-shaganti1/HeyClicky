# HeyClicky parity (from heyclicky.com home + trust pages, read 2026-10-19; changelog page rendered empty)

| HeyClicky capability | Here | Status |
|---|---|---|
| Hotkey -> it sees your screen | Control+Option+Space captures display under cursor | user-verified |
| Talk out loud, it answers | Hotkey starts listening; auto-stops on silence; Groq Whisper; Orpheus voice | built, voice output verified; auto-listen not yet verified |
| Walks you through / teaches any tool | Teach tab + narrated pointer tour | tour verified in logs |
| Draws on screen to point the way | AI cursor glides, draws circles/arrows/diagrams with captions | verified in logs |
| "heyclicky agent ..." does the task | Say "agent ..." (or "hey clicky agent ...") | built, untested |
| Dictation | Control+Option+D: speak, text is pasted into the focused app | built, untested |
| Text summaries kept for context, deletable | Local memory.json (text only), toggle + "Delete all my data" | built, untested |
| Screenshots never stored | In-memory only | built |
| Nothing runs in background / after quit | Only global shortcuts while open | built |
| Morning suggestions from integrations | - | not built (needs account integrations) |
| Plans/limits, accounts | - | not applicable (your own Groq key) |

## Added 2026-10-19 (native helper `native/ClickyHelper.swift`, built with `npm run build:helper`)
| Capability | Status |
|---|---|
| Hold Control+Option to talk, release to send (modifier flags only; Control+Option+<key> ignored) | built, helper running with Accessibility trusted; not user-tested |
| Accessibility grounding: real buttons/fields with exact frames sent to the model; annotations snap to `el` ids | unit-tested (test/core.test.js); not user-tested |
| Agent presses buttons / fills fields via Accessibility (no pointer movement); password fields refused; values read back to verify | built; not user-tested |
| Agent typing fallback re-activates the target app first (fixes typing into Clicky's own window) | built |
| Notch island: black pill at the notch with live state; click to open 8 actions (talk, draw & ask, type, agent, teach, video, dictate, settings) | user-verified 2026-10-19 (shows + opens) |
| Exact notch fit: size/position read from macOS (`safeAreaInsets` + auxiliary top areas) per screen; idle pill == hardware notch (185x32pt on 14" MBP); fallback pill on non-notch displays | built; geometry verified in logs |
| Drag-and-drop teaching: `drag` annotation; AI pointer grabs (✊), pulls a ghost along a dashed arc, drops with a ripple; snaps to real elements via `el`/`toEl` | unit-tested; not seen on screen |
| AI pointer color: blue / yellow / orange (Settings) | built |
| Voice question end to end (auto mic on trigger -> transcription -> answer -> tour -> Orpheus voice) | verified in logs 2026-10-19 |
| Grounding targets the last app you used (not Clicky itself when launched from the notch) | built |

## Research pass 2 (heyclicky.com/changelog v1.0-v1.0.53, farzaa/clicky MIT repo, press coverage)
Built from that research (own implementation, own visuals):
| Behavior | Status |
|---|---|
| Streamed talk: answer spoken sentence-by-sentence while the model is still writing (Groq SSE) | built + unit-tested |
| Inline pointing tags in speech (`[POINT]`, `[CIRCLE]`, `[ARROW]`, `[HIGHLIGHT]`, `[DRAG]`, `[STEP]`, `el=` ids), pointer moves exactly when the words mention it | built + unit-tested |
| Conversation: after Clicky speaks, it keeps listening ~6s for a follow-up; silence ends the session | built |
| "Notch only": conversation thread, composer, agent cards, approval cards, quick actions live in the notch; unread badge | built |
| Say "agent ..." from voice or the notch composer to start an agent; "stop" cancels | built |
| Chromium/Electron apps expose UI elements (AXManualAccessibility) | verified in logs (Claude: 0 -> 186 elements) |
Not built (needs accounts/integrations or is HeyClicky-specific): multiple named "Clickys", routines, morning suggestions, Gmail/Notion/Calendar connectors, plans/billing, character packs, realtime speech-to-speech model.
