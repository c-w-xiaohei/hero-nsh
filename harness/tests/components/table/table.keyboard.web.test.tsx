import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Table's keyboard-navigation cases from port sheet 4b (T-007, T-008). Both
 * move the keyboard focus between cells, so they need the web target: a real
 * Windows window gives a non-Input view no keyboard focus (registered host
 * gap, _common.md "Windows keyboard focus").
 */

function lastFocus(app: App): string | undefined {
  return callsOf(app, "focus").map((args) => String(args[0])).at(-1);
}

function lastFocusedCell(app: App): string {
  return String(callsOf(app, "focused-cell").map((args) => String(args[0])).at(-1));
}

// heroui/packages/react/tests/components/table/table.test.tsx:301
test("T-007 should override keyboard navigation behavior with arrow mode", async () => {
  /*
   * Partial port: NSH has no capture-phase key channel, so a focused input
   * keeps its letters and the grid cannot see them; the kept upstream assertion
   * is the input taking the focus. The added assertion proves the mode switch
   * changes navigation: in arrow mode the grid is the focus stop (§8), so the
   * focused cell is read from the Content render prop's state, and arrows move
   * it from Alpha to the Year Range row.
   */
  const app = await openScenario("table/typeahead-arrow", {
    platform: "web",
    width: 1024,
    height: 768,
  });
  await app.clock?.runFor(20);

  await app.press("label:Alpha value");
  await app.clock?.runFor(20);
  expect(lastFocus(app)).toBe("input");

  await app.press("role:cell[Alpha]");
  await app.clock?.runFor(20);
  expect(lastFocusedCell(app)).toContain("alpha");

  await app.keyboard.press("arrowdown");
  await app.clock?.runFor(20);
  expect(lastFocusedCell(app)).toContain("year-range");
});

// heroui/packages/react/tests/components/table/table.test.tsx:313
test("T-008 should type ahead from non-editable cells", async () => {
  const app = await openScenario("table/typeahead-input", {
    platform: "web",
    width: 1024,
    height: 768,
  });
  await app.clock?.runFor(20);

  // The row header cell takes the focus on press, as React Aria's grid does.
  await app.press("role:cell[Alpha]");
  await app.clock?.runFor(20);
  expect(lastFocus(app)).toBe("alpha");

  await app.keyboard.press("y");
  await app.clock?.runFor(20);
  expect(lastFocus(app)).toBe("year-range");
});
