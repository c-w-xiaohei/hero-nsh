import { signal, Text, View } from "nsh";
import { ColorSlider, ColorSwatch, Label, parseColor } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared ColorSlider scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX. The story file is
 * color-slider.stories.tsx; the four upstream test cases (port sheet 4b) only
 * render the default shape with a Label (T-001..T-004), so the rest of the
 * entries are the appearance and layout matrix.
 *
 *   color-slider/default            T-001, T-002: story Default, horizontal,
 *                                   Label + Output, defaultValue hsl(0,100%,50%)
 *   color-slider/saturation         story SaturationChannel: two-stop gradient
 *   color-slider/lightness          story LightnessChannel: three-stop gradient
 *   color-slider/alpha              story AlphaChannel: the checkerboard and the
 *                                   translucent gradient (R-040, R-070, R-077)
 *   color-slider/rgb                story RGBChannels: three rgb sliders sharing
 *                                   one controlled color
 *   color-slider/vertical           story Vertical: three aria-label-only
 *                                   sliders, so the track-only grid template
 *                                   (R-053 / R-054 / R-055) is visible
 *   color-slider/disabled           T-004: story Disabled, hsl(200,100%,50%)
 *   color-slider/controlled         story Controlled: controlled hue /
 *                                   saturation / lightness plus a live swatch
 *   color-slider/channels           the docs Channels example: three hsl sliders
 *                                   of one color next to a swatch
 *   color-slider/render-function.split
 *                                   the `render` prop, accepted and ignored on
 *                                   this side; it must not change the mount
 *   color-slider/render-props.split story-level render functions: HeroUI passes
 *                                   values, this side passes accessors (D17),
 *                                   written as the accessor form only
 *   color-slider/all                8 channels x both orientations, for the
 *                                   light / dark screenshot baselines
 *
 * The `render-function.split` and `render-props.split` entries are NSH-only by
 * the SOP 3.3.3 exception: `render` returns a DOM node on the HeroUI side and
 * takes no effect here, and the render-function arguments are accessors here.
 */

/* The `all` grid keeps every row a literal `channel` / `colorSpace` pair, so it
 * satisfies HeroUI's discriminated `ColorSliderChannelProps` union the same way
 * the upstream stories do (color-slider.stories.tsx:49,74,93,112). A single
 * array mixing channels and color spaces would widen both props to unions that
 * no member of that union accepts, so the rows are grouped by color space and
 * each group renders with its own literal `colorSpace`. */
const HSL_ROWS = [
  { channel: "hue", label: "Hue", value: "hsl(210, 100%, 50%)" },
  { channel: "saturation", label: "Saturation", value: "hsl(210, 100%, 50%)" },
  { channel: "lightness", label: "Lightness", value: "hsl(210, 100%, 50%)" },
  { channel: "alpha", label: "Alpha", value: "hsla(210, 100%, 50%, 0.5)" },
] as const;

const HSB_ROWS = [
  { channel: "brightness", label: "Brightness", value: "hsb(210, 100%, 100%)" },
] as const;

const RGB_ROWS = [
  { channel: "red", label: "Red", value: "rgb(64, 128, 255)" },
  { channel: "green", label: "Green", value: "rgb(64, 128, 255)" },
  { channel: "blue", label: "Blue", value: "rgb(64, 128, 255)" },
] as const;

function Default() {
  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider channel="hue" colorSpace="hsl" defaultValue="hsl(0, 100%, 50%)">
          <Label>Hue</Label>
          <ColorSlider.Output />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

function Saturation() {
  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider channel="saturation" colorSpace="hsl" defaultValue="hsl(0, 100%, 50%)">
          <Label>Saturation</Label>
          <ColorSlider.Output />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

function Lightness() {
  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider channel="lightness" colorSpace="hsl" defaultValue="hsl(0, 100%, 50%)">
          <Label>Lightness</Label>
          <ColorSlider.Output />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

function Alpha() {
  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider channel="alpha" colorSpace="hsl" defaultValue="hsla(0, 100%, 50%, 0.5)">
          <Label>Alpha</Label>
          <ColorSlider.Output />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

function Rgb() {
  const color = signal(parseColor("rgb(255, 0, 0)"));
  const channels = [
    { channel: "red", label: "Red" },
    { channel: "green", label: "Green" },
    { channel: "blue", label: "Blue" },
  ] as const;

  return (
    <Stage>
      <View class="w-[320px] flex-col gap-4">
        {channels.map((entry) => (
          <ColorSlider
            channel={entry.channel}
            colorSpace="rgb"
            value={color()}
            onChange={(next) => color.set(next)}
          >
            <Label>{entry.label}</Label>
            <ColorSlider.Output />
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
        ))}
      </View>
    </Stage>
  );
}

function Vertical() {
  const channels = [
    { channel: "hue", label: "Hue" },
    { channel: "saturation", label: "Saturation" },
    { channel: "lightness", label: "Lightness" },
  ] as const;

  return (
    <Stage>
      <View class="flex-row gap-8">
        {channels.map((entry) => (
          <View class="h-48 w-16">
            <ColorSlider
              aria-label={entry.label}
              channel={entry.channel}
              defaultValue="hsl(0, 100%, 50%)"
              orientation="vertical"
            >
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
          </View>
        ))}
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider channel="hue" defaultValue="hsl(200, 100%, 50%)" isDisabled>
          <Label>Hue</Label>
          <ColorSlider.Output />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

function Controlled() {
  const color = signal(parseColor("hsl(0, 100%, 50%)"));
  const channels = [
    { channel: "hue", label: "Hue" },
    { channel: "saturation", label: "Saturation" },
    { channel: "lightness", label: "Lightness" },
  ] as const;

  return (
    <Stage>
      <View class="w-[320px] flex-col gap-4">
        {channels.map((entry) => (
          <ColorSlider
            channel={entry.channel}
            value={color()}
            onChange={(next) => color.set(next)}
          >
            <Label>{entry.label}</Label>
            <ColorSlider.Output />
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
        ))}
      </View>
      <View class="flex-row items-center gap-3">
        <ColorSwatch color={color()} size="lg" />
        <Text class="text-sm text-muted">{`Current color: ${color().toString("hsl")}`}</Text>
      </View>
    </Stage>
  );
}

function Channels() {
  return (
    <Stage>
      <View class="w-[320px] flex-col gap-4">
        <ColorSlider channel="hue" colorSpace="hsl" defaultValue="hsl(200, 100%, 50%)">
          <Label>Hue</Label>
          <ColorSlider.Output />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
        <ColorSlider channel="saturation" colorSpace="hsl" defaultValue="hsl(200, 100%, 50%)">
          <Label>Saturation</Label>
          <ColorSlider.Output />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
        <ColorSlider channel="lightness" colorSpace="hsl" defaultValue="hsl(200, 100%, 50%)">
          <Label>Lightness</Label>
          <ColorSlider.Output />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
      <View class="flex-row items-center gap-3">
        <ColorSwatch color="hsl(200, 100%, 50%)" size="lg" />
        <Text class="text-sm text-muted">hsl(200, 100%, 50%)</Text>
      </View>
    </Stage>
  );
}

/* The upstream `render` prop hands a DOM render function to the primitive. NSH
 * has no DOM, so the prop is accepted and has no effect (port sheet §8): the
 * slider must mount exactly like the default case. */
function RenderFunctionSplit() {
  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider
          channel="hue"
          defaultValue="hsl(120, 100%, 50%)"
          render={() => null}
        >
          <Label>Hue</Label>
          <ColorSlider.Output />
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
      </View>
    </Stage>
  );
}

/* D17: the arguments of every children function are accessors here. The four
 * parts print their state as text because nsh/test cannot read aria state. */
function RenderPropsSplit() {
  return (
    <Stage>
      <View class="w-[320px]">
        <ColorSlider channel="hue" defaultValue="hsl(0, 100%, 50%)">
          {({ orientation, isDisabled }) => (
            <View class="flex-col gap-1">
              <Text class="text-sm text-muted">
                {`${orientation()} / ${isDisabled() ? "disabled" : "enabled"}`}
              </Text>
              <ColorSlider.Output>
                {({ state }) => <Text>{state().value.toString("hsl")}</Text>}
              </ColorSlider.Output>
              <ColorSlider.Track>
                {({ isHovered }) => (
                  <View class="relative">
                    <ColorSlider.Thumb>
                      {({ color }) => <Text>{color().toString("hex")}</Text>}
                    </ColorSlider.Thumb>
                    <Text class="text-sm text-muted">
                      {isHovered() ? "track hovered" : "track idle"}
                    </Text>
                  </View>
                )}
              </ColorSlider.Track>
            </View>
          )}
        </ColorSlider>
      </View>
    </Stage>
  );
}

function All() {
  return (
    <Stage>
      <View class="flex-col gap-6">
        {HSL_ROWS.map((entry) => (
          <View class="w-[320px]">
            <ColorSlider channel={entry.channel} colorSpace="hsl" defaultValue={entry.value}>
              <Label>{entry.label}</Label>
              <ColorSlider.Output />
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
          </View>
        ))}
        {HSB_ROWS.map((entry) => (
          <View class="w-[320px]">
            <ColorSlider channel={entry.channel} colorSpace="hsb" defaultValue={entry.value}>
              <Label>{entry.label}</Label>
              <ColorSlider.Output />
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
          </View>
        ))}
        {RGB_ROWS.map((entry) => (
          <View class="w-[320px]">
            <ColorSlider channel={entry.channel} colorSpace="rgb" defaultValue={entry.value}>
              <Label>{entry.label}</Label>
              <ColorSlider.Output />
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
          </View>
        ))}
        <View class="flex-row items-start gap-6">
          {HSL_ROWS.map((entry) => (
            <View class="h-48 w-16">
              <ColorSlider
                aria-label={entry.label}
                channel={entry.channel}
                colorSpace="hsl"
                defaultValue={entry.value}
                orientation="vertical"
              >
                <ColorSlider.Track>
                  <ColorSlider.Thumb />
                </ColorSlider.Track>
              </ColorSlider>
            </View>
          ))}
          {HSB_ROWS.map((entry) => (
            <View class="h-48 w-16">
              <ColorSlider
                aria-label={entry.label}
                channel={entry.channel}
                colorSpace="hsb"
                defaultValue={entry.value}
                orientation="vertical"
              >
                <ColorSlider.Track>
                  <ColorSlider.Thumb />
                </ColorSlider.Track>
              </ColorSlider>
            </View>
          ))}
          {RGB_ROWS.map((entry) => (
            <View class="h-48 w-16">
              <ColorSlider
                aria-label={entry.label}
                channel={entry.channel}
                colorSpace="rgb"
                defaultValue={entry.value}
                orientation="vertical"
              >
                <ColorSlider.Track>
                  <ColorSlider.Thumb />
                </ColorSlider.Track>
              </ColorSlider>
            </View>
          ))}
        </View>
      </View>
    </Stage>
  );
}

export const colorSliderScenarios: Record<string, Component> = {
  "color-slider/default": Default,
  "color-slider/saturation": Saturation,
  "color-slider/lightness": Lightness,
  "color-slider/alpha": Alpha,
  "color-slider/rgb": Rgb,
  "color-slider/vertical": Vertical,
  "color-slider/disabled": Disabled,
  "color-slider/controlled": Controlled,
  "color-slider/channels": Channels,
  "color-slider/render-function.split": RenderFunctionSplit,
  "color-slider/render-props.split": RenderPropsSplit,
  "color-slider/all": All,
};
