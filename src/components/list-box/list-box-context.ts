import type { Accessor, Bounds, PressEvent, ViewRef } from "nsh";
import { context } from "nsh";

import type {
  ListState,
  SelectionBehavior,
  SelectionManager,
  SelectionMode,
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

  /** Whether the option is disabled (its own `isDisabled` or `disabledKeys`). */
  disabled: () => boolean;

  /** The row view, for the screen reader focus that follows `focusedKey`. */
  ref: () => ViewRef | undefined;

  /**
   * The one activation entry: a pointer press, Return / Space on the focused
   * root, and the Windows key binding all arrive here. It selects when the
   * primitive allows it, otherwise reports the action (port sheet section 5).
   */
  activate: (source: "pointer" | "keyboard", event?: PressEvent) => void;
}

/** One registered group; `children` lets the collection expand the hierarchy. */
export interface ListBoxSectionDescriptor {
  type: "section";

  /** The group key, derived like an item's. */
  key: string;

  /** The group name; only `aria-label` can supply it (port sheet section 5). */
  textValue: () => string;

  /** The options registered inside this section. */
  children: () => readonly ListBoxItemDescriptor[];
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

  /** Records a pointer interaction on the root's modality tracker. */
  notePointer: () => void;

  /** The item held down from the keyboard (Return / Space), for R-013. */
  keyboardPressedKey: Accessor<string | undefined>;

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
 */
export interface CollectionItemContextValue {
  value: any;

  index: number;
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
