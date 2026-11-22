import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { changeCount, lastChange, lastSegmentProps } from "../../testers/date-field";
import { lastSegment } from "../../testers/date-input-group";

/*
 * Mobile assertions for the DateField adapt unit (G+B(分段命中区) with the
 * soft-keyboard bridge consumed through DateInputGroup): one test per row of
 * adapt-sheets/date-field.md §4 that the shared targets (headless + web) can
 * observe — M-001 … M-006, M-008 … M-010. The ios host-derivation half
 * (M-007) lives in `date-field.mobile.headless.test.tsx`: `--target web`
 * rejects a `platform` option outright (the date-input-group split).
 *
 * The fixture is `harness/date-field.fixtures.tsx`, opened by `host.params`:
 * `case` (default / empty / readonly / disabled / keyboard-type / focus /
 * full-width / required-invalid / description / validation / controlled /
 * prefix-suffix / granularity), `scope` ("" = the host's pointer environment
 * — the desktop-parity half — or "touch" through `EnvironmentScope`), `kt`
 * for the keyboard-type case, `year` / `month` / `day` for `startDate()`.
 *
 * The `platform: "windows"` pin is load-bearing: without it `pnpm test`
 * lands the app on the phone-sized engine where `input` defaults to touch
 * and every pointer-default assertion inverts under the suite (_common.md).
 *
 * Every assertion reads what `nsh/test` can observe — `shows`, `count`,
 * `enabled`, `texts`, `app.type`, `onLayout` bounds probes and the
 * `@scenario/probe` calls in `app.storage()`: `onChange`, `segment-props`,
 * `segments`, `segment-bounds`, `group-bounds`, `keyboard-type`, `focus-in`,
 * `focus-out`, `focus-change`. Class names are never read. The touch
 * soft-keyboard channels mount as `id:dig-seg-<type>` inside each segment —
 * `DateField.Segment` is `DateInputGroupSegment` by identity (A-002), so the
 * channel testIDs are the shared ones.
 */

type CaseParams = Record<string, string | number | boolean>;

function openCase(
  name: string,
  params: CaseParams = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../date-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: name, ...params } },
  });
}

/* -------------------------------------------------------------------------------------------------
 * Probe readers for the mobile-layer records (the shared testers cover the
 * desktop cases' probes; these read the ones the adapt sheet added).
 * -----------------------------------------------------------------------------------------------*/

type Bounds = { origin: { x: number; y: number }; size: { width: number; height: number } };

function lastOf<T>(app: App, name: string): T {
  const all = callsOf(app, name);
  const found = all[all.length - 1]?.[0] as T | undefined;

  if (found === undefined) throw new Error(`the fixture recorded no ${name} call`);

  return found;
}

function groupBounds(app: App): Bounds {
  return lastOf<Bounds>(app, "group-bounds");
}

function segmentBounds(app: App, type: string): Bounds {
  const all = callsOf(app, "segment-bounds")
    .map((c) => c[0] as { type: string; bounds: Bounds })
    .filter((e) => e.type === type);
  const found = all[all.length - 1];

  if (!found) throw new Error(`no bounds recorded for the ${type} segment`);

  return found.bounds;
}

function changes(app: App): string[] {
  return callsOf(app, "onChange").map((c) => String(c[0]));
}

function keyboardTypes(app: App): string[] {
  return callsOf(app, "keyboard-type").map((c) => String(c[0]));
}

// The last `segment-props` record per type decides: earlier renders still
// carry the previous `isFocused`, so "focused" means the latest render says so.
function focusedTypes(app: App): string[] {
  const last = new Map<string, boolean>();
  for (const c of callsOf(app, "segment-props")) {
    const r = c[0] as { type: string; isFocused: boolean };
    last.set(r.type, r.isFocused);
  }
  return [...last.entries()].filter(([, focused]) => focused).map(([type]) => type);
}

async function waitFocused(app: App, type: string): Promise<void> {
  await app.waitUntil(() => focusedTypes(app).includes(type));
}

// `lastSegmentProps` (testers/date-field) types the desktop `focus` record;
// the mobile layer records the wider set on every other case, read raw here.
function segmentFlag(app: App, type: string, flag: "isReadOnly" | "isDisabled"): boolean {
  const all = callsOf(app, "segment-props")
    .map((c) => c[0] as { type: string; isReadOnly?: boolean; isDisabled?: boolean })
    .filter((r) => r.type === type);
  const found = all[all.length - 1];

  if (!found) throw new Error(`no className record for the ${type} segment`);

  return found[flag] === true;
}

describe("date-field mobile", () => {
  // adapt-sheets/date-field.md M-001 (A-002, A-007): `DateField.Segment` is
  // `DateInputGroupSegment` by identity, so the shared `input` axis raises
  // the group row and every segment to the 44 pt touch target under the
  // injected environment while the pointer environment keeps the 36 pt row.
  // Bounds are the fixture's `onLayout` probes (Segment takes no `onLayout`,
  // so a shrink-wrapping View reports its bounds — sheet §6 records the
  // probe).
  test("M-001 touch raises group and segments to 44pt, pointer keeps the desktop metrics", async () => {
    const touch = await openCase("default", { scope: "touch" });
    await touch.waitUntil(() => callsOf(touch, "group-bounds").length > 0);
    expect(groupBounds(touch).size.height).toBeGreaterThanOrEqual(44);
    for (const type of ["month", "day", "year"]) {
      expect(segmentBounds(touch, type).size.height).toBeGreaterThanOrEqual(44);
    }

    const pointer = await openCase("default");
    await pointer.waitUntil(() => callsOf(pointer, "group-bounds").length > 0);
    expect(groupBounds(pointer).size.height).toBeLessThan(44);
    for (const type of ["month", "day", "year"]) {
      expect(segmentBounds(pointer, type).size.height).toBeLessThan(44);
    }
  }, 120_000);

  // adapt-sheets/date-field.md M-002 (A-001, A-002): under touch the channel
  // hosts the editing and lands on DateFieldRoot's own state — a press
  // focuses the channel, `app.type` feeds `field.type` with the keymap's
  // buffer/advance rules, Backspace feeds `field.backspace`, and Enter
  // (`blurAndSubmit`) runs the out-of-group `commit()` boundary once, which
  // is what drives the field's `onChange` probe.
  test("M-002 injected touch: channel press focuses, typing edits, Enter commits once", async () => {
    const app = await openCase("default", { scope: "touch" });

    expect(app.count("id:dig-seg-month")).toBe(1);
    expect(app.count("id:dig-seg-day")).toBe(1);
    expect(app.count("id:dig-seg-year")).toBe(1);

    await app.press("id:dig-seg-month");
    await waitFocused(app, "month");
    expect(callsOf(app, "focus-in").length).toBeGreaterThan(0);
    expect(lastOf<boolean>(app, "focus-change")).toBe(true);

    await app.type("id:dig-seg-month", "12");
    await app.waitUntil(() => lastSegment(app, "month").text === "12");
    // The owner is the DateField state: the commit ran on it, not on a
    // channel-held value — `onChange` reports December 15th, 2026.
    await app.waitUntil(() => changes(app).includes("2026-12-15"));
    // The buffer filled the segment: the focus advanced to the day channel.
    await waitFocused(app, "day");

    // Backspace is `field.backspace`: on the filled day it deletes one digit
    // ("15" → "1"), the next one empties the segment to its placeholder, the
    // placeholder press moves the focus back to month, and the last one
    // deletes a digit of the filled month ("12" → "1").
    await app.keyboard.press("backspace");
    await app.waitUntil(() => lastSegment(app, "day").text === "1");
    await app.keyboard.press("backspace");
    await app.waitUntil(() => lastSegment(app, "day").isPlaceholder);
    await app.keyboard.press("backspace");
    await waitFocused(app, "month");
    await app.keyboard.press("backspace");
    await app.waitUntil(() => lastSegment(app, "month").text === "1");

    // Enter is `blurAndSubmit`: the blur crosses the group boundary and runs
    // `commit()` once. On the empty field the invalid display (February
    // 30th) never committed while editing — the date stays incomplete until
    // the last keystroke and then fails validation — so the boundary emits
    // exactly one value: the clamped February 28th.
    const editing = await openCase("empty", { scope: "touch" });
    await editing.type("id:dig-seg-month", "02");
    await editing.type("id:dig-seg-day", "30");
    await editing.type("id:dig-seg-year", "2026");
    await editing.waitUntil(() => lastSegment(editing, "year").text === "2026");
    expect(changes(editing)).toHaveLength(0);

    await editing.keyboard.press("enter");
    await editing.waitUntil(() => changes(editing).length > 0);

    expect(changes(editing)).toEqual(["2026-02-28"]);
    expect(lastOf<boolean>(editing, "focus-change")).toBe(false);
    expect(callsOf(editing, "focus-out").length).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/date-field.md M-003 (A-002, 负断言): under the default
  // pointer environment the soft-keyboard channel does not exist — no
  // `dig-seg-*` input mounts — the segment view itself takes the press focus
  // and the keymap digits still drive `field.type`.
  test("M-003 default environment: no channel mounts, view focus and keymap unchanged", async () => {
    const app = await openCase("default");

    expect(app.count("id:dig-seg-month")).toBe(0);
    expect(app.count("id:dig-seg-day")).toBe(0);
    expect(app.count("id:dig-seg-year")).toBe(0);

    await app.press("id:df-month");
    await waitFocused(app, "month");

    await app.keyboard.press("1");
    await app.keyboard.press("2");

    expect(lastSegment(app, "month").text).toBe("12");
    expect(lastSegment(app, "month").isPlaceholder).toBe(false);

    // The `focus` case's own probe flips the same way it always did.
    const focus = await openCase("focus");
    await focus.press("id:df-day");
    await waitFocused(focus, "day");
    expect(lastSegmentProps(focus, "day").isFocused).toBe(true);
  }, 120_000);

  // adapt-sheets/date-field.md M-004 (A-002): a press on the Input's padding
  // (the "/" literal is group area that hears no press) runs `focusLast`,
  // whose registered target under touch is the channel — typing then lands
  // without another press. A press on a segment names its own channel as
  // the typing target.
  test("M-004 injected touch: padding press focuses a channel, segment press targets it", async () => {
    const app = await openCase("default", { scope: "touch" });

    // Every segment is filled, so `focusLast` lands on the last one: the
    // year channel takes the focus and `app.type` routes straight into it.
    await app.press("id:df-input >> text:/");
    await waitFocused(app, "year");

    await app.type("id:dig-seg-year", "2027");
    await app.waitUntil(() => lastSegment(app, "year").text === "2027");
    await app.waitUntil(() => changes(app).includes("2027-08-15"));

    // Pressing the month segment lands on its covering channel (the segment
    // view itself is unfocusable under touch); typing follows the channel.
    await app.press("id:dig-seg-month");
    await waitFocused(app, "month");
    await app.type("id:dig-seg-month", "03");
    await app.waitUntil(() => lastSegment(app, "month").text === "3");
  }, 120_000);

  // adapt-sheets/date-field.md M-005 (A-001, A-002): a read-only segment
  // keeps a focusable but `readonly` channel — it focuses, and keys change
  // nothing. A disabled field mounts no channel at all: the segments are
  // not focusable and no editing event fires on either side.
  test("M-005 readonly channel takes no edit, disabled mounts no channel", async () => {
    const ro = await openCase("readonly", { scope: "touch" });
    expect(ro.count("id:dig-seg-month")).toBe(1);
    expect(segmentFlag(ro, "month", "isReadOnly")).toBe(true);

    await ro.press("id:dig-seg-month");
    await waitFocused(ro, "month");

    // `app.type` on a `readonly` host is unverified; the named key a soft
    // keyboard would send goes through `keyboard.press` (the dig M-008
    // precedent).
    await ro.keyboard.press("1");
    await ro.wait(100);
    expect(lastSegment(ro, "month").text).toBe("8");
    expect(lastSegment(ro, "month").isPlaceholder).toBe(false);
    expect(changeCount(ro)).toBe(0);

    const disabled = await openCase("disabled", { scope: "touch" });
    expect(disabled.count("id:dig-seg-month")).toBe(0);
    expect(disabled.count("id:dig-seg-day")).toBe(0);
    expect(disabled.count("id:dig-seg-year")).toBe(0);
    expect(segmentFlag(disabled, "month", "isDisabled")).toBe(true);

    await expect(disabled.press("id:df-day")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    await disabled.wait(50);
    expect(lastSegmentProps(disabled, "month").isFocused).toBe(false);
    expect(changeCount(disabled)).toBe(0);
  }, 120_000);

  // adapt-sheets/date-field.md M-006 (A-002): `DateField.Input` is
  // `DateInputGroupInput` by identity, so `keyboardType` reaches every
  // segment through `DateInputGroupKeyboardContext` — `"auto"` by default,
  // the explicit value uniformly when given. The per-segment resolution and
  // the host keyboard itself stay at the channel boundary (§6 registered
  // gap), so the assertion stops at the context readback.
  test("M-006 keyboardType passes through DateField.Input to the segments", async () => {
    const auto = await openCase("keyboard-type", { scope: "touch" });
    await auto.waitUntil(() => keyboardTypes(auto).length >= 3);
    expect(keyboardTypes(auto).every((v) => v === "auto")).toBe(true);
    expect(auto.count("id:dig-seg-month")).toBe(1);

    const explicit = await openCase("keyboard-type", {
      kt: "decimal-pad",
      scope: "touch",
    });
    await explicit.waitUntil(() => keyboardTypes(explicit).length >= 3);
    expect(keyboardTypes(explicit).every((v) => v === "decimal-pad")).toBe(true);
  }, 120_000);

  // adapt-sheets/date-field.md M-008 (基线): the default environment keeps
  // the desktop contract — keymap editing, the padding-press `focusLast`,
  // the segment focus records, the field focus edges, the Label /
  // Description / FieldError registrations and `fullWidth`. The out-of-group
  // `commit()` boundary's observable half is M-002's Enter (headless windows
  // has no Tab and the fixture holds no pressable outside the field — §7
  // records the choice); `date-field.web.test.tsx` already pins the same
  // semantics on web.
  test("M-008 default environment baseline: keymap, focusLast, focus edges, parts", async () => {
    const app = await openCase("default");

    // Keymap editing: digits fill and advance, arrows cycle and commit
    // eagerly, Backspace deletes.
    await app.press("id:df-month");
    await waitFocused(app, "month");
    expect(lastOf<boolean>(app, "focus-change")).toBe(true);

    await app.keyboard.press("arrowup");
    await app.waitUntil(() => lastSegment(app, "month").text === "9");
    expect(lastChange(app).text).toBe("2026-09-15");

    await app.press("id:df-day");
    await waitFocused(app, "day");
    for (const key of ["1", "6"]) await app.keyboard.press(key);
    expect(lastSegment(app, "day").text).toBe("16");

    // Padding press → `focusLast`: with every segment filled it stays on the
    // last one, the year — the pointer half of M-004's path.
    await app.press("id:df-input >> text:/");
    await waitFocused(app, "year");

    // Backspace deletes one digit at a time; clearing the last one returns
    // the segment to its placeholder — the same `field.backspace` the
    // channel feeds in M-002.
    await app.keyboard.press("backspace");
    await app.waitUntil(() => lastSegment(app, "year").text === "202");
    for (const _ of [1, 2, 3]) await app.keyboard.press("backspace");
    await app.waitUntil(() => lastSegment(app, "year").isPlaceholder);

    // The part contract under the same default environment: the Label's
    // asterisk, the FieldError mount and the Description's invalid `hidden`.
    const invalid = await openCase("required-invalid");
    expect(invalid.texts()).toContain("Date*");
    expect(invalid.shows("text:Please enter a valid date")).toBe(true);

    const description = await openCase("description");
    expect(description.shows("text:Enter a date")).toBe(true);

    // `fullWidth`: the group stretches across the 400 pt frame; the default
    // case's group stays content-sized, well under it.
    const wide = await openCase("full-width");
    await wide.waitUntil(() => callsOf(wide, "group-bounds").length > 0);
    expect(groupBounds(wide).size.width).toBeGreaterThanOrEqual(400);

    const narrow = await openCase("default");
    await narrow.waitUntil(() => callsOf(narrow, "group-bounds").length > 0);
    expect(groupBounds(narrow).size.width).toBeLessThan(400);
  }, 120_000);

  // adapt-sheets/date-field.md M-009 (基线): `isDisabled` / `isReadOnly` /
  // `isInvalid` / `isRequired` / `validate` / `minValue`·`maxValue` behave the
  // same on both environments — same `onChange` silence, same FieldError and
  // Description effects.
  test("M-009 state and validation contract identical in both environments", async () => {
    for (const params of [{}, { scope: "touch" }] as CaseParams[]) {
      const disabled = await openCase("disabled", params);
      expect(disabled.enabled("id:df-month")).toBe(false);
      await expect(disabled.press("id:df-day")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_DISABLED",
      });
      expect(changeCount(disabled)).toBe(0);

      const readonly = await openCase("readonly", params);
      if (params.scope === "touch") {
        await readonly.press("id:dig-seg-month");
      } else {
        await readonly.press("id:df-month");
      }
      await waitFocused(readonly, "month");
      await readonly.keyboard.press("1");
      await readonly.wait(50);
      expect(lastSegment(readonly, "month").text).toBe("8");
      expect(changeCount(readonly)).toBe(0);

      const invalid = await openCase("required-invalid", params);
      expect(invalid.texts()).toContain("Date*");
      expect(invalid.shows("text:Please enter a valid date")).toBe(true);
      expect(changeCount(invalid)).toBe(0);

      // The validate + minValue/maxValue case: untouched, no commit ran, so
      // its FieldError stays hidden and nothing reports a change.
      const validation = await openCase("validation", params);
      expect(validation.shows("text:Date must be in 2026")).toBe(false);
      expect(changeCount(validation)).toBe(0);
    }
  }, 120_000);

  // adapt-sheets/date-field.md M-010 (A-007): the fixture itself — `Scoped`
  // mounts both environments and every probe the assertions read (bounds,
  // segment records, keyboard-type readback, `onChange`, focus edges)
  // records.
  test("M-010 fixture Scoped mounts both environments with readable probes", async () => {
    for (const params of [{}, { scope: "touch" }] as CaseParams[]) {
      const app = await openCase("default", params);
      await app.waitUntil(() => callsOf(app, "group-bounds").length > 0);
      expect(callsOf(app, "segment-bounds").length).toBeGreaterThan(0);
      expect(callsOf(app, "segment-props").length).toBeGreaterThan(0);
      expect(callsOf(app, "segments").length).toBeGreaterThan(0);
      expect(app.count("role:spinbutton")).toBe(3);

      const kt = await openCase("keyboard-type", params);
      await kt.waitUntil(() => keyboardTypes(kt).length >= 3);
    }
  }, 120_000);
});
