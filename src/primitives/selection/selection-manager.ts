/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/selection/selection-manager.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/bfce84fee12a027d9cbc38b43e1747e3e4b4b169/packages/@react-stately/selection/src/SelectionManager.ts
 *
 * Adapted to NSH: the collection is an accessor, and `select` takes the pointer
 * type instead of a `PointerEvent` (NSH's press payload has no `pointerType`).
 * `getAllSelectableKeys` also steps over a key whose node vanished, which
 * Kobalte's loop did not (it could spin forever on a stale key).
 */

import type { Accessor } from "nsh";

import type { Collection, CollectionNode } from "../collection";
import {
  type DisabledBehavior,
  type MultipleSelectionManager,
  type MultipleSelectionState,
  Selection,
  type SelectionBehavior,
  type SelectionMode,
  type SelectionPointerType,
  type SelectionValue,
} from "./types";

/**
 * An interface for reading and updating multiple selection state.
 */
export class SelectionManager implements MultipleSelectionManager {
  private collection: Accessor<Collection<CollectionNode>>;
  private state: MultipleSelectionState;

  constructor(
    collection: Accessor<Collection<CollectionNode>>,
    state: MultipleSelectionState,
  ) {
    this.collection = collection;
    this.state = state;
  }

  /** The type of selection that is allowed in the collection. */
  selectionMode(): SelectionMode {
    return this.state.selectionMode();
  }

  /** Whether the collection allows empty selection. */
  disallowEmptySelection(): boolean {
    return this.state.disallowEmptySelection();
  }

  /** The selection behavior for the collection. */
  selectionBehavior(): SelectionBehavior {
    return this.state.selectionBehavior();
  }

  /** How disabled items behave. */
  disabledBehavior(): DisabledBehavior {
    return this.state.disabledBehavior();
  }

  /** Sets the selection behavior for the collection. */
  setSelectionBehavior(selectionBehavior: SelectionBehavior) {
    this.state.setSelectionBehavior(selectionBehavior);
  }

  /** Whether the collection is currently focused. */
  isFocused(): boolean {
    return this.state.isFocused();
  }

  /** Sets whether the collection is focused. */
  setFocused(isFocused: boolean) {
    this.state.setFocused(isFocused);
  }

  /**
   * The current focused key in the collection, `undefined` when its item has
   * left the collection.
   *
   * `createListState` clears the stored key in an effect, as NSH must not
   * write state while a render reads it; an effect runs after the batch, so
   * a caller that reads the key in the same turn as the data source change
   * (a press handler that deletes the focused item) would still see the old
   * key. Kobalte resets it eagerly in `createComputed`, so the read itself
   * validates the key the same way `setFocusedKey` does; the effect then
   * clears the stored value, and a re-added item does not take the focus
   * back.
   */
  focusedKey(): string | undefined {
    const key = this.state.focusedKey();

    return key != null && this.collection().getItem(key) ? key : undefined;
  }

  /** Sets the focused key. */
  setFocusedKey(key?: string) {
    if (key == null || this.collection().getItem(key)) {
      this.state.setFocusedKey(key);
    }
  }

  /**
   * The currently selected keys in the collection. The `"all"` sentinel is
   * resolved here, against the keys that can actually be selected right now
   * (new items are covered while the sentinel is in place).
   */
  selectedKeys(): Set<string> {
    const keys = this.state.selectedKeys();

    return keys === "all" ? new Set(this.getAllSelectableKeys()) : keys;
  }

  /** Returns whether a key is selected. */
  isSelected(key: string) {
    if (this.state.selectionMode() === "none") {
      return false;
    }

    const retrievedKey = this.getKey(key);

    if (retrievedKey == null) {
      return false;
    }

    return this.selectedKeys().has(retrievedKey);
  }

  /** Whether the selection is empty. */
  isEmpty(): boolean {
    return this.selectedKeys().size === 0;
  }

  /** Whether all items in the collection are selected. */
  isSelectAll(): boolean {
    if (this.isEmpty()) {
      return false;
    }

    const selectedKeys = this.selectedKeys();

    return this.getAllSelectableKeys().every((k) => selectedKeys.has(k));
  }

  firstSelectedKey(): string | undefined {
    let first: CollectionNode | undefined;

    for (const key of this.selectedKeys()) {
      const item = this.collection().getItem(key);

      const isItemBeforeFirst =
        item?.index != null && first?.index != null && item.index < first.index;

      if (!first || isItemBeforeFirst) {
        first = item;
      }
    }

    return first?.key;
  }

  lastSelectedKey(): string | undefined {
    let last: CollectionNode | undefined;

    for (const key of this.selectedKeys()) {
      const item = this.collection().getItem(key);

      const isItemAfterLast =
        item?.index != null && last?.index != null && item.index > last.index;

      if (!last || isItemAfterLast) {
        last = item;
      }
    }

    return last?.key;
  }

  /** Extends the selection to the given key. */
  extendSelection(toKey: string) {
    if (this.selectionMode() === "none") {
      return;
    }

    if (this.selectionMode() === "single") {
      this.replaceSelection(toKey);
      return;
    }

    const retrievedToKey = this.getKey(toKey);

    if (retrievedToKey == null) {
      return;
    }

    // A resolved copy: extending from the `"all"` sentinel starts with the
    // keys that can be selected now, and loses the sentinel.
    const selectedKeys = this.selectedKeys() as Selection;
    const anchorKey = selectedKeys.anchorKey || retrievedToKey;

    const selection = new Selection(selectedKeys, anchorKey, retrievedToKey);

    for (const key of this.getKeyRange(
      anchorKey,
      selectedKeys.currentKey || retrievedToKey,
    )) {
      selection.delete(key);
    }

    for (const key of this.getKeyRange(retrievedToKey, anchorKey)) {
      if (this.canSelectItem(key)) {
        selection.add(key);
      }
    }

    this.state.setSelectedKeys(selection);
  }

  private getKeyRange(from: string, to: string) {
    const fromItem = this.collection().getItem(from);
    const toItem = this.collection().getItem(to);

    if (fromItem && toItem) {
      if (
        fromItem.index != null &&
        toItem.index != null &&
        fromItem.index <= toItem.index
      ) {
        return this.getKeyRangeInternal(from, to);
      }

      return this.getKeyRangeInternal(to, from);
    }

    return [];
  }

  private getKeyRangeInternal(from: string, to: string) {
    const keys: string[] = [];
    let key: string | undefined = from;

    while (key != null) {
      const item = this.collection().getItem(key);

      if (item && item.type === "item") {
        keys.push(key);
      }

      if (key === to) {
        return keys;
      }

      key = this.collection().getKeyAfter(key);
    }

    return [];
  }

  private getKey(key: string) {
    const item = this.collection().getItem(key);

    if (!item) {
      return key;
    }

    if (item.type !== "item") {
      return null;
    }

    return item.key;
  }

  /** Toggles whether the given key is selected. */
  toggleSelection(key: string) {
    if (this.selectionMode() === "none") {
      return;
    }

    if (this.selectionMode() === "single" && !this.isSelected(key)) {
      this.replaceSelection(key);
      return;
    }

    const retrievedKey = this.getKey(key);

    if (retrievedKey == null) {
      return;
    }

    const keys = new Selection(this.selectedKeys());

    if (keys.has(retrievedKey)) {
      keys.delete(retrievedKey);
    } else if (this.canSelectItem(retrievedKey)) {
      keys.add(retrievedKey);
      keys.anchorKey = retrievedKey;
      keys.currentKey = retrievedKey;
    }

    if (this.disallowEmptySelection() && keys.size === 0) {
      return;
    }

    this.state.setSelectedKeys(keys);
  }

  /** Replaces the selection with only the given key. */
  replaceSelection(key: string) {
    if (this.selectionMode() === "none") {
      return;
    }

    const retrievedKey = this.getKey(key);

    if (retrievedKey == null) {
      return;
    }

    const selection = this.canSelectItem(retrievedKey)
      ? new Selection([retrievedKey], retrievedKey, retrievedKey)
      : new Selection();

    this.state.setSelectedKeys(selection);
  }

  /** Replaces the selection with the given keys, or with every selectable key for `"all"`. */
  setSelectedKeys(keys: SelectionValue) {
    if (this.selectionMode() === "none") {
      return;
    }

    // Keep the sentinel: a later item is selected too, as in React Aria.
    if (keys === "all") {
      this.state.setSelectedKeys("all");
      return;
    }

    const selection = new Selection();

    for (const key of keys) {
      const retrievedKey = this.getKey(key);

      if (retrievedKey != null) {
        selection.add(retrievedKey);

        if (this.selectionMode() === "single") {
          break;
        }
      }
    }

    this.state.setSelectedKeys(selection);
  }

  /** Selects all items in the collection. */
  selectAll() {
    if (this.selectionMode() === "multiple") {
      this.state.setSelectedKeys("all");
    }
  }

  /**
   * Removes all keys from the selection.
   */
  clearSelection() {
    const selectedKeys = this.selectedKeys();

    if (!this.disallowEmptySelection() && selectedKeys.size > 0) {
      this.state.setSelectedKeys(new Selection());
    }
  }

  /**
   * Toggles between select all and an empty selection.
   */
  toggleSelectAll() {
    if (this.isSelectAll()) {
      this.clearSelection();
    } else {
      this.selectAll();
    }
  }

  select(key: string, pointerType?: SelectionPointerType) {
    if (this.selectionMode() === "none") {
      return;
    }

    if (this.selectionMode() === "single") {
      if (this.isSelected(key) && !this.disallowEmptySelection()) {
        this.toggleSelection(key);
      } else {
        this.replaceSelection(key);
      }
    } else if (this.selectionBehavior() === "toggle" || pointerType === "touch") {
      // If touch then we just want to toggle, otherwise it's impossible to
      // multi select because touch has no modifier keys.
      this.toggleSelection(key);
    } else {
      this.replaceSelection(key);
    }
  }

  /** Returns whether the current selection is equal to the given selection. */
  isSelectionEqual(selection: Set<string>) {
    if (selection === this.selectedKeys()) {
      return true;
    }

    // Check if the set of keys match.
    const selectedKeys = this.selectedKeys();
    if (selection.size !== selectedKeys.size) {
      return false;
    }

    for (const key of selection) {
      if (!selectedKeys.has(key)) {
        return false;
      }
    }

    for (const key of selectedKeys) {
      if (!selection.has(key)) {
        return false;
      }
    }

    return true;
  }

  canSelectItem(key: string) {
    if (this.state.selectionMode() === "none") {
      return false;
    }

    // A disabled item is never selectable, whichever `disabledBehavior` says
    // about its focus and action.
    const item = this.collection().getItem(key);

    return item != null && item.type === "item" && !item.disabled;
  }

  /**
   * Whether the item is inert: no press, no focus, no action, and keyboard
   * navigation steps over it. With `disabledBehavior: "selection"` a disabled
   * item is not inert (it stays focusable); `canSelectItem` still refuses it.
   */
  isDisabled(key: string) {
    if (this.state.disabledBehavior() === "selection") {
      return false;
    }

    const item = this.collection().getItem(key);

    return !item || item.disabled;
  }

  private getAllSelectableKeys() {
    const keys: string[] = [];
    let key = this.collection().getFirstKey();

    while (key != null) {
      if (this.canSelectItem(key)) {
        const item = this.collection().getItem(key);

        if (item?.type === "item") {
          keys.push(key);
        }
      }

      key = this.collection().getKeyAfter(key);
    }

    return keys;
  }
}
