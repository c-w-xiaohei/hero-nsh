import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { changeCount, changeRecords } from "../../testers/date-picker";

/*
 * DatePicker regression cases from HeroUI 3.2.7 (port sheet 4b, rows T-001,
 * T-002, T-003, T-005). Row T-004 is recorded as 转截图 in the port sheet (it
 * reads `getAnimations()` and the animation property list, which `nsh/test`
 * cannot see), and the two cases that need a view to take the keyboard focus
 * live in date-picker.web.test.tsx (T-006, T-007).
 *
 * Every case here opens the NSH-only fixture at harness/date-picker.fixtures.tsx
 * (port sheet 4b.3): each one reads a callback back or targets a part by
 * `testID`. The shared scenarios cover the stories and are asserted by the
 * geometry cases instead.
 *
 * The popover content stays mounted through its 100 ms exit hold (R-026), so the
 * cases that assert presence run on a manual clock (`clock: {}`): an immediate
 * check after Escape would otherwise pass even when the close took the wrong
 * path.
 */

const TRIGGER = "role:button[Open calendar]";
/* The grid's accessible name is the calendar's `aria-label` plus the visible
 * month ("Selected date, August 2026"), so this selector also proves which
 * month the popover shows. */
const GRID = "role:grid[/August 2026/]";
/* The day `defaultValue` 2026-08-15 leaves one month on screen, so "15 … August"
 * names exactly one cell. */
const DAY = "role:button[/August 15, 2026/]";
const PREVIOUS = "role:button[/^Previous$/]";

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}, manualClock = false): Promise<App> {
  return open("../../../date-picker.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...(manualClock ? { clock: {} } : {}),
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/date-picker/date-picker.test.tsx:71
// Partial port of T-001 (port sheet 4b): the root's `data-slot="date-picker"`
// assertion and the `date-picker` BEM class assertion are dropped (D18: no
// slots, no BEM classes). The third upstream assertion is kept as it stands:
// the trigger really mounts as a pressable button view.
test("T-001 should render the trigger as a button", async () => {
  const app = await openCase("default");

  expect(app.shows(TRIGGER)).toBe(true);
});

// heroui/packages/react/tests/components/date-picker/date-picker.test.tsx:81
// Partial port of T-002 (port sheet 4b): the `[data-slot="date-picker-popover"]`
// query is dropped (D18) and the `getByRole("dialog")` one too (NSH has no
// dialog role, port sheet §8 item 1). The same fact — the popover really holds
// the calendar — is carried by the calendar's own parts: its grid and its
// Previous nav button appear on open and are gone after Escape. Two dropped
// assertions, two kept by content, plus the closing half upstream has.
test("T-002 should open the calendar popover and close it on Escape", async () => {
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

// heroui/packages/react/tests/components/date-picker/date-picker.test.tsx:97
// T-003: selecting a day in the calendar reaches the picker's `onChange` — the
// calendar shares the picker's value and its setter (port sheet §5, contract
// one), so a picker that handed the popover a calendar with its own state fails
// here. The fixture records the payload as `{year, month, day}` because a
// `DateValue` does not survive the probe's JSON round trip.
//
// Both flushes upstream takes with `runAllTimers()` (:104-106) are here as well:
// the day the press just mounted is not in the host's snapshot yet, so pressing
// its selector straight away is lost, and the payload reaches Storage a frame
// after the press (_common.md "Real hosts": move the clock or wait before
// counting). `select.heroui.test.tsx:216` waits for its listbox the same way.
test("T-003 should call onChange when a calendar date is selected", async () => {
  const app = await openCase("default");

  await app.press(TRIGGER);
  await app.waitFor(DAY);
  await app.press(DAY);
  await app.wait(20);

  expect(changeCount(app)).toBe(1);

  const [value] = changeRecords(app);

  expect(value!.year).toBe(2026);
  expect(value!.month).toBe(8);
  expect(value!.day).toBe(15);
});

// heroui/packages/react/tests/components/date-picker/date-picker.browser.test.tsx:64
// Partial port of T-005 (port sheet 4b): `data-exiting`, the animation name and
// `animation-fill-mode` have no `nsh/test` query, and NSH has no keyframes — the
// exit is a 100 ms transition (R-026 / R-027), so the two animation frames are
// left to the screenshot stage. What is left is the conditional rendering the
// exit needs: the popover is still mounted right after Escape and only unmounts
// once the hold is over. Both halves can fail — an eager unmount breaks the
// first, a close that never happens breaks the second.
test("T-005 should stay mounted through its exit hold", async () => {
  const app = await openCase("default", {}, true);

  await app.press(TRIGGER);

  expect(app.count("id:dp-popover")).toBe(1);

  await app.keyboard.press("escape");

  expect(app.count("id:dp-popover")).toBe(1);

  await app.clock!.runFor(120);

  expect(app.count("id:dp-popover")).toBe(0);
});
