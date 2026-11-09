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
 *   element's `focus()`. NSH views have no key or mouse-down event of their
 *   own, so this primitive returns `onPressDown`, `onPressUp` and `onPress`
 *   (wire them to the view's same-named props), `onKeyDown` (wire it to a key
 *   command for the item that currently has the focused key), and `onFocus` /
 *   `onBlur`. Focus movement stays in the component: it watches `isFocused`
 *   and calls its own ref's `focus()`.
 *
 * - PRESS ORDER. Kobalte's `onSelect` runs on pointer down for a mouse, on
 *   pointer up when `shouldSelectOnPressUp && allowsDifferentPressOrigin`, and
 *   on click otherwise; touch always goes through click. NSH's press payload
 *   gives neither `button` nor `pointerType` nor press origin, so this port
 *   keeps the two behaviors that matter and drops the extra knob:
 *     `shouldSelectOnPressUp: false` (default, react-aria's ListBox default):
 *       a mouse press activates on `onPressDown`; `onPress` then does nothing
 *       for a pointer, so one physical press activates once;
 *     `shouldSelectOnPressUp: true` (react-aria passes it for draggable
 *       lists, so a drag can start instead of selecting): activation moves to
 *       `onPressUp`.
 *   Keyboard activation stays in `onPress` (NSH reports Return/Space on a
 *   focused view as a press with `pagePosition {0, 0}`), and `onPress()` with
 *   no event is treated as that click.
 *
 * - A mouse press on a disabled item must do nothing and a press on an enabled
 *   one focuses it. In the DOM the browser focuses it before the click; an NSH
 *   press does not move the keyboard focus, so `onPressDown` records the item
 *   as the focused key itself and the component focuses the view from
 *   `isFocused`. Virtual focus is the exception, exactly as in Kobalte's
 *   `onFocus` early return: the owning input keeps the focus.
 *
 * - `onAction` is React Aria's item action (a ListBox row reports it on the
 *   press release, even when selection is `"none"` or an item is disabled
 *   under `disabledBehavior: "selection"`). Selection and action are separate
 *   halves: with press-down selection the action still waits for the release.
 *   It is optional; without it the item is selection-only.
 *
 * - `PressEvent` has no `pointerType`, so a touch press cannot be detected
 *   here. The owner reports it with the `pointerType` accessor (a phone can
 *   pass `"touch"` from `platform.desktop === false`); its only effect is
 *   Kobalte's: in multiple mode a touch press toggles, because touch has no
 *   modifier keys. Without it a press behaves like a mouse click.
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
   * Whether activation waits for the press to be released. `false` (default)
   * activates on `onPressDown`; `true` activates on `onPressUp`.
   */
  shouldSelectOnPressUp?: Accessor<boolean | undefined>;

  /**
   * What pressed the item, when the owner knows. A touch press toggles in
   * multiple mode; `undefined` behaves like a mouse.
   */
  pointerType?: Accessor<SelectionPointerType>;

  /** Called when the item is activated (press, Return or Space), including disabled-but-focusable items. */
  onAction?: () => void;
}

export interface SelectableItemState {
  /** Whether the item is selected. */
  isSelected: Accessor<boolean>;

  /** Whether the item is disabled, by itself or by the collection (`disabledBehavior` included). */
  isDisabled: Accessor<boolean>;

  /** Whether the item may be selected at all (not disabled, selection not `"none"`). */
  allowsSelection: Accessor<boolean>;

  /** Whether this item holds the focused key and the collection is focused. */
  isFocused: Accessor<boolean>;

  /** Whether this item is the collection's Tab stop (Kobalte's `tabIndex === 0`). */
  focusable: Accessor<boolean>;

  /** Wire to the item view's `onPressDown`: activates a press that selects on down. */
  onPressDown: (event?: PressEvent) => void;

  /** Wire to the item view's `onPressUp`: activates a press that selects on up. */
  onPressUp: (event?: PressEvent) => void;

  /** Wire to the item view's `onPress`: keyboard activation (Return/Space). */
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
  const shouldSelectOnPressUp = () => !!props.shouldSelectOnPressUp?.();

  const isSelected = () => manager().isSelected(key());

  /** The item's own disabled prop, which `disabledBehavior` also governs. */
  const isDisabledByProps = () => !!props.disabled?.();

  /**
   * Whether the item is inert for focus and action. `"selection"` keeps every
   * disabled item reachable, whether it is disabled by the collection or by
   * its own prop; it only refuses the selection.
   */
  const isDisabled = () =>
    manager().disabledBehavior() === "selection"
      ? false
      : isDisabledByProps() || manager().isDisabled(key());

  const allowsSelection = () =>
    !isDisabledByProps() && !isDisabled() && manager().canSelectItem(key());

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

  /**
   * The focused key follows a pointer press, because an NSH press does not
   * move the keyboard focus. Virtual focus never does this: the owning input
   * keeps the focus and only reads `focusedKey`.
   */
  const focusItem = () => {
    if (shouldUseVirtualFocus()) {
      return;
    }

    manager().setFocused(true);
    manager().setFocusedKey(key());
  };

  /** The selection half of an activation; a disabled item cannot be selected. */
  const select = (modifiers?: SelectionModifiers) => {
    if (isDisabled() || !allowsSelection()) {
      return;
    }

    if (modifiers && isNonContiguousSelectionModifier(modifiers)) {
      manager().toggleSelection(key());
    } else {
      selectWithEvent(modifiers);
    }
  };

  /**
   * The action half. React Aria reports it on the press release (a click),
   * while the selection can happen on press down; a truly disabled item does
   * nothing, but one disabled only for selection still acts.
   */
  const fireAction = () => {
    if (isDisabled()) {
      return;
    }

    props.onAction?.();
  };

  const onPressDown = (event?: PressEvent) => {
    // A keyboard activation has no press-down; it arrives at `onPress`.
    if (event && isKeyboardPress(event)) {
      return;
    }

    if (!isDisabled()) {
      focusItem();
    }

    if (!shouldSelectOnPressUp()) {
      select(event ? modifiersFromPress(event) : undefined);
    }
  };

  const onPressUp = (event?: PressEvent) => {
    if (event && isKeyboardPress(event)) {
      return;
    }

    if (shouldSelectOnPressUp()) {
      select(event ? modifiersFromPress(event) : undefined);
    }
  };

  const onPress = (event?: PressEvent) => {
    if (event && !isKeyboardPress(event)) {
      // A pointer press selected on down or up; the release is the action.
      fireAction();
      return;
    }

    // Keyboard activation (or a caller with no event): selection and action.
    const modifiers = event ? modifiersFromPress(event) : undefined;
    select(modifiers);
    fireAction();
  };

  const onKeyDown = (keyName: string, modifiers: SelectionModifiers = {}) => {
    const normalized = normalizeKeyName(keyName);

    if (normalized !== "enter" && normalized !== "space") {
      return;
    }

    select(modifiers);
    fireAction();
  };

  const onFocus = () => {
    if (shouldUseVirtualFocus() || isDisabled()) {
      return;
    }

    manager().setFocused(true);
    manager().setFocusedKey(key());
  };

  const onBlur = () => {
    if (shouldUseVirtualFocus()) {
      return;
    }

    // Not gated on `isDisabled`: an item can become disabled while it holds
    // the focus, and losing that focus must still clear the collection's
    // focused state. Every item reports its own blur; moving between two items
    // fires the old item's blur and then the new item's focus, so the
    // collection ends up focused.
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
    onPressDown,
    onPressUp,
    onPress,
    onKeyDown,
    onFocus,
    onBlur,
  };
}
