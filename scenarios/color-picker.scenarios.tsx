import { signal, Text, View } from "nsh";
import {
  Button,
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  Label,
  ListBox,
  Select,
  parseColor,
} from "@heroui/react";
import type { Color, ColorChannel, ColorSpace } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared ColorPicker scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app (npm @heroui/react 3.2.7) and this library render the same JSX.
 * The story file is color-picker.stories.tsx; the port sheet 4b scenario table
 * lists these entries.
 *
 *   color-picker/default          story Default: trigger with a ColorSwatch and
 *                                 the Label "Pick a color", popover with a
 *                                 ColorArea and the Hue slider (T-006's tree;
 *                                 also the light/dark baseline for R-110 …
 *                                 R-118)
 *   color-picker/with-swatches    story WithSwatches: nine presets above the
 *                                 area and the slider (T-007's shape)
 *   color-picker/width-fields     story WidthFields: a Select for the color
 *                                 space and three ColorFields
 *   color-picker/with-sliders     story WithSliders: the same Select with one
 *                                 slider per channel
 *   color-picker/controlled       story Controlled: `value` + `onChange` echo,
 *                                 the nine presets, the area, the hue slider
 *                                 with the shuffle button and a ColorField
 *   color-picker/placement-top    the `placement` API, one entry per side. The
 *   color-picker/placement-bottom story has no page for it and a popover per
 *   color-picker/placement-left   entry is opened (`defaultOpen`), because two
 *   color-picker/placement-right  open popovers would stack and only the top
 *                                 one stays visible to a selector
 *
 * Two story details change so the shared file stays deterministic and readable
 * on both sides: the shuffle button sets a fixed color instead of a random one
 * (a random hue would make the screenshot baseline useless), and the iconify
 * shuffle icon becomes the Text "Shuffle". `max-w-full` is left off the areas
 * and `max-w-62` becomes `max-w-[248px]`, the length the port sheet resolves it
 * to (R-110).
 */

const PRESETS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
] as const;

const CHANNELS: Record<ColorSpace, ColorChannel[]> = {
  hsl: ["hue", "saturation", "lightness"],
  hsb: ["hue", "saturation", "brightness"],
  rgb: ["red", "green", "blue"],
};

function Trigger(props: { label: string }) {
  return (
    <ColorPicker.Trigger>
      <ColorSwatch size="lg" />
      <Label>{props.label}</Label>
    </ColorPicker.Trigger>
  );
}

/** The area and the labelled hue slider every entry puts in the popover. */
function AreaAndHue() {
  return (
    <>
      <ColorArea
        aria-label="Color area"
        colorSpace="hsb"
        xChannel="saturation"
        yChannel="brightness"
      >
        <ColorArea.Thumb />
      </ColorArea>
      <ColorSlider channel="hue" className="gap-1 px-1" colorSpace="hsb">
        <Label>Hue</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
    </>
  );
}

function Default() {
  return (
    <Stage>
      <ColorPicker defaultValue="#0485F7">
        <Trigger label="Pick a color" />
        <ColorPicker.Popover>
          <AreaAndHue />
        </ColorPicker.Popover>
      </ColorPicker>
    </Stage>
  );
}

function WithSwatches() {
  return (
    <Stage>
      <ColorPicker defaultValue="#F43F5E">
        <Trigger label="Brand Color" />
        <ColorPicker.Popover>
          <AreaAndHue />
          <ColorSwatchPicker aria-label="Color presets" className="justify-center px-1" size="xs">
            {PRESETS.map((preset) => (
              <ColorSwatchPicker.Item color={preset}>
                <ColorSwatchPicker.Swatch />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
        </ColorPicker.Popover>
      </ColorPicker>
    </Stage>
  );
}

function ColorSpaceSelect(props: { value: ColorSpace; onChange: (value: ColorSpace) => void }) {
  return (
    <Select
      aria-label="Color space"
      value={props.value}
      variant="secondary"
      onChange={(value) => props.onChange(value as ColorSpace)}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {Object.keys(CHANNELS).map((space) => (
            <ListBox.Item id={space} textValue={space}>
              {space}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function WidthFields() {
  const colorSpace = signal<ColorSpace>("hsl");

  return (
    <Stage>
      <ColorPicker defaultValue="hsla(220, 90%, 50%, 0.8)">
        <Trigger label="Pick a color" />
        <ColorPicker.Popover className="max-w-[248px] gap-2">
          <AreaAndHue />
          <ColorSpaceSelect value={colorSpace()} onChange={(value) => colorSpace.set(value)} />
          <View class="grid w-full grid-cols-3 items-center gap-2">
            {CHANNELS[colorSpace()].map((channel) => (
              <ColorField aria-label={channel} channel={channel} colorSpace={colorSpace()}>
                <ColorField.Group variant="secondary">
                  <ColorField.Input />
                </ColorField.Group>
              </ColorField>
            ))}
          </View>
        </ColorPicker.Popover>
      </ColorPicker>
    </Stage>
  );
}

function HslSliders() {
  return (
    <>
      <ColorSlider channel="hue" className="gap-1 px-1" colorSpace="hsl">
        <Label>hue</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
      <ColorSlider channel="saturation" className="gap-1 px-1" colorSpace="hsl">
        <Label>saturation</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
      <ColorSlider channel="lightness" className="gap-1 px-1" colorSpace="hsl">
        <Label>lightness</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
      <ColorSlider channel="alpha" className="gap-1 px-1">
        <Label>alpha</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
    </>
  );
}

function HsbSliders() {
  return (
    <>
      <ColorSlider channel="hue" className="gap-1 px-1" colorSpace="hsb">
        <Label>hue</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
      <ColorSlider channel="saturation" className="gap-1 px-1" colorSpace="hsb">
        <Label>saturation</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
      <ColorSlider channel="brightness" className="gap-1 px-1" colorSpace="hsb">
        <Label>brightness</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
      <ColorSlider channel="alpha" className="gap-1 px-1">
        <Label>alpha</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
    </>
  );
}

function RgbSliders() {
  return (
    <>
      <ColorSlider channel="red" className="gap-1 px-1" colorSpace="rgb">
        <Label>red</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
      <ColorSlider channel="green" className="gap-1 px-1" colorSpace="rgb">
        <Label>green</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
      <ColorSlider channel="blue" className="gap-1 px-1" colorSpace="rgb">
        <Label>blue</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
      <ColorSlider channel="alpha" className="gap-1 px-1">
        <Label>alpha</Label>
        <ColorSlider.Output className="text-muted" />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
    </>
  );
}

function WithSliders() {
  const colorSpace = signal<ColorSpace>("hsl");

  return (
    <Stage>
      <ColorPicker defaultValue="hsl(219, 58%, 93%)">
        <Trigger label="Pick a color" />
        <ColorPicker.Popover className="max-w-[248px] gap-2 px-2 py-3">
          <ColorSpaceSelect value={colorSpace()} onChange={(value) => colorSpace.set(value)} />
          <View class="flex-col gap-2">
            {colorSpace() === "hsl" ? (
              <HslSliders />
            ) : colorSpace() === "hsb" ? (
              <HsbSliders />
            ) : (
              <RgbSliders />
            )}
          </View>
        </ColorPicker.Popover>
      </ColorPicker>
    </Stage>
  );
}

function Controlled() {
  const color = signal(parseColor("#325578"));

  return (
    <Stage>
      <View class="flex-col gap-4">
        <ColorPicker value={color()} onChange={(next: Color) => color.set(next)}>
          <Trigger label="Pick a color" />
          <ColorPicker.Popover className="gap-2">
            <ColorSwatchPicker aria-label="Color presets" className="justify-center pt-2" size="xs">
              {PRESETS.map((preset) => (
                <ColorSwatchPicker.Item color={preset}>
                  <ColorSwatchPicker.Swatch />
                </ColorSwatchPicker.Item>
              ))}
            </ColorSwatchPicker>
            <ColorArea
              aria-label="Color area"
              colorSpace="hsb"
              xChannel="saturation"
              yChannel="brightness"
            >
              <ColorArea.Thumb />
            </ColorArea>
            <View class="flex-row items-center gap-2 px-1">
              <View class="flex-1">
                <ColorSlider aria-label="Hue slider" channel="hue" colorSpace="hsb">
                  <ColorSlider.Track>
                    <ColorSlider.Thumb />
                  </ColorSlider.Track>
                </ColorSlider>
              </View>
              <Button
                aria-label="Shuffle color"
                size="sm"
                variant="tertiary"
                onPress={() => color.set(parseColor("#F43F5E"))}
              >
                <Text class="text-sm">Shuffle</Text>
              </Button>
            </View>
            <ColorField aria-label="Color field">
              <ColorField.Group variant="secondary">
                <ColorField.Prefix>
                  <ColorSwatch size="xs" />
                </ColorField.Prefix>
                <ColorField.Input />
              </ColorField.Group>
            </ColorField>
          </ColorPicker.Popover>
        </ColorPicker>
        <View class="w-[240px] flex-row gap-1">
          <Text class="text-sm text-muted">Selected:</Text>
          <Text class="text-sm font-medium">{color().toString("hex")}</Text>
        </View>
      </View>
    </Stage>
  );
}

function Placement(props: { placement: "top" | "bottom" | "left" | "right" }) {
  return (
    <Stage>
      <ColorPicker defaultValue="#0485F7">
        <Trigger label="Pick a color" />
        <ColorPicker.Popover defaultOpen placement={props.placement}>
          <AreaAndHue />
        </ColorPicker.Popover>
      </ColorPicker>
    </Stage>
  );
}

export const colorPickerScenarios: Record<string, Component> = {
  "color-picker/default": Default,
  "color-picker/with-swatches": WithSwatches,
  "color-picker/width-fields": WidthFields,
  "color-picker/with-sliders": WithSliders,
  "color-picker/controlled": Controlled,
  "color-picker/placement-top": () => <Placement placement="top" />,
  "color-picker/placement-bottom": () => <Placement placement="bottom" />,
  "color-picker/placement-left": () => <Placement placement="left" />,
  "color-picker/placement-right": () => <Placement placement="right" />,
};
