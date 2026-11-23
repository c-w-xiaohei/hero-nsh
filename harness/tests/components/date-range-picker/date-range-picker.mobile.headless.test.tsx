import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { isoOf, lastRange, rangeCount } from "../../testers/date-range-picker";

/*
 * Headless mobile assertions for the date-range-picker adapt unit — the
 * rows of adapt-sheets/date-range-picker.md §4 that need
 * `open({platform: "ios"})`, which `--target web` rejects outright
 * (ERR_NSH_TEST_UNSUPPORTED): the host-derived half of the presentation
 * rule (touch input + compact short side from the phone-sized engine, no
 * `EnvironmentScope`) and the sheet carrier's close semantics.
 *
 *   M-005  the latched presentation: ios derives sheet, `setViewport`
 *          rotation must not swap carriers mid-open, and the reopen
 *          re-evaluates against the new environment.
 *   M-006  sheet-state close semantics: the SheetRoot `onOpenChange`
 *          channel writes back through the picker's `setOpen`, Escape and
 *          the back button are `isKeyboardDismissDisabled`-gated, and the
 *          `isSelecting` two-press range close holds verbatim on this
 *          carrier.
 *   M-012  the host-derivation half of M-003/M-009: ios with no scope
 *          mounts the sheet carrier AND the dual `dig-seg-*` channels,
 *          and `app.type` drives `field.type` end to end.
 *
 * The fixture is `harness/date-range-picker.fixtures.tsx`; `host.params`:
 * `case`, `input`/`width`/`density` (unused here — the host derives),
 * `presentation`/`nonmodal`/`kd`/`kt`/`readonly`/`disabled`.
 */

type Params = Record<string, string>;

function openDrpIos(
  caseName: string,
  params: Params = {},
  options: Omit<OpenOptions, "host"> = {},
): Promise<App> {
  return open("../../../date-range-picker.fixtures.tsx", {
    platform: "ios",
    width: 390,
    height: 844,
    locale: "en-US",
    clock: {},
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

const TRIGGER = "id:drp-trigger";
const PANEL = "id:drp-popover-panel";
const SHEET = "id:drp-popover-sheet";
const CALENDAR = "id:drp-calendar";
const END_MONTH = "id:drp-end-input >> id:dig-seg-month";
const DAY_10 = "role:button[/August 10, 2026/]";
const DAY_12 = "role:button[/August 12, 2026/]";

async function openSheet(app: App): Promise<void> {
  await app.press(TRIGGER);
  await app.waitFor(CALENDAR);
  expect(app.count(SHEET)).toBe(1);
}

describe("date-range-picker mobile (headless)", () => {
  // adapt-sheets/date-range-picker.md M-005 (A-002): the presentation value
  // latches on the open edge — `platform:"ios"` derives touch+compact so
  // `auto` resolves sheet; rotating the viewport to a regular short side
  // while the sheet is open must not swap carriers mid-open; after close
  // the next open re-evaluates and yields the panel carrier.
  test("M-005 ios host derives sheet; rotation keeps it latched; reopen re-evaluates to panel", async () => {
    const app = await openDrpIos("open");

    await openSheet(app);
    expect(callsOf(app, "openChange")).toEqual([[true]]);

    await app.setViewport(1024, 768);
    expect(app.count(SHEET)).toBe(1);
    expect(app.count(PANEL)).toBe(0);

    // Close through the trigger toggle, then reopen: the latch released,
    // and the regular short side resolves `auto` to panel.
    await app.press(TRIGGER);
    await app.waitFor(SHEET, { state: "gone" });
    await app.clock!.runFor(200);
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);

    await app.press(TRIGGER);
    await app.waitFor(CALENDAR);
    expect(app.count(PANEL)).toBe(1);
    expect(app.count(SHEET)).toBe(0);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true]]);
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-006 (A-004, A-010): sheet-state
  // close semantics — every dismissal writes `SheetRoot.onOpenChange` →
  // the picker's `setOpen` → `onOpenChange(false)` exactly once. The
  // backdrop press and the swipe-down dismissal are SheetBackdrop's own
  // machinery (its unit's tests own them; §6 registers that headless
  // `app.press` does no hit-test, so the paint layer has no selector here)
  // — the channels this unit owns are asserted instead: the trigger
  // toggle, Escape through `closesOnEscape`, the select-driven close, and
  // the `isKeyboardDismissDisabled` gate on Escape and the back button.
  test("M-006 sheet carrier: toggle, Escape, select-close and kd gate all reach the picker owner", async () => {
    const app = await openDrpIos("open");

    // Channel one: the trigger toggle still owns the picker's open state —
    // `SheetRoot` is a controlled shell here, so the press closes through
    // the same `setOpen` the underlay takes on the panel carrier.
    await openSheet(app);
    await app.press(TRIGGER);
    await app.waitFor(SHEET, { state: "gone" });
    await app.clock!.runFor(200);
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);

    // Channel two: Escape is the sheet backdrop's `closesOnEscape` —
    // `isKeyboardDismissDisabled` unset, so it closes through
    // `SheetRoot.onOpenChange` → `setOpen`.
    await app.press(TRIGGER);
    await app.waitFor(CALENDAR);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true]]);

    await app.keyboard.press("escape");
    await app.waitFor(SHEET, { state: "gone" });
    await app.clock!.runFor(200);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true], [false]]);

    // Channel three: `shouldCloseOnSelect` default — the first day press
    // sets the anchor and `isSelecting` holds the sheet; the second
    // completes the range, closes the layer and emits `onChange` once.
    await app.press(TRIGGER);
    await app.waitFor(CALENDAR);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true], [false], [true]]);

    await app.press(DAY_10);
    await app.wait(20);
    expect(app.count(SHEET)).toBe(1);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true], [false], [true]]);

    // The completing press emits exactly one `onChange` carrying the picked
    // range (the anchor press already emitted its own single-day record —
    // RangeCalendar's existing two-step semantics, unchanged on this
    // carrier).
    const beforeSecond = rangeCount(app);
    await app.press(DAY_12);
    await app.waitFor(SHEET, { state: "gone" });
    await app.clock!.runFor(200);
    expect(callsOf(app, "openChange")).toEqual([
      [true],
      [false],
      [true],
      [false],
      [true],
      [false],
    ]);
    expect(isoOf(lastRange(app)!.start)).toBe("2026-08-10");
    expect(isoOf(lastRange(app)!.end)).toBe("2026-08-12");
    expect(rangeCount(app)).toBe(beforeSecond + 1);

    // `isKeyboardDismissDisabled`: Escape and the back button are both
    // gated by `closesOnEscape` — the sheet stays, `onOpenChange` records
    // nothing; the toggle still closes.
    const kb = await openDrpIos("open", { kd: "1" });
    await openSheet(kb);

    await kb.keyboard.press("escape");
    await kb.clock!.runFor(120);
    expect(kb.count(SHEET)).toBe(1);
    // `app.back()` either finds no modal stack to ask (rejects
    // ERR_NSH_TEST_NO_BACK — nothing happened either way) or routes the
    // sheet's `cancel`, which the same gate blocks; both leave it open.
    await kb.back().catch(() => {});
    await kb.clock!.runFor(120);
    expect(kb.count(SHEET)).toBe(1);
    expect(callsOf(kb, "openChange")).toEqual([[true]]);

    await kb.press(TRIGGER);
    await kb.waitFor(SHEET, { state: "gone" });
    await kb.clock!.runFor(200);
    expect(callsOf(kb, "openChange")).toEqual([[true], [false]]);

    // `shouldCloseOnSelect={false}` on the sheet carrier: the completed
    // range keeps the layer open.
    const keep = await openDrpIos("no-close-on-select");
    await openSheet(keep);
    await keep.press(DAY_10);
    await keep.wait(20);
    await keep.press(DAY_12);
    await keep.wait(50);
    expect(keep.count(SHEET)).toBe(1);
    expect(isoOf(lastRange(keep)!.start)).toBe("2026-08-10");
    expect(isoOf(lastRange(keep)!.end)).toBe("2026-08-12");
  }, 120_000);

  // adapt-sheets/date-range-picker.md M-012 (A-006): `platform:"ios"` with
  // no `EnvironmentScope` — the host derives `input()==="touch"` and a
  // compact short side on its own, so the sheet carrier mounts AND both
  // sides' `dig-seg-*` channels mount; `app.type` then drives `field.type`
  // through the slot binding exactly as the injected half (M-003/M-009)
  // does — the host-derivation half of the G/B(继承) contract.
  test("M-012 ios host derivation: sheet carrier and dual channels mount, type edits", async () => {
    const app = await openDrpIos("default");

    // Both sides' channels mount with no scope at all.
    expect(app.count("id:dig-seg-month")).toBe(2);
    expect(app.count("id:dig-seg-day")).toBe(2);
    expect(app.count("id:dig-seg-year")).toBe(2);

    await openSheet(app);

    // A single "9" keeps the end inside the range — every keystroke commits
    // eagerly and "1" would commit January and swap the sides.
    await app.type(END_MONTH, "9");
    await app.waitUntil(() => lastRange(app)?.end.month === 9);
    expect(lastRange(app)!.end).toEqual({ year: 2026, month: 9, day: 5 });
    expect(lastRange(app)!.start).toEqual({ year: 2026, month: 8, day: 1 });
  }, 120_000);
});
