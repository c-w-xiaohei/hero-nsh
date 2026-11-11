import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

// kobalte/packages/core/src/dialog/dialog.test.tsx:14
// Partial port: retain title text visibility; aria-labelledby and id relations are not queryable.
test("T-014 should be labelled by its dialog title", async () => {
  const app = await openScenario("drawer/labelled", { clock: {} });
  expect(app.shows("text:title")).toBe(true);
});

// kobalte/packages/core/src/dialog/dialog.test.tsx:29
// Partial port: retain description text visibility; aria-describedby and id relations are not queryable.
test("T-015 should be described by its dialog description", async () => {
  const app = await openScenario("drawer/labelled", { clock: {} });
  expect(app.shows("text:description")).toBe(true);
});
