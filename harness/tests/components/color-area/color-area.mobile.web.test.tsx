import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target mobile assertions for the color-area adapt unit: the same
 * M-001…M-011 assertion set as the headless file, minus the held-finger rows
 * (M-004, M-005, M-010's mid-hold half, M-002's 20pt half, M-007's hold) —
 * `dragAndHold` and `platform:"ios"` are unsupported on `--target web`
 * (sheet §6). `app.press`/`app.drag` + the storage event order assert the
 * same settled states.
 *
 * `platform:"web"` is the pinned pointer host; `EnvironmentScope input="
 * touch"` (host.params.scope) supplies the injected touch environment. On
 * web this file also exercises the real sticky hover A-003 suppresses.
 */

type Params = Record<string, string>;

function openArea(params: Params = {}, caseName = "mobile"): Promise<App> {
  return open("../../../color-area.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type RecordedColor = {
  hue: number;
  saturation: number;
  lightness: number;
  hsl: string;
};

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | number | null;
  seamPressed: boolean;
  bounds: { width: number; height: number };
};

type CtxThumb = {
  enabled: boolean;
  hitSlop: Edges | number | null;
  seamPressed: boolean;
  pressOrigin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
};

type ThumbLayout = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hitSlop: Edges | number | null;
};

type BoundSample = { bound: Edges | number | null; seam: Edges | number | null };

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

function thumbLayouts(app: App): ThumbLayout[] {
  return callsOf(app, "ctx-layout").map((c) => c[0] as ThumbLayout);
}

function slopOf(edges: Edges | number | null): number | null {
  if (edges === null) {
    return null;
  }
  return typeof edges === "number" ? edges : edges.top;
}

describe("color-area mobile (web)", () => {
  // adapt-sheets/color-area.md M-001 (A-001, 负断言): the default pointer
  // environment leaves the touch seam inert — gate off, hitSlop undefined at
  // every layout — while the press contract commits exactly once.
  test("M-001 default environment: the thumb seam is absent while the press contract holds", async () => {
    const app = await openArea();

    await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
    const env = lastOf<CtxEnv>(app, "ctx-env");
    expect(env.enabled).toBe(false);
    expect(env.hitSlop).toBeNull();
    expect(env.seamPressed).toBe(false);

    await app.press("id:area");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-thumb").length > 0);
    const sample = lastOf<CtxThumb>(app, "ctx-thumb");
    expect(sample.enabled).toBe(false);
    expect(sample.hitSlop).toBeNull();
    expect(sample.seamPressed).toBe(false);
    expect(sample.pressOrigin).toBeNull();

    for (const layout of thumbLayouts(app)) {
      expect(layout.hitSlop).toBeNull();
    }
  }, 120_000);

  // M-002 (A-001): injected touch — the 16pt thumb reports ≈14pt of hitSlop
  // per side, a caller's explicit hitSlop wins the binding, and `isDisabled`
  // closes the seam. (The 20pt mid-drag half needs a held finger: headless.)
  test("M-002 injected touch: 14pt of slop at rest, caller value wins, disabled closes", async () => {
    const app = await openArea({ scope: "touch" });

    await app.waitUntil(() => thumbLayouts(app).length > 0);
    const rest = thumbLayouts(app).at(-1)!;
    expect(rest.width).toBe(16);
    expect(slopOf(rest.hitSlop)).toBeGreaterThan(13);
    expect(slopOf(rest.hitSlop)).toBeLessThan(15);
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);

    const caller = await openArea({ scope: "touch", callerSlop: "1" });
    await caller.waitUntil(() => callsOf(caller, "ctx-bound").length > 0);
    const bound = lastOf<BoundSample>(caller, "ctx-bound");
    expect(bound.bound).toBe(2);
    expect(slopOf(bound.seam)).toBeGreaterThan(0);

    const disabled = await openArea({ scope: "touch" }, "disabled");
    await disabled.waitUntil(() => callsOf(disabled, "ctx-env").length > 0);
    const disabledEnv = lastOf<CtxEnv>(disabled, "ctx-env");
    expect(disabledEnv.enabled).toBe(false);
    expect(disabledEnv.hitSlop).toBeNull();
  }, 120_000);

  // M-003 (A-002): injected touch — a panel tap commits once through the
  // deferred press; a drag writes per frame and releases without a second
  // commit.
  test("M-003 injected touch: tap commits once from the deferred press, a drag ends once", async () => {
    const app = await openArea({ scope: "touch" });

    await app.press("id:area");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    const tapChange = lastOf<RecordedColor>(app, "onChange");
    expect(Math.abs(tapChange.saturation - 50)).toBeLessThanOrEqual(6);
    expect(Math.abs(tapChange.lightness - 50)).toBeLessThanOrEqual(6);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);

    const ends = callsOf(app, "onChangeEnd").length;
    await app.drag("id:area", { x: 60, y: 0 });
    expect(callsOf(app, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(ends + 1);
  }, 120_000);

  // M-006 (A-003): web's real sticky hover — under touch neither a synthetic
  // hover nor a press on the thumb sets isHovered or fires a hover callback;
  // under pointer the enter/leave probes record as before.
  test("M-006 touch suppresses the thumb's hover signals while pointer keeps them", async () => {
    const touch = await openArea({ scope: "touch" });
    await touch.hover("id:thumb");
    await touch.press("id:thumb");
    await touch.waitUntil(() => callsOf(touch, "onChangeEnd").length >= 1);
    await touch.hover("id:ctx-sample");

    expect(callsOf(touch, "hover")).toHaveLength(0);
    expect(touch.shows("text:Hover")).toBe(false);

    const pointer = await openArea();
    await pointer.hover("id:thumb");
    await pointer.waitUntil(() => callsOf(pointer, "hover").length > 0);
    const kinds = callsOf(pointer, "hover").map((c) => (c[0] as { kind: string }).kind);
    expect(kinds).toContain("start");
    expect(pointer.shows("text:Hover")).toBe(true);

    await pointer.hover("id:ctx-sample");
    await pointer.waitUntil(() =>
      callsOf(pointer, "hover").some((c) => (c[0] as { kind: string }).kind === "end"),
    );
  }, 120_000);

  // M-007 (A-004): injected touch — the thumb responder still drives the
  // gesture end to end after the hitSlop expansion: frames of onChange and
  // exactly one onChangeEnd.
  test("M-007 injected touch: a thumb drag writes frames and ends once", async () => {
    const app = await openArea({ scope: "touch" });

    await app.drag("id:thumb", { x: 60, y: -40 });

    expect(callsOf(app, "onChange").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);
    expect(lastOf<RecordedColor>(app, "onChangeEnd").hsl).toBe(
      lastOf<RecordedColor>(app, "onChange").hsl,
    );
    expect(app.shows("text:Idle")).toBe(true);
  }, 120_000);

  // M-008 (A-005): geometry has no environment axis — the panel measures the
  // same ≤224pt square and the thumb 16pt in both environments.
  test("M-008 both environments measure the same square panel and 16pt thumb", async () => {
    const pointer = await openArea();
    await pointer.waitUntil(() => callsOf(pointer, "layout").length > 0);
    const pArea = lastOf<{ width: number; height: number }>(pointer, "layout");
    const pThumb = thumbLayouts(pointer).at(-1)!;

    const touch = await openArea({ scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "layout").length > 0);
    const tArea = lastOf<{ width: number; height: number }>(touch, "layout");
    const tThumb = thumbLayouts(touch).at(-1)!;

    expect(pArea.width).toBeLessThanOrEqual(224);
    expect(Math.abs(pArea.width - pArea.height)).toBeLessThanOrEqual(1);
    expect(tArea.width).toBe(pArea.width);
    expect(tArea.height).toBe(pArea.height);
    expect(pThumb.width).toBe(16);
    expect(tThumb.width).toBe(16);
  }, 120_000);

  // M-009 (A-002 + isDisabled): injected touch — disabled blocks the panel
  // and the thumb alike.
  test("M-009 injected touch + isDisabled: the area stays silent", async () => {
    const app = await openArea({ scope: "touch" }, "disabled");

    expect(app.enabled("id:area")).toBe(false);
    await expect(app.press("id:area")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    await expect(app.press("role:adjustable")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });

    expect(callsOf(app, "onChange")).toHaveLength(0);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(0);
  }, 120_000);

  // M-010 (基线): the pointer contract is the desktop one — the press writes
  // at grant (the onChange is already there), a drag streams and ends once.
  // (The mid-hold half needs `dragAndHold`: headless only.)
  test("M-010 baseline: pointer writes at grant and a drag ends once", async () => {
    const app = await openArea();

    await app.press("id:area");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(1);

    await app.drag("id:area", { x: 60, y: 0 });
    expect(callsOf(app, "onChange").length).toBeGreaterThan(1);
    expect(callsOf(app, "onChangeEnd")).toHaveLength(2);
    expect(app.shows("text:Idle")).toBe(true);
  }, 120_000);

  // M-011 (基线移动对偶): injected touch — the keyboard contract is
  // unchanged: a thumb press focuses it (one onChangeEnd for the tap), an
  // arrow steps once without isDragging, a Page key wraps its change in one
  // onChangeEnd.
  test("M-011 injected touch: keyboard steps and Page wrapping are unchanged", async () => {
    const app = await openArea({ scope: "touch" });

    await app.press("id:thumb");
    await app.waitUntil(() => callsOf(app, "onChangeEnd").length === 1);

    await app.keyboard.press("right");
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(app.shows("text:Dragging")).toBe(false);

    await app.keyboard.press("pageup");
    await app.waitUntil(() => callsOf(app, "onChangeEnd").length === 2);
    expect(callsOf(app, "onChange").length).toBe(2);
  }, 120_000);
});
