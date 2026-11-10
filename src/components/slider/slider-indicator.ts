import type { ViewStyle } from "nsh";

import type { SliderState } from "./create-slider-state";

/**
 * HeroUI's `getIndicatorProps` (`slider.tsx:154-218`), shared by `Steps`' dots
 * and `Marks`' labels: where the value sits on the track, and whether it is
 * inside the selected range.
 *
 * R-074 / R-075: the percent of a value is `0` when the range's two ends are
 * equal — `getValuePercent` would divide by zero there, and `NaN%` is not a
 * legal length, so the host would drop the declaration and the dot would lose
 * its position.
 */
export interface SliderIndicatorState {
  /** `0…1` along the track. */
  percent: number;
  /** Whether the value lies between the range's start and its last thumb. */
  filled: boolean;
}

export function getIndicatorState(
  state: SliderState,
  value: number,
): SliderIndicatorState {
  const values = state.values();
  const minValue = state.getThumbMinValue(0);
  const maxValue = state.getThumbMaxValue(values.length - 1);
  const startValue = values.length > 1 ? values[0]! : minValue;
  const endValue = values[values.length - 1]!;
  const percent = minValue === maxValue ? 0 : state.getValuePercent(value);

  return {
    percent,
    filled: value >= startValue && value <= endValue,
  };
}

/**
 * R-074 / R-075 / R-077: the inline position of a dot or a label. Horizontal
 * indicators grow from the physical left in LTR and from the right in RTL;
 * vertical ones grow from the bottom.
 */
export function getIndicatorStyle(
  percent: number,
  isVertical: boolean,
  isRtl: boolean,
): ViewStyle {
  const offset: `${number}%` = `${percent * 100}%`;

  if (isVertical) {
    return { bottom: offset };
  }

  return isRtl ? { right: offset } : { left: offset };
}
