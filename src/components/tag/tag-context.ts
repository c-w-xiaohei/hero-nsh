import type { Accessor, PressEvent, ViewRef } from "nsh";
import { context } from "nsh";

import type {
  ListState,
  SelectionBehavior,
  SelectionManager,
  SelectionMode,
} from "../../primitives";
import { tagVariants } from "./tag.styles";
import type { TagSize, TagVariant } from "./tag.styles";

/**
 * One registered tag, as the row hands it to the group (research 4.2). The
 * group turns this registry into the `dataSource` of `createListState`: the
 * algorithms are the primitive's, only the collection source is ours, since
 * HeroUI's tags are caller-written parts rather than a data array.
 */
export interface TagDescriptor {
  type: "item";

  /** The collection key; `id` is an identity value, read once. */
  key: string;

  /** Typeahead text and the accessible name, read when the collection is rebuilt. */
  textValue: () => string;

  /**
   * The row's position in a dynamic collection (its `<Each>` index accessor,
   * which follows a row that moves). Parts register in creation order, so a
   * reordered `items` list is put back into data order by sorting on this
   * before the collection is built. Static children have no order and keep the
   * order their components were written in.
   */
  order?: () => number;

  /** Whether the tag is disabled (its own `isDisabled` or the group's `disabledKeys`). */
  disabled: () => boolean;

  /** The row view, for the screen-reader focus that follows `focusedKey`. */
  ref: () => ViewRef | undefined;

  /**
   * The row's press lifecycle replayed from a keyboard press the list receives
   * (Return / Space): the row is never focusable, so the list is the only view
   * that gets that press, while upstream's `rowProps` carry the handlers for
   * pointer and keyboard alike. The last phase activates the tag (RAC's
   * primary / secondary action rule).
   */
  keyboardPress: (phase: "start" | "up" | "press", event: PressEvent) => void;
}

/** The current entry of a dynamic collection (`items` + a function child). */
export interface TagItemContextValue {
  /** The `<Each>` row's index accessor, read for the descriptor's `order`. */
  index: Accessor<number>;
}

export const TagItemContext = context<TagItemContextValue | undefined>(undefined);

/**
 * What `TagGroup.Root` provides to `TagGroup.List` and every `Tag`. HeroUI's
 * own `TagGroupContext` carries only `{slots, size, variant}`; the same name
 * here also carries the list state, the registry and the removal callback,
 * because a `Tag` has to share one state with its siblings rather than build a
 * second one (port sheet §1.2, registered in §8).
 */
export interface TagGroupContextValue {
  /** The list state: collection plus selection manager. */
  list: ListState;

  /** Read directly by the item primitive. */
  selectionManager: Accessor<SelectionManager>;

  /** `"none"` by default, as React Aria's TagGroup. */
  selectionMode: Accessor<SelectionMode>;

  /** `"toggle"` by default. */
  selectionBehavior: Accessor<SelectionBehavior>;

  /** `false` by default: a pointer press selects on press down. */
  shouldSelectOnPressUp: Accessor<boolean>;

  /** `"clearSelection"` by default; `"none"` leaves Escape alone. */
  escapeKeyBehavior: Accessor<"clearSelection" | "none">;

  /** `TagVariants["size"]`; the group only passes it down. */
  size: Accessor<TagSize | undefined>;

  /** `TagVariants["variant"]`; the group only passes it down. */
  variant: Accessor<TagVariant | undefined>;

  /** Whether the list view holds the keyboard focus. */
  isFocused: Accessor<boolean>;

  /** Whether the last interaction was the keyboard (focus ring only). */
  isKeyboard: Accessor<boolean>;

  /** The row that holds the virtual focus. */
  focusedKey: Accessor<string | undefined>;

  /** Registers one tag; the returned function unregisters it. */
  register: (descriptor: TagDescriptor) => () => void;

  /** Whether `disabledKeys` names this key. */
  isDisabledKey: (key: string) => boolean;

  /** Whether the last selected tag can be deselected again. */
  disallowEmptySelection: Accessor<boolean>;

  /** Whether the group has an `onRemove` (RAC's `allowsRemoving`). */
  allowsRemoving: Accessor<boolean>;

  /** The delete gesture: a tag's key set through the group's `onRemove`. */
  removeKeys: (key: string) => void;

  /** A remove button's own press: only that tag's key (RAC's `useTag`). */
  removeTag: (key: string) => void;

  /** Reports a tag's action to the group's `onAction`. */
  fireAction: (key: string) => void;

  /** Whether the group has an `onAction` (a tag's action falls back to it). */
  hasGroupAction: Accessor<boolean>;

  /** Runs the root's public `onFocus` (the grid holds the real focus). */
  notifyRootFocus: () => void;

  /** Runs the root's public `onBlur` (the grid holds the real focus). */
  notifyRootBlur: () => void;

  /** A fresh, non-empty key for a tag that was given no `id`. */
  createKey: () => string;

  /** The registered tag holding `key`, if any. */
  findDescriptor: (key: string) => TagDescriptor | undefined;

  /**
   * Moves the keyboard focus to the list view. Registered by `TagGroup.List`,
   * which owns the only Tab stop: a row press calls it so the arrows keep
   * working afterwards (macOS / web).
   */
  focusList: (fromPointer: boolean) => void;

  /** Registers the list's focus entry points; the returned function clears them. */
  registerFocusTarget: (target: {
    focus: () => void;
    focusFromPointer: () => void;
  }) => () => void;

  /** Records the list taking keyboard focus (or focus from a press). */
  noteFocus: (fromPointer: boolean) => void;

  /** Records the list losing focus. */
  noteBlur: () => void;

  /** Records a pointer interaction on the modality tracker. */
  notePointer: () => void;

  /** Records a keyboard interaction on the modality tracker. */
  noteKeyboard: () => void;

  /** The tag held down from the keyboard (Return / Space), for `isPressed`. */
  keyboardPressedKey: {
    (): string | undefined;
    set(value: string | undefined): void;
  };

  /** The text a `Label` inside the group registered, for the grid's name. */
  labelText: Accessor<string | undefined>;

  /** The text a `Description` inside the group registered, for the hint. */
  descriptionText: Accessor<string | undefined>;

  /** The text an `ErrorMessage` inside the group registered, for the hint. */
  errorText: Accessor<string | undefined>;

  /** The root's `aria-label` / `accessibilityLabel`, as the grid's name. */
  accessibilityLabel: Accessor<string | undefined>;
}

export const TagGroupContext = context<TagGroupContextValue | undefined>(
  undefined,
);

/**
 * What a `Tag` provides to its `Tag.RemoveButton` (port sheet §1.1): the
 * computed slot classes, the row's text and disabled state, and the
 * registration a caller-written remove button makes so the tag does not append
 * its own default one.
 */
export interface TagContextValue {
  /** `tagVariants({ size, variant })`, read by the remove button's slot. */
  slots: Accessor<ReturnType<typeof tagVariants>>;

  /** The remove button's classes: the slot plus the row's foreground color. */
  removeButtonClass: Accessor<string>;

  /** The row's accessible text (`textValue` or the first string child). */
  textValue: Accessor<string | undefined>;

  /** The row's effective disabled state. */
  isDisabled: Accessor<boolean>;

  /** The row's collection key. */
  key: string;

  /** A caller-written remove button reports itself; the default one steps aside. */
  registerRemoveButton: () => () => void;
}

export const TagContext = context<TagContextValue | undefined>(undefined);

/**
 * Put a registry back into rendered order: a dynamic row's `order` is its
 * `<Each>` index accessor, which stays current when a keyed row moves; a
 * static part has none and stays where it was written (its registration
 * sequence). Reading `order()` here subscribes the caller, so the collection
 * is rebuilt when `items` is reordered.
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
      a.order != null && b.order != null
        ? a.order - b.order
        : a.sequence - b.sequence,
    )
    .map((entry) => entry.descriptor);
}

/** The tag holding `key`, if the registry has it. */
export function findTagDescriptor(
  descriptors: readonly TagDescriptor[],
  key: string,
): TagDescriptor | undefined {
  return descriptors.find((descriptor) => descriptor.key === key);
}
