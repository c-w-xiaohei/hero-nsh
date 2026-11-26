---
"hero-nsh": minor
---

Require NSH 0.7 and migrate to it.

- `Tabs.Panel` is a real `tabpanel` now: NSH 0.7 added the role, so the panel no longer poses as a `region`, and screen readers say the user entered a tab's panel (a caller's `role` still wins when given).
- Press and key payloads carry `modifiers.altGraph` (nsh 0.7's `Modifiers`). Key events report the AltGr level on Windows; presses carry the field but always report `false` (only key events set it).
- Keyboard Enter / Space and assistive-technology activations report `clickCount: 0` on every platform, as the DOM's `detail` does; a press handler that counted clicks should test `>= 1`.
- A horizontal tab list pages by one full step again under `dir="rtl"`: NSH 0.7 reports the scroll view's real content width, and the chevron clamp now uses it instead of the list's narrower layout bounds.
- `nsh.json` can declare `"nsh": ">=0.7"`; the README shows how.
