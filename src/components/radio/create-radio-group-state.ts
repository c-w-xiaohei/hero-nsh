/*
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/a13802d8be6f83af1450e56f7a88527b10d9cadf/packages/%40react-stately/radio/src/useRadioGroupState.ts
 *
 * Adapted to NSH: the state is written as a `create*` primitive in Solid style
 * (accessors in, accessors and handlers out, research section 4.4), and the
 * React Aria validation object is reduced to the error list NSH can show.
 */

import type { Accessor } from "nsh";
import { computed, signal, untracked } from "nsh";

import { createControllableSignal } from "../../primitives/create-controllable-signal";

/* -------------------------------------------------------------------------------------------------
 * Validation
 * -----------------------------------------------------------------------------------------------*/

/**
 * A validation error, as React Aria's `validate` returns it: a string is the
 * message, an object carries it in `message`. NSH has no DOM `ValidityState`.
 */
export interface RadioGroupValidationError {
  key?: string;
  message?: string;
}

/**
 * What `validate` may return. `@react-types/shared` types it as
 * `true | ValidationError | null | undefined`, and `ValidationError` is
 * `string | string[]`; the object form is React Aria's own shorthand.
 */
export type RadioGroupValidationResult =
  | true
  | string
  | RadioGroupValidationError
  | readonly (string | RadioGroupValidationError)[]
  | null
  | undefined;

/* -------------------------------------------------------------------------------------------------
 * Creation
 * -----------------------------------------------------------------------------------------------*/

export interface CreateRadioGroupStateProps {
  /** The selected value, controlled; `null` means nothing is selected. */
  value?: Accessor<string | null | undefined>;

  /** The selected value when initially rendered, uncontrolled; `null` is none. */
  defaultValue?: Accessor<string | null | undefined>;

  /** Called with the next value whenever the user changes the selection. */
  onChange?: (value: string) => void;

  /** Whether every item in the group is disabled. */
  isDisabled?: Accessor<boolean | undefined>;

  /** Whether every item in the group cannot change its value. */
  isReadOnly?: Accessor<boolean | undefined>;

  /** Whether the group is required (the group's own Label shows the asterisk). */
  isRequired?: Accessor<boolean | undefined>;

  /** Marks the group invalid; a `FieldError` inside it shows its message. */
  isInvalid?: Accessor<boolean | undefined>;

  /** Runs whenever the value is committed; `true` means valid. */
  validate?: Accessor<((value: string) => RadioGroupValidationResult) | undefined>;

  /**
   * When the validation message appears: `"native"` (the default) waits for
   * the first commit, `"aria"` shows the live `validate` result from the first
   * render and follows controlled value changes (RAC `RadioGroup.tsx:270-284`).
   */
  validationBehavior?: Accessor<"native" | "aria" | undefined>;
}

/**
 * React Stately's `RadioGroupState` (port sheet §1). The group is the only owner
 * of the value; its items derive `isSelected` from `selectedValue` and never
 * keep a copy.
 *
 * `defaultSelectedValue` is the `defaultValue` snapshot `useRadioGroupState`
 * records at creation (the sheet's controller ruling), not a second value.
 */
export interface RadioGroupState {
  /** The selected value, `null` when nothing is selected. */
  selectedValue: Accessor<string | null>;

  /** Selects a value; a read-only or disabled group ignores it. */
  setSelectedValue: (value: string | null) => void;

  /**
   * The selected value the group was created with: a controlled `value` as it
   * was at creation, else `defaultValue`, else `null`
   * (`useRadioGroupState`'s `initialValue`).
   */
  defaultSelectedValue: Accessor<string | null>;

  /** The value of the item that held the focus last. */
  lastFocusedValue: Accessor<string | null>;

  /** Records the value of the item that took the focus, or `null`. */
  setLastFocusedValue: (value: string | null) => void;

  isDisabled: Accessor<boolean>;

  isReadOnly: Accessor<boolean>;

  isRequired: Accessor<boolean>;

  /** `isInvalid` plus the committed validation errors. */
  isInvalid: Accessor<boolean>;
}

/**
 * The internal state: the public members plus the two things RAC keeps on its
 * `FormValidationState` object, which the sheet's `state` render prop
 * deliberately does not expose (§8).
 */
export interface RadioGroupStateInternal extends RadioGroupState {
  /** The committed validation errors (`native` mode). */
  validationErrors: Accessor<readonly string[]>;

  /** Runs `validate` and commits its errors; every `select()` calls it. */
  commitValidation: () => void;
}

function toValidationErrors(result: RadioGroupValidationResult): readonly string[] {
  if (result === true || result === null || result === undefined) {
    return [];
  }

  // `@react-types/shared`'s `ValidationError` is `string | string[]`, and
  // `useFormValidationState` runs the result through `asArray()`; the object
  // form is React Aria's `{ message }` shorthand.
  const entries = Array.isArray(result) ? result : [result];
  const messages: string[] = [];

  for (const entry of entries) {
    const message = typeof entry === "string" ? entry : entry.message;

    if (typeof message === "string" && message.length > 0) {
      messages.push(message);
    }
  }

  return messages;
}

/**
 * The group's value and validation, as a `create*` primitive in the component's
 * own directory (common rules: a unit does not add new shared primitives; the
 * controller promotes a duplicate between batches).
 */
export function createRadioGroupState(
  props: CreateRadioGroupStateProps = {},
): RadioGroupStateInternal {
  const [rawValue, setRawValue] = createControllableSignal<string | null>({
    value: () => props.value?.(),
    defaultValue: () => props.defaultValue?.(),
    onChange: (value) => {
      if (value != null) {
        props.onChange?.(value);
      }
    },
  });

  const selectedValue = computed<string | null>(() => rawValue() ?? null);

  const initialSelectedValue = untracked<string | null>(() => {
    const controlled = props.value?.();

    return controlled !== undefined ? controlled : (props.defaultValue?.() ?? null);
  });

  // `useRadioGroupState` records its initial selected value once, at creation,
  // and hands it back through `state.defaultSelectedValue`: a controlled
  // parent's first `value`, else `props.defaultValue`, else `null`
  // (`value !== undefined ? initialValue : defaultValue ?? null`). It never
  // follows a later controlled change.
  const defaultSelectedValue: Accessor<string | null> = () => initialSelectedValue;

  const lastFocusedValue = signal<string | null>(null);

  const isDisabled = computed(() => props.isDisabled?.() === true);
  const isReadOnly = computed(() => props.isReadOnly?.() === true);
  const isRequired = computed(() => props.isRequired?.() === true);

  const validationBehavior = computed(() => props.validationBehavior?.() ?? "native");

  const validationErrors = signal<readonly string[]>([]);

  // React Aria short-circuits validation while the value is `null`
  // (`@react-stately/form`'s `useFormValidationState.ts`, the `value == null`
  // branch), and the group commits on every `select()`, never on blur.
  const runValidation = () => {
    const validate = props.validate?.();
    const value = selectedValue();

    if (!validate || value == null) {
      validationErrors.set([]);

      return;
    }

    validationErrors.set(toValidationErrors(validate(value)));
  };

  const commitValidation = () => {
    runValidation();
  };

  // `"aria"` reads the live `validate` result from the first render instead of
  // waiting for a commit (`useFormValidationState.ts:184-193`).
  const shownValidationErrors = computed<readonly string[]>(() => {
    if (validationBehavior() !== "aria") {
      return validationErrors();
    }

    const validate = props.validate?.();
    const value = selectedValue();

    return validate && value != null ? toValidationErrors(validate(value)) : [];
  });

  const isInvalid = computed(
    () => props.isInvalid?.() === true || shownValidationErrors().length > 0,
  );

  return {
    selectedValue,
    // `useRadioGroupState.setSelectedValue`: a read-only or disabled group
    // ignores the write (`!isReadOnly && !isDisabled`).
    setSelectedValue: (value: string | null) => {
      if (isReadOnly() || isDisabled()) {
        return;
      }

      setRawValue(value);
    },
    defaultSelectedValue,
    lastFocusedValue,
    setLastFocusedValue: (value: string | null) => {
      lastFocusedValue.set(value);
    },
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    validationErrors: shownValidationErrors,
    commitValidation,
  };
}
