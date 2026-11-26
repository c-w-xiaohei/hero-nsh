import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target half of the dropdown mobile unit: the rows that need
 * `app.hover`/`app.rightClick` (desktop/web-only — ios/android reject
 * both). See dropdown.mobile.test.tsx for the shared halves and the
 * fixture contract; `platform:"web"` keeps the original windows-pin
 * baseline shape while `input:"pointer"` + `width:"regular"` inject the
 * desktop-parity environment the same way the shared file does.
 */

type Params = Record<string, string>;

function openMobile(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../dropdown.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    clock: {},
    host: {
      params: {
        case: caseName,
        input: "pointer",
        width: "regular",
        ...params,
      },
    },
  });
}

/** The `events` probe payloads as `{ev, seam}` records. */
function eventsOf(app: App) {
  return callsOf(app, "events").map(
    (args) => args[0] as { ev: string; seam: boolean | null },
  );
}

describe("dropdown mobile (web)", () => {
  // adapt-sheets/dropdown.md M-013 (A-007): injected touch silences the
  // hover chain — `isHovered` never paints, `hoverStart`/`hoverOn` never
  // fire — while the raw `mouseEnter`/`mouseLeave` callbacks still forward.
  // Under pointer the same sequence reports the hover round-trip.
  test("M-013 injected touch silences JS hover state, pointer keeps it", async () => {
    const touch = await openMobile("mobile", { input: "touch" });
    await touch.hover("id:dd-trigger");
    await touch.press("id:dd-trigger");

    expect(touch.shows("text:trigger-hovered")).toBe(false);
    expect(touch.shows("text:trigger-idle")).toBe(true);
    const touchEvents = eventsOf(touch).map((entry) => entry.ev);
    expect(touchEvents).not.toContain("hoverStart");
    expect(touchEvents).not.toContain("hoverOn");
    expect(touchEvents).toContain("mouseEnter");

    const pointer = await openMobile("mobile");
    await pointer.hover("id:dd-trigger");
    expect(pointer.shows("text:trigger-hovered")).toBe(true);
    // Leave toward `dd-outside`, the fixture's off-trigger surface: the
    // hover ends and the idle text comes back.
    await pointer.hover("id:dd-outside");
    expect(pointer.shows("text:trigger-hovered")).toBe(false);
    expect(pointer.shows("text:trigger-idle")).toBe(true);
    const pointerEvents = eventsOf(pointer).map((entry) => entry.ev);
    expect(pointerEvents).toContain("hoverStart");
    expect(pointerEvents).toContain("mouseEnter");
    expect(pointerEvents).toContain("mouseLeave");
    expect(pointerEvents).toContain("hoverEnd");
    expect(pointerEvents).toContain("hoverOff");
  });

  // adapt-sheets/dropdown.md M-015 (A-008, A-014, 基线), the
  // `app.rightClick` half: the `contextMenu` trigger still opens from the
  // secondary button — ios/android have no secondary-button channel, so
  // this half of the baseline sample lives here while the press/Escape/
  // non-modal halves stay in the shared file.
  test("M-015 web half: contextMenu trigger opens from the secondary button", async () => {
    const contextMenu = await openMobile("context-menu");
    await contextMenu.rightClick("id:dd-trigger");
    expect(callsOf(contextMenu, "contextMenu")).toHaveLength(1);
    expect(contextMenu.shows("role:menu")).toBe(true);
    await contextMenu.keyboard.press("escape");
    await contextMenu.clock!.runFor(150);
    expect(contextMenu.shows("role:menu")).toBe(false);
  });
});
