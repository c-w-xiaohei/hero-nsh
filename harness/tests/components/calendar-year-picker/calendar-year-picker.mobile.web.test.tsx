import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Web-target mobile assertions for CalendarYearPicker (adapt unit, action
 * B): the sheet's web-side rows — M-001 and M-010 run their dual-environment
 * halves here, M-007 is the sticky-hover assertion that only a real web
 * hover can prove, and M-008 adds the keyboard halves (Tab/Enter open,
 * Escape close) a Windows headless window cannot take. M-002…M-006 and the
 * ios host-derivation half of M-009 live in
 * `calendar-year-picker.mobile.headless.test.tsx`; M-002's held-press
 * samples need `dragAndHold`, which only the headless engine runs.
 *
 * `platform:"web"` plays the pointer host; `EnvironmentScope input="touch"`
 * supplies the injected touch environment, so the dual-environment
 * assertions run identically here.
 *
 * Probe payloads match the headless file: `events`, `cell-press`,
 * `onYearPickerOpenChange`, `layout`, `ctx-pressed`/`ctx-state`/`ctx-env`,
 * `cell-ctx-pressed`/`cell-ctx-state`/`cell-ctx-env`, `ctx-channels`.
 * The 2027 cell's children are its `CtxProbe`, so `text:2027` never renders —
 * the cell is reached as `role:button[/^2027$/]` (its accessibilityLabel).
 */

type Params = Record<string, string>;

function openPicker(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../calendar-year-picker.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

const TRIGGER = "id:trigger";
const CELL_2027 = "role:button[/^2027$/]";
const CELL_2029 = "role:button[/^2029$/]";

type Edges = { top: number; right: number; bottom: number; left: number };
type Point = { x: number; y: number };

type CtxState = {
  seamPressed: boolean;
  pressed: number;
  scale: number;
  origin: Point | null;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  allDisabled: boolean;
};

type CtxChannels = {
  seamPressed: boolean;
  pressed: number;
  scale: number;
  origin: Point | null;
  hitSlop: Edges | null;
  enabled: boolean;
};

type CtxEnv = { enabled: boolean; hitSlop: Edges | null };

function lastOf<T>(app: App, name: string): T {
  const recorded = callsOf(app, name);
  return recorded[recorded.length - 1][0] as T;
}

/** The `events` probe's string payloads, in order: "down"/"up"/"press". */
function eventArgs(app: App): string[] {
  return callsOf(app, "events").map((c) => c[0] as string);
}

/** The seam's `isPressed` edges as a `*-ctx-pressed` probe recorded them. */
function seamEdges(app: App, name: string): boolean[] {
  return callsOf(app, name).map((c) => (c[0] as { seam: boolean }).seam);
}

/** Every recorded `*-ctx-state` sample sits at the seam's rest values. */
function expectStatesAtRest(app: App, name: string): void {
  for (const call of callsOf(app, name)) {
    const s = call[0] as CtxState;
    expect(s.seamPressed).toBe(false);
    expect(s.pressed).toBeLessThan(0.5);
    expect(s.scale).toBe(1);
    expect(s.origin).toBeNull();
    expect(s.hitSlop).toBeNull();
  }
}

describe("calendar-year-picker mobile (web)", () => {
  // adapt-sheets/calendar-year-picker.md M-001 (A-003, A-004, A-005, 负断言):
  // under the default pointer environment both touch-gated seams are a
  // physical no-op — `ctx-pressed`/`cell-ctx-pressed` only ever record the
  // mount edges, every `*-ctx-state` sample and the on-demand `ctx-channels`
  // read show the channels at rest — while the press contract works
  // unchanged: down/up/press on the trigger, one open report, the 2027 cell's
  // own down/press, one close report and the focused year landing on 2027.
  test("M-001 default environment: seam channels stay inert while the press contract holds", async () => {
    const app = await openPicker("mobile");

    await app.press(TRIGGER);
    await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 1);
    expect(app.shows("text:2020")).toBe(true);

    await app.press(CELL_2027);
    await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 2);

    // The contract stream is intact: trigger down/up/press, panel opens,
    // cell down/press, panel closes with the focused year on 2027.
    expect(eventArgs(app)).toEqual(["down", "up", "press"]);
    expect(callsOf(app, "cell-press")).toEqual([["down"], ["press"]]);
    expect(callsOf(app, "onYearPickerOpenChange")).toEqual([[true], [false]]);
    expect(app.shows("role:grid[/2027/]")).toBe(true);

    // Neither seam's flag ever rose: only the mount-time false edges.
    expect(seamEdges(app, "ctx-pressed").every((e) => e === false)).toBe(true);
    expect(seamEdges(app, "cell-ctx-pressed").every((e) => e === false)).toBe(true);

    // The mount-edge samples (+600 ms / +1500 ms) are the only ctx-state
    // reads a gated press ever schedules — all must sit at rest, gate closed.
    await app.waitUntil(
      () =>
        callsOf(app, "ctx-state").length >= 2 &&
        callsOf(app, "cell-ctx-state").length >= 2,
    );
    expectStatesAtRest(app, "ctx-state");
    expectStatesAtRest(app, "cell-ctx-state");
    for (const name of ["ctx-state", "cell-ctx-state"]) {
      for (const call of callsOf(app, name)) {
        expect((call[0] as CtxState).enabled).toBe(false);
      }
    }

    // The mount-time environment reports: gate closed, no slop.
    expect(lastOf<CtxEnv>(app, "ctx-env")).toEqual({ enabled: false, hitSlop: null });
    expect(lastOf<CtxEnv>(app, "cell-ctx-env")).toEqual({ enabled: false, hitSlop: null });

    // The on-demand read, for a fresh post-press sample of the trigger seam.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxChannels>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBe(0);
    expect(channels.scale).toBe(1);
    expect(channels.origin).toBeNull();
    expect(channels.hitSlop).toBeNull();
    expect(channels.enabled).toBe(false);
  }, 120_000);

  // adapt-sheets/calendar-year-picker.md M-007 (A-002): web's sticky hover —
  // after an unselected year cell is pressed the panel closes and the cell
  // becomes the selected year; reopened and hovered, the touch environment
  // must not paint the `hover:` background/text over the selected paint
  // (the `input` axis emits no `hover:` fragments under touch, so nothing
  // can stick). The pointer control proves the hover paint is observable at
  // all, so the touch half cannot pass vacuously.
  test("M-007 touch suppresses the selected year cell's hover paint; pointer keeps it", async () => {
    // Touch half: press an unselected cell (2029), reopen — it is now the
    // selected year carrying `bg-accent` — then hover it.
    const touch = await openPicker("mobile", { scope: "touch" });
    await touch.press(TRIGGER);
    await touch.waitUntil(() => callsOf(touch, "onYearPickerOpenChange").length === 1);
    await touch.press(CELL_2029);
    await touch.waitUntil(() => callsOf(touch, "onYearPickerOpenChange").length === 2);
    await touch.press(TRIGGER);
    await touch.waitUntil(() => callsOf(touch, "onYearPickerOpenChange").length === 3);

    const beforeBg = touch.viewStyle(CELL_2029)?.backgroundColor;
    const beforeColor = touch.spanStyle(`${CELL_2029} >> text:2029`).color;
    // The selected cell's `bg-accent` is observable — the assertion cannot
    // pass vacuously on a transparent base.
    expect(beforeBg).toBeDefined();

    await touch.hover(CELL_2029);
    await touch.wait(100);
    expect(touch.viewStyle(CELL_2029)?.backgroundColor).toBe(beforeBg);
    expect(touch.spanStyle(`${CELL_2029} >> text:2029`).color).toBe(beforeColor);

    // Pointer control: the same flow under the default environment — the
    // selected cell's `hover:bg-accent-hover` must repaint on hover.
    const pointer = await openPicker("mobile");
    await pointer.press(TRIGGER);
    await pointer.waitUntil(() => callsOf(pointer, "onYearPickerOpenChange").length === 1);
    await pointer.press(CELL_2029);
    await pointer.waitUntil(() => callsOf(pointer, "onYearPickerOpenChange").length === 2);
    await pointer.press(TRIGGER);
    await pointer.waitUntil(() => callsOf(pointer, "onYearPickerOpenChange").length === 3);

    const pointerBefore = pointer.viewStyle(CELL_2029)?.backgroundColor;
    expect(pointerBefore).toBeDefined();
    await pointer.hover(CELL_2029);
    await pointer.waitUntil(
      () => pointer.viewStyle(CELL_2029)?.backgroundColor !== pointerBefore,
    );
    expect(pointer.viewStyle(CELL_2029)?.backgroundColor).not.toBe(pointerBefore);
  }, 120_000);

  // adapt-sheets/calendar-year-picker.md M-008 (基线): the default
  // environment is the desktop-parity half — the same assertions the heroui
  // suite pins (T-001…T-004) plus the keyboard halves a web target can take:
  // Escape closes an open panel (T-004), and Tab reaches the trigger so
  // Enter opens it (the T-013 entry path). The press/select/spanStyle rows
  // match the headless file's M-008.
  test("M-008 default environment: year-picker contract plus keyboard open and Escape close", async () => {
    const app = await openPicker("mobile");

    // T-001: the trigger press opens the year panel.
    await app.press(TRIGGER);
    await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 1);
    expect(app.shows("text:2020")).toBe(true);
    expect(app.shows("text:2030")).toBe(true);

    // T-003: the focused year (2026, the default value's year) paints
    // selected; an unfocused year does not.
    expect(app.spanStyle("role:button[/^2026$/] >> text:2026").color).not.toBe(
      app.spanStyle("role:button[/^2024$/] >> text:2024").color,
    );

    // T-002: pressing a year commits it and closes the panel; the day grid's
    // focused year moves to 2028.
    await app.press("text:2028");
    await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 2);
    expect(app.shows("role:grid[/2028/]")).toBe(true);
    expect(app.shows("text:2020")).toBe(false);

    // T-004: Escape closes the reopened panel.
    await app.press(TRIGGER);
    await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 3);
    expect(callsOf(app, "onYearPickerOpenChange").at(-1)).toEqual([true]);
    await app.keyboard.press("escape");
    await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 4);
    expect(callsOf(app, "onYearPickerOpenChange").at(-1)).toEqual([false]);
    expect(app.shows("text:2020")).toBe(false);

    // T-013's entry half: Tab reaches the trigger first, Enter opens the
    // panel through the keyboard modality, Escape closes it again.
    const kb = await openPicker("mobile");
    await kb.keyboard.press("tab");
    await kb.keyboard.press("enter");
    await kb.waitUntil(() => callsOf(kb, "onYearPickerOpenChange").length === 1);
    expect(kb.shows("text:2020")).toBe(true);
    await kb.keyboard.press("escape");
    await kb.waitUntil(() => callsOf(kb, "onYearPickerOpenChange").length === 2);
    expect(kb.shows("text:2020")).toBe(false);
  }, 120_000);

  // adapt-sheets/calendar-year-picker.md M-010 (A-008, A-009): the fixture
  // itself is the assertion carrier — the `mobile` case mounts in both
  // environments, the contract probes record, and every seam probe answers.
  test("M-010 the fixture opens in both environments and every probe records", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openPicker("mobile", scope ? { scope } : {});
      expect(app.shows(TRIGGER)).toBe(true);

      await app.press(TRIGGER);
      await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 1);
      expect(eventArgs(app)).toEqual(["down", "up", "press"]);
      expect(callsOf(app, "layout").length).toBeGreaterThan(0);
      expect(callsOf(app, "ctx-env").length).toBeGreaterThan(0);
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(scope === "touch");

      // The cell seam's probes mount with the grid and record their edges.
      expect(callsOf(app, "cell-ctx-pressed").length).toBeGreaterThan(0);
      expect(callsOf(app, "cell-ctx-env").length).toBeGreaterThan(0);
      await app.waitUntil(
        () =>
          callsOf(app, "ctx-state").length > 0 &&
          callsOf(app, "cell-ctx-state").length > 0,
      );

      // Under pointer the seam never engages; under touch the press edges
      // roundtrip and settle. On web a slow press can leave a mid-hold
      // sample reading true, so the touch half only needs the edges to have
      // roundtripped by the last read.
      if (scope === "") {
        expect(seamEdges(app, "ctx-pressed").every((e) => e === false)).toBe(true);
        expectStatesAtRest(app, "ctx-state");
      } else {
        await app.waitUntil(() => seamEdges(app, "ctx-pressed").at(-1) === false);
        expect(seamEdges(app, "ctx-pressed")).toContain(true);
      }
    }
  }, 120_000);
});
