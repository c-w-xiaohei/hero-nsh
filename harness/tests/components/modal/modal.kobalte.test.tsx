import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 dialog cases ported to HeroUI's Modal and to NSH's view
 * model, per port sheet 4b (T-009, T-010).
 *
 * Kobalte builds the accessible name by registering the title's id and writing
 * `aria-labelledby` on the panel; NSH has neither an id-relation channel nor a
 * `dialog` role (port sheet §5.6), so the two rows keep the observable half:
 * the title and the description text render inside the open layer.
 *
 * The scenario is HeroUI's part tree (Modal.Header / Modal.Heading /
 * Modal.Body), not Kobalte's Dialog.Title / Dialog.Description: the scenario
 * file must render through the component under port.
 */

// kobalte/packages/core/src/dialog/dialog.test.tsx:14
// Partial port (port sheet T-009): the `aria-labelledby` / id equality
// assertion is dropped; the heading text inside the dialog is kept.
test("T-009 should be labelled by its dialog title", async () => {
  const app = await openScenario("modal/labelled");

  expect(app.texts()).toContain("title");
});

// kobalte/packages/core/src/dialog/dialog.test.tsx:29
// Partial port (port sheet T-010): the `aria-describedby` assertion is
// dropped; the description text inside the dialog is kept.
test("T-010 should be described by its dialog description", async () => {
  const app = await openScenario("modal/labelled");

  expect(app.texts()).toContain("description");
});
