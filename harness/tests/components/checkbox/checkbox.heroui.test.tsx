import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import {
  getCheckboxes,
  getSelectedCheckboxes,
  toggleCheckbox,
} from "../../testers/checkbox";

/*
 * HeroUI 3.2.7 regression cases for Checkbox and CheckboxGroup, per port sheet
 * 4b (T-001 … T-019). Each case keeps its upstream file:line above it and its
 * title starts with the port-sheet id. The assertions follow SOP 3.2: what NSH
 * cannot read (data-* attributes, data-slots, BEM classes, a hidden input's
 * checked state, DOM ids) is replaced by the observable effect, never dropped
 * silently. The partial ports say in a comment what stays unread.
 *
 * T-010, T-012 and T-017 move the keyboard focus with Tab, which the web target
 * does and a real Windows window does not ("Real hosts" in the loop brief), so
 * they live in checkbox.heroui.web.test.tsx.
 */

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
  options: { platform?: "windows" | "web" } = {},
) {
  return open("../../../checkbox.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit cases: Checkbox
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/checkbox/checkbox.test.tsx:28
test("T-001 renders with role and accessible name", async () => {
  const app = await openScenario("checkbox/default");

  expect(app.shows("role:checkbox[Accept terms and conditions]")).toBe(true);
});

// heroui/packages/react/tests/components/checkbox/checkbox.test.tsx:56
// Rewritten port (port sheet T-004): data-testid and data-slot have no NSH
// channel (D18); the capability is testID passthrough on the field root.
test("T-004 supports data attribute passthrough on the field", async () => {
  const app = await openCase("test-id");

  expect(app.shows("id:terms")).toBe(true);
});

// heroui/packages/react/tests/components/checkbox/checkbox.test.tsx:71
test("T-005 calls onChange when selection is toggled", async () => {
  const app = await openCase("log");
  const control = "role:checkbox[Accept terms]";

  expect(app.shows("text:Unchecked")).toBe(true);

  await app.press(control);
  expect(app.shows("text:Checked")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true]]);

  await app.press(control);
  expect(app.shows("text:Unchecked")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true], [false]]);
});

// heroui/packages/react/tests/components/checkbox/checkbox.test.tsx:86
test("T-006 supports controlled isSelected", async () => {
  const app = await openCase("controlled");
  const control = "role:checkbox[Accept terms]";

  expect(app.shows("text:Unchecked")).toBe(true);

  await app.press(control);
  // The controlled parent did not write back: the marker stays Unchecked while
  // the callback still reports the requested value.
  expect(callsOf(app, "onChange")).toEqual([[true]]);
  expect(app.shows("text:Unchecked")).toBe(true);

  await app.press("id:force");
  expect(app.shows("text:Checked")).toBe(true);
});

// heroui/packages/react/tests/components/checkbox/checkbox.test.tsx:119
// Rewritten port (port sheet T-007): data-selected has no NSH channel; its
// visible result is the selected marker.
test("T-007 exposes data-selected when selected", async () => {
  const app = await openCase("log");

  await app.press("role:checkbox[Accept terms]");

  expect(app.shows("text:Checked")).toBe(true);
});

// heroui/packages/react/tests/components/checkbox/checkbox.test.tsx:128
// Partial port (port sheet T-008): the hidden input's `indeterminate` property
// and the root's data-indeterminate have no NSH channel. The kept fact is the
// mixed state the custom Indicator render prop shows.
test("T-008 supports indeterminate state", async () => {
  const app = await openCase("indeterminate");

  expect(app.shows("text:Mixed")).toBe(true);
});

// heroui/packages/react/tests/components/checkbox/checkbox.test.tsx:137
// Partial port (port sheet T-009): the SVG stroke-dashoffset attributes and
// node identity have no NSH channel (the checkmark is a Canvas with no
// draw-in animation). The three visible end states are kept.
test("T-009 preserves the checkmark draw animation across indeterminate transitions", async () => {
  const app = await openCase("indeterminate-toggle");

  expect(app.shows("text:Mixed")).toBe(true);

  await app.press("id:clear-indeterminate");
  expect(app.shows("text:NoMixed")).toBe(true);

  await app.press("id:select");
  expect(app.shows("text:Checked")).toBe(true);
});

// heroui/packages/react/tests/components/checkbox/checkbox.test.tsx:180
// Partial port (port sheet T-011): data-disabled has no NSH channel. Kept: the
// marker stays off, the content reports disabled, and pressing it changes
// nothing.
test("T-011 supports disabled state and blocks interaction", async () => {
  const app = await openCase("disabled");
  const control = "role:checkbox[Accept terms]";

  expect(app.shows("text:Unchecked")).toBe(true);
  expect(app.enabled(control)).toBe(false);

  await expect(app.press(control)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(app.shows("text:Unchecked")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit cases: CheckboxGroup
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/checkbox-group/checkbox-group.test.tsx:59
// Partial port (port sheet T-013): data-slot and the BEM block name have no NSH
// channel (D18). Kept: the group's role and name, an item's role and name, and
// the description text.
test("T-013 exposes group role, BEM, and data-slot", async () => {
  const app = await openScenario("checkbox/group-default");

  expect(app.shows("role:group[Select your interests]")).toBe(true);
  expect(app.shows("role:checkbox[Coding]")).toBe(true);
  expect(app.shows("text:Choose all that apply")).toBe(true);
});

// heroui/packages/react/tests/components/checkbox-group/checkbox-group.test.tsx:70
// Rewritten port (port sheet T-014): ids and `for` have no NSH channel. The
// guarantee they encoded is that the group Label and each item Label register
// into their own FieldContext, so every name still resolves.
test("T-014 keeps item Label ids from colliding with the group Label id", async () => {
  const app = await openScenario("checkbox/group-labels");

  expect(app.shows("role:group[Select your interests]")).toBe(true);
  expect(app.shows("role:checkbox[Coding]")).toBe(true);
  expect(app.shows("role:checkbox[Design]")).toBe(true);
  expect(app.shows("text:Select your interests")).toBe(true);
  expect(app.shows("text:Coding")).toBe(true);
});

// heroui/packages/react/tests/components/checkbox-group/checkbox-group.test.tsx:110
test("T-016 calls onChange when selection is toggled via createTester", async () => {
  const app = await openCase("group-log");

  expect(getCheckboxes(app)).toBe(2);

  await toggleCheckbox(app, "Coding");
  expect(callsOf(app, "groupChange")).toEqual([["coding"]]);
  expect(getSelectedCheckboxes(app)).toBe(1);

  await toggleCheckbox(app, "Design");
  expect(callsOf(app, "groupChange")).toEqual([["coding"], ["coding", "design"]]);
  expect(getSelectedCheckboxes(app)).toBe(2);
});

// heroui/packages/react/tests/components/checkbox-group/checkbox-group.test.tsx:144
// Partial port (port sheet T-018): the group's data-disabled has no NSH
// channel. Kept: the item reports disabled and a press changes nothing.
test("T-018 supports group disabled state", async () => {
  const app = await openCase("group-disabled");
  const coding = "role:checkbox[Coding]";

  expect(app.enabled(coding)).toBe(false);

  await expect(app.press(coding)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "groupChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/checkbox-group/checkbox-group.test.tsx:156
// Partial port (port sheet T-019): the group's data-invalid has no NSH channel.
// Kept: the FieldError text appears while the group is invalid.
test("T-019 renders FieldError when invalid", async () => {
  const app = await openCase("group-invalid");

  expect(app.shows("text:Pick at least one")).toBe(true);
});
