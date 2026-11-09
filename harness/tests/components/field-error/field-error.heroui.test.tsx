import { expect, open, test } from "nsh/test";

/*
 * The port sheet (4b) has no shared scenario for FieldError: without a field
 * root both React Aria Components and this library render nothing, and every
 * field root belongs to another unit. These cases therefore open the NSH-only
 * fixture, which supplies FieldErrorContext directly.
 */
function openCase(name: string, params: Record<string, string | number | boolean> = {}) {
  return open("../../../field-error.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/field-error/field-error.test.tsx:9
// Partial port (port sheet T-001): the upstream case also asserts the
// data-slot attribute and the BEM block class name, which D18 drops. The
// visible error text is the assertion that survives.
test("T-001 renders with data-slot and BEM when the field is invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:Enter a valid email")).toBe(true);
});

// heroui/packages/react/tests/components/field-error/field-error.test.tsx:25
// Partial port (port sheet T-002): the upstream case also asserts that no
// data-slot element exists, which D18 drops. The hidden error text is the
// observable half, and the fixture's `valid` case is the valid field.
test("T-002 renders nothing when the field is valid", async () => {
  const app = await openCase("valid");

  expect(app.shows("text:Enter a valid email")).toBe(false);
});

// heroui/packages/react/tests/components/field-error/field-error.test.tsx:38
// Rewritten port (port sheet T-003): D17 makes the render props argument an
// accessor object instead of a boolean, so the fixture calls `isInvalid()`.
test("T-003 supports render props when invalid", async () => {
  const app = await openCase("render-props");

  expect(app.shows("text:Rendered via props")).toBe(true);
});

// Ref forwarding regression: this fixture renders FieldError without a ref. A
// plain `ref={local.ref}` with an undefined value is a ref store to NSH, which
// throws at mount on the web target and renders an empty page. The callback ref
// keeps the error text on screen on every target.
test("X-004 renders a ref-less FieldError on a real engine", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:Enter a valid email")).toBe(true);
});
