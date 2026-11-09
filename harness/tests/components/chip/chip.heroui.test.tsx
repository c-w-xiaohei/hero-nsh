import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Chip, per port sheet 4b (T-001, T-003,
 * T-005). Each file:line above a test is the upstream location.
 *
 * T-002 (BEM block / `data-slot`) and T-004 (`data-*` passthrough) are deleted:
 * D18 drops the BEM class API, NSH projects `testID` only, and a view has no
 * arbitrary attribute channel, so neither has a visible effect to assert.
 */

// Resolved on the harness theme (theme/hero-nsh.theme.json):
// accent-soft-foreground -> #1e63aeff, the same token Button's T-003 reads.
const ACCENT_SOFT_FOREGROUND = "#1e63aeff";

// heroui/packages/react/tests/components/chip/chip.test.tsx:6
test("T-001 renders text content", async () => {
  const app = await openScenario("chip/basic");

  expect(app.shows("text:New")).toBe(true);
});

// heroui/packages/react/tests/components/chip/chip.test.tsx:20
// Rewritten port (port sheet T-003): upstream asserts the `chip--accent` BEM
// modifier, which D18 drops. R-005 turns it into `text-accent-soft-foreground`;
// the assertion reads that class's resolved color. A missing or misspelled
// variant class leaves the root's `text-default-foreground`, so it fails.
test("T-003 exposes color BEM modifier", async () => {
  const app = await openScenario("chip/colors");

  expect(app.spanStyle("text:Accent").color).toBe(ACCENT_SOFT_FOREGROUND);
});

// heroui/packages/react/tests/components/chip/chip.test.tsx:41
// Partial port (port sheet T-005): the `data-slot="chip-label"` assertion is
// dropped by D18. The rendered label text remains, which is what shows the
// composed part mounts and draws its content inside the root.
test("T-005 exposes data-slot when composed", async () => {
  const app = await openScenario("chip/label-composed");

  expect(app.shows("text:Pro")).toBe(true);
});
