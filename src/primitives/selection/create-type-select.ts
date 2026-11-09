/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/selection/create-type-select.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/8f2f2acb3d5850382ebe631f055f88c704aa7d17/packages/@react-aria/selection/src/useTypeSelect.ts
 *
 * Adapted to NSH: the handler takes a key name and modifiers instead of a
 * `KeyboardEvent`, and the 500ms search reset is an owned timer that is
 * cleared when the primitive goes away. A key command that presses Space is
 * named `"space"` by NSH's keymap, while a press of the bar is `" "`; both
 * become the search character `" "`.
 */

import { cleanup, type Accessor, signal, untracked } from "nsh";

import type {
  KeyboardDelegate,
  MultipleSelectionManager,
  SelectionModifiers,
} from "./types";

/** How long a typed prefix stays active, in milliseconds (Kobalte's 500). */
export const TYPE_SELECT_TIMEOUT_MS = 500;

export interface CreateTypeSelectProps {
  /** Whether type to select should be disabled. */
  isDisabled?: Accessor<boolean | undefined>;

  /** A delegate that returns collection item keys with respect to visual layout. */
  keyboardDelegate: Accessor<KeyboardDelegate>;

  /** An interface for reading and updating multiple selection state. */
  selectionManager: Accessor<MultipleSelectionManager>;

  /** Called when an item is focused by typing. */
  onTypeSelect?: (key: string) => void;

  /** How long a typed prefix stays active (default `TYPE_SELECT_TIMEOUT_MS`). */
  timeout?: Accessor<number | undefined>;
}

/**
 * Handles typeahead interactions with collections.
 *
 * Feed it every key the collection hears; it ignores keys that are not
 * printable, and keys pressed with Control or Meta. A printable key extends
 * the search, moves the focused key to the matching item and starts the
 * reset timer again.
 */
export function createTypeSelect(props: CreateTypeSelectProps) {
  const search = signal("");
  let timeoutId: number | undefined;

  const clearTimer = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  cleanup(clearTimer);

  const onKeyDown = (keyName: string, modifiers: SelectionModifiers = {}) => {
    if (props.isDisabled?.()) {
      return;
    }

    const delegate = props.keyboardDelegate();
    const manager = props.selectionManager();

    if (!delegate.getKeyForSearch) {
      return;
    }

    const character = getStringForKey(keyName);
    if (!character || modifiers.control || modifiers.platform) {
      return;
    }

    // Kobalte only calls `preventDefault` when Space joins an active prefix,
    // so the page does not scroll and the item's own key handler still sees
    // the activation. NSH's keymap command has already consumed the key and
    // the item's press handler runs on its own; the bar still joins the
    // prefix exactly as upstream does.
    let newSearch = untracked(search) + character;
    search.set(newSearch);

    // Use the delegate to find a key to focus. Prioritize items after the
    // currently focused item, falling back to searching the whole list.
    let key =
      delegate.getKeyForSearch(newSearch, manager.focusedKey()) ??
      delegate.getKeyForSearch(newSearch);

    // If no key was found, and the search is multiple iterations of the same
    // letter (e.g. "aaa"), cycle through first-letter matches.
    if (key == null && isAllSameLetter(newSearch)) {
      newSearch = newSearch[0];
      search.set(newSearch);

      key =
        delegate.getKeyForSearch(newSearch, manager.focusedKey()) ??
        delegate.getKeyForSearch(newSearch);
    }

    if (key != null) {
      manager.setFocusedKey(key);
      props.onTypeSelect?.(key);
    }

    clearTimer();

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      search.set("");
    }, props.timeout?.() ?? TYPE_SELECT_TIMEOUT_MS);
  };

  return {
    /** The prefix typed in the current window, for tests and render props. */
    search,

    /**
     * Forgets the prefix and its reset timer. Kobalte's buffer lives as long as
     * the element does; a port whose list stays mounted while its field closes
     * (Select) calls this on close, standing in for the unmount React Aria's
     * popover gets (`react-aria-components/src/Select.tsx`: the popover, and so
     * `useTypeSelect`, is only mounted while open).
     */
    reset: () => {
      clearTimer();
      search.set("");
    },

    typeSelectHandlers: {
      onKeyDown,
    },
  };
}

/** NSH names the space bar `"space"` in a keystroke; a search needs `" "`. */
function getStringForKey(key: string): string {
  if (key === "space") {
    return " ";
  }

  // If the key is of length 1, it is an ASCII value.
  // Otherwise, if there are no ASCII characters in the key name,
  // it is a Unicode character.
  // See https://www.w3.org/TR/uievents-key/
  if (key.length === 1 || !/^[A-Z]/i.test(key)) {
    return key;
  }

  return "";
}

function isAllSameLetter(search: string): boolean {
  return search.split("").every((letter) => letter === search[0]);
}
