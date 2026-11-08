import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * The Kobalte rows of port sheet 4b all assert DOM ids or `data-*` attributes
 * on the error message, and NSH has neither. Each case keeps the half nsh/test
 * can see: the message appearing only while the field is invalid, the error
 * text being registered with the field, and (T-013) the danger tone.
 *
 * The fixture supplies FieldErrorContext because no field root exists in this
 * unit yet; `id` maps to nativeID, which nsh/test cannot read.
 */
function openCase(name: string, params: Record<string, string | number | boolean> = {}) {
  return open("../../../field-error.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

// kobalte/packages/core/src/form-control/create-form-control.test.tsx:34
// Partial port (port sheet T-004): the DOM id suffixes (`*-label`,
// `*-description`, `*-error-message`) are dropped. What remains is the message
// showing only when invalid and its text reaching the field's registration.
test("T-004 should generate default ids", async () => {
  const invalid = await openCase("invalid", { message: "ErrorMessage" });

  expect(invalid.shows("text:ErrorMessage")).toBe(true);
  expect(callsOf(invalid, "field-error.registered")).toEqual([["ErrorMessage"]]);

  const valid = await openCase("valid", { message: "ErrorMessage" });

  expect(valid.shows("text:ErrorMessage")).toBe(false);
});

// kobalte/packages/core/src/form-control/create-form-control.test.tsx:52
// Partial port (port sheet T-005): `id="foo"` is accepted (mapped to nativeID,
// which nsh/test cannot query) and must not break the message; the id
// derivation (`foo-error-message`) is dropped.
test("T-005 should generate ids based on form control id", async () => {
  const invalid = await openCase("with-id", { message: "ErrorMessage" });

  expect(invalid.shows("text:ErrorMessage")).toBe(true);
  expect(callsOf(invalid, "field-error.registered")).toEqual([["ErrorMessage"]]);

  const valid = await openCase("valid", { message: "ErrorMessage" });

  expect(valid.shows("text:ErrorMessage")).toBe(false);
});

// kobalte/packages/core/src/form-control/create-form-control.test.tsx:70
// Partial port (port sheet T-006): a custom `id` is accepted and must not break
// the message; the `custom-error-message-id` equality assertion is dropped.
test("T-006 supports custom ids", async () => {
  const invalid = await openCase("custom-id", { message: "ErrorMessage" });

  expect(invalid.shows("text:ErrorMessage")).toBe(true);
  expect(callsOf(invalid, "field-error.registered")).toEqual([["ErrorMessage"]]);

  const valid = await openCase("valid", { message: "ErrorMessage" });

  expect(valid.shows("text:ErrorMessage")).toBe(false);
});

// kobalte/packages/core/src/form-control/create-form-control.test.tsx:194
// Partial port (port sheet T-013): the `data-invalid` / `data-required` /
// `data-disabled` / `data-readonly` attribute assertions are dropped. What
// remains: the invalid message shows, its text is registered with the field,
// and its tone is the theme's danger color, not the toggle fields' muted one.
// theme/hero-nsh.theme.json light: danger oklch(0.6532 0.2328 25.74) resolves
// to #ff383cff, muted oklch(0.5517 0.0138 285.94) to #71717aff.
test("T-013 should add 'data-invalid' attribute on error message when form control is invalid", async () => {
  const app = await openCase("invalid", { message: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(true);
  expect(callsOf(app, "field-error.registered")).toEqual([["ErrorMessage"]]);

  const color = app.spanStyle("text:ErrorMessage").color;

  expect(color).toBe("#ff383cff");
  expect(color).not.toBe("#71717aff");
});

// kobalte/packages/core/src/form-control/create-form-control.test.tsx:209
// Partial port (port sheet T-014): the `data-required` attribute assertion is
// dropped; a required invalid field still shows the message.
test("T-014 should add 'data-required' attribute on error message when form control is invalid", async () => {
  const app = await openCase("required", { message: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/form-control/create-form-control.test.tsx:221
// Partial port (port sheet T-015): the `data-disabled` attribute assertion is
// dropped; a disabled invalid field still shows the message.
test("T-015 should add 'data-disabled' attribute on error message when form control is invalid", async () => {
  const app = await openCase("disabled", { message: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/form-control/create-form-control.test.tsx:233
// Partial port (port sheet T-016): the `data-readonly` attribute assertion is
// dropped; a readOnly invalid field still shows the message.
test("T-016 should add 'data-readonly' attribute on error message when form control is invalid", async () => {
  const app = await openCase("readonly", { message: "ErrorMessage" });

  expect(app.shows("text:ErrorMessage")).toBe(true);
});
