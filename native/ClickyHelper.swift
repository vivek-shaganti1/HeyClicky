// clicky-helper: small native companion for the Electron app.
// - Emits Control+Option hold/release (modifier flags ONLY; no key codes or characters are observed).
// - Reads the focused app's accessibility tree (roles, labels, frames) for precise grounding.
// - Presses buttons / sets field values by element id via Accessibility, never moving the pointer.
// Protocol: one JSON object per line on stdin (commands) and stdout (replies/events).
import AppKit
import ApplicationServices
import Foundation

setvbuf(stdout, nil, _IOLBF, 0)

func emit(_ obj: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: obj),
          let s = String(data: data, encoding: .utf8) else { return }
    print(s)
}

// ---------- modifier-only hotkey ----------
var chordDown = false
var otherKeyDuringChord = false
func handleFlags(_ flags: NSEvent.ModifierFlags) {
    let f = flags.intersection(.deviceIndependentFlagsMask)
    let isChord = f.contains(.control) && f.contains(.option) && !f.contains(.command) && !f.contains(.shift)
    if isChord && !chordDown { chordDown = true; otherKeyDuringChord = false; emit(["event": "chord", "down": true]) }
    else if !isChord && chordDown { chordDown = false; emit(["event": "chord", "down": false, "combo": otherKeyDuringChord]) }
}
// flagsChanged gives modifier state only. keyDown is observed solely to know "another key was pressed
// with the chord" (so Control+Option+Space etc. don't trigger push-to-talk); the key itself is discarded.
NSEvent.addGlobalMonitorForEvents(matching: [.flagsChanged]) { handleFlags($0.modifierFlags) }
NSEvent.addGlobalMonitorForEvents(matching: [.keyDown]) { _ in
    if chordDown && !otherKeyDuringChord { otherKeyDuringChord = true; emit(["event": "chord-combo"]) }
}

// ---------- accessibility tree ----------
var registry: [Int: AXUIElement] = [:]
var nextId = 1

func attr(_ el: AXUIElement, _ name: String) -> AnyObject? {
    var v: AnyObject?
    return AXUIElementCopyAttributeValue(el, name as CFString, &v) == .success ? v : nil
}
func str(_ el: AXUIElement, _ name: String) -> String? {
    if let s = attr(el, name) as? String, !s.isEmpty { return s }
    return nil
}
func frame(_ el: AXUIElement) -> CGRect? {
    guard let p = attr(el, kAXPositionAttribute), let s = attr(el, kAXSizeAttribute) else { return nil }
    var pt = CGPoint.zero, sz = CGSize.zero
    AXValueGetValue(p as! AXValue, .cgPoint, &pt)
    AXValueGetValue(s as! AXValue, .cgSize, &sz)
    return CGRect(origin: pt, size: sz)
}

let interesting: Set<String> = ["AXButton", "AXTextField", "AXTextArea", "AXCheckBox", "AXRadioButton", "AXPopUpButton",
    "AXComboBox", "AXLink", "AXMenuItem", "AXMenuButton", "AXTab", "AXSlider", "AXStaticText", "AXHeading", "AXImage",
    "AXSearchField", "AXSecureTextField", "AXCell", "AXDisclosureTriangle", "AXIncrementor"]

func walk(_ el: AXUIElement, depth: Int, out: inout [[String: Any]]) {
    if out.count >= 400 || depth > 40 { return }
    let role = str(el, kAXRoleAttribute) ?? ""
    let sub = str(el, kAXSubroleAttribute) ?? ""
    if interesting.contains(role), let f = frame(el), f.width > 2, f.height > 2 {
        let secure = role == "AXSecureTextField" || sub == "AXSecureTextField"
        let label = str(el, kAXTitleAttribute) ?? str(el, kAXDescriptionAttribute) ?? str(el, "AXPlaceholderValue")
            ?? (role == "AXStaticText" ? (attr(el, kAXValueAttribute) as? String) : nil) ?? str(el, kAXHelpAttribute) ?? ""
        var item: [String: Any] = ["id": nextId, "role": role, "label": String(label.prefix(120)),
                                   "x": f.origin.x, "y": f.origin.y, "w": f.width, "h": f.height]
        if secure { item["secure"] = true }
        else if role == "AXTextField" || role == "AXTextArea" || role == "AXComboBox" || role == "AXSearchField",
                let v = attr(el, kAXValueAttribute) as? String { item["value"] = String(v.prefix(80)) }
        if let en = attr(el, kAXEnabledAttribute) as? Bool, !en { item["disabled"] = true }
        registry[nextId] = el; nextId += 1
        out.append(item)
    }
    if let kids = attr(el, kAXChildrenAttribute) as? [AXUIElement] { for k in kids { walk(k, depth: depth + 1, out: &out) } }
}

func tree(_ pid: Int?) -> [String: Any] {
    guard AXIsProcessTrusted() else { return ["ok": false, "error": "accessibility_not_granted"] }
    let picked = pid.flatMap { NSRunningApplication(processIdentifier: pid_t($0)) } ?? NSWorkspace.shared.frontmostApplication
    guard let app = picked else { return ["ok": false, "error": "no_frontmost_app"] }
    registry.removeAll(); nextId = 1
    let axApp = AXUIElementCreateApplication(app.processIdentifier)
    // Chromium/Electron apps (Chrome, Slack, VS Code, Claude, Discord...) only build their accessibility
    // tree when an assistive client asks for it. These are the documented opt-in switches.
    AXUIElementSetAttributeValue(axApp, "AXManualAccessibility" as CFString, kCFBooleanTrue)
    AXUIElementSetAttributeValue(axApp, "AXEnhancedUserInterface" as CFString, kCFBooleanTrue)
    var out: [[String: Any]] = []
    let win = attr(axApp, kAXFocusedWindowAttribute) as! AXUIElement?
    if let w = win { walk(w, depth: 0, out: &out) } else { walk(axApp, depth: 0, out: &out) }
    let title = win.flatMap { str($0, kAXTitleAttribute) } ?? ""
    return ["ok": true, "pid": Int(app.processIdentifier), "app": app.localizedName ?? "", "bundle": app.bundleIdentifier ?? "", "window": title, "elements": out]
}

func press(_ id: Int) -> [String: Any] {
    guard let el = registry[id] else { return ["ok": false, "error": "unknown_element"] }
    let r = AXUIElementPerformAction(el, kAXPressAction as CFString)
    return r == .success ? ["ok": true] : ["ok": false, "error": "press_failed_\(r.rawValue)"]
}

func setValue(_ id: Int, _ value: String) -> [String: Any] {
    guard let el = registry[id] else { return ["ok": false, "error": "unknown_element"] }
    let role = str(el, kAXRoleAttribute) ?? "", sub = str(el, kAXSubroleAttribute) ?? ""
    if role == "AXSecureTextField" || sub == "AXSecureTextField" { return ["ok": false, "error": "secure_field_refused"] }
    AXUIElementSetAttributeValue(el, kAXFocusedAttribute as CFString, kCFBooleanTrue)
    let r = AXUIElementSetAttributeValue(el, kAXValueAttribute as CFString, value as CFString)
    let now = attr(el, kAXValueAttribute) as? String
    return r == .success ? ["ok": true, "verified": now == value] : ["ok": false, "error": "set_failed_\(r.rawValue)"]
}

// ---------- screen / notch geometry ----------
// Exact notch size comes from macOS (safeAreaInsets + auxiliary top areas, macOS 12+), so it matches
// every MacBook model (14"/16", M1-M4...) instead of hard-coded guesses. Units: points, top-left origin.
func screensInfo() -> [String: Any] {
    let primaryH = NSScreen.screens.first?.frame.height ?? 0
    var out: [[String: Any]] = []
    for sc in NSScreen.screens {
        let f = sc.frame
        let id = (sc.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.intValue ?? 0
        var item: [String: Any] = ["id": id, "x": f.minX, "y": primaryH - f.maxY, "w": f.width, "h": f.height,
                                   "menuBar": f.maxY - sc.visibleFrame.maxY, "hasNotch": false]
        if #available(macOS 12.0, *) {
            let top = sc.safeAreaInsets.top
            if top > 0, let l = sc.auxiliaryTopLeftArea, let r = sc.auxiliaryTopRightArea {
                item["hasNotch"] = true
                item["notchH"] = top
                item["notchX"] = l.maxX - f.minX            // left edge of the notch, relative to the screen
                item["notchW"] = r.minX - l.maxX            // exact cut-out width
            }
        }
        out.append(item)
    }
    return ["ok": true, "screens": out]
}

// ---------- command loop ----------
DispatchQueue.global().async {
    while let line = readLine() {
        guard let data = line.data(using: .utf8),
              let cmd = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { continue }
        let rid = cmd["rid"] ?? 0
        DispatchQueue.main.async {
            var res: [String: Any]
            switch cmd["cmd"] as? String ?? "" {
            case "tree": res = tree(cmd["pid"] as? Int)
            case "frontmost": res = ["ok": true, "pid": Int(NSWorkspace.shared.frontmostApplication?.processIdentifier ?? 0),
                                     "app": NSWorkspace.shared.frontmostApplication?.localizedName ?? ""]
            case "press": res = press(cmd["id"] as? Int ?? -1)
            case "setValue": res = setValue(cmd["id"] as? Int ?? -1, cmd["value"] as? String ?? "")
            case "trusted": res = ["ok": true, "trusted": AXIsProcessTrusted()]
            case "ping": res = ["ok": true]
            case "screens": res = screensInfo()
            case "activate":
                let ok = (cmd["pid"] as? Int).flatMap { NSRunningApplication(processIdentifier: pid_t($0)) }?.activate() ?? false
                res = ["ok": ok]
            default: res = ["ok": false, "error": "unknown_command"]
            }
            res["rid"] = rid
            emit(res)
        }
    }
    exit(0) // parent closed stdin -> quit with it
}

// Report app switches (pid + name only) so Clicky can target the app you were using, not itself.
NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main) { n in
    if let a = n.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication {
        emit(["event": "app", "pid": Int(a.processIdentifier), "app": a.localizedName ?? ""])
    }
}
if let f = NSWorkspace.shared.frontmostApplication { emit(["event": "app", "pid": Int(f.processIdentifier), "app": f.localizedName ?? ""]) }
emit(["event": "ready", "trusted": AXIsProcessTrusted()])
NSApplication.shared.setActivationPolicy(.prohibited)
NSApplication.shared.run()
