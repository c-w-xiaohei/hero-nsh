/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/list/create-single-select-list-state.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/bfce84fee12a027d9cbc38b43e1747e3e4b4b169/packages/@react-stately/list/src/useSingleSelectListState.ts
 *
 * Adapted to NSH: selected keys are derived with `computed`, and the list
 * state props are built from accessors instead of Solid's `mergeProps` /
 * `splitProps`, per research section 4.4.
 */

import { type Accessor, computed } from "nsh";

import {
  type CollectionBase,
  type CollectionNode,
} from "../collection";
import { createControllableSignal } from "../create-controllable-signal";
import type { SingleSelection } from "../selection";
import {
  type CreateListStateProps,
  type ListState,
  createListState,
} from "./create-list-state";

export interface CreateSingleSelectListStateProps
  extends CollectionBase,
    Omit<SingleSelection, "disallowEmptySelection"> {
  /** Filter function to generate a filtered list of nodes. */
  filter?: Accessor<
    ((nodes: Iterable<CollectionNode>) => Iterable<CollectionNode>) | undefined
  >;
}

export interface SingleSelectListState extends ListState {
  /** The value of the currently selected item. */
  selectedItem: Accessor<CollectionNode | undefined>;

  /** The key for the currently selected item. */
  selectedKey: Accessor<string | undefined>;

  /** Sets the selected key. */
  setSelectedKey(key: string): void;
}

/**
 * Provides state management for list-like components with single selection.
 * Handles building a collection of items from props, and manages selection
 * state.
 */
export function createSingleSelectListState(
  props: CreateSingleSelectListStateProps,
): SingleSelectListState {
  const [selectedKey, setSelectedKey] = createControllableSignal<string>({
    value: props.selectedKey,
    defaultValue: () => props.defaultSelectedKey?.(),
    onChange: (value) => props.onSelectionChange?.(value),
  });

  const selectedKeys = computed(() => {
    const selection = selectedKey();
    return selection != null ? [selection] : [];
  });

  const createListStateProps: CreateListStateProps = {
    dataSource: props.dataSource,
    getKey: props.getKey,
    getTextValue: props.getTextValue,
    getDisabled: props.getDisabled,
    getSectionChildren: props.getSectionChildren,
    filter: props.filter,
    selectionMode: () => "single",
    disallowEmptySelection: () => true,
    allowDuplicateSelectionEvents: () => true,
    selectedKeys,
    onSelectionChange: (keys: Set<string> | "all") => {
      // A single-select list never produces the `"all"` sentinel: its
      // selectedKeys input is a one-element array.
      if (keys === "all") {
        return;
      }

      const key = keys.values().next().value;
      if (key === undefined) {
        return;
      }

      // Always fire onSelectionChange, even if the key is the same as the
      // current key (createControllableSignal does not).
      if (key === selectedKey()) {
        props.onSelectionChange?.(key);
      }

      setSelectedKey(key);
    },
  };

  const { collection, selectionManager } = createListState(createListStateProps);

  const selectedItem = computed(() => {
    const selection = selectedKey();
    return selection != null ? collection().getItem(selection) : undefined;
  });

  return {
    collection,
    selectionManager,
    selectedKey,
    setSelectedKey,
    selectedItem,
  };
}
