/*
 * The trigger's state machine is React Aria's `useTooltipTriggerState`
 * (`@react-stately/tooltip`), ported in the shape Kobalte's
 * `tooltip-root.tsx` uses: delay / closeDelay, the warmup window that makes
 * moving between targets fast, "one tooltip at a time", and the cooldown that
 * ends the warm window. The 300ms safe-area polygon Kobalte adds on top is not
 * ported: HeroUI / React Aria do not have it and HeroUI wins (port sheet §5.1).
 *
 * Everything an instance owns lives here as a signal; only the registry and the
 * warm flag are module-level (`tooltip-warmup.ts`).
 */

import type { JSX, ViewRef } from "nsh";
import { cleanup, signal } from "nsh";

import {
  createOverlayTrigger,
  HoverTriggerContext,
  type HoverTriggerContextValue,
} from "../../primitives/create-overlay-trigger";
import type { TooltipContextValue, TooltipState } from "./tooltip-context";
import { TooltipContext } from "./tooltip-context";
import type { TooltipPlacement } from "./tooltip-placement";
import { tooltipVariants } from "./tooltip.styles";
import {
  closeOtherTooltips,
  isTooltipWarmedUp,
  nextTooltipId,
  registerTooltip,
  scheduleTooltipCoolDown,
  unregisterTooltip,
  warmUpTooltips,
} from "./tooltip-warmup";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/** HeroUI's theme default for `--tooltip-delay`; NSH cannot read the variable. */
const DEFAULT_DELAY = 1500;

/** HeroUI's theme default for `--tooltip-close-delay`. */
const DEFAULT_CLOSE_DELAY = 500;

/**
 * The props of `Tooltip.Root`. HeroUI's `TooltipRootProps` is React Aria's
 * `TooltipTrigger` props plus `shouldSkipAnimation`; the trigger state props are
 * the ones that do something in NSH.
 */
export interface TooltipRootProps {
  /** The trigger part(s) and `Tooltip.Content`. Read once, inside the providers. */
  children: JSX.Element;

  /** The open state in controlled mode. */
  isOpen?: boolean;

  /** The initial open state in uncontrolled mode (default `false`). */
  defaultOpen?: boolean;

  /** Called whenever the open state changes (hover, focus, press, Escape). */
  onOpenChange?: (isOpen: boolean) => void;

  /**
   * How long the pointer rests on the trigger before the tip opens (default
   * 1500ms, HeroUI's `--tooltip-delay`). `0` opens at once.
   */
  delay?: number;

  /** How long the tip stays after the pointer leaves (default 500ms). */
  closeDelay?: number;

  /** Whether hovering opens it; `"focus"` ignores the pointer entirely (default `"hover"`). */
  trigger?: "hover" | "focus";

  /** Disables the tip only: the trigger still presses and focuses. */
  isDisabled?: boolean;

  /** Whether a press on the trigger closes the tip (default `true`). */
  shouldCloseOnPress?: boolean;

  /**
   * Whether to let the warmup's instant open / close skip the animation instead
   * of HeroUI forcing one every time (default `false`).
   */
  shouldSkipAnimation?: boolean;

  /** HeroUI's type carries `ref`; React Aria's `TooltipTrigger` does not forward it. */
  ref?: unknown;

  /** Accepted, no effect: `Tooltip.Content` sets the placement (React Aria's prop is on the content). */
  placement?: TooltipPlacement;
}

/**
 * Tooltip.Root / TooltipRoot: HeroUI's `TooltipTrigger`. It renders no view of
 * its own — adding a wrapper would change the layout and the press chain — and
 * provides the state machine to the parts through two contexts: the hover
 * trigger channel any actionable part can consume (`HoverTriggerContext`, which
 * Button also reads) and the tooltip's own (`TooltipContext`).
 */
export function TooltipRoot(props: TooltipRootProps) {
  const slots = tooltipVariants();
  const id = nextTooltipId();

  // The open state, and the registered anchor, as the rest of the overlay
  // family gets them. A tooltip never moves focus, so closing returns none.
  const trigger = createOverlayTrigger({
    isOpen: () => props.isOpen,
    defaultOpen: () => props.defaultOpen,
    onOpenChange: (isOpen) => props.onOpenChange?.(isOpen),
    returnFocus: () => false,
  });

  // React Aria's `shouldSkipAnimation`, written by the state machine on every
  // show / hide: true only while a swap between targets succeeds another tip.
  const skipAnimation = signal(false);

  const delay = () => props.delay ?? DEFAULT_DELAY;
  const closeDelay = () => props.closeDelay ?? DEFAULT_CLOSE_DELAY;
  const isDisabled = () => props.isDisabled ?? false;
  const isHoverTrigger = () => (props.trigger ?? "hover") === "hover";

  // Plain flags: they steer the open state, they are not rendered (port sheet
  // §2), so they do not need to be signals.
  let hovered = false;
  let focused = false;

  let warmUpTimer: number | undefined;
  let closeTimer: number | undefined;

  const clearWarmUpTimer = () => {
    if (warmUpTimer !== undefined) {
      clearTimeout(warmUpTimer);
      warmUpTimer = undefined;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimer !== undefined) {
      clearTimeout(closeTimer);
      closeTimer = undefined;
    }
  };

  /**
   * React Aria's `showTooltip(immediate)`: close the others first, take the
   * registry slot, drop both timers, record whether the animation is skipped and
   * open.
   */
  const show = (instant: boolean) => {
    clearCloseTimer();
    clearWarmUpTimer();
    closeOtherTooltips(id);
    registerTooltip(id, () => hide(true, true));
    skipAnimation.set(instant);
    warmUpTooltips();
    trigger.setIsOpen(true);
  };

  /**
   * React Aria's `hideTooltip(immediate)`. `skip` is the "another tooltip took
   * over" path: that close is instant and leaves no exit hold.
   */
  const hide = (immediate: boolean, skip = false) => {
    clearWarmUpTimer();

    if (skip) {
      skipAnimation.set(true);
    }

    if (immediate || closeDelay() <= 0) {
      clearCloseTimer();
      trigger.setIsOpen(false);
    } else if (closeTimer === undefined) {
      closeTimer = setTimeout(() => {
        closeTimer = undefined;
        trigger.setIsOpen(false);
      }, closeDelay());
    }

    // React Aria's cooldown, which ends the warm window.
    scheduleTooltipCoolDown(Math.max(500, closeDelay()));
  };

  /**
   * React Aria's `warmup`: the first hover in a cold family waits `delay`; a
   * warm one opens at once, skipping the animation as React Aria does.
   */
  const warmup = () => {
    if (trigger.isOpen()) {
      return;
    }

    if (!isTooltipWarmedUp() && warmUpTimer === undefined) {
      warmUpTimer = setTimeout(() => {
        warmUpTimer = undefined;
        // The first open of a cold spell animates; a swap does not.
        show(isTooltipWarmedUp());
      }, delay());

      return;
    }

    show(true);
  };

  /** RAC's `onHoverStart`: ignored when the root opens on focus only. */
  const hoverStart = () => {
    if (isDisabled() || !isHoverTrigger()) {
      return;
    }

    hovered = true;

    // Coming back to an open (or closing) tip cancels the close.
    if (trigger.isOpen()) {
      clearCloseTimer();

      return;
    }

    // A pending close means the pointer came back: open at once, no delay.
    if (delay() > 0 && closeTimer === undefined) {
      warmup();
    } else {
      show(false);
    }
  };

  /** RAC's `onHoverEnd`: the pointer left the trigger, so close after `closeDelay`. */
  const hoverEnd = () => {
    if (!hovered) {
      return;
    }

    hovered = false;
    focused = false;
    hide(false);
  };

  /** RAC's `onFocus`: a view's focus only comes from the keyboard. */
  const focusStart = () => {
    if (isDisabled()) {
      return;
    }

    focused = true;

    if (!trigger.isOpen()) {
      show(isTooltipWarmedUp());
    }
  };

  /** RAC's `onBlur`: closes at once, with the normal exit hold. */
  const focusEnd = () => {
    if (!focused) {
      return;
    }

    hovered = false;
    focused = false;
    hide(true);
  };

  /**
   * RAC's `onPressStart` / `onPress`: pressing the trigger means the user acted
   * on it, so the tip goes away (unless `shouldCloseOnPress` is false).
   */
  const handlePress = () => {
    if (isDisabled() || props.shouldCloseOnPress === false) {
      return;
    }

    if (!trigger.isOpen()) {
      return;
    }

    hide(true);
  };

  /** `useTooltip`'s `onHoverStart` on the content: keeps it open while hovered. */
  const contentHoverStart = () => {
    if (isDisabled()) {
      return;
    }

    // Moving from the trigger onto the tip cancels the pending close.
    if (trigger.isOpen()) {
      clearCloseTimer();

      return;
    }

    show(isTooltipWarmedUp());
  };

  /** `useTooltip`'s `onHoverEnd` on the content: closes after `closeDelay`. */
  const contentHoverEnd = () => {
    hide(false);
  };

  const state: TooltipState = {
    isOpen: trigger.isOpen,
    open: (immediate) => {
      if (!trigger.isOpen()) {
        show(immediate === true ? isTooltipWarmedUp() : false);
      }
    },
    close: (immediate) => hide(immediate === true),
  };

  const hoverContext: HoverTriggerContextValue = {
    hoverStart,
    hoverEnd,
    focusStart,
    focusEnd,
    pressStart: handlePress,
    press: handlePress,
    registerTrigger: trigger.registerTrigger,
  };

  const contextValue: TooltipContextValue = {
    slots,
    isOpen: trigger.isOpen,
    skipAnimation,
    shouldSkipAnimation: () => props.shouldSkipAnimation === true,
    triggerRef: trigger.triggerRef,
    contentHoverStart,
    contentHoverEnd,
    state,
  };

  cleanup(() => {
    clearWarmUpTimer();
    clearCloseTimer();
    unregisterTooltip(id);
  });

  // `_common` exception: a component that provides a context reads
  // `props.children` once, inside the providers, at the placement. A computed
  // here would be evaluated outside them and the parts would lose the context.
  return (
    <HoverTriggerContext.Provider value={hoverContext}>
      <TooltipContext.Provider value={contextValue}>{props.children}</TooltipContext.Provider>
    </HoverTriggerContext.Provider>
  );
}
