import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { focusTrail, panelText, selectionCalls, tab } from "../../testers/tabs";

/*
 * Mobile assertions for the tabs adapt unit, one test per row of
 * adapt-sheets/tabs.md §4 that the shared (headless + web) targets can
 * observe: M-001…M-008, M-010, M-011 and M-013. The held-press sampling,
 * `app.drag` and `platform:"ios"` halves live in
 * `tabs.mobile.headless.test.tsx`.
 *
 * The fixture is `harness/tabs.fixtures.tsx`, opened by `host.params`:
 * `case` (`mobile` for the scroll/feedback geometry, the existing
 * `heroui`/`kobalte-*` cases for the parity rows), `input`/`density` through
 * `EnvironmentScope`, `rtl`, `tabdisabled`, `disabled`. Every assertion
 * reads what `nsh/test` can observe — `shows()`, `enabled()`, `count()`,
 * `texts()`, `onLayout` bounds and the `@scenario/probe` calls in
 * `app.storage()`: `selectionChange`, `events`, `hover`, `focus`, `layout`,
 * `measure`, `geom`, `ctx-pressed`, `ctx-state`, `ctx-env`, `ctx-channels`,
 * `narrow-ctx-*`, `t4-ctx-*`.
 *
 * Scroll position has no `App`-level geometry API, so it is read through the
 * fixture's `measure-all` button: `ViewRef.measure().pagePosition` applies
 * scroll offsets. `offset = listcontainer.px + 4 − tab-t1.px` (t1's content
 * x is 4) and a tab's viewport-x is `tab.px − listcontainer.px + width/2`.
 * Verified geometry of the `mobile` case: contentSize 524×52, viewport
 * 280×52, maxScroll 244; tab centers on a 48 pt grid (t1=28 … t8=364,
 * pxprobe=412, narrow=454); the touch centering offset for a selected tab
 * is `clamp(center − 140)`, the pointer minimal-visibility offset is
 * `scrollKeyIntoView`'s.
 *
 * Known host gaps this file rides (adapt sheet §6, extended by this batch):
 * `hitSlop` is a view prop with no read channel (asserted through the ctx
 * probe's computed value only); `viewStyle` cannot resolve AnimatedValue
 * channels (asserted through `getValue()` probes); chevron bounds have no
 * probe — `app.press` coverage (`ERR_NSH_TEST_COVERED`) is the only
 * observable, and it currently reports the tab on top (see M-003's comment).
 */

type Params = Record<string, string>;

function openTabs(
  caseName: string,
  params: Params = {},
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

type CtxChannels = Omit<CtxState, "hitSlop" | "bounds">;

type MeasureEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  px: number;
  py: number;
};

type GeomEntry = {
  contentSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  selectedKey: string;
  focusedKey?: string;
};

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

type EventEntry = { tab: string; kind: string; value?: boolean };

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

function measures(app: App): MeasureEntry[] {
  return callsOf(app, "measure").map((c) => c[0] as MeasureEntry);
}

function geoms(app: App): GeomEntry[] {
  return callsOf(app, "geom").map((c) => c[0] as GeomEntry);
}

function events(app: App): EventEntry[] {
  return callsOf(app, "events").map((c) => c[0] as EventEntry);
}

function eventsOf(app: App, tabId: string): EventEntry[] {
  return events(app).filter((e) => e.tab === tabId);
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

/** Presses `measure-all` and waits for its 12 async `measure()` reports. */
async function measureOnce(app: App): Promise<Map<string, MeasureEntry>> {
  const before = measures(app).length;
  await app.press("id:measure-all");
  await app.waitUntil(() => measures(app).length >= before + 12, { timeout: 10_000 });
  return new Map(measures(app).map((m) => [m.name, m]));
}

/** The strip's scroll offset in points (t1's content x is 4). */
function offsetOf(ms: Map<string, MeasureEntry>): number {
  return ms.get("listcontainer")!.px + 4 - ms.get("tab-t1")!.px;
}

/** A tab's center in viewport-x coordinates. */
function vxOf(ms: Map<string, MeasureEntry>, name: string): number {
  const lc = ms.get("listcontainer")!;
  const t = ms.get(name)!;
  return t.px - lc.px + t.width / 2;
}

/**
 * Polls `measure-all` until the offset stops moving — the scrollTo calls are
 * `animated: true`, so a fixed sleep races the animation on slow hosts.
 */
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

/** Waits for a programmatic selection to land, then for the scroll settle. */
async function settleSelection(app: App, key: string): Promise<Map<string, MeasureEntry>> {
  await app.waitUntil(() => geoms(app).at(-1)?.selectedKey === `s:${key}`, { timeout: 5_000 });
  return settledMeasure(app);
}

describe("tabs mobile", () => {
  // adapt-sheets/tabs.md M-001 (A-003, 负断言): under the default pointer
  // environment the press-feedback seam is a zero-cost pass-through — the
  // context's `isPressed` never rises, `hitSlop()` stays undefined, `scale`
  // is pinned at 1, no press origin is recorded and the gate reports
  // `enabled: false` — while the press chain (`start → down → chg → up →
  // end → press → click`) and `onSelectionChange` behave exactly as on
  // desktop.
  test("M-001 default environment: the feedback seam is inert while the press contract holds", async () => {
    const app = await openTabs("mobile");

    await app.press("id:tab-t1");
    await app.waitUntil(() => eventsOf(app, "t1").length >= 8);

    // The press contract is intact: the full down → up → press chain in
    // order, with onPressChange's own true → false roundtrip.
    expect(eventsOf(app, "t1").map((e) => e.kind)).toEqual([
      "start",
      "down",
      "chg",
      "chg",
      "up",
      "end",
      "press",
      "click",
    ]);
    expect(eventsOf(app, "t1").filter((e) => e.kind === "chg").map((e) => e.value)).toEqual([
      true,
      false,
    ]);
    expect(selectionCalls(app)).toEqual([["t1"]]);

    // Every ctx-state sample must show the seam at rest — under pointer the
    // gate is closed, so no `isPressed` edge ever fires a sample.
    await app.waitUntil(() => callsOf(app, "ctx-state").length > 0);
    for (const call of callsOf(app, "ctx-state")) {
      const s = call[0] as CtxState;
      expect(s.seamPressed).toBe(false);
      expect(s.pressed).toBeLessThan(0.5);
      expect(s.scale).toBe(1);
      expect(s.highlight).toBe(0);
      expect(s.ripple).toBe(0);
      expect(s.origin).toBeNull();
      expect(s.hitSlop).toBeNull();
      expect(s.enabled).toBe(false);
    }
    expect(callsOf(app, "ctx-pressed").filter((c) => c[0] === true)).toHaveLength(0);

    // The on-demand channel read after the press: rest values, gate closed.
    await app.press("id:ctx-sample-t1");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.scale).toBe(1);
    expect(channels.highlight).toBe(0);
    expect(channels.ripple).toBe(0);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/tabs.md M-002 (A-004, 负断言): under pointer a
  // programmatic selection keeps the desktop `focusedKey → scrollToItem`
  // minimal-visibility scroll and nothing more — selecting t7 (content
  // [292,340], viewport 280) lands the offset at 60, the smallest offset
  // that shows its end edge, not the touch path's centered 176.
  test("M-002 default environment: programmatic selection scrolls minimally, never centers", async () => {
    const app = await openTabs("mobile");

    await app.press("id:select-t7");
    const ms = await settleSelection(app, "t7");

    // Minimal visibility: t7's end edge (340) minus the viewport (280).
    expect(Math.abs(offsetOf(ms) - 60)).toBeLessThan(1.5);
    // The selected tab is fully visible at the viewport's end side — its
    // center sits at vx 256, nowhere near the 140 center a touch centering
    // would produce.
    expect(Math.abs(vxOf(ms, "tab-t7") - 256)).toBeLessThan(1.5);
    expect(Math.abs(vxOf(ms, "tab-t7") - 140)).toBeGreaterThan(30);
  }, 120_000);

  // adapt-sheets/tabs.md M-003 (A-001): injected touch lifts the tab's
  // visible hit minimum to 44 pt (`min-h-11` over `h-8`) and the chevrons'
  // to 44×44 (`min-h-11 min-w-11` over `size-4`, icon still 16 pt centred);
  // the default environment keeps `h-8` (32 pt) and `size-4` (16 pt).
  //
  // Tab heights are read from the fixture's `layout` probe. Chevron bounds
  // have no probe (they are rendered inside `Tabs.ListContainer`), so the
  // size half is asserted through `app.press` coverage: at offset 80
  // (select-t5) t3's center sits at viewport-x 44 and t7's at 236 — inside
  // the 44 pt chevron boxes ([4,48) / [232,276)) but clear of the 16 pt
  // ones ([4,20) / [260,276)). A covered press is the contract; a landed
  // press is the hit-ordering bug's evidence (the chevron's `z-2` does not
  // lift it above the scrolled tab content in `nsh/test`'s hit test —
  // instrumented `onLayout` confirmed the boxes themselves are 44×44 /
  // 16×16 at the expected edges).
  test("M-003 touch lifts tabs to 44pt and chevrons to 44x44; pointer keeps 32pt and 16pt", async () => {
    // Pointer half first: heights and the coverage-clear presses.
    const pointer = await openTabs("mobile");
    expect(lastLayout(pointer, "tab-t1").height).toBe(32);
    expect(lastLayout(pointer, "tab-t1").width).toBe(48);

    await pointer.press("id:select-t5");
    await pointer.wait(600);
    // t5 is already fully visible at offset 0 — the pointer path does not
    // center it. `reveal` then places tabs on the discriminating bands.
    await pointer.press("id:reveal-t3");
    let ms = await settledMeasure(pointer);
    expect(Math.abs(offsetOf(ms) - 100)).toBeLessThan(1.5);
    expect(Math.abs(vxOf(ms, "tab-t3") - 24)).toBeLessThan(1.5);
    expect(pointer.shows("id:tabs-scroll-prev")).toBe(true);
    expect(pointer.shows("id:tabs-scroll-next")).toBe(true);
    // vx 24 is clear of the 16 pt prev chevron ([4,20)) — the press lands.
    await pointer.press("id:tab-t3");

    await pointer.press("id:reveal-t6");
    ms = await settledMeasure(pointer);
    expect(Math.abs(offsetOf(ms) - 12)).toBeLessThan(1.5);
    expect(Math.abs(vxOf(ms, "tab-t6") - 256)).toBeLessThan(1.5);
    // vx 256 is clear of the 16 pt next chevron ([260,276)) — lands too.
    await pointer.press("id:tab-t6");

    // Touch half: the 44 pt minimums.
    const touch = await openTabs("mobile", { input: "touch" });
    expect(lastLayout(touch, "tab-t1").height).toBeGreaterThanOrEqual(44);
    expect(lastLayout(touch, "tab-t1").width).toBe(48);

    await touch.press("id:select-t5");
    const tms = await settleSelection(touch, "t5");
    expect(Math.abs(offsetOf(tms) - 80)).toBeLessThan(1.5);
    expect(Math.abs(vxOf(tms, "tab-t3") - 44)).toBeLessThan(1.5);
    expect(Math.abs(vxOf(tms, "tab-t7") - 236)).toBeLessThan(1.5);
    expect(touch.shows("id:tabs-scroll-prev")).toBe(true);
    expect(touch.shows("id:tabs-scroll-next")).toBe(true);
    expect(touch.enabled("id:tabs-scroll-prev")).toBe(true);
    expect(touch.enabled("id:tabs-scroll-next")).toBe(true);

    // Contract: the 44 pt chevron boxes cover these tab centers, so the
    // press must be refused as covered. (Currently lands — the hit-ordering
    // bug registered in the batch report.)
    await expect(touch.press("id:tab-t3")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_COVERED",
    });

    await touch.press("id:select-t5");
    await touch.waitUntil(() => geoms(touch).at(-1)?.selectedKey === "s:t5");
    await settledMeasure(touch);
    await expect(touch.press("id:tab-t7")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_COVERED",
    });
  }, 120_000);

  // adapt-sheets/tabs.md M-004 (A-002): injected touch suppresses the hover
  // dependency — `handleMouseEnter`/`Leave` neither write `hovered` nor
  // report `onHoverStart`/`End`/`Change`, the render-prop `isHovered` stays
  // false (web sticky hover cannot pin it), and `hover:opacity-70` is not
  // emitted. The default environment keeps the full hover roundtrip.
  test("M-004 touch suppresses hover state and callbacks; pointer keeps the roundtrip", async () => {
    const touch = await openTabs("mobile", { input: "touch" });

    await touch.hover("id:tab-t1");
    await touch.wait(300);
    await touch.press("id:tab-t1");
    await touch.wait(300);

    // No hover probe record of any kind for t1 — not on enter, not on the
    // press that follows, not on a synthetic leave.
    expect(callsOf(touch, "hover").filter((c) => (c[0] as { tab: string }).tab === "t1")).toHaveLength(0);
    // The render-prop flag never rose: t1's state text keeps `H0`.
    expect(touch.texts().some((t) => t.includes("H1"))).toBe(false);

    const pointer = await openTabs("mobile");
    await pointer.hover("id:tab-t1");
    await pointer.wait(300);

    const hoverCalls = callsOf(pointer, "hover").map((c) => c[0]) as {
      tab: string;
      kind: string;
      value?: boolean;
    }[];
    expect(hoverCalls).toContainEqual({ tab: "t1", kind: "start" });
    expect(hoverCalls).toContainEqual({ tab: "t1", kind: "change", value: true });
    // t1 is the selected tab: H1 (hovered) P0 (not pressed) S1 D0.
    expect(pointer.texts()).toContain("H1P0S1D0");

    await pointer.hover("id:after");
    await pointer.wait(300);
    const afterCalls = callsOf(pointer, "hover").map((c) => c[0]) as {
      tab: string;
      kind: string;
      value?: boolean;
    }[];
    expect(afterCalls).toContainEqual({ tab: "t1", kind: "end" });
    expect(afterCalls).toContainEqual({ tab: "t1", kind: "change", value: false });
    expect(pointer.texts()).toContain("H0P0S1D0");
  }, 120_000);

  // adapt-sheets/tabs.md M-005 (A-003): injected touch engages the seam —
  // `isPressed` completes the true → false roundtrip through
  // `PressableFeedbackContext`, the computed `hitSlop` is non-null for the
  // 36 pt `narrow` tab (under the 44 pt minimum) and null for the 48×44 pt
  // t1, and `enabled` reads true. The held-press channel sampling is in the
  // headless file.
  test("M-005 touch: the seam press roundtrips, hitSlop pads the narrow tab and the gate reads open", async () => {
    const app = await openTabs("mobile", { input: "touch" });

    await app.press("id:tab-t1");
    await app.waitUntil(() => callsOf(app, "ctx-pressed").filter((c) => c[0] === true).length > 0);
    await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);

    const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
    expect(edges[0]).toBe(false);
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);

    // The environment probe: gate open, t1 already meets the 44 pt minimum
    // so no slop is computed; bounds report the laid-out 48×44.
    const env = lastOf<CtxEnv>(app, "ctx-env");
    expect(env.enabled).toBe(true);
    expect(env.hitSlop).toBeNull();
    expect(env.bounds).toEqual({ width: 48, height: 44 });

    // The narrow tab (36 pt wide) gets the computed slop: (44 − 36) / 2 = 4
    // on each side, 0 top/bottom since its height already meets 44.
    const narrowEnv = lastOf<CtxEnv>(app, "narrow-ctx-env");
    expect(narrowEnv.enabled).toBe(true);
    expect(narrowEnv.hitSlop).toEqual({ top: 0, right: 4, bottom: 0, left: 4 });

    await app.press("id:tab-narrow");
    await app.waitUntil(() =>
      callsOf(app, "narrow-ctx-pressed").filter((c) => c[0] === true).length > 0,
    );
    await app.waitUntil(() => callsOf(app, "narrow-ctx-pressed").at(-1)?.[0] === false);
    const narrowEdges = callsOf(app, "narrow-ctx-pressed").map((c) => c[0] as boolean);
    expect(narrowEdges).toContain(true);
    expect(narrowEdges.at(-1)).toBe(false);

    // On-demand read after the presses: channels back at rest, gate open.
    await app.press("id:ctx-sample-t1");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.enabled).toBe(true);
  }, 120_000);

  // adapt-sheets/tabs.md M-006 (A-004): injected touch centers the selected
  // tab in the viewport on programmatic selection — `scrollAlign="center"`
  // semantics — and the same holds under `dir="rtl"` (physical coordinates,
  // no sign flip needed).
  test("M-006 touch centers the selected tab on programmatic selection, rtl included", async () => {
    const app = await openTabs("mobile", { input: "touch" });

    for (const [key, offset] of [
      ["t5", 80],
      ["t7", 176],
    ] as const) {
      await app.press(`id:select-${key}`);
      const ms = await settleSelection(app, key);
      // A-004's center target: content-x center − 140 (viewport/2).
      expect(Math.abs(offsetOf(ms) - offset)).toBeLessThan(1.5);
      // The selected tab's center lands on the viewport's center (140).
      expect(Math.abs(vxOf(ms, `tab-${key}`) - 140)).toBeLessThan(1.5);
    }

    const rtl = await openTabs("mobile", { input: "touch", rtl: "1" });
    await rtl.press("id:select-t7");
    const rts = await settleSelection(rtl, "t7");
    // Centering is physical: t7's center lands on viewport-x 140 in rtl too
    // (the raw offset reads negative under rtl's mirrored scroll origin and
    // is not asserted).
    expect(Math.abs(vxOf(rts, "tab-t7") - 140)).toBeLessThan(1.5);
  }, 120_000);

  // adapt-sheets/tabs.md M-007 (A-003): `isDisabled` on a single tab and on
  // the root both close the seam's `enabled` gate — the press is refused by
  // the host (`ERR_NSH_TEST_DISABLED`), no `selectionChange` fires and no
  // `isPressed` edge runs. Asserted in both environments.
  test("M-007 disabled tab and disabled root refuse the press and silence the seam", async () => {
    for (const scope of ["", "touch"] as const) {
      const params = (extra: Params): Params => (scope ? { ...extra, input: "touch" } : extra);

      const single = await openTabs("mobile", params({ tabdisabled: "1" }));
      expect(single.enabled("id:tab-t4")).toBe(false);
      await expect(single.press("id:tab-t4")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(single, "selectionChange")).toHaveLength(0);
      expect(callsOf(single, "t4-ctx-pressed").filter((c) => c[0] === true)).toHaveLength(0);
      expect(lastOf<CtxEnv>(single, "t4-ctx-env").enabled).toBe(false);

      const group = await openTabs("mobile", params({ disabled: "1" }));
      expect(group.enabled("id:tab-t1")).toBe(false);
      await expect(group.press("id:tab-t1")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(group, "selectionChange")).toHaveLength(0);
      expect(callsOf(group, "ctx-pressed").filter((c) => c[0] === true)).toHaveLength(0);
      expect(lastOf<CtxEnv>(group, "ctx-env").enabled).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/tabs.md M-008 (A-001): `density="compact"` tightens the
  // spacing literals one step — the tab list's padding (`p-0.5` vs `p-1`),
  // the tab's horizontal padding (`px-3` vs `px-4`, read through the
  // pxprobe child's content-box width), the panel's padding (`p-1` vs `p-2`)
  // and its top margin (`mt-2` vs `mt-4`). The uninjected environment
  // resolves `default`, identical to the explicit `density="default"`.
  test("M-008 density compact tightens padding and panel spacing one step", async () => {
    const compact = await openTabs("mobile", { density: "compact" });
    const explicit = await openTabs("mobile", { density: "default" });
    const bare = await openTabs("mobile");

    const innerWidth = (app: App) => lastLayout(app, "pxprobe-inner").width;
    const panelY = (app: App) => lastLayout(app, "panel-t1").y;
    const panelH = (app: App) => lastLayout(app, "panel-t1").height;
    const listH = (app: App) => lastLayout(app, "tablist").height;

    // `px-4` (16 pt each side) → inner 16 pt; `px-3` (12 pt) → inner 24 pt.
    expect(innerWidth(compact)).toBeGreaterThan(innerWidth(explicit));
    expect(innerWidth(bare)).toBe(innerWidth(explicit));

    // `p-2`/`mt-4` → `p-1`/`mt-2`: the panel sits higher and is shorter.
    expect(panelY(compact)).toBeLessThan(panelY(explicit));
    expect(panelH(compact)).toBeLessThan(panelH(explicit));
    expect(panelY(bare)).toBe(panelY(explicit));

    // `p-1` (4 pt) → `p-0.5` (2 pt) on a 32 pt tab row: list height 52 → 48.
    expect(listH(compact)).toBeLessThan(listH(explicit));
    expect(listH(bare)).toBe(listH(explicit));
  }, 120_000);

  // adapt-sheets/tabs.md M-010 (A-005, 基线): the existing cases under
  // `input="touch"` keep every desktop semantic the pointer tests pin —
  // silent default selection, `onSelectionChange` payloads, disabled-key
  // skipping, duplicate-selection reporting, the all-disabled rescue, the
  // disabled-default rescue — plus the keyboard activation semantics on
  // the web target (where Tab/arrows/Return reach the collection).
  test("M-010 existing cases under touch keep the desktop selection semantics", async () => {
    // heroui (T-005/T-007 duals): silent mount, payload on press, disabled
    // tab refused.
    const heroui = await openTabs("heroui", { input: "touch" });
    expect(selectionCalls(heroui)).toHaveLength(0);
    expect(panelText(heroui, "Overview panel")).toBe(true);

    await tab(heroui, "Analytics");
    expect(selectionCalls(heroui)).toHaveLength(1);
    expect(selectionCalls(heroui)[0][0]).toBe("analytics");
    expect(panelText(heroui, "Analytics panel")).toBe(true);
    expect(panelText(heroui, "Overview panel")).toBe(false);

    expect(heroui.enabled("role:tab[Reports]")).toBe(false);
    await expect(tab(heroui, "Reports")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(selectionCalls(heroui)).toHaveLength(1);

    // kobalte-plain (T-016/T-023 duals): press selects with the payload,
    // and pressing the selected tab reports it again.
    const plain = await openTabs("kobalte-plain", { input: "touch" });
    await tab(plain, "Analytics");
    expect(selectionCalls(plain)).toHaveLength(1);
    expect(selectionCalls(plain)[0][0]).toBe("analytics");
    expect(panelText(plain, "Analytics panel")).toBe(true);

    await tab(plain, "Overview");
    expect(selectionCalls(plain)).toHaveLength(2);
    expect(selectionCalls(plain)[1][0]).toBe("overview");
    expect(panelText(plain, "Overview panel")).toBe(true);

    // kobalte-disabled-middle (T-020 dual).
    const middle = await openTabs("kobalte-disabled-middle", { input: "touch" });
    expect(middle.enabled("role:tab[Analytics]")).toBe(false);
    await expect(tab(middle, "Analytics")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(selectionCalls(middle)).toHaveLength(0);
    expect(panelText(middle, "Overview panel")).toBe(true);

    // kobalte-all-disabled (T-021 dual): the fallback still reports once.
    const all = await openTabs("kobalte-all-disabled", { input: "touch" });
    expect(all.enabled("role:tab[Overview]")).toBe(false);
    expect(panelText(all, "Overview panel")).toBe(true);
    expect(selectionCalls(all)).toHaveLength(1);
    expect(selectionCalls(all)[0][0]).toBe("overview");

    // kobalte-default-disabled (X-001 dual): explicit disabled default stays
    // selected and silent.
    const dflt = await openTabs("kobalte-default-disabled", { input: "touch" });
    expect(panelText(dflt, "Reports panel")).toBe(true);
    expect(selectionCalls(dflt)).toHaveLength(0);

    // Keyboard activation on the web target under touch (T-011/T-015/T-017/
    // T-018 duals): `keyboardActivation` semantics are input-independent.
    const manual = await open("../../../tabs.fixtures.tsx", {
      platform: "web",
      host: { params: { case: "kobalte-manual", input: "touch" } },
    });
    await manual.keyboard.press("tab");
    expect(focusTrail(manual)).toEqual(["overview"]);
    expect(panelText(manual, "Overview panel")).toBe(true);

    await manual.keyboard.press("arrowright");
    expect(focusTrail(manual)).toEqual(["overview", "analytics"]);
    expect(panelText(manual, "Overview panel")).toBe(true);
    expect(selectionCalls(manual)).toHaveLength(0);

    await manual.keyboard.press("arrowright");
    await manual.keyboard.press("enter");
    expect(panelText(manual, "Reports panel")).toBe(true);
    expect(selectionCalls(manual)).toHaveLength(1);
    expect(selectionCalls(manual)[0][0]).toBe("reports");

    const auto = await open("../../../tabs.fixtures.tsx", {
      platform: "web",
      host: { params: { case: "kobalte-plain", input: "touch" } },
    });
    await auto.keyboard.press("tab");
    await auto.keyboard.press("arrowright");
    expect(panelText(auto, "Analytics panel")).toBe(true);
    expect(panelText(auto, "Overview panel")).toBe(false);

    const group = await open("../../../tabs.fixtures.tsx", {
      platform: "web",
      host: { params: { case: "kobalte-disabled-group", input: "touch" } },
    });
    await group.keyboard.press("tab");
    expect(focusTrail(group)).toEqual(["after"]);

    const dfltSel = await open("../../../tabs.fixtures.tsx", {
      platform: "web",
      host: { params: { case: "kobalte-default-analytics", input: "touch" } },
    });
    await dfltSel.keyboard.press("tab");
    expect(focusTrail(dfltSel)).toEqual(["analytics"]);
  }, 120_000);

  // adapt-sheets/tabs.md M-011 (基线): desktop zero drift — the press
  // chain's event order, the `selectionChange` payload, the chevron
  // `scrollBy(0.8 page)` step and the `dir="rtl"` paging direction all
  // match the desktop assertions the existing files pin.
  test("M-011 pointer baseline: event order, selection payload, chevron step and rtl direction", async () => {
    const app = await openTabs("mobile");

    await app.press("id:tab-t2");
    await app.waitUntil(() => eventsOf(app, "t2").length >= 8);
    expect(eventsOf(app, "t2").map((e) => e.kind)).toEqual([
      "start",
      "down",
      "chg",
      "chg",
      "up",
      "end",
      "press",
      "click",
    ]);
    expect(selectionCalls(app)).toEqual([["t2"]]);

    // Chevron paging: `scrollBy(1)` = 0.8 × 280 = 224 pt, clamped to
    // maxScroll 244. From offset 0 with t5 selected (already fully
    // visible), the next press must advance the strip by the full step.
    await app.press("id:select-t5");
    await app.waitUntil(() => geoms(app).at(-1)?.selectedKey === "s:t5");
    let ms = await settledMeasure(app);
    expect(Math.abs(offsetOf(ms) - 0)).toBeLessThan(1.5);

    await app.press("id:tabs-scroll-next");
    ms = await settledMeasure(app);
    expect(Math.abs(offsetOf(ms) - 224)).toBeLessThan(2);

    await app.press("id:tabs-scroll-prev");
    ms = await settledMeasure(app);
    expect(Math.abs(offsetOf(ms) - 0)).toBeLessThan(2);

    // rtl: the same chevron pair pages in the mirrored direction —
    // `scrollBy` flips the delta sign under `dir="rtl"`.
    const rtl = await openTabs("mobile", { rtl: "1" });
    await rtl.press("id:select-t5");
    await rtl.waitUntil(() => geoms(rtl).at(-1)?.selectedKey === "s:t5");
    const before = offsetOf(await settledMeasure(rtl));

    await rtl.press("id:tabs-scroll-prev");
    const after = offsetOf(await settledMeasure(rtl));
    // Contract: a full 224 pt page in the rtl-appropriate direction.
    expect(Math.abs(Math.abs(after - before) - 224)).toBeLessThan(2);
  }, 120_000);

  // adapt-sheets/tabs.md M-013 (A-008): the fixture itself mounts and
  // answers every probe in both environments — no scope (pointer default),
  // `input="touch"` and `density="compact"`.
  test("M-013 the fixture mounts in every environment and every probe records", async () => {
    for (const params of [{}, { input: "touch" }, { density: "compact" }] as Params[]) {
      const app = await openTabs("mobile", params);
      expect(app.shows("id:tab-t1")).toBe(true);
      expect(app.shows("id:tab-t5")).toBe(true);
      expect(app.shows("id:measure-all")).toBe(true);

      const env = lastOf<CtxEnv>(app, "ctx-env");
      expect(typeof env.enabled).toBe("boolean");
      expect(lastLayout(app, "tab-t1").height).toBeGreaterThan(0);

      await app.press("id:tab-t2");
      await app.waitUntil(() => eventsOf(app, "t2").length >= 8);
      expect(selectionCalls(app)).toEqual([["t2"]]);

      const before = measures(app).length;
      await app.press("id:measure-all");
      await app.waitUntil(() => measures(app).length >= before + 12);
      expect(geoms(app).length).toBeGreaterThan(0);
    }
  }, 120_000);
});
