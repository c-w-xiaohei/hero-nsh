import type { Accessor } from "nsh";
import { computed, context } from "nsh";

import type {
  AlertDialogPlacement,
  AlertDialogSize,
  AlertDialogSlots,
  AlertDialogVariant,
} from "./alert-dialog.styles";
import { alertDialogVariants } from "./alert-dialog.styles";

/**
 * What `AlertDialog.Root` hands the parts: the open state, the three
 * dimensions HeroUI keeps in its own `AlertDialogContext` and the resolved
 * slot table.
 *
 * Upstream splits the same data into `AlertDialogContext` (`slots`,
 * `placement`) and React Aria's `OverlayTriggerStateContext`; here both travel
 * in one value because every part that reads one usually reads the other
 * (Dialog reads the classes and the `close` channel, Backdrop writes the
 * variant, Container writes placement / size).
 *
 * The Backdrop and the Container each replace one dimension for their subtree
 * with `withOverrides`; HeroUI merges a second `alertDialogVariants()` over the
 * root's slots for the same reason. The status axis is not here: the Icon owns
 * it and builds its own table, as upstream does.
 */
export interface AlertDialogContextValue {
  /** The resolved `alertDialogVariants()` for this subtree. */
  slots: Accessor<AlertDialogSlots>;

  /** The Backdrop's `variant` (R-013 … R-015). */
  variant: Accessor<AlertDialogVariant | undefined>;

  /** The Container's `size` (R-039 … R-043). */
  size: Accessor<AlertDialogSize | undefined>;

  /** The Container's `placement`, which the Dialog turns into classes. */
  placement: Accessor<AlertDialogPlacement | undefined>;

  /** The open state the Backdrop renders and the Dialog's `close()` writes. */
  isOpen: Accessor<boolean>;

  /** Sets it directly, as React Aria's overlay state does. */
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void;

  /** Opens it. */
  open: () => void;

  /** Closes it: the trigger's toggle, the backdrop, the CloseTrigger. */
  close: () => void;

  /** Flips it. */
  toggle: () => void;

  /**
   * This value with some dimensions replaced. The result is a pure derivation,
   * so the parts below see the merged table and no state is duplicated.
   */
  withOverrides: (overrides: AlertDialogOverrides) => AlertDialogContextValue;
}

/** The dimensions a part may replace for its subtree. */
export interface AlertDialogOverrides {
  variant?: Accessor<AlertDialogVariant | undefined>;
  size?: Accessor<AlertDialogSize | undefined>;
  placement?: Accessor<AlertDialogPlacement | undefined>;
}

/** What `createAlertDialogContextValue` takes: the state plus any initial dimensions. */
export interface CreateAlertDialogContextOptions extends AlertDialogOverrides {
  isOpen: Accessor<boolean>;
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
}

/** The context itself; `null` outside an `AlertDialog.Root`. */
export const AlertDialogContext = context<AlertDialogContextValue | null>(null);

/**
 * Builds a context value. The Root calls it once; a Backdrop rendered without
 * a Root calls it with its own disclosure state, which is how HeroUI's parts
 * fall back to an empty `AlertDialogContext` (`{slots: alertDialogVariants()}`).
 */
export function createAlertDialogContextValue(
  options: CreateAlertDialogContextOptions,
): AlertDialogContextValue {
  const variant = () => options.variant?.();
  const size = () => options.size?.();
  const placement = () => options.placement?.();

  const value: AlertDialogContextValue = {
    // A single call with both axes is the same string HeroUI gets by spreading
    // one `alertDialogVariants()` call over another: both fill the same
    // defaults.
    slots: computed(() => alertDialogVariants({ size: size(), variant: variant() })),
    variant,
    size,
    placement,
    isOpen: options.isOpen,
    setOpen: (next) => options.setOpen(next),
    open: () => options.setOpen(true),
    close: () => options.setOpen(false),
    toggle: () => options.setOpen((prev) => !prev),
    withOverrides: (overrides) => deriveAlertDialogContext(value, overrides),
  };

  return value;
}

/**
 * A child value that keeps every dimension of `base` but takes its open state
 * from the given accessor. A Backdrop with its own open channel uses it: React
 * Aria gives the overlay its local state in that case, so the Dialog it
 * renders must read (and close) that state rather than the Root's
 * (`react-aria-components/src/Modal.tsx:213-215`).
 */
export function deriveAlertDialogState(
  base: AlertDialogContextValue,
  isOpen: Accessor<boolean>,
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void,
): AlertDialogContextValue {
  const value: AlertDialogContextValue = {
    ...base,
    isOpen,
    setOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen((prev) => !prev),
    withOverrides: (next) => deriveAlertDialogContext(value, next),
  };

  return value;
}

/**
 * A child value: every dimension is `override ?? parent`, and the slot table is
 * recomputed from the two axes that reach it (variant, size).
 */
export function deriveAlertDialogContext(
  base: AlertDialogContextValue,
  overrides: AlertDialogOverrides,
): AlertDialogContextValue {
  const variant = () => overrides.variant?.() ?? base.variant();
  const size = () => overrides.size?.() ?? base.size();
  const placement = () => overrides.placement?.() ?? base.placement();

  const value: AlertDialogContextValue = {
    slots: computed(() => alertDialogVariants({ size: size(), variant: variant() })),
    variant,
    size,
    placement,
    isOpen: base.isOpen,
    setOpen: base.setOpen,
    open: base.open,
    close: base.close,
    toggle: base.toggle,
    withOverrides: (next) => deriveAlertDialogContext(value, next),
  };

  return value;
}
