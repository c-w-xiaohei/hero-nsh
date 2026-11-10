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

import { type Accessor, computed, signal } from "nsh";

import { createControllableSignal } from "../../primitives";
import type { Color, ColorChannel, ColorSpace } from "./colors";
import { normalizeColor, parseColor } from "./colors";

/** React Aria's `DEFAULT_COLOR`: hue 0, fully saturated, mid lightness. */
const DEFAULT_COLOR = "hsl(0, 100%, 50%)";

/** A color prop: a CSS string (HeroUI) or an already parsed `Color` (Kobalte). */
export type ColorAreaColorValue = string | Color;

export interface CreateColorAreaStateProps {
  /** The controlled value; `undefined` leaves the state uncontrolled. */
  value?: Accessor<ColorAreaColorValue | undefined>;

  /** The uncontrolled initial value; HeroUI's default is `hsl(0, 100%, 50%)`. */
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

  /** Sets the color (the controlled prop still wins; `onChange` hears it). */
  setValue: (value: Color) => void;

  /** The color's value on each axis, in channel units. */
  xValue: Accessor<number>;
  yValue: Accessor<number>;
  setXValue: (value: number) => void;
  setYValue: (value: number) => void;

  /** One arrow key's step on each axis (React Stately's channel `step`). */
  xStep: Accessor<number>;
  yStep: Accessor<number>;
  /** One PageUp / Shift+Arrow jump on each axis (the channel `pageSize`). */
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
  setIsDragging: (dragging: boolean) => void;

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

  const [resolvedValue, setValue] = createControllableSignal<Color>({
    value: () => controlledValue(),
    defaultValue: () => initialValue(),
    onChange: (color) => props.onChange?.(color),
  });

  const isDisabled = () => props.isDisabled?.() ?? false;

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

  const xStep = () => xChannelRange().step;
  const yStep = () => yChannelRange().step;
  const xPageSize = () => xChannelRange().pageSize;
  const yPageSize = () => yChannelRange().pageSize;
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

  const updateValue = (value: ColorAreaThumbValue) => {
    if (isDisabled()) {
      return;
    }

    const xSnappedValue = snapValueToStep(
      value.x,
      xMinValue(),
      xMaxValue(),
      xStep(),
    );
    const ySnappedValue = snapValueToStep(
      value.y,
      yMinValue(),
      yMaxValue(),
      yStep(),
    );

    if (xSnappedValue === xValue() && ySnappedValue === yValue()) {
      return;
    }

    setValue(
      color()
        .withChannelValue(channels().xChannel, xSnappedValue)
        .withChannelValue(channels().yChannel, ySnappedValue),
    );
  };

  const getRoundedValues = (value: ColorAreaThumbValue): ColorAreaThumbValue => {
    const x =
      Math.round((value.x - xMinValue()) / xStep()) * xStep() + xMinValue();
    const y =
      Math.round((value.y - yMinValue()) / yStep()) * yStep() + yMinValue();

    return { x, y };
  };

  const getPercentValues = (xPercent: number, yPercent: number) => {
    const x = xPercent * (xMaxValue() - xMinValue()) + xMinValue();
    const y = yPercent * (yMaxValue() - yMinValue()) + yMinValue();
    const rounded = getRoundedValues({ x, y });

    return {
      x: clamp(rounded.x, xMinValue(), xMaxValue()),
      y: clamp(rounded.y, yMinValue(), yMaxValue()),
    };
  };

  // A drag's end reports once (Kobalte's `updateDragging`). RAC fix 3 (§5): the
  // root used to call `onChange` a second time after every drag move; here the
  // controlled signal is the only caller, so one change is one callback.
  const setIsDragging = (dragging: boolean) => {
    if (isDisabled()) {
      return;
    }

    const wasDragging = isDragging();

    isDragging.set(dragging);

    if (wasDragging && !dragging) {
      props.onChangeEnd?.(color());
    }
  };

  const resetValue = () => {
    setValue(initialValue());
  };

  return {
    value: color,
    setValue,
    xValue,
    yValue,
    setXValue,
    setYValue,
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
    setIsDragging,
    getThumbPosition,
    getThumbPercent,
    setThumbPercent: (value) => updateValue(getPercentValues(value.x, value.y)),
    setThumbValue: updateValue,
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
