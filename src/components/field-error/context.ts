import { context } from "nsh";

/**
 * What a field root tells the `FieldError` parts inside it. HeroUI reaches the
 * same information through React Aria's `FieldErrorContext`; NSH has no DOM id
 * or `aria-describedby`, so the association is a registered error text instead
 * (port sheet §2, §8).
 *
 * The shape borrows only the skeleton of Kobalte's form-control context
 * (`packages/core/src/form-control/form-control-context.ts`): field state flows
 * down and parts register themselves on creation. Kobalte's id / `data-*`
 * machinery has no NSH counterpart and is not carried over.
 *
 * Every member is optional: a `FieldError` rendered outside a field root
 * renders nothing, exactly as upstream when `isInvalid` is unknown.
 * Field roots (TextField, Checkbox, Select, …) provide this context and import
 * it by this internal path; it is not part of the public entry.
 */
export interface FieldErrorState {
  /** The field is invalid: the error message mounts. */
  isInvalid?: () => boolean;

  /** The field's validation errors; the fallback text is their join. */
  validationErrors?: () => readonly string[];

  /** No NSH counterpart for a DOM `ValidityState`; field roots may omit it. */
  validationDetails?: () => unknown;

  /**
   * The field is a checkbox / switch / radio: the error stacks below the
   * label with `text-muted` and no inline padding, replacing the CSS
   * `.checkbox > .field-error` / `.switch > .field-error` / `.radio > .field-error`
   * selectors (port sheet R-009).
   */
  isToggleField?: () => boolean;

  /**
   * Registers the visible error text with the field, so the field can expose
   * it as the accessible description of its control (`accessibilityHint`),
   * standing in for `slot="errorMessage"` + `aria-describedby`.
   * Returns the unregister function, called when the message goes away.
   */
  registerErrorMessage?: (text: () => string | undefined) => () => void;
}

export const FieldErrorContext = context<FieldErrorState | undefined>(undefined);
