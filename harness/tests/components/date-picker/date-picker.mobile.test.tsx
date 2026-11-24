import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";
import { changeCount, changeRecords, lastLayout } from "../../testers/date-picker";

/*
 * Mobile assertions for the DatePicker adapt unit (C+G/B(继承): the calendar
 * overlay and the date input split), one test per row of
 * adapt-sheets/date-picker.md §4 that headless and web can both observe:
 * M-001, M-002, M-003, M-004, M-007, M-008, M-009, M-010, M-011, M-013,
 * M-014 and M-015. The ios host-derivation rows (M-005, M-012) and the
 * sheet-carrier close semantics (M-006) live in
 * `date-picker.mobile.headless.test.tsx` because `open`'s `platform: "ios"`
 * option is rejected under `--target web`.
 *
 * The fixture is `harness/date-picker.fixtures.tsx`, driven by `host.params`:
 * `case` (default / open / empty / no-close-on-select / controlled …),
 * `input` / `width` / `density` feed the fixture's always-mounted
 * `EnvironmentScope` (absent = the host baseline, never a bare fragment),
 * `presentation` / `nonmodal` / `kt` / `readonly` / `disabled` / `kbdismiss` /
 * `skipanim` parameterize the Popover, the Input's `keyboardType` and the
 * Root's gates.
 *
 * The `input:"pointer"` + `width:"regular"` injection is load-bearing the
 * way the old `platform: "windows"` pin was: `open()` platform/width/height
 * options are rejected on ios/android, so the desktop-parity environment
 * comes from `host.params` → `EnvironmentScope`; without it the host
 * defaults `input` to touch and every pointer-default assertion inverts
 * under the suite (_common.md).
 *
 * The carrier probe is the derived testID — `id:dp-popover-panel` on the
 * anchored overlay, `id:dp-popover-sheet` on the Sheet carrier (adapt sheet
 * §8) — so `shows`/`count` discriminate the presentation. Every assertion
 * reads what `nsh/test` can observe: `shows`, `count`, `enabled`, `texts`,
 * the `layout` probe's `onLayout` bounds (`trigger`, `group`, `suffix`,
 * `segment-<type>`, `calendar`, `preset`), the `segments` render-prop
 * records, the `keyboard-type` context records and the `onChange` /
 * `openChange` / `trigger-focus` callback probes in `app.storage()`.
 * `hitSlop` itself has no readout (sheet §6 host gap): M-002/M-008 assert
 * the only measurable input — the trigger's `onLayout` box — plus the
 * unchanged press/open chain; the real hit expansion is real-device
 * acceptance.
 */

const TRIGGER = "role:button[Open calendar]";
const PANEL = "id:dp-popover-panel";
const SHEET = "id:dp-popover-sheet";
const CALENDAR = "id:dp-calendar";
/* The day `defaultValue` 2026-08-15 leaves one month on screen; "August 20"
 * names exactly one cell and differs from the default, so a select proves a
 * real write. */
const DAY_20 = "role:button[/August 20, 2026/]";

type Params = Record<string, string>;

function openDp(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "clock"> = {},
): Promise<App> {
  return open("../../../date-picker.fixtures.tsx", {
    locale: "en-US",
    ...options,
    host: {
      params: {
        case: caseName,
        input: "pointer",
        width: "regular",
        ...params,
      },
    },
  });
}

/* -------------------------------------------------------------------------------------------------
 * Probe readers for the mobile-layer records.
 * -----------------------------------------------------------------------------------------------*/

type Bounds = { origin: { x: number; y: number }; size: { width: number; height: number } };
type LayoutRecord = { name: string; x: number; y: number; width: number; height: number };
type SegmentRecord = {
  type: string;
  text: string;
  isPlaceholder: boolean;
  isEditable: boolean;
  isFocused: boolean;
  isReadOnly: boolean;
  isDisabled: boolean;
};

function layoutOf(app: App, name: string): LayoutRecord {
  return lastLayout(app, name, "layout");
}

function segmentRecords(app: App): SegmentRecord[] {
  return callsOf(app, "segments").map((c) => c[0] as SegmentRecord);
}

function lastSegment(app: App, type: string): SegmentRecord {
  const found = segmentRecords(app)
    .filter((r) => r.type === type)
    .at(-1);

  if (!found) throw new Error(`the fixture recorded no ${type} segment`);

  return found;
}

// The last `segments` record per type decides: earlier renders still carry
// the previous `isFocused`, so "focused" means the latest render says so.
function focusedSegmentTypes(app: App): string[] {
  const last = new Map<string, boolean>();
  for (const r of segmentRecords(app)) last.set(r.type, r.isFocused);

  return [...last.entries()].filter(([, focused]) => focused).map(([type]) => type);
}

async function waitFocused(app: App, type: string): Promise<void> {
  await app.waitUntil(() => focusedSegmentTypes(app).includes(type));
}

function keyboardTypes(app: App): string[] {
  return callsOf(app, "keyboard-type").map((c) => String(c[0]));
}

function openChanges(app: App): unknown[][] {
  return callsOf(app, "openChange");
}

// `onLayout` records arrive as the parts lay out; wait for the names a test
// reads rather than the first record of any name.
function layoutNames(app: App): string[] {
  return callsOf(app, "layout").map((c) => (c[0] as LayoutRecord).name);
}

async function waitLayouts(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() => names.every((name) => layoutNames(app).includes(name)));
}

describe("date-picker mobile", () => {
  // adapt-sheets/date-picker.md M-001 (A-003, A-011): the default environment
  // (pointer at 1024×768 on both targets) mounts the panel carrier —
  // `dp-popover-panel` present, `dp-popover-sheet` absent — with the calendar
  // showing and `onOpenChange(true)` recorded once. Desktop zero drift.
  test("M-001 default environment opens the panel carrier", async () => {
    const app = await openDp("open");

    expect(app.count(PANEL)).toBe(0);
    expect(app.count(SHEET)).toBe(0);

    await app.press(TRIGGER);
    /* Native carrier-mount lag: `press` resolves at app-quiet, before the
     * carrier's testID-bearing view registers on screen — run 45344508005's
     * dump had the calendar already mounted while `count(PANEL)` still read
     * 0. `waitFor` bridges the lag (the select suite's convention); the
     * discrimination between the two carriers stays unconditional — the
     * wrong carrier mounts nothing the wait names. */
    await app.waitFor(PANEL);

    expect(app.count(PANEL)).toBe(1);
    expect(app.count(SHEET)).toBe(0);
    expect(app.shows(CALENDAR)).toBe(true);
    expect(openChanges(app)).toEqual([[true]]);
  });

  // adapt-sheets/date-picker.md M-002 (A-005, 负断言): under the default
  // pointer environment the press/open chain is verbatim and no touch-only
  // artifact appears — the trigger's `onLayout` box is the icon box itself
  // (the `hitSlop` half is a view prop with no readout and never inflates
  // layout, sheet §6), the probe set stays inside the fixture's own names,
  // and open still rounds through `onOpenChange` once.
  test("M-002 default environment keeps the verbatim chain with no touch-only surface", async () => {
    const app = await openDp("open");
    await waitLayouts(app, ["trigger"]);

    const trigger = layoutOf(app, "trigger");
    expect(trigger.height).toBeLessThan(44);
    expect(trigger.width).toBeLessThan(44);

    await app.press(TRIGGER);
    await app.waitFor(PANEL);

    expect(app.count(PANEL)).toBe(1);
    expect(openChanges(app)).toEqual([[true]]);

    // No new observation surface: every recorded probe is one the fixture
    // itself owns (onChange fires only on a value change, so it may be
    // absent here — the assertion is subset, not equality).
    const known = new Set([
      "onChange",
      "openChange",
      "trigger-focus",
      "trigger-press",
      "layout",
      "segments",
      "keyboard-type",
    ]);
    for (const call of calls(app)) expect(known.has(call.name)).toBe(true);
  });

  // adapt-sheets/date-picker.md M-003 (A-002, A-004): `EnvironmentScope`
  // injected `input:"touch"` + `width:"compact"` resolves `auto` to the
  // sheet carrier — `dp-popover-sheet` mounts with the calendar,
  // `dp-popover-panel` never appears, and `onOpenChange(true)` still records
  // one round.
  test("M-003 injected touch+compact resolves auto to the sheet carrier", async () => {
    const app = await openDp("open", { input: "touch", width: "compact" });

    await app.press(TRIGGER);
    await app.waitFor(SHEET);

    expect(app.count(SHEET)).toBe(1);
    expect(app.count(PANEL)).toBe(0);
    expect(app.shows(CALENDAR)).toBe(true);
    expect(openChanges(app)).toEqual([[true]]);
  });

  // adapt-sheets/date-picker.md M-004 (A-001, A-004): an explicit pin wins
  // over the auto rule in both directions — `presentation="sheet"` mounts
  // the Sheet carrier even under the desktop environment, and
  // `presentation="panel"` keeps the anchored overlay under injected
  // touch+compact where auto would pick sheet.
  test("M-004 explicit presentation pin beats the auto rule on both environments", async () => {
    const pinnedSheet = await openDp("open", { presentation: "sheet" });
    await pinnedSheet.press(TRIGGER);
    await pinnedSheet.waitFor(SHEET);
    expect(pinnedSheet.count(SHEET)).toBe(1);
    expect(pinnedSheet.count(PANEL)).toBe(0);
    expect(pinnedSheet.shows(CALENDAR)).toBe(true);

    const pinnedPanel = await openDp("open", {
      presentation: "panel",
      input: "touch",
      width: "compact",
    });
    await pinnedPanel.press(TRIGGER);
    await pinnedPanel.waitFor(PANEL);
    expect(pinnedPanel.count(PANEL)).toBe(1);
    expect(pinnedPanel.count(SHEET)).toBe(0);
    expect(pinnedPanel.shows(CALENDAR)).toBe(true);
  });

  // adapt-sheets/date-picker.md M-007 (A-002): `isNonModal` suppresses the
  // sheet resolution under `auto` — a non-modal popover has no sheet
  // semantics (upstream's bottom-sheet is always modal), so touch+compact
  // still mounts the panel carrier's underlay-free chain.
  test("M-007 isNonModal suppresses auto sheet resolution", async () => {
    const app = await openDp("open", {
      nonmodal: "1",
      input: "touch",
      width: "compact",
    });

    await app.press(TRIGGER);
    await app.waitFor(PANEL);

    expect(app.count(PANEL)).toBe(1);
    expect(app.count(SHEET)).toBe(0);
    expect(app.shows(CALENDAR)).toBe(true);
    expect(openChanges(app)).toEqual([[true]]);
  });

  // adapt-sheets/date-picker.md M-008 (A-005): injected touch — the
  // trigger's `onLayout` box keeps its icon-box height (`hitSlop` never
  // inflates layout; the slop edges themselves are the §6 host gap, real
  // expansion on device) and the press → `picker.toggle()` →
  // `onOpenChange` chain is unchanged. Width is the one bound that moves,
  // and not through `hitSlop`: the trigger is `w-full` inside the suffix
  // affix, and the affix's own `input×interactive` compound (A-007) grows
  // it to `min-w-11` + `px-2`, so the trigger fills the wider content box
  // (44 − 16 = 28 vs the pointer's content-sized 24 — the styles table's
  // own "`w-full` resolves against the content width of the affix"
  // note). The height — the dimension a symmetric slop would inflate — is
  // asserted identical.
  test("M-008 injected touch keeps the trigger box and the unchanged open chain", async () => {
    const pointer = await openDp("open");
    await waitLayouts(pointer, ["trigger"]);
    const pointerBox = layoutOf(pointer, "trigger");

    const touch = await openDp("open", { input: "touch" });
    await waitLayouts(touch, ["trigger"]);
    const touchBox = layoutOf(touch, "trigger");

    expect(Math.abs(touchBox.height - pointerBox.height)).toBeLessThan(1);
    expect(touchBox.height).toBeLessThan(44);
    // `w-full` tracks the affix: the touch suffix's interactive padding is
    // the only thing allowed to widen the trigger, never the slop.
    expect(touchBox.width).toBeGreaterThanOrEqual(pointerBox.width);
    expect(touchBox.width).toBeLessThanOrEqual(28);

    await touch.press(TRIGGER);
    await touch.waitFor(PANEL);

    expect(touch.count(PANEL)).toBe(1);
    expect(touch.count(SHEET)).toBe(0);
    expect(openChanges(touch)).toEqual([[true]]);
  });

  // adapt-sheets/date-picker.md M-009 (A-006): under touch the inherited
  // `dig-seg-*` channel hosts the editing — a press focuses it,
  // `app.type` feeds `field.type` with the keymap's buffer/advance rules
  // (the owner is the Root's `createDateFieldState`, whose commit drives
  // the picker's `onChange`), Backspace feeds `field.backspace`, and Enter
  // (`blurAndSubmit`) commits exactly once. `readonly` keeps a mounted but
  // read-only channel; `disabled` mounts none and the trigger reports
  // disabled.
  test("M-009 injected touch: channel edits, backspace, single commit; readonly/disabled gates", async () => {
    const app = await openDp("default", { input: "touch" });
    await app.waitUntil(
      () =>
        app.count("id:dig-seg-month") === 1 &&
        app.count("id:dig-seg-day") === 1 &&
        app.count("id:dig-seg-year") === 1,
    );

    await app.press("id:dig-seg-month");
    await waitFocused(app, "month");

    await app.type("id:dig-seg-month", "11");
    await app.waitUntil(() => lastSegment(app, "month").text === "11");
    // The buffer filled the segment: the focus advanced to the day channel.
    await waitFocused(app, "day");

    // Backspace on the refocused month channel feeds `field.backspace`:
    // "11" loses its last digit.
    await app.press("id:dig-seg-month");
    await waitFocused(app, "month");
    await app.keyboard.press("backspace");
    await app.waitUntil(() => lastSegment(app, "month").text === "1");

    // Each complete+valid edit commits eagerly through the Root's
    // `createDateFieldState` → the picker's `onChange`: "11" then the
    // backspaced "1".
    await app.waitUntil(() => changeRecords(app).at(-1)?.month === 1);
    expect(changeRecords(app).at(-1)).toEqual({ year: 2026, month: 1, day: 15 });

    // Enter is `blurAndSubmit`: an invalid display (February 30th) stays
    // uncommitted while editing — a complete+valid value commits eagerly,
    // an incomplete or invalid one waits for the commit boundary — then
    // `commit()` clamps it and `onChange` gains exactly one record. The
    // `empty` case keeps every segment a placeholder until the year lands,
    // so nothing commits before Enter (the date-input-group M-006 shape).
    const commit = await openDp("empty", { input: "touch" });
    await commit.waitUntil(() => commit.count("id:dig-seg-year") === 1);

    await commit.type("id:dig-seg-month", "02");
    await commit.type("id:dig-seg-day", "30");
    await commit.type("id:dig-seg-year", "2026");
    await commit.waitUntil(() => lastSegment(commit, "year").text === "2026");

    expect(changeCount(commit)).toBe(0);

    await commit.keyboard.press("enter");
    await commit.waitUntil(() => changeCount(commit) === 1);

    expect(changeRecords(commit)[0]).toEqual({ year: 2026, month: 2, day: 28 });

    // `readonly`: the channel still mounts but stays read-only — a press
    // focuses it and keys change nothing. The mount settles a beat after
    // `open` resolves, so the count is read once the read-only render lands.
    const ro = await openDp("default", { readonly: "1", input: "touch" });
    // The channel mount settles a beat after `open` resolves (a transient
    // duplicate counts 3 mid-mount); poll for the settled single channel.
    await ro.waitUntil(() => ro.count("id:dig-seg-month") === 1);
    expect(segmentRecords(ro).some((r) => r.type === "month" && r.isReadOnly)).toBe(true);

    await ro.press("id:dig-seg-month");
    await waitFocused(ro, "month");
    await ro.keyboard.press("1");
    await ro.wait(50);
    expect(lastSegment(ro, "month").text).toBe("8");
    expect(lastSegment(ro, "month").isReadOnly).toBe(true);
    expect(changeCount(ro)).toBe(0);

    // `disabled`: no channel mounts at all and the trigger is inert.
    const disabled = await openDp("default", { disabled: "1", input: "touch" });
    await disabled.waitUntil(() =>
      segmentRecords(disabled).some((r) => r.type === "month" && r.isDisabled),
    );
    expect(disabled.count("id:dig-seg-month")).toBe(0);
    expect(disabled.count("id:dig-seg-day")).toBe(0);
    expect(disabled.count("id:dig-seg-year")).toBe(0);
    expect(disabled.enabled("id:dp-trigger")).toBe(false);
  }, 120_000);

  // adapt-sheets/date-picker.md M-010 (A-006): `DateField.Input`'s
  // `keyboardType` reaches the segments through `DateInputGroupKeyboardContext`
  // — `"auto"` when the prop is absent, the explicit value uniformly when
  // given (the per-segment `"numeric"`/`"default"` resolution and the host
  // keyboard itself are the channel's own prop and a §6 host gap).
  test("M-010 keyboardType reaches the segments: auto default, explicit uniform", async () => {
    const auto = await openDp("default");
    await auto.waitUntil(() => keyboardTypes(auto).length >= 3);
    expect(keyboardTypes(auto).every((v) => v === "auto")).toBe(true);

    const explicit = await openDp("default", { kt: "decimal-pad" });
    await explicit.waitUntil(() => keyboardTypes(explicit).length >= 3);
    expect(keyboardTypes(explicit).every((v) => v === "decimal-pad")).toBe(true);
  });

  // adapt-sheets/date-picker.md M-011 (A-007): under injected touch the
  // picker's `DateInputGroupAffixContext(() => true)` makes the suffix affix
  // interactive, so the inherited `input×interactive` compound lifts the
  // group row, the segments and the suffix to the 44pt touch target; the
  // pointer environment keeps the desktop metrics (the 36pt row).
  test("M-011 injected touch lifts group/segments/suffix to 44pt, pointer keeps desktop metrics", async () => {
    const touch = await openDp("default", { input: "touch" });
    await waitLayouts(touch, ["group", "suffix", "segment-month", "segment-day", "segment-year"]);

    expect(layoutOf(touch, "group").height).toBeGreaterThanOrEqual(44);
    for (const type of ["month", "day", "year"]) {
      expect(layoutOf(touch, `segment-${type}`).height).toBeGreaterThanOrEqual(44);
    }
    const touchSuffix = layoutOf(touch, "suffix");
    expect(touchSuffix.height).toBeGreaterThanOrEqual(44);
    expect(touchSuffix.width).toBeGreaterThanOrEqual(44);

    const pointer = await openDp("default");
    await waitLayouts(pointer, ["group", "suffix", "segment-month", "segment-day", "segment-year"]);

    expect(layoutOf(pointer, "group").height).toBeLessThan(44);
    for (const type of ["month", "day", "year"]) {
      expect(layoutOf(pointer, `segment-${type}`).height).toBeLessThan(44);
    }
    const pointerSuffix = layoutOf(pointer, "suffix");
    expect(pointerSuffix.height).toBeLessThan(44);
    expect(pointerSuffix.width).toBeLessThan(44);
  });

  // adapt-sheets/date-picker.md M-013 (A-006, 负断言): under the default
  // pointer environment the soft-keyboard channel does not exist — no
  // `dig-seg-*` input mounts — the segment view itself takes the focus and
  // the keymap digits still drive `field.type` (the `segments` probe reads
  // the result, the same observation date-input-group's M-004 uses).
  test("M-013 default environment: no channel mounts, view focus and keymap unchanged", async () => {
    const app = await openDp("empty");

    expect(app.count("id:dig-seg-month")).toBe(0);
    expect(app.count("id:dig-seg-day")).toBe(0);
    expect(app.count("id:dig-seg-year")).toBe(0);

    await app.press("role:spinbutton >> nth=0");
    await waitFocused(app, "month");

    await app.keyboard.press("1");
    await app.keyboard.press("2");

    expect(lastSegment(app, "month").text).toBe("12");
    expect(lastSegment(app, "month").isPlaceholder).toBe(false);
  });

  // adapt-sheets/date-picker.md M-014 (基线): under the default environment
  // the pre-existing semantics hold — trigger toggle, Escape close with the
  // exit hold retained until it expires, the covered-trigger press landing
  // on the outside-press close, `isKeyboardDismissDisabled` gating Escape,
  // `shouldSkipAnimation` unmounting at once, `shouldCloseOnSelect` both
  // ways, and a calendar select reaching `onChange` once. The remaining
  // contract props (`placeholderValue`, `granularity`, `minValue` /
  // `maxValue`, `isDateUnavailable`, `validate`, `isInvalid`, `isRequired`,
  // `onFocus` / `onBlur` / `onFocusChange` edges, `accessibilityState`) have
  // no `nsh/test` readout or no fixture param and stay pinned read-only by
  // `date-picker.heroui.test.tsx` / `date-picker.web.test.tsx` /
  // `date-picker.layout.web.test.tsx`, which this file does not fork.
  test("M-014 default environment baseline: toggle, escape, outside press, select, exit paths", async () => {
    // Each close variant gets a fresh app: every flow opens once and closes
    // once, which is the shape the existing suites pin. (Reopen-after-close
    // is deliberately not asserted here — on the web target a press on the
    // trigger after the overlay has closed once never reaches `onPress`
    // (measured: `trigger-press` stays at 1, `openChange` gains nothing,
    // `enabled` still true — an invisible remnant keeps covering the page;
    // recorded as a host-gap suspicion in the report, not worked around).)

    // Trigger toggle closes: a press on the covered trigger lands on the
    // outside-press close (the underlay on web, the toggle dispatch
    // headless — either way the picker reports the close once). The wait
    // after the opening press keeps the second press from racing the
    // carrier's native mount (the M-014/M-001 class of lag).
    const toggle = await openDp("open", {}, { clock: {} });
    await toggle.press(TRIGGER);
    await toggle.waitFor(PANEL);
    expect(openChanges(toggle)).toEqual([[true]]);
    await toggle.press(TRIGGER);
    expect(openChanges(toggle)).toEqual([[true], [false]]);
    await toggle.clock!.runFor(120);
    expect(toggle.count(PANEL)).toBe(0);

    // Escape closes; the content stays mounted through its exit hold. The
    // wait keeps Escape from reaching the surface before the layer mounted
    // (the run's `skip` half lost exactly that race — `expected 1 to be 0`).
    const esc = await openDp("open", {}, { clock: {} });
    await esc.press(TRIGGER);
    await esc.waitFor(PANEL);
    expect(esc.count(PANEL)).toBe(1);
    await esc.keyboard.press("escape");
    expect(openChanges(esc)).toEqual([[true], [false]]);
    expect(esc.count(PANEL)).toBe(1);
    await esc.clock!.runFor(120);
    expect(esc.count(PANEL)).toBe(0);

    // `isKeyboardDismissDisabled`: Escape is gated, the trigger still closes.
    const kb = await openDp("open", { kbdismiss: "1" }, { clock: {} });
    await kb.press(TRIGGER);
    await kb.waitFor(PANEL);
    await kb.keyboard.press("escape");
    await kb.clock!.runFor(120);
    expect(kb.count(PANEL)).toBe(1);
    expect(openChanges(kb)).toEqual([[true]]);
    await kb.press(TRIGGER);
    expect(openChanges(kb)).toEqual([[true], [false]]);

    // `shouldSkipAnimation`: the same Escape unmounts at once.
    const skip = await openDp("open", { skipanim: "1" }, { clock: {} });
    await skip.press(TRIGGER);
    await skip.waitFor(PANEL);
    await skip.keyboard.press("escape");
    await skip.clock!.runFor(20);
    expect(skip.count(PANEL)).toBe(0);

    // `shouldCloseOnSelect` default: a calendar select commits `onChange`
    // once and closes the layer.
    const select = await openDp("open", {}, { clock: {} });
    await select.press(TRIGGER);
    await select.waitFor(PANEL);
    await select.waitFor(DAY_20);
    await select.press(DAY_20);
    await select.wait(20);

    expect(changeCount(select)).toBe(1);
    expect(changeRecords(select)[0]).toEqual({ year: 2026, month: 8, day: 20 });
    expect(openChanges(select)).toEqual([[true], [false]]);
    await select.clock!.runFor(120);
    expect(select.count(PANEL)).toBe(0);

    // `shouldCloseOnSelect={false}`: the same select commits but the layer
    // stays open.
    const stay = await openDp("no-close-on-select", {}, { clock: {} });
    await stay.press(TRIGGER);
    await stay.waitFor(PANEL);
    await stay.waitFor(DAY_20);
    await stay.press(DAY_20);
    await stay.wait(20);

    expect(changeCount(stay)).toBe(1);
    expect(openChanges(stay)).toEqual([[true]]);
    expect(stay.count(PANEL)).toBe(1);
  }, 120_000);

  // adapt-sheets/date-picker.md M-015 (A-011): the fixture machinery itself
  // — `Scoped` mounts both environments through the real `EnvironmentScope`
  // (touch+compact resolves the sheet carrier with no platform change), the
  // `presentation` / `nonmodal` / `kt` / `readonly` / `disabled` params
  // mount and discriminate, and the `dp-popover-panel` / `dp-popover-sheet` /
  // `dig-seg-*` / `layout` bounds / `segments` / `keyboard-type` /
  // `app.storage` probes all record.
  test("M-015 fixture Scoped params, case params and probes all mount and discriminate", async () => {
    const baseline = await openDp("open");
    expect(baseline.shows("id:dp-group")).toBe(true);
    await waitLayouts(baseline, ["trigger", "group", "suffix", "segment-month"]);
    for (const name of ["trigger", "group", "suffix", "segment-month"]) {
      expect(layoutOf(baseline, name)).toBeDefined();
    }
    expect(segmentRecords(baseline).length).toBeGreaterThan(0);
    expect(keyboardTypes(baseline).length).toBeGreaterThan(0);

    const injected = await openDp("open", { input: "touch", width: "compact" });
    await injected.press(TRIGGER);
    await injected.waitFor(SHEET);
    expect(injected.count(SHEET)).toBe(1);
    expect(injected.count(PANEL)).toBe(0);

    const pinned = await openDp("open", { presentation: "sheet" });
    await pinned.press(TRIGGER);
    await pinned.waitFor(SHEET);
    expect(pinned.count(SHEET)).toBe(1);
    expect(pinned.count(PANEL)).toBe(0);

    const gated = await openDp("default", { disabled: "1", kt: "decimal-pad" });
    await gated.waitUntil(() => keyboardTypes(gated).length >= 3);
    expect(keyboardTypes(gated).every((v) => v === "decimal-pad")).toBe(true);
    expect(gated.count("id:dig-seg-month")).toBe(0);
  }, 120_000);
});
