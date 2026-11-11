import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

function openPicker(scenario: "calendar" | "range-calendar", platform: "windows" | "web" = "windows"): Promise<App> {
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
  expect(app.shows("text:2028")).toBe(true);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:253
test("T-003 should show the focused year as selected", async () => {
  const app = await openPicker("calendar");
  await app.press("role:button[/year selector/i]");
  expect(app.shows("text:2026")).toBe(true);
});

// heroui/packages/react/tests/components/calendar/calendar.test.tsx:261
test("T-004 should dismiss the Calendar year picker with Escape", async () => {
  const app = await openPicker("calendar", "web");
  await app.press("role:button[/year selector/i]");
  await app.keyboard.press("escape");
  expect(app.shows("text:2020")).toBe(false);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:214
test("T-005 should open the RangeCalendar year picker from its trigger", async () => {
  const app = await openPicker("range-calendar");
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
  expect(app.shows("text:2020")).toBe(false);
  await app.press("role:button[/year selector/i]");
  expect(app.shows("text:2020")).toBe(true);
  expect(app.shows("text:2030")).toBe(true);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:234
test("T-006 should select a year and close the RangeCalendar picker", async () => {
  const app = await openPicker("range-calendar");
  await app.press("role:button[/year selector/i]");
  await app.press("text:2028");
  expect(app.shows("text:2028")).toBe(true);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});

// heroui/packages/react/tests/components/range-calendar/range-calendar.test.tsx:251
test("T-007 should dismiss the RangeCalendar year picker with Escape", async () => {
  const app = await openPicker("range-calendar", "web");
  await app.press("role:button[/year selector/i]");
  await app.keyboard.press("escape");
  expect(app.shows("text:2020")).toBe(false);
  expect(app.shows("role:button[/year selector/i]")).toBe(true);
});
