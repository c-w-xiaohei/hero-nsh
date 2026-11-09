import { expect, open, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Header, per port sheet 4b (T-001 … T-003).
 *
 * Upstream renders Header inside ListBox.Section because RAC's Header is a
 * collection leaf; NSH has no collection, so the shared scenario renders it
 * alone. Class strings and data-* attributes are not projected by NSH (D18),
 * so T-002 asserts the resolved text style and T-003 asserts the testID
 * channel instead of `data-testid`.
 */

// Resolved on the harness theme (theme/hero-nsh.theme.json):
// light muted oklch(0.5517 0.0138 285.94) #71717aff,
// dark  muted oklch(70.5% 0.015 286.067) #9f9fa9ff.
const MUTED_LIGHT = "#71717aff";
const MUTED_DARK = "#9f9fa9ff";

/** Header needs testID, which a shared scenario cannot carry. */
function openFixture(name: string) {
  return open("../../../header.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/header/header.test.tsx:21
test("T-001 should render the header content within a section", async () => {
  const app = await openScenario("header/basic");

  expect(app.shows("text:Actions")).toBe(true);
});

// heroui/packages/react/tests/components/header/header.test.tsx:27
// Partial port (port sheet T-002): the `data-slot="header"` and BEM class-name
// assertions are dropped by D18 and have no visible effect. Their visible half
// becomes the resolved text style: text-xs, font-medium and text-muted in both
// appearances.
test("T-002 should expose the header appearance", async () => {
  const light = await openScenario("header/basic");
  const style = light.spanStyle("text:Actions");

  expect(style.fontSize).toBe(12);
  expect(style.fontWeight).toBe(500);
  expect(style.color).toBe(MUTED_LIGHT);

  const dark = await openScenario("header/basic", { colorScheme: "dark" });

  expect(dark.spanStyle("text:Actions").color).toBe(MUTED_DARK);
});

// heroui/packages/react/tests/components/header/header.test.tsx:35
// Rewritten port (port sheet T-003): upstream proves the arbitrary `data-*`
// passthrough with `data-testid`; NSH exposes no arbitrary data attributes, so
// the public channel is `testID` -> `data-testid`.
test("T-003 should pass the test id through", async () => {
  const app = await openFixture("attributed");

  expect(app.shows("id:section-header")).toBe(true);
});

// Ref forwarding regression: this scenario passes no ref to Header. A plain
// `ref={local.ref}` with an undefined value is a ref store to NSH, which throws
// at mount on the web target and renders an empty page. The callback ref keeps
// the header text on screen on every target.
test("X-004 renders a ref-less Header on a real engine", async () => {
  const app = await openScenario("header/basic");

  expect(app.shows("text:Actions")).toBe(true);
});
