import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Meter, per port sheet 4b
 * (T-001, T-005, T-006). Every case keeps its upstream file:line above it and
 * its title starts with the port-sheet id.
 *
 * Meter has no keyboard, pointer or focus interaction, so the cases need no
 * platform-specific file: they open the default headless Windows target.
 * The information upstream reads from `role="meter"`, `aria-valuetext` and
 * `data-slot` is replaced by what NSH can see — the registered accessible name,
 * the formatted output text and the real parts under their testIDs.
 */

// heroui/packages/react/tests/components/meter/meter.test.tsx:7
// Partial port (port sheet T-001): NSH's AccessibilityRole has no `meter`, so
// the upstream `getByRole("meter", {name: "Storage"})` becomes the nearest role.
// Two facts in one check: the role and the Label really registering its text as
// the root's accessibilityLabel. The role's name alone falls back to the inner
// texts, so only `label:` can tell registration from a fallback.
test("T-001 renders with meter role and accessible name", async () => {
  const app = await openScenario("meter/default");

  expect(app.shows("role:progressbar[Storage]") && app.shows("label:Storage")).toBe(true);
});

// heroui/packages/react/tests/components/meter/meter.test.tsx:60
// Partial port (port sheet T-005): the three upstream `data-slot` assertions
// have no NSH channel (D18 has no data attributes); the capability that stays
// is that Output, Track and Fill are real parts with their own testIDs, and the
// nested selector also proves Fill sits inside Track.
test("T-005 exposes data-slot on each sub-part", async () => {
  const app = await openScenario("meter/default");

  expect(app.shows("id:output")).toBe(true);
  expect(app.shows("id:track")).toBe(true);
  expect(app.shows("id:track >> id:fill")).toBe(true);
});

// heroui/packages/react/tests/components/meter/meter.test.tsx:75
// The default `formatOptions` is `{ style: "percent" }`, so value 60 renders as
// "60%". A missing formatOptions default or a wrong percentage branch fails it.
test("T-006 renders the formatted value text in the output", async () => {
  const app = await openScenario("meter/default");

  expect(app.shows("id:output >> text:60%")).toBe(true);
});
