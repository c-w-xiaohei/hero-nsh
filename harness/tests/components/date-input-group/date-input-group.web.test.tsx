import { expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { lastSegment, lastSegmentProps, rootRecord } from "../../testers/date-input-group";

/*
 * DateInputGroup cases that read the keyboard focus and the segment editing
 * state (port sheet 4b, this unit's own `S-` rows: 4b.1 has no upstream test
 * for the module, and 4b.3 owns the fixture). The `X-` cases at the end are
 * the review follow-up regressions; each cites the upstream `path:line` it
 * enforces.
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, a click focuses only an Input, `ref.focus()`
 * on a view is a no-op and Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). A date segment is a `focusable` View, so
 * segment focus and segment keys only work on the web and on macOS. Approved
 * difference "Windows keyboard focus and activation (NSH 0.4.0 host gap)",
 * port sheet section 8 and the common rules (`_common.md:52`). The structural
 * cases stay in the plain file; nothing here is hidden on a target where it
 * could work.
 */

function openCase(name: string, options: OpenOptions = {}): Promise<App> {
  return open("../../../date-input-group.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: name } },
  });
}

// port sheet 4b.3 `default`, rules R-005 / R-006 / R-021, section 2 state table
// The Root aggregates the focused children it registered: hovering the group
// reports `isHovered`, a pointer press on a segment focuses it (the segment
// calls `focus()` on its own element reference, since a press does not focus a
// view) and lifts `isFocusWithin`, and pressing another segment moves both the
// segment focus and the registration with it. The press is the pointer
// modality, so the ring stays off (`isFocusVisible` false), which is what
// `createInteractionModality` exists for.
//
// The case stays inside the group on purpose: a view handing the keyboard
// focus to an `<Input>` is a measured NSH gap (no guaranteed `onBlur`, see
// src/primitives/create-keymap-scope/create-keymap-scope.ts), so a blur through
// another input would prove the host, not this component.
test("S-005 should report hover, segment focus and group focus-within", async () => {
  const app = await openCase("default");

  expect(rootRecord(app).isHovered).toBe(false);
  expect(rootRecord(app).isFocusWithin).toBe(false);

  await app.hover("label:date");

  expect(rootRecord(app).isHovered).toBe(true);

  await app.press("label:date >> text:mm");

  expect(lastSegmentProps(app, "month").isFocused).toBe(true);
  expect(rootRecord(app).isFocusWithin).toBe(true);
  expect(rootRecord(app).isFocusVisible).toBe(false);

  await app.press("label:date >> text:dd");

  expect(lastSegmentProps(app, "month").isFocused).toBe(false);
  expect(lastSegmentProps(app, "day").isFocused).toBe(true);
  expect(rootRecord(app).isFocusWithin).toBe(true);
});

// port sheet 4b.3 `default`, section 5 "段的按键" and the derived values table
// Typing walks the segments: two digits fill the month and move on, two fill
// the day, four fill the year, so the three placeholders become a whole date.
// The last arrow key then increments the year the field now holds. A keyboard
// interaction also turns the group's focus ring on (`isFocusVisible`), the
// contrast to S-005's pointer press. `nsh/test` cannot read `aria-valuetext`,
// so the committed segment texts are the observable proof of the state.
test("S-006 should build a date from segment keystrokes and increment the year", async () => {
  const app = await openCase("default");

  expect(lastSegment(app, "year").isPlaceholder).toBe(true);

  await app.press("label:date >> text:mm");

  for (const key of ["0", "1", "0", "2", "2", "0", "2", "6"]) {
    await app.keyboard.press(key);
  }

  expect(app.shows("text:mm")).toBe(false);
  expect(app.shows("text:dd")).toBe(false);
  expect(app.shows("text:yyyy")).toBe(false);

  expect(lastSegment(app, "month").isPlaceholder).toBe(false);
  expect(lastSegment(app, "day").isPlaceholder).toBe(false);
  expect(lastSegment(app, "year").text).toBe("2026");
  expect(rootRecord(app).isFocusVisible).toBe(true);

  await app.keyboard.press("up");

  expect(lastSegment(app, "year").text).toBe("2027");
});

// port sheet 4b.3 `default`, section 5 "段的按键" (arrowleft / arrowright,
// backspace, delete) and the side effects table.
// Filling a segment moves the focus to the next one, the arrow keys move it
// between adjacent segments, and Backspace / Delete delete one digit of the
// focused segment, clearing it only when no digit is left
// (`react-spectrum/packages/react-aria/src/datepicker/useDateSegment.ts:110-127`:
// slice the last character, `clearSegment` only when the remainder is empty or
// parses to 0). None of these has an upstream assertion (port sheet 4b.2), so
// this case is the unit's own record of them.
test("S-007 should move focus between segments and delete the focused segment digit by digit", async () => {
  const app = await openCase("default");

  await app.press("label:date >> text:dd");

  expect(lastSegmentProps(app, "day").isFocused).toBe(true);

  await app.keyboard.press("2");
  await app.keyboard.press("5");

  expect(lastSegmentProps(app, "day").isFocused).toBe(false);
  expect(lastSegmentProps(app, "year").isFocused).toBe(true);

  await app.keyboard.press("left");

  expect(lastSegmentProps(app, "year").isFocused).toBe(false);
  expect(lastSegmentProps(app, "day").isFocused).toBe(true);
  expect(Number(lastSegment(app, "day").text)).toBe(25);

  await app.keyboard.press("backspace");

  expect(lastSegment(app, "day").isPlaceholder).toBe(false);
  expect(Number(lastSegment(app, "day").text)).toBe(2);

  await app.keyboard.press("delete");

  expect(lastSegment(app, "day").isPlaceholder).toBe(true);
  expect(app.shows("text:dd")).toBe(true);
});

// X-001
// R/tmp/vendor/heroui/packages/react/tests/components/date-field/date-field.test.tsx:209-216
// (`supports focus-visible via keyboard`: the first `user.tab()` focuses the
// month spinbutton). NSH 0.4.0 keeps every view that takes presses as a Tab
// stop unless `focusable` is false (`harness/.nsh/types/nsh/types.d.ts:771-778`),
// so the Input's own View must opt out; otherwise the first Tab stops there.
test("X-001 should put the first Tab on the month segment", async () => {
  const app = await openCase("default");

  await app.keyboard.press("tab");

  expect(lastSegmentProps(app, "month").isFocused).toBe(true);
  expect(lastSegmentProps(app, "day").isFocused).toBe(false);
  expect(rootRecord(app).isFocusWithin).toBe(true);

  await app.keyboard.press("tab");

  expect(lastSegmentProps(app, "month").isFocused).toBe(false);
  expect(lastSegmentProps(app, "day").isFocused).toBe(true);
});

// X-002
// R/tmp/vendor/react-spectrum/packages/react-aria/src/datepicker/useDateSegment.ts:77-103
// (React Aria hands `useSpinButton` the page and limit callbacks) and
// `packages/react-aria/src/spinbutton/useSpinButton.ts:78-128` (PageUp /
// PageDown / Home / End map to them). React Stately's page step for a month is
// 2 (PAGE_STEP in `@react-stately/datepicker/src/useDateFieldState.ts`), and
// limit keys go to the segment's min / max.
test("X-002 should bind PageUp, PageDown, Home and End on the focused segment", async () => {
  const app = await openCase("default");

  await app.press("label:date >> text:mm");

  await app.keyboard.press("home");

  expect(lastSegment(app, "month").isPlaceholder).toBe(false);
  expect(Number(lastSegment(app, "month").text)).toBe(1);

  await app.keyboard.press("pageup");

  expect(Number(lastSegment(app, "month").text)).toBe(3);

  await app.keyboard.press("end");

  expect(Number(lastSegment(app, "month").text)).toBe(12);

  await app.keyboard.press("pagedown");

  expect(Number(lastSegment(app, "month").text)).toBe(10);

  await app.keyboard.press("pageup");

  expect(Number(lastSegment(app, "month").text)).toBe(12);
});

// X-003
// R/tmp/vendor/react-spectrum/packages/react-aria/src/datepicker/useDateSegment.ts:110-127
// Backspace deletes one digit, not the whole segment, and an already empty
// segment sends the focus to the previous one.
test("X-003 should delete one digit and move to the previous segment when empty", async () => {
  const app = await openCase("default");

  await app.press("label:date >> text:dd");

  expect(lastSegmentProps(app, "day").isFocused).toBe(true);

  await app.keyboard.press("backspace");

  expect(lastSegmentProps(app, "day").isFocused).toBe(false);
  expect(lastSegmentProps(app, "month").isFocused).toBe(true);

  await app.press("label:date >> text:yyyy");

  for (const key of ["2", "0", "2", "6"]) await app.keyboard.press(key);

  expect(lastSegment(app, "year").text).toBe("2026");

  await app.keyboard.press("backspace");

  expect(lastSegment(app, "year").isPlaceholder).toBe(false);
  expect(Number(lastSegment(app, "year").text)).toBe(202);
  expect(lastSegmentProps(app, "year").isFocused).toBe(true);
});

// X-004
// R/tmp/vendor/react-spectrum/packages/react-aria/src/interactions/useFocusVisible.ts:86-92
// (a keydown sets the keyboard modality; `:188-192` says a programmatic
// `focus()` must not change it) and `_common.md:42` (`isKeyboardPress`), whose
// Return / Space press is the keyboard, not the pointer. The ring has to
// follow the interaction, never the focus event.
test("X-004 should set the ring from the interaction, not from the focus event", async () => {
  const app = await openCase("default");

  await app.keyboard.press("tab");

  expect(lastSegmentProps(app, "month").isFocused).toBe(true);
  expect(rootRecord(app).isFocusVisible).toBe(true);

  // A pointer press on the Input moves the focus to a segment with a
  // programmatic `focus()`; that is still the pointer modality.
  await app.press("label:date >> role:group");

  expect(rootRecord(app).isFocusWithin).toBe(true);
  expect(rootRecord(app).isFocusVisible).toBe(false);

  // Click-then-type: the key command is the keyboard interaction.
  await app.press("label:date >> text:dd");
  await app.keyboard.press("1");

  expect(Number(lastSegment(app, "day").text)).toBe(1);
  expect(rootRecord(app).isFocusVisible).toBe(true);

  // Return on a focused segment arrives as a press with no page position, so
  // it is the keyboard too.
  await app.press("label:date >> text:mm");
  await app.keyboard.press("enter");

  expect(rootRecord(app).isFocusVisible).toBe(true);
});
