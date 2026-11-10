import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import { getRadios, getSelectedRadio, triggerRadio } from "../../testers/radio";

/*
 * HeroUI 3.2.7 regression cases for Radio and RadioGroup, per port sheet 4b
 * (T-001 … T-012). Every case keeps its upstream file:line and title, and the
 * assertions follow SOP 3.2: what NSH cannot read (aria-checked, data-*,
 * BEM classes, DOM ids) is replaced by the observable effect, never dropped
 * silently. Each item renders a "<name>:selected" / "<name>:unselected" marker
 * (harness/radio.fixtures.tsx), which is the selected state NSH can read.
 * T-002 (BEM block / data-slots) is deleted by the sheet and T-008 (variant
 * BEM modifier) is a screenshot case, so neither has a test here.
 */

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
  options: { platform?: "windows" | "web" } = {},
) {
  return open("../../../radio.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

/* -------------------------------------------------------------------------------------------------
 * HeroUI radio.test.tsx
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/radio/radio.test.tsx:43
test("T-001 renders radiogroup and radio roles with accessible names", async () => {
  const app = await openCase("log");

  expect(app.shows("role:radiogroup[Plan]")).toBe(true);
  expect(app.shows("role:radio[Basic]")).toBe(true);
  expect(app.shows("role:radio[Premium]")).toBe(true);
  // The two checked / not-checked facts of the upstream case, as markers.
  expect(app.shows("text:Basic:selected") && app.shows("text:Premium:unselected")).toBe(true);
});

// heroui/packages/react/tests/components/radio/radio.test.tsx:62
test("T-003 calls onChange when a radio is selected", async () => {
  const app = await openCase("log");

  await app.press("role:radio[Premium]");

  expect(callsOf(app, "onChange")).toEqual([["b"]]);
  expect(app.shows("text:Premium:selected")).toBe(true);
  expect(app.shows("text:Basic:unselected")).toBe(true);
});

// heroui/packages/react/tests/components/radio/radio.test.tsx:73
// Rewritten port (port sheet T-004): data-selected has no NSH channel; its
// visible result is the selected marker.
test("T-004 exposes data-selected on the selected field", async () => {
  const app = await openCase("log");

  await app.press("role:radio[Premium]");

  expect(app.shows("text:Premium:selected")).toBe(true);
});

// heroui/packages/react/tests/components/radio/radio.test.tsx:83
// Partial port (port sheet T-005): the data-disabled attribute stays unread;
// the press being refused and onChange staying at zero are checked here.
test("T-005 supports disabled radio without selecting", async () => {
  const app = await openCase("log", { disabledValue: "b" });

  expect(app.enabled("role:radio[Premium]")).toBe(false);

  await expect(app.press("role:radio[Premium]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.shows("text:Basic:selected")).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * HeroUI radio-group.test.tsx
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/radio-group/radio-group.test.tsx:59
// Partial port (port sheet T-007): data-slot and the BEM class stay unread.
test("T-007 exposes radiogroup role, BEM, and data-slot", async () => {
  const app = await openScenario("radio-group/default");

  expect(app.shows("role:radiogroup[Plan selection]")).toBe(true);
  expect(app.shows("text:Choose the plan that suits you best")).toBe(true);
  expect(app.count("role:radiogroup")).toBe(1);
});

// heroui/packages/react/tests/components/radio-group/radio-group.test.tsx:77
// Rewritten port (port sheet T-009): ids and `for` have no NSH channel; the
// result they guarantee is that the group Label and the item Labels register
// with their own field roots, so both names resolve.
test("T-009 keeps item Label ids from colliding with the group Label id", async () => {
  const app = await openScenario("radio/item-label");

  expect(app.shows("role:radiogroup[Plan]")).toBe(true);
  expect(app.shows("role:radio[Basic]")).toBe(true);
  expect(app.shows("role:radio[Premium]")).toBe(true);
  expect(app.shows("text:Plan")).toBe(true);
  expect(app.shows("text:Basic")).toBe(true);
});

// heroui/packages/react/tests/components/radio-group/radio-group.test.tsx:109
test("T-010 supports selection via createTester", async () => {
  const app = await openCase("log");

  expect(getRadios(app)).toBe(2);
  expect(getSelectedRadio(app)).toBe("Basic");

  await triggerRadio(app, "Premium");

  expect(callsOf(app, "onChange")).toEqual([["b"]]);
  expect(getSelectedRadio(app)).toBe("Premium");
});

// heroui/packages/react/tests/components/radio-group/radio-group.test.tsx:126
// Partial port (port sheet T-011): the group's data-disabled stays unread.
test("T-011 supports group disabled state", async () => {
  const app = await openCase("log", { disabled: true });

  expect(app.enabled("role:radio[Basic]")).toBe(false);

  await expect(app.press("role:radio[Premium]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.shows("text:Basic:selected")).toBe(true);
});

// heroui/packages/react/tests/components/radio-group/radio-group.test.tsx:138
// Partial port (port sheet T-012): the group's data-invalid stays unread.
test("T-012 renders FieldError when invalid", async () => {
  const app = await openCase("pets", { invalid: true, error: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(true);
  expect(app.count("text:ErrorMessage")).toBe(1);
});

/* -------------------------------------------------------------------------------------------------
 * X cases: behaviour the port sheet's §1 public surface pins down and no
 * upstream HeroUI test covers.
 * -----------------------------------------------------------------------------------------------*/

// port sheet §1, `children` (Radio.Control): a RadioControlProps `children`
// renders in the Control's own placement, and bare strings / numbers are
// wrapped in Text so they reach the screen.
test("X-001 renders Radio.Control children, bare strings and numbers included", async () => {
  const app = await openCase("control-children");

  expect(app.shows("text:custom")).toBe(true);
  expect(app.shows("text:7")).toBe(true);
  expect(app.count("role:radio")).toBe(2);
});

// port sheet §1, `state` (RadioGroupRenderProps): the render prop exposes
// selectedValue, defaultSelectedValue, lastFocusedValue and the four state
// bits; defaultSelectedValue is the defaultValue snapshot and must not follow
// the selection.
test("X-002 exposes the group state accessors, defaultSelectedValue included", async () => {
  const app = await openCase("state");

  expect(app.shows("text:selected:cats")).toBe(true);
  expect(app.shows("text:default:cats")).toBe(true);
  expect(app.shows("text:last:none")).toBe(true);
  expect(
    app.shows("text:disabled:no") &&
      app.shows("text:readonly:no") &&
      app.shows("text:required:no") &&
      app.shows("text:invalid:no"),
  ).toBe(true);

  await app.press("role:radio[Dogs]");

  expect(app.shows("text:selected:dogs")).toBe(true);
  expect(app.shows("text:default:cats")).toBe(true);
});
