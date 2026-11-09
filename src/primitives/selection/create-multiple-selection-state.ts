/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/selection/create-multiple-selection-state.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/bfce84fee12a027d9cbc38b43e1747e3e4b4b169/packages/@react-stately/selection/src/useMultipleSelectionState.ts
 *
 * Adapted to NSH: `mergeDefaultProps` is replaced by reading each accessor
 * with `?? default` at the point of use, so a prop that changes later still
 * follows; the effects that sync `selectionBehavior` run after render.
 */

import { type Accessor, computed, effect, signal } from "nsh";

import { createControllableSelectionSignal } from "./create-controllable-selection-signal";
import {
  type MultipleSelection,
  type MultipleSelectionState,
  Selection,
  type SelectionBehavior,
} from "./types";
import { convertSelection, isSameSelection } from "./utils";

export interface CreateMultipleSelectionStateProps extends MultipleSelection {
  /** How multiple selection should behave in the collection. */
  selectionBehavior?: Accessor<SelectionBehavior | undefined>;

  /** Whether onSelectionChange should fire even if the new set of keys is the same as the last. */
  allowDuplicateSelectionEvents?: Accessor<boolean | undefined>;
}

/**
 * Manages state for multiple selection and focus in a collection.
 */
export function createMultipleSelectionState(
  props: CreateMultipleSelectionStateProps,
): MultipleSelectionState {
  const isFocused = signal(false);
  const focusedKey = signal<string | undefined>(undefined);

  const setFocused = (value: boolean) => isFocused.set(value);
  const setFocusedKey = (key?: string) => focusedKey.set(key);

  const selectedKeysProp = computed(() => {
    const selection = props.selectedKeys?.();

    if (selection != null) {
      return convertSelection(selection);
    }

    return selection;
  });

  const defaultSelectedKeys = computed(() => {
    const defaultSelection = props.defaultSelectedKeys?.();

    if (defaultSelection != null) {
      return convertSelection(defaultSelection);
    }

    return new Selection();
  });

  const [selectedKeys, _setSelectedKeys] = createControllableSelectionSignal({
    value: selectedKeysProp,
    defaultValue: defaultSelectedKeys,
    onChange: (value) => props.onSelectionChange?.(value),
  });

  const selectionBehavior = signal<SelectionBehavior>(
    props.selectionBehavior?.() ?? "toggle",
  );

  const setSelectionBehavior = (value: SelectionBehavior) =>
    selectionBehavior.set(value);

  const selectionMode = () => props.selectionMode?.() ?? "none";
  const disallowEmptySelection = () => props.disallowEmptySelection?.() ?? false;

  const setSelectedKeys = (keys: Set<string>) => {
    if (
      props.allowDuplicateSelectionEvents?.() ||
      !isSameSelection(keys, selectedKeys())
    ) {
      _setSelectedKeys(keys);
    }
  };

  // If the selectionBehavior prop is set to replace, but the current state is
  // toggle (e.g. due to long press to enter selection mode on touch), and the
  // selection becomes empty, reset the selection behavior.
  effect(() => {
    const selection = selectedKeys();

    if (
      props.selectionBehavior?.() === "replace" &&
      selectionBehavior() === "toggle" &&
      selection.size === 0
    ) {
      setSelectionBehavior("replace");
    }
  });

  // If the selectionBehavior prop changes, update the state as well.
  effect(() => {
    setSelectionBehavior(props.selectionBehavior?.() ?? "toggle");
  });

  return {
    selectionMode,
    disallowEmptySelection,
    selectionBehavior,
    setSelectionBehavior,
    isFocused,
    setFocused,
    focusedKey,
    setFocusedKey,
    selectedKeys,
    setSelectedKeys,
  };
}
