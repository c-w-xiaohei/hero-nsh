import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for InputOTP, per port sheet 4b (T-001 …
 * T-007). T-002 is deleted there: it asserts the BEM block class, which D18
 * drops and which has no visible effect; T-001's root check covers the
 * container it was protecting.
 *
 * Every case runs headless on the default desktop platform
 * (`platform: "windows"`). InputOTP's keyboard interaction is a native text
 * input (`app.type` / `app.paste` focus it on every platform) and X-003 presses
 * Return inside that input, where the focused input takes the return key; no
 * case moves focus with Tab or activates a view with Return / Space, so no
 * `.web.` or `.windows.` file is needed (port sheet 4b, closing note).
 *
 * The `S-` cases at the end are this unit's supplement for the core behaviour
 * HeroUI's own seven cases do not cover (port sheet 4b, closing note). They
 * carry no upstream `T-` number on purpose. The `X-` cases are review
 * regressions: each one states the upstream behaviour the port dropped and
 * carries the reported `path:line` above it.
 */

// heroui/packages/react/tests/components/input-otp/input-otp.test.tsx:38
// Rewritten port (port sheet T-001): the four `data-slot` queries become the
// internal `testID`s the parts carry (D18 drops the attribute, the structure it
// marked is what users see).
test("T-001 should expose root and compound parts", async () => {
  const app = await openScenario("input-otp/basic");

  expect(app.shows("id:input-otp")).toBe(true);
  expect(app.shows("id:input-otp-input")).toBe(true);
  expect(app.count("id:input-otp-group")).toBe(2);
  expect(app.count("id:input-otp-slot")).toBe(6);
  expect(app.shows("id:input-otp-separator")).toBe(true);
});

// heroui/packages/react/tests/components/input-otp/input-otp.test.tsx:55
// Port (port sheet T-003): upstream's first assertion ("the input exists") is
// already T-001's; the two characters it types stand in for it here, so the
// count of assertions does not drop.
test("T-003 should call onChange while typing digits", async () => {
  const app = await openScenario("input-otp/typing");

  await app.type("id:input-otp-input", "12");

  expect(app.count("id:input-otp-slot-value")).toBe(2);
  expect(callsOf(app, "onChange").length).toBeGreaterThan(0);
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("12");
});

// heroui/packages/react/tests/components/input-otp/input-otp.test.tsx:70
// Port (port sheet T-004): one upstream assertion, plus the slot count that
// proves the callback was not fired before the field was actually full.
test("T-004 should call onComplete when maxLength is reached", async () => {
  const app = await openScenario("input-otp/complete");

  await app.type("id:input-otp-input", "1234");

  expect(callsOf(app, "onComplete").at(-1)?.[0]).toBe("1234");
  expect(app.count("id:input-otp-slot-value")).toBe(4);
});

// heroui/packages/react/tests/components/input-otp/input-otp.test.tsx:83
// Partial port (port sheet T-005): the `data-disabled` attribute assertion is
// dropped (D18); `opacity` / `cursor` are paint that `nsh/test` cannot read.
// The three observable facts stay: the input is disabled, typing draws no
// character, and onChange never fires.
test("T-005 should support disabled state", async () => {
  const app = await openScenario("input-otp/disabled");

  expect(app.enabled("id:input-otp-input")).toBe(false);

  await app.type("id:input-otp-input", "1").catch(() => undefined);

  expect(app.count("id:input-otp-slot-value")).toBe(0);
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/input-otp/input-otp.test.tsx:99
// Partial port (port sheet T-006): the root and slot `data-invalid` attribute
// assertions are dropped (D18); the danger outline and the field-focus
// background are paint `nsh/test` cannot read. What stays is the wiring the
// case is really about: FieldError reads the `FieldErrorContext` the Root
// provides, and shows its text.
test("T-006 should support invalid state with FieldError", async () => {
  const app = await openScenario("input-otp/invalid");

  expect(app.shows("text:Invalid code")).toBe(true);
});

// heroui/packages/react/tests/components/input-otp/input-otp.test.tsx:121
// Port (port sheet T-007): upstream's six `data-filled` slots become six
// visible characters, the structure the attribute stood for.
test("T-007 should fill slots from paste", async () => {
  const app = await openScenario("input-otp/paste");

  await app.paste("id:input-otp-input", { text: "654321" });

  expect(callsOf(app, "onChange").length).toBeGreaterThan(0);
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("654321");
  expect(app.count("id:input-otp-slot-value")).toBe(6);
});

/*
 * Supplement (port sheet 4b closing note): `pattern` matches the whole
 * candidate string, so a character that breaks the match rejects the whole
 * edit instead of being filtered out.
 */
test("S-001 should reject an edit that does not match pattern", async () => {
  const app = await openScenario("input-otp/pattern");

  await app.type("id:input-otp-input", "1");

  expect(app.count("id:input-otp-slot-value")).toBe(0);
  expect(callsOf(app, "onChange")).toHaveLength(0);

  await app.type("id:input-otp-input", "ab");

  expect(app.count("id:input-otp-slot-value")).toBe(2);
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("ab");
});

/*
 * Supplement: a controlled value is reported to onChange but never written
 * back; the slots keep showing the `value` prop.
 */
test("S-002 should not self-update a controlled value", async () => {
  const app = await openScenario("input-otp/controlled");

  expect(app.texts()).toContain("1");
  expect(app.texts()).toContain("2");

  await app.type("id:input-otp-input", "9");

  expect(app.count("id:input-otp-slot-value")).toBe(2);
  expect(app.texts()).not.toContain("9");
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("129");
});

/*
 * Supplement: a filled field cannot grow past `maxLength`, and the caret rests
 * on the last cell after the sixth digit, so the next digit replaces it.
 */
test("S-003 should not grow past maxLength", async () => {
  const app = await openScenario("input-otp/filled");

  expect(app.count("id:input-otp-slot-value")).toBe(3);

  await app.type("id:input-otp-input", "456");
  expect(app.count("id:input-otp-slot-value")).toBe(6);

  await app.type("id:input-otp-input", "7");
  expect(app.count("id:input-otp-slot-value")).toBe(6);
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("123457");
});

/*
 * Supplement: the fake caret lives in a slot only while the field is focused.
 * The unfocused half is S-005 (the `filled` scenario draws no caret).
 */
test("S-004 should draw the caret in a slot while focused", async () => {
  const app = await openScenario("input-otp/basic");

  expect(app.count("id:input-otp-caret")).toBe(0);

  await app.press("id:input-otp-input");

  expect(app.count("id:input-otp-caret")).toBe(1);
  expect(app.shows("id:input-otp-slot >> id:input-otp-caret")).toBe(true);
});

/* Supplement: `defaultValue` pre-fills the slots, unfocused and without a caret. */
test("S-005 should render defaultValue in the slots", async () => {
  const app = await openScenario("input-otp/filled");

  expect(app.count("id:input-otp-slot-value")).toBe(3);
  expect(app.texts()).toContain("1");
  expect(app.texts()).toContain("2");
  expect(app.texts()).toContain("3");
  expect(app.count("id:input-otp-caret")).toBe(0);
});

/*
 * Supplement: typing over a filled cell replaces it in place. A seventh digit
 * that appended would show 7 characters (or drop the keystroke, leaving `6`).
 */
test("S-006 should replace the last cell instead of inserting", async () => {
  const app = await openScenario("input-otp/filled");

  await app.type("id:input-otp-input", "456");
  await app.type("id:input-otp-input", "7");

  expect(app.count("id:input-otp-slot")).toBe(6);
  expect(app.count("id:input-otp-slot-value")).toBe(6);
  expect(app.texts()).toContain("7");
  expect(app.texts()).not.toContain("6");
  expect(callsOf(app, "onChange").at(-1)?.[0]).toBe("123457");
});

/*
 * Regression (review): HeroUI's Root forwards `readOnly` to the input
 * (Omit<ComponentPropsWithRef<typeof OTPInput>, …>), where it blocks edits;
 * the port declared it as accepted with no effect.
 * src/components/input-otp/input-otp-root.tsx:67,352,771
 */
test("X-001 should block edits and keep focus under readOnly", async () => {
  const app = await openScenario("input-otp/readonly");

  expect(app.count("id:input-otp-slot-value")).toBe(3);
  expect(app.enabled("id:input-otp-input")).toBe(false);

  await app.type("id:input-otp-input", "9").catch(() => undefined);

  expect(app.count("id:input-otp-slot-value")).toBe(3);
  expect(app.value("id:input-otp-input")).toBe("123");
  expect(callsOf(app, "onChange")).toHaveLength(0);

  await app.press("id:input-otp-input");

  expect(app.count("id:input-otp-caret")).toBe(1);
});

/*
 * Regression (review): input-otp@1.4.2 normalizes the caret on every sync. A
 * caret at `maxLength` selects the last cell, so the next digit replaces it
 * instead of being dropped; a paste selects min(length, maxLength - 1) …
 * length. The port kept the raw host caret in all three places.
 * src/components/input-otp/input-otp-root.tsx:583-585,612-619,622-627
 */
test("X-002 should replace the last cell after a full code is typed or pasted", async () => {
  const typed = await openScenario("input-otp/typing");

  await typed.type("id:input-otp-input", "123456");
  expect(callsOf(typed, "onChange").at(-1)?.[0]).toBe("123456");

  await typed.type("id:input-otp-input", "7");

  expect(typed.count("id:input-otp-slot-value")).toBe(6);
  expect(callsOf(typed, "onChange").at(-1)?.[0]).toBe("123457");

  const pasted = await openScenario("input-otp/paste");

  await pasted.paste("id:input-otp-input", { text: "654321" });
  expect(callsOf(pasted, "onChange").at(-1)?.[0]).toBe("654321");

  await pasted.type("id:input-otp-input", "7");

  expect(pasted.count("id:input-otp-slot-value")).toBe(6);
  expect(callsOf(pasted, "onChange").at(-1)?.[0]).toBe("654327");
});

/*
 * Regression (review): HeroUI's OTPInput has no Enter handler, so Return
 * neither blurs nor changes the selection. The port's Input kept the
 * single-line default `submitBehavior` ("blurAndSubmit"), which drops focus
 * and with it the fake caret.
 * src/components/input-otp/input-otp-root.tsx:750-785
 */
test("X-003 should keep focus and the fake caret on Return", async () => {
  const app = await openScenario("input-otp/basic");

  await app.press("id:input-otp-input");
  expect(app.count("id:input-otp-caret")).toBe(1);

  await app.keyboard.press("enter");

  expect(app.count("id:input-otp-caret")).toBe(1);
});
