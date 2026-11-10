/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/slider/create-slider-state.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/main/packages/%40react-stately/slider/src/useSliderState.ts
 *
 * Adapted to NSH: Kobalte's state is a Solid port of React Stately's
 * `useSliderState`, but HeroUI renders React Aria Components, whose contract
 * differs in three places the port sheet fixes (section 5):
 *
 * 1. the payload is a number when the caller gave a number, an array otherwise;
 * 2. every key press and every drag commits `onChangeEnd` (Kobalte waits for
 *    the blur to flush a "dirty" flag);
 * 3. `getFormattedValue` formats a range and a list, not only one value.
 *
 * The mechanics — snapping, restricting, the page size, the thumb bounds —
 * stay Kobalte's (itself React Stately's).
 */

import { NumberFormatter } from "@internationalized/number";
import type { NumberFormatOptions } from "@internationalized/number";
import { computed, locale, signal } from "nsh";
import type { Accessor } from "nsh";

import { createControllableSignal } from "../../primitives";
import { clamp, getNextSortedValues, snapValueToStep } from "./slider.utils";
import type { Orientation } from "./slider.utils";

/** React Aria's `SliderState`, as the render props expose it: accessors per D17. */
export interface SliderState {
  /** The current thumb values, sorted. */
  readonly values: Accessor<number[]>;

  /** The value the slider resets to: the initial (restricted) default. */
  readonly defaultValues: number[];

  getThumbValue(index: number): number;
  setThumbValue(index: number, value: number): void;
  getThumbPercent(index: number): number;
  setThumbPercent(index: number, percent: number): void;
  isThumbDragging(index: number): boolean;
  setThumbDragging(index: number, dragging: boolean): void;
  readonly focusedThumb: Accessor<number | undefined>;
  setFocusedThumb(index: number | undefined): void;
  getValuePercent(value: number): number;
  getThumbValueLabel(index: number): string;
  getFormattedValue(value?: number): string;
  getThumbMinValue(index: number): number;
  getThumbMaxValue(index: number): number;
  getPercentValue(percent: number): number;
  isThumbEditable(index: number): boolean;
  setThumbEditable(index: number, editable: boolean): void;
  incrementThumb(index: number, stepSize?: number): void;
  decrementThumb(index: number, stepSize?: number): void;
  readonly step: Accessor<number>;
  readonly pageSize: Accessor<number>;
  readonly orientation: Accessor<Orientation>;
  readonly isDisabled: Accessor<boolean>;
  setValues: (next: number[] | ((prev: number[]) => number[])) => void;
  resetValues: () => void;
}

/** The root's value contract, as accessors (research 4.4). */
export interface SliderStateProps {
  /** The controlled value: a number for one thumb, an array for several. */
  value?: Accessor<number | number[] | undefined>;

  /** The uncontrolled initial value; `[minValue]` when absent. */
  defaultValue?: Accessor<number | number[] | undefined>;

  minValue?: Accessor<number | undefined>;
  maxValue?: Accessor<number | undefined>;
  step?: Accessor<number | undefined>;
  orientation?: Accessor<Orientation | undefined>;
  isDisabled?: Accessor<boolean | undefined>;
  formatOptions?: Accessor<NumberFormatOptions | undefined>;
  onChange?: (value: number | number[]) => void;
  onChangeEnd?: (value: number | number[]) => void;
}

function toArray(value: number | number[] | undefined): number[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

/**
 * The slider's value state. One call per root instance; parts read it through
 * the root's context (research 4.4).
 */
export function createSliderState(props: SliderStateProps): SliderState {
  const minValue = computed(() => props.minValue?.() ?? 0);
  const maxValue = computed(() => props.maxValue?.() ?? 100);
  const step = computed(() => props.step?.() ?? 1);
  const orientation = computed<Orientation>(() => props.orientation?.() ?? "horizontal");
  const isDisabled = computed(() => props.isDisabled?.() === true);

  // React Aria's `createOnChange`: a caller who gave a number keeps hearing a
  // number, everyone else hears the array (port sheet section 5).
  const isSinglePayload = computed(() => {
    const value = props.value?.();

    if (typeof value === "number") {
      return true;
    }

    return value === undefined && typeof props.defaultValue?.() === "number";
  });

  const emit = (next: number[], handler: ((value: number | number[]) => void) | undefined) => {
    if (handler) {
      handler(isSinglePayload() ? next[0]! : next);
    }
  };

  // One array signal behind both modes: the controlled prop becomes an array,
  // the uncontrolled default starts as `[minValue]` (React Aria's fallback).
  const [controllableValues, setControllableValues] = createControllableSignal<number[]>({
    value: () => toArray(props.value?.()),
    defaultValue: () => toArray(props.defaultValue?.()) ?? [minValue()],
    onChange: (next) => emit(next, props.onChange),
  });

  // React Aria's `restrictValues`: with no minimum gap between thumbs, each
  // thumb is clamped between its neighbours.
  const restrictValues = (raw: number[]): number[] =>
    raw.map((value, index) => {
      const min = index === 0 ? minValue() : raw[index - 1]!;
      const max = index === raw.length - 1 ? maxValue() : raw[index + 1]!;

      return clamp(value, min, max);
    });

  const values = computed(() => restrictValues(controllableValues() ?? [minValue()]));

  // React Stately's `defaultValues`: the snapshot `resetValues` returns to.
  // The caller's `defaultValue` when one was given (restricted like the live
  // values), otherwise the values the state started with.
  const providedDefault = toArray(props.defaultValue?.());
  const defaultValues = providedDefault
    ? restrictValues(providedDefault)
    : [...values()];

  const isEditables = signal<boolean[]>(new Array(values().length).fill(true));
  const dragging = signal<boolean[]>(new Array(values().length).fill(false));
  const focusedThumb = signal<number | undefined>(undefined);

  const setValues = (next: number[] | ((prev: number[]) => number[])) => {
    const raw = typeof next === "function" ? next(values()) : next;

    setControllableValues(restrictValues(raw));
  };

  const resetValues = () => {
    setControllableValues(restrictValues(defaultValues));
  };

  const getThumbMinValue = (index: number): number =>
    index === 0 ? minValue() : values()[index - 1]!;

  const getThumbMaxValue = (index: number): number =>
    index === values().length - 1 ? maxValue() : values()[index + 1]!;

  const isThumbEditable = (index: number): boolean => isEditables()[index] ?? true;

  const setThumbEditable = (index: number, editable: boolean) => {
    isEditables.update((previous) => {
      const next = [...previous];

      next[index] = editable;

      return next;
    });
  };

  const updateValue = (index: number, value: number): void => {
    if (isDisabled() || !isThumbEditable(index)) {
      return;
    }

    const min = getThumbMinValue(index);
    const max = getThumbMaxValue(index);
    const snapped = snapValueToStep(clamp(value, min, max), min, max, step());

    setValues(getNextSortedValues(values(), snapped, index));
  };

  const updateDragging = (index: number, isDragging: boolean): void => {
    if (isDisabled() || !isThumbEditable(index)) {
      return;
    }

    const wasDragging = dragging()[index] === true;

    dragging.update((previous) => {
      const next = [...previous];

      next[index] = isDragging;

      return next;
    });

    // React Aria commits when the thumb stops moving, not when the focus
    // leaves: one key press and one drag each call `onChangeEnd` once.
    if (wasDragging && !dragging().some(Boolean)) {
      emit(values(), props.onChangeEnd);
    }
  };

  const getValuePercent = (value: number): number =>
    (value - minValue()) / (maxValue() - minValue());

  const getPercentValue = (percent: number): number => {
    const min = minValue();
    const max = maxValue();
    const value = min + percent * (max - min);

    return clamp(snapValueToStep(value, min, max, step()), min, max);
  };

  const getThumbPercent = (index: number): number => getValuePercent(values()[index]!);

  const formatter = computed(() => new NumberFormatter(locale(), props.formatOptions?.()));

  const listFormat = computed(() => {
    // `Intl.ListFormat` is not in every JS engine; `getFormattedValue` only
    // needs it for three or more values and falls back to joining with the
    // range separator (port sheet section 8).
    try {
      const ListFormat = (Intl as unknown as { ListFormat: new (locale: string, options: { type: string }) => { format(list: string[]): string } }).ListFormat;

      return new ListFormat(locale(), { type: "unit" });
    } catch {
      return undefined;
    }
  });

  const getFormattedValue = (value?: number): string => {
    if (value !== undefined) {
      return formatter().format(value);
    }

    const current = values();

    if (current.length === 0) {
      return "";
    }

    if (current.length === 1) {
      return formatter().format(current[0]!);
    }

    if (current.length === 2) {
      try {
        return formatter().formatRange(current[0]!, current[1]!);
      } catch {
        return `${formatter().format(current[0]!)} – ${formatter().format(current[1]!)}`;
      }
    }

    const labels = current.map((entry) => formatter().format(entry));

    return listFormat()?.format(labels) ?? labels.join(" – ");
  };

  const getThumbValueLabel = (index: number): string =>
    formatter().format(values()[index]!);

  const incrementThumb = (index: number, stepSize = 1): void => {
    updateValue(index, values()[index]! + Math.max(stepSize, step()));
  };

  const decrementThumb = (index: number, stepSize = 1): void => {
    updateValue(index, values()[index]! - Math.max(stepSize, step()));
  };

  // React Aria's page size: a tenth of the range snapped to the step grid,
  // never below one step, with `calc + step` as the snap's upper bound (port
  // sheet section 2; Kobalte's `create-slider-state.ts:96-104`).
  const pageSize = computed(() => {
    const currentStep = step();
    const calc = (maxValue() - minValue()) / 10;

    return Math.max(snapValueToStep(calc, 0, calc + currentStep, currentStep), currentStep);
  });

  return {
    values,
    defaultValues,
    getThumbValue: (index) => values()[index]!,
    setThumbValue: updateValue,
    getThumbPercent,
    setThumbPercent: (index, percent) => updateValue(index, getPercentValue(percent)),
    isThumbDragging: (index) => dragging()[index] === true,
    setThumbDragging: updateDragging,
    focusedThumb,
    setFocusedThumb: (index) => focusedThumb.set(index),
    getValuePercent,
    getThumbValueLabel,
    getFormattedValue,
    getThumbMinValue,
    getThumbMaxValue,
    getPercentValue,
    isThumbEditable,
    setThumbEditable,
    incrementThumb,
    decrementThumb,
    step,
    pageSize,
    orientation,
    isDisabled,
    setValues,
    resetValues,
  };
}
