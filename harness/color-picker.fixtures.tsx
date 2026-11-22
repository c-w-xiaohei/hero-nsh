import { host, mount } from "nsh";
import type { JSX } from "nsh";
import type { Color } from "@heroui/react";
import {
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  EnvironmentScope,
  Label,
} from "@heroui/react";
import type {
  EnvironmentDensity,
  EnvironmentInput,
  EnvironmentWidth,
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
 *
 * Every case mounts inside `Scoped` (A-007): `host.params.input` /
 * `host.params.width` / `host.params.density` inject an `EnvironmentScope`
 * per field, and absent params keep the host-derived environment (pointer +
 * regular + default on headless/web — the desktop-parity baseline). The
 * wrapper is always a real provider, never a bare fragment: popover's §7
 * measured that a fragment wrapper breaks the exit-hold unmount.
 *
 * `host.params.presentation` ∈ "auto"|"panel"|"sheet" pins the carrier on
 * `ColorPicker.Popover`; `host.params.nonmodal`="1" sets `isNonModal` (the
 * non-modal fold of A-002). The popover carries `testID="cp"` so the carrier
 * probes read `cp-panel` / `cp-sheet` (the `<id>-panel` derivation
 * convention), and `probe("openChange")` records the open/close round.
 */

const PRESETS = ["#ef4444", "#22c55e", "#3b82f6"] as const;

function recordColor(name: string) {
  return (color: Color) => probe(name)({ hex: color.toString("hex").toLowerCase() });
}

function PickerCase(props: { withSwatches?: boolean }) {
  const presentation = String(host.params.presentation ?? "");
  const nonModal = String(host.params.nonmodal ?? "") === "1";

  return (
    <Stage>
      <ColorPicker defaultValue="#0485F7" onChange={recordColor("onChange")}>
        <ColorPicker.Trigger>
          <ColorSwatch size="lg" />
          <Label>Pick a color</Label>
        </ColorPicker.Trigger>
        <ColorPicker.Popover
          testID="cp"
          presentation={
            presentation === ""
              ? undefined
              : (presentation as "auto" | "panel" | "sheet")
          }
          isNonModal={nonModal || undefined}
          onOpenChange={probe("openChange")}
        >
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

/**
 * EnvironmentScope wrapper (A-007): always a real provider, per-field. An
 * absent param keeps the host-derived value, so a case opened without them is
 * the desktop-parity baseline. NSH context reaches a subtree only for
 * elements created under the provider, so the case element is built inside
 * the provider, never outside it.
 */
function Scoped(props: { children?: JSX.Element }) {
  const input = host.params.input;
  const width = host.params.width;
  const density = host.params.density;

  return (
    <EnvironmentScope
      input={input === undefined ? undefined : (String(input) as EnvironmentInput)}
      width={width === undefined ? undefined : (String(width) as EnvironmentWidth)}
      density={
        density === undefined ? undefined : (String(density) as EnvironmentDensity)
      }
    >
      {props.children}
    </EnvironmentScope>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "with-swatches");

  if (name === "default") {
    return (
      <Scoped>
        <PickerCase />
      </Scoped>
    );
  }

  return (
    <Scoped>
      <PickerCase withSwatches />
    </Scoped>
  );
}

mount(Fixture);
