import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";
import {
  dayCellSelector,
  dayLayouts,
  headerLayouts,
  lastLayout,
  LAYOUT_TOLERANCE,
  rightOf,
  yearLayout,
} from "../../testers/calendar";

/*
 * Web-only: the G-xxx geometry cases read every part's box through `onLayout`
 * probes (port sheet 4c). Bounds are relative to each part's parent, and the
 * assertions are structural — a column is a seventh of the grid, a row stack
 * sits where the CSS rules put it, the panel covers the date grid — never
 * hard-coded pixels.
 *
 * G-001 month view; G-002 day view; G-003 the open year panel.
 */

const TOLERANCE = LAYOUT_TOLERANCE;
const FIRST_ROW_MARGIN = 4;

function openGeometry(scenario: string): Promise<App> {
  return openScenario(scenario, { platform: "web", locale: "en-US" });
}

// port sheet 4c, G-001: root 252×248, header above grid, seven equal columns,
// first row 4pt taller than the rest.
test("G-001 lays the month grid out as seven equal columns under the header", async () => {
  const app = await openGeometry("calendar/geometry");

  await app.waitFor("role:grid[/Event date/]", { timeout: 15_000 });

  const grid = lastLayout(app, "grid");
  const headerRow = lastLayout(app, "grid-header");
  const body = lastLayout(app, "grid-body");
  const headers = headerLayouts(app);
  const days = dayLayouts(app);
  const columnWidth = grid.width / 7;

  expect(headers.every((cell) => Math.abs(cell.width - columnWidth) <= TOLERANCE)).toBe(true);
  expect(
    Math.abs(body.y - (headerRow.y + headerRow.height + FIRST_ROW_MARGIN)) <= TOLERANCE,
  ).toBe(true);
  expect(
    days
      .slice(0, 7)
      .every(
        (cell, index) =>
          Math.abs(cell.x - headers[index]!.x) <= TOLERANCE &&
          Math.abs(rightOf(cell) - rightOf(headers[index]!)) <= TOLERANCE,
      ),
  ).toBe(true);
  expect(days.every((cell) => Math.abs(cell.width - cell.height) <= TOLERANCE)).toBe(true);
  expect(Math.abs(grid.height - (body.y + body.height)) <= TOLERANCE).toBe(true);
});

// port sheet 4c, G-002: day view puts the weekday header and the body in two
// seven-column rows, the body 4pt below the header, columns aligned.
test("G-002 stacks the day-view header and body four points apart", async () => {
  const app = await openGeometry("calendar/geometry-day");

  await app.waitFor("role:grid[/Event date/]", { timeout: 15_000 });

  const headerRow = lastLayout(app, "grid-header");
  const body = lastLayout(app, "grid-body");
  const headers = headerLayouts(app);
  const days = dayLayouts(app).slice(0, 7);

  expect(headers).toHaveLength(7);
  expect(days).toHaveLength(7);
  expect(Math.abs(body.y - (headerRow.y + headerRow.height + FIRST_ROW_MARGIN))).toBeLessThanOrEqual(
    TOLERANCE,
  );
  expect(
    days.every(
      (cell, index) =>
        Math.abs(cell.width - headers[index]!.width) <= TOLERANCE &&
        Math.abs(cell.x - headers[index]!.x) <= TOLERANCE,
    ),
  ).toBe(true);
  expect(days.every((cell) => Math.abs(cell.width - cell.height) <= TOLERANCE)).toBe(true);
});

// port sheet 4c, G-003: the open year panel overlays the date grid exactly and
// its three columns are sized by the panel, not by the year text.
test("G-003 overlays the year panel on the date grid with three equal columns", async () => {
  const app = await openGeometry("calendar/geometry-year-picker");

  await app.waitFor("role:grid[/Event date/]", { timeout: 15_000 });

  await app.press("role:button[/year selector/i]");
  await app.waitFor("text:2020");
  await app.wait(50);

  const dayGrid = lastLayout(app, "grid");
  const yearGrid = lastLayout(app, "year-grid");
  const years = [2020, 2021, 2022, 2023].map((year) => yearLayout(app, year));
  const gap = 4;
  const padding = 4;

  expect(
    Math.abs(yearGrid.x - dayGrid.x) <= TOLERANCE &&
      Math.abs(yearGrid.y - dayGrid.y) <= TOLERANCE &&
      Math.abs(yearGrid.width - dayGrid.width) <= TOLERANCE &&
      Math.abs(yearGrid.height - dayGrid.height) <= TOLERANCE,
  ).toBe(true);
  expect(
    years[1]!.y === years[0]!.y &&
      years[2]!.y === years[0]!.y &&
      years[1]!.x > years[0]!.x &&
      years[2]!.x > years[1]!.x,
  ).toBe(true);
  expect(years[3]!.y).toBeGreaterThan(years[0]!.y);
  expect(
    Math.abs(3 * years[0]!.width + 2 * gap + 2 * padding - yearGrid.width) <= TOLERANCE,
  ).toBe(true);
  expect(app.shows(dayCellSelector("2026-08-15"))).toBe(false);
});
