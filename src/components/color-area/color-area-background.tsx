/*
 * Kobalte's `packages/core/src/color-area/color-area-background.tsx`, reduced
 * to the gradient itself. Kobalte renders a Background part with the pointer
 * handlers; HeroUI has no Background part (the root carries the gradient), and
 * NSH's pointer interaction lives on the root's responder, so this file only
 * computes and paints the two-axis gradient (R-019, R-029).
 *
 * The math is Kobalte's, which is React Aria's `useColorArea`: the fixed
 * (z) channel comes from the current color, the other two become one
 * `linear-gradient` each, and the color space decides how they combine.
 *
 * - `hsl` / `hsb`: one multi-layer `backgroundImage` string; the last layer may
 *   be the flat hue color, which NSH takes as `backgroundColor` instead (a
 *   `backgroundImage` holds gradients only).
 * - `rgb`: React Aria's `background-blend-mode: screen` has no per-layer
 *   counterpart, so the layers become real child views, each with its own
 *   `mixBlendMode` (R-029). The base is still one `backgroundColor`.
 */

import type { Accessor } from "nsh";
import { computed, View } from "nsh";

import type { Color, ColorChannel } from "./colors";
import { parseColor } from "./colors";
import type { ColorAreaState } from "./create-color-area-state";

/** The paint a ColorArea's gradient layer needs. */
export interface ColorAreaBackgroundPaint {
  /** The base color under the layers, when the fixed channel is flat. */
  color: string | undefined;

  /**
   * The lower gradient layer. For HSL / HSB it is the whole gradient field as
   * one comma-separated `backgroundImage`; for RGB it is the vertical gradient.
   */
  lower: string | undefined;

  /**
   * The upper gradient layer: the horizontal gradient of the RGB space, and
   * nothing for HSL / HSB, whose field is already in `lower`.
   */
  upper: string | undefined;

  /** Whether the layers composite with `mix-blend-mode: screen` (RGB only). */
  blend: boolean;
}

export interface ColorAreaBackgroundProps {
  /** The root's state: the color, its axes and the fixed channel. */
  state: ColorAreaState;

  /** The reading direction, which flips the horizontal gradient (R-019). */
  direction: Accessor<"ltr" | "rtl">;
}

/**
 * The gradient layer: an absolutely positioned box the size of the root, with
 * the two-axis color field and no pointer handlers of its own (the root is the
 * responder). Its radius is fixed `rounded-2xl` because NSH cannot inherit the
 * root's radius (port sheet §8).
 */
export function ColorAreaBackground(props: ColorAreaBackgroundProps) {
  const paint = computed(() =>
    getColorAreaBackground(props.state, props.direction()),
  );

  return (
    <View
      class="absolute inset-0 rounded-2xl"
      style={{ backgroundColor: paint().color, pointerEvents: "none" }}
    >
      {/*
        R-029: for RGB the layers are painted bottom-up — the vertical gradient,
        then the horizontal one — each blended with screen, exactly like React
        Aria's `background-blend-mode: screen` over the same order. R-019: for
        HSL / HSB only the lower view draws, holding the multi-layer string.
      */}
      <View
        class="absolute inset-0 rounded-2xl"
        style={{
          backgroundImage: paint().lower,
          mixBlendMode: paint().blend ? "screen" : "normal",
        }}
      />
      <View
        class="absolute inset-0 rounded-2xl"
        style={{
          backgroundImage: paint().upper,
          mixBlendMode: paint().blend ? "screen" : "normal",
        }}
      />
    </View>
  );
}

/**
 * React Aria's gradient for the current color: the fixed channel's value comes
 * from the color, the other two channels become gradients, and the space
 * decides whether they are one string (HSL / HSB) or blended views (RGB).
 */
function getColorAreaBackground(
  state: ColorAreaState,
  direction: "ltr" | "rtl",
): ColorAreaBackgroundPaint {
  const color = state.value();
  const { xChannel, yChannel, zChannel } = state.channels();
  const zValue = color.getChannelValue(zChannel);
  const end = direction === "ltr" ? "right" : "left";
  const space = color.getColorSpace();

  if (space === "rgb") {
    const base = parseColor("rgb(0, 0, 0)");

    return {
      color: base.withChannelValue(zChannel, zValue).toString("css"),
      lower: `linear-gradient(to top, ${base.withChannelValue(
        yChannel,
        0,
      )}, ${base.withChannelValue(yChannel, 255)})`,
      upper: `linear-gradient(to ${end}, ${base.withChannelValue(
        xChannel,
        0,
      )}, ${base.withChannelValue(xChannel, 255)})`,
      blend: true,
    };
  }

  const base =
    space === "hsl"
      ? parseColor("hsl(0, 100%, 50%)").withChannelValue(zChannel, zValue)
      : parseColor("hsb(0, 100%, 100%)").withChannelValue(zChannel, zValue);
  const gradients = color
    .getColorChannels()
    .filter((channel) => channel !== zChannel)
    .map(
      (channel) =>
        `linear-gradient(to ${
          channel === xChannel ? end : "top"
        }, ${channelStops(channel, base)})`,
    )
    .reverse();

  return {
    // CSS paints the first layer on top; the flat hue color goes under all of
    // them as `backgroundColor` instead of being the shorthand's last layer.
    color: zChannel === "hue" ? base.toString("css") : undefined,
    lower: gradients.join(", "),
    upper: undefined,
    blend: false,
  };
}

/**
 * The stops for one axis. Kobalte's `hslChannels` / `hsbChannels` tables: hue
 * sweeps in sixths, saturation fades to transparent (the hue layer below shows
 * through), and the lightness / brightness axes run dark to light.
 */
function channelStops(channel: ColorChannel, color: Color): string {
  if (channel === "hue") {
    return [0, 60, 120, 180, 240, 300, 360]
      .map((hue) => color.withChannelValue("hue", hue).toString("css"))
      .join(", ");
  }

  if (channel === "saturation") {
    return `${color.withChannelValue("saturation", 0)}, transparent`;
  }

  if (channel === "lightness") {
    return "black, transparent, white";
  }

  return "black, transparent";
}
