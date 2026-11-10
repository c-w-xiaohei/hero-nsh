import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { changeCount, lastChange, lastSegmentProps } from "../../testers/time-field";

/*
 * TimeField cases that need a segment to take the keyboard focus (port sheet
 * 4b, rows T-004, T-005, T-011). NSH 0.4.0's Win32 host gives keyboard focus
 * only to an Input — Tab walks text fields, a click focuses only an Input,
 * `ref.focus()` on a view is a no-op and Return / Space do not activate a
 * focused view (`crates/nsh-platform-windows/src/input.rs:997-1053`,
 * `mount.rs:440`; `crates/nsh-core/src/props.rs:365`). A time segment is a
 * `focusable` View, so pointer focus on a segment and Tab between segments
 * only work on the web and on macOS. Approved difference "Windows keyboard
 * focus and activation (NSH 0.4.0 host gap)", port sheet section 8 and the
 * common rules (`_common.md:52`). Nothing here is hidden on a target where it
 * could work.
 *
 * `toHaveFocus` cannot be queried by `nsh/test`, so the fixture's Segment
 * className render prop records `isFocused` / `isFocusVisible` into Storage
 * (port sheet 4b.3 `focus`); those are the same two facts upstream reads from
 * the DOM. The value comparisons read the `onChange` payload through the same
 * probe.
 */

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}): Promise<App> {
  return open("../../../time-field.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:61
// T-004: a press on the minute segment focuses it, ArrowUp commits 9:31 and
// ArrowDown goes back to 9:30. Upstream's `onChange` spy is the fixture's
// probe, and the payload is the `Time` the field reports.
test("T-004 should support incrementing and decrementing the minute segment", async () => {
  const app = await openCase("default");

  await app.press("id:tf-minute");
  await app.keyboard.press("arrowup");

  expect(changeCount(app)).toBe(1);

  const incremented = lastChange(app);

  expect(incremented.hour).toBe(9);
  expect(incremented.minute).toBe(31);

  await app.keyboard.press("arrowdown");

  expect(lastChange(app).minute).toBe(30);
});

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:82
// T-005: ArrowUp on the day period flips 9 AM to 21:00 and the segment reads
// PM. Upstream reads the payload and the segment's text, both kept.
test("T-005 should toggle AM/PM on the day period segment", async () => {
  const app = await openCase("default");

  await app.press("id:tf-day-period");
  await app.keyboard.press("arrowup");

  expect(changeCount(app)).toBe(1);
  expect(lastChange(app).hour).toBe(21);
  expect(app.shows("id:tf-day-period >> text:PM")).toBe(true);
});

// heroui/packages/react/tests/components/time-field/time-field.test.tsx:193
// T-011: the first Tab lands on the hour segment and the keyboard focus makes
// its focus ring visible. `toHaveFocus` becomes the recorded `isFocused` of the
// hour segment; `[data-focus-visible="true"]` becomes the same segment's
// `isFocusVisible`, which is the render prop that class is built from (R-005).
test("T-011 should support focus-visible via keyboard", async () => {
  const app = await openCase("focus");

  await app.keyboard.press("tab");

  expect(lastSegmentProps(app, "hour").isFocused).toBe(true);
  expect(lastSegmentProps(app, "hour").isFocusVisible).toBe(true);
});
