import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { removeButton } from "../../testers/tag";

/*
 * Web mobile assertions for the tag adapt unit — the `.web.` half of
 * adapt-sheets/tag.md §4 (M-001…M-010, M-013). `dragAndHold` and
 * `open({platform})` ios derivation are headless-only, so M-011/M-012 live in
 * `tag.mobile.headless.test.tsx`; this file asserts the same rows through
 * edge probes (`ctx-pressed`), settle reads (`ctx-state`/`ctx-channels`) and
 * `app.press`/`app.hover`/`app.longPress`.
 *
 * Fixture: `harness/tag.fixtures.tsx` — `case`, `scope` ("touch" injects the
 * `EnvironmentScope`; "" is the pointer environment, the desktop-parity
 * half), `probe` ("1" mounts the CtxProbe + `ctx-sample`). `isPressed` is the
 * feedback factory's gated flag; the row's own render-prop press state is a
 * separate signal (R-012 leaves it without a visual owner).
 *
 * Event-order note (M-007): the sheet's §1 sequence strings put
 * `pressChange(false)` after `pressEnd`; the implemented order — unchanged by
 * this unit — reports it first (`handlePressUp` clears `pointerPressed`
 * before dispatching `onPressUp`/`onPressEnd`). The assertion below pins the
 * implemented order, which is what "existing order unchanged" means.
 */

type Params = Record<string, string>;

function openTag(caseName: string, params: Params = {}): Promise<App> {
  // `platform: "web"` pins the pointer host: without it a suite run opens the
  // app on the phone-sized headless engine (`platform.desktop` false), so the
  // environment's input defaults to touch and every pointer-default
  // assertion in this file inverts (suite-only failures, switch M-001/3/4's
  // lesson).
  return open("../../../tag.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type CtxState = {
  tag?: string;
  pressed: number;
  scale: number;
  isPressed: boolean;
  hitSlop: Edges | null;
  origin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
  enabled: boolean;
};

type CtxChannels = Omit<CtxState, "tag">;

type CtxEnv = {
  tag?: string;
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
};

type LayoutEntry = { name: string; width: number; height: number };

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

function edges(app: App): boolean[] {
  return callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
}

function states(app: App): CtxState[] {
  return callsOf(app, "ctx-state").map((c) => c[0] as CtxState);
}

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

function eventKinds(app: App): string[] {
  return callsOf(app, "events").map((c) => String(c[0]));
}

describe("tag mobile (web)", () => {
  // adapt-sheets/tag.md M-001 (A-002/A-003/A-006, 负断言): under the default
  // pointer environment the touch-gated seam is inert — `isPressed` has no
  // seam edge, `hitSlop`/`pressOrigin` never record, `enabled` is false —
  // while the selection contract works unchanged.
  test("M-001 default environment: feedback channels stay inert while selection works", async () => {
    const app = await openTag("feedback-row", { probe: "1" });

    await app.press("role:row[News]");
    await app.waitUntil(() => callsOf(app, "selectionChange").length === 1);
    expect(callsOf(app, "selectionChange")).toEqual([[["news"]]]);

    // No seam edge ever reported true; the mount edge reports the rest gate.
    expect(edges(app).every((edge) => !edge)).toBe(true);
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(false);

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.isPressed).toBe(false);
    expect(channels.hitSlop).toBeNull();
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);

    // The remove path is unchanged too: the button's `?? 6` fallback stands.
    const rm = await openTag("remove-probe");
    await rm.press(removeButton("Cat"));
    await rm.waitUntil(() => callsOf(rm, "remove").length === 1);
    expect(callsOf(rm, "remove")).toEqual([[["cat"]]]);
  }, 120_000);

  // adapt-sheets/tag.md M-002 (A-002/A-003): injected touch — the seam's
  // `isPressed` round-trips, `pressOrigin` records, and a row under 44 pt
  // reports a non-empty `hitSlop`; selection behaves exactly as under
  // pointer.
  test("M-002 injected touch: seam engages on hold and row reports hitSlop", async () => {
    const app = await openTag("feedback-row", { scope: "touch", probe: "1" });

    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);

    // The mount-time env sample can run before `onLayout`; wait for a state
    // sample that carries measured bounds — a ~28-80 pt row is under 44 pt
    // on both axes' worth of sides, so the slop is non-empty.
    await app.waitUntil(() =>
      states(app).some((s) => s.hitSlop !== null),
    );
    const slop = states(app).filter((s) => s.hitSlop !== null).at(-1)!.hitSlop!;
    // The row's height is the constrained axis: `min-h-9` keeps it at 36 pt,
    // so the vertical slop is (44 - 36) / 2 = 4 pt a side. Horizontally the
    // probed row is already wider than 44 pt (the `seam-idle` marker text
    // counts), so `left`/`right` legitimately read 0 — the Edges object is
    // non-empty on the axis that needs it.
    expect(slop.top).toBeGreaterThan(0);
    expect(slop.bottom).toBe(slop.top);

    // A hold: the interval sampler catches the flag mid-press (web batches
    // the edge inside one press tick, so the polled `ctx-state` carries the
    // held half).
    await app.longPress("role:row[News]");
    await app.waitUntil(() => states(app).some((s) => s.isPressed));
    const held = states(app).filter((s) => s.isPressed).at(-1)!;
    expect(held.pressed).toBeGreaterThan(0.9);
    expect(held.origin).not.toBeNull();

    // The longPress also completed the activation path: same selection call
    // as a pointer press produces.
    await app.waitUntil(() => callsOf(app, "selectionChange").length >= 1);
    expect(callsOf(app, "selectionChange")).toEqual([[["news"]]]);

    // Post-press settle: channels back to rest.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.isPressed).toBe(false);
    expect(channels.origin).toBeNull();
  }, 120_000);

  // adapt-sheets/tag.md M-003 (A-002): injected touch — a static row
  // (selectionMode "none", no onAction) is not a press target, so the seam's
  // hitSlop accessor gate keeps `hitSlop()` undefined; only genuinely
  // interactive rows expand.
  test("M-003 injected touch: a static row reports no hitSlop", async () => {
    const app = await openTag("feedback-static", { scope: "touch", probe: "1" });

    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);

    // The deferred `ctx-state` samples carry measured bounds — every sample
    // must keep hitSlop null even so (the accessor gate, not timing).
    await app.waitUntil(() => states(app).length > 0);
    for (const s of states(app)) {
      expect(s.hitSlop).toBeNull();
    }

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    expect(lastOf<CtxChannels>(app, "ctx-channels").hitSlop).toBeNull();
  }, 120_000);

  // adapt-sheets/tag.md M-004 (A-001): injected touch lifts the row's visible
  // height to ≥36 (the `min-h-9` cell), whatever the size grade; the default
  // environment keeps the content-sized heights.
  test("M-004 touch rows measure at least 36pt, default environment unchanged", async () => {
    const touch = await openTag("feedback-row", { scope: "touch" });
    await touch.waitUntil(() =>
      callsOf(touch, "layout").some((c) => (c[0] as LayoutEntry).name === "news"),
    );
    expect(layoutFor(touch, "news").height).toBeGreaterThanOrEqual(36);

    // lg size grade and a removable row too.
    const touchLg = await openTag("size-lg", { scope: "touch" });
    await touchLg.waitUntil(() =>
      callsOf(touchLg, "layout").some((c) => (c[0] as LayoutEntry).name === "news"),
    );
    expect(layoutFor(touchLg, "news").height).toBeGreaterThanOrEqual(36);

    const touchHeights = await openTag("heights", { scope: "touch" });
    await touchHeights.waitUntil(() =>
      callsOf(touchHeights, "layout").some(
        (c) => (c[0] as LayoutEntry).name === "plain",
      ),
    );
    expect(layoutFor(touchHeights, "plain").height).toBeGreaterThanOrEqual(36);
    expect(layoutFor(touchHeights, "removable").height).toBeGreaterThanOrEqual(36);

    // Default environment: the same cases keep their content heights
    // (sm `py-0.5`, md `py-1` — all well under 36).
    const pointer = await openTag("feedback-row");
    await pointer.waitUntil(() =>
      callsOf(pointer, "layout").some((c) => (c[0] as LayoutEntry).name === "news"),
    );
    expect(layoutFor(pointer, "news").height).toBeLessThan(36);

    const pointerHeights = await openTag("heights");
    await pointerHeights.waitUntil(() =>
      callsOf(pointerHeights, "layout").some(
        (c) => (c[0] as LayoutEntry).name === "plain",
      ),
    );
    expect(layoutFor(pointerHeights, "plain").height).toBeLessThan(36);
  }, 120_000);

  // adapt-sheets/tag.md M-005 (A-004): under touch neither `app.hover` nor a
  // press raises `isHovered` or fires hover callbacks — the sticky-hover
  // suppression; the default environment's hover round-trips.
  test("M-005 injected touch suppresses hover, default environment keeps it", async () => {
    const touch = await openTag("row-hover", { scope: "touch" });
    await touch.hover("role:row[News]");
    expect(touch.shows("text:Hovered")).toBe(false);
    expect(touch.shows("text:Idle")).toBe(true);
    await touch.press("role:row[News]");
    expect(touch.shows("text:Idle")).toBe(true);
    expect(callsOf(touch, "hoverStart")).toHaveLength(0);
    expect(callsOf(touch, "hoverEnd")).toHaveLength(0);

    const pointer = await openTag("row-hover");
    await pointer.hover("role:row[News]");
    expect(pointer.shows("text:Hovered")).toBe(true);
    await pointer.hover("id:away");
    await pointer.waitFor("text:Idle");
  }, 120_000);

  // adapt-sheets/tag.md M-006 (A-002/A-008): injected touch + disabled — the
  // gate closes (`enabled()` false, `hitSlop()` undefined) and the press
  // path stays blocked, for `disabledKeys`, a row `isDisabled` and the
  // group-level `isDisabled` alike.
  test("M-006 injected touch + disabled: gate closed, press inert", async () => {
    const keys = await openTag("disabled-keys", { scope: "touch", probe: "1" });
    expect(lastOf<CtxEnv>(keys, "ctx-env").enabled).toBe(false);
    await expect(keys.press("role:row[News]")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(keys, "selectionChange")).toHaveLength(0);
    expect(edges(keys).every((edge) => !edge)).toBe(true);

    // A row's own isDisabled gates the same way.
    const row = await openTag("disabled-individual", { scope: "touch" });
    expect(row.enabled("role:row[News]")).toBe(false);
    expect(row.enabled("role:row[Travel]")).toBe(true);

    // A-008's group-level isDisabled: every key disabled under touch too.
    const group = await openTag("group-disabled", { scope: "touch", probe: "1" });
    expect(lastOf<CtxEnv>(group, "ctx-env").enabled).toBe(false);
    expect(group.enabled("role:row[Cat]")).toBe(false);
    expect(group.enabled("role:row[Dog]")).toBe(false);
    await expect(group.press("role:row[Cat]")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    await expect(group.press(removeButton("Cat"))).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(group, "selectionChange")).toHaveLength(0);
    expect(callsOf(group, "remove")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/tag.md M-007 (A-002): the row's press lifecycle order is
  // preserved under touch — the seam only listens; the implemented order
  // reports `pressChange(false)` first on release (see the file header).
  test("M-007 injected touch: press event sequence preserved", async () => {
    const app = await openTag("press-log", { scope: "touch" });

    await app.press("role:row[News]");
    await app.waitUntil(() => callsOf(app, "press").length === 1);
    expect(eventKinds(app)).toEqual([
      "pressStart",
      "pressDown",
      "pressChange(true)",
      "pressChange(false)",
      "pressUp",
      "pressEnd",
      "press",
    ]);
  }, 120_000);

  // adapt-sheets/tag.md M-008 (A-005): the observation channel — the same
  // case mounts under both environments and `probe=1` exposes every ctx
  // channel (the provider wraps the row view, so the probe inside the row's
  // children reads the live seam).
  test("M-008 probe surface mounts and reports under both environments", async () => {
    for (const params of [{ probe: "1" } as Params, { scope: "touch", probe: "1" }]) {
      const app = await openTag("feedback-row", params);

      const env = lastOf<CtxEnv>(app, "ctx-env");
      expect(typeof env.enabled).toBe("boolean");
      expect(env.bounds).toBeDefined();

      await app.waitUntil(() => callsOf(app, "ctx-pressed").length > 0);
      await app.press("id:ctx-sample");
      await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
      const channels = lastOf<CtxChannels>(app, "ctx-channels");
      expect(typeof channels.isPressed).toBe("boolean");
      expect(typeof channels.pressed).toBe("number");
      expect(typeof channels.scale).toBe("number");
      expect("hitSlop" in channels).toBe(true);
      expect("origin" in channels).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/tag.md M-009 (A-006): injected touch — the remove button's
  // own seam reports a ≈16 pt/side hitSlop (the 12 pt box toward 44); a press
  // still removes exactly its own key, and the default environment keeps
  // `hitSlop ?? 6`.
  test("M-009 injected touch: remove button seam reports 44pt hitSlop, remove works", async () => {
    const app = await openTag("remove-probe", { scope: "touch", probe: "1" });

    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);
    await app.waitUntil(() =>
      states(app).some((s) => s.hitSlop !== null),
    );
    const slop = states(app).filter((s) => s.hitSlop !== null).at(-1)!.hitSlop!;
    // 12 pt box → (44 - 12) / 2 = 16 pt a side.
    expect(slop.top).toBeGreaterThanOrEqual(14);
    expect(slop.left).toBeGreaterThanOrEqual(14);

    await app.press(removeButton("Cat"));
    await app.waitUntil(() => callsOf(app, "remove").length === 1);
    expect(callsOf(app, "remove")).toEqual([[["cat"]]]);
  }, 120_000);

  // adapt-sheets/tag.md M-010 (A-009): the F-regression baseline — the
  // dual-point semantics of the existing suite hold under the default
  // environment, and the group's `isDisabled` path works in both
  // environments.
  test("M-010 default environment baseline: selection, remove, typeahead, empty state", async () => {
    const app = await openTag("selection-log");
    await app.press("role:row[News]");
    await app.waitUntil(() => callsOf(app, "selectionChange").length === 1);
    expect(callsOf(app, "selectionChange")).toEqual([[["news"]]]);
    await app.press("role:row[Travel]");
    await app.waitUntil(() => callsOf(app, "selectionChange").length === 2);
    expect(callsOf(app, "selectionChange")[1]).toEqual([["travel"]]);

    const rm = await openTag("remove-single");
    await rm.press(removeButton("News"));
    await rm.waitUntil(() => callsOf(rm, "remove").length === 1);
    expect(callsOf(rm, "remove")).toEqual([[["news"]]]);

    // Typeahead: a pointer press focuses the list, then a letter moves the
    // virtual focus onto the matching row.
    const ta = await openTag("typeahead");
    await ta.press("role:row[One]");
    await ta.waitUntil(() => ta.count("role:row[One] >> text:▶") === 1);
    await ta.keyboard.press("t");
    await ta.waitUntil(() => ta.count("role:row[Two] >> text:▶") === 1);

    const empty = await openTag("empty-state");
    expect(empty.shows("text:No categories found")).toBe(true);

    const mapped = await openTag("items-mapped");
    await mapped.press("role:row[Two]");
    await mapped.waitUntil(() => callsOf(mapped, "selectionChange").length === 1);
    expect(callsOf(mapped, "selectionChange")).toEqual([[["2"]]]);
  }, 120_000);

  // adapt-sheets/tag.md M-013 (A-008, 桌面平价): under the default pointer
  // environment the group `isDisabled` prop works identically — the root's
  // `accessibilityState.disabled` reports, every key is disabled, and
  // press/remove/selection callbacks never fire; absent the prop nothing
  // changes.
  test("M-013 group isDisabled: desktop parity — all keys disabled, callbacks inert", async () => {
    const app = await openTag("group-disabled", { probe: "1" });

    expect(app.enabled("id:tag-group")).toBe(false);
    expect(app.enabled("role:row[Cat]")).toBe(false);
    expect(app.enabled("role:row[Dog]")).toBe(false);

    await expect(app.press("role:row[Cat]")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    await expect(app.press(removeButton("Cat"))).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(app, "selectionChange")).toHaveLength(0);
    expect(callsOf(app, "remove")).toHaveLength(0);

    // The seam's gate is closed here too (isDisabledKey covers every key).
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(false);
  }, 120_000);
});
