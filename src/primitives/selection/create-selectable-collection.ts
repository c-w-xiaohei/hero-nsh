/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/selection/create-selectable-collection.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/8f2f2acb3d5850382ebe631f055f88c704aa7d17/packages/@react-aria/selection/src/useSelectableCollection.ts
 *
 * Redesigned for NSH — every DOM dependency became a callback the component
 * supplies, and the returned handlers are what the component wires:
 *
 * - `onKeyDown` becomes `(key, modifiers?)`. There is no key event on a view
 *   and no document listener, so a component binds its keys (`keymap.bind`) and
 *   forwards the NSH key name ("down", "pageup", "a") plus the modifiers it
 *   bound. The collection consumes every key Kobalte consumed, except Tab and
 *   Alt+Tab (see below).
 * - `onFocusIn` / `onFocusOut` are plain handlers for a view's `onFocus` /
 *   `onBlur`. Kobalte inspects `event.target` / `event.relatedTarget` and the
 *   DOM tree to tell a portal-bubbled event from a real one and to remove
 *   items' own focus handlers from the calculation; NSH focus events never
 *   bubble and carry no related target, so the collection keeps `isFocused`
 *   from explicit calls: the container calls `onFocusIn`/`onFocusOut`, and each
 *   item calls its own `onFocus`/`onBlur` (see `createSelectableItem`).
 * - Focus is not moved here. The item primitive exposes `isFocused`; the
 *   component watches it and focuses its own ref, so the primitive holds no
 *   element. Scrolling is a callback too: `scrollToItem(key)` for a rendered
 *   list, `scrollToKey(key)` for a virtualized one (Kobalte queried
 *   `[data-key]` and called `scrollIntoView`).
 * - A key that moves the focused key also marks the collection focused.
 *   Kobalte's collection only hears keys while something inside it already has
 *   the focus, an invariant NSH cannot guarantee: there is no bubbling key
 *   event, and a component binds its keys through `keymap`.
 *
 * - KEYMAP OWNERSHIP. NSH keeps only the newest binding per keystroke
 *   (`keymap.bind` replaces an equal one), so bindings must be scoped, never
 *   global. A component binds the collection's keys only while the collection
 *   is focused (or, with virtual focus, while the owning input is focused),
 *   unbinds when that focus leaves, and unbinds when it unmounts.
 *   `createKeymapScope` does exactly this: pass `isActive: () => manager
 *   .isFocused()` plus the bindings, and it re-binds on focus and drops them on
 *   blur/unmount. Never pass `when: "always"`: that would let a list steal the
 *   letters and arrows a text field needs, and two mounted lists would fight
 *   over the newest binding.
 * - `autoFocus` runs in an effect after the first render, because NSH's render
 *   pass must not request focus (research section 4.6); `deferAutoFocus` is
 *   therefore meaningless and dropped. With no item key to focus, it calls the
 *   caller's `focusCollection` (Kobalte focused its ref directly).
 * - Tab / Alt+Tab: Kobalte walks the element's tabbable subtree with
 *   `getFocusableTreeWalker`. NSH has no such walk and Tab is the platform's
 *   own: with no binding, Tab moves focus out of the collection; it is never
 *   intercepted, so `allowsTabNavigation` is dropped.
 * - `onMouseDown` (prevent focus on the scrollbar) has no NSH equivalent and is
 *   dropped.
 */

import { type Accessor, computed, effect } from "nsh";

import { createTypeSelect } from "./create-type-select";
import type {
  FocusStrategy,
  KeyboardDelegate,
  MultipleSelectionManager,
  SelectionModifiers,
} from "./types";
import {
  isCtrlKeyPressed,
  isNonContiguousSelectionModifier,
  normalizeKeyName,
} from "./utils";

/** The orientation of a selectable collection (`vertical` by default). */
export type Orientation = "horizontal" | "vertical";

export interface CreateSelectableCollectionProps {
  /** An interface for reading and updating multiple selection state. */
  selectionManager: Accessor<MultipleSelectionManager>;

  /** A delegate object that implements behavior for keyboard focus movement. */
  keyboardDelegate: Accessor<KeyboardDelegate>;

  /** Whether the collection or one of its items should be automatically focused upon render. */
  autoFocus?: Accessor<boolean | FocusStrategy | undefined>;

  /** Whether focus should wrap around when the end/start is reached. */
  shouldFocusWrap?: Accessor<boolean | undefined>;

  /** Whether the collection allows empty selection (Escape clears it otherwise). */
  disallowEmptySelection?: Accessor<boolean | undefined>;

  /** Whether the collection allows the user to select all items via keyboard shortcut. */
  disallowSelectAll?: Accessor<boolean | undefined>;

  /** Whether selection should occur automatically on focus. Defaults to `selectionBehavior === "replace"`. */
  selectOnFocus?: Accessor<boolean | undefined>;

  /** Whether typeahead is disabled. */
  disallowTypeAhead?: Accessor<boolean | undefined>;

  /** Whether the collection items should use virtual focus instead of being focused directly. */
  shouldUseVirtualFocus?: Accessor<boolean | undefined>;

  /** Whether the collection items are contained in a virtual scroller. */
  isVirtualized?: Accessor<boolean | undefined>;

  /**
   * When virtualized, scrolls the item of the key into view; when not
   * virtualized, the component ignores it.
   */
  scrollToKey?: (key: string) => void;

  /**
   * Scrolls the item of the key into view in a rendered (non-virtualized)
   * collection. The component owns the scroller, so it supplies this.
   */
  scrollToItem?: (key: string) => void;

  /**
   * Focuses the collection view itself. `autoFocus` uses it when no item key
   * is chosen, which is Kobalte's `focusWithoutScrolling(refEl)` branch (a
   * boolean `autoFocus` focuses the list, then the arrows start at the first
   * item).
   */
  focusCollection?: () => void;

  /** The orientation of the selectable collection interactions. */
  orientation?: Accessor<Orientation | undefined>;

  /** The writing direction of the collection (default `"ltr"`). */
  direction?: Accessor<"ltr" | "rtl" | undefined>;

  /**
   * Where focus enters when the collection gains it while no item holds the
   * focused key: its first item (default) or its last, as Kobalte chose from
   * whether Tab came from before or after the collection. NSH's focus event
   * has no related target, so the component says it: use `"end"` when the
   * focus came from a control after the collection (Shift+Tab into a list
   * placed after the controls it belongs to).
   */
  enterFrom?: Accessor<"start" | "end" | undefined>;
}

export interface SelectableCollectionState {
  /**
   * Whether the collection itself is the Tab stop: true while no item holds
   * the focused key (Kobalte's `tabIndex === 0`). Items take over once one is
   * focused, through the item primitive's `focusable`.
   */
  focusable: Accessor<boolean>;

  /**
   * Handles one key. `key` is an NSH key name ("down", "home", "enter", a
   * printable character for typeahead) or its DOM spelling ("ArrowDown").
   */
  onKeyDown: (key: string, modifiers?: SelectionModifiers) => void;

  /** Wire to the collection view's `onFocus`. */
  onFocusIn: () => void;

  /** Wire to the collection view's `onBlur`. */
  onFocusOut: () => void;
}

/**
 * Handles keyboard interactions with selectable collections.
 */
export function createSelectableCollection(
  props: CreateSelectableCollectionProps,
): SelectableCollectionState {
  const selectionManager = () => props.selectionManager();
  const keyboardDelegate = () => props.keyboardDelegate();

  const selectOnFocus = () =>
    props.selectOnFocus?.() ??
    selectionManager().selectionBehavior() === "replace";

  const orientation = (): Orientation => props.orientation?.() ?? "vertical";
  const direction = () => props.direction?.() ?? "ltr";
  const shouldUseVirtualFocus = () => !!props.shouldUseVirtualFocus?.();

  const { typeSelectHandlers } = createTypeSelect({
    isDisabled: () => props.disallowTypeAhead?.(),
    keyboardDelegate,
    selectionManager,
  });

  const onKeyDown = (key: string, modifiers: SelectionModifiers = {}) => {
    const manager = selectionManager();
    const delegate = keyboardDelegate();
    const normalized = normalizeKeyName(key);
    const horizontal = orientation() === "horizontal";
    const shouldFocusWrap = !!props.shouldFocusWrap?.();
    const focusedBeforeTypeahead = manager.focusedKey();

    // Typeahead runs first, as in Kobalte: a printable key that matches an
    // item moves the focused key without any of the navigation cases below.
    typeSelectHandlers.onKeyDown(key, modifiers);

    // Kobalte's collection only hears keys while something inside it has the
    // focus, so `isFocused` is already true by then. NSH has no bubbling key
    // event and lets a component bind keys globally, so a key that moves the
    // focused key is itself the proof that the collection became active: mark
    // it focused and let the item primitive take the view's focus.
    if (manager.focusedKey() !== focusedBeforeTypeahead) {
      manager.setFocused(true);
    }

    const focusedKey = manager.focusedKey();

    const navigateToKey = (nextKey: string | undefined) => {
      if (nextKey == null) {
        return;
      }

      manager.setFocused(true);
      manager.setFocusedKey(nextKey);

      if (modifiers.shift && manager.selectionMode() === "multiple") {
        manager.extendSelection(nextKey);
      } else if (selectOnFocus() && !isNonContiguousSelectionModifier(modifiers)) {
        manager.replaceSelection(nextKey);
      }
    };

    switch (normalized) {
      case horizontal ? "right" : "down": {
        if (delegate.getKeyBelow) {
          let nextKey =
            focusedKey != null
              ? delegate.getKeyBelow(focusedKey)
              : delegate.getFirstKey?.();

          if (nextKey == null && shouldFocusWrap) {
            nextKey = delegate.getFirstKey?.(focusedKey);
          }

          navigateToKey(nextKey);
        }
        break;
      }
      case horizontal ? "left" : "up": {
        if (delegate.getKeyAbove) {
          let nextKey =
            focusedKey != null
              ? delegate.getKeyAbove(focusedKey)
              : delegate.getLastKey?.();

          if (nextKey == null && shouldFocusWrap) {
            nextKey = delegate.getLastKey?.(focusedKey);
          }

          navigateToKey(nextKey);
        }
        break;
      }
      case horizontal ? "up" : "left": {
        if (delegate.getKeyLeftOf) {
          const isRTL = direction() === "rtl";
          const nextKey =
            focusedKey != null
              ? delegate.getKeyLeftOf(focusedKey)
              : isRTL
                ? delegate.getFirstKey?.()
                : delegate.getLastKey?.();

          navigateToKey(nextKey);
        }
        break;
      }
      case horizontal ? "down" : "right": {
        if (delegate.getKeyRightOf) {
          const isRTL = direction() === "rtl";
          const nextKey =
            focusedKey != null
              ? delegate.getKeyRightOf(focusedKey)
              : isRTL
                ? delegate.getLastKey?.()
                : delegate.getFirstKey?.();

          navigateToKey(nextKey);
        }
        break;
      }
      case "home": {
        if (delegate.getFirstKey) {
          const firstKey = delegate.getFirstKey(
            focusedKey,
            isCtrlKeyPressed(modifiers),
          );

          if (firstKey != null) {
            manager.setFocused(true);
            manager.setFocusedKey(firstKey);

            if (
              isCtrlKeyPressed(modifiers) &&
              modifiers.shift &&
              manager.selectionMode() === "multiple"
            ) {
              manager.extendSelection(firstKey);
            } else if (selectOnFocus()) {
              manager.replaceSelection(firstKey);
            }
          }
        }
        break;
      }
      case "end": {
        if (delegate.getLastKey) {
          const lastKey = delegate.getLastKey(
            focusedKey,
            isCtrlKeyPressed(modifiers),
          );

          if (lastKey != null) {
            manager.setFocused(true);
            manager.setFocusedKey(lastKey);

            if (
              isCtrlKeyPressed(modifiers) &&
              modifiers.shift &&
              manager.selectionMode() === "multiple"
            ) {
              manager.extendSelection(lastKey);
            } else if (selectOnFocus()) {
              manager.replaceSelection(lastKey);
            }
          }
        }
        break;
      }
      case "pagedown": {
        if (delegate.getKeyPageBelow && focusedKey != null) {
          navigateToKey(delegate.getKeyPageBelow(focusedKey));
        }
        break;
      }
      case "pageup": {
        if (delegate.getKeyPageAbove && focusedKey != null) {
          navigateToKey(delegate.getKeyPageAbove(focusedKey));
        }
        break;
      }
      case "a": {
        if (
          isCtrlKeyPressed(modifiers) &&
          manager.selectionMode() === "multiple" &&
          props.disallowSelectAll?.() !== true
        ) {
          manager.selectAll();
        }
        break;
      }
      case "escape": {
        if (!(props.disallowEmptySelection?.() ?? manager.disallowEmptySelection())) {
          manager.clearSelection();
        }
        break;
      }
    }
  };

  const onFocusIn = () => {
    const manager = selectionManager();
    const delegate = keyboardDelegate();

    if (manager.isFocused()) {
      return;
    }

    manager.setFocused(true);

    if (manager.focusedKey() == null) {
      // Kobalte picks the first or last key by comparing the previous focus's
      // position in the DOM. NSH focus events have no related target, so the
      // caller says which end it came from through `enterFrom`.
      const fromEnd = props.enterFrom?.() === "end";
      const key = fromEnd
        ? manager.lastSelectedKey() ?? delegate.getLastKey?.()
        : manager.firstSelectedKey() ?? delegate.getFirstKey?.();

      if (key != null) {
        manager.setFocusedKey(key);

        if (selectOnFocus()) {
          manager.replaceSelection(key);
        }
      }
    } else if (!props.isVirtualized?.()) {
      // Refocus and scroll the already focused item into view, as Kobalte does.
      props.scrollToItem?.(manager.focusedKey()!);
    }
  };

  const onFocusOut = () => {
    selectionManager().setFocused(false);
  };

  // Kobalte focuses on mount. NSH runs effects after the render they follow,
  // so this is the mount point, and `deferAutoFocus` is unnecessary.
  let didAutoFocus = false;

  effect(() => {
    if (didAutoFocus) {
      return;
    }

    const autoFocus = props.autoFocus?.();

    if (!autoFocus) {
      return;
    }

    didAutoFocus = true;

    const manager = selectionManager();
    const delegate = keyboardDelegate();

    let focusedKey: string | undefined;

    if (autoFocus === "first") {
      focusedKey = delegate.getFirstKey?.();
    }
    if (autoFocus === "last") {
      focusedKey = delegate.getLastKey?.();
    }

    // If there are any selected keys, make the first one the new focus target.
    const selectedKeys = manager.selectedKeys();
    if (selectedKeys.size) {
      focusedKey = selectedKeys.values().next().value;
    }

    manager.setFocused(true);
    manager.setFocusedKey(focusedKey);

    // If no item key is focused, focus the collection itself, as Kobalte does
    // for a boolean `autoFocus`; a virtual-focus collection keeps its input.
    if (focusedKey == null && !shouldUseVirtualFocus()) {
      props.focusCollection?.();
    }
  });

  // Scroll the focused item into view when the focused key changes; a
  // virtualizer handles the virtualized case itself through `scrollToKey`.
  effect(() => {
    const focusedKey = selectionManager().focusedKey();

    if (focusedKey == null) {
      return;
    }

    if (props.isVirtualized?.()) {
      props.scrollToKey?.(focusedKey);
    } else {
      props.scrollToItem?.(focusedKey);
    }
  });

  const focusable = computed(
    () => !shouldUseVirtualFocus() && selectionManager().focusedKey() == null,
  );

  return {
    focusable,
    onKeyDown,
    onFocusIn,
    onFocusOut,
  };
}
