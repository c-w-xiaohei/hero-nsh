import { context } from "nsh";
import type { Accessor } from "nsh";

import type { NumberFieldState } from "./create-number-field-state";
import type { NumberFieldSlots } from "./number-field.styles";

/**
 * Root → parts. HeroUI keeps the same interface private: its
 * `NumberFieldContext` only carries the resolved class slots, and React Aria's
 * `GroupContext` / `InputContext` / `ButtonContext` slot tables carry the field
 * state. NSH has no slots and no descendant selectors, so one context carries
 * the slots, the state, the registrations and the field texts (port sheet
 * §1.1, §2, §5). It is not exported from the package entry.
 */
export interface NumberFieldContextValue {
  /** The root's variant table; each part calls its own slot. */
  slots: NumberFieldSlots;

  /** The resolved fill flavor; the group's state classes depend on it. */
  variant: Accessor<"primary" | "secondary">;

  /** The field is disabled; parts merge an explicit prop over it. */
  isDisabled: Accessor<boolean>;

  /** The field is read-only (steps and typing are off, the value still shows). */
  isReadOnly: Accessor<boolean>;

  /** The field is required; only the Label's asterisk shows it. */
  isRequired: Accessor<boolean>;

  /** Invalid from the prop or from the validation result. */
  isInvalid: Accessor<boolean>;

  /** The messages `validate` returned for the committed value. */
  validationErrors: Accessor<readonly string[]>;

  /** The input text, the display form of the committed value. */
  text: Accessor<string>;

  /**
   * Applies one edit to the text: accepted strings are written, rejected ones
   * are pushed back into the native input (port sheet §5).
   */
  setInputValue: (value: string) => void;

  /** Parses the text and commits it (blur and Enter). */
  commit: () => void;

  /** The committed value; `NaN` when the field is empty. */
  numberValue: Accessor<number>;

  /** The lower / upper bound, as `minValue` / `maxValue` report them. */
  minValue: Accessor<number | undefined>;
  maxValue: Accessor<number | undefined>;

  /** A step in either direction stays inside the bounds. */
  canIncrement: Accessor<boolean>;
  canDecrement: Accessor<boolean>;

  /** Steps one grid unit, committing immediately. */
  increment: () => void;
  decrement: () => void;

  /** Home / End: commits the lower / upper bound. */
  incrementToMax: () => void;
  decrementToMin: () => void;

  /** Something inside the field has the focus; the input is its only stop. */
  isFocusWithin: Accessor<boolean>;

  /** Writes the focus-within signal (called by the input). */
  setFocusWithin: (value: boolean) => void;

  /** Moves the focus to the input (a Label press, or a step button press). */
  focusInput: () => void;

  /** Registers the input's focus handle; returns the unregister function. */
  registerInputFocus: (focus: () => void) => () => void;

  /** A `DecrementButton` is mounted. Stands in for `:has([slot="decrement"])`. */
  registerDecrement: () => () => void;

  /** An `IncrementButton` is mounted. Stands in for `:has([slot="increment"])`. */
  registerIncrement: () => () => void;

  /** A dec/decrement button is mounted, for the group's column template. */
  hasDecrement: Accessor<boolean>;
  hasIncrement: Accessor<boolean>;

  /** The Label text, registered through `FieldContext`; the input's name. */
  labelText: Accessor<string | undefined>;

  /** The root's `aria-label`: wins over the registered Label text. */
  ariaLabel: Accessor<string | undefined>;

  /** The Description and FieldError texts, as the input's hint. */
  accessibilityHint: Accessor<string | undefined>;

  /** The id the root was given; it names the input, as upstream's `useId(id)`. */
  inputId: Accessor<string | undefined>;

  /** The root's or the input's `autoFocus`, forwarded to the native input. */
  autoFocus: Accessor<boolean>;

  /** The step buttons' default accessible names. */
  incrementAriaLabel: Accessor<string>;
  decrementAriaLabel: Accessor<string>;

  /** The field's focus transition, synthesized by the input. */
  handleFocus: () => void;

  /** The field's blur transition: commits the text, then clears the focus. */
  handleBlur: () => void;

  /** The render-prop state, accessorized (D17). */
  state: NumberFieldState;
}

/**
 * Root → parts. `null` means there is no root: a part rendered alone keeps only
 * its caller's `className`, as upstream's empty `NumberFieldContext` does.
 */
export const NumberFieldContext = context<NumberFieldContextValue | null>(null);
