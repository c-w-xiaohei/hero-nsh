import type { JSX, ViewRef } from "nsh";
import { cleanup, effect, signal, split } from "nsh";

import type {
  DropdownSubmenuLayerContextValue,
  DropdownSubmenuRow,
  DropdownSubmenuRowContextValue,
} from "./dropdown-context";
import {
  DropdownPopoverContext,
  DropdownSubmenuLayerContext,
  DropdownSubmenuRowContext,
} from "./dropdown-context";

/* -------------------------------------------------------------------------------------------------
 * Submenu trigger
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Dropdown.SubmenuTrigger` / `DropdownSubmenuTrigger`: React Aria
 * Components' `SubmenuTrigger`, which takes exactly two children (the
 * `Dropdown.Item` that opens the submenu and the `Dropdown.Popover` that holds
 * it).
 */
export interface DropdownSubmenuTriggerProps {
  /** `[Dropdown.Item, Dropdown.Popover]`, in that order. Read once, inside the context. */
  children: JSX.Element;

  /** How long the pointer rests on the row before the submenu opens. @default 200 */
  delay?: number;
}

// The grace timer for leaving the row or the content: React Aria's
// `useSubmenuTrigger` keeps the submenu open across a diagonal move with a
// pointer geometry triangle; NSH has no hit-testing channel, so a timer covers
// the same common path (port sheet §8).
const CLOSE_DELAY_MS = 300;

/**
 * Dropdown.SubmenuTrigger / DropdownSubmenuTrigger: holds the submenu's open
 * state, its anchor and the hover timing, and tells the two children about it.
 * It renders no view of its own (`SubmenuTrigger` renders only the item and
 * the popover upstream as well).
 *
 * Two layers, as upstream: the row half (`DropdownSubmenuRowContext`) only
 * reaches the trigger item, because a `Menu` replaces the row context for its
 * own rows (`Menu.tsx:384`); the layer half (`DropdownSubmenuLayerContext`)
 * reaches the submenu's popover and menu.
 */
export function DropdownSubmenuTrigger(props: DropdownSubmenuTriggerProps) {
  const [local] = split(props, ["children", "delay"] as const);

  const isOpen = signal(false);

  // The layer this trigger sits in: the root popover or an outer submenu. An
  // open submenu whose parent layer closes must close with it: upstream the
  // submenu's state is derived from the parent trigger state
  // (`useSubmenuTriggerState`), so closing the dropdown drops every submenu
  // under it.
  const parentLayer = DropdownPopoverContext();

  const focusOnOpen = signal(false);
  const anchor = signal<ViewRef | undefined>(undefined);
  const rowFocus = signal<{ run: () => void } | undefined>(undefined);

  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  const clearOpenTimer = () => {
    if (openTimer !== undefined) {
      clearTimeout(openTimer);
      openTimer = undefined;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimer !== undefined) {
      clearTimeout(closeTimer);
      closeTimer = undefined;
    }
  };

  cleanup(() => {
    clearOpenTimer();
    clearCloseTimer();
  });

  const open = (focusFirst?: boolean) => {
    clearOpenTimer();
    clearCloseTimer();
    focusOnOpen.set(focusFirst === true);
    isOpen.set(true);
  };


  const close = () => {
    clearOpenTimer();
    clearCloseTimer();
    focusOnOpen.set(false);
    isOpen.set(false);
  };

  const closeAndFocusRow = () => {
    const row = rowFocus();
    close();
    row?.run();
  };

  effect(() => {
    if (parentLayer && !parentLayer.isOpen()) {
      close();
    }
  });

  const rowEnter = () => {
    clearCloseTimer();

    if (isOpen()) {
      return;
    }

    clearOpenTimer();

    // The delay is read here, from the current props, and carried into the
    // timer by value.
    const wait = local.delay ?? 200;

    openTimer = setTimeout(() => {
      openTimer = undefined;
      open(false);
    }, wait);
  };

  const rowLeave = () => {
    clearOpenTimer();

    if (!isOpen()) {
      return;
    }

    clearCloseTimer();
    closeTimer = setTimeout(() => {
      closeTimer = undefined;
      isOpen.set(false);
    }, CLOSE_DELAY_MS);
  };

  const contentEnter = () => {
    clearOpenTimer();
    clearCloseTimer();
  };

  const contentLeave = () => {
    clearOpenTimer();

    if (!isOpen()) {
      return;
    }

    clearCloseTimer();
    closeTimer = setTimeout(() => {
      closeTimer = undefined;
      isOpen.set(false);
    }, CLOSE_DELAY_MS);
  };

  const registerRow = (row: DropdownSubmenuRow) => {
    anchor.set(row.ref);
    rowFocus.set({ run: row.focus });

    return () => {
      if (anchor() === row.ref) {
        anchor.set(undefined);
        rowFocus.set(undefined);
      }
    };
  };

  const layerContext: DropdownSubmenuLayerContextValue = {
    isOpen,
    // The popover closes its own channel through here (outside press, Escape),
    // so the timers end with it.
    setIsOpen: (next) => {
      const value = typeof next === "function" ? next(isOpen()) : next;

      if (value) {
        open();
      } else {
        close();
      }
    },
    focusOnOpen,
    anchor,
    open,
    close,
    closeAndFocusRow,
    contentEnter,
    contentLeave,
  };

  const rowContext: DropdownSubmenuRowContextValue = {
    isOpen,
    openSubmenu: (focusFirst) => open(focusFirst === true),
    closeSubmenu: closeAndFocusRow,
    registerRow,
    rowEnter,
    rowLeave,
  };

  // `_common` exception: a component that provides a context reads
  // `props.children` once, inside the providers, at the placement.
  return (
    <DropdownSubmenuLayerContext.Provider value={layerContext}>
      <DropdownSubmenuRowContext.Provider value={rowContext}>
        {local.children}
      </DropdownSubmenuRowContext.Provider>
    </DropdownSubmenuLayerContext.Provider>
  );
}
