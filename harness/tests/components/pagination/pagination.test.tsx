import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Pagination, per port sheet 4b
 * (T-001 … T-004, T-006 … T-010).
 *
 * T-005 is a screenshot case there: its three assertions read `aria-current`
 * and `data-active`, neither of which `nsh test` can query, so the active-link
 * ground colour is checked against the web screenshots instead (look check).
 *
 * The dropped halves of T-001, T-002, T-006 and T-009 read `data-slot` or BEM
 * classes, which D18 does not project; the visible half of each stays.
 * The class-based size cases (T-003, T-004) become the link's font size, the
 * one size effect `nsh test` resolves; the box size is paint, checked in the
 * screenshot pass against R-019 / R-025.
 *
 * Every case runs headless on Windows, so the file has no platform suffix.
 */

// heroui/packages/react/tests/components/pagination/pagination.test.tsx:41
// Partial port (port sheet T-001): `data-slot="pagination"` and the BEM block
// class are dropped (D18). The accessible half decides the test: the
// navigation role with its default "pagination" name; either half breaking
// fails it.
test("T-001 exposes a labelled navigation role", async () => {
  const app = await openScenario("pagination/default");

  expect(app.shows("role:navigation[pagination]")).toBe(true);
});

// heroui/packages/react/tests/components/pagination/pagination.test.tsx:50
// Partial port (port sheet T-002): the `[data-slot="pagination-item"]` count is
// dropped (D18; NSH has no `listitem` role either). The list stays, and the
// four pressable controls inside it stand in for the five items: Previous, 1,
// 2 and Next are buttons while the Ellipsis is not, so a missing Content, Item
// or Ellipsis-vs-button mix changes the count.
test("T-002 renders a list with the four pressable controls", async () => {
  const app = await openScenario("pagination/default");

  expect(app.shows("role:list")).toBe(true);
  expect(app.count("role:list >> role:button")).toBe(4);
});

// heroui/packages/react/tests/components/pagination/pagination.test.tsx:57
// Rewritten port (port sheet T-003): the `pagination--md` modifier class is not
// projected (D18). Its one readable effect is the link font size: the default
// root's page number is `text-sm`, 14 points. An ignored `size` falls back to
// the environment size and fails it.
test("T-003 exposes the default md size through the link font size", async () => {
  const app = await openScenario("pagination/sizes");

  expect(app.spanStyle("role:navigation[Medium pagination] >> text:11").fontSize).toBe(14);
});

// heroui/packages/react/tests/components/pagination/pagination.test.tsx:65
// Rewritten port (port sheet T-004): `it.each(["sm", "lg"])` becomes one case
// that walks both parameter groups, one assertion each, so it is never fewer
// than upstream's single `expect(`. The modifier classes become the link font
// sizes: `text-xs` = 12 and `text-base` = 16.
test("T-004 maps size to the matching link font size", async () => {
  const app = await openScenario("pagination/sizes");

  expect(app.spanStyle("role:navigation[Small pagination] >> text:1").fontSize).toBe(12);
  expect(app.spanStyle("role:navigation[Large pagination] >> text:21").fontSize).toBe(16);
});

// heroui/packages/react/tests/components/pagination/pagination.test.tsx:91
// Partial port (port sheet T-006): `aria-hidden="true"` cannot be queried and
// has no visible stand-in, so it is dropped. The fixed "…" content stays: an
// Ellipsis that does not render loses the text.
test("T-006 renders the ellipsis text", async () => {
  const app = await openScenario("pagination/default");

  expect(app.texts()).toContain("…");
});

// heroui/packages/react/tests/components/pagination/pagination.test.tsx:100
test("T-007 calls onPress on Previous, Link and Next", async () => {
  const app = await openScenario("pagination/press");

  await app.press("role:button[Previous]");
  await app.press("role:button[2]");
  await app.press("role:button[Next]");

  expect(callsOf(app, "onPrevious")).toHaveLength(1);
  expect(callsOf(app, "onSelect")).toHaveLength(1);
  expect(callsOf(app, "onNext")).toHaveLength(1);
});

// heroui/packages/react/tests/components/pagination/pagination.test.tsx:130
// Rewritten port (port sheet T-008): `toBeDisabled()` becomes `enabled()`.
// `user.click` on a disabled button becomes a press the host rejects, followed
// by the probe showing `onPress` never ran — upstream's two assertions plus the
// one the click carries.
test("T-008 supports a disabled Previous without interaction", async () => {
  const app = await openScenario("pagination/disabled");

  expect(app.enabled("role:button[Previous]")).toBe(false);

  await expect(app.press("role:button[Previous]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(callsOf(app, "onPress")).toHaveLength(0);
});

// heroui/packages/react/tests/components/pagination/pagination.test.tsx:153
// Partial port (port sheet T-009): `[data-slot="pagination-summary"]` is not
// projected (D18) and has no visible stand-in, so only the text assertion
// stays: a Summary that does not render loses its text.
test("T-009 renders an optional Summary", async () => {
  const app = await openScenario("pagination/summary");

  expect(app.shows("text:1 to 5 of 10 invoices")).toBe(true);
});

// heroui/packages/react/tests/components/pagination/pagination.test.tsx:171
// Rewritten port (port sheet T-010): `data-testid` is not projected, so the
// custom icon is identified by its content instead. The scenario puts a "‹"
// glyph in `PreviousIcon` (upstream draws an iconify icon); the glyph must show
// and the default chevron must be gone — a fallback chevron leaves its count
// at one.
test("T-010 supports a custom Previous icon", async () => {
  const app = await openScenario("pagination/custom-icons.split");

  expect(app.shows("text:‹")).toBe(true);
  expect(app.count("id:icon-chevron-left")).toBe(0);
});
