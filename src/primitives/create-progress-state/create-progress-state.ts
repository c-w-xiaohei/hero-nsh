/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/meter/meter-root.tsx
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/main/packages/%40react-aria/progress/src/useProgressBar.ts
 * https://github.com/adobe/react-spectrum/blob/main/packages/react-aria-components/src/ProgressBar.tsx
 *
 * Adapted to NSH: every input is an accessor (research section 4.4), the DOM
 * id / `aria-labelledby` machinery is gone, and HeroUI's `formatOptions`
 * contract replaces Kobalte's hard-coded percent formatter.
 */

import { NumberFormatter } from "@internationalized/number";
import type { NumberFormatOptions } from "@internationalized/number";
import { computed, locale } from "nsh";
import type { Accessor } from "nsh";

/**
 * The props a progress-like display reads from its props, as accessors.
 *
 * `value`, `minValue`, `maxValue` and `isIndeterminate` are the read-only value
 * contract HeroUI takes from React Aria; `formatOptions` and `valueLabel` are
 * HeroUI's own additions (`ProgressBarRootProps`). All are read through
 * accessors so the derived values follow a changing prop instead of copying it.
 */
export interface ProgressStateProps {
  /** The current value, clamped into `[minValue, maxValue]`. @default 0 */
  value?: Accessor<number | undefined>;

  /** The range's minimum. @default 0 */
  minValue?: Accessor<number | undefined>;

  /** The range's maximum. @default 100 */
  maxValue?: Accessor<number | undefined>;

  /** There is no value to show: no percentage and no value text. @default false */
  isIndeterminate?: Accessor<boolean | undefined>;

  /**
   * How the value is formatted when no `valueLabel` is given.
   * @default { style: "percent" }
   */
  formatOptions?: Accessor<NumberFormatOptions | undefined>;

  /** A human-readable value, used verbatim when it is non-empty. */
  valueLabel?: Accessor<string | undefined>;
}

/**
 * The props of a progress display that never goes indeterminate, such as
 * Meter: `isIndeterminate` is absent or literally `false`, so the percentage
 * and the value text always exist. This is React Aria's `useMeter` contract,
 * whose `percentage` is a plain number.
 */
export interface DeterminateProgressStateProps
  extends Omit<ProgressStateProps, "isIndeterminate"> {
  /** A determinate display has no indeterminate state. @default false */
  isIndeterminate?: Accessor<false | undefined>;
}

/** The derived state of a progress display that always has a value. */
export interface ProgressState {
  /** The clamped value. */
  value: Accessor<number>;

  /** The range's minimum, defaulted. */
  minValue: Accessor<number>;

  /** The range's maximum, defaulted. */
  maxValue: Accessor<number>;

  /** `0..100`, or `undefined` while indeterminate. */
  percentage: Accessor<number | undefined>;

  /** The formatted or caller-supplied value text; `undefined` when there is none. */
  valueText: Accessor<string | undefined>;

  /** Whether there is no value to show. */
  isIndeterminate: Accessor<boolean>;
}

/** {@link ProgressState} of a display that always has a value. */
export interface DeterminateProgressState
  extends Omit<ProgressState, "percentage" | "valueText"> {
  /** `0..100`; never `undefined`, because the display is never indeterminate. */
  percentage: Accessor<number>;

  /** The formatted or caller-supplied value text; never `undefined`. */
  valueText: Accessor<string>;
}

/**
 * The derived value state of a progress display, shared by ProgressBar and
 * Meter (port sheet section 5).
 *
 * The three calculations and the clamp are Kobalte's `meter-root.tsx`, itself a
 * Solid port of React Aria's `useProgressBar`; HeroUI's contract is kept where
 * the two differ. A percentage is relative to the range, so `minValue=-5` /
 * `maxValue=5` / `value=0` is 50%, not 0%. `valueText` follows
 * `useProgressBar`'s branch: a percent style formats the 0–1 ratio, every other
 * style formats the clamped value. Upstream tests `valueLabel` for truthiness,
 * so an empty string counts as not given; `if (label)` keeps that.
 *
 * When `isIndeterminate` is true there is no percentage and no text, which is
 * what React Aria's absent `aria-valuenow` / `aria-valuetext` mean.
 *
 * `clamp` is local: NSH has no utils directory, and `@kobalte/utils` depends on
 * `solid-js`, which the NSH bundler rejects.
 */
export function createProgressState(
  props: DeterminateProgressStateProps,
): DeterminateProgressState;
export function createProgressState(props: ProgressStateProps): ProgressState;
export function createProgressState(props: ProgressStateProps): ProgressState {
  const minValue = computed(() => props.minValue?.() ?? 0);
  const maxValue = computed(() => props.maxValue?.() ?? 100);
  const isIndeterminate = computed(() => props.isIndeterminate?.() === true);

  const value = computed(() =>
    clamp(props.value?.() ?? 0, minValue(), maxValue()),
  );

  const percentage = computed<number | undefined>(() => {
    if (isIndeterminate()) {
      return undefined;
    }

    const range = maxValue() - minValue();

    // React Aria Components' ProgressBar.tsx: a range of zero reports 0,
    // never NaN.
    return range === 0 ? 0 : ((value() - minValue()) / range) * 100;
  });

  const formatOptions = computed<NumberFormatOptions>(
    () => props.formatOptions?.() ?? { style: "percent" },
  );

  // One formatter per locale / options pair, as Kobalte's
  // `createNumberFormatter` memo does; constructing one per read would run
  // `Intl.NumberFormat` on every render.
  const formatter = computed(() => new NumberFormatter(locale(), formatOptions()));

  const valueText = computed<string | undefined>(() => {
    if (isIndeterminate()) {
      return undefined;
    }

    const label = props.valueLabel?.();

    if (label) {
      return label;
    }

    const current = percentage();

    if (current === undefined) {
      return undefined;
    }

    return formatter().format(
      formatOptions().style === "percent" ? current / 100 : value(),
    );
  });

  return { value, minValue, maxValue, percentage, valueText, isIndeterminate };
}

/** React Aria's `clamp` from `react-stately/private/utils/number`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
