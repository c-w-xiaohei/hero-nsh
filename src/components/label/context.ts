import { context } from "nsh";

/**
 * What a field root tells the Labels inside it. HeroUI reaches the same
 * information through CSS descendant selectors on the field's `data-*`
 * attributes (`[data-disabled="true"] .label`, …) and through the DOM's
 * `<label for>`; NSH has neither, so the state travels through this context
 * instead (port sheet §2, R-003 / R-004 / R-006 / R-008 / R-009).
 *
 * The shape borrows only the skeleton of Kobalte's form-control context
 * (`packages/core/src/form-control/form-control-context.ts`): field state
 * flows down, parts register themselves on creation. Kobalte's DOM id /
 * `aria-labelledby` machinery has no NSH counterpart and is not carried over.
 *
 * Every member is optional: a Label rendered outside a field root falls back
 * to its own props, exactly as HeroUI's Label does when it is rendered alone.
 * Field roots (TextField, CheckboxGroup, RadioGroup, …) provide this context
 * and import it by this internal path; it is not part of the public entry.
 */
export interface FieldState {
  /** The field is required: shows the asterisk on every Label inside it. */
  isRequired?: () => boolean;

  /** The field is disabled: dims every Label inside it. */
  isDisabled?: () => boolean;

  /** The field is invalid: paints every Label inside it with `text-danger`. */
  isInvalid?: () => boolean;

  /**
   * Lets a Label report its text to the field, so the field can expose it as
   * the accessible name of its control (`accessibilityLabel`), standing in
   * for the DOM's `<label for>` / `aria-labelledby`. Returns the unregister
   * function, called when the Label goes away.
   */
  registerLabel?: (text: () => string | undefined) => () => void;

  /** Moves the focus to the field's control, standing in for pressing a `<label for>`. */
  focusField?: () => void;
}

export const FieldContext = context<FieldState | undefined>(undefined);
