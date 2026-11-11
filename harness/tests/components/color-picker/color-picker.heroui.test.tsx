import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ColorPicker, from
 * heroui/packages/react/tests/components/color-picker/color-picker.test.tsx
 * (port sheet 4b, rows T-005 … T-007).
 *
 * T-005 ("exposes data-slots and BEM block") is a D18 deletion: the three
 * assertions are `data-slot` / BEM class name queries. The root and the trigger
 * still have to mount, which T-006's first step (pressing the trigger opens the
 * popover) proves.
 *
 * The browser file's two cases (T-008, T-009) read `animationName`,
 * `animationFillMode`, the animated property list and `data-exiting`, none of
 * which `nsh test` can see; the port sheet turns both into screenshot
 * comparisons of the entry and exit frames, so no test is written for them.
 *
 * Both cases run on the headless desktop (`platform: "windows"`), the platform
 * the port sheet gives these rows.
 */

function openCase(name: string) {
  return open("../../../color-picker.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/color-picker/color-picker.test.tsx:81
// Partial port of T-006 (port sheet 4b): the press opens the popover and Escape
// closes it, read through the "Hue" label only the popover content carries. The
// two dropped assertions are `[data-slot="color-picker-popover"]` (D18) and
// `getByRole("dialog")` (NSH's AccessibilityRole has no `dialog`, port sheet
// section 8); the open / close facts they stood for stay covered by the pair
// kept here.
test("T-006 supports opening and closing the popover", async () => {
  const app = await openScenario("color-picker/default");

  await app.press("role:button[Pick a color]");
  await app.waitFor("text:Hue");
  expect(app.shows("text:Hue")).toBe(true);

  await app.keyboard.press("escape");
  await app.waitFor("text:Hue", { state: "gone" });
  expect(app.shows("text:Hue")).toBe(false);
});

// heroui/packages/react/tests/components/color-picker/color-picker.test.tsx:97
// T-007: the popover's ColorSwatchPicker reads the color the root owns and
// writes a press back through the root's onChange. The fixture keeps upstream's
// three presets, so the second option is #22c55e. One recorded call proves the
// preset reached the root exactly once and that the key resolved to the Item's
// color.
test("T-007 supports updating color via ColorSwatchPicker item", async () => {
  const app = await openCase("with-swatches");

  await app.press("role:button[Pick a color]");
  await app.waitFor("role:option");

  expect(app.count("role:option")).toBeGreaterThan(0);

  await app.press("role:option >> nth=1");

  const calls = callsOf(app, "onChange");

  expect(calls).toHaveLength(1);
  expect(calls[0][0]).toEqual({ hex: "#22c55e" });
});
