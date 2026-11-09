import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 cases that still describe a contract NSH can express, per
 * port sheet 4b (T-020, T-023 … T-030, T-032, T-035, T-037, T-040, T-041,
 * T-044, T-045, T-047 … T-051).
 *
 * Kobalte's Switch owns a hidden `<input role="switch">` and its DOM ids; NSH
 * has none of that, so the role, the checked state, the visible label, the
 * description and the error message are asserted where a user can observe them
 * on the content view. The callback parameters come from the fixture's probe.
 */

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
  options: { platform?: "windows" | "web" } = {},
) {
  return open("../../../switch.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

const CONTROL = "role:switch[Enable notifications]";

// kobalte/packages/core/src/switch/switch.test.tsx:110
test("T-020 should set input role to switch", async () => {
  const app = await openScenario("switch/basic");

  expect(app.shows("role:switch")).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * Selection
 * -----------------------------------------------------------------------------------------------*/

// kobalte/packages/core/src/switch/switch.test.tsx:146
test("T-023 ensure default unchecked can be checked", async () => {
  const app = await openCase("log");

  expect(app.shows("text:Off")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);

  await app.press(CONTROL);
  expect(app.shows("text:On")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true]]);

  await app.press(CONTROL);
  expect(callsOf(app, "onChange")).toEqual([[true], [false]]);
});

// kobalte/packages/core/src/switch/switch.test.tsx:170
test("T-024 can be default checked", async () => {
  const app = await openCase("selected");

  expect(app.shows("text:On")).toBe(true);

  await app.press(CONTROL);
  expect(callsOf(app, "onChange")).toEqual([[false]]);
  expect(app.shows("text:Off")).toBe(true);
});

// kobalte/packages/core/src/switch/switch.test.tsx:188
test("T-025 can be controlled checked", async () => {
  const app = await openCase("controlled-selected");

  expect(app.shows("text:On")).toBe(true);

  await app.press(CONTROL);
  expect(app.shows("text:On")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[false]]);
});

// kobalte/packages/core/src/switch/switch.test.tsx:206
test("T-026 can be controlled unchecked", async () => {
  const app = await openCase("controlled");

  expect(app.shows("text:Off")).toBe(true);

  await app.press(CONTROL);
  expect(app.shows("text:Off")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true]]);
});

// kobalte/packages/core/src/switch/switch.test.tsx:224
test("T-027 can be checked by clicking on the control", async () => {
  const app = await openCase("log");

  expect(app.shows("text:Off")).toBe(true);

  await app.press(CONTROL);
  expect(app.shows("text:On")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true]]);
});

/* -------------------------------------------------------------------------------------------------
 * Disabled, invalid, read only
 * -----------------------------------------------------------------------------------------------*/

// kobalte/packages/core/src/switch/switch.test.tsx:265
test("T-029 can be disabled", async () => {
  const app = await openCase("disabled");

  expect(app.enabled(CONTROL)).toBe(false);
  expect(app.shows(CONTROL)).toBe(true);

  await expect(app.press(CONTROL)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// kobalte/packages/core/src/switch/switch.test.tsx:288
// Rewritten port (port sheet T-030): `aria-invalid` has no NSH counterpart; its
// visible effect is the FieldError message the field root makes mount.
test("T-030 can be invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/switch/switch.test.tsx:313
// Partial port (port sheet T-032): `for`, `aria-labelledby` and the
// HTMLLabelElement type are dropped. What remains: the registered accessible
// name, the role with that name, and the visible text.
test("T-032 supports visible label", async () => {
  const app = await openScenario("switch/basic");

  expect(app.shows("label:Enable notifications")).toBe(true);
  expect(app.shows("role:switch[Enable notifications]")).toBe(true);
  expect(app.texts()).toContain("Enable notifications");
});

// kobalte/packages/core/src/switch/switch.test.tsx:355
test("T-035 supports 'aria-label'", async () => {
  const app = await openCase("without-label");

  expect(app.shows("role:switch[My Label]")).toBe(true);
});

// kobalte/packages/core/src/switch/switch.test.tsx:384
// Partial port (port sheet T-037): the description's DOM id and the input's
// `aria-describedby` are dropped; the registration as accessibilityHint has no
// nsh/test query. The visible half stays.
test("T-037 supports visible description", async () => {
  const app = await openScenario("switch/description");
  const description = "text:Allow others to see your profile information";

  expect(app.shows(description)).toBe(true);
  expect(app.count(description)).toBe(1);
  expect(app.shows("text:Public profile")).toBe(true);
  expect(app.shows("role:switch")).toBe(true);
});

// kobalte/packages/core/src/switch/switch.test.tsx:429
// Partial port (port sheet T-040): the error message's DOM id, uniqueness and
// `aria-describedby` are dropped. The message is visible once, the role keeps
// its registered name, and the label is on screen.
test("T-040 supports visible error message when invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:ErrorMessage")).toBe(true);
  expect(app.count("text:ErrorMessage")).toBe(1);
  expect(app.shows(CONTROL)).toBe(true);
  expect(app.texts()).toContain("Enable notifications");
});

// kobalte/packages/core/src/switch/switch.test.tsx:448
test("T-041 should not be described by error message when not invalid", async () => {
  const app = await openCase("valid-error");

  expect(app.shows("text:ErrorMessage")).toBe(false);
});

// kobalte/packages/core/src/switch/switch.test.tsx:494
test("T-044 can be read only", async () => {
  const app = await openCase("readonly-selected");

  expect(app.shows("text:On")).toBe(true);

  await app.press(CONTROL);
  expect(app.shows("text:On")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.enabled(CONTROL)).toBe(true);
});

// kobalte/packages/core/src/switch/switch.test.tsx:513
test("T-045 supports uncontrolled read only", async () => {
  const app = await openCase("readonly");

  expect(app.shows("text:Off")).toBe(true);

  await app.press(CONTROL);
  expect(app.shows("text:Off")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

/* -------------------------------------------------------------------------------------------------
 * data-* attribute cases, rewritten to the visible effect behind each one
 * -----------------------------------------------------------------------------------------------*/

// kobalte/packages/core/src/switch/switch.test.tsx:550
// Rewritten port (port sheet T-047): data-invalid has no NSH channel; the field
// makes its error message mount instead.
test("T-047 should have 'data-invalid' attribute when switch is invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/switch/switch.test.tsx:568
// Rewritten port (port sheet T-048): data-checked becomes the render prop's
// visible state, which starts Off on an unchecked switch.
test("T-048 should have 'data-checked' attribute when switch is checked", async () => {
  const app = await openCase("selected");

  expect(app.shows("text:On")).toBe(true);
});

// kobalte/packages/core/src/switch/switch.test.tsx:586
// Rewritten port (port sheet T-049): data-required becomes the asterisk the
// FieldContext adds to the Label.
test("T-049 should have 'data-required' attribute when switch is required", async () => {
  const app = await openCase("required");

  expect(app.shows("text:/^Enable notifications\\*/")).toBe(true);
});

// kobalte/packages/core/src/switch/switch.test.tsx:604
// Rewritten port (port sheet T-050): data-disabled becomes the disabled input
// state of the content view.
test("T-050 should have 'data-disabled' attribute when switch is disabled", async () => {
  const app = await openCase("disabled");

  expect(app.enabled(CONTROL)).toBe(false);
});

// kobalte/packages/core/src/switch/switch.test.tsx:622
// Rewritten port (port sheet T-051): data-readonly becomes the read-only
// behavior; the switch starts selected so staying On can fail.
test("T-051 should have 'data-readonly' attribute when switch is read only", async () => {
  const app = await openCase("readonly-selected");

  await app.press(CONTROL);
  expect(app.shows("text:On")).toBe(true);
});
