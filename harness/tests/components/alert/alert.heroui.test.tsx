import { expect, open, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Alert, per port sheet 4b (T-001 … T-006).
 * Each file:line above a test is the upstream location.
 *
 * T-001 and T-006 assert `data-slot` attributes upstream; D18 drops that API,
 * so harness/alert.fixtures.tsx puts `testID` on the same parts and the tests
 * count those. T-002 and T-003 assert BEM modifier classes; the rewritten
 * cases read the modifier's visible effect, the title's resolved color, which
 * comes from the `text-*` classes the variant table applies.
 *
 * T-007 (Kobalte's `role="alert"` case) is deleted in the port sheet: HeroUI's
 * root sets no role, and Kobalte's polymorphic alert shares neither structure
 * nor primitives with this five-part component.
 */

/* Resolved on the harness theme (theme/hero-nsh.theme.json):
 * foreground #18181bff, accent-soft-foreground #1e63aeff,
 * success-soft-foreground #2b7745ff, warning-soft-foreground #855f2eff,
 * danger-soft-foreground #a43433ff.
 */
const FOREGROUND = "#18181bff";
const ACCENT_SOFT_FOREGROUND = "#1e63aeff";
const SUCCESS_SOFT_FOREGROUND = "#2b7745ff";
const WARNING_SOFT_FOREGROUND = "#855f2eff";
const DANGER_SOFT_FOREGROUND = "#a43433ff";

// heroui/packages/react/tests/components/alert/alert.test.tsx:6
// Partial port (port sheet T-001): the upstream `root.className` assertion is
// dropped with the BEM class API (D18). The other five assertions stay: the
// root, indicator and content slots exist, and both texts render inside the
// title and description slots.
test("T-001 exposes data-slot and BEM block", async () => {
  const app = await open("../../../alert.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "basic-structure" } },
  });

  expect(app.shows("id:alert-root")).toBe(true);
  expect(app.shows("id:alert-indicator")).toBe(true);
  expect(app.shows("id:alert-content")).toBe(true);
  expect(app.shows("id:alert-title >> text:New features available")).toBe(true);
  expect(app.shows("id:alert-description >> text:Check out our latest updates.")).toBe(true);
});

// heroui/packages/react/tests/components/alert/alert.test.tsx:27
// Rewritten port (port sheet T-002): upstream asserts the `alert--default` BEM
// modifier on the root. Its visible effect is that a title with no `status`
// keeps the default foreground color; a missing default variant falls back to
// the text's own color, which is not this token.
test("T-002 exposes default status BEM modifier", async () => {
  const app = await openScenario("alert/statuses");

  expect(app.spanStyle("text:Default").color).toBe(FOREGROUND);
});

// heroui/packages/react/tests/components/alert/alert.test.tsx:41
// Rewritten port (port sheet T-003): upstream runs one `it.each` over the four
// non-default statuses and asserts `alert--<status>` on the root. Each status
// keeps one assertion here, on the title color its variant class produces; the
// fifth assertion checks the five colors do not collapse into one, which is how
// a missing or misspelled status entry would fail.
test("T-003 maps status=%s to the matching BEM modifier", async () => {
  const app = await openScenario("alert/statuses");

  const expected = {
    Accent: ACCENT_SOFT_FOREGROUND,
    Success: SUCCESS_SOFT_FOREGROUND,
    Warning: WARNING_SOFT_FOREGROUND,
    Danger: DANGER_SOFT_FOREGROUND,
  } as const;

  const colors: string[] = [app.spanStyle("text:Default").color];

  for (const [title, color] of Object.entries(expected)) {
    const actual = app.spanStyle(`text:${title}`).color;

    expect(actual).toBe(color);
    colors.push(actual);
  }

  expect(new Set(colors).size).toBe(5);
});

// heroui/packages/react/tests/components/alert/alert.test.tsx:58
// Rewritten port (port sheet T-004): upstream asserts that a
// `data-slot="alert-default-icon"` element exists. D18 drops data-slot, and the
// icons unit gives every icon a default `testID`, so the case reads the icon's
// identity instead: the danger status must draw DangerIcon. A missing default
// icon fails, and so does an icon mapping that always picks InfoIcon.
test("T-004 renders a default icon per status when no indicator children are given", async () => {
  const app = await openScenario("alert/basic");

  expect(app.shows("id:icon-danger")).toBe(true);
});

// heroui/packages/react/tests/components/alert/alert.test.tsx:71
// Rewritten port (port sheet T-005): upstream asserts the custom indicator is
// in the document and no `data-slot="alert-default-icon"` exists. The bare
// string also proves the indicator wraps its children in a Text, which NSH
// needs to draw them; the accent status's default icon is InfoIcon, so its
// absence is the second upstream assertion.
test("T-005 renders custom indicator children instead of the default icon", async () => {
  const app = await openScenario("alert/custom-indicator");

  expect(app.shows("text:Loading…")).toBe(true);
  expect(app.count("id:icon-info")).toBe(0);
});

// heroui/packages/react/tests/components/alert/alert.test.tsx:87
// Partial port (port sheet T-006): upstream asserts the title text and that no
// `data-slot="alert-description"` exists. The title assertion stays; the
// data-slot count becomes a `testID` count on the same part.
test("T-006 renders without a description", async () => {
  const app = await open("../../../alert.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "no-description" } },
  });

  expect(app.shows("text:Profile updated successfully")).toBe(true);
  expect(app.count("id:alert-description")).toBe(0);
});
