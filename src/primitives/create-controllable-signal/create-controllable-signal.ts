/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/primitives/create-controllable-signal/create-controllable-signal.ts
 *
 * Adapted to NSH: `solid-js` reactive primitives are replaced by `signal`,
 * `computed` and `untracked` from "nsh", and the small `accessWith` helper is
 * inlined so this file depends on nothing from `@kobalte/utils`.
 */

import { type Accessor, computed, signal, untracked } from "nsh";

export interface CreateControllableSignalProps<T> {
  /** The value to be used, in controlled mode. */
  value?: Accessor<T | undefined>;

  /** The initial value to be used, in uncontrolled mode. */
  defaultValue?: Accessor<T | undefined>;

  /** A function that will be called when the value changes. */
  onChange?: (value: T) => void;
}

/**
 * Creates a simple reactive state with a getter and setter,
 * that can be controlled with `value` and `onChange` props.
 *
 * The setter accepts a value or an updater function, exactly as Solid's own
 * setters do, and calls `onChange` only when the resulting value differs from
 * the current one (`Object.is`, so `NaN` does not fire twice in a row).
 */
export function createControllableSignal<T>(
  props: CreateControllableSignalProps<T>,
) {
  // Internal uncontrolled value
  const _value = signal<T | undefined>(props.defaultValue?.());

  const isControlled = computed(() => props.value?.() !== undefined);

  const value = computed(() => (isControlled() ? props.value?.() : _value()));

  const setValue = (next: Exclude<T, Function> | ((prev: T) => T)) => {
    return untracked(() => {
      const previous = value() as T;
      const nextValue =
        typeof next === "function"
          ? (next as (prev: T) => T)(previous)
          : (next as T);

      if (!Object.is(nextValue, value())) {
        if (!isControlled()) {
          _value.set(nextValue as Exclude<T, Function>);
        }

        props.onChange?.(nextValue);
      }

      return nextValue;
    });
  };

  return [value, setValue] as const;
}

/**
 * Creates a simple reactive Boolean state with a getter, setter and a fallback value of `false`,
 * that can be controlled with `value` and `onChange` props.
 */
export function createControllableBooleanSignal(
  props: CreateControllableSignalProps<boolean>,
) {
  const [_value, setValue] = createControllableSignal(props);

  const value: Accessor<boolean> = () => _value() ?? false;

  return [value, setValue] as const;
}

/**
 * Creates a simple reactive Array state with a getter, setter and a fallback value of `[]`,
 * that can be controlled with `value` and `onChange` props.
 */
export function createControllableArraySignal<T>(
  props: CreateControllableSignalProps<Array<T>>,
) {
  const [_value, setValue] = createControllableSignal(props);

  const value: Accessor<Array<T>> = () => _value() ?? [];

  return [value, setValue] as const;
}

/**
 * Creates a simple reactive Set state with a getter, setter and a fallback value of `Set()`,
 * that can be controlled with `value` and `onChange` props.
 */
export function createControllableSetSignal<T>(
  props: CreateControllableSignalProps<Set<T>>,
) {
  const [_value, setValue] = createControllableSignal(props);

  const value: Accessor<Set<T>> = () => _value() ?? new Set();

  return [value, setValue] as const;
}
