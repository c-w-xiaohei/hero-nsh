import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import {
  fieldChanges,
  lastSegment,
  lastSegmentProps,
  rootRecord,
} from "../../testers/date-input-group";

/*
 * Mobile assertions for the DateInputGroup adapt unit (G+B(继承): the Segment
 * editing channel and the affix targets), one test per row of
 * adapt-sheets/date-input-group.md §4 that the shared targets (headless +
 * web) can observe: M-001 … M-012. The ios host-derivation half (M-013) and
 * the headless-only dayPeriod letter path (M-014) live in
 * `date-input-group.mobile.headless.test.tsx`; the pointer-events-none
 * observation (only a real hit-test target shows it) and the Tab commit
 * boundary (no Tab on headless windows) live in
 * `date-input-group.mobile.web.test.tsx`, the headless press-focus commit in
 * the headless file — the switch/list-box capability split.
 *
 * The fixture is `harness/date-input-group.fixtures.tsx`, opened by
 * `host.params`: `case` (default / affix-interactive / affix-static /
 * edit-gate / keyboard-type / trigger-focus / range-slots …), `testInput`
 * ("pointer"/"touch" through an outer `EnvironmentScope` — the pointer half
 * is the host-independent desktop-parity baseline; the host-derived
 * default differs per target, so it is never assumed), `kt` / `gate` /
 * `granularity` for the prop and gate cases. Native hosts fill the device
 * screen and reject the `platform`/`width`/`height` open options, so this
 * file carries none and runs on ios/android too; the rows that need
 * `app.hover` (M-003 and M-010's hover half) moved to
 * `date-input-group.mobile.headless.test.tsx`.
 *
 * Every assertion reads what `nsh/test` can observe — `shows`, `count`,
 * `enabled`, `texts`, `onLayout` bounds probes and the `@scenario/probe`
 * calls in `app.storage()`: `root-props`, `input-props`, `segment-props`,
 * `segments`, `root-bounds`, `segment-bounds`, `prefix-bounds`,
 * `suffix-bounds`, `hover-events`, `affix-presses`, `keyboard-type`,
 * `field-change`, `slots`. Class names are never read: the `slots` probe
 * records the `dateInputGroupVariants` table output itself for the
 * table-level half of M-001.
 */

type Params = Record<string, string>;

function openDig(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../date-input-group.fixtures.tsx", {
    locale: "en-US",
    host: { params: { case: caseName, ...params } },
  });
}

/* -------------------------------------------------------------------------------------------------
 * Probe readers for the mobile-layer records (the shared testers cover the
 * desktop cases' probes; these read the ones the adapt sheet added).
 * -----------------------------------------------------------------------------------------------*/

type Bounds = { origin: { x: number; y: number }; size: { width: number; height: number } };

type RootBounds = Bounds;
type SegmentBoundsEntry = { type: string; bounds: Bounds };
type SlotsEntry = { name: string; base: string; prefix: string; suffix: string; segment: string };

function lastOf<T>(app: App, name: string): T {
  const all = callsOf(app, name);
  const found = all[all.length - 1]?.[0] as T | undefined;

  if (found === undefined) throw new Error(`the fixture recorded no ${name} call`);

  return found;
}

function rootBounds(app: App): Bounds {
  return lastOf<Bounds>(app, "root-bounds");
}

function segmentBounds(app: App, type: string): Bounds {
  const all = callsOf(app, "segment-bounds")
    .map((c) => c[0] as SegmentBoundsEntry)
    .filter((e) => e.type === type);
  const found = all[all.length - 1];

  if (!found) throw new Error(`no bounds recorded for the ${type} segment`);

  return found.bounds;
}

function affixBounds(app: App, name: "prefix-bounds" | "suffix-bounds"): Bounds {
  return lastOf<Bounds>(app, name);
}

function affixPresses(app: App): string[] {
  return callsOf(app, "affix-presses").map((c) => String(c[0]));
}

function keyboardTypes(app: App): string[] {
  return callsOf(app, "keyboard-type").map((c) => String(c[0]));
}

function slotsEntries(app: App): SlotsEntry[] {
  return callsOf(app, "slots").map((c) => c[0] as SlotsEntry);
}

// The last `segment-props` record per type decides: earlier renders still
// carry the previous `isFocused`, so "focused" means the latest render says so.
function focusedSegmentTypes(app: App, name = "segment-props"): string[] {
  const last = new Map<string, boolean>();
  for (const c of callsOf(app, name)) {
    const r = c[0] as { type: string; isFocused: boolean };
    last.set(r.type, r.isFocused);
  }
  return [...last.entries()].filter(([, focused]) => focused).map(([type]) => type);
}

async function waitFocused(app: App, type: string, name = "segment-props"): Promise<void> {
  await app.waitUntil(() => focusedSegmentTypes(app, name).includes(type));
}

describe("date-input-group mobile", () => {
  // adapt-sheets/date-input-group.md M-001 (A-001): the `input` axis raises the
  // row and the segments to the 44 pt touch target and the `interactive`
  // compound gives an affix inside a picker its 44×44 hit area; the pointer
  // environment keeps the 36 pt row and the content-sized affix. Bounds are
  // the fixture's `onLayout` probes (Segment takes no `onLayout`, so a
  // shrink-wrapping View reports its bounds — sheet §6 records the probe).
  test("M-001 touch raises row/segments/affix to 44pt, pointer keeps the desktop metrics", async () => {
    const touch = await openDig("default", { testInput: "touch" });
    await touch.waitUntil(() => callsOf(touch, "root-bounds").length > 0);
    expect(rootBounds(touch).size.height).toBeGreaterThanOrEqual(44);
    for (const type of ["month", "day", "year"]) {
      expect(segmentBounds(touch, type).size.height).toBeGreaterThanOrEqual(44);
    }

    const affixTouch = await openDig("affix-interactive", { testInput: "touch" });
    await affixTouch.waitUntil(() => callsOf(affixTouch, "prefix-bounds").length > 0);
    for (const bounds of [
      affixBounds(affixTouch, "prefix-bounds"),
      affixBounds(affixTouch, "suffix-bounds"),
    ]) {
      expect(bounds.size.height).toBeGreaterThanOrEqual(44);
      expect(bounds.size.width).toBeGreaterThanOrEqual(44);
    }

    // The table itself, for the slot strings the bounds come from.
    const slotsApp = await openDig("slots-probe", { testInput: "pointer" });
    await slotsApp.waitUntil(() => callsOf(slotsApp, "slots").length >= 4);
    const byName = new Map(slotsEntries(slotsApp).map((e) => [e.name, e]));
    expect(byName.get("touch-interactive")?.prefix).toContain("min-h-11");
    expect(byName.get("touch-interactive")?.prefix).toContain("min-w-11");
    expect(byName.get("touch-interactive")?.prefix).toContain("pointer-events-auto");
    expect(byName.get("touch-static")?.prefix).toContain("pointer-events-none");
    expect(byName.get("touch-static")?.prefix).not.toContain("min-h-11");
    expect(byName.get("pointer-interactive")?.prefix).not.toContain("min-h-11");

    const pointer = await openDig("default", { testInput: "pointer" });
    await pointer.waitUntil(() => callsOf(pointer, "root-bounds").length > 0);
    expect(rootBounds(pointer).size.height).toBeLessThan(44);
    for (const type of ["month", "day", "year"]) {
      expect(segmentBounds(pointer, type).size.height).toBeLessThan(44);
    }

    const affixPointer = await openDig("affix-interactive", { testInput: "pointer" });
    await affixPointer.waitUntil(() => callsOf(affixPointer, "prefix-bounds").length > 0);
    for (const bounds of [
      affixBounds(affixPointer, "prefix-bounds"),
      affixBounds(affixPointer, "suffix-bounds"),
    ]) {
      expect(bounds.size.height).toBeLessThan(44);
    }
  }, 120_000);

  // adapt-sheets/date-input-group.md M-002 (A-001, A-008): under touch an
  // affix inside a picker's contract takes presses; the static half
  // (`pointer-events-none` really blocking) is only observable through a real
  // hit test — `date-input-group.mobile.web.test.tsx`.
  test("M-002 injected touch: interactive affix pressables fire their probes", async () => {
    const app = await openDig("affix-interactive", { testInput: "touch" });

    await app.press("id:affix-prefix-button");
    await app.press("id:affix-suffix-button");

    expect(affixPresses(app)).toEqual(["prefix", "suffix"]);
  }, 120_000);

  // adapt-sheets/date-input-group.md M-003 (A-002, A-003, A-004) lives in
  // `date-input-group.mobile.headless.test.tsx` — `app.hover` needs a
  // mouse, so the row moved there whole rather than split.

  // adapt-sheets/date-input-group.md M-004 (A-005, A-006, 负断言): under the
  // default pointer environment the soft-keyboard channel does not exist —
  // no `dig-seg-*` input mounts — the segment view itself takes the focus and
  // the keymap digits still drive `field.type`.
  test("M-004 pointer baseline: no channel mounts, view focus and keymap unchanged", async () => {
    const app = await openDig("default", { testInput: "pointer" });

    expect(app.count("id:dig-seg-month")).toBe(0);
    expect(app.count("id:dig-seg-day")).toBe(0);
    expect(app.count("id:dig-seg-year")).toBe(0);

    await app.press("label:date >> text:mm");
    await waitFocused(app, "month");

    await app.keyboard.press("1");
    await app.keyboard.press("2");

    expect(lastSegment(app, "month").text).toBe("12");
    expect(lastSegment(app, "month").isPlaceholder).toBe(false);
  }, 120_000);

  // adapt-sheets/date-input-group.md M-005 (A-005, A-006): under touch the
  // channel hosts the editing — a press focuses it, `app.type` feeds
  // `field.type` with the keymap's buffer/advance rules, and Backspace feeds
  // `field.backspace` (a placeholder first moves the focus back).
  test("M-005 injected touch: channel press focuses, typing edits, Backspace deletes", async () => {
    const app = await openDig("default", { testInput: "touch" });

    expect(app.count("id:dig-seg-month")).toBe(1);
    expect(app.count("id:dig-seg-day")).toBe(1);
    expect(app.count("id:dig-seg-year")).toBe(1);

    // The channel must be hit-testable where it mounts: native UIKit (and
    // NSH's own hit walkers) skip any view with alpha < 0.01, so the touch
    // a user or `app.press` makes can never land in an `opacity-0` channel —
    // the iOS M-005/M-006/M-008 failures' pinned root. `effectiveOpacity`
    // is the model-visible form of the hittability precondition; the
    // channel still paints nothing (controlled empty value, no caret).
    for (const type of ["month", "day", "year"]) {
      expect(app.viewStyle(`id:dig-seg-${type}`)?.effectiveOpacity).toBeGreaterThan(0.01);
      expect(app.value(`id:dig-seg-${type}`)).toBe("");
    }

    await app.press("id:dig-seg-month");
    await waitFocused(app, "month");

    await app.type("id:dig-seg-month", "12");
    await app.waitUntil(() => lastSegment(app, "month").text === "12");
    // The controlled empty value holds while the user types: the host only
    // rewrites a `value` prop that changed, so without the channel's reset
    // the typed characters stay in its input and the native field paints
    // them over the segment text (the web echo; on a native host the same
    // residue). `app.value` reads the host's own text, not the app's prop.
    expect(app.value("id:dig-seg-month")).toBe("");
    // The buffer filled the segment: the focus advanced to the day channel.
    await waitFocused(app, "day");
    expect(lastSegment(app, "month").isPlaceholder).toBe(false);

    // First Backspace lands on the placeholder day and moves back to month;
    // the second deletes one digit of the filled month.
    await app.keyboard.press("backspace");
    await waitFocused(app, "month");
    await app.keyboard.press("backspace");
    await app.waitUntil(() => lastSegment(app, "month").text === "1");
    expect(lastSegment(app, "day").isPlaceholder).toBe(true);
  }, 120_000);

  // adapt-sheets/date-input-group.md M-006 (A-005): Enter on the channel is
  // `submitBehavior="blurAndSubmit"` — the blur runs the group's existing
  // commit boundary, so an invalid display (February 30th) commits clamped,
  // exactly once.
  test("M-006 injected touch: Enter blurs and submits through the commit boundary once", async () => {
    const app = await openDig("trigger-focus", { testInput: "touch" });

    await app.type("id:dig-seg-month", "02");
    await app.type("id:dig-seg-day", "30");
    await app.type("id:dig-seg-year", "2026");
    await app.waitUntil(() => lastSegment(app, "year").text === "2026");

    // February 30th is invalid: nothing committed while editing.
    expect(fieldChanges(app)).toHaveLength(0);

    await app.keyboard.press("enter");
    await app.waitUntil(() => fieldChanges(app).length > 0);

    expect(fieldChanges(app)).toEqual(["2026-2-28"]);
  }, 120_000);

  // adapt-sheets/date-input-group.md M-007 (A-007, A-005): `keyboardType`
  // reaches every segment through `DateInputGroupKeyboardContext` — `"auto"`
  // by default, the explicit value uniformly when given. The per-segment
  // resolution (`"auto"` → `"numeric"`/`"default"`) is the channel's own prop
  // and the host keyboard itself is unobservable (§6 registered gap), so the
  // assertion stops at the context boundary plus a clean mount.
  test("M-007 keyboardType reaches the segments: auto default, explicit uniform", async () => {
    const auto = await openDig("keyboard-type", { testInput: "touch" });
    await auto.waitUntil(() => keyboardTypes(auto).length >= 3);
    expect(keyboardTypes(auto).every((v) => v === "auto")).toBe(true);
    // The channels still mount under the prop's presence.
    expect(auto.count("id:dig-seg-month")).toBe(1);

    const explicit = await openDig("keyboard-type", {
      kt: "numbers-and-punctuation",
      testInput: "touch",
    });
    await explicit.waitUntil(() => keyboardTypes(explicit).length >= 3);
    expect(keyboardTypes(explicit).every((v) => v === "numbers-and-punctuation")).toBe(true);
  }, 120_000);

  // adapt-sheets/date-input-group.md M-008 (A-005, A-006): a press on the
  // Input's padding runs `focusLast`, whose registered target under touch is
  // the channel — typing then lands without another press. A read-only
  // segment keeps a focusable but `readonly` channel: it focuses, and keys
  // change nothing.
  test("M-008 injected touch: padding press focuses the channel; readonly channel takes no edit", async () => {
    const app = await openDig("default", { testInput: "touch" });

    // The group's centre is a segment, so `role:group` hit-tests onto it;
    // the "/" literal is group area that hears no press, so its press runs
    // the Input's `focusLast` — the padding-press path on both engines.
    await app.press("label:date >> text:/");
    await waitFocused(app, "month");

    await app.type("id:dig-seg-month", "1");
    await app.waitUntil(() => lastSegment(app, "month").text === "1");

    const ro = await openDig("edit-gate", { gate: "readonly", testInput: "touch" });
    expect(ro.count("id:dig-seg-month")).toBe(1);
    // The readonly channel stays enabled — a host-disabled input cannot
    // become first responder on iOS, which is what its former `readonly`
    // prop caused there; read-only is honored by refusing the edits.
    expect(ro.enabled("id:dig-seg-month")).toBe(true);

    await ro.press("id:dig-seg-month");
    await waitFocused(ro, "month");

    await ro.keyboard.press("1");
    await ro.wait(100);
    expect(lastSegment(ro, "month").text).toBe("mm");
    expect(lastSegment(ro, "month").isPlaceholder).toBe(true);
    expect(fieldChanges(ro)).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/date-input-group.md M-009 (A-007): every legal `keyboardType`
  // mounts — the `keyboard-type` probe records what the context hands the
  // segments; an absent prop is the `"auto"` default.
  test("M-009 keyboardType values all mount and reach the segments", async () => {
    for (const kt of [
      "default",
      "number-pad",
      "decimal-pad",
      "numeric",
      "numbers-and-punctuation",
      "email-address",
      "phone-pad",
      "url",
    ]) {
      const app = await openDig("keyboard-type", { testInput: "pointer", kt });
      await app.waitUntil(() => keyboardTypes(app).length >= 3);
      expect(keyboardTypes(app).every((v) => v === kt)).toBe(true);
    }

    const absent = await openDig("keyboard-type", { testInput: "pointer" });
    await absent.waitUntil(() => keyboardTypes(absent).length >= 3);
    expect(keyboardTypes(absent).every((v) => v === "auto")).toBe(true);
  }, 120_000);

  // adapt-sheets/date-input-group.md M-010 (基线): the default environment
  // keeps the desktop contract — segment keymap editing, padding press →
  // focusLast, focus-visible ring inputs, the range-slots binding and the
  // affix press path. The commit boundary's Tab half is web-only
  // (`date-input-group.mobile.web.test.tsx`) and its press-focus half
  // headless-only (the headless file, which also carries the hover-callback
  // half — `app.hover` needs a mouse); `date-input-group.web.test.tsx`
  // already pins the same semantics read-only.
  test("M-010 pointer baseline: keymap, focusLast, range slots, affix", async () => {
    const app = await openDig("default", { testInput: "pointer" });

    // Keymap editing: digits fill and advance, arrows move, Backspace deletes.
    await app.press("label:date >> text:mm");
    await waitFocused(app, "month");
    for (const key of ["1", "2"]) await app.keyboard.press(key);
    expect(lastSegment(app, "month").text).toBe("12");
    await waitFocused(app, "day");

    await app.keyboard.press("left");
    await waitFocused(app, "month");
    await app.keyboard.press("backspace");
    await app.keyboard.press("backspace");
    expect(lastSegment(app, "month").isPlaceholder).toBe(true);

    // Home / End take the segment's min / max and PageUp / PageDown step by
    // its page (2 for a month) — the contract `date-input-group.web.test.tsx`
    // pins as X-002, read here on the headless windows engine too.
    await app.keyboard.press("home");
    expect(Number(lastSegment(app, "month").text)).toBe(1);
    await app.keyboard.press("pageup");
    expect(Number(lastSegment(app, "month").text)).toBe(3);
    await app.keyboard.press("end");
    expect(Number(lastSegment(app, "month").text)).toBe(12);
    await app.keyboard.press("pagedown");
    expect(Number(lastSegment(app, "month").text)).toBe(10);

    // Padding press → focusLast walks back over the trailing placeholders:
    // with the month filled, the earliest of them is the day. The "/" literal
    // is the non-segment press target — `role:group`'s centre is a segment.
    await app.press("label:date >> text:/");
    await waitFocused(app, "day");

    // The hover-callbacks half of this baseline (the pointer half of
    // M-003's row) lives in `date-input-group.mobile.headless.test.tsx` —
    // `app.hover` needs a mouse.

    // Range slots: the separator registers and a slot Input's padding focuses.
    const range = await openDig("range-slots", { testInput: "pointer" });
    expect(range.shows("text:separator-registered")).toBe(true);
    await range.press("id:start-input");
    await waitFocused(range, "month", "start-segment-props");

    // The affix press path is env-independent once interactive: pointer too.
    const affix = await openDig("affix-interactive", { testInput: "pointer" });
    await affix.press("id:affix-prefix-button");
    await affix.press("id:affix-suffix-button");
    expect(affixPresses(affix)).toEqual(["prefix", "suffix"]);
  }, 120_000);

  // adapt-sheets/date-input-group.md M-011 (基线): `isDisabled` /
  // `isReadOnly` block editing on both environments — a disabled segment
  // takes no channel and no focus, a read-only one focuses but never edits,
  // and no `onChange` fires anywhere.
  test("M-011 disabled and readonly gate editing in both environments", async () => {
    for (const scope of [{ testInput: "pointer" }, { testInput: "touch" }] as Params[]) {
      const disabled = await openDig("edit-gate", { gate: "disabled", ...scope });
      expect(disabled.count("id:dig-seg-month")).toBe(0);
      expect(lastSegmentProps(disabled, "month").isDisabled).toBe(true);

      await expect(
        disabled.press("label:gate-date >> role:spinbutton >> nth=0"),
      ).rejects.toMatchObject({ code: "ERR_NSH_TEST_DISABLED" });
      await disabled.wait(50);
      expect(lastSegmentProps(disabled, "month").isFocused).toBe(false);
      expect(fieldChanges(disabled)).toHaveLength(0);

      const readonly = await openDig("edit-gate", { gate: "readonly", ...scope });
      if (scope.testInput === "touch") {
        // The channel mounts and stays enabled — focusable, its edits
        // refused in the field layer (a host-disabled channel cannot
        // focus on iOS).
        expect(readonly.count("id:dig-seg-month")).toBe(1);
        expect(readonly.enabled("id:dig-seg-month")).toBe(true);
        await readonly.press("id:dig-seg-month");
        await waitFocused(readonly, "month");
        await readonly.keyboard.press("1");
      } else {
        await readonly.press("label:gate-date >> text:mm");
        await waitFocused(readonly, "month");
        await readonly.keyboard.press("1");
      }
      await readonly.wait(50);
      expect(lastSegment(readonly, "month").isPlaceholder).toBe(true);
      expect(fieldChanges(readonly)).toHaveLength(0);
    }
  }, 120_000);

  // adapt-sheets/date-input-group.md M-012 (A-011): the fixture itself —
  // `Scoped` mounts both environments and every probe the assertions read
  // (render props, bounds, hover events, field changes) records.
  test("M-012 fixture Scoped mounts both environments with readable probes", async () => {
    for (const params of [{ testInput: "pointer" }, { testInput: "touch" }] as Params[]) {
      const app = await openDig("default", params);
      await app.waitUntil(() => callsOf(app, "root-bounds").length > 0);
      expect(callsOf(app, "root-props").length).toBeGreaterThan(0);
      expect(callsOf(app, "segment-props").length).toBeGreaterThan(0);
      expect(callsOf(app, "segments").length).toBeGreaterThan(0);
      expect(callsOf(app, "input-props").length).toBeGreaterThan(0);
      expect(callsOf(app, "segment-bounds").length).toBeGreaterThan(0);
      expect(rootRecord(app).isDisabled).toBe(false);
    }
  }, 120_000);
});
