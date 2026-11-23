import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the menu adapt unit — the rows of
 * adapt-sheets/menu.md §4 that need steps only the headless engine
 * provides:
 *
 *   M-004  the held-press half of the seam roundtrip — `dragAndHold` keeps
 *          the press down while the `ctx-*-state` samples read the settled
 *          channels (`pressed`, `scale`, `seamPressed`), and `drop`
 *          releases through the same `onPressUp` path.
 *   M-016  `open({platform:"ios"})` host derivation — no `EnvironmentScope`,
 *          the platform reports `input()==="touch"` (web rejects it, so it
 *          cannot live in the shared file).
 *
 * The shared file `menu.mobile.test.tsx` covers M-001 … M-015 and M-017;
 * the quick-press half of M-004 lives there.
 */

function openMenu(
  caseName: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../menu.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  allDisabled: boolean;
};

type CtxState = {
  seamPressed: boolean;
  pressed: number;
  scale: number;
  highlight: number;
  ripple: number;
  origin: { x: number; y: number } | null;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  allDisabled: boolean;
};

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function layouts(app: App, name: string): LayoutEntry[] {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((l) => l.name === name);
}

function lastLayout(app: App, name: string): LayoutEntry {
  const list = layouts(app, name);
  return list[list.length - 1];
}

function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-a-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.seamPressed === true);
}

describe("menu mobile (headless)", () => {
  // adapt-sheets/menu.md M-004 (A-003): the held-press half — `dragAndHold`
  // keeps the finger down past the seam's sampling delays, so `ctx-a-state`
  // records `seamPressed: true` with `pressed` at its 1 end and `scale`
  // below 1; `drop` releases through the same `onPressUp` path and every
  // channel settles back to rest.
  test("M-004 held press: seam channels engage mid-hold and reset on release", async () => {
    const app = await openMenu("m-seam", { input: "touch" });

    await app.dragAndHold("id:row-a", { x: 0, y: 0 });
    await app.waitUntil(
      () => callsOf(app, "ctx-a-pressed").filter((c) => c[0] === true).length > 0,
    );
    await app.waitUntil(() => heldSamples(app).length >= 1);

    const held = heldSamples(app).at(-1)!;
    expect(held.seamPressed).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.9);
    expect(held.scale).toBeLessThan(1);
    expect(held.origin).not.toBeNull();
    expect(held.enabled).toBe(true);

    await app.drop();
    await app.waitUntil(() => callsOf(app, "ctx-a-pressed").at(-1)?.[0] === false);

    // The release path settles: a later sample shows the seam at rest.
    await app.waitUntil(() => {
      const last = callsOf(app, "ctx-a-state").at(-1)?.[0] as
        | CtxState
        | undefined;
      return last !== undefined && !last.seamPressed && last.scale === 1;
    });
    const settled = callsOf(app, "ctx-a-state").at(-1)?.[0] as CtxState;
    expect(settled.seamPressed).toBe(false);
    expect(settled.pressed).toBeLessThan(0.5);
    expect(settled.scale).toBe(1);
    expect(settled.origin).toBeNull();
  }, 120_000);

  // adapt-sheets/menu.md M-016 (A-001, A-003): `platform:"ios"` with no
  // `EnvironmentScope` — the host derives `input()==="touch"`, so the row's
  // 44 pt minimum applies, the seam's `enabled` gate opens, a press
  // completes the full `isPressed` roundtrip and the narrow row's `hitSlop`
  // computes its padding.
  test("M-016 ios host derivation: touch minimums and a full seam roundtrip without a scope", async () => {
    const app = await openMenu(
      "m-seam",
      {},
      { platform: "ios", width: 390, height: 844 },
    );

    expect(lastLayout(app, "row-a").height).toBeGreaterThanOrEqual(44);

    const env = callsOf(app, "ctx-a-env").map((c) => c[0] as CtxEnv).at(-1)!;
    expect(env.enabled).toBe(true);
    expect(env.bounds.height).toBeGreaterThanOrEqual(44);

    await app.press("id:row-a");
    await app.waitUntil(
      () => callsOf(app, "ctx-a-pressed").filter((c) => c[0] === true).length > 0,
    );
    await app.waitUntil(() => callsOf(app, "ctx-a-pressed").at(-1)?.[0] === false);
    const edges = callsOf(app, "ctx-a-pressed").map((c) => c[0] as boolean);
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);
    // The activation contract holds on the ios host too.
    expect(
      callsOf(app, "onAction").at(-1)?.[0],
    ).toBe("a");

    // The narrow row computes its slop under the derived touch input.
    const narrow = await openMenu(
      "m-narrow",
      {},
      { platform: "ios", width: 390, height: 844 },
    );
    expect(lastLayout(narrow, "row-n").height).toBeGreaterThanOrEqual(44);
    const narrowEnv = callsOf(narrow, "ctx-n-env")
      .map((c) => c[0] as CtxEnv)
      .at(-1)!;
    expect(narrowEnv.enabled).toBe(true);
    expect(narrowEnv.hitSlop).toEqual({ top: 0, right: 4, bottom: 0, left: 4 });
  }, 120_000);
});
