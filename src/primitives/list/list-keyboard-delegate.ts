/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/list/list-keyboard-delegate.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/8f2f2acb3d5850382ebe631f055f88c704aa7d17/packages/@react-aria/selection/src/ListKeyboardDelegate.ts
 *
 * Redesigned for NSH: Kobalte holds a ref and asks the DOM for each item's
 * `offsetTop` / `offsetHeight`, the viewport's `offsetHeight` and the content's
 * `scrollHeight`, and searches items with `querySelector`. This delegate asks
 * the layout registry instead (fed by `onLayout`, see `collection-layout.ts`),
 * so it works with no DOM and no element query. The page formulas are
 * Kobalte's, which mark their own as approximate; the semantics (about one
 * viewport up or down) are kept. Typeahead uses the caller's collator, else the
 * case- and accent-folding default from `selection/utils`.
 */

import type { Accessor } from "nsh";

import type { Collection, CollectionNode, ItemLayout } from "../collection";
import type {
  DisabledBehavior,
  KeyboardDelegate,
  StringCollator,
} from "../selection";
import { defaultStringCollator } from "../selection";

export interface ListKeyboardDelegateOptions {
  /** Locale-aware comparison for typeahead (default: `defaultStringCollator`). */
  collator?: Accessor<StringCollator | undefined>;

  /**
   * How disabled items behave (default `"all"`). With `"selection"` they stay
   * in the keyboard order (arrows, Home/End, page keys and typeahead) even
   * though they cannot be selected, as react-aria's `ListKeyboardDelegate`
   * does for menus.
   */
  disabledBehavior?: Accessor<DisabledBehavior | undefined>;

  /** One item's reported frame, from `createCollectionLayout().getItemLayout`. */
  getItemLayout?: (key: string) => ItemLayout | undefined;

  /** The collection viewport's height, from `createCollectionLayout().containerHeight`. */
  getContainerHeight?: () => number | undefined;

  /** The scroll content's height, from `createCollectionLayout().contentHeight`. */
  getContentHeight?: () => number | undefined;
}

export class ListKeyboardDelegate implements KeyboardDelegate {
  private collection: Accessor<Collection<CollectionNode>>;
  private options: ListKeyboardDelegateOptions;

  constructor(
    collection: Accessor<Collection<CollectionNode>>,
    options: ListKeyboardDelegateOptions = {},
  ) {
    this.collection = collection;
    this.options = options;
  }

  /**
   * Whether the keyboard may land on this node. Sections are never landed on.
   * A disabled item is skipped with `disabledBehavior: "all"`, but stays in
   * the order with `"selection"` (its selection is refused elsewhere).
   */
  private isNavigable(node: CollectionNode | undefined): boolean {
    if (!node || node.type !== "item") {
      return false;
    }

    if (this.options.disabledBehavior?.() === "selection") {
      return true;
    }

    return !node.disabled;
  }

  getKeyBelow(key: string) {
    let keyAfter = this.collection().getKeyAfter(key);

    while (keyAfter != null) {
      if (this.isNavigable(this.collection().getItem(keyAfter))) {
        return keyAfter;
      }

      keyAfter = this.collection().getKeyAfter(keyAfter);
    }
  }

  getKeyAbove(key: string) {
    let keyBefore = this.collection().getKeyBefore(key);

    while (keyBefore != null) {
      if (this.isNavigable(this.collection().getItem(keyBefore))) {
        return keyBefore;
      }

      keyBefore = this.collection().getKeyBefore(keyBefore);
    }
  }

  getFirstKey() {
    let key = this.collection().getFirstKey();

    while (key != null) {
      if (this.isNavigable(this.collection().getItem(key))) {
        return key;
      }

      key = this.collection().getKeyAfter(key);
    }
  }

  getLastKey() {
    let key = this.collection().getLastKey();

    while (key != null) {
      if (this.isNavigable(this.collection().getItem(key))) {
        return key;
      }

      key = this.collection().getKeyBefore(key);
    }
  }

  getKeyPageAbove(key: string) {
    const item = this.options.getItemLayout?.(key);
    const viewportHeight = this.options.getContainerHeight?.();

    if (!item || viewportHeight == null) {
      return;
    }

    const pageY = Math.max(0, item.y + item.height - viewportHeight);

    let keyAbove: string | undefined = key;
    let current: ItemLayout | undefined = item;

    while (keyAbove != null && current != null && current.y > pageY) {
      keyAbove = this.getKeyAbove(keyAbove);
      current = keyAbove != null ? this.options.getItemLayout?.(keyAbove) : undefined;
    }

    return keyAbove;
  }

  getKeyPageBelow(key: string) {
    const item = this.options.getItemLayout?.(key);
    const viewportHeight = this.options.getContainerHeight?.();

    if (!item || viewportHeight == null) {
      return;
    }

    const contentHeight = this.options.getContentHeight?.();
    const pageY = Math.min(
      contentHeight ?? Number.POSITIVE_INFINITY,
      item.y - item.height + viewportHeight,
    );

    let keyBelow: string | undefined = key;
    let current: ItemLayout | undefined = item;

    while (keyBelow != null && current != null && current.y < pageY) {
      keyBelow = this.getKeyBelow(keyBelow);
      current = keyBelow != null ? this.options.getItemLayout?.(keyBelow) : undefined;
    }

    return keyBelow;
  }

  getKeyForSearch(search: string, fromKey?: string) {
    const collator = this.options.collator?.() ?? defaultStringCollator;

    // Prevent from getting the same key twice.
    let key = fromKey != null ? this.getKeyBelow(fromKey) : this.getFirstKey();

    while (key != null) {
      const item = this.collection().getItem(key);

      if (item) {
        const substring = item.textValue.slice(0, search.length);

        if (item.textValue && collator.compare(substring, search) === 0) {
          return key;
        }
      }

      key = this.getKeyBelow(key);
    }
  }
}
