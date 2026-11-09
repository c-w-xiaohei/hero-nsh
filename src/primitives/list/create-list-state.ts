/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/list/create-list-state.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/bfce84fee12a027d9cbc38b43e1747e3e4b4b169/packages/@react-stately/list/src/useListState.ts
 *
 * Adapted to NSH: every input is an accessor, and the "reset the focused key
 * when its item is deleted" rule runs in an effect instead of during the
 * render pass (`createComputed` in Kobalte), since NSH renders must not write
 * state (research section 4.6).
 */

import { type Accessor, effect } from "nsh";

import {
  type CollectionBase,
  type CollectionNode,
  createCollection,
} from "../collection";
import {
  type CreateMultipleSelectionStateProps,
  SelectionManager,
  createMultipleSelectionState,
} from "../selection";
import { ListCollection } from "./list-collection";

export interface CreateListStateProps
  extends CollectionBase,
    CreateMultipleSelectionStateProps {
  /**
   * Accessor of a filter function that generates a filtered list of nodes.
   * Changing it (or a signal it reads) rebuilds the collection.
   */
  filter?: Accessor<
    ((nodes: Iterable<CollectionNode>) => Iterable<CollectionNode>) | undefined
  >;
}

export interface ListState {
  /** A collection of items in the list. */
  collection: Accessor<ListCollection>;

  /** A selection manager to read and update multiple selection state. */
  selectionManager: Accessor<SelectionManager>;
}

/**
 * Provides state management for list-like components.
 * Handles building a collection of items from props, and manages multiple
 * selection state.
 */
export function createListState(props: CreateListStateProps): ListState {
  const selectionState = createMultipleSelectionState(props);

  const factory = (nodes: Iterable<CollectionNode>) => {
    const filter = props.filter?.();

    return filter ? new ListCollection(filter(nodes)) : new ListCollection(nodes);
  };

  const collection = createCollection({
    dataSource: props.dataSource,
    getKey: props.getKey,
    getTextValue: props.getTextValue,
    getDisabled: props.getDisabled,
    getSectionChildren: props.getSectionChildren,
    factory,
  });

  const selectionManager = new SelectionManager(collection, selectionState);

  // Reset the focused key if its item was deleted from the collection.
  effect(() => {
    const focusedKey = selectionState.focusedKey();

    if (focusedKey != null && !collection().getItem(focusedKey)) {
      selectionState.setFocusedKey(undefined);
    }
  });

  return {
    collection,
    selectionManager: () => selectionManager,
  };
}
