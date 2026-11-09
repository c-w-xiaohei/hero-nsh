/*
 * Portions of this file are based on code from Kobalte and React Aria.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/meter/meter-root.tsx
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/progress/progress-root.tsx
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/main/packages/%40react-aria/progress/src/useProgressBar.ts
 *
 * Adapted to NSH: the clamp, the percentage and the value label come from
 * `meter-root.tsx` / `progress-root.tsx`; the formatting branch and the
 * `aria-valuetext` precedence come from `useProgressBar`. One primitive, one
 * copy of the clamping arithmetic, shared by ProgressBar, ProgressCircle and
 * Meter (research D16).
 */

import { NumberFormatter } from "@internationalized/number";
import { type Accessor, computed, locale } from "nsh";

export interface CreateProgressStateOptions {
  /** The value; `0` by default. Clamped into `[minValue, maxValue]`. */
  value?: Accessor<number | undefined>;

  /** The bottom of the range; `0` by default. */
  minValue?: Accessor<number | undefined>;

  /** The top of the range; `100` by default. */
  maxValue?: Accessor<number | undefined>;

  /** Indeterminate progress has no percentage and no formatted value. */
  isIndeterminate?: Accessor<boolean | undefined>;

  /**
   * How the value is formatted; `{ style: "percent" }` by default. The
   * `percent` style formats the 0..1 fraction of the range, any other style
   * formats the clamped value itself, exactly as `useProgressBar` does.
   */
  formatOptions?: Accessor<Intl.NumberFormatOptions | undefined>;

  /**
   * A caller-supplied value label; wins over the formatted value on a
   * determinate bar. An indeterminate bar has no label at all.
   */
  valueLabel?: Accessor<string | undefined>;

  /**
   * The caller's `aria-valuetext`. Upstream's precedence is odd but real: a
   * determinate bar overwrites it with the derived label, while an
   * indeterminate one keeps it (there is no derived label to write).
   */
  ariaValueText?: Accessor<string | undefined>;
}

export interface ProgressState {
  /** The clamped value. */
  value(): number;

  /** The range minimum, defaulted. */
  minValue(): number;

  /** The range maximum, defaulted. */
  maxValue(): number;

  /** `0..100`, or `undefined` while indeterminate (RAC's render prop scale). */
  percentage(): number | undefined;

  /** The accessible value text; `undefined` when there is none. */
  valueText(): string | undefined;

  /** Whether the progress is indeterminate. */
  isIndeterminate(): boolean;
}

/** Kobalte's `clamp` (`@kobalte/utils`), inlined to keep this file dependency-free. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The read-only state of a progress indicator: the clamp, the percentage, the
 * formatted value and the indeterminate flag. Nothing is controllable and
 * nothing is written, so every member is derived from the props; each call
 * builds the accessors of the instance that calls it.
 */
export function createProgressState(
  options: CreateProgressStateOptions = {},
): ProgressState {
  const minValue = computed(() => options.minValue?.() ?? 0);
  const maxValue = computed(() => options.maxValue?.() ?? 100);
  const value = computed(() =>
    clamp(options.value?.() ?? 0, minValue(), maxValue()),
  );
  const isIndeterminate = computed(() => options.isIndeterminate?.() ?? false);

  const formatOptions = computed<Intl.NumberFormatOptions>(
    () => options.formatOptions?.() ?? { style: "percent" },
  );

  // A formatter per locale and option set, rebuilt only when either changes.
  // `NumberFormatter` is RAC's own wrapper (caching included), and it takes
  // the locale NSH reports, so `value=60` reads as "60%" in every locale.
  const formatter = computed(() => new NumberFormatter(locale(), formatOptions()));

  // RAC's number: `0..1`, `0` when the range is empty (`useProgressBar`:
  // `percentage = range === 0 ? 0 : (value - minValue) / range`). Indeterminate
  // has no percentage at all, which is what the render props expose.
  const fraction = computed(() => {
    const range = maxValue() - minValue();

    return range === 0 ? 0 : (value() - minValue()) / range;
  });

  const percentage = computed(() => {
    if (isIndeterminate()) {
      return undefined;
    }

    const range = maxValue() - minValue();

    return range === 0 ? 0 : fraction() * 100;
  });

  // An indeterminate bar has no derived text: `useProgressBar` leaves
  // `aria-valuetext` undefined in that branch, and Kobalte returns undefined
  // before formatting, so `valueLabel` never names an indeterminate circle —
  // only the caller's own `aria-valuetext` survives. A determinate bar takes a
  // truthy `valueLabel` first (upstream's `if (valueLabel)`) and otherwise
  // formats the value; an empty range formats the guarded fraction `0`.
  const valueText = computed(() => {
    if (isIndeterminate()) {
      return options.ariaValueText?.();
    }

    const label = options.valueLabel?.();

    if (label) {
      return label;
    }

    const format = formatOptions();

    return formatter().format(format.style === "percent" ? fraction() : value());
  });

  return {
    value,
    minValue,
    maxValue,
    percentage,
    valueText,
    isIndeterminate,
  };
}
