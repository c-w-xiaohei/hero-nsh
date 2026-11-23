import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target halves of the color-swatch-picker mobile rows that need a
 * pointer host step (adapt-sheets/color-swatch-picker.md §4): M-004's
 * hover suppression / roundtrip (`app.hover` is desktop/web only — a
 * phone has no mouse) and M-005's keyboard half (`platform:"web"` is the
 * one host where Tab moves view focus). The shared
 * `color-swatch-picker.mobile.test.tsx` keeps the rest.
 *
 * The fixture is `harness/color-swatch-picker.fixtures.tsx`; `input`
 * mounts the `EnvironmentScope` the assertions inject ("touch" /
 * "pointer"), exactly as on the shared file.
 */

type Params = Record<string, string>;

function openPicker(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../color-swatch-picker.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

function onChangeHexes(app: App): string[] {
  return callsOf(app, "onChange").map((c) => (c[0] as { hex: string }).hex);
}

describe("color-swatch-picker mobile (web)", () => {
  // adapt-sheets/color-swatch-picker.md M-004 (A-002): injected touch —
  // `app.hover`/`app.press` leave `isHovered` at Idle and no hover callback
  // fires (web's sticky hover suppressed), while the raw host
  // `onMouseEnter`/`onMouseLeave` callbacks still pass on both sides. The
  // default environment's hover round-trips.
  test("M-004 injected touch suppresses hover state and callbacks; default environment keeps it", async () => {
    const touch = await openPicker("hover", { input: "touch" });
    expect(touch.shows("text:Idle")).toBe(true);

    await touch.hover("id:hv-item-0");
    expect(touch.shows("text:Hovered")).toBe(false);
    expect(touch.shows("text:Idle")).toBe(true);

    // The host `onMouseEnter`/`onMouseLeave` callbacks still pass under
    // touch (the A-002 ruling) — only the component's hover channel is
    // gated. Hovering away must fire `mouse-leave` while `hover-end`
    // stays silent.
    expect(callsOf(touch, "onMouseEnter").length).toBeGreaterThan(0);
    expect(callsOf(touch, "onHoverStart")).toHaveLength(0);

    await touch.hover("id:away");
    expect(callsOf(touch, "onMouseLeave").length).toBeGreaterThan(0);
    expect(callsOf(touch, "onHoverEnd")).toHaveLength(0);

    await touch.press("id:hv-item-0");
    await touch.waitUntil(() => callsOf(touch, "onChange").length === 1);
    expect(touch.shows("text:Hovered")).toBe(false);
    expect(callsOf(touch, "onHoverStart")).toHaveLength(0);
    expect(callsOf(touch, "onHoverChange")).toHaveLength(0);

    const pointer = await openPicker("hover", { input: "pointer" });
    await pointer.hover("id:hv-item-0");
    expect(pointer.shows("text:Hovered")).toBe(true);
    expect(callsOf(pointer, "onHoverStart")).toHaveLength(1);
    expect(callsOf(pointer, "onHoverChange")).toEqual([[true]]);
    // The host mouse callbacks pass on the pointer side too.
    expect(callsOf(pointer, "onMouseEnter").length).toBeGreaterThan(0);

    await pointer.hover("id:away");
    await pointer.waitFor("text:Idle");
    expect(callsOf(pointer, "onHoverEnd")).toHaveLength(1);
    expect(callsOf(pointer, "onHoverChange")).toEqual([[true], [false]]);
    expect(callsOf(pointer, "onMouseLeave")).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/color-swatch-picker.md M-005 (A-004, 基线, keyboard half):
  // the root's key bindings are input-independent — on the web host (the
  // one that moves view focus with Tab) arrows, Home/End and typeahead run
  // the same selection under touch as under pointer.
  test("M-005 keyboard navigation is identical under touch and pointer (web host)", async () => {
    for (const params of [{ input: "pointer" }, { input: "touch" }] as Params[]) {
      const app = await open("../../../color-swatch-picker.fixtures.tsx", {
        platform: "web",
        host: { params: { case: "select", ...params } },
      });

      await app.keyboard.press("tab");
      // The picker's selectable list is vertical-only, so Down/Up are the
      // navigation keys (RAC listbox semantics; Left/Right are inert).
      await app.keyboard.press("arrowdown");
      await app.keyboard.press("enter");
      await app.waitUntil(() => callsOf(app, "onChange").length === 1);
      expect(onChangeHexes(app)).toEqual(["#22c55e"]);

      await app.keyboard.press("arrowdown");
      await app.keyboard.press("space");
      await app.waitUntil(() => callsOf(app, "onChange").length === 2);
      expect(onChangeHexes(app)).toEqual(["#22c55e", "#3b82f6"]);

      await app.keyboard.press("home");
      await app.keyboard.press("enter");
      await app.waitUntil(() => callsOf(app, "onChange").length === 3);
      expect(onChangeHexes(app)).toEqual(["#22c55e", "#3b82f6", "#ef4444"]);

      // Typeahead moves the focused key without selecting on its own: the
      // options' accessible names are the colors' English names, and "v"
      // matches the third option's name but not the middle one's, so from
      // Home's first option it lands two keys ahead — Enter then selects
      // #3b82f6. A broken typeahead leaves focus on the first option and
      // selects #ef4444 instead, so the hex itself is the assertion.
      await app.keyboard.press("home");
      await app.keyboard.press("v");
      await app.keyboard.press("enter");
      await app.waitUntil(() => callsOf(app, "onChange").length === 4);
      expect(onChangeHexes(app)).toEqual([
        "#22c55e",
        "#3b82f6",
        "#ef4444",
        "#3b82f6",
      ]);
    }
  }, 120_000);
});
