/*
 * ColorField's single-channel state, ported from React Aria
 * (`useColorChannelFieldState`): NumberField's value state for the numeric
 * editing, plus the conversion between a color and one of its channels.
 *
 * The port sheet §5 reuses the shipped `createNumberFieldState` by its internal
 * path and adds only the conversion here — no shared file, no NumberField line
 * changes. A percent channel is measured in fractions (`50%` is `0.5`), so the
 * channel bounds, the step and the value are all divided by 100; the channel's
 * own `Intl.NumberFormatOptions` produce the `200°` / `50%` display.
 */

import type { Accessor } from "nsh";
import { computed } from "nsh";

import { createControllableSignal } from "../../primitives/create-controllable-signal";
import type { Color, ColorChannel, ColorSpace } from "../color-swatch";
import { parseColor } from "../color-swatch";
import { createNumberFieldState } from "../number-field/create-number-field-state";
import type { CreateNumberFieldStateProps } from "../number-field/create-number-field-state";
import {
  normalizeColorFieldValidation,
  normalizeColorValue,
} from "./create-color-field-state";
import type {
  ColorFieldState,
  ColorFieldStateHandle,
  CreateColorFieldStateProps,
} from "./create-color-field-state";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/** What a channel-mode ColorField root hands its state factory. */
export interface CreateColorChannelFieldStateProps extends CreateColorFieldStateProps {
  /** The channel being edited. */
  channel: ColorChannel;

  /** The color space the value is converted to before the channel is read. */
  colorSpace?: ColorSpace;

  /** The field is disabled; steps and commits are no-ops. */
  isDisabled?: boolean;

  /** The field is read-only; steps and commits are no-ops. */
  isReadOnly?: boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Channel helpers
 * -----------------------------------------------------------------------------------------------*/

/** The channels whose stored value is a percentage (0–100), not a fraction. */
function percentChannel(channel: ColorChannel): boolean {
  return channel === "saturation" || channel === "brightness" || channel === "lightness";
}

/** The color space a channel belongs to when the caller named none. */
function naturalColorSpace(channel: ColorChannel): ColorSpace {
  switch (channel) {
    case "hue":
    case "saturation":
    case "lightness":
      return "hsl";
    case "brightness":
      return "hsb";
    default:
      return "rgb";
  }
}

/** Whether `space` carries `channel`; `getChannelValue` throws otherwise. */
function supportsChannel(space: ColorSpace, channel: ColorChannel): boolean {
  switch (space) {
    case "rgb":
      return channel === "red" || channel === "green" || channel === "blue" || channel === "alpha";
    case "hsl":
      return (
        channel === "hue" ||
        channel === "saturation" ||
        channel === "lightness" ||
        channel === "alpha"
      );
    default:
      return (
        channel === "hue" ||
        channel === "saturation" ||
        channel === "brightness" ||
        channel === "alpha"
      );
  }
}

/* -------------------------------------------------------------------------------------------------
 * The state factory
 * -----------------------------------------------------------------------------------------------*/

/**
 * Creates one single-channel ColorField's state: NumberField's editing and
 * stepping, with every write converted back into a color.
 *
 * `isFocused` is only used by NumberField's announce-on-step, as it is there.
 */
export function createColorChannelFieldState(
  props: CreateColorChannelFieldStateProps,
  isFocused: Accessor<boolean>,
): ColorFieldStateHandle {
  const channel = (): ColorChannel => props.channel;

  // --- Committed value ------------------------------------------------------
  const controlledValue = computed<Color | null | undefined>(() => {
    const value = props.value;

    if (value === undefined) {
      return undefined;
    }

    return normalizeColorValue(value) ?? null;
  });

  const initialValue = (): Color | null => normalizeColorValue(props.defaultValue) ?? null;

  const [colorValueRaw, setColorValue] = createControllableSignal<Color | null>({
    value: () => controlledValue(),
    defaultValue: initialValue,
    onChange: (color) => props.onChange?.(color),
  });

  // `createControllableSignal` reports `undefined` until a value is set; an
  // empty color is `null` here, as it is in the hex path.
  const colorValue = computed<Color | null>(() => colorValueRaw() ?? null);

  const defaultColorValue = (() => {
    const initial = initialValue();

    return initial ?? colorValue() ?? null;
  })();

  // --- The channel, read from an empty-safe color ---------------------------
  // An empty field edits the black of its color space, as React Aria's channel
  // state does: the ranges, the step and the format still come from a color,
  // while the value itself is `NaN` so the input shows nothing.
  const displayColor = computed<Color>(() => {
    const base = colorValue() ?? parseColor("#000000");
    const requested = props.colorSpace;

    if (requested !== undefined) {
      return base.toFormat(requested);
    }

    return supportsChannel(base.getColorSpace(), channel())
      ? base
      : base.toFormat(naturalColorSpace(channel()));
  });

  // A percent channel stores 0–100 but formats as a fraction, so NumberField
  // sees 0.5 for "50%".
  const multiplier = computed(() => (percentChannel(channel()) ? 100 : 1));

  const range = computed(() => displayColor().getChannelRange(channel()));

  const channelNumber = computed(
    () => displayColor().getChannelValue(channel()) / multiplier(),
  );

  /** The color this field's number stands for, clamped to the channel range. */
  const colorForNumber = (value: number): Color => {
    const current = displayColor();
    const bounds = current.getChannelRange(channel());
    const raw = Math.min(
      Math.max(value * multiplier(), bounds.minValue),
      bounds.maxValue,
    );

    return current.withChannelValue(channel(), raw);
  };

  // --- NumberField state ----------------------------------------------------
  // Every value member is a getter over the color: the number field is fully
  // controlled by the color, so a commit or a step writes the color and the
  // text follows it through NumberField's own formatting effect.
  //
  // An empty color is `NaN`, not the black the display is measured against:
  // upstream passes `colorValue === null ? NaN : …` to `useNumberFieldState`
  // (`useColorChannelFieldState.ts:52-58`), and NumberField renders `NaN` as an
  // empty input, so clearing the channel can clear the color.
  const localWrite = (value: number) => {
    setColorValue(Number.isNaN(value) ? null : colorForNumber(value));
  };

  const validateNumber = (value: number) => {
    const messages = normalizeColorFieldValidation(
      props.validate?.(Number.isNaN(value) ? null : colorForNumber(value)),
    );

    return messages.length > 0 ? messages.join(" ") : true;
  };

  const numberProps: CreateNumberFieldStateProps = {
    get value() {
      return colorValue() === null ? NaN : channelNumber();
    },
    get onChange() {
      return localWrite;
    },
    get minValue() {
      return range().minValue / multiplier();
    },
    get maxValue() {
      return range().maxValue / multiplier();
    },
    get step() {
      return range().step / multiplier();
    },
    get formatOptions() {
      return displayColor().getChannelFormatOptions(channel());
    },
    get validate() {
      return validateNumber;
    },
    get isDisabled() {
      return props.isDisabled === true;
    },
    get isReadOnly() {
      return props.isReadOnly === true;
    },
  };

  const number = createNumberFieldState(numberProps, isFocused);

  // --- Public surface -------------------------------------------------------
  const isInvalid = computed(() => number.validationErrors().length > 0);

  const state: ColorFieldState = {
    inputValue: number.text,
    colorValue,
    defaultColorValue: () => defaultColorValue,
    setColorValue,
    setInputValue: number.setInputValue,
    commit: number.commit,
    increment: number.increment,
    decrement: number.decrement,
    incrementToMax: number.incrementToMax,
    decrementToMin: number.decrementToMin,
    validate: (value: string) => number.state.validate(value),
    isInvalid,
    validationErrors: number.validationErrors,
  };

  return {
    state,
    inputValue: number.text,
    setInputValue: number.setInputValue,
    commit: number.commit,
    increment: number.increment,
    decrement: number.decrement,
    incrementToMax: number.incrementToMax,
    decrementToMin: number.decrementToMin,
    colorValue,
    validationErrors: number.validationErrors,
  };
}

export type ColorChannelFieldStateHandle = ReturnType<typeof createColorChannelFieldState>;
