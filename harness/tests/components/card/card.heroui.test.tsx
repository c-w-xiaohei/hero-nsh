import { expect, open, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Card, per port sheet 4b (T-001, T-002,
 * T-005). Card is a P-tier unit with no interaction, so every case runs
 * headless on the windows platform and there is no Kobalte file.
 *
 * T-003 (variant BEM modifier) and T-004 (arbitrary `data-*` passthrough) are
 * deleted by the port sheet: NSH has no BEM class API and no `data-*` channel
 * (D18), and no `nsh/test` query reads a view's background, which is the only
 * visible effect of the variant modifier. The four variants still mount in
 * `card/variants` for the screenshot baseline.
 *
 * T-002 and T-005 assert `data-slot` attributes upstream; D18 drops that API,
 * so harness/card.fixtures.tsx puts `testID` on the same parts and the tests
 * read those instead. T-005 keeps the two text slots' resolved character
 * styles, which is the only part of the slot classes `nsh/test` can read.
 */

/* Resolved on the harness theme (theme/hero-nsh.theme.json):
 * foreground oklch(0.2103 0.0059 285.89) #18181bff,
 * muted      oklch(0.5517 0.0138 285.94) #71717aff.
 */
const FOREGROUND = "#18181bff";
const MUTED = "#71717aff";

function openFixture(name: string) {
  return open("../../../card.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/card/card.test.tsx:6
// Rewritten port (port sheet T-001): the four upstream `getByText` calls
// become four visible-text checks on the same composed JSX, plus the fifth
// assertion the port sheet adds for `Card.Header`'s own bare string, which no
// upstream case covers (R-014 would otherwise go untested).
test("T-001 renders composed content", async () => {
  const app = await openScenario("card/composition");

  expect(app.shows("text:Title")).toBe(true);
  expect(app.shows("text:Description")).toBe(true);
  expect(app.shows("text:Content")).toBe(true);
  expect(app.shows("text:Footer")).toBe(true);
  expect(app.shows("text:Header note")).toBe(true);
});

// heroui/packages/react/tests/components/card/card.test.tsx:24
// Partial port (port sheet T-002): upstream asserts `data-slot="card"` and a
// `card` BEM class on the root. Both are dropped (D18); the fixture puts
// `testID="card"` on the same root instead, so one assertion covers "the root
// is a real part" and the other covers "the root renders its bare-string
// child", the visible half of the block assertion.
test("T-002 exposes BEM block and data-slot", async () => {
  const app = await openFixture("basic");

  expect(app.shows("id:card")).toBe(true);
  expect(app.shows("text:Body")).toBe(true);
});

// heroui/packages/react/tests/components/card/card.test.tsx:55
// Partial port (port sheet T-005): the five upstream `data-slot` assertions
// become five `testID` checks on the same parts. The slot classes' readable
// half is added: title text-sm / font-medium / text-foreground (R-005),
// description text-sm / text-muted (R-006). The header, content and footer
// slots carry layout only, which no query reads.
test("T-005 exposes data-slot on each sub-part", async () => {
  const app = await openFixture("structure");

  expect(app.shows("id:card-header")).toBe(true);
  expect(app.shows("id:card-title")).toBe(true);
  expect(app.shows("id:card-description")).toBe(true);
  expect(app.shows("id:card-content")).toBe(true);
  expect(app.shows("id:card-footer")).toBe(true);

  const title = app.spanStyle("text:Slot title");

  expect(title.color).toBe(FOREGROUND);
  expect(title.fontSize).toBe(14);
  expect(title.fontWeight).toBe(500);

  const description = app.spanStyle("text:Slot description");

  expect(description.color).toBe(MUTED);
  expect(description.fontSize).toBe(14);
});
