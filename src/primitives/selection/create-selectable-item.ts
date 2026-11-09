/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/selection/create-selectable-item.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/8f2f2acb3d5850382ebe631f055f88c704aa7d17/packages/@react-aria/selection/src/useSelectableItem.ts
 *
 * Redesigned for NSH — the DOM parts are gone, not stubbed:
 *
 * - Kobalte attaches `onPointerDown`, `onPointerUp`, `onClick`, `onKeyDown`,
 *   `onMouseDown` and `onFocus` to the item element and moves focus with the
 *   element's `focus()`. NSH views have no key or mouse-down event, so this
 *   primitive returns `onPress` (wire it to a view's `onPress`), `onKeyDown`
 *   (wire it to a key command for the item that currently has the focused key),
 *   and `onFocus` / `onBlur` (wire them to the same view). Focus movement stays
 *   in the component: it watches `isFocused` and calls its own ref's `focus()`.
 *
 * - Kobalte selects on mouse down, then distinguishes press-up, click and
 *   touch with `pointerType`, `button` and `allowsDifferentPressOrigin`. NSH
 *   delivers one press after the press completed (`onPress`; `onPressDown` and
 *   `onPressUp` carry no button), so selection happens once, on `onPress`, and
 *   `shouldSelectOnPressUp` / `allowsDifferentPressOrigin` no longer have
 *   anything to move between. They are dropped rather than kept dead.
 *
 * - `PressEvent` has no `pointerType`, so a touch press cannot be detected
 *   here. The owner reports it with the `pointerType` accessor (a phone can
 *   pass `"touch"` from `platform.desktop === false`); its only effect is
 *   Kobalte's: in multiple mode a touch press toggles, because touch has no
 *   modifier keys. Without it a press behaves like a mouse click.
 *
 * - A DOM click focuses the item before it activates it; an NSH press does not
 *   move the keyboard focus at all. `onPress` therefore records the item as
 *   the focused key itself (unless the collection uses virtual focus), so a
 *   click and a `focusable` item end up in the same state as upstream. The
 *   component then focuses the view from `isFocused`.
 *
 * - `onKeyDown` exists for a component that routes keys itself (a combobox
 *   whose input keeps the focus, a menu opened from a key command). Do not
 *   wire both `onPress` and `onKeyDown` to the same activation of a focused
 *   item: NSH already reports Return and Space on a focused view as a press
 *   with `pagePosition { x: 0, y: 0 }`, which `onPress` handles.
 *
 * - `tabIndex` becomes `focusable`: NSH's views take part in the Tab order
 *   through the `focusable` prop, not an index. Only the item that holds the
 *   focused key is a Tab stop, exactly as Kobalte leaves it at `tabIndex: 0`.
 *
 * - The `data-key` attribute Kobalte uses for `querySelector` lookups has no
 *   counterpart; nothing here reads the tree.
 */

import type { Accessor, PressEvent } from "nsh";

import { isKeyboardPress } from "../create-interaction-modality";
import {
  type MultipleSelectionManager,
  type SelectionModifiers,
  type SelectionPointerType,
} from "./types";
import {
  isCtrlKeyPressed,
  isNonContiguousSelectionModifier,
  normalizeKeyName,
} from "./utils";

export interface CreateSelectableItemProps {
  /** An interface for reading and updating multiple selection state. */
  selectionManager: Accessor<MultipleSelectionManager>;

  /** The item's key in the collection. */
  key: Accessor<string>;

  /** Whether the item is disabled by its own props, in addition to the collection. */
  disabled?: Accessor<boolean | undefined>;

  /** Whether the collection uses virtual focus, so no item should take the keyboard focus. */
  shouldUseVirtualFocus?: Accessor<boolean | undefined>;

  /**
   * What pressed the item, when the owner knows. A touch press toggles in
   * multiple mode; `undefined` behaves like a mouse.
   */
  pointerType?: Accessor<SelectionPointerType>;
}

export interface SelectableItemState {
  /** Whether the item is selected. */
  isSelected: Accessor<boolean>;

  /** Whether the item is disabled, by itself or by the collection. */
  isDisabled: Accessor<boolean>;

  /** Whether the item may be selected at all (not disabled, selection not `"none"`). */
  allowsSelection: Accessor<boolean>;

  /** Whether this item holds the focused key and the collection is focused. */
  isFocused: Accessor<boolean>;

  /** Whether this item is the collection's Tab stop (Kobalte's `tabIndex === 0`). */
  focusable: Accessor<boolean>;

  /** Wire to the item view's `onPress`. */
  onPress: (event?: PressEvent) => void;

  /** Wire to a key command; only Enter and Space do anything. */
  onKeyDown: (key: string, modifiers?: SelectionModifiers) => void;

  /** Wire to the item view's `onFocus`. */
  onFocus: () => void;

  /** Wire to the item view's `onBlur`. */
  onBlur: () => void;
}

/** The modifier flags of a press payload. */
export function modifiersFromPress(event: PressEvent): SelectionModifiers {
  return {
    control: event.modifiers.control,
    alt: event.modifiers.alt,
    shift: event.modifiers.shift,
    platform: event.modifiers.platform,
  };
}

export function createSelectableItem(
  props: CreateSelectableItemProps,
): SelectableItemState {
  const manager = () => props.selectionManager();
  const key = () => props.key();
  const shouldUseVirtualFocus = () => !!props.shouldUseVirtualFocus?.();

  const isSelected = () => manager().isSelected(key());

  const isDisabled = () =>
    !!props.disabled?.() || manager().isDisabled(key());

  const allowsSelection = () => !isDisabled() && manager().canSelectItem(key());

  // Kobalte's `onSelect`: shifts extend, the toggle modifier (and touch)
  // toggles, everything else replaces the selection.
  const selectWithEvent = (modifiers?: SelectionModifiers) => {
    const selectionManager = manager();

    if (selectionManager.selectionMode() === "single") {
      if (
        selectionManager.isSelected(key()) &&
        !selectionManager.disallowEmptySelection()
      ) {
        selectionManager.toggleSelection(key());
      } else {
        selectionManager.replaceSelection(key());
      }
    } else if (modifiers?.shift) {
      selectionManager.extendSelection(key());
    } else if (
      selectionManager.selectionBehavior() === "toggle" ||
      isCtrlKeyPressed(modifiers) ||
      props.pointerType?.() === "touch"
    ) {
      selectionManager.toggleSelection(key());
    } else {
      selectionManager.replaceSelection(key());
    }
  };

  const onPress = (event?: PressEvent) => {
    const isKeyboard = event != null && isKeyboardPress(event);

    // In the DOM a pointer press focuses the item before the click. An NSH
    // press does not move the keyboard focus, so the item records itself as
    // the focused key; the component watches `isFocused` and focuses its ref.
    // This happens even in selection mode `"none"`, where a click still
    // focuses the row (its `onFocus` would say the same).
    if (!isKeyboard && !isDisabled()) {
      manager().setFocused(true);
      manager().setFocusedKey(key());
    }

    if (!allowsSelection()) {
      return;
    }

    if (isKeyboard) {
      const modifiers = modifiersFromPress(event!);

      if (isNonContiguousSelectionModifier(modifiers)) {
        manager().toggleSelection(key());
      } else {
        selectWithEvent(modifiers);
      }

      return;
    }

    selectWithEvent(event ? modifiersFromPress(event) : undefined);
  };

  const onKeyDown = (keyName: string, modifiers: SelectionModifiers = {}) => {
    if (!allowsSelection()) {
      return;
    }

    const normalized = normalizeKeyName(keyName);

    if (normalized !== "enter" && normalized !== "space") {
      return;
    }

    if (isNonContiguousSelectionModifier(modifiers)) {
      manager().toggleSelection(key());
    } else {
      selectWithEvent(modifiers);
    }
  };

  const onFocus = () => {
    if (shouldUseVirtualFocus() || isDisabled()) {
      return;
    }

    manager().setFocused(true);
    manager().setFocusedKey(key());
  };

  const onBlur = () => {
    if (shouldUseVirtualFocus() || isDisabled()) {
      return;
    }

    // Every item reports its own blur. Moving between two items fires the old
    // item's blur and then the new item's focus, so the collection ends up
    // focused; leaving the collection leaves it blurred.
    manager().setFocused(false);
  };

  const isFocused = () =>
    !shouldUseVirtualFocus() &&
    manager().isFocused() &&
    key() === manager().focusedKey();

  const focusable = () =>
    !shouldUseVirtualFocus() &&
    !isDisabled() &&
    key() === manager().focusedKey();

  return {
    isSelected,
    isDisabled,
    allowsSelection,
    isFocused,
    focusable,
    onPress,
    onKeyDown,
    onFocus,
    onBlur,
  };
}
