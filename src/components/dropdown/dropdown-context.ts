import type { Accessor, Point, ViewRef } from "nsh";
import { context } from "nsh";

import type { dropdownVariants } from "./dropdown.styles";

/** The slots `dropdownVariants` produces, as the parts call them. */
export type DropdownSlots = ReturnType<typeof dropdownVariants>;

/** HeroUI's `MenuTriggerProps['trigger']`, unchanged. */
export type DropdownTriggerMode = "press" | "longPress" | "contextMenu";

/**
 * What `Dropdown.Root` provides to the parts: the shared open state (from
 * `createOverlayTrigger`), the trigger mode, the pointer position a context
 * menu opened at, and the slots. Upstream reaches the same state through
 * React Aria's `MenuTrigger` context.
 */
export interface DropdownContextValue {
  /** The variant slots, resolved once per root. */
  slots: DropdownSlots;

  /** The shared open state, or `undefined` in a scope with no opinion. */
  isOpen: Accessor<boolean | undefined>;

  setIsOpen: (next: boolean | ((prev: boolean) => boolean)) => void;

  toggle: () => void;

  close: () => void;

  /** `Dropdown.Root`'s `isDisabled`; the trigger makes it an OR with its own. */
  isDisabled: Accessor<boolean>;

  /** `press` (default), `longPress` or `contextMenu`. */
  triggerMode: Accessor<DropdownTriggerMode>;

  /** The root's explicit override, the last word of the close rule. */
  shouldCloseOnSelect: Accessor<boolean | undefined>;

  /** Where the last right click happened; the popover's anchor in that mode. */
  contextMenuPoint: Accessor<Point | undefined>;

  setContextMenuPoint: (point: Point | undefined) => void;

  /**
   * Where the open that is happening puts the menu's focus, as React Aria's
   * `MenuTriggerState.focusStrategy`: `"first"` for Return / ArrowDown,
   * `"last"` for ArrowUp and the Alt forms, `undefined` for a pointer open
   * (React Aria's `state.open()` passes no strategy there, so the menu root
   * takes the focus without selecting a row).
   */
  openFocusStrategy: Accessor<"first" | "last" | undefined>;

  /** Sets the strategy for the open about to happen. */
  setOpenFocusStrategy: (strategy: "first" | "last" | undefined) => void;
}

export const DropdownContext = context<DropdownContextValue | undefined>(
  undefined,
);

/**
 * What a `Dropdown.Popover` offers its own subtree, so the `Dropdown.Menu`
 * inside that popover can be the focus target of its own layer. React Aria puts
 * focus on the popover container; NSH has no focus channel there, and the menu
 * root is the part that has one.
 */
export interface DropdownPopoverContextValue {
  /** Registers the menu root's focus function; the returned function unregisters it. */
  registerMenuFocus: (focus: () => void) => () => void;

  /** Records that the registered menu root received the open focus move. */
  markMenuFocused: () => void;

  /** Closes this layer's open state (submenu, root, or its own). */
  close: () => void;

  /** This layer's open state. */
  isOpen: Accessor<boolean>;
}

export const DropdownPopoverContext = context<
  DropdownPopoverContextValue | undefined
>(undefined);

/** One row that opens a submenu, as the item hands it to `Dropdown.SubmenuTrigger`. */
export interface DropdownSubmenuRow {
  /** The row view: the submenu's anchor. */
  ref: ViewRef;

  /** Puts the parent menu's virtual focus back on the row. */
  focus: () => void;
}

/**
 * The trigger-row half of `Dropdown.SubmenuTrigger`'s state: only the
 * `Dropdown.Item` that is the trigger opens a submenu, so only it reads this.
 * Upstream the same values travel through React Aria's `MenuItemContext`
 * (`SubmenuTrigger.tsx` spreads `submenuTriggerProps` into it), and every
 * `Menu` replaces that context for its own rows (`Menu.tsx:384`) — the submenu
 * menu's rows are plain `menuitem`s, not submenu triggers in turn.
 */
export interface DropdownSubmenuRowContextValue {
  /** Whether the submenu is open; feeds the row's `aria-expanded`. */
  isOpen: Accessor<boolean>;

  /** Opens the submenu; `true` for the keyboard entry, which also takes the focus. */
  openSubmenu: (focusFirst?: boolean) => void;

  /** Closes the submenu and puts the parent menu's focus back on this row. */
  closeSubmenu: () => void;

  /** The row registers its view and focus function; returns the unregister. */
  registerRow: (row: DropdownSubmenuRow) => () => void;

  /** Pointer entered / left the trigger row (hover open and grace close). */
  rowEnter: () => void;
  rowLeave: () => void;
}

export const DropdownSubmenuRowContext = context<
  DropdownSubmenuRowContextValue | undefined
>(undefined);

/**
 * The layer half of `Dropdown.SubmenuTrigger`'s state: the submenu's open
 * state, its anchor, its timing and its focus move. The submenu's
 * `Dropdown.Popover` and `Dropdown.Menu` read it; upstream the same values come
 * through `OverlayTriggerStateContext` and `PopoverContext`
 * (`SubmenuTrigger.tsx`).
 */
export interface DropdownSubmenuLayerContextValue {
  isOpen: Accessor<boolean>;

  setIsOpen: (next: boolean | ((prev: boolean) => boolean)) => void;

  /** Whether the next open moves the focus into the submenu (keyboard opens do). */
  focusOnOpen: Accessor<boolean>;

  /** The trigger row, once it has mounted. */
  anchor: Accessor<ViewRef | undefined>;

  /** Opens now; `true` for the keyboard entry, which also takes the focus. */
  open: (focusFirst?: boolean) => void;

  /** Closes now, without moving the focus. */
  close: () => void;

  /** Closes and puts the parent menu's virtual focus back on the trigger row. */
  closeAndFocusRow: () => void;

  /** Pointer entered / left the submenu content (cancels the grace close). */
  contentEnter: () => void;
  contentLeave: () => void;
}

export const DropdownSubmenuLayerContext = context<
  DropdownSubmenuLayerContextValue | undefined
>(undefined);
