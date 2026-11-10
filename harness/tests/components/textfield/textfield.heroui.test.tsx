import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * TextField regression cases from HeroUI 3.2.7 (port sheet 4b, rows T-001 …
 * T-023). The stories are covered by the shared scenarios; every case here that
 * reads a callback back or targets one part by `testID` opens the NSH-only
 * fixture at harness/textfield.fixtures.tsx (port sheet 4b.3).
 *
 * All these rows run on the headless desktop (`platform: "windows"`, the
 * default), which the port sheet gives them: typing focuses an input on every
 * platform and nothing here needs Tab focus movement. T-012 moves the focus
 * with Tab, so it lives in textfield.heroui.web.test.tsx.
 *
 * `getByRole("textbox", {name})` becomes `label:` (the name reaches the input),
 * `[data-slot=…]` becomes the fixture's `testID`, and the DOM-only assertions
 * (`data-invalid`, `data-disabled`, `data-focus-visible`, BEM classes) are
 * dropped with the reason recorded in each row.
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

// heroui/packages/react/tests/components/textfield/textfield.test.tsx:27
// T-001: the Label's text reaches the input as its accessible name through
// FieldContext, which is the same fact the upstream role query asserts (NSH's
// AccessibilityRole has no `textbox`, port sheet 4b).
test("T-001 exposes accessible name via Label and Input", async () => {
  const app = await openCase("log");

  expect(app.shows("label:Your name")).toBe(true);
});

// heroui/packages/react/tests/components/textfield/textfield.test.tsx:51
// T-004: typing edits the field's text; onChange receives the string, not a DOM
// event, and the last call carries the final text.
test("T-004 supports typing and calls onChange", async () => {
  const app = await openCase("log");

  await app.type("id:name", "Ada");

  expect(app.value("id:name")).toBe("Ada");

  const calls = callsOf(app, "onChange");
  expect(calls.length).toBeGreaterThan(0);
  expect(calls[calls.length - 1][0]).toBe("Ada");
});

// heroui/packages/react/tests/components/textfield/textfield.test.tsx:63
// T-005: a controlled field keeps its owner's value when the owner refuses the
// edit, and follows the owner when it changes. The fixture's external button
// stands in for upstream's `rerender`.
test("T-005 supports controlled value", async () => {
  const app = await openCase("controlled");

  expect(app.value("id:name")).toBe("Ada");

  await app.type("id:name", "!");

  const calls = callsOf(app, "onChange");
  expect(calls.length).toBeGreaterThan(0);
  expect(app.value("id:name")).toBe("Ada");

  await app.press("id:set-value");
  expect(app.value("id:name")).toBe("Ada!");
});

// heroui/packages/react/tests/components/textfield/textfield.test.tsx:87
// Partial port of T-006 (port sheet): the root's `data-disabled` attribute is a
// D18 difference. The three kept facts are the input's disabled state, the
// rejected edit and the silent callback.
test("T-006 supports disabled state and blocks typing", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("id:name")).toBe(false);
  await app.type("id:name", "x").catch(() => undefined);
  expect(app.value("id:name")).toBe("");
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/textfield/textfield.test.tsx:104
// Partial port of T-007 (port sheet): the root's `data-invalid` attribute is a
// D18 difference; the visible error text and the mounted FieldError are kept.
test("T-007 renders FieldError when invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:Password must be longer than 8 characters")).toBe(true);
  expect(app.count("text:Password must be longer than 8 characters")).toBe(1);
});

// heroui/packages/react/tests/components/textfield/textfield.test.tsx:121
// T-008: a valid field mounts no FieldError, so its text is not on screen.
test("T-008 renders no FieldError when valid", async () => {
  const app = await openCase("valid-error");

  expect(app.shows("text:Password must be longer than 8 characters")).toBe(false);
});

// heroui/packages/react/tests/components/textfield/textfield.test.tsx:133
// Partial port of T-009 (port sheet): the Description's text is visible. The
// accessible-description half has no NSH query — the text travels through
// `accessibilityHint` and `nsh/test` reads no hint.
test("T-009 exposes accessible description via Description", async () => {
  const app = await openCase("description");

  expect(app.texts()).toContain("Visible to other users");
});

// heroui/packages/react/tests/components/textfield/textfield.test.tsx:148
// Partial port of T-010 (port sheet): the BEM class and the DOM `tagName` are
// D18 / DOM facts. The kept facts are editing, the text, the callback, and the
// multi-line semantics a textarea has — a typed line break stays in the value.
test("T-010 supports TextArea composition with textarea data-slot", async () => {
  const app = await openCase("textarea");

  await app.type("id:bio", "Hello");

  expect(app.value("id:bio")).toBe("Hello");

  const calls = callsOf(app, "onChange");
  expect(calls[calls.length - 1][0]).toBe("Hello");

  await app.type("id:bio", "\nWorld");
  expect(app.value("id:bio")).toContain("\n");
});

// heroui/packages/react/tests/components/textfield/textfield.test.tsx:192
// T-013: the children function receives the field state (accessors, D17) and
// decides the Description's text from it.
test("T-013 supports children as a render function receiving field state", async () => {
  const app = await openCase("render-children");

  expect(app.shows("label:Your name")).toBe(true);
  expect(app.shows("text:Required")).toBe(true);
});

// heroui/packages/react/tests/components/input/input.test.tsx:17
// T-014: a standalone Input (no TextField) takes `aria-label` as its name, the
// same fact upstream's `getByRole("textbox", {name: "Name"})` asserts.
test("T-014 renders with textbox role and accessible name", async () => {
  const app = await openCase("standalone-input");

  expect(app.shows("label:Name")).toBe(true);
});

// heroui/packages/react/tests/components/input/input.test.tsx:39
// T-017: typing edits the standalone Input; onChange receives the string, not
// a DOM event.
test("T-017 supports typing and calls onChange", async () => {
  const app = await openCase("standalone-input");

  await app.type("id:name", "Ada");

  expect(app.value("id:name")).toBe("Ada");

  const calls = callsOf(app, "onChange");
  expect(calls.length).toBeGreaterThan(0);
});

// heroui/packages/react/tests/components/input/input.test.tsx:50
// T-018: `disabled` at the host. Upstream asserts only `toBeDisabled`; the
// rejected edit is the same fact on this side, where typing a disabled field
// has to leave it empty.
test("T-018 supports disabled state", async () => {
  const app = await openCase("standalone-input-disabled");

  expect(app.enabled("id:name")).toBe(false);
  await app.type("id:name", "x").catch(() => undefined);
  expect(app.value("id:name")).toBe("");
});

// heroui/packages/react/tests/components/textarea/textarea.test.tsx:17
// T-019: the accessible name, plus the observable part of `tagName ===
// "TEXTAREA"` (port sheet): a typed line break stays in the value.
test("T-019 renders a textarea element with textbox role and accessible name", async () => {
  const app = await openCase("standalone-textarea");

  expect(app.shows("label:Bio")).toBe(true);

  await app.type("id:bio", "a\nb");
  expect(app.value("id:bio")).toContain("\n");
});

// heroui/packages/react/tests/components/textarea/textarea.test.tsx:41
// T-022: typing edits the standalone TextArea; onChange receives the string.
test("T-022 supports typing and calls onChange", async () => {
  const app = await openCase("standalone-textarea");

  await app.type("id:bio", "Hello");

  expect(app.value("id:bio")).toBe("Hello");

  const calls = callsOf(app, "onChange");
  expect(calls.length).toBeGreaterThan(0);
});

// heroui/packages/react/tests/components/textarea/textarea.test.tsx:52
// T-023: `disabled` at the host; a rejected edit leaves the value unchanged.
test("T-023 supports disabled state", async () => {
  const app = await openCase("standalone-textarea-disabled");

  expect(app.enabled("id:bio")).toBe(false);
  await app.type("id:bio", "x").catch(() => undefined);
  expect(app.value("id:bio")).toBe("");
});
