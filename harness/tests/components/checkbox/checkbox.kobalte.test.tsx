import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 regression cases for Checkbox, rewritten onto HeroUI's API
 * and NSH's view model per port sheet 4b (T-020 … T-060). Kobalte's DOM ids,
 * `input` properties, `aria-*` attributes and `data-*` attributes are replaced
 * by the visible state markers in harness/checkbox.fixtures.tsx (`Checked` /
 * `Unchecked`, `Mixed` / `NoMixed`, `enabled`), never dropped silently. T-032
 * moves the keyboard focus with Tab and lives in
 * checkbox.kobalte.web.test.tsx.
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

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:102
// Rewritten port (port sheet T-023): there is no input element; the accessible
// contract it carried is the checkbox role on the content.
test("T-023 should set input type to checkbox", async () => {
  const app = await openScenario("checkbox/default");

  expect(app.shows("role:checkbox")).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:138
test("T-026 ensure default unchecked can be checked", async () => {
  const app = await openCase("log");
  const control = "role:checkbox[Accept terms]";

  expect(app.shows("text:Unchecked")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);

  await app.press(control);
  expect(app.shows("text:Checked")).toBe(true);
  expect(callsOf(app, "onChange")[0]?.[0]).toBe(true);

  await app.press(control);
  expect(callsOf(app, "onChange")[1]?.[0]).toBe(false);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:162
test("T-027 can be default checked", async () => {
  const app = await openCase("default-selected");

  expect(app.shows("text:Checked")).toBe(true);

  await app.press("role:checkbox[Accept terms]");
  expect(app.shows("text:Unchecked")).toBe(true);
  expect(callsOf(app, "onChange")[0]?.[0]).toBe(false);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:180
test("T-028 can be controlled checked", async () => {
  const app = await openCase("controlled", { start: true });

  expect(app.shows("text:Checked")).toBe(true);

  await app.press("role:checkbox[Accept terms]");
  expect(app.shows("text:Checked")).toBe(true);
  expect(callsOf(app, "onChange")[0]?.[0]).toBe(false);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:198
test("T-029 can be controlled unchecked", async () => {
  const app = await openCase("controlled");

  expect(app.shows("text:Unchecked")).toBe(true);

  await app.press("role:checkbox[Accept terms]");
  expect(app.shows("text:Unchecked")).toBe(true);
  expect(callsOf(app, "onChange")[0]?.[0]).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:216
// Partial port (port sheet T-030): the three `input.indeterminate` property
// assertions have no NSH channel (no input); the six visible facts stay.
test("T-030 can be indeterminate", async () => {
  const app = await openCase("indeterminate");

  expect(app.shows("text:Mixed")).toBe(true);
  expect(app.shows("text:Unchecked")).toBe(true);

  await app.press("role:checkbox[Accept terms]");
  expect(app.shows("text:Checked")).toBe(true);
  expect(app.shows("text:Mixed")).toBe(true);
  expect(callsOf(app, "onChange")[0]?.[0]).toBe(true);

  await app.press("role:checkbox[Accept terms]");
  expect(app.shows("text:Unchecked")).toBe(true);
  expect(callsOf(app, "onChange")[1]?.[0]).toBe(false);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:244
// Rewritten port (port sheet T-031): the press lands on the Control, a
// non-pressable child View, and must reach the Content around it.
test("T-031 can be checked by clicking on the control", async () => {
  const app = await openCase("control-click");

  expect(app.shows("text:Unchecked")).toBe(true);

  await app.press("id:control");
  expect(app.shows("text:Checked")).toBe(true);
  expect(callsOf(app, "onChange")[0]?.[0]).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:285
// Rewritten port (port sheet T-033): `input.disabled` becomes the content's
// enabled state; the rest stays visible behaviour.
test("T-033 can be disabled", async () => {
  const app = await openCase("disabled");
  const control = "role:checkbox[Accept terms]";

  expect(app.enabled(control)).toBe(false);
  expect(app.shows("text:Unchecked")).toBe(true);

  await expect(app.press(control)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(app.shows("text:Unchecked")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:307
// Rewritten port (port sheet T-034): aria-invalid has no NSH channel; the
// visible result is the FieldError text.
test("T-034 can be invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:332
// Partial port (port sheet T-036): aria-labelledby, HTMLLabelElement and `for`
// have no NSH channel. Kept: the Label registers the content's accessible name
// and its text is on screen.
test("T-036 supports visible label", async () => {
  const app = await openCase("visible-label");

  expect(app.shows("role:checkbox[Label]")).toBe(true);
  expect(app.shows("text:Label")).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:374
test("T-039 supports 'aria-label'", async () => {
  const app = await openCase("aria-label");

  expect(app.shows("role:checkbox[Accept]")).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:403
// Partial port (port sheet T-041): description / input ids and
// aria-describedby have no NSH channel. Kept: the description is on screen
// exactly once and the Label still names the checkbox.
test("T-041 supports visible description", async () => {
  const app = await openCase("group-item-description");

  expect(app.count("text:Description")).toBe(1);
  expect(app.shows("role:checkbox[Label]")).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:448
// Partial port (port sheet T-044): the error message id and aria-describedby
// have no NSH channel. Kept: the text appears exactly once.
test("T-044 supports visible error message when invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:ErrorMessage")).toBe(true);
  expect(app.count("text:ErrorMessage")).toBe(1);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:467
test("T-045 should not be described by error message when not invalid", async () => {
  const app = await openCase("valid-error");

  expect(app.shows("text:ErrorMessage")).toBe(false);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:513
// Partial port (port sheet T-048): aria-readonly has no NSH channel. Kept: the
// selected marker stays on and no change is reported.
test("T-048 can be readonly", async () => {
  const app = await openCase("readonly");

  expect(app.shows("text:Checked")).toBe(true);

  await app.press("role:checkbox[Accept terms]");
  expect(app.shows("text:Checked")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:532
test("T-049 supports uncontrolled readonly", async () => {
  const app = await openCase("readonly-uncontrolled");

  expect(app.shows("text:Unchecked")).toBe(true);

  await app.press("role:checkbox[Accept terms]");
  expect(app.shows("text:Unchecked")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:564
// Partial port (port sheet T-051): the indicator node is always mounted in
// HeroUI (it just draws nothing while unchecked), so the two node-presence
// assertions are dropped. Kept: the marker appears and disappears with the
// selection.
test("T-051 should display indicator when 'checked'", async () => {
  const app = await openCase("indicator");

  expect(app.shows("text:✓")).toBe(false);

  await app.press("role:checkbox[Accept terms]");
  expect(app.shows("text:✓")).toBe(true);

  await app.press("role:checkbox[Accept terms]");
  expect(app.shows("text:✓")).toBe(false);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:592
// Rewritten port (port sheet T-052): the indicator's presence becomes the mixed
// marker its render prop draws.
test("T-052 should display indicator when 'indeterminate'", async () => {
  const app = await openCase("indeterminate");

  expect(app.shows("text:Mixed")).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:638
// Rewritten port (port sheet T-055): data-invalid becomes the FieldError text.
test("T-055 should have 'data-invalid' attribute when checkbox is invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:656
// Rewritten port (port sheet T-056): data-checked becomes the selected marker.
test("T-056 should have 'data-checked' attribute when checkbox is checked", async () => {
  const app = await openCase("default-selected");

  expect(app.shows("text:Checked")).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:674
// Rewritten port (port sheet T-057): data-indeterminate becomes the mixed
// marker the custom Indicator render prop draws.
test("T-057 should have 'data-indeterminate' attribute when checkbox is indeterminate", async () => {
  const app = await openCase("indeterminate");

  expect(app.shows("text:Mixed")).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:692
// Rewritten port (port sheet T-058): data-required on every part becomes the
// Content render prop's `isRequired()` (react-spectrum/packages/react-aria-components/src/Checkbox.tsx:224-261),
// drawn as a marker. The asterisk stays out of it: label.css:15 excludes
// checkbox item labels, so its scope is X-002.
test("T-058 should have 'data-required' attribute when checkbox is required", async () => {
  const app = await openCase("required");

  expect(app.shows("text:Required")).toBe(true);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:710
// Rewritten port (port sheet T-059): data-disabled becomes the content's
// enabled state.
test("T-059 should have 'data-disabled' attribute when checkbox is disabled", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("role:checkbox[Accept terms]")).toBe(false);
});

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:728
// Rewritten port (port sheet T-060): data-readonly becomes the read-only
// behaviour: a press leaves the marker unchanged.
test("T-060 should have 'data-readonly' attribute when checkbox is read only", async () => {
  const app = await openCase("readonly-uncontrolled");

  await app.press("role:checkbox[Accept terms]");

  expect(app.shows("text:Unchecked")).toBe(true);
});
