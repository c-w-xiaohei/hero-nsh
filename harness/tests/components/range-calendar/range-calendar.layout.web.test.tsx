import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";
import {
  dayLayouts,
  headerLayouts,
  lastLayout,
  LAYOUT_TOLERANCE,
  rightOf,
  rowBelow,
  rowCells,
} from "../../testers/range-calendar";
import type { PartLayout } from "../../testers/range-calendar";

/*
 * Web-only: the G-xxx geometry cases read every part's box through `onLayout`
 * probes (port sheet 4c). Bounds are relative to each part's parent, and the
 * assertions are structural — a column is a seventh of the grid, the body sits
 * four points under the header row, a row is a cell plus at most the cell's two
 * 2pt margins high, cells touch inside a row — never hard-coded pixels.
 *
 * G-001 month view; G-002 week view (`visibleDuration={{weeks: 2}}`); G-003 day
 * view (`visibleDuration={{days: 7}}`).
 *
 * What these cases cannot see is the range track's rounding (8pt at a row's
 * first and last cell, 24pt at an endpoint) and the accent fill: nsh/test has
 * no computed-style channel for a view's background or radius, so R-034 …
 * R-048 stay a classList review item.
 */

const TOLERANCE = LAYOUT_TOLERANCE;
/* R-022: the body's own `mt-1` is the only vertical gap under the header row. */
const BODY_GAP = 4;
/* R-025: `my-0.5` above and below the cell's track, so a row adds at most 4. */
const CELL_MARGIN = 4;

function openGeometry(scenario: string): Promise<App> {
  return openScenario(`range-calendar/${scenario}`, { platform: "web", locale: "en-US" });
}

/** Every header cell is a seventh of the grid, in one row, left to right. */
function expectSevenColumns(app: App): void {
  const grid = lastLayout(app, "grid");
  const headers = headerLayouts(app);

  expect(headers).toHaveLength(7);
  expect(headers.every((cell) => Math.abs(cell.width - grid.width / 7) <= TOLERANCE)).toBe(true);
  expect(headers.every((cell) => Math.abs(cell.y - headers[0]!.y) <= TOLERANCE)).toBe(true);
  expect(
    headers.every(
      (cell, index) => index === 0 || rightOf(headers[index - 1]!) <= cell.x + TOLERANCE,
    ),
  ).toBe(true);
}

/**
 * The cell part's box is the square the day number sits in, or that square plus
 * its track's 2pt top and bottom margins, depending on which view the part
 * reports: either way one width for the row and at most one margin taller.
 */
function expectCellBox(cells: PartLayout[]): void {
  const width = cells[0]!.width;

  expect(cells.every((cell) => Math.abs(cell.width - width) <= TOLERANCE)).toBe(true);
  expect(
    cells.every(
      (cell) =>
        Math.abs(cell.height - width) <= TOLERANCE ||
        Math.abs(cell.height - width - CELL_MARGIN) <= TOLERANCE,
    ),
  ).toBe(true);
}

/** A row is one cell high, plus the cell's own margins when they report. */
function expectRowPitch(firstRow: PartLayout[], nextRow: PartLayout[]): void {
  const pitch = nextRow[0]!.y - firstRow[0]!.y - firstRow[0]!.height;

  expect(pitch).toBeGreaterThanOrEqual(-TOLERANCE);
  expect(pitch).toBeLessThanOrEqual(CELL_MARGIN + TOLERANCE);
}

/** The first row's cells sit under the header's columns, edge to edge. */
function expectRowUnderHeader(row: PartLayout[], headers: PartLayout[]): void {
  expect(row).toHaveLength(7);
  expect(
    row.every(
      (cell, index) =>
        Math.abs(cell.x - headers[index]!.x) <= TOLERANCE &&
        Math.abs(rightOf(cell) - rightOf(headers[index]!)) <= TOLERANCE,
    ),
  ).toBe(true);
  expect(
    row.every(
      (cell, index) => index === 0 || Math.abs(rightOf(row[index - 1]!) - cell.x) <= TOLERANCE,
    ),
  ).toBe(true);
}

// port sheet 4c, G-001: seven equal columns under the header, the body four
// points below it, and the rows one cell apart. The selected range 2026-08-01 …
// 08-05 crosses rows, so its start sits in the first row and its middle in the
// next one; the track of neighbouring selected cells stays continuous there
// (adjacent cells' boxes touch, no gap).
test("G-001 lays the month grid out as seven equal columns under the header", async () => {
  const app = await openGeometry("geometry");

  await app.waitFor("role:grid[/Trip dates/]", { timeout: 15_000 });

  const headerRow = lastLayout(app, "grid-header");
  const body = lastLayout(app, "grid-body");

  expectSevenColumns(app);
  expect(Math.abs(body.y - (headerRow.y + headerRow.height + BODY_GAP)) <= TOLERANCE).toBe(true);

  const firstRow = rowCells(app, "2026-08-01");

  expectRowUnderHeader(firstRow, headerLayouts(app));
  expectCellBox(firstRow);
  expectRowPitch(firstRow, rowBelow(app, "2026-08-01"));
});

// port sheet 4c, G-002: the week view keeps the month view's geometry — one
// seven-column header and two seven-cell rows, the same cell box and pitch.
test("G-002 keeps the seven-column grid in the two-week view", async () => {
  const app = await openGeometry("geometry-week");

  await app.waitFor("role:grid[/Trip dates/]", { timeout: 15_000 });

  const headerRow = lastLayout(app, "grid-header");
  const body = lastLayout(app, "grid-body");

  expectSevenColumns(app);
  expect(Math.abs(body.y - (headerRow.y + headerRow.height + BODY_GAP)) <= TOLERANCE).toBe(true);
  expect(dayLayouts(app)).toHaveLength(14);

  const firstRow = rowCells(app, "2026-03-05");

  expectRowUnderHeader(firstRow, headerLayouts(app));
  expectCellBox(firstRow);
  expectRowPitch(firstRow, rowBelow(app, "2026-03-05"));
});

// port sheet 4c, G-003: the day view puts one seven-cell row four points under
// the seven-column header, columns aligned, and the first row takes no extra
// offset of its own.
test("G-003 keeps the day view a single seven-column row", async () => {
  const app = await openGeometry("geometry-day");

  await app.waitFor("role:grid[/Trip dates/]", { timeout: 15_000 });

  const headerRow = lastLayout(app, "grid-header");
  const body = lastLayout(app, "grid-body");

  expectSevenColumns(app);
  expect(Math.abs(body.y - (headerRow.y + headerRow.height + BODY_GAP)) <= TOLERANCE).toBe(true);
  expect(dayLayouts(app)).toHaveLength(7);

  const row = rowCells(app, "2026-03-04");

  expectRowUnderHeader(row, headerLayouts(app));
  expectCellBox(row);
  expect(row.every((cell) => Math.abs(cell.y - row[0]!.y) <= TOLERANCE)).toBe(true);
});
