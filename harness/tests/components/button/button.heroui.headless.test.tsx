import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Headless-only Button cases: both hold a press with `dragAndHold` / `drop`,
 * which only the headless engine and the Linux host run ("Real hosts" in the
 * loop brief). They stay out of the plain file so the web and Windows targets
 * do not run them and report the engine's missing API as a component failure.
 */

// heroui/packages/react/tests/components/button/button.test.tsx:81
test("T-007 supports press state", async () => {
  const app = await openScenario("button/press");

  expect(callsOf(app, "onPressDown")).toHaveLength(0);

  await app.dragAndHold("role:button[Save]", { x: 0, y: 0 });
  expect(callsOf(app, "onPressDown")).toHaveLength(1);
  expect(callsOf(app, "onPressChange")).toEqual([[true]]);

  await app.drop();
  expect(callsOf(app, "onPressUp")).toHaveLength(1);
  expect(callsOf(app, "onPressChange")).toEqual([[true], [false]]);
});

// heroui/packages/react/tests/components/button/button.test.tsx:158
test("T-013 supports render-prop children for press state", async () => {
  const app = await openScenario("button/render-props");

  expect(app.shows("text:Save")).toBe(true);

  await app.dragAndHold("role:button[Save]", { x: 0, y: 0 });
  expect(app.shows("text:Pressed")).toBe(true);

  await app.drop();
  expect(app.shows("text:Save")).toBe(true);
});
