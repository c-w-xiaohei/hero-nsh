import type { Accessor, Bounds, ViewRef } from "nsh";
import { context } from "nsh";

import type { PopoverSide } from "./popover-placement";
import type { popoverVariants } from "./popover.styles";

/** The slots `popoverVariants` produces, as the parts call them. */
export type PopoverSlots = ReturnType<typeof popoverVariants>;

/** What the root provides to the parts: HeroUI's `PopoverContext` in NSH form. */
export interface PopoverContextValue {
  slots: PopoverSlots;

  /**
   * The name of the component that opened the content, as React Aria's
   * `DialogTrigger` supplies `"DialogTrigger"` through `PopoverContext`
   * (`react-aria-components/src/Dialog.tsx`). Absent for a root-less Content.
   */
  trigger?: string;
}

export const PopoverContext = context<PopoverContextValue | null>(null);

/**
 * The heading level a Dialog supplies, React Aria's `HeadingContext` in its
 * `title` slot (`react-aria-components/src/Dialog.tsx`: `{...titleProps,
 * level: 2}`). `null` means no Dialog is above, so `Heading` falls back to 3.
 */
export const PopoverHeadingContext = context<number | null>(null);

/**
 * Where the content and the arrow are, kept by `Popover.Content` so the Arrow
 * part can place itself without the caller wiring refs: React Aria's
 * `OverlayArrow` reads the same numbers from its popover context.
 */
export interface PopoverPositionContextValue {
  /** The anchor's frame in the root view, from `triggerRef.measure()`. */
  anchorBounds: Accessor<Bounds | undefined>;

  /** The content's frame in the root view, from `Overlay.onPosition`. */
  overlayBounds: Accessor<Bounds | undefined>;

  /** The side the overlay is on now (after any flip). */
  side: Accessor<PopoverSide>;

  /**
   * React Aria's `PlacementAxis` (`react-aria-components/src/Popover.tsx`,
   * `PopoverRenderProps`): the side that was measured, `null` until the core
   * Overlay has positioned the content once.
   */
  placement: Accessor<PopoverSide | null>;
}

export const PopoverPositionContext = context<PopoverPositionContextValue | null>(null);

/**
 * What `Popover.Content` offers its own subtree so the Dialog part can be the
 * focus target: React Aria puts focus on the popover container, NSH has no
 * focus channel on the content root and the Dialog is the part that has one
 * (port sheet §5.7).
 */
export interface PopoverContentContextValue {
  /** Registers the Dialog view; the returned function unregisters it. */
  registerDialog: (ref: ViewRef) => () => void;

  /** Records that the registered Dialog received focus (the open focus move). */
  markDialogFocused: () => void;
}

export const PopoverContentContext = context<PopoverContentContextValue | null>(null);
