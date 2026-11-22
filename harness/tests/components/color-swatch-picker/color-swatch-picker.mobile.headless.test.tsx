import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the color-swatch-picker adapt unit —
 * the rows of adapt-sheets/color-swatch-picker.md §4 that need steps only
 * the headless engine provides:
 *
 *   M-003 (held half)  `dragAndHold` keeps the finger down while the
 *                      `ctx-state` sampler reads the settled channels
 *                      (`pressed`, `scale`, `seamPressed`) mid-hold; `drop`
 *                      releases through the same `onPressUp` path.
 *   M-007              `open({platform:"ios"})` host derivation — no
 *                      `EnvironmentScope`, the platform reports
 *                      `input()==="touch"` (`platform` accepts ios/android
 *                      only on headless; `--target web` rejects it with
 *                      ERR_NSH_TEST_UNSUPPORTED, which is why this row
 *                      lives in a `.headless.` file).
 */

type Params = Record<string, string>;

function openPicker(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../color-swatch-picker.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type PressedEdge = { seam: boolean; active: boolean };

type CtxState = {
  seamPressed: boolean;
  active: boolean;
  pressed: number;
  scale: number;
  highlight: number;
  ripple: number;
  origin: { x: number; y: number } | null;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  enabled: boolean;
};

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
};

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function lastOf<T>(app: App, name: string): T {
  const list = callsOf(app, name);
  return list[list.length - 1][0] as T;
}

function edges(app: App): PressedEdge[] {
  return callsOf(app, "ctx-pressed").map((c) => c[0] as PressedEdge);
}

function layouts(app: App, name: string): LayoutEntry[] {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((l) => l.name === name);
}

function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.seamPressed === true);
}

describe("color-swatch-picker mobile (headless)", () => {
  // adapt-sheets/color-swatch-picker.md M-003 (A-003, held half):
  // `dragAndHold` keeps the press down past the sampler's delays, so
  // `ctx-state` records `seamPressed: true` with `pressed` at its 1 end and
  // `scale` below 1; `drop` releases through the same `onPressUp` path and
  // every channel settles back to rest.
  test("M-003 held press: seam channels engage mid-hold and reset on release", async () => {
    const app = await openPicker("ctx-probe", { input: "touch" });

    await app.dragAndHold("id:ctx-item-0", { x: 0, y: 0 });
    await app.waitUntil(() => edges(app).some((e) => e.seam));
    await app.waitUntil(() => heldSamples(app).length >= 1);

    const held = heldSamples(app).at(-1)!;
    expect(held.seamPressed).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.9);
    expect(held.scale).toBeLessThan(1);
    expect(held.enabled).toBe(true);
    expect(held.origin).not.toBeNull();

    await app.drop();
    await app.waitUntil(() => {
      const last = edges(app).at(-1);
      return last !== undefined && last.seam === false;
    });

    // The release path settles: a later sample shows the seam at rest.
    await app.waitUntil(() => {
      const last = callsOf(app, "ctx-state").at(-1)?.[0] as
        | CtxState
        | undefined;
      return last !== undefined && !last.seamPressed && last.scale === 1;
    });
    const settled = callsOf(app, "ctx-state").at(-1)?.[0] as CtxState;
    expect(settled.seamPressed).toBe(false);
    expect(settled.pressed).toBeLessThan(0.5);
    expect(settled.scale).toBe(1);
  }, 120_000);

  // adapt-sheets/color-swatch-picker.md M-007 (A-001, A-003): `platform:"ios"`
  // with no EnvironmentScope — the host derives `input()==="touch"`, so the
  // 44pt item minimum applies, the seam's `enabled` gate opens, and a press
  // completes the full `isPressed` roundtrip while `onChange` selects the
  // first preset.
  test("M-007 ios host derivation: touch minimum, seam roundtrip and selection without a scope", async () => {
    const app = await openPicker(
      "ctx-probe",
      {},
      { platform: "ios", width: 390, height: 844 },
    );

    const env = lastOf<CtxEnv>(app, "ctx-env");
    expect(env.enabled).toBe(true);

    const mobile = await openPicker(
      "mobile",
      {},
      { platform: "ios", width: 390, height: 844 },
    );
    for (const size of ["xs", "sm", "md"]) {
      await mobile.waitUntil(
        () => layouts(mobile, `${size}-box-0`).length > 0,
      );
      const box = layouts(mobile, `${size}-box-0`).at(-1)!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    await app.press("id:ctx-item-0");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(
      callsOf(app, "onChange").map((c) => (c[0] as { hex: string }).hex),
    ).toEqual(["#ef4444"]);

    // Headless surfaces the seam's own edge (no web batching): a real
    // true→false roundtrip on `seam`. The settled `ctx-state` sample carries
    // the same gate the scope flipped — `enabled` true, `seamPressed` back
    // at rest after the release.
    await app.waitUntil(() => edges(app).some((e) => e.seam));
    await app.waitUntil(() => edges(app).at(-1)?.seam === false);
    const list = edges(app);
    expect(list.some((e) => e.seam)).toBe(true);
    expect(list.at(-1)?.seam).toBe(false);

    // The newest `ctx-state` sample must be a settled post-release read —
    // engaged samples from the hold can still be the latest until the
    // deferred timers fire, so wait for the rest state explicitly.
    await app.waitUntil(() => {
      const last = callsOf(app, "ctx-state").at(-1)?.[0] as
        | CtxState
        | undefined;
      return last !== undefined && last.enabled && !last.seamPressed;
    });
    const settled = lastOf<CtxState>(app, "ctx-state");
    expect(settled.enabled).toBe(true);
    expect(settled.seamPressed).toBe(false);
  }, 120_000);
});
