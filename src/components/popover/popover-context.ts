import type { Accessor, Bounds, ViewRef } from "nsh";
import { context } from "nsh";

import type { PopoverPlacement, PopoverSide } from "./popover-placement";
import type { popoverVariants } from "./popover.styles";

/** The slots `popoverVariants` produces, as the parts call them. */
export type PopoverSlots = ReturnType<typeof popoverVariants>;

/** What the root provides to the parts: HeroUI's `PopoverContext` in NSH form. */
export interface PopoverContextValue {
  slots: PopoverSlots;
}

export const PopoverContext = context<PopoverContextValue | null>(null);

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

  /** The React Aria placement string rebuilt from the side and alignment. */
  placement: Accessor<PopoverPlacement>;
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
}

export const PopoverContentContext = context<PopoverContentContextValue | null>(null);
