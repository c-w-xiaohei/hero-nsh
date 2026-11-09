/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/list/create-selectable-list.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/8f2f2acb3d5850382ebe631f055f88c704aa7d17/packages/@react-aria/selection/src/useSelectableList.ts
 *
 * Redesigned for NSH: Kobalte builds the default `ListKeyboardDelegate` from
 * two element refs (the collection and its scroller). There is no element
 * here. This primitive owns a layout registry instead, and the component feeds
 * it from `onLayout`: one call per item, one for the viewport. The returned
 * `register*` functions are the whole DOM contract.
 */

import { type Accessor, computed } from "nsh";
import type { Bounds } from "nsh";

import type { Collection, CollectionNode } from "../collection";
import {
  type CreateSelectableCollectionProps,
  type KeyboardDelegate,
  type SelectableCollectionState,
  type StringCollator,
  createSelectableCollection,
} from "../selection";
import { defaultStringCollator } from "../selection";
import {
  type CollectionLayout,
  createCollectionLayout,
} from "./collection-layout";
import { ListKeyboardDelegate } from "./list-keyboard-delegate";

export interface CreateSelectableListProps
  extends Omit<CreateSelectableCollectionProps, "keyboardDelegate"> {
  /** The collection of the list. */
  collection: Accessor<Collection<CollectionNode>>;

  /** A delegate that returns collection item keys with respect to visual layout. */
  keyboardDelegate?: Accessor<KeyboardDelegate | undefined>;

  /** Locale-aware comparison for typeahead (default: `defaultStringCollator`). */
  collator?: Accessor<StringCollator | undefined>;
}

export interface SelectableListState extends SelectableCollectionState {
  /**
   * Reports one item's frame. Wire it inside the item view:
   * `onLayout={(e) => list.registerItemLayout(key, e.bounds)}`. When the item
   * sits inside a section, pass the section's key too, so the two frames are
   * composed into collection coordinates (see `collection-layout.ts`).
   */
  registerItemLayout(key: string, bounds: Bounds, sectionKey?: string): void;

  /** Forgets an item's frame when its view unmounts. */
  unregisterItemLayout(key: string): void;

  /**
   * Reports a section's frame, measured in the collection content:
   * `onLayout={(e) => list.registerSectionLayout(sectionKey, e.bounds)}`.
   */
  registerSectionLayout(sectionKey: string, bounds: Bounds): void;

  /** Forgets a section's frame when its view unmounts. */
  unregisterSectionLayout(sectionKey: string): void;

  /**
   * Reports the collection viewport's frame. Wire it to the view that clips
   * the items: `onLayout={(e) => list.registerContainerLayout(e.bounds)}`.
   */
  registerContainerLayout(bounds: Bounds): void;

  /** The frame store, for a component that wants to read heights itself. */
  layout: CollectionLayout;
}

/**
 * Handles interactions with a selectable list: selection, keyboard navigation,
 * focus stop and the layout the page keys need.
 */
export function createSelectableList(
  props: CreateSelectableListProps,
): SelectableListState {
  const layout = createCollectionLayout();

  // Kobalte's default delegate queries the DOM with the collection and scroll
  // refs. This one reads the frames the views reported.
  const delegate = computed<KeyboardDelegate>(
    () =>
      props.keyboardDelegate?.() ??
      new ListKeyboardDelegate(props.collection, {
        collator: () => props.collator?.() ?? defaultStringCollator,
        disabledBehavior: () => props.selectionManager().disabledBehavior(),
        getItemLayout: layout.getItemLayout,
        getContainerHeight: layout.containerHeight,
        getContentHeight: layout.contentHeight,
      }),
  );

  const state = createSelectableCollection({
    selectionManager: props.selectionManager,
    keyboardDelegate: delegate,
    autoFocus: props.autoFocus,
    shouldFocusWrap: props.shouldFocusWrap,
    disallowEmptySelection: props.disallowEmptySelection,
    disallowSelectAll: props.disallowSelectAll,
    selectOnFocus: props.selectOnFocus,
    disallowTypeAhead: props.disallowTypeAhead,
    shouldUseVirtualFocus: props.shouldUseVirtualFocus,
    isVirtualized: props.isVirtualized,
    scrollToKey: props.scrollToKey,
    scrollToItem: props.scrollToItem,
    focusCollection: props.focusCollection,
    orientation: props.orientation,
    direction: props.direction,
    enterFrom: props.enterFrom,
  });

  return {
    ...state,
    registerItemLayout: layout.setItemLayout,
    unregisterItemLayout: layout.removeItemLayout,
    registerSectionLayout: layout.setSectionLayout,
    unregisterSectionLayout: layout.removeSectionLayout,
    registerContainerLayout: layout.setContainerLayout,
    layout,
  };
}
