import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * The web target: a pointer press on a checkbox and a pointer drag on the
 * column resizer. The keyboard contract is covered by the port sheet's T-007 /
 * T-008 cases in a later file; Windows has no keyboard focus for a view
 * (registered host gap), so pointer gestures are the cross-platform path.
 */

test("selection slot checkboxes write the table state", async () => {
  const app = await openScenario("table/selection", {
    platform: "web",
    width: 1024,
    height: 768,
  });

  await app.clock?.runFor(20);

  await app.press("Select Ada");
  await app.clock?.runFor(20);
  expect(callsOf(app, "selection").at(-1)).toEqual([["one"]]);

  await app.press("Select all");
  await app.clock?.runFor(20);
  expect(callsOf(app, "selection").at(-1)).toEqual(["all"]);

  await app.press("Select all");
  await app.clock?.runFor(20);
  expect(callsOf(app, "selection").at(-1)).toEqual([[]]);
});

test("dragging a column resizer reports onResize before onResizeEnd", async () => {
  const app = await openScenario("table/resizable", {
    platform: "web",
    width: 1024,
    height: 768,
  });

  await app.clock?.runFor(20);
  await app.drag("Resize member", { x: 40, y: 0 });
  await app.clock?.runFor(20);

  const calls = callsOf(app, "resize").map((args) => args[0]);

  expect(calls[0]).toBe("start");
  expect(calls).toContain("move");
  expect(calls.at(-1)).toBe("end");
  expect(app.texts()).toContain("Ada");
});
