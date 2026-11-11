import type { Accessor } from "nsh";
import { computed, context } from "nsh";

import type {
  ModalPlacement,
  ModalSlots,
  ModalVariants,
} from "./modal.styles";
import { modalVariants } from "./modal.styles";

/**
 * What `Modal.Root` hands the parts: the open state, the four dimensions and
 * the resolved slot table.
 *
 * HeroUI splits the same data into `ModalContext` (`slots`, `placement`) and
 * React Aria's overlay state context; here both travel in one value because
 * every part that reads one usually reads the other (Dialog reads the classes
 * and the `close` channel, Backdrop writes the variant, Container writes
 * placement / size / scroll).
 */
export interface ModalContextValue {
  /** The resolved `modalVariants()` for this subtree. */
  slots: Accessor<ModalSlots>;

  /** The Backdrop's `variant` (R-013 … R-015). */
  variant: Accessor<ModalVariants["variant"]>;

  /** The Container's `size` (R-042 … R-047). */
  size: Accessor<ModalVariants["size"]>;

  /** The Container's `scroll` (R-028, R-040, R-041, R-054, R-055). */
  scroll: Accessor<ModalVariants["scroll"]>;

  /** The Container's `placement`, which the Dialog turns into classes. */
  placement: Accessor<ModalPlacement>;

  /** The open state the Backdrop renders and the Dialog's `close()` writes. */
  isOpen: Accessor<boolean>;

  /** Sets it directly, as React Aria's overlay state does. */
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void;

  /** Opens it. */
  open: () => void;

  /** Closes it: Escape, the backdrop, `Modal.CloseTrigger`, `Dialog`'s `close`. */
  close: () => void;

  /** Flips it. */
  toggle: () => void;

  /**
   * This value with some dimensions replaced. Backdrop sets `variant`,
   * Container sets `size` / `scroll` / `placement`; the result is a pure
   * derivation, so the parts below see the merged table and no state is
   * duplicated (HeroUI merges the same two `modalVariants()` results).
   */
  withOverrides: (overrides: ModalOverrides) => ModalContextValue;
}

/** The dimensions a part may replace for its subtree. */
export interface ModalOverrides {
  variant?: Accessor<ModalVariants["variant"] | undefined>;
  size?: Accessor<ModalVariants["size"] | undefined>;
  scroll?: Accessor<ModalVariants["scroll"] | undefined>;
  placement?: Accessor<ModalPlacement | undefined>;
}

/** What `createModalContextValue` takes: the state plus any initial dimensions. */
export interface CreateModalContextOptions extends ModalOverrides {
  isOpen: Accessor<boolean>;
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
}

/** The context itself; `null` outside a `Modal.Root`. */
export const ModalContext = context<ModalContextValue | null>(null);

/**
 * Builds a context value. The Root calls it once; a Backdrop or a Dialog
 * rendered without a Root calls it with its own disclosure state, which is how
 * HeroUI's parts fall back to an empty `ModalContext` (`{slots: undefined}`).
 */
export function createModalContextValue(
  options: CreateModalContextOptions,
): ModalContextValue {
  const variant = () => options.variant?.() ?? "opaque";
  const size = () => options.size?.() ?? "md";
  const scroll = () => options.scroll?.() ?? "inside";
  const placement = () => options.placement?.() ?? "auto";

  const value: ModalContextValue = {
    slots: computed(() => modalVariants({ scroll: scroll(), size: size(), variant: variant() })),
    variant,
    size,
    scroll,
    placement,
    isOpen: options.isOpen,
    setOpen: (next) => options.setOpen(next),
    open: () => options.setOpen(true),
    close: () => options.setOpen(false),
    toggle: () => options.setOpen((prev) => !prev),
    withOverrides: (overrides) => deriveModalContext(value, overrides),
  };

  return value;
}

/**
 * A child value that keeps every dimension of `base` but takes its open state
 * from the given accessor. A Backdrop with its own open channel uses it: React
 * Aria gives the overlay its local state in that case, so the Dialog it renders
 * must read (and close) that state rather than the Root's
 * (`react-aria-components/src/Modal.tsx:213-215`).
 */
export function deriveModalState(
  base: ModalContextValue,
  isOpen: Accessor<boolean>,
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void,
): ModalContextValue {
  const value: ModalContextValue = {
    ...base,
    isOpen,
    setOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen((prev) => !prev),
    withOverrides: (next) => deriveModalContext(value, next),
  };

  return value;
}

/**
 * A child value: every dimension is `override ?? parent`, and the slot table
 * is recomputed from the three axes. A single `modalVariants()` call with all
 * axes is the same string HeroUI gets by spreading one call over another,
 * because both fill the same defaults.
 */
export function deriveModalContext(
  base: ModalContextValue,
  overrides: ModalOverrides,
): ModalContextValue {
  const variant = () => overrides.variant?.() ?? base.variant();
  const size = () => overrides.size?.() ?? base.size();
  const scroll = () => overrides.scroll?.() ?? base.scroll();
  const placement = () => overrides.placement?.() ?? base.placement();

  const value: ModalContextValue = {
    slots: computed(() => modalVariants({ scroll: scroll(), size: size(), variant: variant() })),
    variant,
    size,
    scroll,
    placement,
    isOpen: base.isOpen,
    setOpen: base.setOpen,
    open: base.open,
    close: base.close,
    toggle: base.toggle,
    withOverrides: (next) => deriveModalContext(value, next),
  };

  return value;
}
