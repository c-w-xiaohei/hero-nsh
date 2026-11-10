import { host, mount } from "nsh";
import type { Color } from "@heroui/react";
import {
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  Label,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ColorPicker fixture (port sheet 4b), not a shared scenario.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape:
 *   with-swatches  the upstream fixture tree, the `withSwatches` branch of
 *                  `renderColorPicker`
 *                  (heroui/packages/react/tests/components/color-picker/
 *                  color-picker.test.tsx:17-59): defaultValue #0485F7, a
 *                  trigger with a ColorSwatch and the Label "Pick a color", and
 *                  a popover holding the three presets, the ColorArea and the
 *                  hue slider. onChange writes the color's lowercase hex into
 *                  Storage (T-007). The three presets are the upstream ones
 *                  because the case asserts #22c55e for the second one.
 *   default        the same tree without the presets, onChange recorded; the
 *                  open / close case (T-006) runs on the shared
 *                  `color-picker/default` scenario instead, so this case only
 *                  exists as the fixture's plain shape.
 */

const PRESETS = ["#ef4444", "#22c55e", "#3b82f6"] as const;

function recordColor(name: string) {
  return (color: Color) => probe(name)({ hex: color.toString("hex").toLowerCase() });
}

function PickerCase(props: { withSwatches?: boolean }) {
  return (
    <Stage>
      <ColorPicker defaultValue="#0485F7" onChange={recordColor("onChange")}>
        <ColorPicker.Trigger>
          <ColorSwatch size="lg" />
          <Label>Pick a color</Label>
        </ColorPicker.Trigger>
        <ColorPicker.Popover>
          {props.withSwatches ? (
            <ColorSwatchPicker aria-label="Color presets" size="xs">
              {PRESETS.map((preset) => (
                <ColorSwatchPicker.Item color={preset}>
                  <ColorSwatchPicker.Swatch />
                </ColorSwatchPicker.Item>
              ))}
            </ColorSwatchPicker>
          ) : null}
          <ColorArea
            aria-label="Color area"
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
          >
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider channel="hue" colorSpace="hsb">
            <Label>Hue</Label>
            <ColorSlider.Output />
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
        </ColorPicker.Popover>
      </ColorPicker>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "with-swatches");

  if (name === "default") return <PickerCase />;

  return <PickerCase withSwatches />;
}

mount(Fixture);
