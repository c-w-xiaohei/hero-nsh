import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target halves of the slider mobile rows that need a pointer host
 * step (adapt-sheets/slider.md §4): M-006's hover suppression / roundtrip,
 * M-011's inert seam across tap, drag and hover, and M-008's keyboard
 * half. `app.hover` is desktop/web only (a phone has no mouse) and
 * `platform:"web"` is the one host where Tab moves focus to the thumb —
 * both illegal or undeliverable on the native targets, so these tests
 * live here for the local web iteration; the shared
 * `slider.mobile.test.tsx` keeps the rest.
 *
 * The fixture is `harness/slider.fixtures.tsx`; `scope` mounts the
 * `EnvironmentScope` the assertions inject ("touch" / "pointer"), exactly
 * as on the shared file. Probes: `ctx-env` (probe=1), the hover trio,
 * `onChange`/`onChangeEnd`, `onFocus`/`onBlur`, the `Hovered` marker.
 */

type CtxEnv = {
  part: "track" | "thumb";
  enabled: boolean | null;
  hitSlop: { top?: number; right?: number; bottom?: number; left?: number } | null;
  bounds: { width: number; height: number } | null;
  isPressed: boolean | null;
  pressOrigin: unknown;
  scale: number | null;
  panKeys: number | null;
  panActive: boolean | null;
};

function openSlider(
  caseName: string,
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../slider.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

function ctxEnvAll(app: App, part: "track" | "thumb"): CtxEnv[] {
  return callsOf(app, "ctx-env")
    .map((args) => args[0] as CtxEnv)
    .filter((record) => record.part === part);
}

/**
 * Waits until both parts' `CtxProbe`s have reported at least once with a
 * laid-out bounds — the hitSlop/bounds assertions read the last record,
 * which is only meaningful after `onLayout` fed `feedback.layout`.
 */
async function waitForSeams(app: App): Promise<void> {
  await app.waitUntil(() =>
    (["track", "thumb"] as const).every((part) =>
      ctxEnvAll(app, part).some(
        (record) => record.bounds !== null && record.bounds.width > 0,
      ),
    ),
  );
}

describe("slider mobile (web)", () => {
  // adapt-sheets/slider.md M-006 (A-005, A-006): under touch the hover
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
    expect(touch.count("text:Hovered")).toBe(0);

    // A tap afterwards leaves no sticky hover either (the web sticky-hover
    // failure the gate exists for).
    await touch.drag("id:track", { x: 0, y: 0 });
    await touch.hover("id:track");
    await touch.wait(200);
    expect(callsOf(touch, "trackHoverStart")).toHaveLength(0);
    expect(touch.count("text:Hovered")).toBe(0);

    const pointer = await openSlider("mobile", { scope: "pointer" });
    await pointer.hover("id:track");
    await pointer.waitUntil(() => callsOf(pointer, "trackHoverStart").length >= 1);

    expect(callsOf(pointer, "trackHoverChange").length).toBeGreaterThanOrEqual(1);
    expect(pointer.count("text:Hovered")).toBe(1);

    await pointer.hover("id:thumb");
    await pointer.waitUntil(() => callsOf(pointer, "thumbHoverStart").length >= 1);
    // The thumb sits inside the track's bounds, so hovering it does not
    // end the track's hover — only leaving to the Output does.

    await pointer.hover("id:output");
    await pointer.waitUntil(() => callsOf(pointer, "thumbHoverEnd").length >= 1);
    expect(callsOf(pointer, "trackHoverEnd").length).toBeGreaterThanOrEqual(1);
    expect(pointer.count("text:Hovered")).toBe(0);
  });

  // adapt-sheets/slider.md M-008 (基线, keyboard half): `platform:"web"`
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

  // adapt-sheets/slider.md M-011 (A-001, A-002, 负断言): under the default
  // pointer environment the feedback seam is physically inert —
  // `hitSlop()` answers undefined, `isPressed`/`pressOrigin` never leave
  // rest and `scale` stays 1 across tap, drag and hover — while the gesture
  // semantics keep working (the M-008 half of the same evidence chain).
  test("M-011 default pointer environment: the feedback seam stays inert across tap, drag and hover", async () => {
    const app = await openSlider("mobile", { scope: "pointer", probe: "1" });
    await waitForSeams(app);

    // Tap (zero-drag), real drag and hover — the three paths a press
    // feedback seam could observe.
    await app.drag("id:track", { x: 0, y: 0 });
    await app.drag("id:thumb", { x: 60, y: 0 });
    await app.hover("id:track");
    await app.wait(200);

    for (const part of ["thumb", "track"] as const) {
      const records = ctxEnvAll(app, part);
      expect(records.length).toBeGreaterThan(0);
      for (const record of records) {
        expect(record.enabled).toBe(false);
        expect(record.hitSlop).toBeNull();
        expect(record.isPressed ?? false).toBe(false);
        expect(record.pressOrigin ?? null).toBeNull();
        expect(record.scale ?? 1).toBe(1);
      }
    }

    // The gestures themselves committed normally — the seam's silence is
    // not a dead slider.
    expect(callsOf(app, "onChangeEnd").length).toBeGreaterThanOrEqual(2);
  });
});
