import { expect, open, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for EmptyState, per port sheet 4b
 * (T-001 … T-004) plus X-001 for the ARIA aliases.
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

function openFixture(name: string) {
  return open("../../../empty-state.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

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
// through the default text's span style. The font check runs in the NSH-only
// `inherited` fixture: under a text-lg parent a plain Text measures 18, so 14
// on the EmptyState text can only be the block's own text-sm (R-002), whereas
// the default scenario would read 14 even with text-sm deleted. Padding (p-2)
// has no nsh/test query and stays a known unverified rule.
test("T-003 should paint the empty state with the block text style", async () => {
  const light = await openScenario("empty-state/basic");

  expect(light.spanStyle("text:No results found").color).toBe(MUTED_LIGHT);

  const dark = await openScenario("empty-state/basic", { colorScheme: "dark" });

  expect(dark.spanStyle("text:No results found").color).toBe(MUTED_DARK);

  const inherited = await openFixture("inherited");

  expect(inherited.spanStyle("text:plain").fontSize).toBe(18);
  expect(inherited.spanStyle("text:No results found").fontSize).toBe(14);
});

// src/components/empty-state/empty-state.tsx:26-54,122-135; src/components/empty-state/dom-props.ts:37-76
// X-001: upstream spreads every div attribute onto the root, so a caller's
// aria-label / aria-hidden / aria-* state reaches the element. NSH models them
// as accessibilityLabel / accessibilityElementsHidden / accessibilityState;
// viewProps() used to discard every aria-* before the root saw it. The fixture
// passes aria-label next to a different accessibilityLabel, so only a mapped
// aria name makes the first assertion pass and the second fail.
test("X-001 maps aria-label to the root's accessibility label", async () => {
  const app = await openFixture("aria-label");

  expect(app.shows("label:No search results")).toBe(true);
  expect(app.shows("label:Fallback name")).toBe(false);
  expect(app.shows("text:Nothing here")).toBe(true);
});
