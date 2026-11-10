/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * `clamp` and `snapValueToStep` are Kobalte's `@kobalte/utils` `number.ts`
 * (themselves React Spectrum's `@react-aria/utils`), copied here as the two
 * pure functions the single-thumb slider state needs (port sheet §5). The
 * channel / color-space validation next to them is HeroUI 3.2.7's
 * `color-slider.tsx:57-101`, kept verbatim except for the development-only
 * `console.warn`, which NSH has no `NODE_ENV` for (port sheet §8).
 */

import type { ColorSpace } from "../color-swatch";

/** Kobalte's `clamp` (`@kobalte/utils`). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Kobalte's `snapValueToStep`: rounds `value` to the nearest multiple of
 * `step` counted from `min`, then clamps it into `[min, max]`. A value above
 * `max` lands on the largest step below `max`, as React Stately's does.
 */
export function snapValueToStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const remainder = (value - (Number.isNaN(min) ? 0 : min)) % step;
  let snappedValue =
    Math.abs(remainder) * 2 >= step
      ? value + Math.sign(remainder) * (step - Math.abs(remainder))
      : value - remainder;

  if (!Number.isNaN(min)) {
    if (snappedValue < min) {
      snappedValue = min;
    } else if (!Number.isNaN(max) && snappedValue > max) {
      snappedValue = min + Math.floor((max - min) / step) * step;
    }
  } else if (!Number.isNaN(max) && snappedValue > max) {
    snappedValue = Math.floor(max / step) * step;
  }

  return snappedValue;
}

/** Maps channels to the color space they require (HeroUI's `CHANNEL_TO_REQUIRED_COLORSPACE`). */
const CHANNEL_TO_REQUIRED_COLORSPACE: Partial<Record<string, ColorSpace>> = {
  red: "rgb",
  green: "rgb",
  blue: "rgb",
  lightness: "hsl",
  brightness: "hsb",
};

/** Channels that only work with HSL or HSB, never RGB (HeroUI's `HSL_HSB_ONLY_CHANNELS`). */
const HSL_HSB_ONLY_CHANNELS = new Set(["hue", "saturation"]);

/**
 * HeroUI's `getValidColorSpace`: an invalid `channel` / `colorSpace` pair is
 * auto-corrected to the space the channel needs, so the value can be converted
 * and the channel read. Only the `console.warn` is dropped: NSH has no
 * development / production split, and the warning changed no appearance
 * (port sheet §8).
 */
export function getValidColorSpace(
  channel: string,
  colorSpace: ColorSpace | undefined,
): ColorSpace | undefined {
  const requiredSpace = CHANNEL_TO_REQUIRED_COLORSPACE[channel];

  if (requiredSpace && colorSpace && colorSpace !== requiredSpace) {
    return requiredSpace;
  }

  if (HSL_HSB_ONLY_CHANNELS.has(channel) && colorSpace === "rgb") {
    return "hsl";
  }

  return colorSpace;
}
