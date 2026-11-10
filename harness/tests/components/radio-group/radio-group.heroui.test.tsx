import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import { getRadios, getSelectedRadio, triggerRadio } from "../../testers/radio";

/*
 * HeroUI 3.2.7 regression cases for RadioGroup, per port sheet 4b (T-001 …
 * T-006). Each case keeps its upstream file:line and title, and the assertions
 * follow SOP 3.2: what NSH cannot read is replaced by the observable effect,
 * never dropped silently. `data-slot`, the BEM block / modifier classes and
 * the `data-disabled` / `data-invalid` attributes have no NSH channel (D18),
 * so the cases that carry them as extra assertions are partial ports.
 *
 * Shared scenarios come from scenarios/radio.scenarios.tsx (radio-group/*,
 * radio/item-label) because the group and its items form one upstream unit;
 * the behaviour cases come from harness/radio.fixtures.tsx, whose items paint
 * a "<name>:selected" / "<name>:unselected" marker that stands in for
 * aria-checked. T-002 (variant BEM modifier) is a screenshot case: its visible
 * effect is the Control's background and shadow, which nsh/test cannot read.
 *
 * Runs everywhere: it only presses and reads text.
 */

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
) {
  return open("../../../radio.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/radio-group/radio-group.test.tsx:59
// Partial port (port sheet T-001): data-slot="radio-group" and the BEM class
// stay unread (D18); the role and the description text are checked.
test("T-001 exposes radiogroup role, BEM, and data-slot", async () => {
  const app = await openScenario("radio-group/default");

  expect(app.shows("role:radiogroup[Plan selection]")).toBe(true);
  expect(app.shows("text:Choose the plan that suits you best")).toBe(true);
  expect(app.count("role:radiogroup")).toBe(1);
});

// heroui/packages/react/tests/components/radio-group/radio-group.test.tsx:77
// Rewritten port (port sheet T-003): ids and `for` have no NSH channel; the
// result they guarantee is that the group Label and the item Labels register
// with their own field roots, so both names resolve.
test("T-003 keeps item Label ids from colliding with the group Label id", async () => {
  const app = await openScenario("radio/item-label");

  expect(app.shows("role:radiogroup[Plan]")).toBe(true);
  expect(app.shows("role:radio[Basic]")).toBe(true);
  expect(app.shows("role:radio[Premium]")).toBe(true);
  expect(app.shows("text:Plan")).toBe(true);
  expect(app.shows("text:Basic")).toBe(true);
});

// heroui/packages/react/tests/components/radio-group/radio-group.test.tsx:109
test("T-004 supports selection via createTester", async () => {
  const app = await openCase("log");

  expect(getRadios(app)).toBe(2);
  expect(getSelectedRadio(app)).toBe("Basic");
  expect(app.shows("text:Basic:selected")).toBe(true);

  await triggerRadio(app, "Premium");

  expect(callsOf(app, "onChange")).toEqual([["b"]]);
  expect(getSelectedRadio(app)).toBe("Premium");
});

// heroui/packages/react/tests/components/radio-group/radio-group.test.tsx:126
// Partial port (port sheet T-005): the group's data-disabled stays unread; the
// per-item disabled state, the refused press and the unchanged selection are
// checked.
test("T-005 supports group disabled state", async () => {
  const app = await openCase("log", { disabled: true });

  expect(app.enabled("role:radio[Basic]")).toBe(false);

  await expect(app.press("role:radio[Premium]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.shows("text:Basic:selected")).toBe(true);
});

// heroui/packages/react/tests/components/radio-group/radio-group.test.tsx:138
// Partial port (port sheet T-006): the group's data-invalid stays unread; the
// FieldError text and it appearing once are checked.
test("T-006 renders FieldError when invalid", async () => {
  const app = await openCase("pets", { invalid: true, error: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(true);
  expect(app.count("text:ErrorMessage")).toBe(1);
});
