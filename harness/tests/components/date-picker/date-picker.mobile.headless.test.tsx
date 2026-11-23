import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { changeCount, changeRecords } from "../../testers/date-picker";

/*
 * Headless-only mobile assertions for the DatePicker adapt unit: M-005,
 * M-006 and M-012 of adapt-sheets/date-picker.md §4.
 *
 * These rows open `platform: "ios"` — `open`'s platform option rejects
 * `ios`/`android` under `--target web` (the page is a desktop there), so the
 * host-derived half of the presentation rule (touch input + compact short
 * side from the phone-sized engine, no `EnvironmentScope`) and the
 * sheet-carrier close semantics can only run headless. The
 * `EnvironmentScope`-injected halves of the same rule live in
 * `date-picker.mobile.test.tsx` and run on both targets.
 *
 * `platform: "ios"` at 390×844 derives `input: "touch"` and `width:
 * "compact"`, so `presentation: "auto"` resolves the Sheet carrier — the
 * `id:dp-popover-panel` / `id:dp-popover-sheet` testID probes discriminate
 * it, and the inherited `dig-seg-*` soft-keyboard channels mount with it.
 *
 * M-006's "backdrop 外压/下滑" translates to the channels this composition
 * actually mounts: the Sheet carrier's backdrop paint layer carries no
 * testID a selector can name, and with no `Sheet.Handle` / `Sheet.Dialog`
 * pan there is no swipe-dismiss gesture at all (adapt sheet §8 mounts
 * neither, conservatively). What is asserted instead: Escape through
 * `SheetBackdrop`'s `closesOnEscape` → `SheetRoot.onOpenChange` → the
 * picker's `setOpen`, a press on the covered trigger (the outside element
 * a user would tap — headless dispatches it to the trigger's own toggle,
 * web hit-tests it onto the backdrop paint; both land the same
 * `onOpenChange(false)` probe round), a calendar select through
 * `shouldCloseOnSelect`, the `no-close-on-select` hold, and
 * `isKeyboardDismissDisabled` gating Escape. The back-button half of
 * "返回键" has no `nsh/test` step and stays with the sheet unit's own
 * coverage.
 */

const IOS = { platform: "ios", width: 390, height: 844 } as const;
const TRIGGER = "role:button[Open calendar]";
const PANEL = "id:dp-popover-panel";
const SHEET = "id:dp-popover-sheet";
const DAY_20 = "role:button[/August 20, 2026/]";

function openIos(caseName: string, params: Record<string, string> = {}): Promise<App> {
  return open("../../../date-picker.fixtures.tsx", {
    ...IOS,
    clock: {},
    locale: "en-US",
    host: { params: { case: caseName, ...params } },
  });
}

function openChanges(app: App): unknown[][] {
  return callsOf(app, "openChange");
}

type SegmentRecord = { type: string; text: string };

function lastSegmentText(app: App, type: string): string {
  const found = callsOf(app, "segments")
    .map((c) => c[0] as SegmentRecord)
    .filter((r) => r.type === type)
    .at(-1);

  if (!found) throw new Error(`the fixture recorded no ${type} segment`);

  return found.text;
}

describe("date-picker mobile (headless)", () => {
  // adapt-sheets/date-picker.md M-005 (A-002): the presentation value latches
  // on the open edge — `platform:"ios"` derives touch+compact so `auto`
  // resolves sheet, resizing the window to regular while the sheet is open
  // must not swap carriers mid-open; after close the next open
  // re-evaluates against the new environment and yields the panel.
  test("M-005 latched sheet survives rotation; reopen re-evaluates to panel", async () => {
    const app = await openIos("open");

    await app.press(TRIGGER);
    expect(app.count(SHEET)).toBe(1);
    expect(app.count(PANEL)).toBe(0);

    await app.setViewport(1024, 768);
    expect(app.count(SHEET)).toBe(1);
    expect(app.count(PANEL)).toBe(0);

    await app.keyboard.press("escape");
    await app.waitFor(SHEET, { state: "gone" });
    expect(openChanges(app)).toEqual([[true], [false]]);

    await app.press(TRIGGER);
    await app.waitFor(PANEL);
    expect(app.count(PANEL)).toBe(1);
    expect(app.count(SHEET)).toBe(0);
    expect(openChanges(app)).toEqual([[true], [false], [true]]);
  });

  // adapt-sheets/date-picker.md M-006 (A-004): sheet-mode close semantics —
  // every dismissal lands `onOpenChange(false)` on the picker owner exactly
  // once: Escape through the sheet's own `closesOnEscape`, a press on the
  // covered trigger (the outside press — see the header for why the
  // backdrop paint itself is not nameable and no swipe channel is mounted),
  // a calendar select through `shouldCloseOnSelect`, the
  // `no-close-on-select` hold, and `isKeyboardDismissDisabled` gating
  // Escape while the trigger still closes.
  test("M-006 sheet-mode closes reach the picker owner through every mounted channel", async () => {
    const app = await openIos("open");

    await app.press(TRIGGER);
    expect(app.count(SHEET)).toBe(1);
    expect(openChanges(app)).toEqual([[true]]);

    // Channel one: Escape is the sheet's own dismissal — SheetRoot's
    // onOpenChange writes back through the popover's setOpen.
    await app.keyboard.press("escape");
    expect(openChanges(app)).toEqual([[true], [false]]);
    await app.waitFor(SHEET, { state: "gone" });

    // Channel two: a press outside the sheet content — the covered trigger
    // is the outside element a user would tap; headless dispatches it to
    // the trigger's toggle, both routes report the same close.
    await app.press(TRIGGER);
    expect(app.count(SHEET)).toBe(1);
    expect(openChanges(app)).toEqual([[true], [false], [true]]);

    await app.press(TRIGGER);
    expect(openChanges(app)).toEqual([[true], [false], [true], [false]]);
    await app.waitFor(SHEET, { state: "gone" });

    // Channel three: a calendar select commits `onChange` once and closes
    // the sheet (`shouldCloseOnSelect` default).
    await app.press(TRIGGER);
    expect(app.count(SHEET)).toBe(1);
    await app.waitFor(DAY_20);
    await app.press(DAY_20);
    await app.wait(20);

    expect(changeCount(app)).toBe(1);
    expect(changeRecords(app)[0]).toEqual({ year: 2026, month: 8, day: 20 });
    expect(openChanges(app)).toEqual([[true], [false], [true], [false], [true], [false]]);
    await app.waitFor(SHEET, { state: "gone" });

    // `shouldCloseOnSelect={false}`: the same select commits but the sheet
    // stays open and no close round is reported.
    const stay = await openIos("no-close-on-select");
    await stay.press(TRIGGER);
    expect(stay.count(SHEET)).toBe(1);
    await stay.waitFor(DAY_20);
    await stay.press(DAY_20);
    await stay.wait(20);

    expect(changeCount(stay)).toBe(1);
    expect(openChanges(stay)).toEqual([[true]]);
    expect(stay.count(SHEET)).toBe(1);

    // `isKeyboardDismissDisabled` reaches `SheetBackdrop`: Escape is gated
    // on the sheet carrier exactly as `handleCancel` gates it on the panel
    // chain — the sheet stays open while the trigger still closes it.
    const kb = await openIos("open", { kbdismiss: "1" });
    await kb.press(TRIGGER);
    expect(kb.count(SHEET)).toBe(1);
    await kb.keyboard.press("escape");
    await kb.clock!.runFor(120);
    expect(kb.count(SHEET)).toBe(1);
    expect(openChanges(kb)).toEqual([[true]]);

    await kb.press(TRIGGER);
    expect(openChanges(kb)).toEqual([[true], [false]]);
    await kb.waitFor(SHEET, { state: "gone" });
  }, 120_000);

  // adapt-sheets/date-picker.md M-012 (A-004, A-006): `platform:"ios"` with
  // no `EnvironmentScope` — the host derives `input()==="touch"` and
  // `width==="compact"` on its own, so the sheet carrier mounts, the
  // `dig-seg-*` channels mount, and `app.type` drives `field.type` exactly
  // as the injected half (M-003/M-009) does.
  test("M-012 ios host derivation: sheet carrier, channels mount and type edits without a scope", async () => {
    const app = await openIos("default");

    expect(app.count("id:dig-seg-month")).toBe(1);
    expect(app.count("id:dig-seg-day")).toBe(1);
    expect(app.count("id:dig-seg-year")).toBe(1);

    // The channel editing half first — it is independent of the carrier.
    await app.type("id:dig-seg-month", "11");
    await app.waitUntil(() => lastSegmentText(app, "month") === "11");

    await app.press(TRIGGER);
    expect(app.count(SHEET)).toBe(1);
    expect(app.count(PANEL)).toBe(0);
  }, 120_000);
});
