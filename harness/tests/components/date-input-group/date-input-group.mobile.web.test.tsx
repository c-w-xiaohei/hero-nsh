import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import {
  fieldChanges,
  lastSegment,
  lastSegmentProps,
} from "../../testers/date-input-group";

/*
 * Web mobile assertions for the DateInputGroup adapt unit — the halves of
 * adapt-sheets/date-input-group.md §4 that need a real hit test or a real
 * Tab order, neither of which the headless engine models:
 *
 *   - M-002's static half: `pointer-events-none` on a non-interactive affix
 *     only blocks a real pointer hit test; the headless driver dispatches
 *     the press to the named view regardless (measured), so the "affix
 *     content stays inert" assertion lives here.
 *   - M-010's commit half: the group's blur boundary is reached by Tab on
 *     the web (headless windows has no Tab focus; its press-focus half is
 *     `date-input-group.mobile.headless.test.tsx`).
 *
 * `platform: "web"` pins the pointer host for the same reason the dual file
 * pins `"windows"`: an unpinned suite run would derive `input == "touch"`.
 * The `scope: "touch"` half still goes through `EnvironmentScope`.
 */

function openDig(
  caseName: string,
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../date-input-group.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: caseName, ...params } },
  });
}

// The last `segment-props` record per type decides: earlier renders still
// carry the previous `isFocused`, so "focused" means the latest render says so.
function focusedTypes(app: App, name = "segment-props"): string[] {
  const last = new Map<string, boolean>();
  for (const c of callsOf(app, name)) {
    const r = c[0] as { type: string; isFocused: boolean };
    last.set(r.type, r.isFocused);
  }
  return [...last.entries()].filter(([, focused]) => focused).map(([type]) => type);
}

async function waitFocused(app: App, type: string, name = "segment-props"): Promise<void> {
  await app.waitUntil(() => focusedTypes(app, name).includes(type));
}

describe("date-input-group mobile (web)", () => {
  // adapt-sheets/date-input-group.md M-002 (A-001, A-008), static half: an
  // affix with no picker context keeps `pointer-events-none` — a real press
  // on the pressable inside it never reaches the probe, while a segment
  // press beside it still focuses the channel. (The interactive half runs
  // in `date-input-group.mobile.test.tsx` on both targets.)
  test("M-002 injected touch: non-interactive affix stays inert, segment press works", async () => {
    const app = await openDig("affix-static", { scope: "touch" });

    await app.press("id:affix-prefix-button");
    await app.press("id:affix-suffix-button");
    await app.wait(50);

    // `pointer-events-none` swallowed both presses: no probe call recorded.
    expect(callsOf(app, "affix-presses")).toHaveLength(0);

    // The segment beside the affix is unaffected: its channel takes the
    // press and focuses.
    await app.press("id:dig-seg-month");
    await waitFocused(app, "month");
  }, 120_000);

  // adapt-sheets/date-input-group.md M-010 (基线), commit half: leaving the
  // group commits once — the February 30th display clamps to the 28th on
  // the blur boundary, the same semantics `date-input-group.web.test.tsx`
  // X-005 pins read-only. (The headless press-focus half is in
  // `date-input-group.mobile.headless.test.tsx`.)
  test("M-010 default environment: Tab out of the group commits the clamped value once", async () => {
    const app = await openDig("trigger-focus");

    await app.press("label:trigger-date >> text:mm");
    await waitFocused(app, "month");

    for (const key of ["0", "2", "3", "0", "2", "0", "2", "6"]) {
      await app.keyboard.press(key);
    }
    expect(lastSegment(app, "month").text).toBe("2");
    expect(lastSegment(app, "day").text).toBe("30");
    expect(fieldChanges(app)).toHaveLength(0);

    // Month → day → year were the Tab stops already walked by typing; two
    // more Tabs reach the trigger and then the view after the group.
    await app.keyboard.press("tab");
    await app.keyboard.press("tab");
    await app.waitUntil(() => fieldChanges(app).length > 0);

    expect(fieldChanges(app)).toEqual(["2026-2-28"]);
    expect(lastSegmentProps(app, "year").isFocused).toBe(false);
  }, 120_000);
});
