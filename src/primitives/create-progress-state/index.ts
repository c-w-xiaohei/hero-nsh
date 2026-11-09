import type { NumberFormatOptions } from "@internationalized/number";

import { computed } from "nsh";
import type { Accessor } from "nsh";

import { createNumberFormatter } from "../create-number-formatter";

/**
 * The options a progress-like display reads from its props, as accessors.
 *
 * `value`, `minValue` and `maxValue` are plain numbers upstream (React Aria's
 * `AriaProgressBarProps`); `valueLabel` is HeroUI's replacement for Kobalte's
 * `getValueLabel`. All are read through accessors so the state follows a
 * changing prop without being copied.
 */
export interface ProgressStateProps {
  /** The current value. @default 0 */
  value?: () => number | undefined;

  /** The range's minimum. @default 0 */
  minValue?: () => number | undefined;

  /** The range's maximum. @default 100 */
  maxValue?: () => number | undefined;

  /** How the value is formatted when no `valueLabel` is given. @default { style: "percent" } */
  formatOptions?: () => NumberFormatOptions | undefined;

  /** A human-readable value, used verbatim when it is non-empty. */
  valueLabel?: () => string | undefined;
}

/**
 * The three computed values plus the clamp, shared by Meter and ProgressBar.
 *
 * Ported from the calculation half of Kobalte's `meter-root.tsx`, which is a
 * Solid port of React Aria's `useProgressBar`; HeroUI's contract is kept where
 * the two differ. Kobalte hard-codes a percent formatter and takes a
 * `getValueLabel` function, while HeroUI exposes `formatOptions` and
 * `valueLabel`; those are the props here, and the formatter is
 * `createNumberFormatter`.
 *
 * The division follows React Aria Components' `Meter.tsx:70`: a range of zero
 * reports `0`, never `NaN`. The text follows `useProgressBar`'s
 * `valueToFormat` branch: a percent style formats the 0–1 ratio, everything
 * else formats the clamped value. Upstream tests `valueLabel` for truthiness,
 * so an empty string counts as not given; that is kept with `if (label)`.
 *
 * `clamp` is a local function: NSH has no utils directory and Kobalte's
 * `@kobalte/utils` depends on `solid-js`, which the NSH bundler rejects.
 */
export function createProgressState(props: ProgressStateProps): {
  value: Accessor<number>;
  minValue: Accessor<number>;
  maxValue: Accessor<number>;
  percentage: Accessor<number>;
  valueText: Accessor<string>;
} {
  const minValue = computed(() => props.minValue?.() ?? 0);
  const maxValue = computed(() => props.maxValue?.() ?? 100);

  const value = computed(() => clamp(props.value?.() ?? 0, minValue(), maxValue()));

  const percentage = computed(() => {
    const range = maxValue() - minValue();

    return range === 0 ? 0 : ((value() - minValue()) / range) * 100;
  });

  const formatOptions = computed<NumberFormatOptions>(
    () => props.formatOptions?.() ?? { style: "percent" },
  );
  const formatter = createNumberFormatter(formatOptions);

  const valueText = computed(() => {
    const label = props.valueLabel?.();

    if (label) {
      return label;
    }

    return formatter().format(
      formatOptions().style === "percent" ? percentage() / 100 : value(),
    );
  });

  return { value, minValue, maxValue, percentage, valueText };
}

/** React Aria's `clamp` from `react-stately/private/utils/number`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
