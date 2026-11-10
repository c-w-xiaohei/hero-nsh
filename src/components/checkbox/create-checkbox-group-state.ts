/*
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/a13802d8be6f83af1450e56f7a88527b10d9cadf/packages/%40react-stately/checkbox/src/useCheckboxGroupState.ts
 *
 * Adapted to NSH: the state is written as a `create*` primitive in Solid style
 * (accessors in, accessors and handlers out, research section 4.4), and the
 * React Aria validation object is reduced to the error list NSH can show.
 */

import type { Accessor } from "nsh";
import { computed, signal } from "nsh";

import { createControllableSignal } from "../../primitives/create-controllable-signal";

/* -------------------------------------------------------------------------------------------------
 * Validation
 * -----------------------------------------------------------------------------------------------*/

/**
 * A validation error, as React Aria's `validate` returns it: a string is the
 * message, an object carries it in `message`. NSH has no DOM `ValidityState`.
 */
export interface CheckboxGroupValidationError {
  key?: string;
  message?: string;
}

/* -------------------------------------------------------------------------------------------------
 * Creation
 * -----------------------------------------------------------------------------------------------*/

export interface CreateCheckboxGroupStateProps {
  /** The selected values, controlled. */
  value?: Accessor<string[] | undefined>;

  /** The selected values when initially rendered, uncontrolled. */
  defaultValue?: Accessor<string[] | undefined>;

  /** Called with the next values whenever the user changes the selection. */
  onChange?: (value: string[]) => void;

  /** Whether every item in the group is disabled. */
  isDisabled?: Accessor<boolean | undefined>;

  /** Whether every item in the group cannot change its value. */
  isReadOnly?: Accessor<boolean | undefined>;

  /** Whether the group is required (the group's own Label shows the asterisk). */
  isRequired?: Accessor<boolean | undefined>;

  /** Marks the group invalid; a `FieldError` inside it shows its message. */
  isInvalid?: Accessor<boolean | undefined>;

  /** Runs whenever the selection changes; `true` means valid. */
  validate?: Accessor<
    | ((value: string[]) => true | string | CheckboxGroupValidationError | null | undefined)
    | undefined
  >;

  /**
   * When the validation message appears: `"native"` (the default) waits for
   * the first change, `"aria"` shows the live `validate` result from the first
   * render and follows controlled value changes (RAC `Checkbox.tsx:434-447`).
   */
  validationBehavior?: Accessor<"native" | "aria" | undefined>;
}

/**
 * React Stately's `CheckboxGroupState`, with accessors instead of plain values
 * (D17). `value` is the single source of the group's selection: the items never
 * own a copy, they ask `isSelected` / `toggleValue`.
 */
export interface CheckboxGroupState {
  /** The selected values, in the order they were added. */
  value: Accessor<string[]>;

  /** Replaces the selection. */
  setValue: (value: string[]) => void;

  /** Appends `value` when it is not selected yet (React Stately's `addValue`). */
  addValue: (value: string) => void;

  /** Removes `value` when it is selected (React Stately's `removeValue`). */
  removeValue: (value: string) => void;

  /** Selects `value` when it is not selected, removes it otherwise. */
  toggleValue: (value: string) => void;

  /** Whether `value` is in the selection. */
  isSelected: (value: string) => boolean;

  isDisabled: Accessor<boolean>;

  isReadOnly: Accessor<boolean>;

  /** Passed through, not derived: the group's `isRequired` never reaches its items. */
  isRequired: Accessor<boolean>;

  /** `isInvalid` plus the committed validation errors. */
  isInvalid: Accessor<boolean>;

  /** ARIA's two-way state, as React Stately reports it. */
  validationState: Accessor<"valid" | "invalid">;

  /** The committed validation errors. */
  validationErrors: Accessor<readonly string[]>;

  /** Runs `validate` and commits its errors (the first change does this). */
  commitValidation: () => void;
}

function toValidationErrors(
  result: true | string | CheckboxGroupValidationError | null | undefined,
): readonly string[] {
  if (result === true || result === null || result === undefined) {
    return [];
  }

  const message = typeof result === "string" ? result : result.message;

  return typeof message === "string" && message.length > 0 ? [message] : [];
}

/**
 * The group's selection and validation, as a `create*` primitive in the
 * component's own directory (common rules: a unit does not add new shared
 * primitives; the controller promotes a duplicate between batches).
 *
 * It is the array-valued counterpart of `createToggleState`: the group is the
 * only owner of the value, and its items derive their selected state from it
 * (port sheet §2).
 */
export function createCheckboxGroupState(
  props: CreateCheckboxGroupStateProps = {},
): CheckboxGroupState {
  const [rawValue, setRawValue] = createControllableSignal<string[]>({
    value: () => props.value?.(),
    defaultValue: () => props.defaultValue?.(),
    onChange: (value) => props.onChange?.(value),
  });

  const value = computed<readonly string[]>(() => rawValue() ?? []);

  const isDisabled = computed(() => props.isDisabled?.() === true);
  const isReadOnly = computed(() => props.isReadOnly?.() === true);
  const isRequired = computed(() => props.isRequired?.() === true);

  // React Aria commits a toggle's validation on the change event, so the first
  // change already shows the message; a controlled parent's later value keeps
  // the old "recheck after the first commit" behaviour (port sheet §2).
  const validationErrors = signal<readonly string[]>([]);
  let hasCommitted = false;

  const validationBehavior = computed(() => props.validationBehavior?.() ?? "native");

  const runValidation = () => {
    const validate = props.validate?.();

    if (!validate) {
      validationErrors.set([]);

      return;
    }

    validationErrors.set(toValidationErrors(validate([...value()])));
  };

  // React Aria's `"aria"` mode reads the live `validate` result from the first
  // render, instead of waiting for a commit
  // (`@react-stately/form`'s `useFormValidationState.ts:184-193`).
  const shownValidationErrors = computed<readonly string[]>(() => {
    if (validationBehavior() !== "aria") {
      return validationErrors();
    }

    const validate = props.validate?.();

    return validate ? toValidationErrors(validate([...value()])) : [];
  });

  const commitValidation = () => {
    hasCommitted = true;
    runValidation();
  };

  const isInvalid = computed(
    () => props.isInvalid?.() === true || shownValidationErrors().length > 0,
  );

  const update = (next: (previous: string[]) => string[]) => {
    setRawValue((previous) => next(previous ?? []));

    if (hasCommitted) {
      runValidation();
    }
  };

  const setValue = (next: string[]) => {
    update(() => next);
  };

  const addValue = (item: string) => {
    update((previous) => (previous.includes(item) ? previous : [...previous, item]));
  };

  const removeValue = (item: string) => {
    update((previous) =>
      previous.includes(item) ? previous.filter((entry) => entry !== item) : previous,
    );
  };

  const toggleValue = (item: string) => {
    update((previous) =>
      previous.includes(item)
        ? previous.filter((entry) => entry !== item)
        : [...previous, item],
    );
  };

  const isSelected = (item: string) => value().includes(item);

  return {
    value: value as Accessor<string[]>,
    setValue,
    addValue,
    removeValue,
    toggleValue,
    isSelected,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    validationState: computed(() => (isInvalid() ? "invalid" : "valid")),
    validationErrors: shownValidationErrors,
    commitValidation,
  };
}
