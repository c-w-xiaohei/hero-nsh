import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { changeCount, lastChange, lastSegmentProps } from "../../testers/date-field";

/*
 * DateField cases that need a segment to take the keyboard focus (port sheet
 * 4b, rows T-005, T-006, T-012). NSH 0.4.0's Win32 host gives keyboard focus
 * only to an Input — Tab walks text fields, a click focuses only an Input,
 * `ref.focus()` on a view is a no-op and Return / Space do not activate a
 * focused view (`crates/nsh-platform-windows/src/input.rs:997-1053`,
 * `mount.rs:440`; `crates/nsh-core/src/props.rs:365`). A date segment is a
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
 * probe (a `DateValue` does not survive the round trip, so it is recorded as
 * `toString()`).
 */

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}): Promise<App> {
  return open("../../../date-field.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/date-field/date-field.test.tsx:76
// T-005: a press on the day segment focuses it, ArrowUp commits the next day and
// ArrowDown goes back. Upstream's `onChange` spy is the fixture's probe.
test("T-005 should call onChange when a segment is incremented or decremented", async () => {
  const app = await openCase("default");

  await app.press("id:df-day");
  await app.keyboard.press("arrowup");

  expect(changeCount(app)).toBe(1);
  expect(lastChange(app).text).toBe("2026-08-16");

  await app.keyboard.press("arrowdown");

  expect(lastChange(app).text).toBe("2026-08-15");
});

// heroui/packages/react/tests/components/date-field/date-field.test.tsx:96
// T-006: typing walks the segments — two digits fill the month and move on, two
// fill the day, four fill the year — so the empty field becomes 2026-01-02.
test("T-006 should support typing digits into segments to build a full date", async () => {
  const app = await openCase("empty");

  await app.press("id:df-month");

  for (const key of ["0", "1", "0", "2", "2", "0", "2", "6"]) {
    await app.keyboard.press(key);
  }

  expect(changeCount(app)).toBeGreaterThan(0);
  expect(lastChange(app).text).toBe("2026-01-02");
});

// heroui/packages/react/tests/components/date-field/date-field.test.tsx:209
// T-012: the first Tab lands on the month segment and the keyboard focus makes
// its focus ring visible. `toHaveFocus` becomes the recorded `isFocused` of the
// month segment; `[data-focus-visible="true"]` becomes the same segment's
// `isFocusVisible`, which is the render prop the ring class is built from.
test("T-012 should support focus-visible via keyboard", async () => {
  const app = await openCase("focus");

  await app.keyboard.press("tab");

  expect(lastSegmentProps(app, "month").isFocused).toBe(true);
  expect(lastSegmentProps(app, "month").isFocusVisible).toBe(true);
});
