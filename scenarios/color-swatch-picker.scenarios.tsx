import { signal, Text, View } from "nsh";
import { ColorSwatchPicker, parseColor } from "@heroui/react";
import type { Color } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared ColorSwatchPicker scenarios, written with HeroUI 3.2.7's API only, so
 * the reference app (npm @heroui/react 3.2.7) and this library render the same
 * JSX. The story file is color-swatch-picker.stories.tsx; the port sheet 4b
 * scenario table lists these entries.
 *
 *   color-swatch-picker/default         story Default: seven presets, circle /
 *                                       md / grid, aria-label "Color presets"
 *                                       (T-001's tree; also the light/dark
 *                                       baseline for the selected border, the
 *                                       scaled-down swatch and the check)
 *   color-swatch-picker/sizes           story Sizes: the five size steps
 *   color-swatch-picker/variants        story Variants: circle / square
 *   color-swatch-picker/layouts         story Layouts: grid / stack (T-003's
 *                                       stack half is measured on the fixture,
 *                                       this entry is the screenshot evidence)
 *   color-swatch-picker/all-variants    story AllVariants: two variants x five
 *                                       sizes, the full mount and the pixel
 *                                       baselines for R-027 … R-047
 *   color-swatch-picker/controlled      story Controlled: `value` + `onChange`
 *                                       echo in a Text
 *   color-swatch-picker/disabled        story Disabled: every Item isDisabled
 *   color-swatch-picker/default-value   story WithDefaultValue:
 *                                       defaultValue="#8B5CF6"
 *   color-swatch-picker/custom-indicator
 *                                       story WithCustomIndicator: the
 *                                       Indicator's children replace the default
 *                                       check. Upstream uses an iconify icon;
 *                                       a Text stands in for it so the shared
 *                                       file keeps to HeroUI's API.
 *   color-swatch-picker/extended-palette
 *                                       story ExtendedPalette: 38 presets,
 *                                       size="sm", className="gap-1"
 *
 * The stories lay their rows out with `div` / `span`; those become `View` and
 * `Text`. Every wrapper there carries a plain string, so the strings are
 * wrapped as NSH requires.
 */

const DEFAULT_COLORS = [
  "#F43F5E",
  "#D946EF",
  "#8B5CF6",
  "#3B82F6",
  "#06B6D4",
  "#10B981",
  "#84CC16",
] as const;

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
const VARIANTS = ["circle", "square"] as const;
const LAYOUTS = ["grid", "stack"] as const;

const EXTENDED_PALETTE = [
  // Reds
  "#FEE2E2",
  "#FECACA",
  "#FCA5A5",
  "#F87171",
  "#EF4444",
  "#DC2626",
  // Oranges
  "#FFEDD5",
  "#FED7AA",
  "#FDBA74",
  "#FB923C",
  "#F97316",
  "#EA580C",
  // Yellows
  "#FEF3C7",
  "#FDE68A",
  "#FCD34D",
  "#FBBF24",
  "#F59E0B",
  "#D97706",
  // Greens
  "#DCFCE7",
  "#BBF7D0",
  "#86EFAC",
  "#4ADE80",
  "#22C55E",
  "#16A34A",
  // Blues
  "#DBEAFE",
  "#BFDBFE",
  "#93C5FD",
  "#60A5FA",
  "#3B82F6",
  "#2563EB",
  // Purples
  "#EDE9FE",
  "#DDD6FE",
  "#C4B5FD",
  "#A78BFA",
  "#8B5CF6",
  "#7C3AED",
  // White & Black
  "#FFFFFF",
  "#000000",
] as const;

/** One picker of presets; the story's Template, with the check unless overridden. */
function Palette(props: {
  colors?: readonly string[];
  layout?: (typeof LAYOUTS)[number];
  size?: (typeof SIZES)[number];
  variant?: (typeof VARIANTS)[number];
  className?: string;
  isDisabled?: boolean;
  customIndicator?: boolean;
}) {
  const colors = props.colors ?? DEFAULT_COLORS;

  return (
    <ColorSwatchPicker
      aria-label="Color presets"
      className={props.className}
      layout={props.layout}
      size={props.size}
      variant={props.variant}
    >
      {colors.map((color) => (
        <ColorSwatchPicker.Item color={color} isDisabled={props.isDisabled}>
          <ColorSwatchPicker.Swatch />
          {props.customIndicator ? (
            <ColorSwatchPicker.Indicator>
              <Text class="text-xs">★</Text>
            </ColorSwatchPicker.Indicator>
          ) : (
            <ColorSwatchPicker.Indicator />
          )}
        </ColorSwatchPicker.Item>
      ))}
    </ColorSwatchPicker>
  );
}

function Default() {
  return (
    <Stage>
      <Palette layout="grid" size="md" variant="circle" />
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <View class="flex-col gap-8">
        {SIZES.map((size) => (
          <View class="flex-col gap-2">
            <Text class="text-sm font-medium text-muted capitalize">{size}</Text>
            <Palette size={size} />
          </View>
        ))}
      </View>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <View class="flex-col gap-8">
        {VARIANTS.map((variant) => (
          <View class="flex-col gap-2">
            <Text class="text-sm font-medium text-muted capitalize">{variant}</Text>
            <Palette variant={variant} />
          </View>
        ))}
      </View>
    </Stage>
  );
}

function Layouts() {
  return (
    <Stage>
      <View class="flex-col gap-8">
        {LAYOUTS.map((layout) => (
          <View class="flex-col gap-2">
            <Text class="text-sm font-medium text-muted capitalize">{layout}</Text>
            <Palette layout={layout} />
          </View>
        ))}
      </View>
    </Stage>
  );
}

function AllVariants() {
  return (
    <Stage>
      <View class="flex-row gap-16">
        {VARIANTS.map((variant) => (
          <View class="flex-col gap-6">
            <Text class="text-sm font-semibold text-muted capitalize">{variant}</Text>
            {SIZES.map((size) => (
              <View class="flex-row items-center gap-4">
                <View class="w-8">
                  <Text class="text-sm text-muted">{size}</Text>
                </View>
                <Palette size={size} variant={variant} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </Stage>
  );
}

function Controlled() {
  const value = signal(parseColor("#F43F5E"));

  return (
    <Stage>
      <View class="flex-col gap-4">
        <ColorSwatchPicker
          aria-label="Color presets"
          value={value()}
          onChange={(color: Color) => value.set(color)}
        >
          {DEFAULT_COLORS.map((color) => (
            <ColorSwatchPicker.Item color={color}>
              <ColorSwatchPicker.Swatch />
              <ColorSwatchPicker.Indicator />
            </ColorSwatchPicker.Item>
          ))}
        </ColorSwatchPicker>
        <View class="flex-row gap-1">
          <Text class="text-sm text-muted">Selected:</Text>
          <Text class="text-sm font-medium">{value().toString("hex")}</Text>
        </View>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Palette isDisabled />
    </Stage>
  );
}

function DefaultValue() {
  return (
    <Stage>
      <ColorSwatchPicker aria-label="Color presets" defaultValue="#8B5CF6">
        {DEFAULT_COLORS.map((color) => (
          <ColorSwatchPicker.Item color={color}>
            <ColorSwatchPicker.Swatch />
            <ColorSwatchPicker.Indicator />
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
    </Stage>
  );
}

function CustomIndicator() {
  return (
    <Stage>
      <Palette customIndicator />
    </Stage>
  );
}

function ExtendedPalette() {
  return (
    <Stage>
      <View class="w-[448px]">
        <Palette className="gap-1" colors={EXTENDED_PALETTE} size="sm" />
      </View>
    </Stage>
  );
}

export const colorSwatchPickerScenarios: Record<string, Component> = {
  "color-swatch-picker/default": Default,
  "color-swatch-picker/sizes": Sizes,
  "color-swatch-picker/variants": Variants,
  "color-swatch-picker/layouts": Layouts,
  "color-swatch-picker/all-variants": AllVariants,
  "color-swatch-picker/controlled": Controlled,
  "color-swatch-picker/disabled": Disabled,
  "color-swatch-picker/default-value": DefaultValue,
  "color-swatch-picker/custom-indicator": CustomIndicator,
  "color-swatch-picker/extended-palette": ExtendedPalette,
};
