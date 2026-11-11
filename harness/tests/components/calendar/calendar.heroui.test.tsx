import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import {
  dayCellSelector,
  dayLayouts,
  openYearPicker,
  pressDay,
  selectYear,
} from "../../testers/calendar";

/*
 * Calendar regression cases from HeroUI 3.2.7 (port sheet 4b, rows T-001 …
 * T-012, T-014 deleted by the sheet). Every case keeps its upstream file:line
 * above it and its title starts with the port-sheet id. T-006 and T-013 need
 * keyboard focus and T-015 … T-018 read layout on `--target web`, so they live
 * in calendar.heroui.web.test.tsx; G-001 … G-003 live in
 * calendar.layout.web.test.tsx.
 *
 * NSH has no aria/data attribute or BEM class channel (D18, port sheet §8), so
 * a row written against them asserts the visible effect instead: the grid's
 * accessible name, seven header cells, day cells, the heading text, resolved
 * text colors. The partial ports say which upstream assertions stay unread.
 */

const EVENT_DATE = "Event date";

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:53
test("T-001 should render a grid with an accessible name", async () => {
  const app = await openScenario("calendar/default", { locale: "en-US" });

  expect(app.shows(`role:grid[/${EVENT_DATE}/]`)).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:59
// Partial port: the six `[data-slot=…]` / BEM assertions are dropped (D18).
// The visible structure they carried is kept: the header's two nav buttons, the
// seven weekday labels, day cells, and the month heading.
test("T-002 should expose the header, seven weekday labels, day cells and heading", async () => {
  const app = await openScenario("calendar/default", { locale: "en-US" });

  expect(
    app.shows("role:button[/^Previous$/]") && app.shows("role:button[/^Next$/]"),
  ).toBe(true);
  expect(app.count("role:columnheader")).toBe(7);
  expect(app.count("role:cell")).toBeGreaterThan(0);
  expect(app.shows("text:August 2026")).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:73
// Partial port: `aria-selected` and `data-selected` have no attribute channel
// (D18); the remaining fact is the selected day's resolved text color.
test("T-003 should paint the selected day differently from its neighbor", async () => {
  const app = await openScenario("calendar/default", { locale: "en-US" });

  const selected = app.spanStyle("role:button[/August 15, 2026/] >> text:15");
  const neighbor = app.spanStyle("role:button[/August 16, 2026/] >> text:16");

  expect(selected.color).not.toBe(neighbor.color);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:82
test("T-004 should call onChange when selecting a new day", async () => {
  const app = await openScenario("calendar/change", { locale: "en-US" });

  await pressDay(app, "2026-08-20");

  expect(callsOf(app, "onChange")).toHaveLength(1);
  expect(callsOf(app, "onChange")[0]?.[0]).toBe("2026-08-20");
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:95
// Rewritten port: NSH has no rerender, so two mounts cover the two controlled
// values. A root that ignored `value` leaves both calendars with no selected
// day, so the color comparison fails in both.
test("T-005 should support controlled value", async () => {
  const first = await openScenario("calendar/controlled-first", { locale: "en-US" });

  expect(
    first.spanStyle("role:button[/August 15, 2026/] >> text:15").color,
  ).not.toBe(first.spanStyle("role:button[/August 16, 2026/] >> text:16").color);

  const second = await openScenario("calendar/controlled-second", { locale: "en-US" });

  expect(
    second.spanStyle("role:button[/August 20, 2026/] >> text:20").color,
  ).not.toBe(second.spanStyle("role:button[/August 19, 2026/] >> text:19").color);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:162
// Rewritten port: `data-disabled` has no channel (D18). The disabled root makes
// the cell report disabled, and a press on it is refused before onChange runs.
test("T-007 should block day selection when disabled", async () => {
  const app = await openScenario("calendar/disabled", { locale: "en-US" });
  const day = dayCellSelector("2026-08-20");

  expect(app.enabled(day)).toBe(false);
  await expect(app.press(day)).rejects.toMatchObject({ code: "ERR_NSH_TEST_DISABLED" });
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:178
// Partial port: the `calendar--day-view` BEM class assertion is dropped (D18);
// the day-view effect is proven by the seven-column week and its three dates.
test("T-008 should render a weekday header and day cells in day view", async () => {
  const app = await openScenario("calendar/day-view", { locale: "en-US" });

  expect(app.count("role:columnheader")).toBe(7);
  expect(dayLayouts(app).slice(0, 7).map((cell) => cell.name)).toEqual([
    "day-2026-08-09",
    "day-2026-08-10",
    "day-2026-08-11",
    "day-2026-08-12",
    "day-2026-08-13",
    "day-2026-08-14",
    "day-2026-08-15",
  ]);
  expect(app.shows(dayCellSelector("2026-08-12"))).toBe(true);
  expect(app.shows(dayCellSelector("2026-08-15"))).toBe(true);
  expect(app.shows(dayCellSelector("2026-08-18"))).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:195
test("T-009 should navigate with the next and previous month buttons", async () => {
  const app = await openScenario("calendar/default", { locale: "en-US" });

  expect(app.shows("role:grid[/August 2026/]")).toBe(true);

  await app.press("role:button[/^Next$/]");
  expect(app.shows("role:grid[/September 2026/]")).toBe(true);

  await app.press("role:button[/^Previous$/]");
  expect(app.shows("role:grid[/August 2026/]")).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:216
// Rewritten port: `aria-expanded` / `aria-hidden` have no channel (D18). The
// year panel is hidden (`invisible`, so `shows` is false) and becomes visible.
test("T-010 should open the year picker from the trigger", async () => {
  const app = await openScenario("calendar/default", { locale: "en-US" });

  expect(app.shows("role:button[/year selector/i]")).toBe(true);
  expect(app.shows("text:2020")).toBe(false);

  await openYearPicker(app);

  expect(app.shows("text:2020")).toBe(true);
  expect(app.shows("text:2030")).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:236
// Rewritten port: the two aria attributes are dropped (D18); the visible facts
// are the new visible range, the hidden panel and the trigger that remains.
test("T-011 should select a year and close the picker", async () => {
  const app = await openScenario("calendar/default", { locale: "en-US" });

  await openYearPicker(app);
  await selectYear(app, 2028);

  expect(app.shows("role:grid[/2028/]")).toBe(true);
  expect(app.shows("text:2020")).toBe(false);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:253
// Rewritten port: `data-selected` has no channel (D18); the focused year's
// resolved text color differs from another year's.
test("T-012 should paint the focused year as selected", async () => {
  const app = await openScenario("calendar/default", { locale: "en-US" });

  await openYearPicker(app);

  expect(app.spanStyle("role:button[/^2026$/] >> text:2026").color).not.toBe(
    app.spanStyle("role:button[/^2024$/] >> text:2024").color,
  );
});
