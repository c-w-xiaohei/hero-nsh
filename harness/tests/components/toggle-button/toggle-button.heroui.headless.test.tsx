import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Headless-only ToggleButton cases: T-008 holds a press with `dragAndHold` /
 * `drop`, and X-001 holds Shift down across a press with `keyboard.down` /
 * `up`; both only the headless engine and the Linux host run ("Real hosts" in
 * the loop brief). T-008 keeps its upstream title and line.
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

// src/components/toggle-button/toggle-button-root.tsx:368,381 — upstream is
// react-spectrum@740c6c5: packages/react-aria/src/button/useToggleButtonGroup.ts:121-130
// builds a member's toggle() as state.toggleKey(props.id), and
// packages/react-stately/src/toggle/useToggleGroupState.ts:79-89 only adds or
// removes that one key. The port routes press-up and press through
// createSelectableItem, and its selectWithEvent
// (src/primitives/selection/create-selectable-item.ts:196) extends the selection
// to a range for a Shift press. HeroUI toggles only the pressed key.
test("X-001 shift press in a multiple group toggles only the pressed member", async () => {
  const app = await openScenario("toggle-button-group/shift-multi.split");
  await app.waitFor("text:Dogs off", { timeout: 15_000 });

  await app.press("role:button[Dogs off]");
  expect(app.shows("text:Dogs on")).toBe(true);

  await app.keyboard.down("shift");
  await app.press("role:button[Dragons off]");
  await app.keyboard.up("shift");

  // A range selection from the anchor would also press Cats.
  expect(app.shows("text:Cats off")).toBe(true);
  expect(app.shows("text:Dragons on")).toBe(true);
  expect(app.shows("text:Dogs on")).toBe(true);
  expect(callsOf(app, "onSelectionChange")).toEqual([[["dogs"]], [["dogs", "dragons"]]]);
});
