import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { dayCellSelector } from "../../testers/calendar";

/*
 * Headless-only mobile assertions for the calendar adapt unit — the one
 * row of adapt-sheets/calendar.md §4 that needs a step only the headless
 * engine provides:
 *
 *   M-004  `app.hover` — a phone has no mouse, so the hover-suppression
 *          row moved here whole (both its touch and pointer halves) from
 *          `calendar.mobile.test.tsx`, which covers the portable rows.
 */

type Params = Record<string, string>;

function openCal(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../calendar.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: caseName, ...params } },
  });
}

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

async function waitForLayout(app: App, name: string): Promise<void> {
  await app.waitUntil(() =>
    callsOf(app, "layout").some((c) => (c[0] as LayoutEntry).name === name),
  );
}

describe("calendar mobile (headless)", () => {
  // adapt-sheets/calendar.md M-004 (A-001, A-005): under touch the cell's
  // hover classes are not emitted at all (`input() !== "touch"` gate), so a
  // hover — sticky on web — leaves no background path; the press still
  // selects and the released style is the selection paint, never the hover
  // paint. The pointer environment's hover is unchanged.
  test("M-004 injected touch: hover leaves no background, press selects; pointer hover unchanged", async () => {
    const touch = await openCal("default", { testInput: "touch" });
    await waitForLayout(touch, "day-2026-08-20");
    const day = dayCellSelector("2026-08-20");
    const button = "role:button[/August 20, 2026/]";

    await touch.hover(day);
    await touch.wait(100);
    expect(touch.viewStyle(button)?.backgroundColor ?? null).toBeNull();

    await touch.press(day);
    await touch.waitUntil(() => callsOf(touch, "onChange").length === 1);
    const afterPress = touch.viewStyle(button)?.backgroundColor ?? null;
    expect(afterPress).not.toBeNull();

    const pointer = await openCal("default", { testInput: "pointer" });
    await waitForLayout(pointer, "day-2026-08-20");
    await pointer.hover(day);
    await pointer.wait(100);
    const hoverBg = pointer.viewStyle(button)?.backgroundColor ?? null;
    expect(hoverBg).not.toBeNull();
    // Whatever remains after the touch press is the selection paint — never
    // the hover background the pointer environment resolves.
    expect(afterPress).not.toBe(hoverBg);
  }, 120_000);
});
