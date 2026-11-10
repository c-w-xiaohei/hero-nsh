/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/tabs/tabs-keyboard-delegate.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/703ab7b4559ecd4fc611e7f2c0e758867990fe01/packages/@react-aria/tabs/src/TabsKeyboardDelegate.ts
 *
 * Adapted to NSH: the collection is an accessor instead of a class field, and
 * the writing direction comes from the root's `dir` prop because NSH has no
 * readable locale direction (port sheet §2, §8).
 */

import type { Accessor } from "nsh";

import type { Collection, CollectionNode } from "../../primitives/collection";
import type { KeyboardDelegate } from "../../primitives/selection";

/** The axis the arrows follow, from the root's `orientation`. */
export type TabsKeyboardOrientation = "horizontal" | "vertical";

/**
 * The tab list's keyboard delegate: arrows walk the tabs along
 * `orientation`, skip disabled tabs, and wrap at both ends. Copied from
 * Kobalte, whose delegate is the React Aria one (port sheet §5).
 *
 * It is handed to `createSelectableCollection` with the collection's default
 * `vertical` orientation on purpose: that primitive sends Left/Right to
 * `getKeyLeftOf` / `getKeyRightOf` and Up/Down to `getKeyAbove` /
 * `getKeyBelow`, and this delegate decides from the real orientation which of
 * the four returns a key (port sheet §5, the keyboard wiring trap).
 */
export class TabsKeyboardDelegate implements KeyboardDelegate {
  constructor(
    private collection: Accessor<Collection<CollectionNode>>,
    private orientation: Accessor<TabsKeyboardOrientation>,
    private direction: Accessor<"ltr" | "rtl" | undefined>,
  ) {}

  /** In a right-to-left horizontal list, Left is the next tab, as in Kobalte. */
  private flipDirection(): boolean {
    return this.direction() === "rtl" && this.orientation() === "horizontal";
  }

  getKeyLeftOf(key: string): string | undefined {
    if (this.flipDirection()) {
      return this.getNextKey(key);
    }

    if (this.orientation() === "horizontal") {
      return this.getPreviousKey(key);
    }

    return undefined;
  }

  getKeyRightOf(key: string): string | undefined {
    if (this.flipDirection()) {
      return this.getPreviousKey(key);
    }

    if (this.orientation() === "horizontal") {
      return this.getNextKey(key);
    }

    return undefined;
  }

  getKeyAbove(key: string): string | undefined {
    if (this.orientation() === "vertical") {
      return this.getPreviousKey(key);
    }

    return undefined;
  }

  getKeyBelow(key: string): string | undefined {
    if (this.orientation() === "vertical") {
      return this.getNextKey(key);
    }

    return undefined;
  }

  getFirstKey(): string | undefined {
    let key = this.collection().getFirstKey();

    if (key == null) {
      return undefined;
    }

    if (this.collection().getItem(key)?.disabled) {
      key = this.getNextKey(key);
    }

    return key;
  }

  getLastKey(): string | undefined {
    let key = this.collection().getLastKey();

    if (key == null) {
      return undefined;
    }

    if (this.collection().getItem(key)?.disabled) {
      key = this.getPreviousKey(key);
    }

    return key;
  }

  getNextKey(key: string): string | undefined {
    let nextKey: string | undefined = key;
    let nextItem: CollectionNode | undefined;

    do {
      nextKey = this.collection().getKeyAfter(nextKey) ?? this.collection().getFirstKey();

      if (nextKey == null) {
        return undefined;
      }

      nextItem = this.collection().getItem(nextKey);

      if (nextItem == null) {
        return undefined;
      }
    } while (nextItem.disabled);

    return nextKey;
  }

  getPreviousKey(key: string): string | undefined {
    let previousKey: string | undefined = key;
    let previousItem: CollectionNode | undefined;

    do {
      previousKey =
        this.collection().getKeyBefore(previousKey) ?? this.collection().getLastKey();

      if (previousKey == null) {
        return undefined;
      }

      previousItem = this.collection().getItem(previousKey);

      if (previousItem == null) {
        return undefined;
      }
    } while (previousItem.disabled);

    return previousKey;
  }
}
