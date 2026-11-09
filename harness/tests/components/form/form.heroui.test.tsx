import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * HeroUI 3.2.7 regression cases for Form, per port sheet 4b (T-001 … T-003).
 * Upstream has no Kobalte counterpart, so there is no `.kobalte.` file.
 *
 * All three cases need fields (or a submit button) inside the form. TextField
 * is a parallel unit this one cannot see, so each case opens the NSH-only
 * fixture at harness/form.fixtures.tsx, which plays the field root with an
 * `nsh/base` Input and a small FormContext consumer. The assertions still
 * target what this unit owns: the named landmark container, the submit
 * channel, and the errors handed down through FormContext.
 *
 * The fixture sits next to harness/nsh.json for that reason; an entry anywhere
 * else is taken as its own app root and loses the alias and theme.
 */

function openCase(name: string) {
  return open("../../../form.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/form/form.test.tsx:19
// Partial port (port sheet T-001): NSH's AccessibilityRole has no `form`, so
// the root is a named `region` — the only landmark role in the list — and the
// assertion reads that. The field side keeps its accessible name; `textbox` is
// not an NSH role, so `label:Your name` (the Input's accessibilityLabel) is the
// equivalent query. Both upstream assertions survive in translated form.
test("T-001 should render a form element that nests fields", async () => {
  const app = await openCase("basic");

  expect(app.shows("role:region[Profile]")).toBe(true);
  expect(app.shows("label:Your name")).toBe(true);
});

// heroui/packages/react/tests/components/form/form.test.tsx:33
// Port (port sheet T-002): upstream only asserts that onSubmit ran once; it
// never reads the event payload, so the missing FormData (port sheet §8.3)
// does not weaken the case. The submit button reaches FormContext.submit(),
// which the Button unit wires up (§5.2).
test("T-002 calls onSubmit with form data", async () => {
  const app = await openCase("submit");

  await app.press("role:button[Save]");
  await app.waitUntil(() => callsOf(app, "form.submit").length >= 1);

  expect(callsOf(app, "form.submit")).toHaveLength(1);
});

// heroui/packages/react/tests/components/form/form.test.tsx:52
// Partial port (port sheet T-003): the `[data-slot="field-error"]` assertion is
// dropped by D18 and it names the same visible node as the text assertion, so
// there is no second visible effect to keep. The remaining assertion proves the
// form-level validationErrors reached the field consumer and FieldError showed
// them.
test("T-003 renders validationErrors on nested FieldError", async () => {
  const app = await openCase("errors");

  expect(app.shows("text:Name is required")).toBe(true);
});
