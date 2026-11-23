import { describe, expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target half of color-picker M-009's callback chain (adapt-sheets/
 * color-picker.md §4): the Trigger's forwarded `onHoverStart` /
 * `onHoverEnd` pair. `app.hover` is desktop/web only — a phone has no
 * mouse — so this segment cannot live in the shared
 * `color-picker.mobile.test.tsx`; `platform:"web"` plays the pointer host
 * here (a desktop headless open would do as well, web keeps the local
 * iteration target).
 *
 * The assertions are the moved rows verbatim: under the default
 * environment hovering the trigger records `hoverStart`, hovering the
 * `away` station records `hoverEnd`, through the same `hoverStart` /
 * `hoverEnd` probes the shared file names. The pointer injection pins the
 * desktop-parity environment explicitly.
 */

const TRIGGER = "role:button[Pick a color]";

describe("color-picker mobile (web)", () => {
  // adapt-sheets/color-picker.md M-009 (基线, hover half): hover fires
  // under pointer through the forwarded `onMouseEnter` / `onMouseLeave`
  // chain — `hoverStart` on enter, `hoverEnd` on leave.
  test("M-009 hover: the trigger's forwarded hover callbacks fire under pointer", async () => {
    const app = await open("../../../color-picker.fixtures.tsx", {
      platform: "web",
      width: 1024,
      height: 768,
      host: { params: { case: "with-swatches", input: "pointer" } },
    });

    await app.hover(TRIGGER);
    expect(callsOf(app, "hoverStart").length).toBeGreaterThanOrEqual(1);
    await app.hover("id:away");
    expect(callsOf(app, "hoverEnd").length).toBeGreaterThanOrEqual(1);
  });
});
