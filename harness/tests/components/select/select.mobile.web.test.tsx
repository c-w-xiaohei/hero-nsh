import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target half of the Select mobile unit: the rows that need `app.hover`
 * (desktop/web-only — ios/android reject it). See select.mobile.test.tsx
 * for the shared halves and the fixture contract; `platform:"web"` keeps
 * the original windows-pin baseline shape while `input:"pointer"` +
 * `width:"regular"` inject the desktop-parity environment the same way the
 * shared file does.
 */

function openSelect(
  caseName: string,
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../select.fixtures.tsx", {
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

describe("select mobile (web)", () => {
  // adapt-sheets/select.md M-015 (A-009): injected touch — the JS hover
  // state never engages: the `hov` marker never renders, no `hover` record
  // appears, while the raw `enter`/`leave` mouse callbacks still forward.
  // Under pointer the same steps set and clear the flag as before.
  test("M-015 touch suppresses the JS hover state; pointer keeps it", async () => {
    const touch = await openSelect("states", {
      input: "touch",
      width: "compact",
      hover: "1",
    });
    await touch.hover("id:select-trigger");
    expect(touch.shows("text:hov")).toBe(false);
    await touch.hover("id:ctx-sample");
    await touch.press("id:select-trigger");
    expect(touch.shows("text:hov")).toBe(false);
    const touchHover = callsOf(touch, "hover").map((c) => c[0]);
    expect(touchHover).toContain("enter");
    expect(touchHover).toContain("leave");
    expect(touchHover).not.toContain("start");
    expect(touchHover).not.toContain("end");

    const pointer = await openSelect("states", { hover: "1" });
    await pointer.hover("id:select-trigger");
    expect(pointer.shows("text:hov")).toBe(true);
    const pointerHover = callsOf(pointer, "hover").map((c) => c[0]);
    expect(pointerHover).toContain("enter");
    expect(pointerHover).toContain("start");
    await pointer.hover("id:ctx-sample");
    expect(pointer.shows("text:hov")).toBe(false);
    expect(callsOf(pointer, "hover").map((c) => c[0])).toContain("leave");
  });
});
