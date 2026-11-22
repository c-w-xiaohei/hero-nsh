import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { changeCount, lastChange, lastSegmentProps } from "../../testers/time-field";

/*
 * Mobile assertions for the TimeField adapt unit (G+B(分段 target): the
 * soft-keyboard editing bridge and the completion behavior), one test per row
 * of adapt-sheets/time-field.md §4 that the shared targets (headless + web)
 * can observe: M-001 … M-006 and M-008 … M-010. The ios host-derivation half
 * (M-007) lives in `time-field.mobile.headless.test.tsx` because `open` accepts
 * `platform: "ios"` only on the headless target.
 *
 * The fixture is `harness/time-field.fixtures.tsx`, opened by `host.params`:
 * `case` (default / focus / readonly / disabled / required-invalid /
 * description / validation / granularity / keyboard-type / …) and `scope`
 * ("" = the host's pointer environment — the desktop-parity half — or "touch"
 * through `EnvironmentScope`).
 *
 * The `platform: "windows"` pin is load-bearing: without it `pnpm test` lands
 * the app on the phone-sized engine where `input` defaults to touch and every
 * pointer-default assertion inverts under the suite (_common.md).
 *
 * Every assertion reads what `nsh/test` can observe — `shows`, `count`,
 * `enabled`, `texts`, `onLayout` bounds probes and the `@scenario/probe` calls
 * in `app.storage()`: `onChange`, `segment-props`, `segments`, `group-bounds`,
 * `segment-bounds`, `keyboard-type`. Class names are never read.
 */

type Params = Record<string, string>;

function openCase(name: string, params: Params = {}): Promise<App> {
  return open("../../../time-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name, ...params } },
  });
}

/* -------------------------------------------------------------------------------------------------
 * Probe readers for the mobile-layer records.
 * -----------------------------------------------------------------------------------------------*/

type Bounds = { origin: { x: number; y: number }; size: { width: number; height: number } };
type SegmentRecord = {
  type: string;
  text: string;
  isPlaceholder: boolean;
  isEditable: boolean;
};
type KeyboardRecord = { type: string; keyboardType: string; resolved: string };

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
  const found = callsOf(app, "segment-bounds")
    .map((c) => c[0] as { type: string; bounds: Bounds })
    .filter((entry) => entry.type === type)
    .at(-1);

  if (!found) throw new Error(`no bounds recorded for the ${type} segment`);

  return found.bounds;
}

function segmentRecords(app: App): SegmentRecord[] {
  return callsOf(app, "segments").map((c) => c[0] as SegmentRecord);
}

function lastSegment(app: App, type: string): SegmentRecord {
  const found = segmentRecords(app).filter((record) => record.type === type).at(-1);

  if (!found) throw new Error(`no segment of type ${type} was rendered`);

  return found;
}

function keyboardRecords(app: App): KeyboardRecord[] {
  return callsOf(app, "keyboard-type").map((c) => c[0] as KeyboardRecord);
}

function lastKeyboardRecord(app: App, type: string): KeyboardRecord {
  const found = keyboardRecords(app).filter((record) => record.type === type).at(-1);

  if (!found) throw new Error(`no keyboard-type record for the ${type} segment`);

  return found;
}

type ChangeRecord = Record<string, unknown> & { hour: number; minute: number };

function lastChangeRecord(app: App): ChangeRecord | null {
  const calls = callsOf(app, "onChange");
  if (calls.length === 0) return null;

  return calls[calls.length - 1][0] as ChangeRecord;
}

// The last `segment-props` record per type decides: earlier renders still carry
// the previous `isFocused`, so "focused" means the latest render says so.
function focusedTypes(app: App, name = "segment-props"): string[] {
  const last = new Map<string, boolean>();
  for (const c of callsOf(app, name)) {
    const record = c[0] as { type: string; isFocused: boolean };
    last.set(record.type, record.isFocused);
  }

  return [...last.entries()].filter(([, focused]) => focused).map(([type]) => type);
}

async function waitFocused(app: App, type: string, name = "segment-props"): Promise<void> {
  await app.waitUntil(() => focusedTypes(app, name).includes(type));
}

async function waitSegmentText(app: App, type: string, text: string): Promise<void> {
  await app.waitUntil(() => app.shows(`id:tf-${type === "dayPeriod" ? "day-period" : type} >> text:${text}`));
}

describe("time-field mobile", () => {
  // adapt-sheets/time-field.md M-001 (A-002, A-007): under injected touch the
  // shared segment channel raises the row and every segment to the 44pt touch
  // target; the pointer environment keeps the desktop metrics. Bounds are the
  // fixture's `onLayout` probes (`segment-bounds` wraps the segment because
  // Segment takes no `onLayout`, sheet §6 records the probe).
  test("M-001 touch raises group/segments to 44pt, pointer keeps the desktop metrics", async () => {
    const touch = await openCase("default", { scope: "touch" });
    await touch.waitUntil(
      () => callsOf(touch, "group-bounds").length > 0 && callsOf(touch, "segment-bounds").length > 0,
    );

    expect(groupBounds(touch).size.height).toBeGreaterThanOrEqual(44);
    for (const type of ["hour", "minute", "dayPeriod"]) {
      expect(segmentBounds(touch, type).size.height).toBeGreaterThanOrEqual(44);
    }

    const pointer = await openCase("default");
    await pointer.waitUntil(
      () => callsOf(pointer, "group-bounds").length > 0 && callsOf(pointer, "segment-bounds").length > 0,
    );

    expect(groupBounds(pointer).size.height).toBeLessThan(44);
    for (const type of ["hour", "minute", "dayPeriod"]) {
      expect(segmentBounds(pointer, type).size.height).toBeLessThan(44);
    }
  }, 120_000);

  // adapt-sheets/time-field.md M-002 (A-001, A-002): under touch the `dig-seg-*`
  // channel hosts the editing on TimeFieldRoot's own state — `app.type` feeds
  // `field.type` with the keymap's buffer/advance rules, Backspace feeds
  // `field.backspace`, and the `onChange` payload is the `TimeValue` bridge,
  // not the internal `DateValue`. Enter is `submitBehavior="blurAndSubmit"`:
  // the blur runs the group's commit boundary, which may add at most one
  // submission and never a duplicate of the value already committed.
  test("M-002 injected touch: channel typing edits, Backspace deletes, Enter commits once", async () => {
    const app = await openCase("focus", { scope: "touch" });

    expect(app.count("id:dig-seg-hour")).toBe(1);
    expect(app.count("id:dig-seg-minute")).toBe(1);
    expect(app.count("id:dig-seg-dayPeriod")).toBe(1);

    // Under touch the segment's press target is the channel Input covering it
    // (`dig-seg-*`); `tf-hour` stays the segment's identity for bounds/text.
    await app.press("id:dig-seg-hour");
    await waitFocused(app, "hour");

    await app.type("id:dig-seg-hour", "10");
    await waitSegmentText(app, "hour", "10");
    await waitFocused(app, "minute");

    await app.waitUntil(() => {
      const committed = lastChangeRecord(app);
      return committed?.hour === 10 && committed.minute === 30;
    });
    const committed = lastChangeRecord(app) as Record<string, unknown>;
    expect(committed).toMatchObject({ hour: 10, minute: 30 });
    expect(committed.year).toBeUndefined();

    // Backspace on the minute channel is `field.backspace`: "30" loses one
    // digit and the field commits 10:03.
    await app.press("id:dig-seg-minute");
    await waitFocused(app, "minute");
    await app.keyboard.press("backspace");
    await waitSegmentText(app, "minute", "03");
    await app.waitUntil(() => lastChangeRecord(app)?.minute === 3);
    expect(lastChange(app).hour).toBe(10);

    const beforeEnter = changeCount(app);
    const expected = { ...lastChange(app) };

    await app.keyboard.press("enter");
    await app.wait(50);

    expect(changeCount(app)).toBeLessThanOrEqual(beforeEnter + 1);
    if (changeCount(app) > beforeEnter) {
      expect(lastChange(app)).toMatchObject({ hour: expected.hour, minute: expected.minute });
    }
  }, 120_000);

  // adapt-sheets/time-field.md M-003 (A-002, 负断言): under the default pointer
  // environment the soft-keyboard channel does not exist — no `dig-seg-*`
  // input mounts — the segment view itself takes the focus and the keymap
  // digits still drive `field.type`.
  test("M-003 default environment: no channel mounts, view focus and keymap unchanged", async () => {
    const app = await openCase("focus");

    expect(app.count("id:dig-seg-hour")).toBe(0);
    expect(app.count("id:dig-seg-minute")).toBe(0);
    expect(app.count("id:dig-seg-dayPeriod")).toBe(0);

    await app.press("id:tf-hour");
    await waitFocused(app, "hour");

    await app.keyboard.press("1");
    await app.keyboard.press("0");
    await waitSegmentText(app, "hour", "10");
    await waitFocused(app, "minute");

    await app.waitUntil(() => {
      const committed = lastChangeRecord(app);
      return committed?.hour === 10 && committed.minute === 30;
    });
    expect((lastChange(app) as Record<string, unknown>).year).toBeUndefined();
  }, 120_000);

  // adapt-sheets/time-field.md M-004 (A-002): under touch a press on the
  // Input's padding runs `focusLast`, whose registered target is the channel —
  // typing then lands without another press. A press on one segment makes that
  // segment's channel the input target.
  test("M-004 injected touch: padding press focuses the last channel; segment press focuses its channel", async () => {
    const app = await openCase("focus", { scope: "touch" });

    expect(app.count("id:dig-seg-dayPeriod")).toBe(1);

    // `tf-input` is the Input part: its press is the padding/focusLast path.
    await app.press("id:tf-input");
    await waitFocused(app, "dayPeriod");

    await app.type("id:dig-seg-dayPeriod", "p");
    await waitSegmentText(app, "dayPeriod", "PM");
    await app.waitUntil(() => {
      const committed = lastChangeRecord(app);
      return committed?.hour === 21 && committed.minute === 30;
    });

    // A press on the segment's touch target (the channel covering `tf-hour`)
    // makes that channel the input target.
    await app.press("id:dig-seg-hour");
    await waitFocused(app, "hour");
    await app.type("id:dig-seg-hour", "10");
    await waitSegmentText(app, "hour", "10");
    await app.waitUntil(() => {
      const committed = lastChangeRecord(app);
      return committed?.hour === 22 && committed.minute === 30;
    });
  }, 120_000);

  // adapt-sheets/time-field.md M-005 (A-002): `isReadOnly` keeps the touch
  // channels mounted and focusable but `readonly` — typing reaches the channel
  // yet never `field.type`, and `onChange` stays silent. `isDisabled` mounts no
  // channel at all and refuses the press.
  test("M-005 injected touch: readonly channel takes no edit; disabled mounts no channel", async () => {
    const readonly = await openCase("readonly", { scope: "touch" });

    expect(readonly.count("id:dig-seg-hour")).toBe(1);
    expect(readonly.count("id:dig-seg-minute")).toBe(1);
    expect(readonly.count("id:dig-seg-dayPeriod")).toBe(1);
    // `enabled` is false for a readonly input: the channel is focusable but
    // takes no editing.
    expect(readonly.enabled("id:dig-seg-hour")).toBe(false);

    await readonly.press("id:dig-seg-hour");
    await waitFocused(readonly, "hour");
    await readonly.keyboard.press("1");
    await readonly.keyboard.press("0");
    await readonly.wait(50);

    expect(lastSegment(readonly, "hour").text).toBe("9");
    expect(lastSegment(readonly, "minute").text).toBe("30");
    expect(changeCount(readonly)).toBe(0);

    const disabled = await openCase("disabled", { scope: "touch" });

    expect(disabled.count("id:dig-seg-hour")).toBe(0);
    expect(disabled.count("id:dig-seg-minute")).toBe(0);
    expect(disabled.count("id:dig-seg-dayPeriod")).toBe(0);
    expect(disabled.enabled("id:tf-hour")).toBe(false);
    expect(disabled.enabled("id:tf-minute")).toBe(false);
    expect(disabled.enabled("id:tf-day-period")).toBe(false);

    await expect(disabled.press("id:tf-hour")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    await disabled.wait(50);
    expect(disabled.shows("id:tf-hour >> text:9")).toBe(true);
    expect(disabled.shows("id:tf-minute >> text:30")).toBe(true);
    expect(disabled.shows("id:tf-day-period >> text:AM")).toBe(true);
    expect(changeCount(disabled)).toBe(0);
  }, 120_000);

  // adapt-sheets/time-field.md M-006 (A-002): `TimeField.Input` is the identity
  // alias of `DateInputGroupInput`, so its `keyboardType` prop reaches every
  // segment through `DateInputGroupKeyboardContext`. The host keyboard itself
  // is unobservable (sheet §6), so the assertion stops at the context boundary
  // plus the documented per-segment resolution the fixture records.
  test("M-006 keyboardType reaches the segments: auto resolves per segment, explicit is uniform", async () => {
    const auto = await openCase("keyboard-type", { scope: "touch" });
    await auto.waitUntil(() => keyboardRecords(auto).length >= 3);

    expect(lastKeyboardRecord(auto, "hour")).toMatchObject({
      keyboardType: "auto",
      resolved: "numeric",
    });
    expect(lastKeyboardRecord(auto, "minute")).toMatchObject({
      keyboardType: "auto",
      resolved: "numeric",
    });
    expect(lastKeyboardRecord(auto, "dayPeriod")).toMatchObject({
      keyboardType: "auto",
      resolved: "default",
    });
    expect(auto.count("id:dig-seg-hour")).toBe(1);

    const explicit = await openCase("keyboard-type", { kt: "decimal-pad", scope: "touch" });
    await explicit.waitUntil(() => keyboardRecords(explicit).length >= 3);

    for (const type of ["hour", "minute", "dayPeriod"]) {
      expect(lastKeyboardRecord(explicit, type)).toMatchObject({
        keyboardType: "decimal-pad",
        resolved: "decimal-pad",
      });
    }
  }, 120_000);

  // adapt-sheets/time-field.md M-008 (基线): the default environment keeps the
  // desktop contract — keymap editing, padding press → focusLast, the
  // isFocused/isFocusVisible ring inputs, the Label/Description/FieldError
  // registrations with the invalid-hidden FieldError, fullWidth, and the
  // granularity="second" / hourCycle={24} segment set.
  test("M-008 default environment baseline: keymap, focusLast, ring, registrations, segment sets", async () => {
    const app = await openCase("focus");

    expect(app.count("id:dig-seg-hour")).toBe(0);

    // Keymap editing on the minute segment: arrow steps, Backspace deletes one
    // digit, a digit types through the same buffer/advance rules.
    await app.press("id:tf-minute");
    await waitFocused(app, "minute");
    await app.keyboard.press("arrowup");
    await app.waitUntil(() => lastChangeRecord(app)?.minute === 31);
    await app.keyboard.press("backspace");
    await app.waitUntil(() => lastChangeRecord(app)?.minute === 3);
    await app.keyboard.press("5");
    await app.waitUntil(() => lastChangeRecord(app)?.minute === 35);
    await waitFocused(app, "dayPeriod");

    // Padding press → focusLast lands on the last segment; the keyboard press
    // that follows is what raises the focus-visible ring input.
    await app.press("id:tf-input");
    await waitFocused(app, "dayPeriod");
    await app.keyboard.press("arrowup");
    await app.waitUntil(() => {
      const committed = lastChangeRecord(app);
      return committed?.hour === 21 && committed.minute === 35;
    });
    expect(lastSegmentProps(app, "dayPeriod").isFocused).toBe(true);
    expect(lastSegmentProps(app, "dayPeriod").isFocusVisible).toBe(true);

    // Label / FieldError registration and the invalid-hidden FieldError.
    const required = await openCase("required-invalid");
    expect(required.texts()).toContain("Time*");
    expect(required.shows("text:Please enter a valid time")).toBe(true);

    const description = await openCase("description");
    expect(description.shows("text:Enter a time")).toBe(true);

    const validation = await openCase("validation");
    expect(validation.shows("text:Time must be between 9:00 AM and 5:00 PM")).toBe(false);

    // fullWidth mounts the same part tree inside its sized parent.
    const fullWidth = await openCase("full-width");
    expect(fullWidth.shows("id:tf-frame")).toBe(true);
    expect(fullWidth.shows("id:tf-root")).toBe(true);
    expect(fullWidth.count("id:tf-group >> role:spinbutton")).toBe(3);

    // granularity="second" + hourCycle={24}: hour/minute/second, no dayPeriod.
    const granularity = await openCase("granularity");
    await granularity.waitUntil(() => callsOf(granularity, "segments").length > 0);
    const types = new Set(segmentRecords(granularity).map((record) => record.type));
    expect(types.has("hour")).toBe(true);
    expect(types.has("minute")).toBe(true);
    expect(types.has("second")).toBe(true);
    expect(types.has("dayPeriod")).toBe(false);
    expect(granularity.shows("id:tf-second")).toBe(true);
    expect(granularity.shows("id:tf-day-period")).toBe(false);
  }, 120_000);

  // adapt-sheets/time-field.md M-009 (基线): the isDisabled / isReadOnly /
  // isInvalid / isRequired / validate / minValue·maxValue contract is the same
  // on both ends — the `onChange` sequence stays empty where editing is gated,
  // and the FieldError / Description registration reads identically under the
  // default pointer environment and the injected touch one.
  test("M-009 disabled/readonly/invalid/required/validation contract is identical on both environments", async () => {
    for (const scope of [{}, { scope: "touch" }] as Params[]) {
      const disabled = await openCase("disabled", scope);
      expect(disabled.enabled("id:tf-hour")).toBe(false);
      expect(disabled.shows("id:tf-hour >> text:9")).toBe(true);
      expect(changeCount(disabled)).toBe(0);
      if (scope.scope === "touch") {
        expect(disabled.count("id:dig-seg-hour")).toBe(0);
      }

      const readonly = await openCase("readonly", scope);
      if (scope.scope === "touch") {
        expect(readonly.enabled("id:dig-seg-hour")).toBe(false);
        await readonly.press("id:dig-seg-hour");
        await waitFocused(readonly, "hour");
        await readonly.keyboard.press("1");
        await readonly.keyboard.press("0");
      } else {
        await readonly.press("id:tf-hour");
        await readonly.keyboard.press("1");
      }
      await readonly.wait(50);
      expect(lastSegment(readonly, "hour").text).toBe("9");
      expect(changeCount(readonly)).toBe(0);

      const required = await openCase("required-invalid", scope);
      expect(required.texts()).toContain("Time*");
      expect(required.shows("text:Please enter a valid time")).toBe(true);

      const description = await openCase("description", scope);
      expect(description.shows("text:Enter a time")).toBe(true);

      const validation = await openCase("validation", scope);
      expect(validation.shows("text:Time must be between 9:00 AM and 5:00 PM")).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/time-field.md M-010 (A-007): the fixture itself — `Scoped`
  // mounts both environments and every probe the assertions read (`onChange`,
  // `segment-props`, `segments`, `group-bounds`, `segment-bounds`,
  // `keyboard-type`) records.
  test("M-010 fixture Scoped mounts both environments with readable probes", async () => {
    for (const params of [{}, { scope: "touch" }] as Params[]) {
      const app = await openCase("default", params);
      await app.waitUntil(
        () =>
          callsOf(app, "segments").length > 0 &&
          callsOf(app, "group-bounds").length > 0 &&
          callsOf(app, "segment-bounds").length > 0,
      );

      expect(segmentRecords(app).length).toBeGreaterThan(0);
      expect(groupBounds(app).size.height).toBeGreaterThan(0);
      expect(segmentBounds(app, "hour").size.height).toBeGreaterThan(0);
      expect(changeCount(app)).toBe(0);
    }

    const keyboard = await openCase("keyboard-type", { scope: "touch" });
    await keyboard.waitUntil(() => callsOf(keyboard, "keyboard-type").length >= 3);
    expect(lastKeyboardRecord(keyboard, "hour").keyboardType).toBe("auto");
  }, 120_000);
});
