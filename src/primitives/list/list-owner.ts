import type { Accessor, JSX } from "nsh";
import { context } from "nsh";

import type { SelectionMode, SelectionValue } from "../selection";
import type { ListState } from "./create-list-state";

/**
 * One registered option, as far as the owning field needs it: the value's
 * default content is built from the option the user chose (HeroUI renders the
 * selected item's children in `Select.Value`), and the field only holds the
 * registry through this contract (port sheet §5, fifth change).
 */
export interface ListOwnerItem {
  /** The collection key. */
  key: string;

  /** The typeahead / accessible text, read lazily. */
  textValue: () => string;

  /**
   * The row's rendered children. HeroUI's `Select.Value` renders the selected
   * item's `children` a second time; NSH has no JSX value to reuse, so the
   * owner re-places the element tree the row built (port sheet §5, fifth
   * change).
   */
  children?: () => JSX.Element | undefined;
}

/**
 * What the list hands back to its owner when it registers itself. The owner
 * moves the focus to the list on open and to an option by the focus strategy,
 * which is React Aria's `menuProps` auto focus in HeroUI (port sheet §2).
 */
export interface ListOwnerListControls {
  /** Focuses the list's own view: the one Tab stop and key station. */
  focusList: () => void;

  /** Makes `key` the focused option and marks the list focused. */
  focusKey: (key: string) => void;

  /** The list's current focused key. */
  focusedKey: Accessor<string | undefined>;

  /** Looks one registered option up (the owner's value renders its children). */
  findItem: (key: string) => ListOwnerItem | undefined;

  /**
   * Forgets the list's typeahead prefix. A field whose list stays mounted
   * while it closes calls this on close: upstream the popover unmounts, which
   * drops the search buffer (Select's list, port sheet T-068).
   */
  resetTypeAhead?: () => void;
}

/**
 * The contract a composite field (Select today, ComboBox and Autocomplete
 * later) uses to drive a caller-written `ListBox` (port sheet §5, first
 * change).
 *
 * Upstream the ListBox sits inside a React Aria `Select` and reads the
 * select's `ListState` from context; it builds no state of its own. This
 * package's ListBox is a standalone component that creates its own
 * `createListState`, so the two interfaces are reversed: the owner injects the
 * controlled selection, the disabled set and the close rules, and the list
 * registers its state back so the owner can render the value and place the
 * focus.
 *
 * Every member is required only because the context itself is optional: a
 * ListBox rendered without an owner keeps exactly today's defaults (no owner,
 * no injection), so standalone use is untouched.
 */
export interface ListOwner {
  /** The selection mode the field imposes on its list. */
  selectionMode: Accessor<SelectionMode>;

  /** The controlled selection, or `undefined` when the list owns it. */
  selectedKeys: Accessor<SelectionValue | undefined>;

  /** The initial selection when the list owns it. */
  defaultSelectedKeys: Accessor<SelectionValue | undefined>;

  /** The selection changed (a press, a key, the clear shortcut). */
  onSelectionChange: (keys: Set<string> | "all") => void;

  /**
   * Kobalte's Select passes `true`: selecting the same option again still
   * reports a change (its regression suite depends on it).
   */
  allowDuplicateSelectionEvents: Accessor<boolean | undefined>;

  /** The field's `disallowEmptySelection`, injected into the list state. */
  disallowEmptySelection: Accessor<boolean | undefined>;

  /**
   * The field's `disabledKeys`. The stories write them on the Select root and
   * the caller's `<ListBox>` carries no props, so the owner is the only source
   * (port sheet §2).
   */
  disabledKeys: Accessor<Iterable<string | number> | undefined>;

  /** Kobalte hard-codes virtual focus on hover for a select's list. */
  shouldFocusOnHover: Accessor<boolean>;

  /** Kobalte hard-codes select-on-release for a select's list. */
  shouldSelectOnPressUp: Accessor<boolean>;

  /** Escape in the open list closes the field instead of clearing it. */
  escape: () => void;

  /** Close after a selection change (single-select fields). */
  closeOnSelection: Accessor<boolean | undefined>;

  /** Closes the field. */
  close: () => void;

  /**
   * Whether the field is open. A closed field keeps its list mounted (so
   * typeahead and the focus strategy see the collection before the first
   * open), but the hidden list must not be a Tab stop, bind keys or appear in
   * the accessibility tree (port sheet §5, third change).
   */
  isActive: Accessor<boolean>;

  /**
   * The list reports its state and focus controls. Returns the unregister
   * function, run when the list unmounts.
   */
  registerList: (
    state: ListState,
    controls: ListOwnerListControls,
  ) => () => void;
}

/** The nearest composite field driving the list below it, if any. */
export const ListOwnerContext = context<ListOwner | undefined>(undefined);
