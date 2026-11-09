import { Text, View } from "nsh";
import { ColorSwatch } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared ColorSwatch scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app (npm @heroui/react 3.2.7) and this library render the same JSX.
 * The story file is color-swatch.stories.tsx; the four upstream test cases only
 * render the default shape/size and the colorName variant (port sheet 4b).
 *
 *   color-swatch/basic          T-001: the default appearance (circle, md) with
 *                               one opaque color
 *   color-swatch/aria           T-004: colorName replaces the generated name
 *   color-swatch/sizes          story Sizes: both shapes x five sizes, 10
 *                               swatches (T-003's radius half is checked by the
 *                               screenshot, its size half by the fixture)
 *   color-swatch/transparency   story Transparency: five alphas of one color,
 *                               which is the only visual evidence for the
 *                               checkerboard and the alpha compositing (R-002,
 *                               R-003)
 *   color-swatch/style-render-props.split
 *                               story StyleRenderProps: the function form of
 *                               `style`; the argument is a values object on the
 *                               HeroUI side and an accessors object here, so the
 *                               two sides are written separately (D17)
 *   color-swatch/all            the size matrix plus five opaque colors and five
 *                               alphas, for the light and dark baselines
 *
 * Every swatch is a fixed-size box, so the rows are laid out explicitly with
 * `flex-row` and a gap instead of the story's `flex items-center gap-3` div.
 */

const SHAPES = ["circle", "square"] as const;
const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
const COLORS = ["#0485F7", "#EF4444", "#F59E0B", "#10B981", "#D946EF"] as const;
const NAMES = ["Blue", "Red", "Amber", "Green", "Fuchsia"] as const;

const TRANSPARENCY = [
  { label: "100% opacity", color: "rgba(4, 133, 247, 1)" },
  { label: "75% opacity", color: "rgba(4, 133, 247, 0.75)" },
  { label: "50% opacity", color: "rgba(4, 133, 247, 0.5)" },
  { label: "25% opacity", color: "rgba(4, 133, 247, 0.25)" },
  { label: "0% opacity", color: "rgba(4, 133, 247, 0)" },
] as const;

function Basic() {
  return (
    <Stage>
      <ColorSwatch color="#0485F7" />
    </Stage>
  );
}

function Aria() {
  return (
    <Stage>
      <ColorSwatch color="#0485F7" colorName="Brand blue" />
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        {SHAPES.map((shape) => (
          <View class="flex-row items-center gap-4">
            {SIZES.map((size) => (
              <ColorSwatch color="#0485F7" shape={shape} size={size} />
            ))}
          </View>
        ))}
      </View>
    </Stage>
  );
}

function Transparency() {
  return (
    <Stage>
      <View class="flex-row items-center gap-4">
        {TRANSPARENCY.map((entry) => (
          <ColorSwatch aria-label={entry.label} color={entry.color} />
        ))}
      </View>
    </Stage>
  );
}

/* D17 split: HeroUI passes `{ color }` as a Color value and this side passes
 * `{ color: () => Color }`. The reference app keeps its own copy of this story
 * with the value form; the entry below is the accessor form. */
function StyleRenderPropsSplit() {
  return (
    <Stage>
      <View class="flex-col gap-6">
        <View class="flex-col gap-2">
          <Text class="text-sm font-semibold text-muted">Custom Border</Text>
          <View class="flex-row items-center gap-3">
            {COLORS.map((color) => (
              <ColorSwatch
                color={color}
                size="lg"
                style={({ color: current }) => ({
                  boxShadow: `0 0 0 3px ${current().toString("css")}40`,
                })}
              />
            ))}
          </View>
        </View>
        <View class="flex-col gap-2">
          <Text class="text-sm font-semibold text-muted">Custom Shadow</Text>
          <View class="flex-row items-center gap-3">
            {COLORS.map((color) => (
              <ColorSwatch
                color={color}
                size="lg"
                style={({ color: current }) => ({
                  boxShadow: `0 4px 14px ${current().toString("css")}80`,
                })}
              />
            ))}
          </View>
        </View>
        <View class="flex-col gap-2">
          <Text class="text-sm font-semibold text-muted">Outline Style</Text>
          <View class="flex-row items-center gap-3">
            {COLORS.map((color) => (
              <ColorSwatch
                color={color}
                size="lg"
                style={({ color: current }) => ({
                  boxShadow: `inset 0 0 0 2px ${current().toString("css")}, inset 0 0 0 4px white`,
                })}
              />
            ))}
          </View>
        </View>
      </View>
    </Stage>
  );
}

function All() {
  return (
    <Stage>
      <View class="flex-col gap-6">
        {SHAPES.map((shape) => (
          <View class="flex-col gap-3">
            <Text class="text-sm font-semibold text-muted capitalize">{shape}</Text>
            {SIZES.map((size) => (
              <View class="flex-row items-center gap-3">
                <View class="w-12">
                  <Text class="text-sm text-muted">{size}</Text>
                </View>
                {COLORS.map((color) => (
                  <ColorSwatch color={color} shape={shape} size={size} />
                ))}
              </View>
            ))}
          </View>
        ))}
        <View class="flex-col gap-3">
          <Text class="text-sm font-semibold text-muted">Colors</Text>
          <View class="flex-row items-center gap-3">
            {COLORS.map((color, index) => (
              <ColorSwatch aria-label={NAMES[index]} color={color} />
            ))}
          </View>
        </View>
        <View class="flex-col gap-3">
          <Text class="text-sm font-semibold text-muted">Transparency</Text>
          <View class="flex-row items-center gap-3">
            {TRANSPARENCY.map((entry) => (
              <ColorSwatch aria-label={entry.label} color={entry.color} />
            ))}
          </View>
        </View>
      </View>
    </Stage>
  );
}

export const colorSwatchScenarios: Record<string, Component> = {
  "color-swatch/basic": Basic,
  "color-swatch/aria": Aria,
  "color-swatch/sizes": Sizes,
  "color-swatch/transparency": Transparency,
  "color-swatch/style-render-props.split": StyleRenderPropsSplit,
  "color-swatch/all": All,
};
