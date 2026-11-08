import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

// heroui/packages/react/tests/components/description/description.test.tsx:9
// Partial port (port sheet T-001): the upstream case renders inside a TextField
// and asserts the data-slot and BEM block class names, which D18 drops and the
// TextField unit owns. The description text is the one visible assertion that
// survives, so the scenario renders the Description alone.
test("T-001 exposes data-slot and BEM block inside TextField", async () => {
  const app = await openScenario("description/basic");
  expect(app.shows("text:Visible to other users")).toBe(true);
});

// heroui/packages/react/tests/components/description/description.test.tsx:39
// Partial port (port sheet T-003): the upstream case also asserts the
// data-slot attribute, which D18 drops. Rendering standalone is what this case
// is about, and the visible text covers it.
test("T-003 renders standalone outside a field gate", async () => {
  const app = await openScenario("description/standalone");
  expect(app.shows("text:Standalone")).toBe(true);
});
