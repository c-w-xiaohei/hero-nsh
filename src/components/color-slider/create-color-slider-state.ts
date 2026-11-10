import type { Accessor } from "nsh";
import { computed, signal } from "nsh";

import { createControllableSignal } from "../../primitives/create-controllable-signal";
import type {
  Color,
  ColorChannel,
  ColorChannelRange,
  ColorSpace,
} from "../color-swatch";
import { parseColor } from "../color-swatch";
import { clamp, snapValueToStep } from "./color-slider-utils";

/*
 * The single-thumb slice of React Stately's `useColorSliderState` that
 * ColorSlider actually uses, in Solid style. Kobalte's
 * `color-slider/color-slider-root.tsx` wraps `createSliderState` the same way:
 * the slider state's `value` is one channel of one `Color`, its range is
 * `Color.getChannelRange(channel)`, and every write returns
 * `color.withChannelValue(channel, next)` (port sheet §2 and §5).
 *
 * Kobalte's file is 330 lines because a `Slider` has many thumbs and an
 * editable flag per thumb; this component has exactly one of each, so the
 * array machinery collapses to plain accessors. The parts that matter are kept
 * line for line: `getValuePercent`, `getPercentValue`, `incrementThumb` /
 * `decrementThumb` snapping, and `onChangeEnd` firing once per interaction.
 */

/** Kobalte's default value when neither `value` nor `defaultValue` is given. */
const DEFAULT_COLOR = "hsl(0, 100%, 50%)";

export interface CreateColorSliderStateProps {
  /** The controlled value; a CSS string or a `Color`. */
  value: Accessor<Color | string | undefined>;

  /** The initial uncontrolled value. */
  defaultValue: Accessor<Color | string | undefined>;

  /** Called on every change, with the new `Color`. */
  onChange: (value: Color) => void;

  /** Called once when an interaction ends, with the value it left behind. */
  onChangeEnd: (value: Color) => void;

  /** The channel this slider edits; the root already validated its color space. */
  channel: Accessor<ColorChannel>;

  /** The format the value is kept in, when the caller named one. */
  colorSpace: Accessor<ColorSpace | undefined>;
}

export interface ColorSliderState {
  /** The current color, converted to `colorSpace` when one is given. */
  value: Accessor<Color>;

  /** The channel this slider edits. */
  channel: Accessor<ColorChannel>;

  /** The color the track shows: hue is drawn at full saturation, the others at alpha 1. */
  displayColor: Accessor<Color>;

  /** The channel's range, the only source of min / max / step / pageSize. */
  channelRange: Accessor<ColorChannelRange>;

  /** One PageUp / PageDown (or Shift+arrow) step, React Stately's `pageSize` formula. */
  pageSize: Accessor<number>;

  /** The channel value as a 0–1 fraction of its range. */
  percentage: Accessor<number>;

  /** The value as a human-readable string, for the Output and the accessible value. */
  valueText: Accessor<string>;

  /** A thumb is being dragged (or a key is being held down). */
  isDragging: Accessor<boolean>;

  /** The current channel value. */
  getThumbValue: () => number;

  /** The channel value as a 0–1 fraction. */
  getThumbPercent: () => number;

  /** The formatted value, as RAC's `getThumbValueLabel(index)` returns it. */
  getThumbValueLabel: (index: number) => string;

  getThumbMinValue: () => number;

  getThumbMaxValue: () => number;

  /** Sets the channel value from a 0–1 fraction, and returns the new color. */
  setPercent: (percent: number) => Color;

  /** Moves the channel one step (or `stepSize`) up or down, and returns the new color. */
  step: (direction: 1 | -1, stepSize?: number) => Color;

  /** Jumps to the channel's minimum (Home), and returns the new color. */
  setToMin: () => Color;

  /** Jumps to the channel's maximum (End), and returns the new color. */
  setToMax: () => Color;

  /** Marks the start of a drag / key interaction. */
  startDragging: () => void;

  /** Ends the interaction: clears the dragging flag and reports `onChangeEnd` once. */
  endInteraction: () => void;
}

function resolveColor(value: Color | string | undefined): Color | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  return typeof value === "string" ? parseColor(value) : value;
}

export function createColorSliderState(
  props: CreateColorSliderStateProps,
): ColorSliderState {
  const [controllableValue, setControllableValue] = createControllableSignal<Color>({
    value: () => resolveColor(props.value()),
    // Kobalte merges `defaultValue` before `value` and falls back to a full red,
    // so the slider always has a color to draw (port sheet §1).
    defaultValue: () => resolveColor(props.defaultValue()) ?? parseColor(DEFAULT_COLOR),
    onChange: (value) => props.onChange(value),
  });

  /** The value in the slider's own color space, when the caller named one. */
  const color = computed<Color>(() => {
    const value = controllableValue() ?? parseColor(DEFAULT_COLOR);
    const colorSpace = props.colorSpace();

    return colorSpace ? value.toFormat(colorSpace) : value;
  });

  /**
   * Kobalte's `getDisplayColor`: the hue channel would otherwise be drawn from
   * a color whose saturation and lightness the caller chose, so it is rebuilt
   * at 100% / 50%; every other channel is drawn at alpha 1 (the checkerboard
   * would show through a translucent gradient), except alpha itself.
   */
  const displayColor = computed<Color>(() => {
    switch (props.channel()) {
      case "hue":
        return parseColor(`hsl(${color().getChannelValue("hue")}, 100%, 50%)`);
      case "lightness":
      case "brightness":
      case "saturation":
      case "red":
      case "green":
      case "blue":
        return color().withChannelValue("alpha", 1);
      case "alpha":
        return color();
    }
  });

  const channelRange = computed(() => displayColor().getChannelRange(props.channel()));

  /**
   * React Stately's `pageSize` (`useSliderState.ts:96-104`, Kobalte's
   * `create-slider-state.ts:92-100`): a tenth of the range, snapped to the step
   * grid, never below one step. The color range's own `pageSize` is a different
   * number (the value model's, for ColorArea), and using it would make PageUp
   * move 15 degrees of hue instead of HeroUI's 36.
   */
  const pageSize = computed(() => {
    const { minValue, maxValue, step } = channelRange();
    const tenth = (maxValue - minValue) / 10;

    return Math.max(snapValueToStep(tenth, 0, tenth + step, step), step);
  });

  const isDragging = signal(false);

  /**
   * The color the current interaction last produced. `createControllableSignal`
   * does not mirror a controlled `value` locally, so inside the same handler
   * `color()` still reads the caller's previous prop; `onChangeEnd` has to be
   * told the new value directly (port sheet §2, "键盘每按一次方向键就提交一次").
   */
  let pending: Color | null = null;

  const getThumbValue = () => color().getChannelValue(props.channel());

  const getThumbPercent = () => {
    const { minValue, maxValue } = channelRange();
    const value = getThumbValue();

    // A zero-width range would divide by zero and print `NaN%`; RAC guards the
    // same way (port sheet §2).
    return maxValue === minValue ? 0 : (value - minValue) / (maxValue - minValue);
  };

  const getThumbValueLabel = (index: number) => {
    void index;

    // Kobalte's `color-slider-thumb.tsx:41-53`: the number from the value, then
    // the hue name or the color name, never a name for alpha.
    const channel = props.channel();
    const formattedValue = color().formatChannelValue(channel);

    if (channel === "hue") {
      return `${formattedValue}, ${displayColor().getHueName()}`;
    }

    if (channel !== "alpha") {
      return `${formattedValue}, ${displayColor().getColorName()}`;
    }

    return formattedValue;
  };

  const valueText = computed(() => getThumbValueLabel(0));

  /**
   * Kobalte's `getPercentValue`: a fraction of the range, rounded to the
   * channel's step grid and clamped into the range. `Math.round` on the step
   * count is Kobalte's `getRoundedValue`, and `snapValueToStep` clamps the
   * oversized case the way React Stately does.
   */
  const getPercentValue = (percent: number) => {
    const { minValue, maxValue, step } = channelRange();
    const value = percent * (maxValue - minValue) + minValue;

    return snapValueToStep(value, minValue, maxValue, step);
  };

  const setChannelValue = (next: number): Color => {
    const current = color();
    const { minValue, maxValue, step } = channelRange();
    const snapped = snapValueToStep(next, minValue, maxValue, step);
    const nextColor = current.withChannelValue(props.channel(), snapped);

    pending = nextColor;
    setControllableValue(nextColor);

    return nextColor;
  };

  const setPercent = (percent: number): Color =>
    setChannelValue(getPercentValue(clamp(percent, 0, 1)));

  /** Kobalte's `snapThumbValue`: move by a delta, then snap the result. */
  const step = (direction: 1 | -1, stepSize?: number): Color => {
    const { step: stepValue } = channelRange();
    // Kobalte clamps the step size with `Math.max(stepSize, step)`, so a caller
    // can page but never move by less than one step.
    const delta = Math.max(stepSize ?? stepValue, stepValue) * direction;

    return setChannelValue(getThumbValue() + delta);
  };

  const startDragging = () => {
    isDragging.set(true);
  };

  const endInteraction = () => {
    const next = pending ?? color();

    pending = null;
    isDragging.set(false);
    props.onChangeEnd(next);
  };

  return {
    value: color,
    channel: () => props.channel(),
    displayColor,
    channelRange,
    pageSize,
    percentage: computed(getThumbPercent),
    valueText,
    isDragging,
    getThumbValue,
    getThumbPercent,
    getThumbValueLabel,
    getThumbMinValue: () => channelRange().minValue,
    getThumbMaxValue: () => channelRange().maxValue,
    setPercent,
    step,
    setToMin: () => setChannelValue(channelRange().minValue),
    setToMax: () => setChannelValue(channelRange().maxValue),
    startDragging,
    endInteraction,
  };
}
