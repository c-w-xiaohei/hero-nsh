import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Headless-only ToggleButton cases: T-008 holds a press with `dragAndHold` /
 * `drop`, which only the headless engine and the Linux host run ("Real hosts"
 * in the loop brief). It keeps its upstream title and line.
 */

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:104
// Rewritten port (port sheet T-008): `data-pressed` is not projected; the four
// press callbacks it exposes are probed while the button is held and after the
// finger lifts.
test("T-008 supports press state", async () => {
  const app = await openScenario("toggle-button/press");

  await app.dragAndHold("role:button[Bold]", { x: 0, y: 0 });
  expect(callsOf(app, "onPressDown")).toHaveLength(1);
  expect(callsOf(app, "onPressChange")).toEqual([[true]]);

  await app.drop();
  expect(callsOf(app, "onPressUp")).toHaveLength(1);
  expect(callsOf(app, "onPressChange")).toEqual([[true], [false]]);
});
