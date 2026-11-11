import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 alert-dialog cases ported to HeroUI's AlertDialog parts and
 * to NSH's view model, per port sheet 4b (T-009, T-010).
 *
 * Kobalte builds the accessible name and description by registering the title's
 * and description's ids and writing `aria-labelledby` / `aria-describedby` on
 * the panel. NSH has no id-relation channel and no alertdialog role (port sheet
 * §8), so the two rows keep the observable half: the title and the description
 * text render inside the open layer.
 *
 * The scenario is HeroUI's part tree (AlertDialog.Header / Heading / Body),
 * not Kobalte's AlertDialog.Title / Description: the scenario file must render
 * through the component under port.
 */

// kobalte/packages/core/src/alert-dialog/alert-dialog.test.tsx:14
// Partial port (port sheet T-009): the `aria-labelledby` / id equality
// assertion is dropped; the heading text inside the dialog is kept.
test("T-009 should be labelled by its alert dialog title", async () => {
  const app = await openScenario("alert-dialog/labelled", { platform: "web" });

  expect(app.texts()).toContain("title");
});

// kobalte/packages/core/src/alert-dialog/alert-dialog.test.tsx:29
// Partial port (port sheet T-010): the `aria-describedby` assertion is dropped;
// the description text inside the dialog is kept.
test("T-010 should be described by its alert dialog description", async () => {
  const app = await openScenario("alert-dialog/labelled", { platform: "web" });

  expect(app.texts()).toContain("description");
});
