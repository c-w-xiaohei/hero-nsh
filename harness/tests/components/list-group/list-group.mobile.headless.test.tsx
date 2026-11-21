import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the e-parts ListGroup mechanism unit, one
 * test per row of adapt-sheets/e-parts.md §4 (M-012…M-018, M-033, M-034),
 * plus the headless-only halves — `open({platform:"ios"})` host derivation
 * and `app.drag` press cancellation (M-017).
 *
 * The fixture is `harness/list-group.fixtures.tsx`, opened by `host.params`:
 * `case` (item/parts), `scope`, `variant`, `disabled`, `box`, `short`,
 * `iconsize`. The ctx probes read `ListGroupItemContext` — the item's
 * press-feedback seam view — since `nsh/test` can see neither the view's
 * `hitSlop` prop nor AnimatedValue-bound styles (the registered host gap).
 */

type Params = Record<string, string>;

function openList(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../list-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type CtxState = {
  pressed: number;
  scale: number;
  isPressed: boolean;
  hitSlop: Edges | null;
  origin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
  enabled: boolean;
};

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
};

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.isPressed === true);
}

function kinds(app: App): string[] {
  return callsOf(app, "events").map((c) => (c[0] as { kind: string }).kind);
}

describe("list-group mobile (headless)", () => {
  // adapt-sheets/e-parts.md M-012 (A-006, 负断言): under the default pointer
  // environment the item's seam is inert — `pressed`/`scale` at rest,
  // `hitSlop` null, no origin — while `onPress` still fires: the row is a
  // plain press target on desktop.
  test("M-012 default environment: the item's feedback seam stays inert while onPress fires", async () => {
    const app = await openList("item");

    await app.press("id:lg-item");
    await app.waitUntil(() => callsOf(app, "press").length === 1);
    expect(callsOf(app, "press")).toEqual([["press"]]);

    // The seam's isPressed never rises (the gate is closed) — every
    // ctx-pressed edge is false.
    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
    expect(edges.every((e) => e === false)).toBe(true);

    // The on-demand channel read shows the seam at rest.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxState>(app, "ctx-channels");
    expect(channels.isPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.scale).toBe(1);
    expect(channels.hitSlop).toBeNull();
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/e-parts.md M-013 (A-006): injected touch — a press
  // roundtrips the seam (`ctx-pressed` true→false), the held sample shows
  // the channels activated, and `onPress` fires exactly once.
  test("M-013 injected touch: press roundtrips the seam and fires onPress once", async () => {
    const app = await openList("item", { scope: "touch" });

    await app.press("id:lg-item");
    await app.waitUntil(() => callsOf(app, "press").length === 1);

    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);

    // Held press: the +600 ms / +1500 ms samples land mid-hold and read
    // the settled channels — canonical flag up, `pressed` at 1, and the
    // hit-area expansion computed on a row too small for the target.
    await app.longPress("id:lg-item");
    await app.waitUntil(() => heldSamples(app).length >= 1);
    const held = heldSamples(app).at(-1)!;
    expect(held.isPressed).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.99);
    expect(held.enabled).toBe(true);
    expect(held.origin).not.toBeNull();
    // A full-width row (~288 pt) is already over the 44 pt target.
    expect(held.hitSlop).toBeNull();
  }, 120_000);

  // The same M-013 half on a tiny item: the seam's hit-area path pads the
  // laid-out row up to the 44 pt minimum — `(44 − side) / 2` per side,
  // computed from the row's measured bounds; `min-h-11` already holds the
  // height at 44, so only the width axis pads.
  test("M-013 tiny item: hitSlop pads the under-target sides toward 44pt", async () => {
    const app = await openList("item", { scope: "touch", box: "tiny" });

    // The first ctx-env report precedes the layout (bounds 0×0 → no slop);
    // wait for the report the row's onLayout triggers.
    await app.waitUntil(() => {
      const env = callsOf(app, "ctx-env").at(-1)?.[0] as CtxEnv | undefined;
      return env !== undefined && env.hitSlop !== null;
    });
    const env = lastOf<CtxEnv>(app, "ctx-env");
    expect(env.enabled).toBe(true);
    // The measured row is narrower than the 44 pt target, at the target
    // height: padX = (44 − width) / 2 per side, padY = 0.
    expect(env.bounds.height).toBeGreaterThanOrEqual(44);
    expect(env.bounds.width).toBeGreaterThan(0);
    expect(env.bounds.width).toBeLessThan(44);
    const pad = (44 - env.bounds.width) / 2;
    expect(env.hitSlop).toEqual({ top: 0, right: pad, bottom: 0, left: pad });
  }, 120_000);

  // adapt-sheets/e-parts.md M-014 (A-007): every slot renders — prefix,
  // content, title, description — and `ItemSuffix` draws the default
  // chevron (`icon-chevron-right`) only while its `children` is empty.
  test("M-014 the slots render and the suffix shows the default chevron only with no children", async () => {
    const app = await openList("parts");

    expect(app.shows("text:Wi-Fi")).toBe(true);
    expect(app.shows("text:Connected to Office")).toBe(true);
    expect(app.shows("id:prefix-dot")).toBe(true);
    expect(app.shows("id:suffix-default")).toBe(true);
    expect(app.shows("id:suffix-custom")).toBe(true);

    // Exactly one default chevron: the item with children in ItemSuffix
    // draws none.
    expect(app.count("id:icon-chevron-right")).toBe(1);
    expect(app.shows("text:GO")).toBe(true);
  }, 120_000);

  // adapt-sheets/e-parts.md M-015 (A-007): `iconProps.size` sizes the
  // default chevron — the canvas's `onLayout` reports the resolved box.
  test("M-015 iconProps.size changes the default chevron's laid-out size", async () => {
    for (const [param, expected] of [
      ["16", 16],
      ["24", 24],
    ] as const) {
      const app = await openList("parts", { iconsize: param });
      await app.waitUntil(() =>
        callsOf(app, "layout").some(
          (c) => (c[0] as { name: string }).name === "chevron",
        ),
      );
      const layout = callsOf(app, "layout")
        .map((c) => c[0] as { name: string; width: number; height: number })
        .find((l) => l.name === "chevron")!;
      expect(layout.width).toBe(expected);
      expect(layout.height).toBe(expected);
    }
  }, 120_000);

  // adapt-sheets/e-parts.md M-016 (A-006, A-008): `variant` passes through
  // to the `Surface` root (the `surface` probe reads `SurfaceContext`'s
  // resolved value), and the touch axis's `min-h-11` holds the row at 44 pt.
  test("M-016 variant passes through to Surface and the touch row keeps its 44pt minimum", async () => {
    const secondary = await openList("item", { variant: "secondary" });
    await secondary.waitUntil(() => callsOf(secondary, "surface").length > 0);
    expect(lastOf<{ variant: string }>(secondary, "surface").variant).toBe(
      "secondary",
    );

    const plain = await openList("item");
    await plain.waitUntil(() => callsOf(plain, "surface").length > 0);
    expect(lastOf<{ variant: string }>(plain, "surface").variant).toBe(
      "default",
    );

    // The min-height half: a 24 pt tiny item — `min-h-11` lifts it to 44
    // under touch while the pointer run keeps the styled height. (A row of
    // normal content already exceeds 44 pt through `p-4`, so the axis only
    // shows on a forced-short box.)
    const touch = await openList("item", { scope: "touch", box: "tiny" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    expect(lastOf<{ height: number }>(touch, "layout").height).toBeGreaterThanOrEqual(44);

    const pointer = await openList("item", { box: "tiny" });
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    expect(lastOf<{ height: number }>(pointer, "layout").height).toBeLessThan(44);
  }, 120_000);

  // adapt-sheets/e-parts.md M-017 (A-006): an ios host derives
  // `input()==="touch"` with no scope — the seam engages on a real press —
  // and a drag cancels the press with no `onPress` recorded.
  test("M-017 ios derivation activates the seam and a drag cancels with no press", async () => {
    const ios = await openList(
      "item",
      {},
      { platform: "ios", width: 390, height: 844 },
    );

    await ios.press("id:lg-item");
    await ios.waitUntil(() => callsOf(ios, "press").length === 1);
    const edges = callsOf(ios, "ctx-pressed").map((c) => c[0] as boolean);
    expect(edges).toContain(true);
    expect(lastOf<CtxEnv>(ios, "ctx-env").enabled).toBe(true);

    // The drag-cancel half: the press is engaged on the way down, then
    // `onPressUp` runs (cancel shares the release path) and nothing commits.
    const app = await openList("item", { scope: "touch" });
    await app.drag("id:lg-item", { x: 40, y: 0 });
    await app.waitUntil(() => kinds(app).some((k) => k === "up"));
    expect(kinds(app)).not.toContain("press");
    expect(callsOf(app, "press")).toHaveLength(0);
    const after = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
    expect(after).toContain(true);
    expect(after.at(-1)).toBe(false);
  }, 120_000);

  // adapt-sheets/e-parts.md M-018 (A-009, A-015): `ListGroup` and every
  // slot part mount from `@heroui/react` — the fixture imports the compound
  // and `ListGroupItemContext`/`SurfaceContext` through the barrel.
  test("M-018 ListGroup and all parts mount from the public entry", async () => {
    const app = await openList("parts");

    expect(app.shows("id:prefix-dot")).toBe(true);
    expect(app.shows("id:suffix-default")).toBe(true);
    expect(app.shows("id:suffix-custom")).toBe(true);
    expect(app.count("role:list")).toBeGreaterThanOrEqual(1);
    // The item case proves the pressable row and the context probe import.
    const item = await openList("item");
    expect(item.shows("id:lg-item")).toBe(true);
    expect(item.shows("text:Wi-Fi")).toBe(true);
    await item.waitUntil(() => callsOf(item, "ctx-env").length > 0);
  }, 120_000);

  // adapt-sheets/e-parts.md M-033/M-034 (A-016, A-017): the fixture opens in
  // both environments and its probes record.
  test("M-033 and M-034 the fixture opens in both environments and its probes record", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openList("item", scope ? { scope } : {});
      expect(app.shows("id:lg-item")).toBe(true);
      await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(scope === "touch");
    }
  }, 120_000);
});
