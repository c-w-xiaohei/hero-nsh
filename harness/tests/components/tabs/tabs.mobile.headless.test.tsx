import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the tabs adapt unit — the rows of
 * adapt-sheets/tabs.md §4 that need steps only the headless engine
 * provides:
 *
 *   M-005  the held-press half of the seam roundtrip — `dragAndHold` keeps
 *          the press down while the `ctx-state` samples read the settled
 *          channels (`pressed`, `scale`, `seamPressed`), and `drop`/`drag`
 *          exercise the cancel=release path.
 *   M-009  `app.drag` on the panel — the dual assertion that no swipe
 *          pager exists — plus the chevron `scrollBy` paging step and the
 *          `ScrollShadow` visibility sequence in both environments.
 *   M-012  `open({platform:"ios"})` host derivation — no `EnvironmentScope`,
 *          the platform reports `input()==="touch"`.
 *
 * The shared file `tabs.mobile.test.tsx` covers M-001…M-008, M-010, M-011
 * and M-013; the quick-press halves of M-005/M-009 live there.
 */

function openTabs(
  caseName: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../tabs.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type CtxEnv = {
  enabled: boolean;
  hitSlop: { top: number; right: number; bottom: number; left: number } | null;
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
  hitSlop: { top: number; right: number; bottom: number; left: number } | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  allDisabled: boolean;
};

type MeasureEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  px: number;
  py: number;
};

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

function measures(app: App): MeasureEntry[] {
  return callsOf(app, "measure").map((c) => c[0] as MeasureEntry);
}

function layouts(app: App, name: string): LayoutEntry[] {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((l) => l.name === name);
}

function lastLayout(app: App, name: string): LayoutEntry {
  const list = layouts(app, name);
  return list[list.length - 1];
}

async function measureOnce(app: App): Promise<Map<string, MeasureEntry>> {
  const before = measures(app).length;
  await app.press("id:measure-all");
  await app.waitUntil(() => measures(app).length >= before + 12, { timeout: 10_000 });
  return new Map(measures(app).map((m) => [m.name, m]));
}

function offsetOf(ms: Map<string, MeasureEntry>): number {
  return ms.get("listcontainer")!.px + 4 - ms.get("tab-t1")!.px;
}

function vxOf(ms: Map<string, MeasureEntry>, name: string): number {
  const lc = ms.get("listcontainer")!;
  const t = ms.get(name)!;
  return t.px - lc.px + t.width / 2;
}

async function settledMeasure(app: App): Promise<Map<string, MeasureEntry>> {
  let offset = offsetOf(await measureOnce(app));
  for (let i = 0; i < 10; i++) {
    await app.wait(300);
    const ms = await measureOnce(app);
    const next = offsetOf(ms);
    if (Math.abs(next - offset) < 0.5) {
      return ms;
    }
    offset = next;
  }
  return measureOnce(app);
}

function heldSamples(app: App): CtxState[] {
  return callsOf(app, "ctx-state")
    .map((c) => c[0] as CtxState)
    .filter((s) => s.seamPressed === true);
}

describe("tabs mobile (headless)", () => {
  // adapt-sheets/tabs.md M-005 (A-003): the held-press half — `dragAndHold`
  // keeps the finger down past the seam's sampling delays, so `ctx-state`
  // records `seamPressed: true` with `pressed` at its 1 end and `scale`
  // below 1; `drop` releases through the same `onPressUp` path and every
  // channel settles back to rest.
  test("M-005 held press: seam channels engage mid-hold and reset on release", async () => {
    const app = await openTabs("mobile", { input: "touch" });

    await app.dragAndHold("id:tab-t1", { x: 0, y: 0 });
    await app.waitUntil(() =>
      callsOf(app, "ctx-pressed").filter((c) => c[0] === true).length > 0,
    );
    await app.waitUntil(() => heldSamples(app).length >= 1);

    const held = heldSamples(app).at(-1)!;
    expect(held.seamPressed).toBe(true);
    expect(held.pressed).toBeGreaterThan(0.9);
    expect(held.scale).toBeLessThan(1);
    expect(held.enabled).toBe(true);

    await app.drop();
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);

    // The release path settles: a later sample shows the seam at rest.
    await app.waitUntil(() => {
      const last = callsOf(app, "ctx-state").at(-1)?.[0] as CtxState | undefined;
      return last !== undefined && !last.seamPressed && last.scale === 1;
    });
    const settled = callsOf(app, "ctx-state").at(-1)?.[0] as CtxState;
    expect(settled.seamPressed).toBe(false);
    expect(settled.pressed).toBeLessThan(0.5);
    expect(settled.scale).toBe(1);
  }, 120_000);

  // adapt-sheets/tabs.md M-009 (A-006, 基线): the panel has no drag path —
  // `app.drag` on the mounted panel changes neither `selectionChange` nor
  // the strip's scroll offset (the dual of "no swipe pager"), while the
  // chevron `onPress → scrollBy(0.8 page)` step and the `ScrollShadow`
  // visibility sequence behave the same in both environments.
  test("M-009 panel drag is inert; chevron paging steps 0.8 page in both environments", async () => {
    for (const params of [{}, { input: "touch" }] as Record<string, string>[]) {
      const tag = params.input ?? "pointer";
      const app = await openTabs("mobile", params);

      await app.press("id:select-t5");
      await app.waitUntil(() =>
        callsOf(app, "geom").at(-1) != null &&
        (callsOf(app, "geom").at(-1)![0] as { selectedKey?: string }).selectedKey === "s:t5",
      );
      const before = await settledMeasure(app);
      const offsetBefore = offsetOf(before);
      const selectionBefore = callsOf(app, "selectionChange").length;

      // Only the selected tab's panel is mounted (R-048).
      expect(app.shows("id:panel-t5")).toBe(true);

      // Dragging the panel must not scroll the strip or change selection.
      await app.drag("id:panel-t5", { x: 0, y: -80 });
      await app.wait(500);
      const afterDrag = await settledMeasure(app);
      expect(Math.abs(offsetOf(afterDrag) - offsetBefore)).toBeLessThan(1.5);
      expect(callsOf(app, "selectionChange")).toHaveLength(selectionBefore);

      // Chevron paging: scrollBy(1) = 0.8 × 280 = 224 pt, clamped into
      // [0, 244]. The contract is a full page step; the focused-key
      // scroll-into-view correction currently clamps it short (BUG
      // registered in the batch report), so this is the RED half.
      await app.press("id:tabs-scroll-next");
      const paged = await settledMeasure(app);
      const expected = Math.min(offsetBefore + 224, 244);
      expect(Math.abs(offsetOf(paged) - expected)).toBeLessThan(2);

      // Visibility sequence: once scrolled, the start chevron shows in
      // both environments (it was hidden at offset 0 under pointer).
      expect(app.shows("id:tabs-scroll-prev")).toBe(true);
      expect(app.shows("id:tabs-scroll-next")).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/tabs.md M-012 (A-001, A-003, A-004): `platform:"ios"`
  // with no EnvironmentScope — the host derives `input()==="touch"`, so
  // the tab's 44 pt minimum applies, the seam's `enabled` gate opens, a
  // press completes the full `isPressed` roundtrip and a programmatic
  // selection centers the tab in the viewport.
  test("M-012 ios host derivation: touch minimums, seam roundtrip and centered selection without a scope", async () => {
    const app = await openTabs(
      "mobile",
      {},
      { platform: "ios", width: 390, height: 844 },
    );

    const tabLayout = lastLayout(app, "tab-t1");
    expect(tabLayout.height).toBeGreaterThanOrEqual(44);

    const env = callsOf(app, "ctx-env").map((c) => c[0] as CtxEnv).at(-1)!;
    expect(env.enabled).toBe(true);
    expect(env.bounds).toEqual({ width: 48, height: 44 });

    await app.press("id:tab-t1");
    await app.waitUntil(() =>
      callsOf(app, "ctx-pressed").filter((c) => c[0] === true).length > 0,
    );
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);
    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);

    await app.press("id:select-t7");
    await app.waitUntil(() => {
      const g = callsOf(app, "geom").at(-1)?.[0] as { selectedKey?: string } | undefined;
      return g?.selectedKey === "s:t7";
    });
    // iOS's animated scrollTo settles a little later than the desktop
    // host's — poll the measure channel until the offset stops moving.
    const ms = await settledMeasure(app);
    expect(Math.abs(vxOf(ms, "tab-t7") - 140)).toBeLessThan(1.5);
  }, 120_000);
});
