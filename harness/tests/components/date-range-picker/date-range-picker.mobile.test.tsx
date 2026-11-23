import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";
import {
  isoOf,
  lastRange,
  rangeCount,
  layoutOf,
} from "../../testers/date-range-picker";

/*
 * Mobile assertions for the date-range-picker adapt unit (C+G/B(继承): the
 * range-calendar overlay carrier and the dual-date editing channel), one
 * test per row of adapt-sheets/date-range-picker.md §4 that the shared
 * targets (headless + web) can observe: M-001 … M-004, M-007 … M-011,
 * M-013 … M-015. The ios host-derivation rows (M-005, M-006, M-012) live in
 * `date-range-picker.mobile.headless.test.tsx` because `open`'s `platform`
 * option rejects `ios`/`android` under `--target web`.
 *
 * The fixture is `harness/date-range-picker.fixtures.tsx`, opened by
 * `host.params`: `case` (default / open / layout / no-close-on-select /
 * controlled), `input` / `width` / `density` feed the fixture's always-on
 * `EnvironmentScope` (absent = host baseline), `presentation` / `nonmodal` /
 * `kd` / `kt` / `readonly` / `disabled` parameterize the Popover, the Inputs
 * and the Root. Carrier probes are the derived testIDs —
 * `id:drp-popover-panel` on the anchored overlay, `id:drp-popover-sheet` on
 * the Sheet panel (adapt sheet §8's registered observable-id change).
 *
 * The `platform: "windows"` pin is load-bearing: without it `pnpm test`
 * lands the app on the phone-sized engine where `input` defaults to touch
 * and every pointer-default assertion inverts under the suite (_common.md).
 *
 * Every assertion reads what `nsh/test` can observe — `shows`, `count`,
 * `enabled`, `texts`, `onLayout` bounds probes and the `@scenario/probe`
 * calls in `app.storage()`: `layout` (group/trigger/separator/suffix),
 * `segment-bounds`, `segment-props`, `keyboard-type`, `onChange`,
 * `openChange`, `trigger-focus`. Class names are never read.
 */

type Params = Record<string, string>;

function openDrp(
  caseName: string,
  params: Params = {},
  options: Omit<OpenOptions, "host"> = {},
): Promise<App> {
  return open("../../../date-range-picker.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

/* -------------------------------------------------------------------------------------------------
 * Probe readers for the mobile-layer records.
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER = "id:drp-trigger";
const PANEL = "id:drp-popover-panel";
const SHEET = "id:drp-popover-sheet";
const CALENDAR = "id:drp-calendar";
const START_INPUT = "id:drp-start-input";
const END_INPUT = "id:drp-end-input";
const START_MONTH = `${START_INPUT} >> id:dig-seg-month`;
const START_DAY = `${START_INPUT} >> id:dig-seg-day`;
const START_YEAR = `${START_INPUT} >> id:dig-seg-year`;
const END_MONTH = `${END_INPUT} >> id:dig-seg-month`;
const ANY_MONTH_CHANNEL = "id:dig-seg-month";
/* The first spinbutton of a field's Input is its month segment (literals
 * are hidden from the accessibility tree); the View-path focus + keymap
 * half of M-013 presses the end field's directly. */
const END_MONTH_SEGMENT = `${END_INPUT} >> role:spinbutton >> nth=0`;
/* The range calendar's day cells, named the way the heroui cases name them. */
const DAY_10 = "role:button[/August 10, 2026/]";
const DAY_12 = "role:button[/August 12, 2026/]";

type Bounds = { origin: { x: number; y: number }; size: { width: number; height: number } };

type SegmentBoundsEntry = { side: string; type: string; bounds: Bounds };
type SegmentPropsEntry = {
  side: string;
  type: string;
  isFocused: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  text: string;
};
type KeyboardTypeEntry = { side: string; type: string };

function segmentBounds(app: App, side: string, type: string): Bounds {
  const found = callsOf(app, "segment-bounds")
    .map((c) => c[0] as SegmentBoundsEntry)
    .filter((e) => e.side === side && e.type === type)
    .at(-1);

  if (!found) throw new Error(`no segment bounds recorded for ${side}/${type}`);

  return found.bounds;
}

function segmentRecord(app: App, side: string, type: string): SegmentPropsEntry {
  const found = callsOf(app, "segment-props")
    .map((c) => c[0] as SegmentPropsEntry)
    .filter((e) => e.side === side && e.type === type)
    .at(-1);

  if (!found) throw new Error(`no segment props recorded for ${side}/${type}`);

  return found;
}

function segmentText(app: App, side: string, type: string): string {
  return segmentRecord(app, side, type).text;
}

function isSegmentFocused(app: App, side: string, type: string): boolean {
  return segmentRecord(app, side, type).isFocused;
}

async function waitSegmentFocused(app: App, side: string, type: string): Promise<void> {
  await app.waitUntil(() => isSegmentFocused(app, side, type));
}

function keyboardTypes(app: App): KeyboardTypeEntry[] {
  return callsOf(app, "keyboard-type").map((c) => c[0] as KeyboardTypeEntry);
}

async function openLayer(app: App): Promise<void> {
  await app.press(TRIGGER);
  await app.waitFor(CALENDAR);
}

describe("date-range-picker mobile", () => {
  // adapt-sheets/date-range-picker.md M-001 (A-003, A-011): the default
  // pointer environment at 1024×768 mounts the panel carrier —
  // `drp-popover-panel` present, `drp-popover-sheet` absent — with the range
  // calendar showing and `onOpenChange(true)` recorded once. Desktop zero
  // drift.
  test("M-001 default environment opens the panel carrier", async () => {
    const app = await openDrp("open");

    expect(app.count(PANEL)).toBe(0);
    expect(app.count(SHEET)).toBe(0);

    await openLayer(app);

    expect(app.count(PANEL)).toBe(1);
    expect(app.count(SHEET)).toBe(0);
    expect(app.shows(CALENDAR)).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-002 (A-005, 负断言): under the
  // default pointer environment the trigger's `onLayout` box is its content
  // size — the icon box + `p-1` is far under 44pt and `hitSlop` never
  // inflates layout — and the press → `picker.toggle()` → `onOpenChange`
  // chain is verbatim with no touch-only artifact: no `onChange` fires, and
  // the probe surface stays the fixture's own names (`hitSlop` itself is a
  // view prop with no `nsh/test` readout — sheet §6 host gap, real
  // expansion is real-device acceptance).
  test("M-002 default environment keeps content-sized trigger bounds and the verbatim chain", async () => {
    const app = await openDrp("open");

    const trigger = layoutOf(app, "trigger");
    expect(trigger.width).toBeLessThan(44);
    expect(trigger.height).toBeLessThan(44);

    await app.press(TRIGGER);
    await app.waitFor(CALENDAR);

    expect(callsOf(app, "openChange")).toEqual([[true]]);
    expect(rangeCount(app)).toBe(0);
    // No touch-only artifact: every recorded probe is one of the fixture's
    // own names — the component added no event and no observation surface.
    const fixtureProbes = new Set([
      "layout",
      "openChange",
      "onChange",
      "trigger-focus",
      "segment-bounds",
      "segment-props",
      "keyboard-type",
    ]);
    for (const name of allProbeNames(app)) {
      expect(fixtureProbes.has(name)).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-003 (A-002, A-004): injected
  // `input:"touch"` + `width:"compact"` resolves `auto` to the sheet
  // carrier — `drp-popover-sheet` mounts with the calendar, the panel probe
  // never appears, and `onOpenChange(true)` still records one round.
  test("M-003 injected touch+compact resolves auto to the sheet carrier", async () => {
    const app = await openDrp("open", { input: "touch", width: "compact" });

    await app.press(TRIGGER);
    await app.waitFor(CALENDAR);

    expect(app.count(SHEET)).toBe(1);
    expect(app.count(PANEL)).toBe(0);
    expect(app.shows(CALENDAR)).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-004 (A-001, A-004): an explicit pin
  // wins over the auto rule in both directions — `presentation="sheet"`
  // mounts the Sheet carrier even under the default pointer environment,
  // and `presentation="panel"` keeps the anchored overlay under injected
  // touch+compact where auto would pick sheet.
  test("M-004 explicit presentation pin beats the auto rule on both environments", async () => {
    const pinnedSheet = await openDrp("open", { presentation: "sheet" });
    await pinnedSheet.press(TRIGGER);
    await pinnedSheet.waitFor(CALENDAR);
    expect(pinnedSheet.count(SHEET)).toBe(1);
    expect(pinnedSheet.count(PANEL)).toBe(0);
    expect(callsOf(pinnedSheet, "openChange")).toEqual([[true]]);

    const pinnedPanel = await openDrp("open", {
      presentation: "panel",
      input: "touch",
      width: "compact",
    });
    await pinnedPanel.press(TRIGGER);
    await pinnedPanel.waitFor(CALENDAR);
    expect(pinnedPanel.count(PANEL)).toBe(1);
    expect(pinnedPanel.count(SHEET)).toBe(0);
    expect(callsOf(pinnedPanel, "openChange")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-007 (A-002): `isNonModal` folds
  // into the pin — a non-modal layer has no sheet semantics, so under
  // touch+compact `auto` still resolves the panel carrier and the sheet
  // probe never mounts.
  test("M-007 isNonModal suppresses auto sheet resolution", async () => {
    const app = await openDrp("open", {
      nonmodal: "1",
      input: "touch",
      width: "compact",
    });

    await app.press(TRIGGER);
    await app.waitFor(CALENDAR);

    expect(app.count(PANEL)).toBe(1);
    expect(app.count(SHEET)).toBe(0);
    expect(app.shows(CALENDAR)).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-008 (A-005): injected touch — the
  // trigger's `onLayout` box stays its content size (`hitSlop` is the
  // invisible half; §6 registers that `nsh/test` has no view-prop readout,
  // so real hit expansion is real-device acceptance), and the
  // press → toggle → open chain is unchanged. Touch + regular width still
  // resolves `auto` to panel.
  test("M-008 injected touch keeps content-sized bounds and the unchanged open chain", async () => {
    const app = await openDrp("open", { input: "touch" });

    const trigger = layoutOf(app, "trigger");
    expect(trigger.width).toBeLessThan(44);
    expect(trigger.height).toBeLessThan(44);

    await app.press(TRIGGER);
    await app.waitFor(CALENDAR);

    expect(app.count(PANEL)).toBe(1);
    expect(app.count(SHEET)).toBe(0);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-009 (A-006): the G/B(继承) channel —
  // under injected touch each side's `dig-seg-*` soft-keyboard input mounts
  // and `app.type` feeds the slot-bound `field.type` (`forSlot`), so start
  // edits write `{start: next, end: current}` and end edits keep the start.
  // Backspace feeds `field.backspace`; Enter is `blurAndSubmit` → the group's
  // commit boundary runs once for both sides and `onChange` fires exactly
  // one committed value. A read-only field keeps the channel mounted but
  // `readonly` — focusable, never editable; a disabled field mounts no
  // channel and its trigger is inert.
  test("M-009 injected touch: dual channels edit both sides, backspace, Enter commit, readonly/disabled gates", async () => {
    const app = await openDrp("default", { input: "touch" });

    // Both sides mount their own channel set (month/day/year each).
    for (const channel of [START_MONTH, START_DAY, START_YEAR, END_MONTH]) {
      expect(app.count(channel)).toBe(1);
    }
    expect(app.count(ANY_MONTH_CHANNEL)).toBe(2);

    // The range owner orders `start <= end` on every write, and every
    // keystroke commits eagerly — so each typed value must keep the range
    // ordered at every intermediate commit (a single "1" into the end
    // month would commit January and swap the sides). The sequence runs
    // smallest-first: January on the start side, then December on the end.
    await app.type(START_MONTH, "1");
    await app.waitUntil(() => lastRange(app)?.start.month === 1);
    expect(lastRange(app)!.start).toEqual({ year: 2026, month: 1, day: 1 });
    expect(lastRange(app)!.end).toEqual({ year: 2026, month: 8, day: 5 });

    // End side: `forSlot("end")` binds the real end state — the start side
    // is preserved verbatim.
    await app.type(END_MONTH, "12");
    await app.waitUntil(() => lastRange(app)?.end.month === 12);
    expect(lastRange(app)!.end).toEqual({ year: 2026, month: 12, day: 5 });
    expect(lastRange(app)!.start).toEqual({ year: 2026, month: 1, day: 1 });

    // Start side again: "11" stays under the end's December, then
    // Backspace on the same channel feeds `field.backspace` — "11" loses
    // one digit and the still-complete value commits as month 1.
    await app.type(START_MONTH, "11");
    await app.waitUntil(() => lastRange(app)?.start.month === 11);
    expect(segmentText(app, "start", "month")).toBe("11");

    await app.press(START_MONTH);
    await waitSegmentFocused(app, "start", "month");
    await app.keyboard.press("backspace");
    await app.waitUntil(() => lastRange(app)?.start.month === 1);
    expect(lastRange(app)!.start).toEqual({ year: 2026, month: 1, day: 1 });

    await app.type(END_MONTH, "11");
    await app.waitUntil(() => lastRange(app)?.end.month === 11);
    expect(lastRange(app)!.end).toEqual({ year: 2026, month: 11, day: 5 });
    expect(lastRange(app)!.start).toEqual({ year: 2026, month: 1, day: 1 });

    // Every keystroke commits eagerly, and the group's blur boundary clamps
    // a complete-but-invalid display: "30" into the February day segment
    // completes the two-digit buffer, auto-advances to the year segment, and
    // the blur runs `commit()` — February 30th lands as the 28th with one
    // `onChange` and the display already reading "28".
    await app.type(START_MONTH, "02");
    await app.waitUntil(() => lastRange(app)?.start.month === 2);

    await app.type(START_DAY, "30");
    await app.waitUntil(() => lastRange(app)?.start.day === 28);
    expect(segmentText(app, "start", "day")).toBe("28");
    expect(lastRange(app)!.start).toEqual({ year: 2026, month: 2, day: 28 });

    // A held invalid display survives while its segment keeps focus: "0"
    // into the month segment is out of range but single-digit, so no
    // auto-advance fires and the commit boundary has not run — the display
    // reads "0" while the committed range stays {2/28 … 11/5}.
    await app.type(START_MONTH, "0");
    await app.waitUntil(() => segmentText(app, "start", "month") === "0");
    const beforeEnter = rangeCount(app);
    expect(lastRange(app)!.start).toEqual({ year: 2026, month: 2, day: 28 });

    // Enter on the channel is `blurAndSubmit`: the blur leaves the group,
    // `commit()` runs once for both sides, the held "0" clamps to January,
    // and `onChange` emits exactly the one committed value — the unchanged
    // end side's commit emits nothing.
    await app.keyboard.press("enter");
    await app.waitUntil(() => rangeCount(app) === beforeEnter + 1);
    expect(isoOf(lastRange(app)!.start)).toBe("2026-01-28");
    expect(lastRange(app)!.end).toEqual({ year: 2026, month: 11, day: 5 });

    // Read-only: the channel still mounts (readonly, not absent) but takes
    // no edit — a key press changes nothing and no `onChange` fires.
    const ro = await openDrp("default", { input: "touch", readonly: "1" });
    expect(ro.count(START_MONTH)).toBe(1);
    expect(ro.enabled(START_MONTH)).toBe(false);

    await ro.press(START_MONTH);
    await waitSegmentFocused(ro, "start", "month");
    await ro.keyboard.press("1");
    await ro.wait(100);
    expect(rangeCount(ro)).toBe(0);
    expect(segmentText(ro, "start", "month")).toBe("8");

    // Disabled: no channel mounts on either side and the trigger is inert.
    const disabled = await openDrp("default", { input: "touch", disabled: "1" });
    expect(disabled.count(ANY_MONTH_CHANNEL)).toBe(0);
    expect(disabled.count(`${START_INPUT} >> id:dig-seg-day`)).toBe(0);
    expect(disabled.count(`${END_INPUT} >> id:dig-seg-year`)).toBe(0);
    await expect(disabled.press(TRIGGER)).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-010 (A-006): `keyboardType` reaches
  // both sides through `DateInputGroupKeyboardContext` — `"auto"` when the
  // prop is absent, the explicit value uniformly when given (the per-
  // segment `"auto"` → `"numeric"`/`"default"` resolution and the host
  // keyboard itself are the channel's own contract and §6's registered
  // gap).
  test("M-010 keyboardType reaches both sides: auto default, explicit uniform", async () => {
    const auto = await openDrp("default", { input: "touch" });
    await auto.waitUntil(() => keyboardTypes(auto).length >= 2);
    expect(keyboardTypes(auto).some((e) => e.side === "start")).toBe(true);
    expect(keyboardTypes(auto).some((e) => e.side === "end")).toBe(true);
    expect(keyboardTypes(auto).every((e) => e.type === "auto")).toBe(true);

    const explicit = await openDrp("default", {
      input: "touch",
      kt: "decimal-pad",
    });
    await explicit.waitUntil(() => keyboardTypes(explicit).length >= 2);
    expect(keyboardTypes(explicit).every((e) => e.type === "decimal-pad")).toBe(true);
    expect(keyboardTypes(explicit).some((e) => e.side === "start")).toBe(true);
    expect(keyboardTypes(explicit).some((e) => e.side === "end")).toBe(true);
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-011 (A-007): under injected touch
  // the `input` axis raises the group row and the segments to the 44pt touch
  // target and the `input×interactive` compound gives the suffix affix its
  // 44×44 hit area; under the default pointer environment the same probes
  // report the desktop metrics (the 36pt row, content-sized affix).
  test("M-011 touch raises group/segments/affix to 44pt, pointer keeps desktop metrics", async () => {
    const touch = await openDrp("default", { input: "touch" });
    await touch.waitUntil(() => callsOf(touch, "segment-bounds").length > 0);

    expect(layoutOf(touch, "group").height).toBeGreaterThanOrEqual(44);
    for (const type of ["month", "day", "year"]) {
      expect(segmentBounds(touch, "start", type).size.height).toBeGreaterThanOrEqual(44);
      expect(segmentBounds(touch, "end", type).size.height).toBeGreaterThanOrEqual(44);
    }
    const suffix = layoutOf(touch, "suffix");
    expect(suffix.height).toBeGreaterThanOrEqual(44);
    expect(suffix.width).toBeGreaterThanOrEqual(44);

    const pointer = await openDrp("default");
    await pointer.waitUntil(() => callsOf(pointer, "segment-bounds").length > 0);

    expect(layoutOf(pointer, "group").height).toBeLessThan(44);
    for (const type of ["month", "day", "year"]) {
      expect(segmentBounds(pointer, "start", type).size.height).toBeLessThan(44);
    }
    const pointerSuffix = layoutOf(pointer, "suffix");
    expect(pointerSuffix.height).toBeLessThan(44);
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-013 (A-006, 负断言): under the
  // default pointer environment no `dig-seg-*` channel mounts on either
  // side — segment focus stays on the View path and the keymap digits drive
  // the slot-bound `field.type`/`onChange` exactly as before, with no new
  // input channel.
  test("M-013 default environment: no channel mounts, View focus and keymap unchanged", async () => {
    const app = await openDrp("default");

    for (const type of ["month", "day", "year"]) {
      expect(app.count(`id:dig-seg-${type}`)).toBe(0);
      expect(app.count(`${START_INPUT} >> id:dig-seg-${type}`)).toBe(0);
      expect(app.count(`${END_INPUT} >> id:dig-seg-${type}`)).toBe(0);
    }

    // The month segment takes the press (View path), the keymap digits edit
    // it, and the commit reaches `onChange` with the other side preserved.
    // A single "9" keeps the end inside the range — every keystroke commits
    // eagerly and "1" would commit January and swap the sides.
    await app.press(END_MONTH_SEGMENT);
    await app.keyboard.press("9");
    await app.waitUntil(() => lastRange(app)?.end.month === 9);

    expect(lastRange(app)!.end).toEqual({ year: 2026, month: 9, day: 5 });
    expect(lastRange(app)!.start).toEqual({ year: 2026, month: 8, day: 1 });
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-014 (基线): the default environment
  // keeps the desktop contract — a sample of the semantics the existing
  // heroui/web/layout files pin, re-asserted here so the mobile layer
  // cannot drift them: trigger toggle and the covered-press close (the
  // underlay on web, the toggle dispatch on headless — same
  // `onOpenChange(false)`), Escape close and its `isKeyboardDismissDisabled`
  // gate, `shouldCloseOnSelect`'s two-press range close with `isSelecting`
  // holding the layer after the anchor press, `shouldCloseOnSelect={false}`
  // keeping it open, and the separator's real box. (`accessibilityState.
  // expanded`, the focus-visible ring, `markRestoreFocus`, `UNMODIFIED_KEYS`,
  // the exit-hold props and the no-effect props have no `nsh/test` readout
  // or fixture knob — they stay with the read-only files.)
  test("M-014 default environment baseline sample: toggle, covered press, Escape, kd, select-close, separator", async () => {
    // Toggle on, then the covered-press close: while the modal underlay is
    // up a press on the trigger lands on the underlay (web hit-test) or
    // dispatches to the toggle (headless) — either way `onOpenChange(false)`
    // lands exactly once.
    const app = await openDrp("open", {}, { clock: {} });

    await openLayer(app);
    expect(callsOf(app, "openChange")).toEqual([[true]]);

    await app.press(TRIGGER);
    await app.waitFor(PANEL, { state: "gone" });
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);

    // Escape closes through the panel's `handleCancel` — a fresh app: on
    // the web target a press on the trigger after the overlay has closed
    // once never reaches `onPress` (an invisible remnant keeps covering
    // the page; the date-picker unit measured the same and recorded it as
    // a host-gap suspicion, so reopen-after-close is not asserted here).
    const esc = await openDrp("open", {}, { clock: {} });
    await openLayer(esc);
    expect(callsOf(esc, "openChange")).toEqual([[true]]);

    await esc.keyboard.press("escape");
    await esc.waitFor(PANEL, { state: "gone" });
    expect(callsOf(esc, "openChange")).toEqual([[true], [false]]);

    // `isKeyboardDismissDisabled` gates Escape; the covered press still
    // closes through the other channel.
    const kb = await openDrp("open", { kd: "1" }, { clock: {} });
    await openLayer(kb);
    await kb.keyboard.press("escape");
    await kb.clock!.runFor(120);
    expect(kb.count(PANEL)).toBe(1);
    expect(callsOf(kb, "openChange")).toEqual([[true]]);

    await kb.press(TRIGGER);
    await kb.waitFor(PANEL, { state: "gone" });
    expect(callsOf(kb, "openChange")).toEqual([[true], [false]]);

    // `shouldCloseOnSelect` (default): the first day press sets the anchor
    // and `isSelecting` holds the layer; the second completes the range,
    // closes it, and `onChange` carries the picked range once.
    const select = await openDrp("open");
    await openLayer(select);

    await select.press(DAY_10);
    await select.wait(20);
    expect(select.count(PANEL)).toBe(1);
    expect(callsOf(select, "openChange")).toEqual([[true]]);

    await select.press(DAY_12);
    await select.waitFor(PANEL, { state: "gone" });
    expect(callsOf(select, "openChange")).toEqual([[true], [false]]);
    expect(isoOf(lastRange(select)!.start)).toBe("2026-08-10");
    expect(isoOf(lastRange(select)!.end)).toBe("2026-08-12");

    // `shouldCloseOnSelect={false}`: the same two presses complete the
    // range but the layer stays open.
    const keep = await openDrp("no-close-on-select");
    await openLayer(keep);
    await keep.press(DAY_10);
    await keep.wait(20);
    await keep.press(DAY_12);
    await keep.wait(50);
    expect(keep.count(PANEL)).toBe(1);
    expect(isoOf(lastRange(keep)!.start)).toBe("2026-08-10");
    expect(isoOf(lastRange(keep)!.end)).toBe("2026-08-12");

    // R-012: the separator is a real `px-1` box between the two fields.
    const sep = layoutOf(keep, "separator");
    expect(sep.width).toBeGreaterThan(0);
    expect(keep.texts()).toContain(" - ");
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-015 (A-011): the fixture itself —
  // `Scoped` mounts both environments (input/width/density absent = host
  // baseline), every param mounts and discriminates, and the probes the
  // assertions read (layout bounds, segment bounds/props, keyboard-type,
  // carrier testIDs, storage callbacks) all record.
  test("M-015 fixture Scoped params, case params and probes all mount and discriminate", async () => {
    const baseline = await openDrp("default");
    expect(baseline.shows(TRIGGER)).toBe(true);
    await baseline.waitUntil(() => callsOf(baseline, "segment-bounds").length > 0);
    // Every probe family the mobile assertions read has recorded.
    expect(layoutOf(baseline, "group").height).toBeGreaterThan(0);
    expect(layoutOf(baseline, "trigger").height).toBeGreaterThan(0);
    expect(layoutOf(baseline, "separator").width).toBeGreaterThan(0);
    expect(layoutOf(baseline, "suffix").height).toBeGreaterThan(0);
    expect(segmentBounds(baseline, "start", "month").size.height).toBeGreaterThan(0);
    expect(segmentText(baseline, "start", "month")).toBe("8");
    expect(keyboardTypes(baseline).every((e) => e.type === "auto")).toBe(true);

    // The injected environment reaches the carrier switch.
    const injected = await openDrp("open", { input: "touch", width: "compact" });
    await injected.press(TRIGGER);
    await injected.waitFor(CALENDAR);
    expect(injected.count(SHEET)).toBe(1);
    expect(injected.count(PANEL)).toBe(0);

    // The presentation / nonmodal params discriminate on the same case.
    const pinned = await openDrp("open", { presentation: "sheet" });
    await pinned.press(TRIGGER);
    await pinned.waitFor(CALENDAR);
    expect(pinned.count(SHEET)).toBe(1);

    const nonModal = await openDrp("open", {
      nonmodal: "1",
      input: "touch",
      width: "compact",
    });
    await nonModal.press(TRIGGER);
    await nonModal.waitFor(CALENDAR);
    expect(nonModal.count(PANEL)).toBe(1);
    expect(nonModal.count(SHEET)).toBe(0);

    // The edit gates mount: readonly keeps the field readable, disabled
    // marks the segments (both already asserted behaviorally in M-009).
    const ro = await openDrp("default", { readonly: "1" });
    await ro.waitUntil(() => callsOf(ro, "segment-props").length > 0);
    expect(segmentRecord(ro, "start", "month").isReadOnly).toBe(true);
  }, 120_000);
});

/* Every probe name the app recorded — the M-002 negative assertion's "no
 * new observation surface" half reads the raw storage log. */
function allProbeNames(app: App): string[] {
  return [...new Set(calls(app).map((call) => call.name))];
}
