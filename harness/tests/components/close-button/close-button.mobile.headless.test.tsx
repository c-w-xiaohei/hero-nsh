import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the close-button adapt unit — the
 * one row of adapt-sheets/close-button.md §4 that needs `app.hover`, which
 * a phone has no mouse for:
 *
 *   M-006  the desktop zero-drift baseline, moved whole from
 *          `close-button.mobile.test.tsx` (which covers M-001…M-004 on
 *          every target, native included). `platform:"windows"` pins the
 *          pointer host the baseline asserts.
 */

type Params = Record<string, string>;

// The press-sequence probe names, in contract order (adapt sheet §4 M-001).
const PRESS_EVENTS = [
  "pressDown",
  "pressStart",
  "pressChange",
  "pressUp",
  "pressEnd",
  "press",
  "click",
] as const;

// pressStart→pressDown→pressChange(true)→pressUp→pressEnd→pressChange(false)
// →press→click, verbatim.
const PRESS_SEQUENCE = [
  "pressStart",
  "pressDown",
  "pressChange",
  "pressUp",
  "pressEnd",
  "pressChange",
  "press",
  "click",
];

function openCloseButton(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../close-button.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

/** The press-sequence probe names in firing order; layout/hover excluded. */
function pressOrder(app: App): string[] {
  return calls(app)
    .filter((c) => (PRESS_EVENTS as readonly string[]).includes(c.name))
    .map((c) => c.name);
}

describe("close-button mobile (headless)", () => {
  // adapt-sheets/close-button.md M-006 (baseline): desktop zero-drift
  // sample — the attributed case still shows the default CloseIcon, the
  // press sequence stays verbatim, hover callbacks pair enter/leave, and
  // `isPending` still blocks press and hover.
  test("M-006 desktop baseline: icon, press sequence, paired hover, pending block", async () => {
    const icon = await openCloseButton("attributed");
    expect(icon.shows("id:close-button-icon")).toBe(true);
    expect(icon.count("id:close-button-icon")).toBe(1);

    const app = await openCloseButton("events");
    await app.press("id:cb-probe");
    expect(pressOrder(app)).toEqual(PRESS_SEQUENCE);

    const hover = await openCloseButton("events");
    await hover.hover("id:cb-probe");
    expect(callsOf(hover, "onHoverStart")).toHaveLength(1);
    expect(callsOf(hover, "onHoverChange")).toEqual([[true]]);

    await hover.hover("id:hover-away");
    expect(callsOf(hover, "onHoverEnd")).toHaveLength(1);
    expect(callsOf(hover, "onHoverChange")).toEqual([[true], [false]]);

    const pending = await openCloseButton("events", { pending: "1" });
    await pending.press("id:cb-probe");
    expect(callsOf(pending, "press")).toHaveLength(0);
    await pending.hover("id:cb-probe");
    expect(callsOf(pending, "onHoverStart")).toHaveLength(0);
  }, 120_000);
});
