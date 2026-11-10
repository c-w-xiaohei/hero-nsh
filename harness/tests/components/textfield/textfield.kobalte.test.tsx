import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * TextField cases copied from Kobalte 0.13.14 (port sheet 4b, rows T-024 …
 * T-049). Kobalte's TextField is one component whose Label / Description /
 * ErrorMessage are sub-parts; this library follows HeroUI 3.2.7, where the three
 * are separate components wired through the field's contexts, so only the
 * visible half of the Kobalte cases exists here (port sheet 4b, §5).
 *
 * Deleted rows have no test: `name` and `data-*` have no NSH counterpart,
 * `aria-labelledby` / `aria-describedby` / `aria-required` / `aria-readonly`
 * are accepted with no effect, `submitOnEnter` is a Kobalte-only prop, and the
 * form-submission rows assert a `<form>` this library does not have. The rows
 * below are the ones the sheet keeps, rewritten to the fact they stand for.
 *
 * All rows run on the headless desktop (`platform: "windows"`, the default).
 */

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}): Promise<App> {
  return open("../../../textfield.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

// kobalte/packages/core/src/text-field/text-field.test.tsx:11
// T-024: the default value seeds the text, and the first edit reports the whole
// new text.
test("T-024 can have a default value", async () => {
  const app = await openCase("default-value");

  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.value("id:name")).toBe("cat");

  await app.type("id:name", "s");

  const calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe("cats");
  expect(app.value("id:name")).toBe("cats");
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:32
// T-025: a controlled value reports the edit and keeps the owner's text; the
// fixture's parent never writes back, as upstream's `value="cat"` does not.
test("T-025 value can be controlled", async () => {
  const app = await openCase("controlled", { initial: "cat" });

  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.value("id:name")).toBe("cat");

  await app.type("id:name", "s");

  const calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe("cats");
  expect(app.value("id:name")).toBe("cat");
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:67
// Partial port of T-027 (port sheet): the Label's text is visible, and it is
// registered as the input's accessible name — the same fact `aria-labelledby`
// carried upstream. The id / `HTMLLabelElement` / `for` assertions have no NSH
// counterpart.
test("T-027 supports visible label", async () => {
  const app = await openCase("default-value");

  expect(app.texts()).toContain("Favorite Pet");
  expect(app.shows("label:Favorite Pet")).toBe(true);
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:109
// T-030: without a Label, `aria-label` names the input.
test("T-030 supports 'aria-label'", async () => {
  const app = await openCase("aria-label");

  expect(app.shows("label:My Favorite Pet")).toBe(true);
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:138
// Partial port of T-032 (port sheet): the Description's text is visible, once,
// and the input is there (its fixture `testID`). The id, `aria-describedby`
// and id-uniqueness assertions have no NSH counterpart.
test("T-032 supports visible description", async () => {
  const app = await openCase("description");

  expect(app.texts()).toContain("Visible to other users");
  expect(app.count("text:Visible to other users")).toBe(1);
  expect(app.shows("id:name")).toBe(true);
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:183
// Partial port of T-035 (port sheet): the error text is visible, once, and the
// input is there. The id / `aria-describedby` assertions have no NSH
// counterpart.
test("T-035 supports visible error message when invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:Password must be longer than 8 characters")).toBe(true);
  expect(app.count("text:Password must be longer than 8 characters")).toBe(1);
  expect(app.shows("id:name")).toBe(true);
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:202
// T-036: a valid field shows no error text.
test("T-036 should not be described by error message when not invalid", async () => {
  const app = await openCase("valid-error");

  expect(app.shows("text:Password must be longer than 8 characters")).toBe(false);
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:282
// Rewritten port of T-041 (port sheet): `data-invalid` becomes its visible
// result, the error text. The TextArea field carries the same state through the
// same context, so the case runs on it.
test("T-041 should have 'data-invalid' attribute when invalid", async () => {
  const app = await openCase("textarea-invalid");

  expect(app.shows("text:Bio is required")).toBe(true);
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:297
// Rewritten port of T-042 (port sheet): `data-required` becomes its only
// visible effect, the Label's asterisk.
test("T-042 should have 'data-required' attribute when required", async () => {
  const app = await openCase("required");

  expect(app.texts().join(" ")).toContain("*");
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:312
// Rewritten port of T-043 (port sheet): `data-disabled` becomes the input's
// disabled state.
test("T-043 should have 'data-disabled' attribute when disabled", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("id:name")).toBe(false);
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:327
// Rewritten port of T-044 (port sheet): `data-readonly` becomes the read-only
// behavior, an edit that does not change the text.
test("T-044 should have 'data-readonly' attribute when readonly", async () => {
  const app = await openCase("readonly");

  await app.type("id:name", "x").catch(() => undefined);
  expect(app.value("id:name")).toBe("cat");
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:342
// Rewritten port of T-045 (port sheet): Kobalte's `validationState` is not in
// HeroUI's API; its equivalent entry point is `isInvalid`, whose visible result
// is the error text.
test("T-045 sets 'aria-invalid' on input when 'validationState=invalid'", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:Password must be longer than 8 characters")).toBe(true);
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:354
// Rewritten port of T-046 (port sheet): the three absent attributes become the
// default behavior — the input takes input, typing changes the text, and no
// required asterisk is shown.
test("T-046 input should not have 'required', 'disabled' or 'readonly' attributes by default", async () => {
  const app = await openCase("log");

  expect(app.enabled("id:name")).toBe(true);

  await app.type("id:name", "Ada");
  expect(app.value("id:name")).toBe("Ada");

  expect(app.texts()).not.toContain("*");
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:368
// Partial port of T-047 (port sheet): the required state's visible effect is
// the Label's asterisk; `aria-required` has no NSH counterpart.
test("T-047 sets 'required' and 'aria-required' on input when 'isRequired' is true", async () => {
  const app = await openCase("required");

  expect(app.texts().join(" ")).toContain("*");
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:381
// Rewritten port of T-048 (port sheet): the two attributes become the two
// observable faces of the same state — disabled, and an edit that is refused.
test("T-048 sets 'disabled' and 'aria-disabled' on input when 'isDisabled' is true", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("id:name")).toBe(false);
  await app.type("id:name", "x").catch(() => undefined);
  expect(app.value("id:name")).toBe("");
});

// kobalte/packages/core/src/text-field/text-field.test.tsx:394
// Rewritten port of T-049 (port sheet): `aria-readonly` has no counterpart; the
// state is read from the input refusing edits while keeping its text.
test("T-049 sets 'readonly' and 'aria-readonly' on input when 'isReadOnly' is true", async () => {
  const app = await openCase("readonly");

  expect(app.enabled("id:name")).toBe(false);
  await app.type("id:name", "x").catch(() => undefined);
  expect(app.value("id:name")).toBe("cat");
});
