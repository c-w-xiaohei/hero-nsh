import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ColorSwatchPicker, from
 * heroui/packages/react/tests/components/color-swatch-picker/color-swatch-picker.test.tsx
 * (port sheet 4b, rows T-001, T-003 and T-004).
 *
 * T-002 ("exposes data-slots and BEM block") is a D18 deletion: all four
 * assertions are `data-slot` / BEM class name queries, and `nsh test` reads
 * neither. The four parts still have to mount; T-001 (Root + Items), T-004
 * (Item selection) and the screenshot scenarios cover that.
 *
 * T-005/T-008/T-009 belong to ColorPicker and live in
 * ../color-picker/color-picker.heroui.test.tsx.
 *
 * Every case here runs on the headless desktop (`platform: "windows"`), the
 * platform the port sheet gives these rows: none of them moves focus with Tab
 * and none needs aria state, so nothing is narrowed to a `.web.` file.
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function openCase(name: string, params: Record<string, string | number | boolean> = {}): Promise<App> {
  return open("../../../color-swatch-picker.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

/** The latest bounds each wrapper reported; a real host lays out a frame after mount. */
async function boxes(app: App): Promise<LayoutCall[]> {
  await app.wait(20);

  return ["box-0", "box-1", "box-2"].map((name) => {
    const calls = callsOf(app, "layout")
      .map((args) => args[0] as LayoutCall)
      .filter((call) => call.name === name);
    const found = calls[calls.length - 1];

    if (!found) throw new Error(`no layout call recorded for ${name}`);

    return found;
  });
}

// heroui/packages/react/tests/components/color-swatch-picker/color-swatch-picker.test.tsx:37
// T-001: the root is a named listbox and every Item registered itself as an
// option. The shared scenario is the story's Default, seven presets, so the
// count is 7 here (the upstream fixture rendered three); a Root that failed to
// mount, a lost name or an Item that never reached the collection fails it.
test("T-001 renders a listbox of color options", async () => {
  const app = await openScenario("color-swatch-picker/default");

  expect(app.shows("role:listbox[Color presets]")).toBe(true);
  expect(app.count("role:option")).toBe(7);
});

// heroui/packages/react/tests/components/color-swatch-picker/color-swatch-picker.test.tsx:55
// Rewritten port of T-003: upstream asserts the `--grid` BEM modifier on the
// root, which is a D18 deletion and unreadable from `nsh test`. The modifier's
// meaning is the default layout itself, so the fixture wraps all three Items in
// boxes that report their bounds: the default lays them on one row, left to
// right, and `layout="stack"` puts them in one column. Two more assertions than
// upstream, none removed.
test("T-003 lays the default grid on one row and stack in one column", async () => {
  const grid = await openCase("layout-grid");
  const [first, second, third] = await boxes(grid);

  expect(first.y).toBe(second.y);
  expect(second.y).toBe(third.y);
  expect(first.x).toBeLessThan(second.x);
  expect(second.x).toBeLessThan(third.x);

  const stack = await openCase("layout-stack");
  const [top, middle, bottom] = await boxes(stack);

  expect(top.x).toBe(middle.x);
  expect(middle.x).toBe(bottom.x);
  expect(top.y).toBeLessThan(middle.y);
  expect(middle.y).toBeLessThan(bottom.y);
});

// heroui/packages/react/tests/components/color-swatch-picker/color-swatch-picker.test.tsx:63
// T-004: a press selects the swatch and reports the color it stands for. The
// fixture keeps upstream's three presets, so the second option is #22c55e; one
// color written to Storage proves the selection wrote through onChange once,
// and its hex proves the identity was resolved back to the Item's color.
test("T-004 calls onChange when selecting a swatch", async () => {
  const app = await openCase("select");

  await app.press("role:option >> nth=1");

  const calls = callsOf(app, "onChange");

  expect(calls).toHaveLength(1);
  expect(calls[0][0]).toEqual({ hex: "#22c55e" });
});
