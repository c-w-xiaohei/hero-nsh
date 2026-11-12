import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";
import {
  dayNumberStyle,
  lastRangeValue,
  openYearPicker,
  pressDay,
  rangeValues,
  selectYear,
} from "../../testers/range-calendar";

/*
 * RangeCalendar regression cases from HeroUI 3.2.7 (port sheet 4b, rows T-001 …
 * T-009; T-011 is deleted by the sheet). Every case keeps its upstream
 * file:line above it and its title starts with the port-sheet id. T-010 needs
 * keyboard focus and T-012/T-013 read layout, so they live in
 * range-calendar.heroui.web.test.tsx; G-001 … G-003 live in
 * range-calendar.layout.web.test.tsx.
 *
 * NSH has no aria/data attribute or BEM class channel (D18, port sheet §8), so
 * a row written against them asserts the visible effect instead: the grid's
 * accessible name, the header cells, the day cells, the year panel's contents,
 * the resolved text colors of the range's endpoints. The partial ports say
 * which upstream assertions stay unread.
 */

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:65
// Partial port: `aria-multiselectable` has no field in AccessibilityState (§8),
// so it is dropped and replaced by the visible fact a single-selection calendar
// could not produce: after two presses, two days apart carry the end color
// while the day between them does not.
test("T-001 should render a multi-selectable grid with an accessible name", async () => {
  const app = await openScenario("range-calendar/default", { locale: "en-US" });

  expect(app.shows("role:grid[/Trip dates/]")).toBe(true);

  await pressDay(app, "2026-08-10");
  await pressDay(app, "2026-08-15");

  const middle = dayNumberStyle(app, "2026-08-12").color;

  expect(dayNumberStyle(app, "2026-08-10").color).not.toBe(middle);
  expect(dayNumberStyle(app, "2026-08-15").color).not.toBe(middle);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:74
// Rewritten port: the seven `[data-slot=…]` / BEM assertions are dropped (D18);
// the visible structure they carried is asserted instead.
test("T-002 should expose the header, seven weekday labels, day cells and heading", async () => {
  const app = await openScenario("range-calendar/default", { locale: "en-US" });

  expect(app.shows("text:August 2026")).toBe(true);
  expect(app.count("role:columnheader")).toBe(7);
  expect(app.count("role:cell")).toBe(42);
  expect(app.shows("role:grid[/Trip dates/]")).toBe(true);
  expect(app.shows("role:button[/^Previous$/]")).toBe(true);
  expect(app.shows("role:button[/^Next$/]")).toBe(true);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:93
// Rewritten port: `data-selection-start` / `data-selection-end` have no
// attribute channel (D18). Both endpoints take the solid accent's text color,
// the days between them the range track's (`text-foreground`).
test("T-003 should paint the range start and end differently from its middle", async () => {
  const app = await openScenario("range-calendar/default", { locale: "en-US" });

  const middle = dayNumberStyle(app, "2026-08-03").color;

  expect(dayNumberStyle(app, "2026-08-01").color).not.toBe(middle);
  expect(dayNumberStyle(app, "2026-08-05").color).not.toBe(middle);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:103
test("T-004 should call onChange when selecting a date range", async () => {
  const app = await openScenario("range-calendar/default-change", { locale: "en-US" });

  await pressDay(app, "2026-08-10");
  await pressDay(app, "2026-08-15");

  const value = lastRangeValue(app);

  expect(rangeValues(app).length).toBeGreaterThan(0);
  expect(value?.start).toBe("2026-08-10");
  expect(value?.end).toBe("2026-08-15");
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:118
// Rewritten port: NSH has no rerender, so two mounts cover the two controlled
// values. A root that ignored `value` leaves both calendars with no selected
// range, so neither endpoint differs from its neighbor in either mount.
test("T-005 should support a controlled range value", async () => {
  const first = await openScenario("range-calendar/controlled-first", { locale: "en-US" });

  expect(dayNumberStyle(first, "2026-08-01").color).not.toBe(
    dayNumberStyle(first, "2026-08-02").color,
  );
  expect(dayNumberStyle(first, "2026-08-05").color).not.toBe(
    dayNumberStyle(first, "2026-08-06").color,
  );

  const second = await openScenario("range-calendar/controlled-second", { locale: "en-US" });

  expect(dayNumberStyle(second, "2026-08-10").color).not.toBe(
    dayNumberStyle(second, "2026-08-09").color,
  );
  expect(dayNumberStyle(second, "2026-08-15").color).not.toBe(
    dayNumberStyle(second, "2026-08-16").color,
  );
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:176
// Rewritten port: the root's `data-disabled` has no channel (D18). A disabled
// root makes every day cell refuse input, so the press is rejected before
// `onChange` runs.
test("T-006 should block range selection when disabled", async () => {
  const app = await openScenario("range-calendar/default-disabled", { locale: "en-US" });

  expect(app.enabled("role:button[/August 10, 2026/]")).toBe(false);
  await expect(app.press("role:button[/August 10, 2026/]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(rangeValues(app)).toHaveLength(0);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:193
test("T-007 should navigate months with the next and previous buttons", async () => {
  const app = await openScenario("range-calendar/default", { locale: "en-US" });

  expect(app.shows("role:grid[/August 2026/]")).toBe(true);

  await app.press("role:button[/^Next$/]");
  expect(app.shows("role:grid[/September 2026/]")).toBe(true);

  await app.press("role:button[/^Previous$/]");
  expect(app.shows("role:grid[/August 2026/]")).toBe(true);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:214
// Rewritten port: `aria-expanded` / `aria-hidden` have no channel (D18). The
// year panel is hidden (`invisible`, so `shows` is false) and becomes visible.
test("T-008 should open the year picker from the trigger", async () => {
  const app = await openScenario("range-calendar/default", { locale: "en-US" });

  expect(app.shows("role:button[/year selector/i]")).toBe(true);
  expect(app.shows("text:2020")).toBe(false);

  await openYearPicker(app);

  expect(app.shows("text:2020")).toBe(true);
  expect(app.shows("text:2030")).toBe(true);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:234
// Rewritten port: the two aria attributes are dropped (D18); the visible facts
// are the new visible range, the hidden panel and the trigger that remains.
test("T-009 should select a year and close the picker", async () => {
  const app = await openScenario("range-calendar/default", { locale: "en-US" });

  await openYearPicker(app);
  await selectYear(app, 2028);

  expect(app.shows("role:grid[/2028/]")).toBe(true);
  expect(app.shows("text:2020")).toBe(false);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});
