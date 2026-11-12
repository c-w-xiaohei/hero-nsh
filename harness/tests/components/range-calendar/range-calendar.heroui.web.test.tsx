import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";
import { headerLayouts, LAYOUT_TOLERANCE, lastLayout, rightOf } from "../../testers/range-calendar";

/*
 * Web-target RangeCalendar cases. T-010 dismisses the year panel from the
 * keyboard: it needs the keyboard focus to reach the trigger and Return to
 * press it, which the web target does and a real Windows window does not
 * ("Real hosts" in the loop brief; the Windows host gap is a registered
 * difference). T-012 and T-013 read header geometry, and pt-PT data comes from
 * Chrome on this target (harness/nsh.json lists only `de`).
 *
 * Every case waits for the grid before it reads: on `--target web` `open` can
 * resolve before the app's first commit, and a read straight after it sees an
 * empty screen.
 */

const TOLERANCE = LAYOUT_TOLERANCE;

function openRangeCalendar(
  scenario: string,
  locale: string,
  platform: "web" | "windows" = "web",
): Promise<App> {
  return openScenario(`range-calendar/${scenario}`, { platform, locale });
}

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:251
// Rewritten port: `aria-expanded` / `aria-hidden` have no channel (D18). The
// trigger takes the keyboard focus first, Enter opens the panel, Escape closes
// it, and the trigger remains.
test("T-010 should dismiss the year picker with Escape", async () => {
  const app = await openRangeCalendar("default", "en-US");

  await app.waitFor("role:grid[/Trip dates/]", { timeout: 15_000 });

  await app.keyboard.press("tab");
  await app.keyboard.press("enter");

  expect(app.shows("text:2020")).toBe(true);

  await app.keyboard.press("escape");

  expect(app.shows("text:2020")).toBe(false);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.browser.test.tsx:45
// Partial port: overflow / text-overflow / white-space are not readable by
// nsh/test (three upstream assertions dropped; `truncate` is checked by R-024).
// The seven pt-PT labels and the seven equal columns stay.
test("T-012 should render pt-PT weekday labels in seven equal columns", async () => {
  const app = await openRangeCalendar("geometry", "pt-PT");

  await app.waitFor("role:grid[/Trip dates/]", { timeout: 15_000 });

  // The web target runs Chrome, whose pt-PT short weekdays are these full words.
  const labels = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const grid = lastLayout(app, "grid");
  const headers = headerLayouts(app);
  const columnWidth = grid.width / 7;

  expect(headers).toHaveLength(7);
  expect(labels.filter((label) => app.shows(`text:${label}`))).toHaveLength(7);
  expect(headers.every((cell) => cell.x >= -TOLERANCE)).toBe(true);
  expect(headers.every((cell) => rightOf(cell) <= grid.width + TOLERANCE)).toBe(true);
  expect(headers.every((cell) => Math.abs(cell.width - columnWidth) <= TOLERANCE)).toBe(true);
  expect(
    headers.every((cell, index) => index === 0 || headers[index - 1]!.x + headers[index - 1]!.width <= cell.x + TOLERANCE),
  ).toBe(true);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.browser.test.tsx:88
// Partial port: `scrollWidth <= clientWidth` is not readable (dropped). The
// seven English labels and the cells' right edge inside the grid stay.
test("T-013 should keep English weekday labels inside the grid", async () => {
  const app = await openRangeCalendar("geometry", "en-US");

  await app.waitFor("role:grid[/Trip dates/]", { timeout: 15_000 });

  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const grid = lastLayout(app, "grid");
  const headers = headerLayouts(app);

  expect(labels.filter((label) => app.shows(`text:${label}`))).toHaveLength(7);
  expect(headers.every((cell) => rightOf(cell) <= grid.width + TOLERANCE)).toBe(true);
});
