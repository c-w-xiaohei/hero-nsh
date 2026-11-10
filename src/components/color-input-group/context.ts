import { context } from "nsh";

import type { colorInputGroupVariants } from "./color-input-group.styles";

/**
 * The resolved variant table of one `ColorInputGroup` root, shared with its
 * parts. HeroUI's own `ColorInputGroupContext` carries the same thing
 * (`{ slots?: ReturnType<typeof colorInputGroupVariants> }`); NSH has no BEM
 * CSS (D18), so the value is the whole `tv()` result and each part reads its
 * own slot from it.
 *
 * `slots` is the object `tailwind-variants` returns: `slots.input()` is a
 * function call, exactly the call shape HeroUI's parts use. Our root builds it
 * so each call re-resolves against the current `variant` / `fullWidth`, which
 * keeps the parts following a runtime change of either dimension.
 */
export type ColorInputGroupSlots = ReturnType<typeof colorInputGroupVariants>;

/** Root → parts. Created by the root, read by `Input`, `Prefix` and `Suffix`. */
export interface ColorInputGroupContextValue {
  /** The root's variant table; each part calls its own slot. */
  slots: ColorInputGroupSlots;

  /**
   * A `Prefix` is mounted inside the group. Stands in for upstream's
   * `.color-input-group:has([data-slot="color-input-group-prefix"])`: `Input`
   * drops its start padding and corner radius while it is true (R-017).
   */
  hasPrefix: () => boolean;

  /** A `Suffix` is mounted inside the group (R-018). */
  hasSuffix: () => boolean;

  /** Registers a `Prefix`; returns the unregister function for `cleanup`. */
  registerPrefix: () => () => void;

  /** Registers a `Suffix`; returns the unregister function for `cleanup`. */
  registerSuffix: () => () => void;

  /** The group's effective disabled state (prop, `aria-*` / `data-*`, field). */
  isDisabled: () => boolean;

  /** The group's effective invalid state (prop, `aria-*` / `data-*`, field). */
  isInvalid: () => boolean;

  /** Something inside the group has keyboard focus (`:focus-within`). */
  isFocusWithin: () => boolean;

  /** Writes the focus-within signal; called by `Input` and the root's own focus. */
  setFocusWithin: (value: boolean) => void;
}

/**
 * What a field root (`ColorField`, a later unit) tells the group and its
 * input. Upstream this is React Aria's `InputContext` (value, change, disabled,
 * readOnly, required, accessible name) plus the `GroupContext` state
 * (`react-aria-components/src/ColorField.tsx:262-270`).
 *
 * It is an **optional provider**: without a field root the four parts render a
 * plain input group and `Input` uses its own controlled / uncontrolled props.
 * With one, the field value wins and the group defaults to
 * `role="presentation"`. ColorField imports this file by its internal path and
 * provides the value; it is not exported from the package entry.
 */
export interface ColorInputGroupFieldValue {
  /** The field's current text; `Input` shows it when present. */
  value?: () => string;

  /** The field's setter; `Input` calls it when the caller gave no `onChange`. */
  setValue?: (value: string) => void;

  /** The field is disabled; merged into `Input`'s own `disabled`. */
  isDisabled?: () => boolean;

  /** The field is invalid; merged into the group's and input's invalid state. */
  isInvalid?: () => boolean;

  /** The field is read-only; merged into `Input`'s own `readOnly`. */
  isReadOnly?: () => boolean;

  /** The field is required; accepted by `Input`, with no NSH constraint. */
  isRequired?: () => boolean;

  /**
   * The field's accessible name (its `Label` text). `Input` prefers its own
   * `aria-label` / `accessibilityLabel` over it, as React Aria's merge does.
   */
  accessibilityLabel?: () => string | undefined;

  /** The field's description / error text, used as the input's hint. */
  accessibilityHint?: () => string | undefined;

  /**
   * RAC's ColorField forces the group's role to `"presentation"`
   * (`react-aria-components/src/ColorField.tsx:264-270`), which NSH maps to
   * `"none"`. Explicit `role` on the root still wins.
   */
  role?: "presentation";

  /**
   * The field's placeholder text, forwarded to `Input` when it was not given
   * one itself. React Aria's `InputContext` carries it in `inputProps`.
   */
  placeholder?: () => string | undefined;

  /** The field's `autoFocus`, forwarded to `Input`; an explicit prop wins. */
  autoFocus?: () => boolean;

  /** The input took the focus: the field records its focus-within state. */
  onFocus?: () => void;

  /** The input lost the focus: the field commits its text, then clears it. */
  onBlur?: () => void;

  /** Return in the input: the field commits in place (React Aria's Enter). */
  onSubmit?: (event: { text: string }) => void;

  /**
   * Registers the input's focus handle, standing in for the DOM's
   * `<label for>` press. Returns the unregister function for `cleanup`.
   */
  registerInputFocus?: (focus: () => void) => () => void;
}

/**
 * Root → parts. `null` means "no group": a part rendered alone keeps only its
 * caller's `className`, exactly as upstream when the context is `{}`.
 */
export const ColorInputGroupContext = context<ColorInputGroupContextValue | null>(null);

/** Field root → group / input; `undefined` when there is no field root. */
export const ColorInputGroupFieldContext = context<ColorInputGroupFieldValue | undefined>(
  undefined,
);
