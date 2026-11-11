import type { Accessor, Bounds, ViewRef } from "nsh";
import { context } from "nsh";

import type { TooltipSide } from "./tooltip-placement";
import type { tooltipVariants } from "./tooltip.styles";

/** The slots `tooltipVariants` produces, as the parts call them. */
export type TooltipSlots = ReturnType<typeof tooltipVariants>;

/**
 * React Aria's `TooltipTriggerState` in NSH form: the state Content hands to its
 * `className` / `style` functions and to a render-prop child (D17: the function
 * takes accessor objects, so the changing `isOpen` is an accessor here).
 */
export interface TooltipState {
  isOpen: Accessor<boolean>;

  /** React Aria's `state.open(immediate?)`. */
  open: (immediate?: boolean) => void;

  /** React Aria's `state.close(immediate?)`. */
  close: (immediate?: boolean) => void;
}

/**
 * What the root provides to the parts: HeroUI's `TooltipContext` (the slots)
 * plus the state a part cannot read through the hover trigger channel (the
 * anchor, the animation flags, the content's own hover entry).
 */
export interface TooltipContextValue {
  slots: TooltipSlots;

  /** Root's open state, which Content shows unless it owns a channel itself. */
  isOpen: Accessor<boolean>;

  /**
   * React Aria's `shouldSkipAnimation` as the root's state machine set it on the
   * last open / close: a swap between targets skips the exit hold (port sheet
   * §5.5).
   */
  skipAnimation: Accessor<boolean>;

  /**
   * Root's `shouldSkipAnimation` prop, default `false`. HeroUI forces the enter
   * animation on unless the caller opted out, even while the warmup is hot.
   */
  shouldSkipAnimation: Accessor<boolean>;

  /** The registered trigger, the fallback anchor for a standalone-looking Content. */
  triggerRef: Accessor<ViewRef | undefined>;

  /** The pointer entered the content (`useTooltip`'s `onHoverStart`): open at once. */
  contentHoverStart: () => void;

  /** The pointer left the content: close after `closeDelay`. */
  contentHoverEnd: () => void;

  /** The root's own state, for the render values. */
  state: TooltipState;
}

export const TooltipContext = context<TooltipContextValue | null>(null);

/**
 * Where the content and the arrow are, kept by `Tooltip.Content` so the Arrow
 * part places itself without the caller wiring refs: React Aria's
 * `OverlayArrow` reads the same numbers from its content context.
 */
export interface TooltipPositionContextValue {
  /** The anchor's frame in the root view, from `triggerRef.measure()`. */
  anchorBounds: Accessor<Bounds | undefined>;

  /** The content's frame in the root view, from `Overlay.onPosition`. */
  overlayBounds: Accessor<Bounds | undefined>;

  /** The side the overlay is on now (after any flip). */
  side: Accessor<TooltipSide>;

  /**
   * React Aria's `PlacementAxis`: the side that was measured, `null` until the
   * core Overlay has positioned the content once.
   */
  placement: Accessor<TooltipSide | null>;
  crossOffset: Accessor<number>;
  arrowBoundaryOffset: Accessor<number>;
}

export const TooltipPositionContext = context<TooltipPositionContextValue | null>(null);
