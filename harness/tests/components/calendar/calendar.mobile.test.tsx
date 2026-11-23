import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";
import { dayCellSelector } from "../../testers/calendar";

/*
 * Mobile assertions for the calendar adapt unit — one test per row of
 * adapt-sheets/calendar.md §4 (M-001…M-011) on every target, native
 * ios/android included. Every assertion reads what `nsh/test` observes —
 * `shows`, `count`, `enabled`, `viewStyle`, `onLayout` probe payloads and
 * `app.storage()` seam probes — and `host.params.testInput` picks the
 * environment, so the dual-environment rows run identically everywhere.
 * M-004 (`app.hover` needs a mouse) lives in
 * `calendar.mobile.headless.test.tsx`.
 *
 * The fixture is `harness/calendar.fixtures.tsx`, opened by `host.params`:
 * `case` (default/disabled/readonly/unavailable/range-start/multiple/
 * class-override/indicator/year-picker), `testInput` ("pointer"/"touch" =
 * an outer EnvironmentScope input), `testWidth` (points bound on the block
 * width, the native-safe stand-in for a window pin), `weekday`, `value`,
 * `picker`. Native hosts fill the device screen and reject the
 * `platform`/`width`/`height` open options, so this file carries none.
 *
 * Probe surfaces: layout (root/grid/nav/header/day/dot bounds),
 * `onChange`/`onFocusChange`/`cell-press`/`day-focus` (contract callbacks),
 * `seam-env`/`seam-edge`/`seam-state` (the CalendarContextValue
 * navButtonHitSlop/cellFeedback channels — the seam's only observable
 * surface, sheet §6).
 */

type Params = Record<string, string>;

function openCal(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../calendar.fixtures.tsx", {
    locale: "en-US",
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

type SeamEnv = {
  input: string;
  cellCount: number;
  nav: {
    previous: { enabled: boolean; isPressed: boolean; hitSlop: Edges } | null;
    next: { enabled: boolean; isPressed: boolean; hitSlop: Edges } | null;
  };
};

type SeamEdge = { cells: string[]; nav: { previous: boolean; next: boolean } };

type SeamState = {
  input: string;
  nav: { previous: Channel | null; next: Channel | null };
  cells: ({ date: string } & Channel)[];
};

const BOTH: Params[] = [{ testInput: "pointer" }, { testInput: "touch" }];

function layoutEntries(app: App): LayoutEntry[] {
  return callsOf(app, "layout").map((c) => c[0] as LayoutEntry);
}

function lastLayout(app: App, name: string): LayoutEntry {
  const entries = layoutEntries(app).filter((e) => e.name === name);
  return entries[entries.length - 1];
}

async function waitForLayout(app: App, name: string): Promise<void> {
  await app.waitUntil(() =>
    callsOf(app, "layout").some((c) => (c[0] as LayoutEntry).name === name),
  );
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

/** The sheet's "各边 ≥0" shape, asserted whenever the seam actually expands. */
function expectNonNegativeSlop(slop: Edges): void {
  if (slop === null || typeof slop === "number") return;
  for (const side of ["top", "right", "bottom", "left"] as const) {
    expect(slop[side] ?? 0).toBeGreaterThanOrEqual(0);
  }
}

describe("calendar mobile", () => {
  // adapt-sheets/calendar.md M-001 (A-001, A-002): the `input` axis' `w-77`
  // gives the touch root its 308pt width — seven 44pt columns — while the
  // pointer default keeps `w-63`/252pt and 36pt cells. `aspect-square`
  // keeps each cell's height at its column width.
  test("M-001 touch root measures 308pt with 44pt cells, default keeps 252pt/36pt", async () => {
    const touch = await openCal("default", { testInput: "touch" });
    await waitForLayout(touch, "day-2026-08-15");

    const root = lastLayout(touch, "root");
    expect(root.width).toBeGreaterThan(300);
    expect(root.width).toBeLessThan(316);
    const cell = lastLayout(touch, "day-2026-08-15");
    expect(cell.width).toBeGreaterThanOrEqual(43.5);
    expect(Math.abs(cell.height - cell.width)).toBeLessThanOrEqual(1.5);

    const pointer = await openCal("default", { testInput: "pointer" });
    await waitForLayout(pointer, "day-2026-08-15");

    const rootP = lastLayout(pointer, "root");
    expect(rootP.width).toBeGreaterThan(248);
    expect(rootP.width).toBeLessThan(256);
    const cellP = lastLayout(pointer, "day-2026-08-15");
    expect(cellP.width).toBeGreaterThan(34);
    expect(cellP.width).toBeLessThan(38);
    expect(Math.abs(cellP.height - cellP.width)).toBeLessThanOrEqual(1.5);
  }, 120_000);

  // adapt-sheets/calendar.md M-002 (A-001, A-003): under touch the nav
  // button's `size-11` measures 44×44 and its seam reports `enabled` — the
  // computed `hitSlop` answers per the press-feedback contract (undefined at
  // the 44pt target; whenever it expands every side is ≥0 — sheet §6's
  // registered hitSlop gap means the probe reads the computed value, not a
  // view prop). The default environment keeps 24×24 with the seam gated off.
  test("M-002 touch nav buttons measure 44pt with the seam enabled, default keeps 24pt gated off", async () => {
    const touch = await openCal("default", { testInput: "touch" });
    await waitForLayout(touch, "nav-next");
    await touch.waitUntil(() => callsOf(touch, "seam-env").length > 0);

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
      expectNonNegativeSlop(ch!.hitSlop);
    }

    const pointer = await openCal("default", { testInput: "pointer" });
    await waitForLayout(pointer, "nav-next");
    await pointer.waitUntil(() => callsOf(pointer, "seam-env").length > 0);

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
  }, 120_000);

  // adapt-sheets/calendar.md M-003 (A-004, 负断言): under the default pointer
  // environment the cell seam never engages — no `isPressed` edge, every
  // channel gated off, no hitSlop anywhere — while the press→select→onChange
  // contract is byte-identical to desktop.
  test("M-003 pointer baseline: cell seam never presses and selection is unchanged", async () => {
    const app = await openCal("default", { testInput: "pointer" });
    await waitForLayout(app, "day-2026-08-15");

    await app.press(dayCellSelector("2026-08-20"));
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([["2026-08-20"]]);

    const edges = seamEdges(app);
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      expect(edge.cells).toEqual([]);
      expect(edge.nav.previous).toBe(false);
      expect(edge.nav.next).toBe(false);
    }

    await app.press("id:cal-sample");
    await app.waitUntil(() => callsOf(app, "seam-state").length > 0);
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
  }, 120_000);

  // adapt-sheets/calendar.md M-004 (A-001, A-005) lives in
  // `calendar.mobile.headless.test.tsx` — `app.hover` needs a mouse, so the
  // row moved there whole rather than split.

  // adapt-sheets/calendar.md M-005 (A-007): at a 320px viewport both
  // environments render all seven columns and every row cell — the touch
  // columns keep their 44pt width even where the host clips the fixed-width
  // root — and a caller `className` width overrides the `input` axis.
  test("M-005 320pt block width renders all columns in both environments; className width wins", async () => {
    // Column widths at full render width are M-001's half (touch 44pt,
    // pointer ~36pt); this row only needs the 320pt bound — `testWidth`
    // stands in for the viewport pin native hosts reject — to keep all
    // seven columns and every row cell in both environments.
    for (const params of BOTH) {
      const app = await openCal("default", { ...params, testWidth: "320" });
      await waitForLayout(app, "day-2026-08-15");

      expect(app.count("role:columnheader")).toBe(7);
      expect(app.count("role:cell")).toBeGreaterThanOrEqual(28);
      const cell = lastLayout(app, "day-2026-08-15");
      expect(cell.width).toBeGreaterThan(0);
      expect(cell.height).toBeGreaterThan(0);
    }

    for (const params of BOTH) {
      const app = await openCal("class-override", params);
      await waitForLayout(app, "root");
      const root = lastLayout(app, "root");
      // `w-40` (160pt) beats the axis' 252/308pt — the override is live.
      expect(root.width).toBeGreaterThan(150);
      expect(root.width).toBeLessThan(170);
    }
  }, 120_000);

  // adapt-sheets/calendar.md M-006 (A-008): the disabled/readonly/unavailable
  // semantics chain is identical on both ends — `isDisabled` closes every
  // cell's seam gate and refuses presses, the NavButton part's own
  // `isDisabled` prop disables it, range bounds disable the matching nav
  // direction, and `isReadOnly` never commits a selection. Nav buttons are
  // asserted through their own disable paths (prop + range boundary), not
  // root `isDisabled` — upstream keeps them live there, and the test model
  // reports the whole subtree disabled through the root's accessibility
  // state, so `enabled` on a nav button is not a stable half of this clause.
  test("M-006 disabled, range-boundary and readonly semantics hold in both environments", async () => {
    for (const params of BOTH) {
      const app = await openCal("disabled", params);
      await waitForLayout(app, "day-2026-08-15");

      await app.press("id:cal-sample");
      await app.waitUntil(() => callsOf(app, "seam-state").length > 0);
      const state = lastSeamState(app);
      expect(state.cells.length).toBeGreaterThan(28);
      for (const cell of state.cells) {
        expect(cell.enabled).toBe(false);
        expect(cell.isPressed).toBe(false);
      }

      await expect(app.press(dayCellSelector("2026-08-20"))).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(app, "onChange")).toHaveLength(0);
      // The nav buttons' own disable paths are separate clauses below —
      // under root `isDisabled` the test model reports the whole subtree
      // disabled through the root's accessibility state, so `enabled` on a
      // nav button is not a stable contract half here.
    }

    for (const params of BOTH) {
      // The NavButton part's own isDisabled prop: `enabled` reads false and
      // the press is refused before dispatch.
      const app = await openCal("nav-disabled", params);
      await waitForLayout(app, "nav-previous");

      expect(app.enabled("role:button[/^Previous$/]")).toBe(false);
      expect(app.enabled("role:button[/^Next$/]")).toBe(true);
      await expect(app.press("role:button[/^Previous$/]")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      await app.press("role:button[/^Next$/]");
      await app.waitFor("text:September 2026");
    }

    for (const params of BOTH) {
      const app = await openCal("range-start", params);
      await waitForLayout(app, "day-2020-01-15");

      expect(app.enabled("role:button[/^Previous$/]")).toBe(false);
      expect(app.enabled("role:button[/^Next$/]")).toBe(true);
      await expect(app.press("role:button[/^Previous$/]")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(app.enabled(dayCellSelector("2019-12-30"))).toBe(false);

      await app.press("role:button[/^Next$/]");
      await app.waitFor("text:February 2020");
    }

    for (const params of BOTH) {
      const app = await openCal("readonly", params);
      await waitForLayout(app, "day-2026-08-20");

      // Read-only cells take no pointer (`pointer-events-none`): on web the
      // press never reaches `onPress`; on headless it reaches the guard
      // chain, which moves focusedDate instead of selecting. Either way the
      // contract half — no `onChange` — must hold.
      await app.press(dayCellSelector("2026-08-20"));
      await app.wait(200);
      expect(callsOf(app, "onChange")).toHaveLength(0);

      if (params.testInput === "touch") {
        // The seam gate stays closed under touch too: every cell channel
        // reports `enabled === false`.
        await app.press("id:cal-sample");
        await app.waitUntil(() => callsOf(app, "seam-state").length > 0);
        const state = lastSeamState(app);
        expect(state.input).toBe("touch");
        for (const cell of state.cells) {
          expect(cell.enabled).toBe(false);
        }
      }
    }
  }, 120_000);

  // adapt-sheets/calendar.md M-007 (A-004): under touch a held press drives
  // the seam's `isPressed`/`origin` round-trip (the interval sampler catches
  // the hold on web, where press edges batch to the settle), and a normal
  // press commits `onPress → selectDate → onChange` with the local callback
  // recorded before the state commit.
  test("M-007 injected touch: held press round-trips the seam, press commits in order", async () => {
    const app = await openCal("default", { testInput: "touch" });
    await waitForLayout(app, "day-2026-08-20");
    const day = dayCellSelector("2026-08-20");

    await app.longPress(day);
    await app.waitUntil(() =>
      seamStates(app).some((s) => {
        const cell = cellOf(s, "2026-08-20");
        return cell?.isPressed === true && cell.enabled === true && cell.origin !== null;
      }),
    );

    // The seam's deferred samples only fire while a press is held, so the
    // release edge leaves the last sample mid-hold — dump a fresh state.
    const before = callsOf(app, "seam-state").length;
    await app.press("id:cal-sample");
    await app.waitUntil(() => callsOf(app, "seam-state").length > before);
    const settled = cellOf(lastSeamState(app), "2026-08-20")!;
    expect(settled.isPressed).toBe(false);
    expect(settled.origin).toBeNull();
    expect(settled.enabled).toBe(true);
    expect(seamEdges(app).some((e) => e.cells.includes("2026-08-20"))).toBe(true);

    // Commit order on a second, still-unselected date: `longPress` commits
    // selection on web but not headless, so re-pressing the held date would
    // leave no fresh `onChange` there. `2026-08-22` is unselected on both.
    const mark = calls(app).length;
    const changesBefore = callsOf(app, "onChange").length;
    await app.press(dayCellSelector("2026-08-22"));
    await app.waitUntil(() => callsOf(app, "onChange").length > changesBefore);
    expect(callsOf(app, "onChange").at(-1)).toEqual(["2026-08-22"]);

    const names = calls(app).slice(mark).map((c) => c.name);
    const pressIdx = names.lastIndexOf("cell-press");
    const changeIdx = names.lastIndexOf("onChange");
    expect(pressIdx).toBeGreaterThanOrEqual(0);
    expect(changeIdx).toBeGreaterThan(pressIdx);
  }, 120_000);

  // adapt-sheets/calendar.md M-008 (A-008): `isDateUnavailable` cells refuse
  // selection in both environments — the view reports disabled, the press is
  // rejected before dispatch, the seam gate stays closed under touch, and an
  // unavailable date held as the value keeps no selection paint.
  test("M-008 unavailable dates refuse selection and keep no selected state", async () => {
    for (const params of BOTH) {
      const app = await openCal("unavailable", params);
      await waitForLayout(app, "day-2026-08-20");
      const day = dayCellSelector("2026-08-20");

      expect(app.enabled(day)).toBe(false);
      await expect(app.press(day)).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(callsOf(app, "onChange")).toHaveLength(0);
      expect(callsOf(app, "cell-press")).toHaveLength(0);
    }

    const touch = await openCal("unavailable", { testInput: "touch" });
    await waitForLayout(touch, "day-2026-08-20");
    await touch.press("id:cal-sample");
    await touch.waitUntil(() => callsOf(touch, "seam-state").length > 0);
    const cell = cellOf(lastSeamState(touch), "2026-08-20")!;
    expect(cell.enabled).toBe(false);
    expect(cell.isPressed).toBe(false);

    // value == unavailable date: `isSelected` stays false — no cell carries
    // the ", selected" accessible-name suffix.
    const combo = await openCal("unavailable", {
      testInput: "pointer",
      value: "2026-08-20",
    });
    await waitForLayout(combo, "day-2026-08-20");
    expect(combo.count("role:button[/selected/]")).toBe(0);
    const control = await openCal("default", { testInput: "pointer" });
    await waitForLayout(control, "day-2026-08-15");
    expect(control.count("role:button[/selected/]")).toBe(1);
  }, 120_000);

  // adapt-sheets/calendar.md M-009 (基线): the desktop contract is unmoved —
  // one `onChange` per press with the right value, selection switches on the
  // next press, nav buttons page the heading, range bounds disable out-of-
  // range days, multiple mode accumulates, and the year picker opens and
  // selects. The remaining props (visibleDuration/weeksInMonth/autoFocus/
  // pageBehavior/selectionAlignment) keep their semantics through the
  // existing heroui suite this row samples.
  test("M-009 baseline: selection, paging, bounds, multiple mode and year picker hold", async () => {
    const app = await openCal("default", { testInput: "pointer" });
    await waitForLayout(app, "day-2026-08-15");

    await app.press(dayCellSelector("2026-08-20"));
    await app.waitUntil(() => callsOf(app, "onChange").length === 1);
    expect(callsOf(app, "onChange")).toEqual([["2026-08-20"]]);

    await app.press(dayCellSelector("2026-08-22"));
    await app.waitUntil(() => callsOf(app, "onChange").length === 2);
    expect(callsOf(app, "onChange")[1]).toEqual(["2026-08-22"]);

    await app.press("role:button[/^Next$/]");
    await app.waitFor("text:September 2026");
    await app.press("role:button[/^Previous$/]");
    await app.waitFor("text:August 2026");

    const edge = await openCal("range-start", { testInput: "pointer" });
    await waitForLayout(edge, "day-2020-01-15");
    expect(edge.enabled(dayCellSelector("2019-12-30"))).toBe(false);

    const multiple = await openCal("multiple", { testInput: "touch" });
    await waitForLayout(multiple, "day-2026-08-15");
    await multiple.press(dayCellSelector("2026-08-20"));
    await multiple.waitUntil(() => callsOf(multiple, "onChange").length === 1);
    expect(callsOf(multiple, "onChange")[0][0]).toEqual([
      "2026-08-10",
      "2026-08-15",
      "2026-08-20",
    ]);
    await multiple.press(dayCellSelector("2026-08-22"));
    await multiple.waitUntil(() => callsOf(multiple, "onChange").length === 2);
    expect(callsOf(multiple, "onChange")[1][0]).toEqual([
      "2026-08-10",
      "2026-08-15",
      "2026-08-20",
      "2026-08-22",
    ]);

    const picker = await openCal("year-picker", { testInput: "pointer" });
    await waitForLayout(picker, "day-2026-08-15");
    await picker.press("role:button[/year selector/i]");
    await picker.waitFor("text:2020");
    await picker.press("role:button[2028]");
    await picker.waitFor("role:grid[/2028/]");
  }, 120_000);

  // adapt-sheets/calendar.md M-010 (A-006, 基线): decorative parts do not
  // drift — seven weekday labels with an env-invariant set, the heading
  // follows paging, the selected day's paint differs, the year-style
  // `weekdayStyle` prop still reads, and the cell indicator mounts only on
  // the selected cell at its fixed 3pt size in both environments.
  test("M-010 decorative parts hold: weekday labels, heading, indicator, selected paint", async () => {
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
      // the visible month (paging would drop the August 15 cell).
      expect(
        app.spanStyle("role:button[/August 15, 2026/] >> text:15").color,
      ).not.toBe(app.spanStyle("role:button[/August 16, 2026/] >> text:16").color);

      await app.press("role:button[/^Next$/]");
      await app.waitFor("text:September 2026");
    }

    const narrow = await openCal("default", {
      testInput: "pointer",
      weekday: "narrow",
    });
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

    const dotSizes: { width: number; height: number }[] = [];
    for (const params of BOTH) {
      const app = await openCal("indicator", params);
      await waitForLayout(app, "day-2026-08-15");

      expect(app.count("id:sel-dot")).toBe(0);
      await app.press(dayCellSelector("2026-08-20"));
      await app.waitUntil(() => callsOf(app, "onChange").length === 1);
      await app.waitUntil(() => app.count("id:sel-dot") === 1);
      expect(app.count("id:sel-dot")).toBe(1);

      await app.press(dayCellSelector("2026-08-22"));
      await app.waitUntil(() => callsOf(app, "onChange").length === 2);
      await app.waitUntil(() => app.count("id:sel-dot") === 1);
      expect(app.count("id:sel-dot")).toBe(1);

      dotSizes.push(lastLayout(app, "dot"));
    }
    for (const dot of dotSizes) {
      expect(dot.width).toBeGreaterThan(2);
      expect(dot.width).toBeLessThan(4);
      expect(Math.abs(dot.height - dot.width)).toBeLessThanOrEqual(0.5);
    }
    expect(dotSizes[0].width).toBe(dotSizes[1].width);
    expect(dotSizes[0].height).toBe(dotSizes[1].height);
  }, 120_000);

  // adapt-sheets/calendar.md M-011 (A-003, 负断言): under the default pointer
  // environment the nav-button seam never exists — hitSlop stays undefined,
  // `isPressed` never sets, bounds hold at 24×24 — while paging still works.
  test("M-011 pointer baseline: nav seam stays inert while paging works", async () => {
    const app = await openCal("default", { testInput: "pointer" });
    await waitForLayout(app, "nav-next");

    for (const slot of ["nav-previous", "nav-next"] as const) {
      const bounds = lastLayout(app, slot);
      expect(bounds.width).toBeGreaterThan(22);
      expect(bounds.width).toBeLessThan(26);
      expect(bounds.height).toBeGreaterThan(22);
      expect(bounds.height).toBeLessThan(26);
    }

    await app.press("role:button[/^Next$/]");
    await app.waitFor("text:September 2026");
    await app.press("role:button[/^Previous$/]");
    await app.waitFor("text:August 2026");

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
  }, 120_000);
});
