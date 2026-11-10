import type { Accessor, Bounds, JSX, PressEvent, ViewRef } from "nsh";
import { context } from "nsh";

import type {
  ListState,
  SelectionBehavior,
  SelectionManager,
  SelectionMode,
  SelectionModifiers,
} from "../../primitives";
import type { ListBoxItemRenderProps } from "./list-box-item";

/**
 * One registered option, as the Item hands it to the Root. The Root turns this
 * registry into the `dataSource` of `createListState` (port sheet section 2):
 * the algorithm is the primitive's, only the collection source is ours, since
 * HeroUI's options are caller-written parts rather than an `options` array.
 */
export interface ListBoxItemDescriptor {
  type: "item";

  /** The collection key; `id` is an identity value, read once. */
  key: string;

  /** Typeahead text, read when the collection is rebuilt. */
  textValue: () => string;

  /**
   * The row's position in a dynamic collection (its `index` accessor, which
   * follows a row that moves). Parts register in creation order, so a
   * reordered `items` list is put back into data order by sorting on this
   * before the collection is built. Static children have no order and keep
   * the order their components were written in.
   */
  order?: () => number;

  /** Whether the option is disabled (its own `isDisabled` or `disabledKeys`). */
  disabled: () => boolean;

  /** The row view, for the screen reader focus that follows `focusedKey`. */
  ref: () => ViewRef | undefined;

  /**
   * The row's rendered children, for a container that renders the selected
   * option outside the list (Select.Value). HeroUI's `Select.Value` renders the
   * selected item's `children` again; the value cannot reach the JSX the
   * caller wrote, so the row shares the one element tree it built (port sheet
   * §5, fifth change). Reading it never reads `props.children` again.
   */
  children?: () => JSX.Element | undefined;

  /**
   * The one activation entry: a pointer press, Return / Space on the focused
   * root, and the Windows key binding all arrive here. It selects when the
   * primitive allows it, otherwise reports the action (port sheet section 5).
   * `modifiers` carries what the keystroke was pressed with (Shift, Control,
   * Command), so a keymap binding keeps React Aria's extend / toggle rules.
   */
  activate: (
    source: "pointer" | "keyboard",
    event?: PressEvent,
    modifiers?: SelectionModifiers,
  ) => void;
}

/** One registered group; `children` lets the collection expand the hierarchy. */
export interface ListBoxSectionDescriptor {
  type: "section";

  /** The group key, derived like an item's. */
  key: string;

  /** The group name; only `aria-label` can supply it (port sheet section 5). */
  textValue: () => string;

  /** The group's position in a dynamic collection, as an item's `order`. */
  order?: () => number;

  /** The options registered inside this section. */
  children: () => readonly ListBoxItemDescriptor[];
}

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

export type ListBoxDescriptor = ListBoxItemDescriptor | ListBoxSectionDescriptor;

/** What a ListBox root provides to every Item, Section and Indicator. */
export interface ListBoxContextValue {
  /** The list state: collection plus selection manager. */
  list: ListState;

  /** Read directly by the item primitive. */
  selectionManager: Accessor<SelectionManager>;

  /** Registers one option or group; the returned function unregisters it. */
  register: (descriptor: ListBoxDescriptor) => () => void;

  selectionMode: Accessor<SelectionMode>;

  selectionBehavior: Accessor<SelectionBehavior>;

  /** Whether the root view holds the keyboard focus (port sheet section 2). */
  isFocused: Accessor<boolean>;

  focusedKey: Accessor<string | undefined>;

  /** Whether the last interaction was the keyboard (focus ring only). */
  isKeyboard: Accessor<boolean>;

  shouldFocusOnHover: Accessor<boolean>;

  shouldSelectOnPressUp: Accessor<boolean>;

  orientation: Accessor<"vertical" | "horizontal">;

  layout: Accessor<"stack" | "grid">;

  /** Whether `disabledKeys` names this key. */
  isDisabledKey: (key: string) => boolean;

  /** The root's `onAction`, with no item action to take precedence. */
  onAction: (key: string) => void;

  /** Focuses the root: the one Tab stop (macOS / web). */
  focusRoot: () => void;

  /**
   * Focuses the root from a pointer press. The focus event that follows is not
   * keyboard focus, so the root keeps the pointer modality (no focus ring);
   * it is the port's stand-in for `:focus-visible` on a click-focused list.
   */
  focusRootFromPointer: () => void;

  /** A fresh, non-empty key for a static Section that was given no `id`. */
  createSectionKey: () => string;

  /** Records a pointer interaction on the root's modality tracker. */
  notePointer: () => void;

  /** The item held down from the keyboard (Return / Space), for R-013. */
  keyboardPressedKey: Accessor<string | undefined>;

  /**
   * The keys the current filter lets through, or `undefined` when nothing is
   * filtered. A row whose key is outside the set is `hidden` but stays mounted
   * and registered, so a changed filter brings it back (port sheet §5, third
   * change; ComboBox's `displayedCollection`).
   */
  visibleKeys: Accessor<ReadonlySet<string> | undefined>;

  registerItemLayout: (key: string, bounds: Bounds, sectionKey?: string) => void;

  unregisterItemLayout: (key: string) => void;

  registerSectionLayout: (key: string, bounds: Bounds) => void;

  unregisterSectionLayout: (key: string) => void;
}

export const ListBoxContext = context<ListBoxContextValue | undefined>(undefined);

/** What a Section provides to the options it contains. */
export interface ListBoxSectionContextValue {
  /** The group's collection key, used for layout composition. */
  key: string;

  /** Registers an option inside this group instead of at the root. */
  register: (descriptor: ListBoxItemDescriptor) => () => void;
}

export const ListBoxSectionContext = context<
  ListBoxSectionContextValue | undefined
>(undefined);

/**
 * The current entry of a dynamic collection (`items` + a function child), as
 * React Aria's `CollectionItem` node provides it. The Item derives its key and
 * value from it when its own props omit them
 * (`react-aria-components/src/ListBox.tsx:513`, `:519-521`).
 *
 * Both members are the `<Each>` row's accessors, not snapshots: a keyed row
 * that moves keeps its item and gets a new index, and a positional row keeps
 * its place and gets a new item. Reading them where the value is needed (the
 * key, the descriptor's order) keeps the collection in step.
 */
export interface CollectionItemContextValue {
  value: Accessor<any>;

  index: Accessor<number>;
}

export const CollectionItemContext = context<
  CollectionItemContextValue | undefined
>(undefined);

/** What an Item provides to its Indicator. */
export interface ListBoxItemContextValue {
  state: ListBoxItemRenderProps;

  variant: Accessor<"default" | "danger">;

  /** The indicator reports its presence, so the row gains `pe-7` (R-010). */
  registerIndicator: () => () => void;
}

export const ListBoxItemContext = context<
  ListBoxItemContextValue | undefined
>(undefined);

/**
 * What a container around the list tells it, replacing HeroUI's descendant
 * selectors from the popover to the listbox and its rows (port sheet §5,
 * second change). Every member is optional: a ListBox with no container keeps
 * exactly its own classes, its own indicators and its own accessible name.
 */
export interface ListBoxContainerContextValue {
  /**
   * R-042: appended after the list's base classes, before the caller's. The
   * Select popover tightens the padding (`p-1.5` over `p-1`).
   */
  listClass?: () => string | undefined;

  /**
   * R-043: appended after a row's base classes, before the caller's. The
   * `classList` classes of the row (the indicator's `pe-7`, R-044) come after,
   * so the row's reserved room still wins.
   */
  itemClass?: () => string | undefined;

  /**
   * R-045: a single-select popover disables the indicator's transition, as
   * `.select__popover [data-slot="list-box"]:not([aria-multiselectable]) …`
   * does upstream.
   */
  suppressIndicatorTransition?: () => boolean;

  /**
   * R-020: the indicator is not drawn inside a copy of a row (Select.Value
   * hides the checkmark it inherited from the option).
   */
  itemIndicatorSuppressed?: () => boolean;

  /**
   * The list's accessible name, when the container has one. Upstream the
   * popover points the listbox at the field's label with
   * `aria-labelledby`; NSH has no cross-element references, so the container
   * hands the name down.
   */
  accessibilityLabel?: () => string | undefined;
}

export const ListBoxContainerContext = context<
  ListBoxContainerContextValue | undefined
>(undefined);

