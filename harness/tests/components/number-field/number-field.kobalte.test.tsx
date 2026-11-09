import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * NumberField regression cases from Kobalte 0.13.14 (port sheet 4b, rows
 * T-011…T-053). Kobalte's `value` is the formatted string with a `rawValue`
 * side channel, while HeroUI's is a number whose display text is derived (port
 * sheet §5): every rewritten row below therefore asserts the number payload and
 * the commit timing of React Aria, not Kobalte's per-keystroke `"40"` string.
 * HeroUI wins the conflict, as section 0 of the port sheet says.
 *
 * The deleted rows are not here: T-013 / T-037's hidden input (no form in
 * NSH), T-015 / T-016 / T-018 / T-020 / T-021 / T-024 / T-025 (id machines),
 * T-026 / T-027 (data-* attributes).
 *
 * All cases run on the headless desktop (`platform: "windows"`); none needs Tab
 * focus movement, and the German locale comes from `open`'s `locale`.
 *
 * Upstream: kobalte/packages/core/src/number-field/number-field.test.tsx.
 */

type CaseParams = Record<string, string | number | boolean>;

function openCase(
  name: string,
  params: CaseParams = {},
  options: { locale?: string } = {},
): Promise<App> {
  return open("../../../number-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

// kobalte/packages/core/src/number-field/number-field.test.tsx:9
// Rewritten port of T-011: the default value renders as its formatted text, and
// typing appends to that text without committing. Enter commits, and the
// payload is the number 40 — Kobalte's `"40"` string and its per-keystroke
// onChange are both replaced by HeroUI's number + commit-on-blur/Enter contract.
test("T-011 should have a default value", async () => {
  const app = await openCase("log", { defaultValue: 4, minValue: 0 });

  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.value("id:nf-input")).toBe("4");

  await app.type("id:nf-input", "0");
  await app.submit("id:nf-input");

  const calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe(40);

  expect(app.value("id:nf-input")).toBe("40");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:30
// Rewritten port of T-012: a controlled value reports the commit but the parent
// never writes it back, so the field returns to the formatted controlled value.
test("T-012 should keep a controlled value", async () => {
  const app = await openCase("controlled", { initial: 4 });

  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.value("id:nf-input")).toBe("4");

  await app.type("id:nf-input", "0");
  await app.submit("id:nf-input");

  const calls = callsOf(app, "onChange");
  expect(calls).toHaveLength(1);
  expect(calls[0][0]).toBe(40);

  expect(app.value("id:nf-input")).toBe("4");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:65
// Partial port of T-014: the id, the `<label>` element and its `for` are DOM
// machinery NSH has none of; the visible label and the fact that its text names
// the input are kept.
test("T-014 should support a visible label", async () => {
  const app = await openCase("label");

  expect(app.shows("text:Favorite Number")).toBe(true);
  expect(app.shows("label:Favorite Number")).toBe(true);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:107
// T-017: with no Label the root's aria-label names the input.
test("T-017 should support aria-label", async () => {
  const app = await openCase("aria-label");

  expect(app.shows("label:My Favorite Number")).toBe(true);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:136
// Partial port of T-019: the four upstream assertions are all about generated
// ids and `aria-describedby`. What stays observable is the description's text
// on screen, once, next to a mounted input.
test("T-019 should support a visible description", async () => {
  const app = await openCase("description");

  expect(app.texts().filter((text) => text === "Description")).toHaveLength(1);
  expect(app.shows("id:nf-input")).toBe(true);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:181
// Partial port of T-022: same id machinery dropped as in T-019. The error text
// is visible exactly once while the field is invalid.
test("T-022 should support a visible error message when invalid", async () => {
  const app = await openCase("description-error");

  expect(app.texts().filter((text) => text === "ErrorMessage")).toHaveLength(1);
  expect(app.shows("id:nf-input")).toBe(true);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:200
// T-023: the visible half of "not described by the error message when not
// invalid" is that no such text is on screen.
test("T-023 should not show the error message when not invalid", async () => {
  const app = await openCase("valid-error");

  expect(app.shows("text:ErrorMessage")).toBe(false);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:280
// Rewritten port of T-028: `data-invalid` has no NSH counterpart, so the row
// asserts the result the attribute stood for — FieldError renders while the
// field is invalid.
test("T-028 should show the error message when invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:Max is 10")).toBe(true);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:295
// Rewritten port of T-029: `data-required` becomes the one visible effect of
// `isRequired`, the Label's asterisk.
test("T-029 should mark the label when required", async () => {
  const app = await openCase("required");

  expect(app.texts()).toContain("*");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:310
// Rewritten port of T-030: `data-disabled` becomes "the input takes no input".
test("T-030 should disable the input when disabled", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("id:nf-input")).toBe(false);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:325
// Rewritten port of T-031: `data-readonly` becomes the readonly behaviour. A
// readonly input refuses the step (the harness has no code for that, so the
// refusal is tolerated and the unchanged text is the assertion).
test("T-031 should keep the text when readonly", async () => {
  const app = await openCase("readonly");

  await app.type("id:nf-input", "5").catch(() => undefined);

  expect(app.value("id:nf-input")).toBe("10");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:340
// Rewritten port of T-032: Kobalte's `validationState` is not HeroUI's API;
// `isInvalid` is the equivalent entry, and its visible result is the error text.
test("T-032 should show the error message for an invalid field", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:Max is 10")).toBe(true);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:352
// Rewritten port of T-033: the three missing native attributes become three
// default behaviours — the input is editable, a typed value commits, and no
// required asterisk is drawn.
test("T-033 should be editable and not required by default", async () => {
  const app = await openCase("log");

  expect(app.enabled("id:nf-input")).toBe(true);

  await app.type("id:nf-input", "5");
  await app.submit("id:nf-input");

  const calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe(5);

  expect(app.texts()).not.toContain("*");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:366
// Partial port of T-034: `aria-required` has no field in AccessibilityState
// (port sheet §8); the asterisk is the required half that is visible.
test("T-034 should mark the label when required", async () => {
  const app = await openCase("required");

  expect(app.texts()).toContain("*");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:379
// Rewritten port of T-035: `disabled` / `aria-disabled` become the two
// observable faces of a disabled field — the input takes no input, and the
// stepper reports nothing.
test("T-035 should disable input and stepper when disabled", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("id:nf-input")).toBe(false);

  await expect(app.press("id:nf-inc")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:392
// Rewritten port of T-036: `readonly` / `aria-readonly` become "the input takes
// no input and its text stays".
test("T-036 should refuse edits when readonly", async () => {
  const app = await openCase("readonly");

  expect(app.enabled("id:nf-input")).toBe(false);

  await app.type("id:nf-input", "5").catch(() => undefined);
  expect(app.value("id:nf-input")).toBe("10");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:405
// Partial port of T-037: the hidden-input half is dropped (HeroUI has no such
// part and NSH has no form). The visible half is the typed text changing at
// once while nothing is committed.
test("T-037 should sync the input text while typing", async () => {
  const app = await openCase("log", { defaultValue: 4 });

  expect(app.value("id:nf-input")).toBe("4");

  await app.type("id:nf-input", "0");
  expect(app.value("id:nf-input")).toBe("40");

  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:425
// T-038: each ArrowUp commits one `step`, and the text is re-formatted.
test("T-038 should increment by step on ArrowUp", async () => {
  const app = await openCase("step", { defaultValue: 0 });

  await app.press("id:nf-input");

  await app.keyboard.press("arrowup");
  expect(app.value("id:nf-input")).toBe("4");

  await app.keyboard.press("arrowup");
  expect(app.value("id:nf-input")).toBe("8");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:449
// T-039: the ArrowDown mirror of T-038.
test("T-039 should decrement by step on ArrowDown", async () => {
  const app = await openCase("step", { defaultValue: 8 });

  await app.press("id:nf-input");

  await app.keyboard.press("arrowdown");
  expect(app.value("id:nf-input")).toBe("4");

  await app.keyboard.press("arrowdown");
  expect(app.value("id:nf-input")).toBe("0");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:473
// Rewritten port of T-040: `largeStep` is Kobalte-only and RAC's PageUp is one
// step like ArrowUp (`useNumberField` passes no `onIncrementPage`).
test("T-040 should increment by one step on PageUp", async () => {
  const app = await openCase("step", { defaultValue: 0 });

  await app.press("id:nf-input");

  await app.keyboard.press("pageup");
  expect(app.value("id:nf-input")).toBe("4");

  await app.keyboard.press("pageup");
  expect(app.value("id:nf-input")).toBe("8");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:497
// Rewritten port of T-041: the PageDown mirror of T-040.
test("T-041 should decrement by one step on PageDown", async () => {
  const app = await openCase("step", { defaultValue: 8 });

  await app.press("id:nf-input");

  await app.keyboard.press("pagedown");
  expect(app.value("id:nf-input")).toBe("4");

  await app.keyboard.press("pagedown");
  expect(app.value("id:nf-input")).toBe("0");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:521
// T-042: End goes to the maximum.
test("T-042 should go to maxValue on End", async () => {
  const app = await openCase("bounds");

  await app.press("id:nf-input");
  await app.keyboard.press("end");

  expect(app.value("id:nf-input")).toBe("100");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:539
// T-043: Home goes to the minimum.
test("T-043 should go to minValue on Home", async () => {
  const app = await openCase("bounds");

  await app.press("id:nf-input");
  await app.keyboard.press("home");

  expect(app.value("id:nf-input")).toBe("-100");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:557
// Partial port of T-044: the hidden input's raw "1000" is dropped; the visible
// input's formatted text is the locale's grouping.
test("T-044 should format the value on mount", async () => {
  const app = await openCase("format");

  expect(app.value("id:nf-input")).toBe("1,000");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:572
// Partial port of T-045: the hidden input half is dropped; stepping re-formats
// the visible text.
test("T-045 should format the value on change", async () => {
  const app = await openCase("format");

  await app.press("id:nf-input");
  await app.keyboard.press("arrowup");

  expect(app.value("id:nf-input")).toBe("1,001");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:593
// Rewritten port of T-046: `onRawValueChange` is Kobalte-only; HeroUI's
// onChange already carries the number.
test("T-046 should report the numeric value on change", async () => {
  const app = await openCase("format");

  await app.press("id:nf-input");
  await app.keyboard.press("arrowup");

  const calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe(1001);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:613
// T-047: the increment button steps by `step`.
test("T-047 should increment on the increment button", async () => {
  const app = await openCase("step", { defaultValue: 0 });

  expect(app.value("id:nf-input")).toBe("0");

  await app.press("id:nf-inc");
  expect(app.value("id:nf-input")).toBe("4");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:631
// T-048: the decrement button steps by `step`.
test("T-048 should decrement on the decrement button", async () => {
  const app = await openCase("step", { defaultValue: 4 });

  expect(app.value("id:nf-input")).toBe("4");

  await app.press("id:nf-dec");
  expect(app.value("id:nf-input")).toBe("0");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:649
// T-049: pressing a stepper moves the focus to the input (RAC's
// `onButtonPressStart`), which is what keeps the keyboard usable after a click.
test("T-049 should focus the input on the increment button", async () => {
  const app = await openCase("log", { defaultValue: 10 });

  await app.press("id:nf-inc");

  expect(callsOf(app, "onFocus")).toHaveLength(1);
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:665
// T-050: the locale decides the decimal separator for a controlled value.
test("T-050 should format a decimal value for the locale", async () => {
  const app = await openCase("decimal", { controlled: true }, { locale: "de" });

  expect(app.value("id:nf-input")).toBe("1,1");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:679
// Rewritten port of T-051: `rawValue` is Kobalte-only; `defaultValue` is the
// HeroUI entry that carries the same 1.1.
test("T-051 should format a decimal default value for the locale", async () => {
  const app = await openCase("decimal", {}, { locale: "de" });

  expect(app.value("id:nf-input")).toBe("1,1");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:693
// T-052: 1.1 + 1 is 2 in the German locale, not 2.1000000000000001.
test("T-052 should increment a decimal value for the locale", async () => {
  const app = await openCase("decimal", {}, { locale: "de" });

  await app.press("id:nf-inc");
  expect(app.value("id:nf-input")).toBe("2");
});

// kobalte/packages/core/src/number-field/number-field.test.tsx:711
// T-053: 1.1 - 1 is 1 in the German locale.
test("T-053 should decrement a decimal value for the locale", async () => {
  const app = await openCase("decimal", {}, { locale: "de" });

  await app.press("id:nf-dec");
  expect(app.value("id:nf-input")).toBe("1");
});
