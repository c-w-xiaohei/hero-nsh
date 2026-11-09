import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 regression cases for Badge, per port sheet 4b (T-008).
 *
 * Kobalte's other two cases are deleted there: `textValue` and the implicit
 * `role="status"` are Kobalte-only API and semantics that HeroUI's Badge never
 * had, so porting them would break the 1:1 API. The one case that survives is
 * the `aria-label` channel, which HeroUI's root `span` also passes through; the
 * port maps `aria-label` to AccessibilityLabel, and `label:` reads it.
 */

// kobalte/packages/core/src/badge/badge.test.tsx:14
// Rewritten port (port sheet T-008): upstream looks the badge up by its text and
// asserts the `aria-label` attribute. NSH has no DOM attributes, so the same
// explicit label is asserted through the accessibility tree instead. Without
// the mapping the badge keeps only its inner text as the accessible name, and
// `label:User is online` finds nothing.
test("T-008 badge with defined aria-label", async () => {
  const app = await openScenario("badge/aria");

  expect(app.shows("label:User is online")).toBe(true);
});
