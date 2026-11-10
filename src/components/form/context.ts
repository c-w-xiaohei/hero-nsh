import { context } from "nsh";
import type { Accessor } from "nsh";

/* -------------------------------------------------------------------------------------------------
 * Validation errors
 * -----------------------------------------------------------------------------------------------*/

/**
 * React Aria's `ValidationErrors` (`@react-stately/form`): the server's errors,
 * indexed by a field's `name`. A `string` is one message, an array is several.
 * Form passes the value through untouched (port sheet §1, §2); a field root
 * picks its own `name` out of it.
 *
 * The array is mutable, as upstream declares it: consumer code written against
 * HeroUI narrows it with `Array.isArray`, which does not narrow a
 * `readonly string[]`, so widening the value to readonly would break 1:1 usage
 * (port sheet §6). Form itself never mutates it.
 */
export type ValidationErrors = Record<string, string | string[] | undefined>;

/* -------------------------------------------------------------------------------------------------
 * Form context
 * -----------------------------------------------------------------------------------------------*/

/**
 * What a Form hands the fields and controls under it. Upstream this is React
 * Aria's `FormContext` (the whole props object plus the resolved
 * `validationBehavior`) and `FormValidationContext` (the resolved errors); NSH
 * has no DOM event channel, so the submit request is the third member we add
 * (port sheet §5.2).
 *
 * Every value is an accessor, so a field reads the current props instead of a
 * snapshot taken when it was created (D17). The context is internal: field
 * roots import it by this path, and only the `ValidationErrors` type reaches
 * the public entry.
 */
export interface FormContextValue {
  /** The resolved validation mode; `"native"` unless the Form says otherwise. */
  validationBehavior: Accessor<"native" | "aria">;

  /** The server errors, keyed by field `name`; `{}` when there are none. */
  validationErrors: Accessor<ValidationErrors>;

  /**
   * Called by a control that submits the form: `Button type="submit"` and,
   * once the field units land, Enter in a field (port sheet §5.2, §5.3).
   * NSH has no `<form>` to emit the native submit event, so the request has to
   * travel through this channel.
   */
  submit: () => void;
}

/**
 * Outside a Form the value is `undefined`, so a control's `form?.submit()`
 * does nothing and a field falls back to its own defaults.
 */
export const FormContext = context<FormContextValue | undefined>(undefined);
