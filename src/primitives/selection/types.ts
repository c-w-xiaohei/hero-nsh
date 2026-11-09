/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/selection/types.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/bfce84fee12a027d9cbc38b43e1747e3e4b4b169/packages/@react-stately/selection/src/Selection.ts
 * https://github.com/adobe/react-spectrum/blob/bfce84fee12a027d9cbc38b43e1747e3e4b4b169/packages/@react-stately/selection/src/types.ts
 * https://github.com/adobe/react-spectrum/blob/bfce84fee12a027d9cbc38b43e1747e3e4b4b169/packages/@react-types/shared/src/selection.d.ts
 *
 * Adapted to NSH: `MaybeAccessor` fields became plain accessors, and the
 * modifier payloads are the four flags NSH can report (a press event's
 * `modifiers`, or the flags a component passes with a key command).
 */

import type { Accessor } from "nsh";

export type SelectionMode = "none" | "single" | "multiple";
export type SelectionBehavior = "toggle" | "replace";
export type FocusStrategy = "first" | "last";

/**
 * The modifier keys that change what a press or a key does. It is the shape of
 * NSH's own `Modifiers`, with every field optional because a key command may
 * pass only the modifiers it bound.
 */
export interface SelectionModifiers {
  /** Control on every platform (`ctrl` in a keystroke). */
  control?: boolean;

  /** Option / Alt. */
  alt?: boolean;

  shift?: boolean;

  /** Command on Apple platforms, the Windows / Super key elsewhere (`mod`). */
  platform?: boolean;
}

/** How an item was pressed, when the owner knows: a touch press toggles in multiple mode. */
export type SelectionPointerType = "mouse" | "touch" | "pen" | null | undefined;

/** Locale-aware comparison used by typeahead and by collection ordering helpers. */
export interface StringCollator {
  /** Negative, zero or positive, as `Intl.Collator#compare`. */
  compare(a: string, b: string): number;
}

export interface SingleSelection {
  /** Whether the collection allows empty selection. */
  disallowEmptySelection?: Accessor<boolean | undefined>;

  /** The currently selected key in the collection (controlled). */
  selectedKey?: Accessor<string | undefined>;

  /** The initial selected key in the collection (uncontrolled). */
  defaultSelectedKey?: Accessor<string | undefined>;

  /** Handler that is called when the selection changes. */
  onSelectionChange?: (key: string) => void;
}

export interface MultipleSelection {
  /** The type of selection that is allowed in the collection. */
  selectionMode?: Accessor<SelectionMode | undefined>;

  /** Whether the collection allows empty selection. */
  disallowEmptySelection?: Accessor<boolean | undefined>;

  /** The currently selected keys in the collection (controlled). */
  selectedKeys?: Accessor<Iterable<string> | undefined>;

  /** The initial selected keys in the collection (uncontrolled). */
  defaultSelectedKeys?: Accessor<Iterable<string> | undefined>;

  /** Handler that is called when the selection changes. */
  onSelectionChange?: (keys: Set<string>) => void;
}

/**
 * A Selection is a special Set containing keys, which also has an anchor
 * and current selected key for use when range selecting.
 */
export class Selection extends Set<string> {
  anchorKey?: string;
  currentKey?: string;

  constructor(
    keys?: Iterable<string> | Selection,
    anchorKey?: string,
    currentKey?: string,
  ) {
    super(keys);
    if (keys instanceof Selection) {
      this.anchorKey = anchorKey || keys.anchorKey;
      this.currentKey = currentKey || keys.currentKey;
    } else {
      this.anchorKey = anchorKey;
      this.currentKey = currentKey;
    }
  }
}

export interface FocusState {
  /** Whether the collection is currently focused. */
  isFocused: Accessor<boolean>;

  /** The current focused key in the collection. */
  focusedKey: Accessor<string | undefined>;

  /** Sets whether the collection is focused. */
  setFocused(isFocused: boolean): void;

  /** Sets the focused key. */
  setFocusedKey(key?: string): void;
}

export interface SingleSelectionState extends FocusState {
  /** Whether the collection allows empty selection. */
  disallowEmptySelection: Accessor<boolean | undefined>;

  /** The currently selected key in the collection. */
  selectedKey: Accessor<string>;

  /** Sets the selected key in the collection. */
  setSelectedKey: (key: string) => void;
}

export interface MultipleSelectionState extends FocusState {
  /** The type of selection that is allowed in the collection. */
  selectionMode: Accessor<SelectionMode>;

  /** The selection behavior for the collection. */
  selectionBehavior: Accessor<SelectionBehavior>;

  /** Sets the selection behavior for the collection. */
  setSelectionBehavior(selectionBehavior: SelectionBehavior): void;

  /** Whether the collection allows empty selection. */
  disallowEmptySelection: Accessor<boolean>;

  /** The currently selected keys in the collection. */
  selectedKeys: Accessor<Set<string>>;

  /** Sets the selected keys in the collection. */
  setSelectedKeys(keys: Set<string>): void;
}

export interface MultipleSelectionManager extends FocusState {
  /** The type of selection that is allowed in the collection. */
  selectionMode(): SelectionMode;

  /** The selection behavior for the collection. */
  selectionBehavior(): SelectionBehavior;

  /** Whether the collection allows empty selection. */
  disallowEmptySelection(): boolean | undefined;

  /** The currently selected keys in the collection. */
  selectedKeys(): Set<string>;

  /** Whether the selection is empty. */
  isEmpty(): boolean;

  /** Whether all items in the collection are selected. */
  isSelectAll(): boolean;

  /** The first selected key in the collection. */
  firstSelectedKey(): string | undefined;

  /** The last selected key in the collection. */
  lastSelectedKey(): string | undefined;

  /** Returns whether a key is selected. */
  isSelected(key: string): boolean;

  /** Returns whether the current selection is equal to the given selection. */
  isSelectionEqual(selection: Set<string>): boolean;

  /** Extends the selection to the given key. */
  extendSelection(toKey: string): void;

  /** Toggles whether the given key is selected. */
  toggleSelection(key: string): void;

  /** Replaces the selection with only the given key. */
  replaceSelection(key: string): void;

  /** Replaces the selection with the given keys. */
  setSelectedKeys(keys: Iterable<string>): void;

  /** Selects all items in the collection. */
  selectAll(): void;

  /** Removes all keys from the selection. */
  clearSelection(): void;

  /** Toggles between select all and an empty selection. */
  toggleSelectAll(): void;

  /**
   * Toggles, replaces, or extends selection to the given key depending
   * on the pointer type and the collection's selection mode.
   *
   * Kobalte takes a `PointerEvent` here; NSH's press payload has no
   * `pointerType`, so the caller says what pressed the item instead.
   */
  select(key: string, pointerType?: SelectionPointerType): void;

  /** Returns whether the given key can be selected. */
  canSelectItem(key: string): boolean;

  /** Returns whether the given key is non-interactive. */
  isDisabled(key: string): boolean;

  /** Sets the selection behavior for the collection. */
  setSelectionBehavior(selectionBehavior: SelectionBehavior): void;
}

export interface KeyboardDelegate {
  /** Returns the key visually below the given one, or `undefined` for none. */
  getKeyBelow?: (key: string) => string | undefined;

  /** Returns the key visually above the given one, or `undefined` for none. */
  getKeyAbove?: (key: string) => string | undefined;

  /** Returns the key visually to the left of the given one, or `undefined` for none. */
  getKeyLeftOf?: (key: string) => string | undefined;

  /** Returns the key visually to the right of the given one, or `undefined` for none. */
  getKeyRightOf?: (key: string) => string | undefined;

  /** Returns the key visually one page below the given one, or `undefined` for none. */
  getKeyPageBelow?: (key: string) => string | undefined;

  /** Returns the key visually one page above the given one, or `undefined` for none. */
  getKeyPageAbove?: (key: string) => string | undefined;

  /** Returns the first key, or `undefined` for none. */
  getFirstKey?: (key?: string, global?: boolean) => string | undefined;

  /** Returns the last key, or `undefined` for none. */
  getLastKey?: (key?: string, global?: boolean) => string | undefined;

  /** Returns the next key after `fromKey` that matches the given search string, or `undefined` for none. */
  getKeyForSearch?: (search: string, fromKey?: string) => string | undefined;
}
