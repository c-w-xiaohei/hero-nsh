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
  /**
   * The shared open state, or `undefined` in a scope that has no opinion:
   * inside `Popover.Content` the section hands a no-op context, and a Button
   * there must not report a collapsed popover as its own `aria-expanded`.
   */
  isOpen: Accessor<boolean | undefined>;

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

  /**
   * The press channel a trigger part other than the owner can use (dropdown
   * port sheet §5, second change). A root that needs to tell a keyboard press
   * from a pointer press, or that opens on something other than a press,
   * supplies it; `Button` calls it instead of `toggle()` when it is present.
   * Absent elsewhere, where a press always toggles.
   */
  triggerPress?: (source: "keyboard" | "pointer") => void;

  /**
   * The long-press half of the same channel: a root whose `trigger` mode opens
   * on a held press (Dropdown's `longPress`) supplies it, and `Button` calls it
   * when a press is held. Absent elsewhere.
   */
  triggerLongPress?: () => void;

  /**
   * The key half of the same channel (dropdown port sheet §5): the trigger's
   * ArrowDown opens the menu on its first row, ArrowUp on its last. `keys`
   * names the family that asked, because upstream gates them differently
   * (`useMenuTrigger.ts:88-100`): `"arrow"` (plain ArrowDown / ArrowUp) does
   * nothing while `trigger` is `longPress`, `"altArrow"` (Alt+ArrowDown,
   * Alt+ArrowUp) opens in every mode, and `"activation"` (Alt+Enter,
   * Alt+Space) opens only in `longPress` mode, on the first row — upstream's
   * `open(trigger === 'longPress', e, 'first')`. Absent elsewhere, so no other
   * trigger part binds keys.
   */
  triggerKeyOpen?: (
    strategy: "first" | "last",
    keys?: "arrow" | "altArrow" | "activation",
  ) => void;
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
 * What a root that opens on hover or focus offers an actionable part (tooltip
 * port sheet §5.3). It is a second, independent context on purpose: a Button
 * can be the trigger of a Popover and a Tooltip at once, and folding hover into
 * `OverlayTriggerContext` would make a press toggle the wrong layer.
 *
 * HeroUI reaches this contract through React Aria's `FocusableProvider`, which
 * injects the handlers into any child element; NSH has no handler injection
 * channel, so the part consumes the context itself.
 */
export interface HoverTriggerContextValue {
  /** The pointer entered the trigger (ignored when the root opens on focus only). */
  hoverStart: () => void;

  /** The pointer left the trigger. */
  hoverEnd: () => void;

  /** The trigger took the keyboard focus. */
  focusStart: () => void;

  /** The trigger lost the keyboard focus. */
  focusEnd: () => void;

  /** A pointer went down (React Aria's `onPointerDown` closes the tooltip). */
  pressStart: () => void;

  /** A whole press finished; the keyboard's Return / Space also arrive here. */
  press: () => void;

  /** Registers the anchor; the returned function undoes only this registration. */
  registerTrigger: (ref: ViewRef) => () => void;
}

export const HoverTriggerContext = context<HoverTriggerContextValue | null>(null);

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
