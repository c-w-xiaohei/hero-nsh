import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Input regression cases from HeroUI 3.2.7 (port sheet 4b, rows T-014 … T-018).
 * The Input is used standalone, exactly as upstream's fixture does; the cases
 * that read a callback back open the NSH-only fixture at
 * harness/textfield.fixtures.tsx.
 *
 * All these rows run on the headless desktop (`platform: "windows"`, the
 * default). `getByRole("textbox", {name})` becomes `label:` (NSH's
 * AccessibilityRole has no `textbox`), and the BEM / `data-slot` rows are
 * deleted in the sheet (D18) so they have no test here.
 */

function openCase(name: string): Promise<App> {
  return open("../../../textfield.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/input/input.test.tsx:17
// T-014: `aria-label` becomes the input's `accessibilityLabel`, which is what
// `label:` matches (NSH has no `textbox` role).
test("T-014 renders with textbox role and accessible name", async () => {
  const app = await openCase("standalone-input");

  expect(app.shows("label:Name")).toBe(true);
});

// heroui/packages/react/tests/components/input/input.test.tsx:39
// T-017: typing edits the standalone input and onChange reports it (the
// payload is NSH's `{ value }`, not a DOM event).
test("T-017 supports typing and calls onChange", async () => {
  const app = await openCase("standalone-input");

  await app.type("id:name", "Ada");

  expect(app.value("id:name")).toBe("Ada");
  expect(callsOf(app, "onChange").length).toBeGreaterThan(0);
});

// heroui/packages/react/tests/components/input/input.test.tsx:50
// T-018: a disabled input reports disabled and refuses edits; the second half
// (still empty after typing) is the same behavior assertion upstream makes.
test("T-018 supports disabled state", async () => {
  const app = await openCase("standalone-input-disabled");

  expect(app.enabled("id:name")).toBe(false);
  await app.type("id:name", "x").catch(() => undefined);
  expect(app.value("id:name")).toBe("");
});
