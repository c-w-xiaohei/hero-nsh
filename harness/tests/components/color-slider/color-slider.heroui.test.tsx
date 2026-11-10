import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ColorSlider, per port sheet 4b (T-001,
 * T-002). Both stay on the default headless Windows target: they only render
 * and read the accessibility tree, no keyboard or focus is involved.
 *
 * The upstream selectors read DOM attributes that NSH does not have: the BEM
 * block class and `data-slot` are D18 deletions. What stays is the observable
 * fact behind them, a part that is really mounted with its testID and a thumb
 * that sits inside its track. T-001 uses HeroUI's `slider` role, which NSH calls
 * `adjustable`; the name comes from the composed `<Label>` registering its text
 * on the root, so a broken registration fails it.
 */

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../color-slider.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/color-slider/color-slider.test.tsx:38
// Rewritten port (port sheet T-001): `getByRole("slider", {name: "Hue"})`
// becomes the `adjustable` role NSH uses for the same semantics, and `count`
// keeps the implied "the only one" that `getByRole` carries.
test("T-001 renders a slider thumb with accessible name from composed Label", async () => {
  const app = await openScenario("color-slider/default");

  expect(app.shows("role:adjustable[Hue]")).toBe(true);
  expect(app.count("role:adjustable")).toBe(1);
});

// heroui/packages/react/tests/components/color-slider/color-slider.test.tsx:44
// Partial port (port sheet T-002): the BEM block class assertion is deleted by
// D18, and `data-slot` has no NSH channel. The three data-slot assertions become
// the three parts really rendering under their testIDs; the nested selector adds
// that Thumb sits inside Track, and the named role proves the Label text reached
// the thumb's accessible name.
test("T-002 exposes data-slots and BEM block", async () => {
  const app = await openCase("parts");

  expect(app.shows("id:output")).toBe(true);
  expect(app.shows("id:track")).toBe(true);
  expect(app.shows("id:thumb")).toBe(true);
  expect(app.shows("id:track >> id:thumb")).toBe(true);
  expect(app.shows("role:adjustable[Hue]")).toBe(true);
});
