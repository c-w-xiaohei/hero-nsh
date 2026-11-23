import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target halves of the color-slider mobile rows that need a pointer
 * host step (adapt-sheets/color-slider.md §4): M-006's hover suppression /
 * roundtrip, M-011's inert seam across tap, drag and hover, and M-008's
 * keyboard half. `app.hover` is desktop/web only (a phone has no mouse)
 * and `platform:"web"` is the one host where Tab moves focus to the thumb
 * — both illegal or undeliverable on the native targets, so these tests
 * live here for the local web iteration; the shared
 * `color-slider.mobile.test.tsx` keeps the rest.
 *
 * The fixture is `harness/color-slider.fixtures.tsx`; `scope` mounts the
 * `EnvironmentScope` the assertions inject ("touch" / "pointer"), exactly
 * as on the shared file. Probes: `ctx-env` / `ctx-seams` (probe=1), the
 * hover trio, `onChange`/`onChangeEnd`, `onFocus`/`onBlur`.
 */

type CtxEnv = {
  id: string;
  enabled: boolean;
  hitSlop: { top: number; right: number; bottom: number; left: number } | null;
  bounds: { width: number; height: number };
  isPressed: boolean;
  pressOrigin: { x: number; y: number } | null;
  panKeys: number;
  panActive: boolean;
};

type CtxSeams = {
  id: string;
  pressed: number;
  scale: number;
  highlight: number;
  ripple: number;
};

function openSlider(
  caseName: string,
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../color-slider.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

function ctxEnvAll(app: App, id: string): CtxEnv[] {
  return callsOf(app, "ctx-env")
    .map((args) => args[0] as CtxEnv)
    .filter((record) => record.id === id);
}

function lastCtxSeams(app: App, id: string): CtxSeams {
  const records = callsOf(app, "ctx-seams")
    .map((args) => args[0] as CtxSeams)
    .filter((record) => record.id === id);
  const last = records.at(-1);

  if (!last) throw new Error(`ctx-seams reported nothing for ${id}`);

  return last;
}

describe("color-slider mobile (web)", () => {
  // adapt-sheets/color-slider.md M-006 (A-005): under touch the hover
  // signal stays off entirely — `app.hover` produces no hover probe and no
  // `Hovered` marker, and a tap leaves nothing pinned — while the default
  // environment keeps the full enter/leave roundtrip.
  test("M-006 touch suppresses hover state and callbacks; pointer keeps the roundtrip", async () => {
    const touch = await openSlider("mobile", { scope: "touch" });

    await touch.hover("id:track");
    await touch.hover("id:thumb");
    await touch.wait(200);

    expect(callsOf(touch, "trackHoverStart")).toHaveLength(0);
    expect(callsOf(touch, "trackHoverChange")).toHaveLength(0);
    expect(callsOf(touch, "trackHoverEnd")).toHaveLength(0);
    expect(callsOf(touch, "thumbHoverStart")).toHaveLength(0);
    expect(callsOf(touch, "thumbHoverChange")).toHaveLength(0);
    expect(callsOf(touch, "thumbHoverEnd")).toHaveLength(0);
    expect(touch.texts().some((text) => text.includes("Hovered"))).toBe(false);

    // A tap afterwards leaves no sticky hover either (the web sticky-hover
    // failure the gate exists for).
    await touch.drag("id:track", { x: 0, y: 0 });
    await touch.hover("id:track");
    await touch.wait(200);
    expect(callsOf(touch, "trackHoverStart")).toHaveLength(0);
    expect(touch.texts().some((text) => text.includes("Hovered"))).toBe(false);

    const pointer = await openSlider("mobile", { scope: "pointer" });
    await pointer.hover("id:track");
    await pointer.wait(200);

    expect(callsOf(pointer, "trackHoverStart").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(pointer, "trackHoverChange").length).toBeGreaterThanOrEqual(1);
    expect(pointer.texts()).toContain("TrackHovered");

    await pointer.hover("id:thumb");
    await pointer.wait(200);
    expect(callsOf(pointer, "thumbHoverStart").length).toBeGreaterThanOrEqual(1);
    expect(pointer.texts()).toContain("ThumbHovered");

    await pointer.hover("id:output");
    await pointer.wait(200);
    expect(callsOf(pointer, "trackHoverEnd").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(pointer, "thumbHoverEnd").length).toBeGreaterThanOrEqual(1);
    expect(pointer.texts()).toContain("TrackIdle");
    expect(pointer.texts()).toContain("ThumbIdle");
  });

  // adapt-sheets/color-slider.md M-008 (基线, keyboard half): `platform:"web"`
  // is the focus-capable host (a real Windows window gives keyboard focus
  // only to Inputs — the registered host split): Tab lands `onFocus`, and
  // each key commits exactly one `onChangeEnd`.
  test("M-008 keyboard half: Tab focuses the thumb and each key commits one onChangeEnd", async () => {
    const kb = await openSlider("keyboard", { scope: "pointer" });
    await kb.keyboard.press("tab");
    expect(callsOf(kb, "onFocus")).toHaveLength(1);

    for (const key of ["arrowright", "shift+arrowright", "pageup", "home"]) {
      const before = callsOf(kb, "onChangeEnd").length;
      await kb.keyboard.press(key);
      await kb.wait(20);
      expect(callsOf(kb, "onChangeEnd").length).toBe(before + 1);
    }
    expect(callsOf(kb, "onChange").length).toBeGreaterThan(0);
  });

  // adapt-sheets/color-slider.md M-011 (A-001, A-002, 负断言): under the
  // default pointer environment the feedback seam is physically inert —
  // `hitSlop()` answers undefined, `isPressed`/`pressOrigin` never leave
  // rest across tap, drag and hover, and the animated channels sample at
  // their rest values — while the gesture semantics keep working (the
  // M-008 half of the same evidence chain).
  test("M-011 default pointer environment: the feedback seam stays inert across tap, drag and hover", async () => {
    const app = await openSlider("mobile", { scope: "pointer", probe: "1" });
    await app.waitUntil(() => callsOf(app, "ctx-env").length >= 2);

    // Tap (zero-drag), real drag and hover — the three paths a press
    // feedback seam could observe.
    await app.drag("id:track", { x: 0, y: 0 });
    await app.drag("id:thumb", { x: 60, y: 0 });
    await app.hover("id:track");
    await app.wait(200);

    for (const id of ["thumb", "track"] as const) {
      const records = ctxEnvAll(app, id);
      expect(records.length).toBeGreaterThan(0);
      for (const record of records) {
        expect(record.enabled).toBe(false);
        expect(record.hitSlop).toBeNull();
        expect(record.isPressed).toBe(false);
        expect(record.pressOrigin).toBeNull();
      }
    }

    await app.press("id:sample-seams");
    await app.waitUntil(() => callsOf(app, "ctx-seams").length >= 2);

    for (const id of ["thumb", "track"] as const) {
      const channels = lastCtxSeams(app, id);
      expect(channels.pressed).toBe(0);
      expect(channels.scale).toBe(1);
      expect(channels.highlight).toBe(0);
      expect(channels.ripple).toBe(0);
    }

    // The gestures themselves committed normally — the seam's silence is
    // not a dead slider.
    expect(callsOf(app, "onChangeEnd").length).toBeGreaterThanOrEqual(2);
  });
});
