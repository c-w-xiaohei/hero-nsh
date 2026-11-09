/*
 * There is no Kobalte primitive for this file: Kobalte's `popover-root` keeps
 * the trigger element in a signal and calls `createDisclosureState`, but its
 * wiring between the two lives in `popover-root.tsx` and relies on refs to DOM
 * nodes (`packages/core/src/popover/popover-root.tsx`). NSH has no document-
 * level press events and no way for a parent to inject a handler into a child's
 * element, so the wiring has to be a context an actionable part consumes by
 * itself. This primitive is the shared half: the open state (Kobalte's
 * `createDisclosureState`, already in the library), the registered trigger and
 * the focus return on close.
 *
 * HeroUI's DialogTrigger does the same through `useOverlayTrigger`:
 * `triggerRef` is the anchor, `isOpen` the shared state, and React Aria's focus
 * scope restores focus to the trigger when the overlay closes.
 */

import type { Accessor, ViewRef } from "nsh";
import { context, effect, signal } from "nsh";

import { createDisclosureState } from "../create-disclosure-state";

export interface CreateOverlayTriggerProps {
  /** The open state in controlled mode. */
  isOpen?: Accessor<boolean | undefined>;

  /** The initial open state in uncontrolled mode. */
  defaultOpen?: Accessor<boolean | undefined>;

  /** Called wherever the state changes (toggle, Escape, outside press). */
  onOpenChange?: (isOpen: boolean) => void;

  /** Whether closing returns focus to the registered trigger (default `true`). */
  returnFocus?: Accessor<boolean | undefined>;
}

/**
 * What a root provides so any actionable part can become the overlay's trigger
 * without importing the overlay component. HeroUI reaches the same contract
 * through PressResponder; NSH has no handler injection channel, so the part
 * reads this context on press instead.
 */
export interface OverlayTriggerContextValue {
  /** The shared open state. */
  isOpen: Accessor<boolean>;

  /** Sets the state directly (a Content that takes over the root's channel). */
  setIsOpen: (next: boolean | ((prev: boolean) => boolean)) => void;

  /** Flips the open state. */
  toggle: () => void;

  /** Closes it (Escape, an outside press, a dialog's `close()`). */
  close: () => void;

  /**
   * Registers the pressing view as the anchor and the focus-return target.
   * The returned function unregisters it, and only that registration: a later
   * trigger is not cleared by an older registration's cleanup.
   */
  registerTrigger: (ref: ViewRef) => () => void;

  /** The registered trigger, if any. */
  triggerRef: Accessor<ViewRef | undefined>;
}

export interface CreateOverlayTriggerResult {
  isOpen: Accessor<boolean>;
  setIsOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  triggerRef: Accessor<ViewRef | undefined>;
  registerTrigger: (ref: ViewRef) => () => void;
  /** Moves focus to the registered trigger when one exists. */
  focusTrigger: () => void;
  /** The value to give `OverlayTriggerContext.Provider`. */
  context: OverlayTriggerContextValue;
}

export const OverlayTriggerContext = context<OverlayTriggerContextValue | null>(null);

/**
 * The shared trigger state of an overlay root: the open state, the registered
 * trigger and the focus return. Popover, Tooltip, Dropdown, Select and the rest
 * of the overlay family call it once per root.
 */
export function createOverlayTrigger(
  props: CreateOverlayTriggerProps = {},
): CreateOverlayTriggerResult {
  const disclosure = createDisclosureState({
    open: () => props.isOpen?.(),
    defaultOpen: () => props.defaultOpen?.(),
    onOpenChange: (value) => props.onOpenChange?.(value),
  });

  const triggerRef = signal<ViewRef | undefined>(undefined);

  const registerTrigger = (ref: ViewRef) => {
    triggerRef.set(ref);

    return () => {
      if (triggerRef() === ref) {
        triggerRef.set(undefined);
      }
    };
  };

  const focusTrigger = () => {
    triggerRef()?.focus();
  };

  // Focus return, as React Aria's focus scope does on close. Only after the
  // overlay has actually opened once: a component created closed must not
  // steal focus on its first render.
  let wasOpen = disclosure.isOpen();

  effect(() => {
    const open = disclosure.isOpen();
    const trigger = triggerRef();

    if (open) {
      wasOpen = true;

      return;
    }

    if (!wasOpen) {
      return;
    }

    wasOpen = false;

    if (props.returnFocus?.() === false) {
      return;
    }

    trigger?.focus();
  });

  const contextValue: OverlayTriggerContextValue = {
    isOpen: disclosure.isOpen,
    setIsOpen: disclosure.setIsOpen,
    toggle: disclosure.toggle,
    close: disclosure.close,
    registerTrigger,
    triggerRef,
  };

  return {
    ...disclosure,
    triggerRef,
    registerTrigger,
    focusTrigger,
    context: contextValue,
  };
}
