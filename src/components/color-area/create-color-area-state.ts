/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/color-area/create-color-area-state.ts
 *
 * Solid port for NSH. Kobalte's file is itself a port of React Stately's
 * `useColorAreaState`, so the structure and the public members are upstream's;
 * the three fixes the port sheet (§5) asks for are marked "RAC" below. The
 * number helpers Kobalte imported from `@kobalte/utils` are inlined, and the
 * form-control / form-reset wiring is gone: NSH has no form submission.
 */

import { type Accessor, computed, signal, untracked } from "nsh";

import { createControllableSignal } from "../../primitives";
import type { Color, ColorChannel, ColorSpace } from "./colors";
import { normalizeColor, parseColor } from "./colors";

/**
 * React Stately's `DEFAULT_COLOR` (`react-stately/src/color/useColorAreaState.ts:105`):
 * opaque white, not Kobalte's fully saturated red. An area with neither `value`
 * nor `defaultValue` starts white, so the thumb sits at the top-left corner and
 * `onChange` reports white, exactly as HeroUI's does.
 */
const DEFAULT_COLOR = "#ffffff";

/** A color prop: a CSS string (HeroUI) or an already parsed `Color` (Kobalte). */
export type ColorAreaColorValue = string | Color;

export interface CreateColorAreaStateProps {
  /** The controlled value; `undefined` leaves the state uncontrolled. */
  value?: Accessor<ColorAreaColorValue | undefined>;

  /** The uncontrolled initial value; HeroUI's default is `#ffffff`. */
  defaultValue?: Accessor<ColorAreaColorValue | undefined>;

  /** The space the axes are read in; `undefined` keeps the value's own space. */
  colorSpace?: Accessor<ColorSpace | undefined>;

  /** The horizontal channel; the space's first channel by default. */
  xChannel?: Accessor<ColorChannel | undefined>;

  /** The vertical channel; the space's second channel by default. */
  yChannel?: Accessor<ColorChannel | undefined>;

  /** Called once for every value change, dragging and typing included. */
  onChange?: (color: Color) => void;

  /** Called once when a pointer interaction ends. */
  onChangeEnd?: (color: Color) => void;

  /** Whether every interaction is blocked. */
  isDisabled?: Accessor<boolean>;
}

/** The three axes the area reads: the two it shows and the one it holds fixed. */
export interface ColorAreaChannels {
  xChannel: ColorChannel;
  yChannel: ColorChannel;
  zChannel: ColorChannel;
}

/**
 * A pair of channel values, in channel units (not screen percentages). The
 * horizontal one grows to the right; the vertical one grows upwards, which is
 * the thumb's `y` value.
 */
export interface ColorAreaThumbValue {
  x: number;
  y: number;
}

/**
 * ColorArea's state, with React Stately's member names and accessors for every
 * value that changes (D17). The root owns it, hands it to the Thumb through the
 * context, and passes it to render props; `setValue` is the only way to change
 * the color, so the controlled prop and `onChange` keep one owner.
 */
export interface ColorAreaState {
  /** The current color, converted to `colorSpace` when one is given. */
  value: Accessor<Color>;

  /**
   * React Stately's `defaultValue`: the initial color (the controlled value at
   * mount, otherwise `defaultValue`, otherwise white), which `resetValue`
   * returns to. It does not follow later changes.
   */
  defaultValue: Accessor<Color>;

  /**
   * Sets the color (the controlled prop still wins; `onChange` hears it). Like
   * React Stately (line 29) it also takes a CSS string, parsed on the way in.
   */
  setValue: (value: ColorAreaColorValue) => void;

  /** The color's value on each axis, in channel units. */
  xValue: Accessor<number>;
  yValue: Accessor<number>;
  setXValue: (value: number) => void;
  setYValue: (value: number) => void;

  /**
   * Sets both channels from a point in the box: `x` from the left edge and `y`
   * from the top edge, both 0–1, exactly React Stately's `setColorFromPoint`.
   */
  setColorFromPoint: (x: number, y: number) => void;

  /**
   * One arrow key's step on each axis (React Stately's `xChannelStep` /
   * `yChannelStep`, the channel's `step`).
   */
  xChannelStep: Accessor<number>;
  yChannelStep: Accessor<number>;
  /** One PageUp / Shift+Arrow jump on each axis (the channel's `pageSize`). */
  xChannelPageStep: Accessor<number>;
  yChannelPageStep: Accessor<number>;

  /**
   * Kobalte's names for the same four steps; kept so code written against this
   * port's earlier surface keeps compiling (hover only, same accessors).
   */
  xStep: Accessor<number>;
  yStep: Accessor<number>;
  xPageSize: Accessor<number>;
  yPageSize: Accessor<number>;

  /** The channel ranges, which bound every write. */
  xMinValue: Accessor<number>;
  xMaxValue: Accessor<number>;
  yMinValue: Accessor<number>;
  yMaxValue: Accessor<number>;

  /** Moves one axis by `stepSize`, snapped to the channel's step and clamped. */
  incrementX: (stepSize?: number) => void;
  incrementY: (stepSize?: number) => void;
  decrementX: (stepSize?: number) => void;
  decrementY: (stepSize?: number) => void;

  /** The axes. */
  channels: Accessor<ColorAreaChannels>;

  /** Whether a pointer interaction is in progress. */
  isDragging: Accessor<boolean>;

  /**
   * React Stately's `setDragging`. Leaving the dragging state (true → false)
   * fires `onChangeEnd` once; PageUp / PageDown / Home / End wrap their change
   * in this pair exactly as React Aria's `keyboardUpdate` does.
   */
  setDragging: (dragging: boolean) => void;

  /** Kobalte's name for `setDragging`; kept as an alias. */
  setIsDragging: (dragging: boolean) => void;

  /** React Stately's `getDisplayColor`: the current color with alpha forced to 1. */
  getDisplayColor: () => Color;

  /**
   * The thumb's position as fractions of the box: `x` from the left edge, `y`
   * from the top edge (0 at the top, 1 at the bottom, as CSS wants it).
   */
  getThumbPosition: () => { x: number; y: number };

  /**
   * The thumb's value as fractions of each channel range: both grow with the
   * channel value, so the vertical one is 1 at the top (Kobalte's
   * `getThumbPercent`).
   */
  getThumbPercent: () => ColorAreaThumbValue;

  /** Sets both channels from fractions of their ranges. */
  setThumbPercent: (value: ColorAreaThumbValue) => void;

  /** Sets both channels from their raw values, snapped and clamped. */
  setThumbValue: (value: ColorAreaThumbValue) => void;

  /** Goes back to the initial color (React Stately's `resetValue`). */
  resetValue: () => void;

  /** Whether every interaction is blocked. */
  isDisabled: Accessor<boolean>;
}

/**
 * The color area's state: a controllable color, the two channels the area
 * shows, the ranges they live in and the drag flag. One instance per Root, as
 * D16 asks; every derived value is a `computed`, so a Thumb reading one
 * subscribes to exactly what it draws.
 */
export function createColorAreaState(
  props: CreateColorAreaStateProps,
): ColorAreaState {
  // Parsing happens once per distinct prop value, so the controlled signal's
  // identity comparison (`Object.is`) sees the same `Color` until the caller
  // really changes the value.
  const controlledValue = computed<Color | undefined>(() => {
    const value = props.value?.();

    return value === undefined ? undefined : normalizeColor(value);
  });

  const initialValue = computed<Color>(() => {
    const value = props.defaultValue?.();

    return value === undefined ? parseColor(DEFAULT_COLOR) : normalizeColor(value);
  });

  const [resolvedValue, setResolvedValue] = createControllableSignal<Color>({
    value: () => controlledValue(),
    defaultValue: () => initialValue(),
    onChange: (color) => props.onChange?.(color),
  });

  const isDisabled = () => props.isDisabled?.() ?? false;

  // React Stately's `setValue` takes `string | Color` (line 29) and parses the
  // string form; the controlled signal's identity check then sees a `Color`.
  const setValue = (value: ColorAreaColorValue) => {
    setResolvedValue(normalizeColor(value));
  };

  // React Stately's `defaultValue`: the initial value, captured once. In
  // controlled mode it is the controlled color at mount (`useState(colorValue)`),
  // otherwise the `defaultValue` prop (or white), and later changes do not move
  // it, so `resetValue` stays a reset rather than a "current value" recall.
  // `resolvedValue` always has a value: `defaultValue` supplies white when the
  // caller gives neither prop (state.ts:107-111).
  const mountValue = untracked(() => resolvedValue())!;
  const defaultValue: Accessor<Color> = () =>
    controlledValue() === undefined ? initialValue() : mountValue;

  // RAC fix 1 (§5): `colorSpace` converts the value before any axis is read, so
  // both the channels and the callbacks speak the requested space.
  const color = computed<Color>(() => {
    const space = props.colorSpace?.();
    const value = resolvedValue();

    return space === undefined ? value! : value!.toFormat(space);
  });

  const channels = computed<ColorAreaChannels>(() =>
    color().getColorSpaceAxes({
      xChannel: props.xChannel?.(),
      yChannel: props.yChannel?.(),
    }),
  );

  const xChannelRange = computed(() => color().getChannelRange(channels().xChannel));
  const yChannelRange = computed(() => color().getChannelRange(channels().yChannel));

  // React Stately's names first (`xChannelStep` …), the Kobalte names as
  // aliases: both are the same accessor, so they cannot disagree.
  const xChannelStep = () => xChannelRange().step;
  const yChannelStep = () => yChannelRange().step;
  const xChannelPageStep = () => xChannelRange().pageSize;
  const yChannelPageStep = () => yChannelRange().pageSize;
  const xStep = xChannelStep;
  const yStep = yChannelStep;
  const xPageSize = xChannelPageStep;
  const yPageSize = yChannelPageStep;
  const xMinValue = () => xChannelRange().minValue;
  const xMaxValue = () => xChannelRange().maxValue;
  const yMinValue = () => yChannelRange().minValue;
  const yMaxValue = () => yChannelRange().maxValue;

  const xValue = () => color().getChannelValue(channels().xChannel);
  const yValue = () => color().getChannelValue(channels().yChannel);

  const isDragging = signal(false);

  const setXValue = (value: number) => {
    if (value === xValue()) {
      return;
    }

    setValue(color().withChannelValue(channels().xChannel, value));
  };

  const setYValue = (value: number) => {
    if (value === yValue()) {
      return;
    }

    setValue(color().withChannelValue(channels().yChannel, value));
  };

  const incrementX = (stepSize = 1) => {
    setXValue(
      xValue() + stepSize > xMaxValue()
        ? xMaxValue()
        : snapValueToStep(
            xValue() + stepSize,
            xMinValue(),
            xMaxValue(),
            xStep(),
          ),
    );
  };

  const incrementY = (stepSize = 1) => {
    setYValue(
      yValue() + stepSize > yMaxValue()
        ? yMaxValue()
        : snapValueToStep(
            yValue() + stepSize,
            yMinValue(),
            yMaxValue(),
            yStep(),
          ),
    );
  };

  const decrementX = (stepSize = 1) => {
    setXValue(
      snapValueToStep(xValue() - stepSize, xMinValue(), xMaxValue(), xStep()),
    );
  };

  const decrementY = (stepSize = 1) => {
    setYValue(
      snapValueToStep(yValue() - stepSize, yMinValue(), yMaxValue(), yStep()),
    );
  };

  const getThumbPosition = () => {
    const xRange = xMaxValue() - xMinValue();
    const yRange = yMaxValue() - yMinValue();

    return {
      x: xRange === 0 ? 0 : (xValue() - xMinValue()) / xRange,
      y: yRange === 0 ? 0 : 1 - (yValue() - yMinValue()) / yRange,
    };
  };

  // RAC fix 2 (§5): Kobalte's `getValuePercent` dropped the parentheses, so
  // `(x - min) / max - min` replaced `(x - min) / (max - min)`. Here the
  // fraction is both correct and clamped to the range.
  const getThumbPercent = (): ColorAreaThumbValue => {
    const xRange = xMaxValue() - xMinValue();
    const yRange = yMaxValue() - yMinValue();

    return {
      x: xRange === 0 ? 0 : (xValue() - xMinValue()) / xRange,
      y: yRange === 0 ? 0 : (yValue() - yMinValue()) / yRange,
    };
  };

  // React Stately's `setColorFromPoint`: the point is 0–1 from the left and
  // from the top; only the axes that really changed are snapped and written, so
  // a drag keeps the untouched channel's exact value.
  const setColorFromPoint = (x: number, y: number) => {
    const xMin = xMinValue();
    const xMax = xMaxValue();
    const yMin = yMinValue();
    const yMax = yMaxValue();

    let newXValue = xMin + clamp(x, 0, 1) * (xMax - xMin);
    let newYValue = yMin + (1 - clamp(y, 0, 1)) * (yMax - yMin);
    let nextColor: Color | undefined;

    if (newXValue !== xValue()) {
      newXValue = snapValueToStep(newXValue, xMin, xMax, xStep());
      nextColor = color().withChannelValue(channels().xChannel, newXValue);
    }

    if (newYValue !== yValue()) {
      newYValue = snapValueToStep(newYValue, yMin, yMax, yStep());
      nextColor = (nextColor ?? color()).withChannelValue(
        channels().yChannel,
        newYValue,
      );
    }

    if (nextColor !== undefined) {
      setValue(nextColor);
    }
  };

  // Kobalte's `setThumbValue`: both channels from raw channel values, snapped
  // to their steps and clamped to their ranges.
  const setThumbValue = (value: ColorAreaThumbValue) => {
    const x = snapValueToStep(value.x, xMinValue(), xMaxValue(), xStep());
    const y = snapValueToStep(value.y, yMinValue(), yMaxValue(), yStep());

    if (x === xValue() && y === yValue()) {
      return;
    }

    setValue(
      color()
        .withChannelValue(channels().xChannel, x)
        .withChannelValue(channels().yChannel, y),
    );
  };

  // React Stately's `setDragging`: leaving the dragging state reports the end of
  // the interaction once (`onChangeEnd`), which is what a drag's release and
  // each PageUp / PageDown / Home / End do. Kobalte's name stays as an alias.
  const setDragging = (dragging: boolean) => {
    const wasDragging = isDragging();

    isDragging.set(dragging);

    if (wasDragging && !dragging) {
      props.onChangeEnd?.(color());
    }
  };

  const resetValue = () => {
    setValue(defaultValue());
  };

  return {
    value: color,
    defaultValue,
    setValue,
    xValue,
    yValue,
    setXValue,
    setYValue,
    setColorFromPoint,
    xChannelStep,
    yChannelStep,
    xChannelPageStep,
    yChannelPageStep,
    xStep,
    yStep,
    xPageSize,
    yPageSize,
    xMinValue,
    xMaxValue,
    yMinValue,
    yMaxValue,
    incrementX,
    incrementY,
    decrementX,
    decrementY,
    channels,
    isDragging,
    setDragging,
    setIsDragging: setDragging,
    getThumbPosition,
    getThumbPercent,
    getDisplayColor: () => color().withChannelValue("alpha", 1),
    // `y` is the value fraction (it grows upwards); `setColorFromPoint` wants a
    // fraction from the top edge, the same point the pointer reports.
    setThumbPercent: (value) => setColorFromPoint(value.x, 1 - value.y),
    setThumbValue,
    resetValue,
    isDisabled,
  };
}

/* -------------------------------------------------------------------------------------------------
 * Number helpers
 * -----------------------------------------------------------------------------------------------*/

// Kobalte's `clamp` (`@kobalte/utils`), inlined as the color model does.
function clamp(
  value: number,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
): number {
  return Math.min(Math.max(value, min), max);
}

// Kobalte's `snapValueToStep` (`@kobalte/utils`, itself React Aria's), which
// moves a value to the nearest step of the channel's range.
function snapValueToStep(
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

  // Correct floating point behaviour by rounding to the step's precision.
  const string = step.toString();
  const index = string.indexOf(".");
  const precision = index >= 0 ? string.length - index : 0;

  if (precision > 0) {
    const pow = 10 ** precision;

    snappedValue = Math.round(snappedValue * pow) / pow;
  }

  return snappedValue;
}
