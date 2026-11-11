import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";
import {
  dayLayouts,
  focusedDate,
  headerLayouts,
  lastLayout,
  LAYOUT_TOLERANCE,
  rightOf,
} from "../../testers/calendar";

/*
 * Web-only Calendar cases: T-006 and T-013 move the keyboard focus with Tab,
 * which the web target does and a real Windows window does not ("Real hosts"
 * in the loop brief; the Windows host gap is a registered difference). T-015 …
 * T-018 read layout on `--target web` as the port sheet asks.
 *
 * Every case waits for the grid before it reads: on `--target web` `open` can
 * resolve before the app's first commit, and a read straight after it sees an
 * empty screen.
 */

const TOLERANCE = LAYOUT_TOLERANCE;
const EVENT_DATE = "Event date";

function openCalendar(
  scenario: string,
  locale: string,
  platform: "web" | "windows" = "web",
): Promise<App> {
  return openScenario(scenario, { platform, locale });
}

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:147
// Rewritten port: `element.focus()` has no NSH counterpart; Tab enters the grid
// on the roving focus date and the cell's `onFocus` records it. ArrowRight
// moves the focused date by one day.
test("T-006 should move focus with ArrowRight", async () => {
  const app = await openCalendar("calendar/default", "en-US");

  await app.waitFor(`role:grid[/${EVENT_DATE}/]`, { timeout: 15_000 });

  for (let index = 0; index < 8 && focusedDate(app) !== "2026-08-15"; index += 1) {
    await app.keyboard.press("tab");
  }

  expect(focusedDate(app)).toBe("2026-08-15");

  await app.keyboard.press("arrowright");

  expect(focusedDate(app)).toBe("2026-08-16");
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:261
// Rewritten port: `aria-expanded` / `aria-hidden` have no channel (D18). The
// trigger takes the keyboard focus first, Enter opens the panel, Escape closes
// it, and the trigger remains.
test("T-013 should dismiss the year picker with Escape", async () => {
  const app = await openCalendar("calendar/default", "en-US");

  await app.waitFor(`role:grid[/${EVENT_DATE}/]`, { timeout: 15_000 });

  await app.keyboard.press("tab");
  await app.keyboard.press("enter");

  expect(app.shows("text:2020")).toBe(true);

  await app.keyboard.press("escape");

  expect(app.shows("text:2020")).toBe(false);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.browser.test.tsx:40
// Rewritten port: the `expect.element` grid assertion is dropped; the header
// cell and grid bounds come from `onLayout` probes. Seven cells, each a column
// wide, left to right, inside the grid.
test("T-015 should render pt-PT weekday labels in seven equal columns", async () => {
  const app = await openCalendar("calendar/geometry", "pt-PT");

  await app.waitFor(`role:grid[/${EVENT_DATE}/]`, { timeout: 15_000 });

  const grid = lastLayout(app, "grid");
  const headers = headerLayouts(app);
  const columnWidth = grid.width / 7;

  expect(headers).toHaveLength(7);
  expect(headers.every((cell) => Math.abs(cell.width - columnWidth) <= TOLERANCE)).toBe(true);
  expect(
    headers.every((cell) => cell.x >= -TOLERANCE && rightOf(cell) <= grid.width + TOLERANCE),
  ).toBe(true);
  expect(headers.every((cell, index) => index === 0 || cell.x >= headers[index - 1]!.x)).toBe(
    true,
  );
  expect(
    headers.every((cell, index) => index === 0 || headers[index - 1]!.x + headers[index - 1]!.width <= cell.x + TOLERANCE),
  ).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.browser.test.tsx:66
// Partial port: overflow / text-overflow / white-space are not readable by
// nsh/test (three upstream assertions dropped; `truncate` is checked by R-024).
// The seven pt-PT labels stay.
test("T-016 should render the pt-PT weekday labels", async () => {
  const app = await openCalendar("calendar/geometry", "pt-PT");

  await app.waitFor(`role:grid[/${EVENT_DATE}/]`, { timeout: 15_000 });

  const formatter = new Intl.DateTimeFormat("pt-PT", { weekday: "short", timeZone: "UTC" });
  const labels = [26, 27, 28, 29, 30, 31, 1].map((day) =>
    formatter.format(new Date(Date.UTC(2026, day === 1 ? 7 : 6, day, 12))),
  );

  expect(labels.filter((label) => app.shows(`text:${label}`))).toHaveLength(7);
});

// heroui/packages/react/tests/components/calendar/calendar.browser.test.tsx:93
// Partial port: `scrollWidth <= clientWidth` is not readable (dropped). The
// seven English labels and the cells' right edge inside the grid stay.
test("T-017 should keep English weekday labels inside the grid", async () => {
  const app = await openCalendar("calendar/geometry", "en-US");

  await app.waitFor(`role:grid[/${EVENT_DATE}/]`, { timeout: 15_000 });

  const grid = lastLayout(app, "grid");
  const headers = headerLayouts(app);
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  expect(labels.filter((label) => app.shows(`text:${label}`))).toHaveLength(7);
  expect(headers.every((cell) => rightOf(cell) <= grid.width + TOLERANCE)).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.browser.test.tsx:119
// Rewritten port: the first body row's seven day cells and the seven header
// cells come from `onLayout` probes; their left and right edges meet per column.
test("T-018 should align body day cells with the header columns", async () => {
  const app = await openCalendar("calendar/geometry", "pt-PT");

  await app.waitFor(`role:grid[/${EVENT_DATE}/]`, { timeout: 15_000 });

  const headers = headerLayouts(app);
  const days = dayLayouts(app).slice(0, 7);

  expect(days).toHaveLength(7);
  expect(
    days.every((cell, index) => Math.abs(cell.x - headers[index]!.x) <= TOLERANCE),
  ).toBe(true);
  expect(
    days.every((cell, index) => Math.abs(rightOf(cell) - rightOf(headers[index]!)) <= TOLERANCE),
  ).toBe(true);
});
