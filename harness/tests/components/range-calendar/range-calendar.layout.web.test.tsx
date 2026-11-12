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
  weekRows,
} from "../../testers/range-calendar";
import type { PartLayout } from "../../testers/range-calendar";

/*
 * Web-only: the G-xxx geometry cases read every part's box through `onLayout`
 * probes (port sheet 4c). Bounds are relative to each part's parent, and the
 * assertions are structural — a column is a seventh of the grid, the body sits
 * four points under the header row, the body is as tall as its week rows, cells
 * touch inside a row — never hard-coded pixels.
 *
 * Two consequences of parent-relative bounds shape these cases. A day cell's
 * parent is its week row (R-023: a real `View role="row"` per week, NSH has no
 * `display:contents`), so every cell reports `y: 0` inside its own row and rows
 * are told apart only by their row-local `x` — see `weekRows` in
 * tests/testers/range-calendar.ts. And a row's distance from the row above it
 * is not observable at all; the vertical relation the mock measured (each row
 * 40 high, cells 36 + 4 of margin) is checked as body height = rows × cell.
 *
 * G-001 month view; G-002 week view (`visibleDuration={{weeks: 2}}`); G-003 day
 * view (`visibleDuration={{days: 7}}`), whose body is week-aligned: it starts
 * at the week start before the visible range, so it shows two rows, the leading
 * dates before the visible start and a short second row.
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

/**
 * A week row is one cell high and the body stacks its rows: the body is as tall
 * as the cells of all its rows together. Rows themselves sit in their own
 * parent, so their pitch is not observable here.
 */
function expectRowStack(body: PartLayout, rows: PartLayout[][]): void {
  const cell = rows[0]![0]!;

  expect(Math.abs(body.height - rows.length * cell.height) <= TOLERANCE).toBe(true);
}

/** Each cell of `row` sits in the header column of the same index. */
function expectUnderHeaderColumns(row: PartLayout[], headers: PartLayout[]): void {
  expect(
    row.every(
      (cell, index) =>
        Math.abs(cell.x - headers[index]!.x) <= TOLERANCE &&
        Math.abs(rightOf(cell) - rightOf(headers[index]!)) <= TOLERANCE,
    ),
  ).toBe(true);
}

/** The first row's cells sit under the header's columns, edge to edge. */
function expectRowUnderHeader(row: PartLayout[], headers: PartLayout[]): void {
  expect(row).toHaveLength(7);
  expectUnderHeaderColumns(row, headers);
  expect(
    row.every(
      (cell, index) => index === 0 || Math.abs(rightOf(row[index - 1]!) - cell.x) <= TOLERANCE,
    ),
  ).toBe(true);
}

// port sheet 4c, G-001: seven equal columns under the header, the body four
// points below it, and six week rows of seven cells each. The selected range
// 2026-08-01 … 08-05 crosses rows, so its start sits in the first row and its
// middle in the next one; the track of neighbouring selected cells stays
// continuous there (adjacent cells' boxes touch, no gap).
test("G-001 lays the month grid out as seven equal columns under the header", async () => {
  const app = await openGeometry("geometry");

  await app.waitFor("role:grid[/Trip dates/]", { timeout: 15_000 });

  const headerRow = lastLayout(app, "grid-header");
  const body = lastLayout(app, "grid-body");
  const headers = headerLayouts(app);
  const rows = weekRows(app);

  expectSevenColumns(app);
  expect(Math.abs(body.y - (headerRow.y + headerRow.height + BODY_GAP)) <= TOLERANCE).toBe(true);
  /* August 2026 fills six whole weeks, Sunday through Saturday. */
  expect(rows.map((row) => row.length)).toEqual([7, 7, 7, 7, 7, 7]);

  const firstRow = rowCells(app, "2026-08-01");

  expectRowUnderHeader(firstRow, headers);
  expectCellBox(firstRow);
  expectRowUnderHeader(rowBelow(app, "2026-08-01"), headers);
  expectRowStack(body, rows);
});

// port sheet 4c, G-002: the week view keeps the month view's geometry — one
// seven-column header and two seven-cell rows, the same cell box and body stack.
test("G-002 keeps the seven-column grid in the two-week view", async () => {
  const app = await openGeometry("geometry-week");

  await app.waitFor("role:grid[/Trip dates/]", { timeout: 15_000 });

  const headerRow = lastLayout(app, "grid-header");
  const body = lastLayout(app, "grid-body");
  const headers = headerLayouts(app);
  const rows = weekRows(app);

  expectSevenColumns(app);
  expect(Math.abs(body.y - (headerRow.y + headerRow.height + BODY_GAP)) <= TOLERANCE).toBe(true);
  expect(dayLayouts(app)).toHaveLength(14);
  expect(rows.map((row) => row.length)).toEqual([7, 7]);

  const firstRow = rowCells(app, "2026-03-05");

  expectRowUnderHeader(firstRow, headers);
  expectCellBox(firstRow);
  expectRowUnderHeader(rowBelow(app, "2026-03-05"), headers);
  expectRowStack(body, rows);
});

// port sheet 4c, G-003: the day view puts its week rows four points under the
// seven-column header, columns aligned. HeroUI's day-view body is week-aligned
// (`getDayViewGridRows` builds whole weeks from the week start of the visible
// range, and the days before that range start stay real cells), so a visible
// range of 2026-03-03 … 03-09 renders 2026-03-01 … 03-09: nine cells over two
// rows, the second one short.
test("G-003 keeps the day view's week-aligned seven-column rows", async () => {
  const app = await openGeometry("geometry-day");

  await app.waitFor("role:grid[/Trip dates/]", { timeout: 15_000 });

  const headerRow = lastLayout(app, "grid-header");
  const body = lastLayout(app, "grid-body");
  const headers = headerLayouts(app);
  const rows = weekRows(app);

  expectSevenColumns(app);
  expect(Math.abs(body.y - (headerRow.y + headerRow.height + BODY_GAP)) <= TOLERANCE).toBe(true);

  expect(dayLayouts(app)).toHaveLength(9);
  expect(rows.map((row) => row.length)).toEqual([7, 2]);
  expect(rows[0]!.map((cell) => cell.name)).toEqual([
    "day-2026-03-01",
    "day-2026-03-02",
    "day-2026-03-03",
    "day-2026-03-04",
    "day-2026-03-05",
    "day-2026-03-06",
    "day-2026-03-07",
  ]);
  expect(rows[1]!.map((cell) => cell.name)).toEqual(["day-2026-03-08", "day-2026-03-09"]);

  expectRowUnderHeader(rows[0]!, headers);
  expectUnderHeaderColumns(rows[1]!, headers);
  expectCellBox(rows[0]!);
  expectRowStack(body, rows);
});
