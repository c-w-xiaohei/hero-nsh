import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ColorSwatch, per port sheet 4b
 * (T-001, T-003, T-004).
 *
 * The upstream file has four cases. T-002 (data-slot and the BEM block class) is
 * deleted by D18. T-003 is a partial port: its two class-name assertions become
 * the box the lg swatch actually lays out, measured through onLayout in
 * harness/color-swatch.fixtures.tsx; the square radius that the second class
 * carried is checked by the `color-swatch/sizes` screenshot, which no automatic
 * assertion can read.
 *
 * T-001 and T-004 name the role. NSH calls HeroUI's `img` role `image`, and a
 * role selector's name is the view's label, so `colorName` that does not reach
 * accessibilityLabel makes T-004 fail.
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function lastLayout(app: App, name: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

function openFixture(): Promise<App> {
  return open("../../../color-swatch.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
  });
}

// heroui/packages/react/tests/components/color-swatch/color-swatch.test.tsx:6
test("T-001 renders with img role", async () => {
  const app = await openScenario("color-swatch/basic", { locale: "en-US" });

  expect(app.shows("role:image")).toBe(true);
  // `getByRole` also means the only one; a swatch that rendered twice would
  // still pass `shows` alone.
  expect(app.count("role:image")).toBe(1);
});

// heroui/packages/react/tests/components/color-swatch/color-swatch.test.tsx:20
// Partial port (port sheet T-003): the `color-swatch--lg` class carries the
// 36-point box, so the fixture measures it; the default md swatch next to it is
// the 32-point control. The `color-swatch--square` half is a radius, and neither
// `nsh test` nor onLayout can read it: it stays with the `color-swatch/sizes`
// screenshot (light and dark).
test("T-003 exposes size and shape BEM modifiers", async () => {
  const app = await openFixture();

  const md = lastLayout(app, "default");
  const lg = lastLayout(app, "lg-square");

  expect(lg.width).toBe(36);
  expect(lg.height).toBe(36);
  expect(md.width).toBe(32);
  expect(md.height).toBe(32);
});

// heroui/packages/react/tests/components/color-swatch/color-swatch.test.tsx:28
test("T-004 supports a custom accessible name via colorName", async () => {
  const app = await openScenario("color-swatch/aria", { locale: "en-US" });

  expect(app.shows("role:image[Brand blue]")).toBe(true);
  expect(app.count("role:image[Brand blue]")).toBe(1);
});
