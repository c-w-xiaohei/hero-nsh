import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * NumberField regression cases from HeroUI 3.2.7 (port sheet 4b, rows T-001…
 * T-009). The stories are covered by the shared scenarios; every case here
 * reads a callback back or targets one part by `testID`, so it opens the
 * NSH-only fixture at harness/number-field.fixtures.tsx (port sheet 4b.3).
 *
 * All cases run on the headless desktop (`platform: "windows"`), which the port
 * sheet gives for these rows: typing focuses an input on every platform,
 * `app.press` drives the stepper buttons, and nothing here needs Tab focus
 * movement. T-005 and T-010 move the focus with Tab, so they live in
 * number-field.heroui.web.test.tsx.
 *
 * `getByRole("textbox", {name})` becomes `label:` (the name reaches the
 * input), `[data-slot=…]` becomes the fixture's `testID`, and the DOM-only
 * assertions (`aria-roledescription`, `data-invalid`, `data-disabled`, BEM
 * classes) are dropped with the reason recorded in each row.
 */

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}): Promise<App> {
  return open("../../../number-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/number-field/number-field.test.tsx:35
// Partial port of T-001: the accessible name half is kept, the
// `aria-roledescription="Number field"` half is dropped because NSH has no
// roledescription channel (port sheet §8) and AccessibilityRole has no
// `textbox`. The Label's text reaches the input through FieldContext, so
// matching `label:Width` is the same fact the upstream role query asserts.
test("T-001 should render number textbox with accessible name", async () => {
  const app = await openCase("parts");

  expect(app.shows("label:Width")).toBe(true);
});

// heroui/packages/react/tests/components/number-field/number-field.test.tsx:45
// Partial port of T-002: the upstream BEM class assertion is dropped (D18) and
// the four `[data-slot=…]` queries become one `testID` per part. The last two
// also prove the buttons render inside the group.
test("T-002 should expose the compound parts", async () => {
  const app = await openCase("parts");

  expect(app.shows("id:nf-group")).toBe(true);
  expect(app.shows("id:nf-input")).toBe(true);
  expect(app.shows("id:nf-group >> id:nf-dec")).toBe(true);
  expect(app.shows("id:nf-group >> id:nf-inc")).toBe(true);
});

// heroui/packages/react/tests/components/number-field/number-field.test.tsx:57
// Partial port of T-003 (the upstream `it.each` runs four parameter sets): the
// `slot="increment"` / `slot="decrement"` attribute queries become `testID`
// lookups. NSH has no slot channel, but the composition contract they carry —
// a group with either button, both or neither — is asserted one for one.
test("T-003 should support every stepper composition", async () => {
  const compositions = [
    { hasDecrement: false, hasIncrement: false },
    { hasDecrement: true, hasIncrement: false },
    { hasDecrement: false, hasIncrement: true },
    { hasDecrement: true, hasIncrement: true },
  ];

  for (const composition of compositions) {
    const app = await openCase("composition", composition);

    expect(app.shows("id:nf-dec")).toBe(composition.hasDecrement);
    expect(app.shows("id:nf-inc")).toBe(composition.hasIncrement);
  }
});

// heroui/packages/react/tests/components/number-field/number-field.test.tsx:108
// T-006: each button press commits one step through onChange. The payload is
// HeroUI's number.
test("T-006 should increment and decrement via the stepper buttons", async () => {
  const app = await openCase("log", { defaultValue: 10, minValue: 0 });

  await app.press("id:nf-inc");
  let calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe(11);

  await app.press("id:nf-dec");
  calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe(10);
});

// heroui/packages/react/tests/components/number-field/number-field.test.tsx:124
// T-007: ArrowUp / ArrowDown reach the field while the input holds the focus.
// `app.press` on an Input focuses it, which is what makes the keymap binding
// live (port sheet §5, `when: "always"`).
test("T-007 should support ArrowUp and ArrowDown on the input", async () => {
  const app = await openCase("log", { defaultValue: 5, minValue: 0 });

  await app.press("id:nf-input");

  await app.keyboard.press("arrowup");
  let calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe(6);

  await app.keyboard.press("arrowdown");
  calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe(5);
});

// heroui/packages/react/tests/components/number-field/number-field.test.tsx:138
// Partial port of T-008: the root `data-invalid` attribute is dropped. The
// three behaviour halves stay, and the fourth assertion pins the visible fact
// the attribute stood for at the upper bound: the button is disabled there and
// a press is refused instead of silently doing nothing.
test("T-008 should support maxValue and invalid state", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:Max is 10")).toBe(true);

  await app.press("id:nf-inc");
  const calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe(10);

  await expect(app.press("id:nf-inc")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(1);

  expect(app.enabled("id:nf-inc")).toBe(false);
});

// Regression X-001, evidence:
//   src/components/number-field/create-number-field-state.ts:469-519 (stepFrom / canStep)
//   src/components/number-field/create-number-field-state.ts:272 (numberValue)
// Upstream: @react-stately/numberfield/src/useNumberFieldState.ts:243-265 (safeNextStep
// starts from parsedValue; an empty field lands on minValue / maxValue) and :308-330
// (canIncrement / canDecrement read parsedValue).
test("X-001 steps from the parsed input text, not the last committed value", async () => {
  // An empty field with minValue 0 increments onto minValue itself, as upstream does.
  let app = await openCase("log", { minValue: 0 });
  await app.press("id:nf-input");
  await app.keyboard.press("arrowup");
  expect(app.value("id:nf-input")).toBe("0");

  // An empty field with maxValue 100 decrements onto maxValue itself.
  app = await openCase("log", { maxValue: 100 });
  await app.press("id:nf-input");
  await app.keyboard.press("arrowdown");
  expect(app.value("id:nf-input")).toBe("100");

  // A step after typing continues from the text in the field (57), not from the
  // committed value (5), whose step would land on 6.
  app = await openCase("log", { defaultValue: 5, minValue: 0 });
  expect(app.value("id:nf-input")).toBe("5");
  await app.type("id:nf-input", "7");
  expect(app.value("id:nf-input")).toBe("57");
  await app.keyboard.press("arrowup");
  expect(app.value("id:nf-input")).toBe("58");

  // canDecrement reads the parsed text too: 0 at minValue 0 disables the button,
  // while the committed 5 would leave it enabled.
  app = await openCase("log", { defaultValue: 5, minValue: 0 });
  await app.clear("id:nf-input");
  await app.type("id:nf-input", "0");
  expect(app.value("id:nf-input")).toBe("0");
  expect(app.enabled("id:nf-dec")).toBe(false);
});

// Regression X-002, evidence:
//   src/components/number-field/create-number-field-state.ts:242-268 (initial snap)
// Upstream: @react-stately/numberfield/src/useNumberFieldState.ts:147-153 snaps a
// controlled value and, only under commitBehavior "snap", defaultValue in render.
// The snap writes no onChange.
test("X-002 snaps the initial value in render and leaves validate defaults raw", async () => {
  // Controlled value -5, minValue 0: clamps to 0 without a step.
  let app = await openCase("snap", { controlled: true, minValue: 0, value: -5 });
  expect(app.value("id:nf-input")).toBe("0");
  expect(callsOf(app, "onChange")).toHaveLength(0);

  // Controlled value 1.5, step 0.1, maxValue 1: snaps then clamps to 1 (100%).
  app = await openCase("snap", {
    controlled: true,
    maxValue: 1,
    minValue: 0,
    percent: true,
    step: 0.1,
    value: 1.5,
  });
  expect(app.value("id:nf-input")).toBe("100%");

  // Controlled value 1.5, step 1: snaps to the nearest step (2).
  app = await openCase("snap", { controlled: true, step: 1, value: 1.5 });
  expect(app.value("id:nf-input")).toBe("2");
  expect(callsOf(app, "onChange")).toHaveLength(0);

  // defaultValue snaps under the default commitBehavior "snap"...
  app = await openCase("snap", { defaultValue: 1.5, step: 1 });
  expect(app.value("id:nf-input")).toBe("2");

  // ...but stays raw under "validate".
  app = await openCase("snap", { commitBehavior: "validate", defaultValue: 1.5, step: 1 });
  expect(app.value("id:nf-input")).toBe("1.5");
});

// heroui/packages/react/tests/components/number-field/number-field.test.tsx:178
// Partial port of T-009: the root `data-disabled` attribute is dropped. The
// input does not take input and the increment button reports no change.
test("T-009 should support disabled state", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("id:nf-input")).toBe(false);

  await expect(app.press("id:nf-inc")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
});
