import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target half of the combo-box mobile unit: the rows that need
 * `platform:"web"`, `app.hover`/`spanStyle`, or Tab focus traversal (all
 * desktop/web-only — ios/android reject them). See
 * combo-box.mobile.test.tsx for the shared halves and the fixture
 * contract; `platform:"web"` keeps the original windows-pin baseline shape
 * while `input:"pointer"` + `width:"regular"` inject the desktop-parity
 * environment the same way the shared file does.
 */

type Params = Record<string, string>;

function openCombo(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../combo-box.fixtures.tsx", {
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

describe("combo-box mobile (web)", () => {
  // adapt-sheets/combo-box.md M-011 (A-005, A-008), the web half: hover
  // residue — on web a press leaves the sticky hover painting; the `input`
  // axis keeps `hover:text-field-foreground` out of the touch cell, so the
  // trigger text keeps the placeholder colour throughout. `spanStyle` reads
  // the resolved colour (the class itself is unobservable) and `platform:"web"`
  // is what makes the sticky-hover hazard real.
  test("M-011 web half: hover paints on pointer, a touch press leaves no residue", async () => {
    const webPointer = await openCombo("b-mobile", {});
    const webTouch = await openCombo("b-mobile", { input: "touch" });
    const selector = "id:combo-box-trigger >> text:seam-idle";

    const pointerIdle = webPointer.spanStyle(selector).color;
    await webPointer.hover("id:combo-box-trigger");
    await webPointer.clock!.runFor(50);
    const pointerHovered = webPointer.spanStyle(selector).color;
    expect(pointerHovered).not.toBe(pointerIdle);
    await webPointer.press("id:combo-box-trigger");
    await webPointer.clock!.runFor(80);
    expect(webPointer.spanStyle(selector).color).toBe(pointerHovered);

    const touchIdle = webTouch.spanStyle(selector).color;
    await webTouch.hover("id:combo-box-trigger");
    await webTouch.clock!.runFor(50);
    const touchHovered = webTouch.spanStyle(selector).color;
    await webTouch.press("id:combo-box-trigger");
    await webTouch.clock!.runFor(80);
    expect(webTouch.spanStyle(selector).color).toBe(touchIdle);
    expect(webTouch.spanStyle(selector).color).toBe(touchHovered);
    expect(touchIdle).toBe(pointerIdle);
  });

  // adapt-sheets/combo-box.md M-010 (A-006), the letter half: the caller
  // `Input`'s keyboard parameters mounted, the type → filter chain is
  // unaffected. This local Web case retains the original letter filter;
  // the shared native case checks the full chain with digit-named options
  // and numeric input compatible with the requested phone-pad keyboard.
  test("M-010 web half: the type → filter chain is unaffected by the Input keyboard params", async () => {
    const app = await openCombo("b-mobile", {
      kt: "phone-pad",
      rtk: "search",
      ekh: "search",
      im: "tel",
      mask: "1",
      acorr: "off",
      acap: "none",
      sb: "blurAndSubmit",
      ac: "email",
    });

    await app.press("id:combo-box-trigger");
    await app.waitFor("role:listbox");
    await app.type("id:combo-box-input", "do");
    await app.clock!.runFor(80);

    expect(app.shows("role:option[Dog]")).toBe(true);
    expect(app.shows("role:option[Cat]")).toBe(false);
    expect(app.value("id:combo-box-input")).toBe("do");
  });

  // adapt-sheets/combo-box.md M-014 (基线), the blur-Tab half: Tab moves
  // focus to the sibling input, which commits the highlighted key and hands
  // the list off — the row's own guard. `keyboard.press("tab")` moving real
  // focus is a focus-capable-host channel ios/android lack, so the chunk
  // lives here while the rest of the M-014 sample stays in the shared file.
  test("M-014 web half: Tab blur commits the highlighted key and hands the list off", async () => {
    const handoff = await openCombo("tab-handoff", {});
    await handoff.press("id:first-input");
    await handoff.waitFor("role:listbox");
    await handoff.clock!.runFor(60);
    await handoff.keyboard.press("arrowdown");
    await handoff.clock!.runFor(50);
    await handoff.keyboard.press("tab");
    await handoff.clock!.runFor(150);
    expect(callsOf(handoff, "firstInputBlur")).toHaveLength(1);
    expect(callsOf(handoff, "secondInputFocus")).toHaveLength(1);
    expect(handoff.value("id:first-input")).toBe("Cat");
    expect(handoff.count("role:listbox")).toBe(1);
  });
});
