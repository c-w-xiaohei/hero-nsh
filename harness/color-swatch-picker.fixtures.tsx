import { host, mount, View } from "nsh";
import type { Color } from "@heroui/react";
import { ColorSwatchPicker } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ColorSwatchPicker fixture (port sheet 4b), not a shared scenario.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape:
 *   select        the upstream fixture tree
 *                 (heroui/packages/react/tests/components/color-swatch-picker/
 *                 color-swatch-picker.test.tsx:11-29): three presets, circle /
 *                 md / grid, aria-label "Color presets", Swatch and Indicator
 *                 on every Item, and onChange recording the selected color as
 *                 its lowercase hex string (T-004). The three colors are the
 *                 upstream ones because the case asserts #22c55e for the
 *                 second preset.
 *   layout-grid   three Items, each wrapped in a View that reports its bounds
 *                 through onLayout; no `layout` prop, so the picker keeps its
 *                 default (T-003)
 *   layout-stack  the same tree with layout="stack" (T-003)
 *
 * The wrappers in the layout cases are not HeroUI API, which is why the shape
 * is a fixture: a shared scenario has to stay inside HeroUI's own JSX. They
 * also stay out of any selector path: the Item keeps its size, the wrapper is
 * exactly as large as the Item it holds.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

const COLORS = ["#ef4444", "#22c55e", "#3b82f6"] as const;

function recordColor(name: string) {
  return (color: Color) => probe(name)({ hex: color.toString("hex").toLowerCase() });
}

function SelectCase() {
  return (
    <Stage>
      <ColorSwatchPicker aria-label="Color presets" onChange={recordColor("onChange")}>
        {COLORS.map((color) => (
          <ColorSwatchPicker.Item color={color}>
            <ColorSwatchPicker.Swatch />
            <ColorSwatchPicker.Indicator />
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
    </Stage>
  );
}

function LayoutCase(props: { layout?: "grid" | "stack" }) {
  return (
    <Stage>
      <ColorSwatchPicker aria-label="Color presets" layout={props.layout}>
        {COLORS.map((color, index) => (
          <View onLayout={layoutProbe(`box-${index}`)}>
            <ColorSwatchPicker.Item color={color}>
              <ColorSwatchPicker.Swatch />
              <ColorSwatchPicker.Indicator />
            </ColorSwatchPicker.Item>
          </View>
        ))}
      </ColorSwatchPicker>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "select");

  if (name === "layout-grid") return <LayoutCase />;
  if (name === "layout-stack") return <LayoutCase layout="stack" />;

  return <SelectCase />;
}

mount(Fixture);
