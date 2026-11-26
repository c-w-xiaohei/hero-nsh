import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target half of the list-box mobile unit: the rows that need
 * `app.hover` (desktop/web-only — ios/android reject it). See
 * list-box.mobile.test.tsx for the shared halves and the fixture contract.
 *
 * `platform:"web"` keeps the original windows-pin baseline shape; the
 * pointer environment is injected through `scope:"pointer"` the same way
 * the shared file does, so touch rows compose identically.
 */

function openListBox(
  caseName: string,
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../list-box.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, scope: "pointer", ...params } },
  });
}

const ROW_ALPHA = "role:option[Alpha]";

describe("list-box mobile (web)", () => {
  // adapt-sheets/list-box.md M-005 (A-005): under injected touch the hover
  // writes stay off — `app.hover` records neither `onHoverStart`/
  // `onHoverEnd`/`onHoverChange` nor the render-prop `hov` marker (web's
  // sticky hover cannot pin it), and a following press still selects. The
  // host's `onMouseEnter`/`onMouseLeave` callbacks pass through in both
  // environments; the pointer half keeps the full hover roundtrip.
  test("M-005 injected touch suppresses hover state; pointer keeps the roundtrip", async () => {
    const touch = await openListBox("b-item", {
      scope: "touch",
      hover: "1",
    });
    await touch.hover(ROW_ALPHA);
    await touch.wait(300);
    expect(callsOf(touch, "hover").some((c) => c[0] === "start")).toBe(false);
    expect(
      callsOf(touch, "hover").some(
        (c) => (c[0] as { kind?: string }).kind === "change",
      ),
    ).toBe(false);
    expect(touch.texts().some((t) => t.includes("hov"))).toBe(false);
    // The host callbacks themselves are not gated.
    expect(callsOf(touch, "hover").some((c) => c[0] === "enter")).toBe(true);

    // A press after the synthetic hover still selects — no sticky state.
    await touch.press(ROW_ALPHA);
    await touch.waitUntil(() => callsOf(touch, "selectionChange").length === 1);
    expect(touch.texts().some((t) => t.includes("hov"))).toBe(false);

    const pointer = await openListBox("b-item", { hover: "1" });
    await pointer.hover(ROW_ALPHA);
    await pointer.waitUntil(() =>
      callsOf(pointer, "hover").some((c) => c[0] === "start"),
    );
    expect(callsOf(pointer, "hover")).toContainEqual(["enter"]);
    expect(
      callsOf(pointer, "hover").some(
        (c) =>
          (c[0] as { kind?: string; value?: boolean }).kind === "change" &&
          (c[0] as { value?: boolean }).value === true,
      ),
    ).toBe(true);
    await pointer.waitUntil(() =>
      pointer.texts().some((t) => t.includes("hov")),
    );

    // Leaving restores the rest state.
    await pointer.hover("id:ctx-sample");
    await pointer.waitUntil(() =>
      callsOf(pointer, "hover").some((c) => c[0] === "end"),
    );
    expect(callsOf(pointer, "hover")).toContainEqual(["leave"]);
    expect(
      callsOf(pointer, "hover").some(
        (c) =>
          (c[0] as { kind?: string; value?: boolean }).kind === "change" &&
          (c[0] as { value?: boolean }).value === false,
      ),
    ).toBe(true);
    await pointer.waitUntil(
      () => !pointer.texts().some((t) => t.includes("hov")),
    );
  }, 120_000);
});
