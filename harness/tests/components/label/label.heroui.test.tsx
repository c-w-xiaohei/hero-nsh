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
