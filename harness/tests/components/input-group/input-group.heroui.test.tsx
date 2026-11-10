import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { lastFocus } from "../../testers/input-group";

/*
 * InputGroup regression cases from HeroUI 3.2.7 (port sheet 4b, rows T-013,
 * T-015, T-016, T-017, T-019, T-020). Rows T-014 and T-018 are deleted by the
 * port sheet (BEM class only).
 *
 * These cases read a focus callback back or target one part by `testID`, so
 * they open the NSH-only fixture at harness/input-group.fixtures.tsx (port
 * sheet 4b.3). The shared scenarios cover the stories and are not asserted
 * here.
 *
 * `getByRole("textbox", {name})` becomes `label:Amount` (NSH inputs carry the
 * accessible name as `accessibilityLabel` and are not `role:` views), a
 * `[data-slot=…]` presence query becomes the part's visible content, and
 * `toHaveFocus` becomes the fixture's focus probe (SOP 3.2).
 */

function openCase(name: string): Promise<App> {
  return open("../../../input-group.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/input-group/input-group.test.tsx:28
// Partial port of T-013: the group's own `data-slot` has no visible counterpart
// and is dropped (D18). The other three become the parts' content: the prefix
// reads "$", the input takes the Label's name, the suffix reads "USD".
test("T-013 should expose the compound parts under TextField", async () => {
  const app = await openCase("default");

  expect(app.shows("id:ig-root >> text:$")).toBe(true);
  expect(app.shows("label:Amount")).toBe(true);
  expect(app.shows("id:ig-root >> text:USD")).toBe(true);
});

// heroui/packages/react/tests/components/input-group/input-group.test.tsx:45
// T-015: the accessible name comes from the TextField's Label registration.
test("T-015 should expose accessible name on the input", async () => {
  const app = await openCase("default");

  expect(app.shows("label:Amount")).toBe(true);
});

// heroui/packages/react/tests/components/input-group/input-group.test.tsx:51
// Rewritten port of T-016: the prefix's `data-slot` existence becomes its
// visible "$"; `prefix.click()` is `app.press("id:ig-prefix")`, and
// `toHaveFocus` becomes the input's recorded focus event, since the group's
// press focuses the registered input.
test("T-016 should focus the input when the Prefix is pressed", async () => {
  const app = await openCase("default");

  expect(app.shows("id:ig-root >> text:$")).toBe(true);

  await app.press("id:ig-prefix");

  expect(lastFocus(app, "input")).toBe(true);
});

// heroui/packages/react/tests/components/input-group/input-group.test.tsx:63
// Rewritten port of T-017: the same two facts for the suffix, "USD" and
// `id:ig-suffix`.
test("T-017 should focus the input when the Suffix is pressed", async () => {
  const app = await openCase("default");

  expect(app.shows("id:ig-root >> text:USD")).toBe(true);

  await app.press("id:ig-suffix");

  expect(lastFocus(app, "input")).toBe(true);
});

// heroui/packages/react/tests/components/input-group/input-group.test.tsx:83
// T-019: `<TextField isDisabled>` reaches the input through the group, which is
// the GroupContext inheritance the port sheet calls out (§1.5).
test("T-019 should support disabling the input via TextField", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("label:Amount")).toBe(false);
});

// heroui/packages/react/tests/components/input-group/input-group.test.tsx:89
// Rewritten port of T-020: `[data-slot="input-group-textarea"]` becomes two
// visible facts: the multiline control takes the Label's name, and typing into
// it really edits the text.
test("T-020 should support TextArea slot composition", async () => {
  const app = await openCase("textarea");

  expect(app.shows("label:Notes")).toBe(true);

  await app.type("label:Notes", "Hello");

  expect(app.value("label:Notes")).toBe("Hello");
});
