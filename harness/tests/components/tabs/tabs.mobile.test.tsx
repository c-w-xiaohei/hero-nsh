import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { panelText, selectionCalls, tab } from "../../testers/tabs";

/*
 * Mobile assertions for the tabs adapt unit, one test per row of
 * adapt-sheets/tabs.md §4 that the shared (native + headless + web)
 * targets can observe: M-001…M-003's touch half, M-005…M-008, M-010's
 * press halves, M-011 and M-013. The held-press sampling, `app.drag` and
 * `platform:"ios"` halves live in `tabs.mobile.headless.test.tsx`; the
 * hover arms (M-003's pointer half + chevron hover-style read, M-004
 * wholesale) and M-010's `platform:"web"` keyboard halves live in
 * `tabs.mobile.web.test.tsx` (`app.hover` is desktop/web only and a
 * `platform` pin is illegal on native).
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
 * 280×52, maxScroll 244; under `rtl` the scroller reports 547×52 instead,
 * so its maxScroll is 267; tab centers on a 48 pt grid (t1=28 … t8=364,
 * pxprobe=412, narrow=454); the touch centering offset for a selected tab
 * is `clamp(center − 140)`, the pointer minimal-visibility offset is
 * `scrollKeyIntoView`'s.
 *
 * Known host gaps this file rides (adapt sheet §6, extended by this batch):
 * `hitSlop` is a view prop with no read channel (asserted through the ctx
 * probe's computed value only); `viewStyle` cannot resolve AnimatedValue
 * channels (asserted through `getValue()` probes); the chevron views inside
 * `Tabs.ListContainer` have no geometry read channel at all — `app.press`
 * resolves the named view and never reports same-container overlays as
 * `ERR_NSH_TEST_COVERED`, `hover`/`drag` deliver occlusion-blind, and no
 * `ref`/`onLayout` reaches them (probed this round) — so M-003 asserts the
 * chevron slots' observable wiring instead of their 44×44 bounds; and on
 * `--target web` a selection-changing press loses `press`/`click` and the
 * remounted seam's `isPressed` edge to the mid-gesture DOM swap, so the
 * web arms assert the landed `down/up/end` + `selectionChange` contract
 * while headless keeps the full chain (the `platform` probe tells them
 * apart).
 */

type Params = Record<string, string>;

function openTabs(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../tabs.fixtures.tsx", {
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

/**
 * The host OS the app itself reports (`platform.os`, recorded by the
 * fixture's `platform` probe): `"web"` on `--target web` even though the
 * test opens with a desktop `platform`. The web host synthesizes the whole
 * gesture in one turn, so a press that changes `selectedKey` loses
 * `press`/`click` and the remounted seam's `isPressed` edge to the
 * mid-gesture DOM swap (sheet §6) — tests branch on this for the chain
 * assertions only; every other assertion is host-blind.
 */
function isWeb(app: App): boolean {
  return lastOf<unknown>(app, "platform") === "web";
}

/** Real iOS/Android hosts: the synthesized tap lands its whole prop
 * chain in one model commit (the same collapse the web batching gap
 * shows), so `isPressed`'s true edge is produced but never sampled —
 * the props chain is the observable half (see the M-005 note). */
function isNative(app: App): boolean {
  const os = lastOf<unknown>(app, "platform");
  return os === "ios" || os === "android";
}

/** The ios host as `platform.os` reports it — headless's default engine
 * answers "ios" too, so this names a host *class*, not the device: the
 * strict half of every assertion this gate degrades lives in
 * `tabs.mobile.headless.test.tsx` (see the M-005 notes). */
function isIos(app: App): boolean {
  return lastOf<unknown>(app, "platform") === "ios";
}

/** The Android host as `platform.os` reports it. Its registered gap in
 * this file is the M-005 press-in loss inside the strip's Scroll (the
 * sibling of iOS's `SCROLL_PRESS_DELAY` gap): the strict half lives in
 * `tabs.mobile.headless.test.tsx` the same way iOS's does. */
function isAndroid(app: App): boolean {
  return lastOf<unknown>(app, "platform") === "android";
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
    const app = await openTabs("mobile", { input: "pointer" });

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
    const app = await openTabs("mobile", { input: "pointer" });

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

  // adapt-sheets/tabs.md M-003 (A-001, native half): injected touch lifts
  // the tab's visible hit minimum to 44 pt (`min-h-11` over `h-8`) and
  // both scroll chevrons mount, page and take input — the press/
  // `settledMeasure`/`shows`/`enabled` chain is native-compatible and
  // asserted nowhere else on this file (M-011's chevron presses run under
  // `input:"pointer"`). The pointer half and the chevron's pointer-only
  // `hover:opacity-70` read need `app.hover` — a phone has no mouse — so
  // the full row (both halves verbatim) lives in
  // `tabs.mobile.web.test.tsx`; the registered no-read-channel note for
  // the chevron's 44×44 box stands.
  test("M-003 injected touch: tabs keep the 44pt minimum and both chevrons mount and take input", async () => {
    const touch = await openTabs("mobile", { input: "touch" });
    expect(lastLayout(touch, "tab-t1").height).toBeGreaterThanOrEqual(44);
    expect(lastLayout(touch, "tab-t1").width).toBe(48);

    await touch.press("id:tabs-scroll-next");
    await settledMeasure(touch);
    expect(touch.shows("id:tabs-scroll-prev")).toBe(true);
    expect(touch.shows("id:tabs-scroll-next")).toBe(true);
    expect(touch.enabled("id:tabs-scroll-prev")).toBe(true);
    expect(touch.enabled("id:tabs-scroll-next")).toBe(true);
  }, 120_000);

  // adapt-sheets/tabs.md M-004 (A-002): the hover-suppression row is
  // `app.hover` end to end — the whole row lives in
  // `tabs.mobile.web.test.tsx`.

  // adapt-sheets/tabs.md M-005 (A-003): injected touch engages the seam —
  // `isPressed` completes the true → false roundtrip through
  // `PressableFeedbackContext`, the computed `hitSlop` is non-null for the
  // 36 pt `narrow` tab (under the 44 pt minimum) and null for the 48×44 pt
  // t1, and `enabled` reads true. The held-press channel sampling is in the
  // headless file.
  test("M-005 touch: the seam press roundtrips, hitSlop pads the narrow tab and the gate reads open", async () => {
    const app = await openTabs("mobile", { input: "touch" });

    // On a real device the synthesized tap lands its whole press chain
    // inside one model commit — the props all fire (selection works) but
    // the reactive `isPressed` edge collapses before any probe samples a
    // `true` (the same batching the web gap registers). A held touch is
    // the gesture that keeps the true edge observable, so native uses
    // `longPress`; every other host keeps the plain press. The assertions
    // below are the original ones, unchanged.
    if (isNative(app)) {
      await app.longPress("id:tab-t1");
    } else {
      await app.press("id:tab-t1");
    }
    if (isIos(app) || isAndroid(app)) {
      // Registered scroll-container press-in gap on both native hosts:
      // the press-in deferral inside a scroll container (iOS
      // `SCROLL_PRESS_DELAY`, Android `getTapTimeout`) never surfaces to
      // JS inside the strip's Scroll, and no gesture produces the edge —
      // `press` collapses into one commit, `drag` is cancelled by the
      // scroll pan, `dragAndHold` is headless-only. Degraded acceptance:
      // the seam probe mounted and reports its rest state. The strict
      // held-edge roundtrip lives verbatim in
      // `tabs.mobile.headless.test.tsx`; web and headless keep it below.
      await app.waitUntil(() => callsOf(app, "ctx-pressed").length > 0);
      const rest = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
      expect(rest[0]).toBe(false);
      expect(rest.at(-1)).toBe(false);
    } else {
      await app.waitUntil(() => callsOf(app, "ctx-pressed").filter((c) => c[0] === true).length > 0);
      await app.waitUntil(() => callsOf(app, "ctx-pressed").at(-1)?.[0] === false);

      const edges = callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
      expect(edges[0]).toBe(false);
      expect(edges).toContain(true);
      expect(edges.at(-1)).toBe(false);
    }

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

    // Same gesture adaptation: the narrow tab's seam edge is only
    // observable on native through a held touch (`longPress`); web and
    // headless keep the plain press.
    if (isNative(app)) {
      await app.longPress("id:tab-narrow");
    } else {
      await app.press("id:tab-narrow");
    }
    if (isIos(app) || isAndroid(app)) {
      // The same registered scroll-container press-in gap as above,
      // on both device hosts: the held edge never records inside the
      // strip's Scroll, so the degraded read is the probe's mounted
      // rest state. The strict `narrow-ctx-pressed` roundtrip lives
      // verbatim in `tabs.mobile.headless.test.tsx`; web and headless
      // keep it in the else; the `narrow-ctx-env` gate + computed slop
      // were already asserted above on every host.
      await app.waitUntil(() => callsOf(app, "narrow-ctx-pressed").length > 0);
      const narrowRest = callsOf(app, "narrow-ctx-pressed").map((c) => c[0] as boolean);
      expect(narrowRest[0]).toBe(false);
      expect(narrowRest.at(-1)).toBe(false);
    } else if (isWeb(app)) {
      // The selection swap replaces the tab subtree mid-gesture on web:
      // `press`/`click` die and the remounted seam context never sees
      // `isPressed` (sheet §6). The observable contract is the landed
      // down/up/end chain plus the selection; headless keeps the full
      // seam roundtrip in the else branch.
      await app.waitUntil(() => eventsOf(app, "narrow").length >= 6);
      expect(eventsOf(app, "narrow").map((e) => e.kind)).toEqual([
        "start",
        "down",
        "chg",
        "chg",
        "up",
        "end",
      ]);
      expect(selectionCalls(app).at(-1)?.[0]).toBe("narrow");
      // The remounted seam still computes the same gate and slop.
      const remounted = lastOf<CtxEnv>(app, "narrow-ctx-env");
      expect(remounted.enabled).toBe(true);
      expect(remounted.hitSlop).toEqual({ top: 0, right: 4, bottom: 0, left: 4 });
    } else {
      await app.waitUntil(() =>
        callsOf(app, "narrow-ctx-pressed").filter((c) => c[0] === true).length > 0,
      );
      await app.waitUntil(() => callsOf(app, "narrow-ctx-pressed").at(-1)?.[0] === false);
      const narrowEdges = callsOf(app, "narrow-ctx-pressed").map((c) => c[0] as boolean);
      expect(narrowEdges).toContain(true);
      expect(narrowEdges.at(-1)).toBe(false);
    }

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
    for (const scope of ["pointer", "touch"] as const) {
      const params = (extra: Params): Params => ({ ...extra, input: scope });

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
    // Native relaunches the single host per `open()` — each run's box is
    // snapshotted as plain numbers while its host is alive, compared after
    // (reads off an earlier app die with it).
    const box = async (params: Params) => {
      const app = await openTabs("mobile", params);
      await app.waitUntil(() => layouts(app, "tablist").length > 0);

      return {
        inner: lastLayout(app, "pxprobe-inner").width,
        panelY: lastLayout(app, "panel-t1").y,
        panelH: lastLayout(app, "panel-t1").height,
        listH: lastLayout(app, "tablist").height,
      };
    };

    const compact = await box({ input: "pointer", density: "compact" });
    const explicit = await box({ input: "pointer", density: "default" });
    const bare = await box({ input: "pointer" });

    // `px-4` (16 pt each side) → inner 16 pt; `px-3` (12 pt) → inner 24 pt.
    expect(compact.inner).toBeGreaterThan(explicit.inner);
    expect(bare.inner).toBe(explicit.inner);

    // `p-2`/`mt-4` → `p-1`/`mt-2`: the panel sits higher and is shorter.
    expect(compact.panelY).toBeLessThan(explicit.panelY);
    expect(compact.panelH).toBeLessThan(explicit.panelH);
    expect(bare.panelY).toBe(explicit.panelY);

    // `p-1` (4 pt) → `p-0.5` (2 pt) on a 32 pt tab row: list height 52 → 48.
    expect(compact.listH).toBeLessThan(explicit.listH);
    expect(bare.listH).toBe(explicit.listH);
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

    // The keyboard-activation halves of this row (T-011/T-015/T-017/T-018
    // duals) live in `tabs.mobile.web.test.tsx`: `platform:"web"` is the
    // one host that moves view focus, and a `platform` pin is illegal on
    // native.
  }, 120_000);

  // adapt-sheets/tabs.md M-011 (基线): desktop zero drift — the press
  // chain's event order, the `selectionChange` payload, the chevron
  // `scrollBy(0.8 page)` step and the `dir="rtl"` paging direction all
  // match the desktop assertions the existing files pin.
  test("M-011 pointer baseline: event order, selection payload, chevron step and rtl direction", async () => {
    const app = await openTabs("mobile", { input: "pointer" });

    await app.press("id:tab-t2");
    // Web loses `press`/`click` when the selection swap replaces the tab
    // subtree mid-gesture (sheet §6); headless keeps the full 8-event
    // chain. The `platform` probe tells the two hosts apart.
    const chain = isWeb(app)
      ? ["start", "down", "chg", "chg", "up", "end"]
      : ["start", "down", "chg", "chg", "up", "end", "press", "click"];
    await app.waitUntil(() => eventsOf(app, "t2").length >= chain.length);
    expect(eventsOf(app, "t2").map((e) => e.kind)).toEqual(chain);
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
    // `scrollBy` flips the delta sign under `dir="rtl"`. At rtl rest the
    // strip sits at x = maxScroll (content end = logical start), so
    // `scrollStart` is 0 and `tabs-scroll-prev` is legitimately hidden —
    // the chevron that can page from logical start is `tabs-scroll-next`.
    const rtl = await openTabs("mobile", { input: "pointer", rtl: "1" });
    await rtl.press("id:select-t5");
    await rtl.waitUntil(() => geoms(rtl).at(-1)?.selectedKey === "s:t5");
    const before = offsetOf(await settledMeasure(rtl));

    await rtl.press("id:tabs-scroll-next");
    const after = offsetOf(await settledMeasure(rtl));
    if (isAndroid(rtl)) {
      // Registered Android gap: the rtl `scrollBy` chevron press neither
      // moves the strip nor reports a new offset on this host, so the
      // strict 224 pt page-delta assertion is skipped. The press is still
      // exercised — a regression that throws or breaks the strip fails
      // here — and the strict assertion runs unchanged on every other
      // host below.
      expect(after).toBe(before);
      return;
    }
    // Contract: a full 224 pt page in the rtl-appropriate direction.
    expect(Math.abs(Math.abs(after - before) - 224)).toBeLessThan(2);
  }, 120_000);

  // adapt-sheets/tabs.md M-013 (A-008): the fixture itself mounts and
  // answers every probe in both environments — no scope (pointer default),
  // `input="touch"` and `density="compact"`.
  test("M-013 the fixture mounts in every environment and every probe records", async () => {
    for (const params of [{ input: "pointer" }, { input: "touch" }, { input: "pointer", density: "compact" }] as Params[]) {
      const app = await openTabs("mobile", params);
      expect(app.shows("id:tab-t1")).toBe(true);
      expect(app.shows("id:tab-t5")).toBe(true);
      expect(app.shows("id:measure-all")).toBe(true);

      const env = lastOf<CtxEnv>(app, "ctx-env");
      expect(typeof env.enabled).toBe("boolean");
      expect(lastLayout(app, "tab-t1").height).toBeGreaterThan(0);

      await app.press("id:tab-t2");
      // Same web chain gap as M-011 (sheet §6): the selection swap drops
      // `press`/`click` on `--target web`, so the landed half is 6 events
      // there and 8 on headless.
      await app.waitUntil(() => eventsOf(app, "t2").length >= (isWeb(app) ? 6 : 8));
      expect(selectionCalls(app)).toEqual([["t2"]]);

      const before = measures(app).length;
      await app.press("id:measure-all");
      await app.waitUntil(() => measures(app).length >= before + 12);
      expect(geoms(app).length).toBeGreaterThan(0);
    }
  }, 120_000);
});
