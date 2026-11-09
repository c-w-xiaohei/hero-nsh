import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for EmptyState, per port sheet 4b
 * (T-001 … T-004).
 *
 * Upstream also asserts `data-slot="empty-state"` and the BEM block class
 * (T-003), and an arbitrary `data-*` passthrough (T-004). NSH projects neither
 * (D18), so T-003 keeps the block's visible half and T-004 is dropped, as the
 * port sheet records.
 */

// Resolved on the harness theme (theme/hero-nsh.theme.json):
// light muted oklch(0.5517 0.0138 285.94) #71717aff,
// dark  muted oklch(70.5% 0.015 286.067) #9f9fa9ff.
const MUTED_LIGHT = "#71717aff";
const MUTED_DARK = "#9f9fa9ff";

// heroui/packages/react/tests/components/empty-state/empty-state.test.tsx:6
test("T-001 should render the default text when no children are provided", async () => {
  const app = await openScenario("empty-state/basic");

  expect(app.shows("text:No results found")).toBe(true);
});

// heroui/packages/react/tests/components/empty-state/empty-state.test.tsx:12
// The upstream `getByText` only proves the custom text is there; the fallback
// branch must also be gone, otherwise both strings could be painted.
test("T-002 should render custom children", async () => {
  const app = await openScenario("empty-state/custom");

  expect(app.shows("text:No matches for your search")).toBe(true);
  expect(app.texts()).not.toContain("No results found");
});

// heroui/packages/react/tests/components/empty-state/empty-state.test.tsx:18
// Partial port (port sheet T-003): `data-slot` and the BEM class name are
// dropped by D18. The block's visible effect is text-sm + text-muted, read
// through the default text's span style. Padding (p-2) has no nsh/test query
// and stays a known unverified rule.
test("T-003 should paint the empty state with the block text style", async () => {
  const light = await openScenario("empty-state/basic");

  expect(light.spanStyle("text:No results found").fontSize).toBe(14);
  expect(light.spanStyle("text:No results found").color).toBe(MUTED_LIGHT);

  const dark = await openScenario("empty-state/basic", { colorScheme: "dark" });

  expect(dark.spanStyle("text:No results found").color).toBe(MUTED_DARK);
});
