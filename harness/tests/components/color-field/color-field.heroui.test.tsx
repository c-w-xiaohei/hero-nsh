import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * ColorField regression cases from HeroUI 3.2.7 (port sheet 4b.1 and 4b.2).
 * The stories are covered by the shared scenarios; every case below reads a
 * callback back, needs a writable controlled value, moves the focus away from
 * the field or targets one part by `testID`, so it opens the NSH-only fixture
 * at harness/color-field.fixtures.tsx (port sheet 4b.3).
 *
 * All cases run on the headless desktop (`platform: "windows"`), which the port
 * sheet gives for these rows: typing focuses an input on every platform,
 * typing into the outside input moves the focus away from the field, and
 * nothing here needs Tab focus movement. T-012 moves the focus with Tab, so it lives in
 * color-field.heroui.web.test.tsx.
 *
 * Translation choices, one row at a time (SOP 3.2):
 *   `getByRole("textbox", {name})` -> `label:` (the Label's text reaches the
 *   input), `[data-slot=...]` -> the fixture's `testID`, DOM-only assertions
 *   (`data-required`, BEM classes, `data-focus-visible`) are dropped with the
 *   reason recorded in each row. The fixture records a Color as the hex string
 *   `toString("hex")` and a channel as its `getChannelValue(...)` number,
 *   because `probe` keeps only JSON-serializable payloads.
 */

type CaseParams = Record<string, string | number | boolean>;

function openCase(name: string, params: CaseParams = {}): Promise<App> {
  return open("../../../color-field.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function lastLayout(app: App, name: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

// heroui/packages/react/tests/components/color-field/color-field.test.tsx:29
// T-001: `getByRole("textbox", {name: "Color"})` also proves the Label's text
// names the input; `label:Color` is the same fact here, and the value proves
// the default color was formatted as an uppercase hex string.
test("T-001 should expose accessible name via Label", async () => {
  const app = await openCase("basic");

  expect(app.shows("label:Color")).toBe(true);
  expect(app.value("label:Color")).toBe("#0485F7");
});

// heroui/packages/react/tests/components/color-field/color-field.test.tsx:62
// Rewritten port of T-004: the upstream `color-field--full-width` class
// assertion (D18) becomes its visible effect, the width. Both roots are
// measured through onLayout in a 400-point column: fullWidth fills it, the
// default field shrinks to its group.
test("T-004 should support fullWidth as the root's width", async () => {
  const app = await openCase("full-width");

  // A real host applies the first layout a frame after mount.
  await app.wait(20);

  const full = lastLayout(app, "full");
  const normal = lastLayout(app, "default");

  expect(full.width).toBe(400);
  expect(normal.width).toBeLessThan(400);
});

// heroui/packages/react/tests/components/color-field/color-field.test.tsx:70
// T-005: typing only writes the input text; the value is committed on blur, and
// typing into the outside input is the blur. Nothing reaches onChange before it.
test("T-005 should type a hex value and commit it on blur", async () => {
  const app = await openCase("controlled");

  await app.clear("id:color-input");
  expect(callsOf(app, "onChange")).toHaveLength(0);

  await app.type("id:color-input", "#22c55e");
  expect(callsOf(app, "onChange")).toHaveLength(0);

  // An Input takes the focus from a step that types into it; a press on an
  // Input is not a pressable step.
  await app.type("id:outside", "x");

  const calls = callsOf(app, "onChange");
  expect(calls.length).toBeGreaterThanOrEqual(1);
  expect(String(calls[calls.length - 1][0]).toLowerCase()).toBe("#22c55e");
});

// heroui/packages/react/tests/components/color-field/color-field.test.tsx:85
// T-006: the upstream `rerender` with another `value` becomes the fixture's
// signal and its `set-value` button. A controlled value change rewrites the
// displayed text.
test("T-006 should support controlled value", async () => {
  const app = await openCase("controlled");

  expect(app.value("id:color-input")).toBe("#0485F7");

  await app.press("id:set-value");
  await app.wait(20);

  expect(app.value("id:color-input")).toBe("#EF4444");
});

// heroui/packages/react/tests/components/color-field/color-field.test.tsx:111
// T-007: the channel's display text carries the unit, and a commit writes the
// channel value back through onChange. The fixture records the hue number.
test("T-007 should support channel editing for a single HSL channel", async () => {
  const app = await openCase("channel-hue");

  expect(app.value("id:color-input")).toBe("200°");

  await app.clear("id:color-input");
  await app.type("id:color-input", "90");
  await app.type("id:outside", "x");

  const calls = callsOf(app, "onChange");
  expect(calls.length).toBeGreaterThanOrEqual(1);
  expect(calls[calls.length - 1][0]).toBe(90);
});

// heroui/packages/react/tests/components/color-field/color-field.test.tsx:143
// Rewritten port of T-008: the `data-required="true"` attribute (D18) becomes
// the asterisk the Label draws for a required field; the FieldError text is
// asserted as upstream does.
test("T-008 should support isRequired and show FieldError when invalid", async () => {
  const app = await openCase("required-invalid");

  expect(app.shows("text:/^Color\\*$/")).toBe(true);
  expect(app.shows("text:Please enter a valid hex color")).toBe(true);
});

// heroui/packages/react/tests/components/color-field/color-field.test.tsx:161
// Rewritten port of T-009: the `[data-slot="description"]` query (D18) becomes
// a count, which keeps the same fact (the Description part is mounted once),
// and `getByText` becomes `shows`.
test("T-009 should expose accessible description via Description", async () => {
  const app = await openCase("aria");

  expect(app.count("text:Enter your brand's primary color")).toBe(1);
  expect(app.shows("text:Enter your brand's primary color")).toBe(true);
});

// heroui/packages/react/tests/components/color-field/color-field.test.tsx:176
// T-010: a disabled field reports a disabled input and takes no edit. Upstream
// only asserts that the input is disabled and that typing `x` leaves onChange
// untouched. The headless host also refuses the step (`not editable`), but a
// real browser drops the keys silently, so the refusal is tolerated rather
// than required; the typed text never lands and onChange never fires.
test("T-010 should support disabled state and block typing", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("id:color-input")).toBe(false);

  await app.type("id:color-input", "x").catch(() => undefined);
  expect(app.value("id:color-input")).toBe("#0485F7");
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/color-field/color-field.test.tsx:192
// Rewritten port of T-011: the two `[data-slot=...]` queries (D18) become the
// slots' content. A Prefix / Suffix that never mounted, or a raw string the
// part failed to wrap in Text, fails the matching assertion.
test("T-011 should support prefix and suffix composition", async () => {
  const app = await openCase("prefix-suffix");

  expect(app.shows("text:#")).toBe(true);
  expect(app.shows("text:%")).toBe(true);
});

// port sheet 4b.2 S-001 (React Aria `spinbutton/useSpinButton.ts:78-127`,
// `useColorField`): the hex field steps by one hex integer on ArrowUp /
// ArrowDown and jumps to the bounds on Home / End.
test("S-001 should step and jump a hex field with the keyboard", async () => {
  const app = await openCase("keys-hex");

  // An empty typing step takes the focus without touching the text.
  await app.type("id:color-input", "");

  await app.keyboard.press("arrowup");
  expect(app.value("id:color-input")).toBe("#0485F8");

  await app.keyboard.press("arrowdown");
  expect(app.value("id:color-input")).toBe("#0485F7");

  await app.keyboard.press("home");
  expect(app.value("id:color-input")).toBe("#000000");

  await app.keyboard.press("end");
  expect(app.value("id:color-input")).toBe("#FFFFFF");
});

// port sheet 4b.2 S-002 (`useColorChannelFieldState` over NumberField's
// `createNumberFieldState`): a percentage channel steps by one and reads its
// bounds, so the multiplier and the integer display are checked together.
test("S-002 should step a channel field within its range", async () => {
  const app = await openCase("channel-saturation");

  expect(app.value("id:color-input")).toBe("50%");

  await app.type("id:color-input", "");

  await app.keyboard.press("arrowup");
  expect(app.value("id:color-input")).toBe("51%");

  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowdown");
  expect(app.value("id:color-input")).toBe("49%");

  await app.keyboard.press("end");
  expect(app.value("id:color-input")).toBe("100%");
});

// port sheet 4b.2 S-003 (React Aria `useKeyboard`: Enter commits): the return
// key commits the typed text without a blur first, and the committed text is
// normalized to the uppercase hex form. The `controlled` fixture writes the
// signal back, so the normalized text comes from the accepted value, not from
// the field echoing the requested color.
test("S-003 should commit on Enter without leaving the field", async () => {
  const app = await openCase("controlled");

  await app.clear("id:color-input");
  await app.type("id:color-input", "#ef4444");
  await app.keyboard.press("enter");

  const calls = callsOf(app, "onChange");
  expect(calls.length).toBeGreaterThanOrEqual(1);
  expect(String(calls[calls.length - 1][0]).toLowerCase()).toBe("#ef4444");
  expect(app.value("id:color-input")).toBe("#EF4444");
});

// Regression X-001, evidence: src/components/color-field/create-color-field-state.ts:302-320
// React Aria's `commit` treats empty text as a clear, not as the unparsable
// fallback: it writes null through the controllable setter, so `onChange(null)`
// fires, and then shows '' when the parent accepts the write or the committed
// hex when it rejects it
// (react-spectrum/packages/@react-stately/color/src/useColorFieldState.ts
// `commit`; useColorFieldState.test.js "clears the value when the input is
// cleared"). The old probe on `controlled` (#0485F7) recorded no onChange and
// left the committed text, so an empty commit never reached the parent.
test("X-001 clears the value on an empty commit", async () => {
  const accepted = await openCase("controlled");

  await accepted.clear("id:color-input");
  await accepted.type("id:outside", "x");

  const acceptedCalls = callsOf(accepted, "onChange");
  expect(acceptedCalls.length).toBeGreaterThanOrEqual(1);
  expect(acceptedCalls[acceptedCalls.length - 1][0]).toBeNull();
  expect(accepted.value("id:color-input")).toBe("");

  // A controlled parent that ignores the write still sees the clear, and the
  // field falls back to the color it is still showing.
  const rejected = await openCase("controlled-reject");

  await rejected.clear("id:color-input");
  await rejected.type("id:outside", "x");

  const rejectedCalls = callsOf(rejected, "onChange");
  expect(rejectedCalls.length).toBeGreaterThanOrEqual(1);
  expect(rejectedCalls[rejectedCalls.length - 1][0]).toBeNull();
  expect(rejected.value("id:color-input")).toBe("#0485F7");
});

// Regression X-002, evidence: src/components/color-field/create-color-field-state.ts:296-300,322-335
// React Aria steps from `parsedValue`, the text the user typed, not from the
// committed `colorValue`; it writes the input text only when the stepped color
// equals the committed one, so a controlled parent that rejects the edit keeps
// the typed text
// (react-spectrum/packages/@react-stately/color/src/useColorFieldState.ts
// `increment` / `safelySetColorValue`). On `controlled-reject` (#0485F7) the
// old code stepped to #0485F8 and rewrote the text; the typed #FF0000 must step
// to #FF0001 and stay in the input.
test("X-002 steps from the typed text, not the committed color", async () => {
  const app = await openCase("controlled-reject");

  await app.clear("id:color-input");
  await app.type("id:color-input", "#FF0000");
  await app.keyboard.press("arrowup");

  const calls = callsOf(app, "onChange");
  expect(calls.length).toBeGreaterThanOrEqual(1);
  expect(String(calls[calls.length - 1][0]).toLowerCase()).toBe("#ff0001");
  expect(app.value("id:color-input")).toBe("#FF0000");
});
