import type { Accessor, Bounds, JSX, PressEvent, ViewRef } from "nsh";
import { context } from "nsh";

import type {
  ListState,
  SelectionBehavior,
  SelectionManager,
  SelectionMode,
  SelectionModifiers,
} from "../../primitives";
import type { MenuItemRenderProps } from "./menu-item";

/**
 * One registered menu entry, as the Item hands it to the nearest owner. The
 * root turns this registry into the `dataSource` of `createListState` (port
 * sheet section 2): the algorithm is the primitive's, only the collection
 * source is ours, since HeroUI's entries are caller-written parts.
 */
export interface MenuItemDescriptor {
  type: "item";

  /** The collection key; `id` is an identity value, read once. */
  key: string;

  /** Typeahead text and the accessible-name fallback, read when the collection is rebuilt. */
  textValue: () => string;

  /**
   * The row's position in a dynamic collection (its `index` accessor, which
   * follows a row that moves). Parts register in creation order, so a
   * reordered `items` list is put back into data order by sorting on this
   * before the collection is built. Static children keep the order their
   * components were written in.
   */
  order?: () => number;

  /** Whether the entry is disabled (its own `isDisabled` or the root's `disabledKeys`). */
  disabled: () => boolean;

  /** The row view, for the screen reader focus that follows `focusedKey`. */
  ref: () => ViewRef | undefined;

  /**
   * The one activation entry: a pointer press, Return / Space on the focused
   * root, and the Windows key binding all arrive here. It runs the selection
   * half, then the action half, then the close decision (port sheet section 5).
   * `keyName` names the activating key where the channel exposes it (the
   * Windows bindings); a host press carries no key identity.
   */
  activate: (
    source: "pointer" | "keyboard",
    event?: PressEvent,
    modifiers?: SelectionModifiers,
    keyName?: MenuActivationKey,
  ) => void;
}

/** One registered group; `children` lets the collection expand the hierarchy. */
export interface MenuSectionDescriptor {
  type: "section";

  /** The group key, derived like an entry's. */
  key: string;

  /** The group name; only `aria-label` can supply it (port sheet section 5). */
  textValue: () => string;

  /** The group's position in a dynamic collection, as an entry's `order`. */
  order?: () => number;

  /** The entries registered inside this section. */
  children: () => readonly MenuItemDescriptor[];
}

/** The activating key, when the channel reports it: React Aria's close rule reads it. */
export type MenuActivationKey = "Enter" | "Space";

/**
 * Put a registry back into rendered order: a dynamic row's `order` is its
 * `index` accessor, which `<Each>` keeps current when a keyed row moves; a
 * static part has none and stays where it was written (its registration
 * sequence). Reading `order()` here subscribes the caller, so the collection is
 * rebuilt when `items` is reordered.
 */
export function sortByRenderedOrder<T extends { order?: () => number }>(
  descriptors: readonly T[],
): T[] {
  return descriptors
    .map((descriptor, sequence) => ({
      descriptor,
      sequence,
      order: descriptor.order?.(),
    }))
    .sort((a, b) =>
      a.order != null && b.order != null ? a.order - b.order : a.sequence - b.sequence,
    )
    .map((entry) => entry.descriptor);
}

export type MenuDescriptor = MenuItemDescriptor | MenuSectionDescriptor;

/** What a Menu root provides to every Item, Section and Indicator. */
export interface MenuContextValue {
  /** The menu state: collection plus root selection manager. */
  list: ListState;

  /** Read directly by the item primitive (focus and the root selection). */
  selectionManager: Accessor<SelectionManager>;

  /** Registers one entry or group; the returned function unregisters it. */
  register: (descriptor: MenuDescriptor) => () => void;

  selectionMode: Accessor<SelectionMode>;

  selectionBehavior: Accessor<SelectionBehavior>;

  /** Whether the root view holds the keyboard focus (port sheet section 2). */
  isFocused: Accessor<boolean>;

  focusedKey: Accessor<string | undefined>;

  /** Whether the last interaction was the keyboard (focus ring only). */
  isKeyboard: Accessor<boolean>;

  /** Whether `disabledKeys` names this key. */
  isDisabledKey: (key: string) => boolean;

  /** The root's `onAction`, called after the item's own (port sheet section 5). */
  onAction: (key: string) => void;

  /** The close channel: `shouldCloseOnSelect` or Escape decided to close (section 1). */
  onClose: () => void;

  /** The root-level explicit override, read last in the Item → Section → Menu order. */
  shouldCloseOnSelect: Accessor<boolean | undefined>;

  /** Focuses the root: the one Tab stop (macOS / web). */
  focusRoot: () => void;

  /**
   * Focuses the root from a pointer press. The focus event that follows is not
   * keyboard focus, so the root keeps the pointer modality (no focus ring).
   */
  focusRootFromPointer: () => void;

  /** A fresh, non-empty key for a static Section that was given no `id`. */
  createSectionKey: () => string;

  /**
   * A fresh, non-empty key for a static entry that was given no `id`, `value`
   * or index (React Aria's auto key, `react-aria/dist/private/collections/
   * Document.js`).
   */
  createItemKey: () => string;

  /** Records a pointer interaction on the root's modality tracker. */
  notePointer: () => void;

  /** The entry held down from the keyboard (Return / Space), for R-014. */
  keyboardPressedKey: Accessor<string | undefined>;

  registerItemLayout: (key: string, bounds: Bounds, sectionKey?: string) => void;

  unregisterItemLayout: (key: string) => void;

  registerSectionLayout: (key: string, bounds: Bounds) => void;

  unregisterSectionLayout: (key: string) => void;
}

export const MenuContext = context<MenuContextValue | undefined>(undefined);

/** What a Section provides to the entries it contains. */
export interface MenuSectionContextValue {
  /** The group's collection key, used for layout composition. */
  key: string;

  /** Registers an entry inside this group instead of at the root. */
  register: (descriptor: MenuItemDescriptor) => () => void;

  /**
   * The selection manager the entries inside use: the group's own manager when
   * the Section declared a `selectionMode` (RAC's `GroupSelectionManager`),
   * otherwise the root's. Focus methods always resolve to the root.
   */
  selectionManager: Accessor<SelectionManager>;

  /** The Section-level explicit override, read before the root's (section 1). */
  shouldCloseOnSelect: Accessor<boolean | undefined>;
}

export const MenuSectionContext = context<
  MenuSectionContextValue | undefined
>(undefined);

/**
 * The current entry of a dynamic collection (`items` + a function child), as
 * React Aria's `CollectionItem` node provides it. Both members stay accessors:
 * a keyed row that moves keeps its item and gets a new index, and a positional
 * row keeps its place and gets a new item.
 */
export interface CollectionItemContextValue {
  value: Accessor<any>;

  index: Accessor<number>;
}

export const CollectionItemContext = context<
  CollectionItemContextValue | undefined
>(undefined);

/** What an Item provides to its two indicator slots. */
export interface MenuItemContextValue {
  state: MenuItemRenderProps;

  variant: Accessor<"default" | "danger">;

  /** The start-side indicator reports its presence, so the row gains `ps-7` (R-010). */
  registerIndicator: () => () => void;

  /** The submenu chevron reports its presence, so the row gains `pe-7` (R-011). */
  registerSubmenuIndicator: () => () => void;
}

export const MenuItemContext = context<
  MenuItemContextValue | undefined
>(undefined);
