import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";
import {
  dayCellLabel,
  dayCellSelector,
  dayNumberStyle,
  lastLayout,
  openYearPicker,
  rangeValues,
  lastRangeValue,
  selectYear,
} from "../../testers/range-calendar";

/*
 * Mobile assertions for the range-calendar adapt unit — one test per row of
 * adapt-sheets/range-calendar.md §4 (M-001…M-010, M-012…M-014; M-011 needs
 * `dragAndHold`/`drop` and lives in `range-calendar.mobile.headless.test.tsx`).
 * One file for headless+web: every assertion reads what `nsh/test` observes —
 * `shows`, `count`, `enabled`, `viewStyle`, `onLayout` probe payloads and
 * `app.storage()` seam probes — and `host.params.scope` picks the
 * environment, so the dual-environment rows run identically on both targets.
 *
 * The fixture is `harness/range-calendar.fixtures.tsx`, opened by
 * `host.params`: `case` (default/disabled/readonly/unavailable/
 * unavailable-range/noncontiguous/range-start/range-end/nav-disabled/
 * class-override/today/indicator/duration), `scope` ("" = host default
 * pointer, "touch" = EnvironmentScope input="touch"), `weekday`.
 *
 * Probe surfaces: layout (root/grid/nav/header/day/dot bounds),
 * `range-change`/`focus-change`/`picker-change`/`cell-press`/`day-focus`/
 * `cell-hover`/`unavailable-args` (contract callbacks), and
 * `seam-env`/`seam-edge`/`seam-state` (the RangeCalendarContextValue
 * navButtonFeedback/cellFeedback channels plus the two-press state machine's
 * anchor/invalid/value — the seam's only observable surface, sheet §6).
 */

type Params = Record<string, string>;

function openCal(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../range-calendar.fixtures.tsx", {
    // The default half of the sheet's dual environment is `platform.desktop`
    // === true — the same host the desktop contract runs on. `EnvironmentScope`
    // supplies the injected touch half.
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

type Edges =
  | { top?: number; right?: number; bottom?: number; left?: number }
  | number
  | null;

type Channel = {
  enabled: boolean;
  isPressed: boolean;
  hitSlop: Edges;
  bounds: { width: number; height: number };
  origin: { x: number; y: number } | null;
};

type RangeStateProbe = {
  anchor: string | null;
  invalid: boolean;
  value: { start: string; end: string } | null;
};

type SeamEnv = RangeStateProbe & {
  input: string;
  cellCount: number;
  nav: {
    previous: { enabled: boolean; isPressed: boolean; hitSlop: Edges } | null;
    next: { enabled: boolean; isPressed: boolean; hitSlop: Edges } | null;
  };
};

type SeamEdge = {
  cells: string[];
  nav: { previous: boolean; next: boolean };
  anchor: string | null;
  invalid: boolean;
  value: { start: string; end: string } | null;
};

type SeamState = RangeStateProbe & {
  input: string;
  cellCount: number;
  nav: { previous: Channel | null; next: Channel | null };
  cells: ({ date: string } & Channel)[];
};

const BOTH: Params[] = [{}, { scope: "touch" }];

function layoutEntries(app: App): LayoutEntry[] {
  return callsOf(app, "layout").map((c) => c[0] as LayoutEntry);
}

async function waitForLayout(app: App, name: string): Promise<void> {
  await app.waitUntil(() =>
    callsOf(app, "layout").some((c) => (c[0] as LayoutEntry).name === name),
  { timeout: 15_000 } );
}

function seamEnvs(app: App): SeamEnv[] {
  return callsOf(app, "seam-env").map((c) => c[0] as SeamEnv);
}

function lastSeamEnv(app: App): SeamEnv {
  return seamEnvs(app).at(-1)!;
}

function seamEdges(app: App): SeamEdge[] {
  return callsOf(app, "seam-edge").map((c) => c[0] as SeamEdge);
}

function seamStates(app: App): SeamState[] {
  return callsOf(app, "seam-state").map((c) => c[0] as SeamState);
}

function lastSeamState(app: App): SeamState {
  return seamStates(app).at(-1)!;
}

function cellOf(state: SeamState, date: string) {
  return state.cells.find((c) => c.date === date);
}

/** Today's ISO date on the test host's calendar — the `today` case's month. */
function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A same-month neighbour of `iso`, ten days away, clamped inside the month. */
function siblingIso(iso: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  const sibling = (day! > 15 ? day! - 10 : day! + 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month!)}-${pad(sibling)}`;
}

describe("range-calendar mobile", () => {
  // adapt-sheets/range-calendar.md M-001 (A-001, A-002): the `input` axis'
  // `w-77` gives the touch root its 308pt width — seven 44pt columns — while
  // the pointer default keeps `w-63`/252pt and 36pt cells. `aspect-square`
  // keeps the cell button square; the seam's `bounds` channel measures the
  // track that carries it (the outer `role=cell` adds the row's 4pt pitch).
  test("M-001 touch root measures 308pt with 44pt cells, default keeps 252pt/36pt", async () => {
    const touch = await openCal("default", { scope: "touch" });
    await waitForLayout(touch, "day-2026-08-15");

    const root = lastLayout(touch, "root");
    expect(root.width).toBeGreaterThan(300);
    expect(root.width).toBeLessThan(316);
    const cell = lastLayout(touch, "day-2026-08-15");
    expect(cell.width).toBeGreaterThanOrEqual(43.5);

    // The aspect-square half lives on the track the seam's `bounds` reports.
    await touch.press("id:rc-sample");
    await touch.waitUntil(() => callsOf(touch, "seam-state").length > 0, { timeout: 15_000 } );
    const track = cellOf(lastSeamState(touch), "2026-08-15")!;
    expect(track.bounds.width).toBeGreaterThanOrEqual(43.5);
    expect(Math.abs(track.bounds.height - track.bounds.width)).toBeLessThanOrEqual(1.5);
    touch.dispose();

    const pointer = await openCal("default");
    await waitForLayout(pointer, "day-2026-08-15");

    const rootP = lastLayout(pointer, "root");
    expect(rootP.width).toBeGreaterThan(248);
    expect(rootP.width).toBeLessThan(256);
    const cellP = lastLayout(pointer, "day-2026-08-15");
    expect(cellP.width).toBeGreaterThan(34);
    expect(cellP.width).toBeLessThan(38);

    await pointer.press("id:rc-sample");
    await pointer.waitUntil(() => callsOf(pointer, "seam-state").length > 0, { timeout: 15_000 } );
    const trackP = cellOf(lastSeamState(pointer), "2026-08-15")!;
    expect(trackP.bounds.width).toBeGreaterThan(34);
    expect(trackP.bounds.width).toBeLessThan(38);
    expect(Math.abs(trackP.bounds.height - trackP.bounds.width)).toBeLessThanOrEqual(1.5);
    pointer.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-002 (A-001, A-003): under touch the nav
  // button's `size-11` measures 44×44 and its seam reports `enabled` — the
  // computed `hitSlop` answers per the press-feedback contract (undefined at
  // the 44pt target; sheet §6's registered hitSlop gap means the probe reads
  // the computed value, not a view prop). A held press round-trips
  // `isPressed`. The default environment keeps 24×24 with the seam gated off.
  test("M-002 touch nav buttons measure 44pt with the seam enabled, default keeps 24pt gated off", async () => {
    const touch = await openCal("default", { scope: "touch" });
    await waitForLayout(touch, "nav-next");
    await touch.waitUntil(() => callsOf(touch, "seam-env").length > 0, { timeout: 15_000 } );

    for (const slot of ["nav-previous", "nav-next"] as const) {
      const bounds = lastLayout(touch, slot);
      expect(bounds.width).toBeGreaterThanOrEqual(43.5);
      expect(bounds.height).toBeGreaterThanOrEqual(43.5);
    }

    const env = lastSeamEnv(touch);
    expect(env.input).toBe("touch");
    for (const slot of ["previous", "next"] as const) {
      const ch = env.nav[slot];
      expect(ch).not.toBeNull();
      expect(ch!.enabled).toBe(true);
      expect(ch!.isPressed).toBe(false);
      // 44pt visible size already meets the minimum target: zero padding.
      expect(ch!.hitSlop).toBeNull();
    }

    // `isPressed` round-trip: hold Next, the seam's flag rises; release settles.
    await touch.longPress("role:button[/^Next$/]");
    await touch.waitUntil(() =>
      seamStates(touch).some(
        (s) => s.nav.next?.isPressed === true && s.nav.next.enabled === true,
      ),
    { timeout: 15_000 } );
    await touch.press("id:rc-sample");
    await touch.waitUntil(() => callsOf(touch, "seam-state").length > 0, { timeout: 15_000 } );
    const settled = lastSeamState(touch);
    expect(settled.nav.next?.isPressed).toBe(false);
    expect(settled.nav.next?.enabled).toBe(true);
    touch.dispose();

    const pointer = await openCal("default");
    await waitForLayout(pointer, "nav-next");
    await pointer.waitUntil(() => callsOf(pointer, "seam-env").length > 0, { timeout: 15_000 } );

    for (const slot of ["nav-previous", "nav-next"] as const) {
      const bounds = lastLayout(pointer, slot);
      expect(bounds.width).toBeGreaterThan(22);
      expect(bounds.width).toBeLessThan(26);
      expect(bounds.height).toBeGreaterThan(22);
      expect(bounds.height).toBeLessThan(26);
    }

    const envP = lastSeamEnv(pointer);
    expect(envP.input).toBe("pointer");
    for (const slot of ["previous", "next"] as const) {
      const ch = envP.nav[slot];
      expect(ch).not.toBeNull();
      expect(ch!.enabled).toBe(false);
      expect(ch!.isPressed).toBe(false);
      expect(ch!.hitSlop).toBeNull();
    }
    pointer.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-003 (A-004, 负断言): under the default
  // pointer environment the cell seam never engages — no `isPressed` edge,
  // every channel gated off, no hitSlop anywhere — while the two-press
  // select chain is byte-identical to desktop.
  test("M-003 default environment: cell seam never presses and the two-step chain holds", async () => {
    const app = await openCal("default");
    await waitForLayout(app, "day-2026-08-20");

    await app.press(dayCellSelector("2026-08-20"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 1, { timeout: 15_000 } );
    expect(rangeValues(app)).toEqual([{ start: "2026-08-20", end: "2026-08-20" }]);

    await app.press(dayCellSelector("2026-08-22"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 2, { timeout: 15_000 } );
    expect(lastRangeValue(app)).toEqual({ start: "2026-08-20", end: "2026-08-22" });

    const edges = seamEdges(app);
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      expect(edge.cells).toEqual([]);
      expect(edge.nav.previous).toBe(false);
      expect(edge.nav.next).toBe(false);
    }

    await app.press("id:rc-sample");
    await app.waitUntil(() => callsOf(app, "seam-state").length > 0, { timeout: 15_000 } );
    const state = lastSeamState(app);
    expect(state.input).toBe("pointer");
    expect(state.cells.length).toBeGreaterThan(28);
    for (const cell of state.cells) {
      expect(cell.enabled).toBe(false);
      expect(cell.isPressed).toBe(false);
      expect(cell.hitSlop).toBeNull();
    }
    for (const slot of ["previous", "next"] as const) {
      const ch = state.nav[slot];
      expect(ch).not.toBeNull();
      expect(ch!.enabled).toBe(false);
      expect(ch!.isPressed).toBe(false);
      expect(ch!.hitSlop).toBeNull();
    }
    app.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-004 (A-001, A-004): under touch the
  // cell's hover classes are not emitted (`input() !== "touch"` gate), so a
  // hover — sticky on web — leaves no background path. What `nsh/test` can
  // observe here: the cell's `onHoverStart`/`onHoverEnd` contract still
  // fires under touch (the `hovered` signal is contract surface), presses
  // still commit, and the component's one selector-readable hover surface —
  // the nav button's `hover:bg-default` — provably resolves under pointer
  // and stays empty under touch. The cell's own painted view sits one level
  // below `role=button` with no selector identity, so its sticky-hover pixel
  // residue is sheet §6's registered host gap (real-device acceptance).
  test("M-004 injected touch: hover events still arrive and no hover paint lingers; pointer hover paints", async () => {
    const today = todayIso();
    const plain = siblingIso(today);
    const plainSel = dayCellSelector(plain);
    const todaySel = dayCellSelector(today);
    const NEXT = "role:button[/^Next$/]";

    const touch = await openCal("today", { scope: "touch" });
    await waitForLayout(touch, `day-${today}`);

    // The hover contract still records under touch — only the paint is gated.
    await touch.hover(plainSel);
    await touch.waitUntil(() =>
      callsOf(touch, "cell-hover").some((c) => c[0] === `${plain}:start`),
    { timeout: 15_000 } );
    await touch.hover(todaySel);
    await touch.waitUntil(() =>
      callsOf(touch, "cell-hover").some((c) => c[0] === `${today}:start`),
    { timeout: 15_000 } );

    // Presses on the plain and the today cell still commit the two-step chain.
    await touch.press(plainSel);
    await touch.waitUntil(() => callsOf(touch, "range-change").length === 1, { timeout: 15_000 } );
    await touch.press(todaySel);
    await touch.waitUntil(() => callsOf(touch, "range-change").length === 2, { timeout: 15_000 } );

    // The readable hover surface: `hover:bg-default` on the nav button is
    // gated off under touch — nothing paints on hover, and nothing lingers
    // after the press that follows it (the sticky-hover half).
    const navBg = () => touch.viewStyle(NEXT)?.backgroundColor ?? null;
    await touch.hover(NEXT);
    await touch.wait(150);
    expect(navBg()).toBeNull();
    await touch.press(NEXT);
    await touch.wait(150);
    expect(navBg()).toBeNull();
    touch.dispose();

    // The pointer control proves the hover style is observable at all, so
    // the touch half cannot pass vacuously.
    const pointer = await openCal("today");
    await waitForLayout(pointer, `day-${today}`);
    await pointer.hover(NEXT);
    await pointer.waitUntil(() => pointer.viewStyle(NEXT)?.backgroundColor != null, { timeout: 15_000 } );
    await pointer.hover(plainSel);
    await pointer.waitUntil(() =>
      callsOf(pointer, "cell-hover").some((c) => c[0] === `${plain}:start`),
    { timeout: 15_000 } );
    await pointer.press(plainSel);
    await pointer.waitUntil(() => callsOf(pointer, "range-change").length === 1, { timeout: 15_000 } );
    pointer.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-005 (A-009): at a 320px viewport both
  // environments render all seven columns and every row cell — the touch
  // columns keep their 44pt width even where the host clips the fixed-width
  // root — and a caller `className` width overrides the `input` axis.
  test("M-005 320px viewport renders all columns in both environments; className width wins", async () => {
    // Column widths at full render width: touch keeps the 44pt floor, pointer
    // stays at the ~36pt default.
    const touchWide = await openCal("default", { scope: "touch" });
    await waitForLayout(touchWide, "day-2026-08-15");
    expect(lastLayout(touchWide, "day-2026-08-15").width).toBeGreaterThanOrEqual(43.5);
    touchWide.dispose();

    for (const params of BOTH) {
      const app = await openCal("default", params, { width: 320, height: 568 });
      await waitForLayout(app, "day-2026-08-15");

      expect(app.count("role:columnheader")).toBe(7);
      expect(app.count("role:cell")).toBeGreaterThanOrEqual(28);
      const cell = lastLayout(app, "day-2026-08-15");
      expect(cell.width).toBeGreaterThan(0);
      expect(cell.height).toBeGreaterThan(0);
      if (params.scope === "touch") {
        expect(cell.width).toBeGreaterThanOrEqual(43.5);
      }
      app.dispose();
    }

    for (const params of BOTH) {
      const app = await openCal("class-override", params);
      await waitForLayout(app, "root");
      const root = lastLayout(app, "root");
      // `w-40` (160pt) beats the axis' 252/308pt — the override is live.
      expect(root.width).toBeGreaterThan(150);
      expect(root.width).toBeLessThan(170);
      app.dispose();
    }
  }, 120_000);

  // adapt-sheets/range-calendar.md M-006 (A-010): the disabled/readonly/
  // unavailable semantics chain is identical on both ends — `isDisabled`
  // closes every cell's seam gate and refuses presses, the NavButton part's
  // own `isDisabled` prop disables it, range bounds disable the matching nav
  // direction and the out-of-range days, and `isReadOnly` never commits a
  // selection.
  test("M-006 disabled, range-boundary and readonly semantics hold in both environments", async () => {
    for (const params of BOTH) {
      const app = await openCal("disabled", params);
      await waitForLayout(app, "day-2026-08-15");

      await app.press("id:rc-sample");
      await app.waitUntil(() => callsOf(app, "seam-state").length > 0, { timeout: 15_000 } );
      const state = lastSeamState(app);
      expect(state.cells.length).toBeGreaterThan(28);
      for (const cell of state.cells) {
        expect(cell.enabled).toBe(false);
        expect(cell.isPressed).toBe(false);
      }

      await expect(app.press(dayCellSelector("2026-08-20"))).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(app, "range-change")).toHaveLength(0);
      // Root `isDisabled` marks the whole subtree disabled in the test model.
      expect(app.enabled("role:button[/^Next$/]")).toBe(false);
      app.dispose();
    }

    for (const params of BOTH) {
      // The NavButton part's own isDisabled prop.
      const app = await openCal("nav-disabled", params);
      await waitForLayout(app, "nav-previous");

      expect(app.enabled("role:button[/^Previous$/]")).toBe(false);
      expect(app.enabled("role:button[/^Next$/]")).toBe(true);
      await expect(app.press("role:button[/^Previous$/]")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      await app.press("role:button[/^Next$/]");
      await app.waitFor("role:grid[/September 2026/]", { timeout: 15_000 } );
      app.dispose();
    }

    for (const params of BOTH) {
      // The min bound: the previous page is range-invalid and pre-min days
      // refuse input.
      const app = await openCal("range-start", params);
      await waitForLayout(app, "day-2020-01-15");

      expect(app.enabled("role:button[/^Previous$/]")).toBe(false);
      expect(app.enabled("role:button[/^Next$/]")).toBe(true);
      await expect(app.press("role:button[/^Previous$/]")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(app.enabled(dayCellSelector("2019-12-30"))).toBe(false);
      expect(app.enabled(dayCellSelector("2020-01-10"))).toBe(true);

      await app.press("role:button[/^Next$/]");
      await app.waitFor("role:grid[/February 2020/]", { timeout: 15_000 } );
      app.dispose();
    }

    for (const params of BOTH) {
      // The max bound, mirrored.
      const app = await openCal("range-end", params);
      await waitForLayout(app, "day-2030-12-15");

      expect(app.enabled("role:button[/^Next$/]")).toBe(false);
      expect(app.enabled("role:button[/^Previous$/]")).toBe(true);
      await expect(app.press("role:button[/^Next$/]")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(app.enabled(dayCellSelector("2031-01-02"))).toBe(false);
      expect(app.enabled(dayCellSelector("2030-12-10"))).toBe(true);
      app.dispose();
    }

    for (const params of BOTH) {
      const app = await openCal("readonly", params);
      await waitForLayout(app, "day-2026-08-20");

      // Read-only cells take no pointer (`pointer-events-none` on web, the
      // guard chain on headless): either way `onChange` must not fire.
      await app.press(dayCellSelector("2026-08-20"));
      await app.wait(200);
      expect(callsOf(app, "range-change")).toHaveLength(0);
      app.dispose();
    }

    const touch = await openCal("readonly", { scope: "touch" });
    await waitForLayout(touch, "day-2026-08-20");
    await touch.press("id:rc-sample");
    await touch.waitUntil(() => callsOf(touch, "seam-state").length > 0, { timeout: 15_000 } );
    for (const cell of lastSeamState(touch).cells) {
      expect(cell.enabled).toBe(false);
    }
    touch.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-007 (A-004): under touch a held press
  // drives the seam's `isPressed`/`origin` round-trip, and a normal press
  // commits `onPress → selectDate → onChange` with the local callback
  // recorded before the state commit.
  test("M-007 injected touch: held press round-trips the seam, press commits in order", async () => {
    const app = await openCal("default", { scope: "touch" });
    await waitForLayout(app, "day-2026-08-20");

    await app.longPress(dayCellSelector("2026-08-20"));
    await app.waitUntil(() =>
      seamStates(app).some((s) => {
        const cell = cellOf(s, "2026-08-20");
        return cell?.isPressed === true && cell.enabled === true && cell.origin !== null;
      }),
    { timeout: 15_000 } );

    // The seam's deferred samples only fire while a press is held, so the
    // release edge leaves the last sample mid-hold — dump a fresh state.
    const before = callsOf(app, "seam-state").length;
    await app.press("id:rc-sample");
    await app.waitUntil(() => callsOf(app, "seam-state").length > before, { timeout: 15_000 } );
    const settled = cellOf(lastSeamState(app), "2026-08-20")!;
    expect(settled.isPressed).toBe(false);
    expect(settled.origin).toBeNull();
    expect(settled.enabled).toBe(true);
    expect(seamEdges(app).some((e) => e.cells.includes("2026-08-20"))).toBe(true);
    app.dispose();

    // Commit order on a fresh mount: `longPress` commits selection on web but
    // not headless, so the held date's anchor state differs per target. A new
    // app starts with anchor=null on both, making the first press's payload
    // deterministic: {day, day}.
    const ordered = await openCal("default", { scope: "touch" });
    await waitForLayout(ordered, "day-2026-08-22");

    const mark = calls(ordered).length;
    await ordered.press(dayCellSelector("2026-08-22"));
    await ordered.waitUntil(() => callsOf(ordered, "range-change").length === 1, { timeout: 15_000 } );
    expect(rangeValues(ordered)).toEqual([{ start: "2026-08-22", end: "2026-08-22" }]);

    const names = calls(ordered).slice(mark).map((c) => c.name);
    const pressIdx = names.lastIndexOf("cell-press");
    const changeIdx = names.lastIndexOf("range-change");
    expect(pressIdx).toBeGreaterThanOrEqual(0);
    expect(changeIdx).toBeGreaterThan(pressIdx);
    ordered.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-008 (A-010): `isDateUnavailable` cells
  // refuse selection in both environments — the view reports disabled, the
  // press is rejected before dispatch, the seam gate stays closed under
  // touch, the cell keeps no selected paint, and an unavailable date inside
  // a selected range draws no track/cap while its neighbours keep theirs.
  test("M-008 unavailable dates refuse selection and keep no selected state", async () => {
    for (const params of BOTH) {
      const app = await openCal("unavailable", params);
      await waitForLayout(app, "day-2026-08-12");
      const day = dayCellSelector("2026-08-12");

      expect(app.enabled(day)).toBe(false);
      await expect(app.press(day)).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(app, "range-change")).toHaveLength(0);
      expect(app.shows("role:button[/August 12, 2026 selected/]")).toBe(false);
      app.dispose();
    }

    for (const params of BOTH) {
      const app = await openCal("unavailable-range", params);
      await waitForLayout(app, "day-2026-08-12");

      expect(app.shows("role:button[/August 10, 2026 selected/]")).toBe(true);
      expect(app.shows("role:button[/August 15, 2026 selected/]")).toBe(true);
      expect(app.shows("role:button[/August 12, 2026 selected/]")).toBe(false);
      app.dispose();
    }

    const touch = await openCal("unavailable", { scope: "touch" });
    await waitForLayout(touch, "day-2026-08-12");
    await touch.press("id:rc-sample");
    await touch.waitUntil(() => callsOf(touch, "seam-state").length > 0, { timeout: 15_000 } );
    const cell = cellOf(lastSeamState(touch), "2026-08-12")!;
    expect(cell.enabled).toBe(false);
    expect(cell.isPressed).toBe(false);
    touch.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-009 (A-007 — 触屏专项验收一): the touch
  // range-selection rules ARE the existing two-press model, unchanged —
  // first press anchors and closes a one-day range, second press completes
  // {anchor, day} with the flip inside `setValue`, the anchor clears, a third
  // press starts a new range, and pressing the anchored day again closes a
  // single-day range.
  test("M-009 touch range selection: two-press model, flip, re-anchor, single-day close", async () => {
    const app = await openCal("default", { scope: "touch" });
    await waitForLayout(app, "day-2026-08-10");

    // First press: anchor=Aug10, one-day range, cap paint on Aug10 only.
    await app.press(dayCellSelector("2026-08-10"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 1, { timeout: 15_000 } );
    expect(rangeValues(app)).toEqual([{ start: "2026-08-10", end: "2026-08-10" }]);
    await app.waitUntil(() => lastSeamEnv(app).anchor === "2026-08-10", { timeout: 15_000 } );
    expect(app.shows("role:button[/August 10, 2026 selected/]")).toBe(true);
    expect(app.shows("role:button[/August 11, 2026 selected/]")).toBe(false);
    expect(dayNumberStyle(app, "2026-08-10").color).not.toBe(
      dayNumberStyle(app, "2026-08-11").color,
    );

    // Second press Aug15: the range completes, the anchor clears and the
    // track draws continuously through Aug15.
    await app.press(dayCellSelector("2026-08-15"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 2, { timeout: 15_000 } );
    expect(lastRangeValue(app)).toEqual({ start: "2026-08-10", end: "2026-08-15" });
    await app.waitUntil(() => lastSeamEnv(app).anchor === null, { timeout: 15_000 } );
    for (const iso of ["2026-08-10", "2026-08-12", "2026-08-15"]) {
      expect(app.shows(`role:button[/${dayCellLabel(iso)} selected/]`)).toBe(true);
    }
    // Both caps share the accent-foreground paint; the middle takes the
    // track's text color (the T-003 contract).
    expect(dayNumberStyle(app, "2026-08-10").color).toBe(
      dayNumberStyle(app, "2026-08-15").color,
    );
    expect(dayNumberStyle(app, "2026-08-10").color).not.toBe(
      dayNumberStyle(app, "2026-08-12").color,
    );

    // The cleared anchor means a third press starts a NEW single-day range —
    // not an extension of {Aug10, Aug15}.
    await app.press(dayCellSelector("2026-08-20"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 3, { timeout: 15_000 } );
    expect(lastRangeValue(app)).toEqual({ start: "2026-08-20", end: "2026-08-20" });

    // Close that anchor, then reverse order: Aug15 then Aug10 flips to
    // {Aug10, Aug15} inside `setValue`.
    await app.press(dayCellSelector("2026-08-25"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 4, { timeout: 15_000 } );
    expect(lastRangeValue(app)).toEqual({ start: "2026-08-20", end: "2026-08-25" });

    await app.press(dayCellSelector("2026-08-15"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 5, { timeout: 15_000 } );
    await app.press(dayCellSelector("2026-08-10"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 6, { timeout: 15_000 } );
    expect(lastRangeValue(app)).toEqual({ start: "2026-08-10", end: "2026-08-15" });

    // The same cell pressed twice closes a single-day range again.
    await app.press(dayCellSelector("2026-08-28"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 7, { timeout: 15_000 } );
    await app.press(dayCellSelector("2026-08-28"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 8, { timeout: 15_000 } );
    expect(lastRangeValue(app)).toEqual({ start: "2026-08-28", end: "2026-08-28" });
    app.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-010 (A-007 — 触屏专项验收二): the
  // unavailable-day rules under touch — `allowsNonContiguousRanges=false`
  // marks a range spanning an unavailable day invalid (the unavailable day
  // still draws no track/cap), `=true` keeps it valid, and
  // `isDateUnavailable`'s second argument is the held anchorDate.
  test("M-010 touch unavailable rules: contiguous invalid, noncontiguous clean, anchor as second arg", async () => {
    const app = await openCal("unavailable", { scope: "touch" });
    await waitForLayout(app, "day-2026-08-10");

    await app.press(dayCellSelector("2026-08-10"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 1, { timeout: 15_000 } );
    await app.waitUntil(() => lastSeamEnv(app).anchor === "2026-08-10", { timeout: 15_000 } );

    // While the anchor is held, `isDateUnavailable`'s second argument IS the
    // anchor date — recorded on every cell's availability check.
    expect(
      callsOf(app, "unavailable-args").some((c) => c[1] === "2026-08-10"),
    ).toBe(true);

    // Aug14 completes {Aug10, Aug14}, which spans the unavailable Aug12:
    // `isValueInvalid` turns true and the middle day still paints nothing.
    await app.press(dayCellSelector("2026-08-14"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 2, { timeout: 15_000 } );
    expect(lastRangeValue(app)).toEqual({ start: "2026-08-10", end: "2026-08-14" });
    await app.waitUntil(() => lastSeamEnv(app).invalid === true, { timeout: 15_000 } );
    expect(lastSeamEnv(app).anchor).toBeNull();
    expect(app.shows("role:button[/August 12, 2026 selected/]")).toBe(false);
    expect(app.shows("role:button[/August 14, 2026 selected/]")).toBe(true);
    app.dispose();

    // allowsNonContiguousRanges=true: the same presses stay valid and the
    // unavailable day is still excluded from the paint.
    const open2 = await openCal("noncontiguous", { scope: "touch" });
    await waitForLayout(open2, "day-2026-08-10");
    await open2.press(dayCellSelector("2026-08-10"));
    await open2.waitUntil(() => callsOf(open2, "range-change").length === 1, { timeout: 15_000 } );
    await open2.press(dayCellSelector("2026-08-14"));
    await open2.waitUntil(() => callsOf(open2, "range-change").length === 2, { timeout: 15_000 } );
    expect(lastRangeValue(open2)).toEqual({ start: "2026-08-10", end: "2026-08-14" });
    await open2.waitUntil(() => lastSeamEnv(open2).invalid === false, { timeout: 15_000 } );
    expect(open2.shows("role:button[/August 12, 2026 selected/]")).toBe(false);
    expect(open2.shows("role:button[/August 14, 2026 selected/]")).toBe(true);
    open2.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-012 (基线): the desktop contract is
  // unmoved — two presses build a range and a third re-anchors, nav buttons
  // page the visible range, min/max bound the edges and their nav
  // directions, `visibleDuration` resizes the grid, the year picker opens
  // and selects, and read-only never commits. The remaining props
  // (pageBehavior/selectionAlignment/weeksInMonth/disallowEmptySelection/
  // autoFocus) keep their semantics through the existing heroui suite this
  // row samples — sheet §4's dual evidence.
  test("M-012 baseline: selection, paging, bounds, visibleDuration, year picker and readonly hold", async () => {
    const app = await openCal("default");
    await waitForLayout(app, "day-2026-08-10");

    await app.press(dayCellSelector("2026-08-10"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 1, { timeout: 15_000 } );
    await app.press(dayCellSelector("2026-08-15"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 2, { timeout: 15_000 } );
    expect(lastRangeValue(app)).toEqual({ start: "2026-08-10", end: "2026-08-15" });

    // A third press re-anchors into a new single-day range.
    await app.press(dayCellSelector("2026-08-20"));
    await app.waitUntil(() => callsOf(app, "range-change").length === 3, { timeout: 15_000 } );
    expect(lastRangeValue(app)).toEqual({ start: "2026-08-20", end: "2026-08-20" });

    await app.press("role:button[/^Next$/]");
    await app.waitFor("role:grid[/September 2026/]", { timeout: 15_000 } );
    await app.press("role:button[/^Previous$/]");
    await app.waitFor("role:grid[/August 2026/]", { timeout: 15_000 } );
    app.dispose();

    const start = await openCal("range-start");
    await waitForLayout(start, "day-2020-01-15");
    expect(start.enabled(dayCellSelector("2019-12-30"))).toBe(false);
    expect(start.enabled(dayCellSelector("2020-01-10"))).toBe(true);
    start.dispose();

    const end = await openCal("range-end");
    await waitForLayout(end, "day-2030-12-15");
    expect(end.enabled(dayCellSelector("2031-01-02"))).toBe(false);
    expect(end.enabled(dayCellSelector("2030-12-10"))).toBe(true);
    end.dispose();

    const picker = await openCal("default");
    await waitForLayout(picker, "day-2026-08-15");
    await openYearPicker(picker);
    await picker.waitFor("text:2020", { timeout: 15_000 } );
    await selectYear(picker, 2028);
    await picker.waitFor("role:grid[/2028/]", { timeout: 15_000 } );
    picker.dispose();

    const weeks = await openCal("duration");
    // weeks:2 shows a two-week window (July 26 – Aug 8 for the August focus),
    // so Aug 15 is off-screen; Aug 5 sits inside it.
    await waitForLayout(weeks, "day-2026-08-05");
    // Header row + two week rows.
    expect(weeks.count("role:row")).toBe(3);
    weeks.dispose();

    const readonly = await openCal("readonly");
    await waitForLayout(readonly, "day-2026-08-20");
    await readonly.press(dayCellSelector("2026-08-20"));
    await readonly.wait(200);
    expect(callsOf(readonly, "range-change")).toHaveLength(0);
    readonly.dispose();
  }, 120_000);

  // adapt-sheets/range-calendar.md M-013 (A-006, 基线): decorative parts do
  // not drift — seven weekday labels with an env-invariant set, the grid's
  // accessible name follows paging, selected vs unselected day paint
  // differs, the year-style `weekdayStyle` prop still reads, and the cell
  // indicator mounts only on selected cells at its fixed 3pt size in both
  // environments.
  test("M-013 decorative parts hold: weekday labels, heading, indicator, selected paint", async () => {
    const SHORT_HEADS = [
      "header-Fri",
      "header-Mon",
      "header-Sat",
      "header-Sun",
      "header-Thu",
      "header-Tue",
      "header-Wed",
    ];
    const headNames = (app: App) =>
      layoutEntries(app)
        .map((e) => e.name)
        .filter((n) => n.startsWith("header-"))
        .sort();

    for (const params of BOTH) {
      const app = await openCal("default", params);
      await waitForLayout(app, "day-2026-08-15");

      expect(app.count("role:columnheader")).toBe(7);
      expect(headNames(app)).toEqual(SHORT_HEADS);
      expect(app.shows("text:August 2026")).toBe(true);

      // Selected vs unselected text paint — asserted while August is still
      // the visible month (paging would drop the August cells).
      expect(dayNumberStyle(app, "2026-08-01").color).not.toBe(
        dayNumberStyle(app, "2026-08-06").color,
      );

      await app.press("role:button[/^Next$/]");
      await app.waitFor("role:grid[/September 2026/]", { timeout: 15_000 } );
      app.dispose();
    }

    const narrow = await openCal("default", { weekday: "narrow" });
    await waitForLayout(narrow, "day-2026-08-15");
    expect(headNames(narrow)).toEqual([
      "header-F",
      "header-M",
      "header-S",
      "header-S",
      "header-T",
      "header-T",
      "header-W",
    ]);
    narrow.dispose();

    const dotSizes: { width: number; height: number }[] = [];
    for (const params of BOTH) {
      const app = await openCal("indicator", params);
      await waitForLayout(app, "day-2026-08-15");

      // Nothing selected → no dots; each completed range step moves them.
      expect(app.count("id:sel-dot")).toBe(0);
      await app.press(dayCellSelector("2026-08-20"));
      await app.waitUntil(() => callsOf(app, "range-change").length === 1, { timeout: 15_000 } );
      await app.waitUntil(() => app.count("id:sel-dot") === 1, { timeout: 15_000 } );
      await app.press(dayCellSelector("2026-08-22"));
      await app.waitUntil(() => callsOf(app, "range-change").length === 2, { timeout: 15_000 } );
      await app.waitUntil(() => app.count("id:sel-dot") === 3, { timeout: 15_000 } );
      expect(app.count("id:sel-dot")).toBe(3);

      dotSizes.push(lastLayout(app, "dot"));
      app.dispose();
    }
    for (const dot of dotSizes) {
      expect(dot.width).toBeGreaterThan(2);
      expect(dot.width).toBeLessThan(4);
      expect(Math.abs(dot.height - dot.width)).toBeLessThanOrEqual(0.5);
    }
    expect(dotSizes[0].width).toBe(dotSizes[1].width);
    expect(dotSizes[0].height).toBe(dotSizes[1].height);
  }, 120_000);

  // adapt-sheets/range-calendar.md M-014 (A-003, 负断言): under the default
  // pointer environment the nav-button seam never engages — hitSlop stays
  // undefined, `isPressed` never sets, bounds hold at 24×24 — while paging
  // still works.
  test("M-014 default environment: nav seam stays inert while paging works", async () => {
    const app = await openCal("default");
    await waitForLayout(app, "nav-next");

    for (const slot of ["nav-previous", "nav-next"] as const) {
      const bounds = lastLayout(app, slot);
      expect(bounds.width).toBeGreaterThan(22);
      expect(bounds.width).toBeLessThan(26);
      expect(bounds.height).toBeGreaterThan(22);
      expect(bounds.height).toBeLessThan(26);
    }

    await app.press("role:button[/^Next$/]");
    await app.waitFor("role:grid[/September 2026/]", { timeout: 15_000 } );
    await app.press("role:button[/^Previous$/]");
    await app.waitFor("role:grid[/August 2026/]", { timeout: 15_000 } );

    const env = lastSeamEnv(app);
    expect(env.input).toBe("pointer");
    for (const slot of ["previous", "next"] as const) {
      const ch = env.nav[slot];
      expect(ch).not.toBeNull();
      expect(ch!.enabled).toBe(false);
      expect(ch!.isPressed).toBe(false);
      expect(ch!.hitSlop).toBeNull();
    }
    for (const edge of seamEdges(app)) {
      expect(edge.nav.previous).toBe(false);
      expect(edge.nav.next).toBe(false);
    }
    app.dispose();
  }, 120_000);
});
