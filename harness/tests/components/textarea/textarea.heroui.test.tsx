import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * TextArea regression cases from HeroUI 3.2.7 (port sheet 4b, rows T-019 …
 * T-023). The TextArea is used standalone, exactly as upstream's fixture does;
 * the cases that read a callback back open the NSH-only fixture at
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

// heroui/packages/react/tests/components/textarea/textarea.test.tsx:17
// Rewritten port of T-019 (port sheet): `tagName === "TEXTAREA"` becomes the
// multi-line behavior a textarea has — a typed line break stays in the value —
// and the accessible name stands for `toBeInTheDocument`.
test("T-019 renders a textarea element with textbox role and accessible name", async () => {
  const app = await openCase("standalone-textarea");

  expect(app.shows("label:Bio")).toBe(true);

  await app.type("id:bio", "a\nb");
  expect(app.value("id:bio")).toContain("\n");
});

// heroui/packages/react/tests/components/textarea/textarea.test.tsx:41
// T-022: typing edits the standalone textarea and onChange reports it.
test("T-022 supports typing and calls onChange", async () => {
  const app = await openCase("standalone-textarea");

  await app.type("id:bio", "Hello");

  expect(app.value("id:bio")).toBe("Hello");
  expect(callsOf(app, "onChange").length).toBeGreaterThan(0);
});

// heroui/packages/react/tests/components/textarea/textarea.test.tsx:52
// T-023: a disabled textarea reports disabled and refuses edits, so its value
// stays empty.
test("T-023 supports disabled state", async () => {
  const app = await openCase("standalone-textarea-disabled");

  expect(app.enabled("id:bio")).toBe(false);
  await app.type("id:bio", "x").catch(() => undefined);
  expect(app.value("id:bio")).toBe("");
});
