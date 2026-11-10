import { context } from "nsh";
import type { Accessor } from "nsh";

/**
 * The disabled scope of a `Fieldset` (port sheet §2, §5.2).
 *
 * Upstream `<fieldset disabled>` leans on two things NSH does not have: the
 * browser propagating the attribute to every form control in the subtree, and
 * seven React Aria contexts (`ButtonContext`, `CheckboxGroupContext`,
 * `LinkContext`, `RadioGroupContext`, `SliderContext`, `ToggleButtonContext`,
 * `ToggleButtonGroupContext`) that HeroUI injects with `{isDisabled: true}` so
 * the primitives that render a `<div>` are disabled too. Both legs are replaced
 * by this context: a control inside a disabled `Fieldset` reads it and folds it
 * into its own `isDisabled`.
 *
 * Consumers combine it with **OR, not `??`**: the HTML spec says a control
 * inside a disabled `<fieldset>` cannot re-enable itself with its own
 * `disabled={false}`, so the fieldset's `true` always wins. This is unlike the
 * `??` that `ButtonGroup` / `RadioGroup` use, where a control's own `false`
 * overrides its group.
 *
 * Every member is optional-ish: the context value is `undefined` outside a
 * `Fieldset`, so a control rendered on its own keeps its own expression. The
 * root always provides the value (not only while disabled, as upstream wraps
 * the `Provider`), because the accessor lets a subtree follow `disabled` back to
 * `false` without remounting; `Legend`, `Group` and `Actions` also read it for
 * presence, since upstream composes their slot class only when a root exists
 * (`fieldset.tsx:115-122`, `compose.ts:22-28`).
 *
 * Internal module: not re-exported from `index.ts`.
 */
export interface FieldsetContextValue {
  /** The whole subtree is unavailable, as `<fieldset disabled>` means. */
  isDisabled: Accessor<boolean>;
}

export const FieldsetContext = context<FieldsetContextValue | undefined>(undefined);
