import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { lastFocus } from "../../testers/input-group";

/*
 * Headless mobile assertions for the input-group adapt unit — the halves
 * of adapt-sheets/input-group.md §4 that only exist on the headless
 * engine: `open({ platform: "ios" })` host derivation (`platform.desktop`
 * false → `Environment.input` defaults to `"touch"` without an
 * `EnvironmentScope`; `--target web` rejects a phone `platform`) and the
 * `app.hover` rows a phone has no mouse for — M-002 and M-006's
 * pointer-hover half, moved from `input-group.mobile.test.tsx`.
 *
 * The fixture is `harness/input-group.fixtures.tsx`, `case: "layout"` /
 * `"hover"`, whose Root `onLayout` probe reports the same bounds M-001
 * reads under the injected scope.
 */

type LayoutEntry = { name: string; width: number; height: number };
type FocusRecord = { part: string; focused: boolean };

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

function focusedRecords(app: App): FocusRecord[] {
  return callsOf(app, "focus")
    .map((c) => c[0] as FocusRecord)
    .filter((r) => r.part === "input" && r.focused === true);
}

function blurredRecords(app: App): FocusRecord[] {
  return callsOf(app, "focus")
    .map((c) => c[0] as FocusRecord)
    .filter((r) => r.part === "input" && r.focused === false);
}

function openCase(name: string, params: Record<string, string> = {}): Promise<App> {
  return open("../../../input-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name, ...params } },
  });
}

describe("input-group mobile (headless)", () => {
  // adapt-sheets/input-group.md M-002 (A-003, A-004): under touch neither a
  // hover nor a press (whose sticky web hover is the registered hazard)
  // raises `isHovered` — the render-prop marker stays "idle" and the three
  // hover callbacks record nothing, which is also what keeps
  // `bg-field-hover` / `bg-default-hover` off (they ride the same `hovered`
  // signal; class names are not observable). The press itself still lands:
  // the input's focus probe records. Under pointer the hover round-trips
  // exactly as on desktop.
  test("M-002 injected touch suppresses group and control hover; pointer keeps it", async () => {
    const touch = await openCase("hover", { testInput: "touch" });
    expect(touch.shows("text:idle")).toBe(true);

    await touch.hover("id:ig-prefix");
    await touch.press("id:ig-prefix");
    await touch.waitUntil(() => focusedRecords(touch).length > 0);

    expect(touch.shows("text:hovered")).toBe(false);
    expect(touch.shows("text:idle")).toBe(true);
    expect(callsOf(touch, "onHoverStart")).toHaveLength(0);
    expect(callsOf(touch, "onHoverEnd")).toHaveLength(0);
    expect(callsOf(touch, "onHoverChange")).toHaveLength(0);

    const pointer = await openCase("hover", { testInput: "pointer" });
    // No pre-hover "idle" assertion here: the mouse can still sit over the
    // group's position from the touch app's press, and a mount-time
    // mouseenter then legitimately reports "hovered" — the probes below
    // hold either way (they record at mount or at `app.hover`).

    await pointer.hover("id:ig-prefix");
    expect(pointer.shows("text:hovered")).toBe(true);
    expect(callsOf(pointer, "onHoverStart").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(pointer, "onHoverChange")).toEqual([[true]]);

    // `label:Amount` names the input (inside the group); the visible Label
    // text is the element outside the group that ends the hover.
    await pointer.hover("text:Amount");
    expect(pointer.shows("text:idle")).toBe(true);
    expect(callsOf(pointer, "onHoverEnd").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(pointer, "onHoverChange")).toEqual([[true], [false]]);
  }, 120_000);

  // adapt-sheets/input-group.md M-006's pointer-hover half (A-011): the
  // `hover` case's own channel under pointer — `app.hover` raises the
  // marker and `onHoverStart` records (the shared file proves the same
  // case on both scopes with the press-focus probe instead).
  test("M-006 pointer: the hover case's hover channel records", async () => {
    const hover = await openCase("hover", { testInput: "pointer" });
    await hover.hover("id:ig-prefix");
    expect(hover.shows("text:hovered")).toBe(true);
    expect(callsOf(hover, "onHoverStart").length).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/input-group.md M-008 (A-001, A-002): an ios host derives
  // `input()==="touch"` on its own — no `EnvironmentScope` — so the `input`
  // axis' `min-h-11` lifts the group row to the 44 pt hit minimum. This is
  // M-001's host-derivation half.
  test("M-008 ios host derivation: the group row gets the touch height without a scope", async () => {
    const app = await open("../../../input-group.fixtures.tsx", {
      platform: "ios",
      width: 390,
      height: 844,
      locale: "en-US",
      host: { params: { case: "layout" } },
    });

    expect(app.shows("label:Amount")).toBe(true);
    await app.waitUntil(() =>
      callsOf(app, "layout").some((c) => (c[0] as LayoutEntry).name === "root"),
    );
    expect(layoutFor(app, "root").height).toBeGreaterThanOrEqual(44);
  }, 120_000);

  // adapt-sheets/input-group.md M-001's exact desktop pin: the shared file
  // bounds the pointer row to `>=36 && <44` because native iOS measures the
  // same line box taller (host font metrics — the 40 vs 36 row there).
  // Headless keeps the exact `min-h-9` → 36 pt contract the desktop lane
  // asserts, so the pin is not lost across targets.
  test("M-001 pointer half: the group row keeps the exact 36pt desktop metric", async () => {
    const app = await openCase("layout", { testInput: "pointer" });
    expect(app.shows("label:Amount")).toBe(true);
    await app.waitUntil(() =>
      callsOf(app, "layout").some((c) => (c[0] as LayoutEntry).name === "root"),
    );
    expect(layoutFor(app, "root").height).toBe(36);
  }, 120_000);

  // adapt-sheets/input-group.md M-003's strict half (A-008): the shared
  // file gates the zero-blur edge behind `hostOs !== "ios"` because the
  // real iOS host's outside-tap resign records a transient blur
  // (native-input-root-cause.md §affix-blur) — and the headless engine
  // reports `platform.os` "ios" too, so the gate alone would drop the
  // edge on the only host class where it is provable. The
  // `platform:"windows"` pin makes this run strictly headless: affix and
  // group presses focus the input, record no blur edge, and never edit.
  test("M-003 (strict half): affix and group presses focus with zero blur edges", async () => {
    for (const params of [{ testInput: "pointer" }, { testInput: "touch" }]) {
      const app = await openCase("default", params);

      await app.press("id:ig-prefix");
      await app.waitUntil(() => focusedRecords(app).length > 0);
      expect(lastFocus(app, "input")).toBe(true);

      await app.press("id:ig-suffix");
      await app.press("id:ig-root");
      expect(lastFocus(app, "input")).toBe(true);
      expect(app.value("label:Amount")).toBe("10");
      // Strict edge: every recorded edge is a focus gain — no press
      // blurred the input.
      expect(blurredRecords(app)).toHaveLength(0);
    }
  }, 120_000);

  // The typed-half of input-group.mobile.test.tsx M-007's disabled row:
  // the shared file drops `app.type` on the non-editable input because on
  // a real iOS host the step kills the tester session outright ("no host
  // that takes test steps is connected") and on a focused sibling it
  // leaks the keys in instead. Headless, where the type step simply
  // refuses a non-editable target, the refusal itself is the assertion.
  test("M-007 (typed half): the disabled input refuses typed keys", async () => {
    const disabled = await openCase("disabled", { testInput: "pointer" });
    expect(disabled.enabled("label:Amount")).toBe(false);
    await disabled.type("label:Amount", "x").catch(() => undefined);
    expect(disabled.value("label:Amount")).toBe("10");
  }, 120_000);
});
