import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Headless-only CloseButton case: it holds the press with `dragAndHold` and
 * `drop`, which only the headless engine (and the Linux host) runs ("Real
 * hosts" in the loop brief). Keeping it in a `.headless.` file lets the web and
 * Windows targets skip it without weakening the assertion anywhere.
 */

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:109
// Rewritten port (port sheet T-008): `data-pressed` is not projected. The
// public press callbacks carry the same state: the press starts while held and
// ends on release. The pressed scale itself is paint, checked against R-015.
test("T-008 supports press state", async () => {
  const app = await openScenario("close-button/press");

  expect(callsOf(app, "onPressStart")).toHaveLength(0);

  await app.dragAndHold("role:button[Close]", { x: 0, y: 0 });
  expect(callsOf(app, "onPressStart")).toHaveLength(1);
  expect(callsOf(app, "onPressChange")).toEqual([[true]]);

  await app.drop();
  expect(callsOf(app, "onPressUp")).toHaveLength(1);
  expect(callsOf(app, "onPressEnd")).toHaveLength(1);
  expect(callsOf(app, "onPressChange")).toEqual([[true], [false]]);
});
