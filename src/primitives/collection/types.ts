/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/primitives/create-collection/types.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/bfce84fee12a027d9cbc38b43e1747e3e4b4b169/packages/@react-types/shared/src/collections.d.ts
 *
 * Adapted to NSH: every input is an accessor (research section 4.4) and the
 * only host concept left is a measurable frame, reported by `onLayout`.
 */

import type { Accessor } from "nsh";

/** The minimal description of one collection entry. */
export interface CollectionItem {
  /** The type of the item. */
  type: "item" | "section";

  /** A unique key for the item. */
  key: string;

  /** A string value for the item, used for features like typeahead. */
  textValue: string;

  /** Whether the item is disabled. */
  disabled: boolean;
}

/** A node of a built collection: an item or a section, in display order. */
export interface CollectionNode<T = any> {
  /** The type of item this node represents. */
  type: "item" | "section";

  /** A unique key for the node. A section has no key of its own. */
  key: string;

  /** The source object this node was created from. */
  rawValue: T;

  /** A string value for the node, used for features like typeahead. */
  textValue: string;

  /** Whether the node is disabled. */
  disabled: boolean;

  /** The level of depth this node is at in the hierarchy. */
  level: number;

  /** The index of this node within its parent, counting items only. */
  index: number;

  /** The key of the node before this node. Set by `ListCollection`. */
  prevKey?: string;

  /** The key of the node after this node. Set by `ListCollection`. */
  nextKey?: string;
}

/**
 * What a collection is built from. Every field is an accessor: a component
 * passes its props through, and the collection follows them.
 */
export interface CollectionBase {
  /** The source data to be managed by the collection. */
  dataSource: Accessor<Array<any>>;

  /** Property name or getter function to use as the key of an item. */
  getKey?: Accessor<string | ((data: any) => string) | undefined>;

  /** Property name or getter function to use as the text value of an item for typeahead. */
  getTextValue?: Accessor<string | ((data: any) => string) | undefined>;

  /** Property name or getter function to use as the disabled flag of an item. */
  getDisabled?: Accessor<string | ((data: any) => boolean) | undefined>;

  /** Property name or getter function that refers to the children items of a section. */
  getSectionChildren?: Accessor<
    string | ((section: any) => any[]) | undefined
  >;
}

/** A readonly, ordered collection of uniquely keyed nodes. */
export interface Collection<T> extends Iterable<T> {
  /** The number of nodes in the collection. */
  getSize: () => number;

  /** Iterate over all keys in the collection. */
  getKeys: () => Iterable<string>;

  /** Get a node by its key. */
  getItem: (key: string) => T | undefined;

  /** Get a node by the index of its key. */
  at: (idx: number) => T | undefined;

  /** Get the key that comes before the given key in the collection. */
  getKeyBefore: (key: string) => string | undefined;

  /** Get the key that comes after the given key in the collection. */
  getKeyAfter: (key: string) => string | undefined;

  /** Get the first key in the collection. */
  getFirstKey: () => string | undefined;

  /** Get the last key in the collection. */
  getLastKey: () => string | undefined;
}

/**
 * One item's frame, as its view reported it through `onLayout`: `x` and `y`
 * are measured from the top left corner of the item's parent, exactly as
 * `Bounds` gives them (`x` is the inline axis, `y` the block axis).
 */
export interface ItemLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}
