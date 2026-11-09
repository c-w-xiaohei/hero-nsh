import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

// heroui/packages/react/tests/components/label/label.test.tsx:8
// Partial port (port sheet T-001): the upstream case also asserts the
// data-slot and BEM block class names, which D18 drops. The label text is the
// one visible assertion that survives.
test("T-001 shows the label text", async () => {
  const app = await openScenario("label/basic");
  expect(app.shows("text:Your name")).toBe(true);
});

// heroui/packages/react/tests/components/label/label.test.tsx:23
// Rewritten port (port sheet T-002): the upstream case asserts the
// `label--required` BEM class, which D18 drops. R-002 turns the CSS `::after`
// star into a real nested Text, so the observable effect is the star.
test("T-002 shows the required asterisk", async () => {
  const app = await openScenario("label/required");
  expect(app.shows("text:/^Required\\*/")).toBe(true);
});

// heroui/packages/react/tests/components/label/label.test.tsx:39
// Rewritten port (port sheet T-004): the upstream case asserts the
// `label--invalid` BEM class, which D18 drops. R-007 maps it to `text-danger`;
// the light theme's `danger` token in theme/hero-nsh.theme.json is
// oklch(0.6532 0.2328 25.74), which resolves to #ff383cff.
test("T-004 paints the label with the danger color", async () => {
  const app = await openScenario("label/invalid");
  expect(app.spanStyle("text:Invalid").color).toBe("#ff383cff");
});

// Ref forwarding regression: this scenario passes no ref to Label. NSH treats
// a plain `ref={local.ref}` with an undefined value as a ref store, which
// throws at mount on the web target and leaves the page empty. The forwarded
// callback ref renders the text on every target.
test("X-001 renders a ref-less Label on a real engine", async () => {
  const app = await openScenario("label/basic");

  expect(app.shows("text:Your name")).toBe(true);
});
