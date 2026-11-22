import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for CalendarYearPicker (adapt unit, action B),
 * one test per row of adapt-sheets/calendar-year-picker.md §4 (M-001…M-010),
 * minus M-007 which is web-only (the sticky-hover half needs a real web
 * hover). This file also carries the headless-only halves: the
 * `open({platform:"ios"})` host derivation inside M-009 and the held-press
 * `ctx-state` samples inside M-002, which need `dragAndHold`/`drop`
 * (headless only — `--target web` has no held-drag step).
 *
 * The fixture is `harness/calendar-year-picker.fixtures.tsx`, opened by
 * `host.params`: `case` ("mobile" — the only case), `scope` ("" host default
 * or "touch" through `EnvironmentScope`), `compact` (24×24 trigger →
 * non-empty hitSlop), `disabled` (`isDisabled` on the trigger).
 *
 * Probe payloads (all in `app.storage()`): `events` ("down"/"up"/"press" on
 * the trigger), `cell-press` ("down"/"press" on the 2027 cell only),
 * `onYearPickerOpenChange` (bool), `layout` ({name:"trigger"|"cell-2027",
 * width, height}), `ctx-pressed`/`ctx-state`/`ctx-env` (trigger seam),
 * `cell-ctx-pressed`/`cell-ctx-state`/`cell-ctx-env` (2027 cell seam),
 * `ctx-channels` (on-demand trigger channel read through `id:ctx-sample`).
 * The 2027 cell's children are its `CtxProbe`, so `text:2027` never renders —
 * the cell is reached as `role:button[/^2027$/]` (its accessibilityLabel).
 * `hitSlop` and `origin` serialize `undefined`/`null` — the seam's rest
 * values.
 */

type Params = Record<string, string>;

function openPicker(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../calendar-year-picker.fixtures.tsx", {
    platform: "windows",
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
type LayoutProbe = { name: string; width: number; height: number };

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

/** `*-ctx-state` samples that ran while the seam's press was held. */
function heldStates(app: App, name: string): CtxState[] {
  return callsOf(app, name)
    .map((c) => c[0] as CtxState)
    .filter((s) => s.seamPressed === true);
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

/** Every recorded `*-ctx-state` sample's hitSlop sits at the rest value. */
function expectHitSlopAtRest(app: App, name: string): void {
  for (const call of callsOf(app, name)) {
    expect((call[0] as CtxState).hitSlop).toBeNull();
  }
}

/**
 * The contract stream with only the trigger events and the open reports
 * left, in record order. The trigger's `onPress` chain runs the caller's
 * probe before `toggle()` (sheet §1), so a clean press reads
 * down, up, press, then the open report.
 */
function pressAndOpenSequence(app: App): string[] {
  return calls(app)
    .filter((c) => c.name === "events" || c.name === "onYearPickerOpenChange")
    .map((c) =>
      c.name === "events" ? `events:${c.args[0] as string}` : `open:${c.args[0]}`,
    );
}

/** The last `layout` probe entry for a named view. */
function layoutFor(app: App, name: string): LayoutProbe {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutProbe)
    .filter((l) => l.name === name);
  return entries[entries.length - 1]!;
}

/** Both `layout` probes (trigger + 2027 cell) have reported at least once. */
function bothLayoutsRecorded(app: App): boolean {
  const names = callsOf(app, "layout").map((c) => (c[0] as LayoutProbe).name);
  return names.includes("trigger") && names.includes("cell-2027");
}

describe("calendar-year-picker mobile (headless)", () => {
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

  // adapt-sheets/calendar-year-picker.md M-002 (A-003): under an injected
  // touch environment a trigger press engages the seam — `ctx-pressed`
  // records the true→false roundtrip, the held `ctx-state` samples
  // (dragAndHold keeps the finger down past the +600/+1500 ms marks) show
  // the canonical channels activated — and the toggle still commits exactly
  // once per press, in contract order.
  test("M-002 injected touch: trigger press roundtrips the seam and toggles exactly once", async () => {
    const app = await openPicker("mobile", { scope: "touch" });

    await app.press(TRIGGER);
    await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 1);

    // The panel flips once: open reported exactly once, cells show.
    expect(app.shows("text:2020")).toBe(true);
    // `local.onPress` probes before `toggle()` reports (sheet §1).
    expect(pressAndOpenSequence(app)).toEqual([
      "events:down",
      "events:up",
      "events:press",
      "open:true",
    ]);

    // The seam's edge roundtrip: engaged on the way down, reset on release.
    await app.waitUntil(() => seamEdges(app, "ctx-pressed").at(-1) === false);
    const edges = seamEdges(app, "ctx-pressed");
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);

    // Second press toggles closed — exactly one more report, no double commit.
    await app.press(TRIGGER);
    await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 2);
    expect(pressAndOpenSequence(app)).toEqual([
      "events:down",
      "events:up",
      "events:press",
      "open:true",
      "events:down",
      "events:up",
      "events:press",
      "open:false",
    ]);
    expect(app.shows("text:2020")).toBe(false);

    // Held press on a fresh mount: dragAndHold keeps the finger down so the
    // probe's delayed samples land mid-hold and read the live channels —
    // canonical flag up, `pressed` animating toward 1, the press origin
    // recorded, gate open.
    const held = await openPicker("mobile", { scope: "touch" });
    await held.dragAndHold(TRIGGER, { x: 0, y: 0 });
    await held.waitUntil(() => heldStates(held, "ctx-state").length >= 2);
    const heldSample = heldStates(held, "ctx-state").at(-1)!;
    expect(heldSample.seamPressed).toBe(true);
    // The canonical `pressed` channel is mid-run at the +1500 ms mark (the
    // timing has not settled), so the assertion is "engaged", not an end
    // value the sheet never pinned.
    expect(heldSample.pressed).toBeGreaterThan(0.5);
    expect(heldSample.enabled).toBe(true);
    expect(heldSample.origin).not.toBeNull();

    // `drop()` lifts the finger: release and cancel share `pressUp`, so the
    // seam returns to rest and the next scheduled samples read false.
    await held.drop();
    await held.waitUntil(() => seamEdges(held, "ctx-pressed").at(-1) === false);
    const stateCount = callsOf(held, "ctx-state").length;
    await held.waitUntil(() => callsOf(held, "ctx-state").length > stateCount);
    expect(lastOf<CtxState>(held, "ctx-state").seamPressed).toBe(false);
  }, 120_000);

  // adapt-sheets/calendar-year-picker.md M-003 (A-004): under touch a press
  // on the 2027 cell roundtrips that cell's seam — `cell-ctx-pressed`
  // records true→false — while the commit still happens exactly once: the
  // caller's `cell-press` probe precedes `onYearPickerOpenChange(false)`
  // (`local.onPress` → `selectYear`), and the day grid's focused year lands
  // on 2027.
  test("M-003 injected touch: pressing the 2027 cell roundtrips its seam and commits once", async () => {
    const app = await openPicker("mobile", { scope: "touch" });

    await app.press(TRIGGER);
    await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 1);
    expect(app.shows("text:2020")).toBe(true);

    await app.press(CELL_2027);
    await app.waitUntil(() => callsOf(app, "onYearPickerOpenChange").length === 2);

    // One commit: open then close, each reported once.
    expect(callsOf(app, "onYearPickerOpenChange")).toEqual([[true], [false]]);
    expect(callsOf(app, "cell-press")).toEqual([["down"], ["press"]]);
    // The focused year moved to 2027 (T-002's `role:grid` assertion).
    expect(app.shows("role:grid[/2027/]")).toBe(true);

    // `cell-press:"press"` is recorded before the close commit — the caller's
    // `onPress` runs ahead of `grid.selectYear` in the cell's chain.
    const sequence = calls(app).map((c) => `${c.name}:${JSON.stringify(c.args)}`);
    const pressIndex = sequence.lastIndexOf('cell-press:["press"]');
    const closeIndex = sequence.lastIndexOf("onYearPickerOpenChange:[false]");
    expect(pressIndex).toBeGreaterThanOrEqual(0);
    expect(closeIndex).toBeGreaterThan(pressIndex);

    // The cell seam's edge roundtrip, on a fresh mount: a tap's true→false
    // can land inside one effect flush on this host (the probe would only
    // ever record the falses), so the held press is what observes the seam —
    // `longPress` keeps `isPressed` up for its 500 ms, the edge effect
    // records the engage, and the release records the reset.
    const held = await openPicker("mobile", { scope: "touch" });
    await held.press(TRIGGER);
    await held.waitUntil(() => callsOf(held, "onYearPickerOpenChange").length === 1);

    // The probe reads the cell's own `PressableFeedbackContext` (A-005's
    // composition outlet): under touch its gate must report open. A resting
    // default context would read `enabled: false` here — that is the defect
    // this row exists to catch.
    await held.waitUntil(() => callsOf(held, "cell-ctx-env").length > 0);
    expect(lastOf<CtxEnv>(held, "cell-ctx-env").enabled).toBe(true);

    const edgeCount = seamEdges(held, "cell-ctx-pressed").length;
    await held.longPress(CELL_2027);
    await held.waitUntil(
      () => seamEdges(held, "cell-ctx-pressed").length > edgeCount,
    );
    const fresh = seamEdges(held, "cell-ctx-pressed").slice(edgeCount);
    expect(fresh[0]).toBe(true);
    expect(fresh).toContain(true);
    expect(fresh.at(-1)).toBe(false);
  }, 120_000);

  // adapt-sheets/calendar-year-picker.md M-004 (A-001): the `input` axis's
  // `min-h-11` gives the touch trigger row and each year cell their 44 pt
  // minimum; under pointer the same case keeps its content height (no lower
  // bound asserted — desktop zero drift).
  test("M-004 injected touch: trigger and 2027 cell measure at least 44pt; pointer keeps content height", async () => {
    const touch = await openPicker("mobile", { scope: "touch" });
    await touch.waitUntil(() => bothLayoutsRecorded(touch));
    expect(layoutFor(touch, "trigger").height).toBeGreaterThanOrEqual(44);
    expect(layoutFor(touch, "cell-2027").height).toBeGreaterThanOrEqual(44);

    const pointer = await openPicker("mobile");
    await pointer.waitUntil(() => bothLayoutsRecorded(pointer));
    expect(layoutFor(pointer, "trigger").height).toBeGreaterThan(0);
    expect(layoutFor(pointer, "cell-2027").height).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/calendar-year-picker.md M-005 (A-003, A-004): on a 24×24
  // trigger the seam's hitSlop pads the under-target sides toward 44 pt;
  // default-size surfaces already reach the target, so the accessor stays
  // undefined (null in the probe payload) — trigger row and 2027 cell alike.
  test("M-005 compact trigger reports computed hitSlop; sufficient sizes report none", async () => {
    const compact = await openPicker("mobile", {
      scope: "touch",
      compact: "1",
    });
    // The first ctx-env report precedes layout (bounds 0×0 → no slop); wait
    // for the report the trigger's onLayout retriggers.
    await compact.waitUntil(() => {
      const env = callsOf(compact, "ctx-env").at(-1)?.[0] as CtxEnv | undefined;
      return env !== undefined && env.hitSlop !== null;
    });
    const env = lastOf<CtxEnv>(compact, "ctx-env");
    expect(env.enabled).toBe(true);
    const slop = env.hitSlop!;
    for (const side of [slop.top, slop.right, slop.bottom, slop.left]) {
      expect(side).toBeGreaterThanOrEqual(0);
    }
    // A 24 pt wide trigger is under the target: at least one side pads.
    expect(Math.max(slop.top, slop.right, slop.bottom, slop.left)).toBeGreaterThan(0);

    // The 2027 cell is not compacted: `min-h-11` already reaches 44 pt, so
    // its seam reports no slop.
    expect(lastOf<CtxEnv>(compact, "cell-ctx-env").hitSlop).toBeNull();

    const plain = await openPicker("mobile", { scope: "touch" });
    // The timed samples are the post-layout read: full-size surfaces never
    // compute a slop, so every sample's hitSlop stays null. (ctx-env only
    // re-reports when the computed value changes — undefined→undefined is
    // not a change — so the sample stream is the reliable carrier here.)
    await plain.waitUntil(
      () =>
        callsOf(plain, "ctx-state").length >= 2 &&
        callsOf(plain, "cell-ctx-state").length >= 2,
    );
    expectHitSlopAtRest(plain, "ctx-state");
    expectHitSlopAtRest(plain, "cell-ctx-state");
    expect(lastOf<CtxEnv>(plain, "ctx-env").hitSlop).toBeNull();
    expect(lastOf<CtxEnv>(plain, "cell-ctx-env").hitSlop).toBeNull();
  }, 120_000);

  // adapt-sheets/calendar-year-picker.md M-006 (A-003): `isDisabled` reports
  // `accessibilityState.disabled`, so the harness refuses the press — and
  // the seam's inline blocked gate reports closed under touch regardless:
  // no events, no toggle, every channel at rest. The pointer half asserts
  // the same rest.
  test("M-006 isDisabled blocks the seam and the toggle in both environments", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openPicker(
        "mobile",
        scope ? { scope, disabled: "1" } : { disabled: "1" },
      );

      expect(app.enabled(TRIGGER)).toBe(false);
      await expect(app.press(TRIGGER)).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });

      expect(eventArgs(app)).toHaveLength(0);
      expect(callsOf(app, "onYearPickerOpenChange")).toHaveLength(0);
      expect(callsOf(app, "cell-press")).toHaveLength(0);
      expect(app.shows("text:2020")).toBe(false);
      expect(seamEdges(app, "ctx-pressed").every((e) => e === false)).toBe(true);
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(false);

      await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
      expectStatesAtRest(app, "ctx-state");
      for (const call of callsOf(app, "ctx-state")) {
        expect((call[0] as CtxState).enabled).toBe(false);
      }

      // The on-demand read confirms the same rest, gate closed inline.
      await app.press("id:ctx-sample");
      await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
      const channels = lastOf<CtxChannels>(app, "ctx-channels");
      expect(channels.seamPressed).toBe(false);
      expect(channels.origin).toBeNull();
      expect(channels.enabled).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/calendar-year-picker.md M-008 (基线): the default
  // environment is the desktop-parity half — the same assertions the
  // heroui suite pins (T-001…T-004): trigger press opens the panel, the
  // focused year paints selected, selecting a year closes and moves the day
  // grid's focused year, and the seam stays inert (M-001). The Escape and
  // Tab/Enter keyboard halves live in the web file — a real Windows
  // headless window takes no keyboard focus (the same host split
  // calendar.heroui.test.tsx / .web.test.tsx records); the existing
  // calendar-year-picker.heroui.test.tsx stays green alongside.
  test("M-008 default environment: year-picker contract matches the heroui suite", async () => {
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
  }, 120_000);

  // adapt-sheets/calendar-year-picker.md M-009 (A-003, headless-only): an
  // ios host with no EnvironmentScope derives input=touch, so the trigger
  // seam engages on a real press (the host-derivation half of M-002/M-004)
  // and the trigger row measures its 44 pt minimum.
  test("M-009 ios host derivation engages the seam without an EnvironmentScope", async () => {
    const ios = await openPicker(
      "mobile",
      {},
      { platform: "ios", width: 390, height: 844 },
    );
    await ios.waitUntil(() => callsOf(ios, "ctx-env").length > 0);
    expect(lastOf<CtxEnv>(ios, "ctx-env").enabled).toBe(true);

    await ios.press(TRIGGER);
    await ios.waitUntil(() => callsOf(ios, "onYearPickerOpenChange").length === 1);
    expect(callsOf(ios, "onYearPickerOpenChange")).toEqual([[true]]);
    expect(eventArgs(ios)).toEqual(["down", "up", "press"]);

    // The seam's edge roundtrip on the host-derived touch environment.
    await ios.waitUntil(() => seamEdges(ios, "ctx-pressed").at(-1) === false);
    const edges = seamEdges(ios, "ctx-pressed");
    expect(edges).toContain(true);
    expect(edges.at(-1)).toBe(false);

    // The `min-h-11` half of M-004 under host derivation.
    await ios.waitUntil(() => bothLayoutsRecorded(ios));
    expect(layoutFor(ios, "trigger").height).toBeGreaterThanOrEqual(44);
    expect(layoutFor(ios, "cell-2027").height).toBeGreaterThanOrEqual(44);
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
      // roundtrip and settle.
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
