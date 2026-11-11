import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Calendar's four year-picker rows from HeroUI 3.2.7 (port sheet
 * calendar-year-picker 4b, T-001 … T-004). They open the
 * `calendar-year-picker/calendar` scenario, which renders Calendar with the
 * year picker parts.
 *
 * The earlier file also carried the three RangeCalendar rows (T-005 … T-007,
 * range-calendar.test.tsx:214 / 234 / 251). Port sheet calendar §5 moves them
 * to the RangeCalendar unit, so they are not here; this unit's Calendar rows
 * are the same behavior as calendar.heroui.test.tsx T-010 … T-013.
 */

function openPicker(scenario: "calendar", platform: "windows" | "web" = "windows"): Promise<App> {
  return openScenario(`calendar-year-picker/${scenario}`, {
    platform,
    width: 1024,
    height: 768,
    locale: "en-US",
  });
}

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:216
test("T-001 should open the Calendar year picker from its trigger", async () => {
  const app = await openPicker("calendar");
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
  expect(app.shows("text:2020")).toBe(false);
  await app.press("role:button[/year selector/i]");
  expect(app.shows("text:2020")).toBe(true);
  expect(app.shows("text:2030")).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:236
test("T-002 should select a year and close the Calendar picker", async () => {
  const app = await openPicker("calendar");
  await app.press("role:button[/year selector/i]");
  await app.press("text:2028");
  expect(app.shows("role:grid[/2028/]")).toBe(true);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:253
test("T-003 should show the focused year as selected", async () => {
  const app = await openPicker("calendar");
  await app.press("role:button[/year selector/i]");
  expect(app.spanStyle("role:button[/^2026$/] >> text:2026").color).not.toBe(
    app.spanStyle("role:button[/^2024$/] >> text:2024").color,
  );
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:261
test("T-004 should dismiss the Calendar year picker with Escape", async () => {
  const app = await openPicker("calendar", "web");
  await app.press("role:button[/year selector/i]");
  await app.keyboard.press("escape");
  expect(app.shows("text:2020")).toBe(false);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});
