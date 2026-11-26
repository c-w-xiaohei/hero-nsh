import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target mobile assertions for the e-parts ListGroup mechanism unit:
 * the same M-012…M-018/M-033/M-034 assertion set as the headless file,
 * minus the headless-only halves — `open({platform:"ios"})` host
 * derivation and `app.drag` cancellation (M-017), covered in
 * `list-group.mobile.headless.test.tsx`.
 *
 * `platform:"web"` plays the pointer host; `EnvironmentScope input="touch"`
 * supplies the injected touch environment.
 */

type Params = Record<string, string>;

function openList(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../list-group.fixtures.tsx", {
    platform: "web",
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

describe("list-group mobile (web)", () => {
  // adapt-sheets/e-parts.md M-012 (A-006, 负断言): the default pointer
  // environment leaves the seam inert — channels at rest, no hitSlop —
  // while `onPress` still fires.
  test("M-012 default environment: the item's feedback seam stays inert while onPress fires", async () => {
    const app = await openList("item");

    await app.press("id:lg-item");
    await app.waitUntil(() => callsOf(app, "press").length === 1);
    expect(callsOf(app, "press")).toEqual([["press"]]);

    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
    expect(edges.every((e) => e === false)).toBe(true);

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

  // adapt-sheets/e-parts.md M-013 (A-006): injected touch — the press
  // roundtrips the seam and `onPress` fires once; the held sample shows the
  // channels activated and, on a tiny row, the computed hitSlop.
  test("M-013 injected touch: press roundtrips the seam and fires onPress once", async () => {
    const app = await openList("item", { scope: "touch" });

    await app.press("id:lg-item");
    await app.waitUntil(() => callsOf(app, "press").length === 1);

    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);

    await app.longPress("id:lg-item");
    await app.waitUntil(() => heldSamples(app).length >= 1);
    const held = heldSamples(app).at(-1)!;
    expect(held.isPressed).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.99);
    expect(held.enabled).toBe(true);
    expect(held.origin).not.toBeNull();
    expect(held.hitSlop).toBeNull();
  }, 120_000);

  // The same M-013 half on a tiny item: `(44 − side) / 2` per side,
  // computed from the row's measured bounds; `min-h-11` already holds the
  // height at the target, so only the width axis pads.
  test("M-013 tiny item: hitSlop pads the under-target sides toward 44pt", async () => {
    const app = await openList("item", { scope: "touch", box: "tiny" });

    await app.waitUntil(() => {
      const env = callsOf(app, "ctx-env").at(-1)?.[0] as CtxEnv | undefined;
      return env !== undefined && env.hitSlop !== null;
    });
    const env = lastOf<CtxEnv>(app, "ctx-env");
    expect(env.enabled).toBe(true);
    expect(env.bounds.height).toBeGreaterThanOrEqual(44);
    expect(env.bounds.width).toBeGreaterThan(0);
    expect(env.bounds.width).toBeLessThan(44);
    const pad = (44 - env.bounds.width) / 2;
    expect(env.hitSlop).toEqual({ top: 0, right: pad, bottom: 0, left: pad });
  }, 120_000);

  // adapt-sheets/e-parts.md M-014 (A-007): every slot renders and
  // `ItemSuffix` draws the default chevron only while `children` is empty.
  test("M-014 the slots render and the suffix shows the default chevron only with no children", async () => {
    const app = await openList("parts");

    expect(app.shows("text:Wi-Fi")).toBe(true);
    expect(app.shows("text:Connected to Office")).toBe(true);
    expect(app.shows("id:prefix-dot")).toBe(true);
    expect(app.shows("id:suffix-default")).toBe(true);
    expect(app.shows("id:suffix-custom")).toBe(true);

    expect(app.count("id:icon-chevron-right")).toBe(1);
    expect(app.shows("text:GO")).toBe(true);
  }, 120_000);

  // adapt-sheets/e-parts.md M-015 (A-007): `iconProps.size` sizes the
  // default chevron — its canvas's `onLayout` reports the resolved box.
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

  // adapt-sheets/e-parts.md M-016 (A-006, A-008): `variant` reaches
  // `SurfaceContext` and `min-h-11` holds the touch row at 44 pt.
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

  // adapt-sheets/e-parts.md M-018 (A-009, A-015): `ListGroup` and every
  // slot part mount from `@heroui/react`.
  test("M-018 ListGroup and all parts mount from the public entry", async () => {
    const app = await openList("parts");

    expect(app.shows("id:prefix-dot")).toBe(true);
    expect(app.shows("id:suffix-default")).toBe(true);
    expect(app.shows("id:suffix-custom")).toBe(true);
    expect(app.count("role:list")).toBeGreaterThanOrEqual(1);

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
