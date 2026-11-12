import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import {
  isoOf,
  LAYOUT_TOLERANCE,
  lastRange,
  layoutOf,
  rangeCount,
  rightOf,
} from "../../testers/date-range-picker";

/*
 * DateRangePicker regression cases from HeroUI 3.2.7 (port sheet 4b, rows
 * T-001, T-002, T-003, T-005). Row T-004 is recorded as 转截图 in the port sheet
 * (it reads `getAnimations()` and the animation property list, which `nsh/test`
 * cannot see), and the case that needs a view to take the keyboard focus back
 * lives in date-range-picker.web.test.tsx (T-006); T-007 reads layout and lives
 * with it on the web target.
 *
 * Every case here opens the NSH-only fixture at
 * harness/date-range-picker.fixtures.tsx (port sheet 4b.3): each one reads a
 * callback back or targets a part by `testID`. The shared scenarios cover the
 * stories and are asserted by the geometry cases instead.
 *
 * The popover content stays mounted through its 100 ms exit hold (R-027), so the
 * cases that assert presence run on a manual clock (`clock: {}`): an immediate
 * check after Escape would otherwise pass even when the close took the wrong
 * path.
 */

const TRIGGER = "role:button[Open calendar]";
/* The grid's accessible name is the range calendar's `aria-label` plus the
 * visible month ("Selected range, August 2026"), so this selector also proves
 * which month the popover shows. */
const GRID = "role:grid[/August 2026/]";
/* The `defaultValue` 2026-08-01 … 2026-08-05 leaves one month on screen, so
 * "10 … August" and "12 … August" name exactly one cell each. */
const START_DAY = "role:button[/August 10, 2026/]";
const END_DAY = "role:button[/August 12, 2026/]";
const PREVIOUS = "role:button[/^Previous$/]";
const POPOVER = "id:drp-popover";

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}, manualClock = false): Promise<App> {
  return open("../../../date-range-picker.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...(manualClock ? { clock: {} } : {}),
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/date-range-picker/date-range-picker.test.tsx:83
// Partial port of T-001 (port sheet 4b): the root's `data-slot` and BEM class
// assertions are dropped (D18: no slots, no BEM classes), and so are the two
// `[data-slot=…]` DOM queries for the trigger and the separator. Three visible
// facts replace them: the trigger really mounts as a pressable button view, and
// the separator — this unit's own part — renders its default " - " as a real box
// with a field on either side of it.
//
// A field's own box cannot be probed (`DateField.Input` takes no `onLayout`), so
// the two field widths are read off its siblings: the row starts at the group's
// left edge, the start field runs up to the separator, the end field from the
// separator to the suffix. Both facts can fail — a separator rendered first has
// no field before it, one rendered last leaves no room for the end field.
test("T-001 should render the trigger and place the range separator between the inputs", async () => {
  const app = await openCase("default");

  expect(app.shows(TRIGGER)).toBe(true);

  const separator = layoutOf(app, "separator");
  const suffix = layoutOf(app, "suffix");

  /* R-012's `px-1` around the default text: a mounted part, not a zero box. */
  expect(separator.width).toBeGreaterThan(0);
  expect(app.texts()).toContain(" - ");
  /* The start field occupies the row up to the separator… */
  expect(separator.x).toBeGreaterThan(LAYOUT_TOLERANCE);
  /* …and the end field the space up to the suffix in it. */
  expect(suffix.x - rightOf(separator)).toBeGreaterThan(LAYOUT_TOLERANCE);
});

// heroui/packages/react/tests/components/date-range-picker/date-range-picker.test.tsx:96
// Partial port of T-002 (port sheet 4b): the `[data-slot="date-range-picker-popover"]`
// query is dropped (D18) and the `getByRole("dialog")` one too (NSH has no
// dialog role, port sheet §8 item 1). The same fact — the popover really holds
// the range calendar — is carried by the calendar's own parts: its grid and its
// Previous nav button appear on open and are gone after Escape. Upstream's
// closing half is kept, with the 100 ms exit hold (R-027) waited out first.
test("T-002 should open the range calendar popover and close it on Escape", async () => {
  const app = await openCase("default", {}, true);

  expect(app.shows(GRID)).toBe(false);

  await app.press(TRIGGER);

  expect(app.shows(GRID)).toBe(true);
  expect(app.shows(PREVIOUS)).toBe(true);

  await app.keyboard.press("escape");
  await app.clock!.runFor(120);

  expect(app.shows(GRID)).toBe(false);
  expect(app.shows(PREVIOUS)).toBe(false);
});

// heroui/packages/react/tests/components/date-range-picker/date-range-picker.test.tsx:112
// T-003: selecting two days in the range calendar reaches the picker's
// `onChange`. The range calendar shares the picker's value and its setter (port
// sheet §5, contract one) and the anchor state (contract two), so this case is
// also the behavioural evidence that the first press does not close the
// popover: the second press has to land on the still-open calendar, and if the
// close came with the anchor the press would find no target and fail right
// there.
//
// The fixture records the payload as `{start, end}` of `{year, month, day}`
// because a `DateValue` does not survive the probe's JSON round trip. The
// `wait` after each press is the frame a real host needs before the next
// selector sees the new cells (_common.md "Real hosts").
test("T-003 should call onChange when a date range is selected", async () => {
  const app = await openCase("default");

  await app.press(TRIGGER);
  await app.waitFor(START_DAY);

  await app.press(START_DAY);
  await app.wait(20);

  await app.press(END_DAY);
  await app.wait(20);

  expect(rangeCount(app)).toBeGreaterThan(0);

  const value = lastRange(app);

  expect(isoOf(value!.start)).toBe("2026-08-10");
  expect(isoOf(value!.end)).toBe("2026-08-12");
});

// heroui/packages/react/tests/components/date-range-picker/date-range-picker.browser.test.tsx:72
// Partial port of T-005 (port sheet 4b): `data-exiting`, the animation name,
// `animation-fill-mode` and the animated property list have no `nsh/test`
// query, and NSH has no keyframes — the exit is a 100 ms transition (R-027 /
// R-028), so the two animation frames are left to the screenshot stage. What is
// left is the conditional rendering the exit needs: the popover is still
// mounted right after Escape and only unmounts once the hold is over. Both
// halves can fail — an eager unmount breaks the first, a close that never
// happens breaks the second.
test("T-005 should stay mounted through its exit hold", async () => {
  const app = await openCase("default", {}, true);

  await app.press(TRIGGER);

  expect(app.count(POPOVER)).toBe(1);

  await app.keyboard.press("escape");

  expect(app.count(POPOVER)).toBe(1);

  await app.clock!.runFor(120);

  expect(app.count(POPOVER)).toBe(0);
});
