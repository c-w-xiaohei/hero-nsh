/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/primitives/create-collection/create-collection.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/bfce84fee12a027d9cbc38b43e1747e3e4b4b169/packages/@react-stately/collections/src/useCollection.ts
 *
 * Adapted to NSH: there is no `props` proxy to subscribe to, so every accessor
 * is read inside the memo itself and every change (the data source, a getter,
 * the filter the factory reads) rebuilds the collection. Kobalte's extra
 * `deps` array existed only to make Solid track props it could not see through
 * `access`; here the accessors are the subscription.
 */

import { type Accessor, computed } from "nsh";

import type { Collection, CollectionBase, CollectionNode } from "./types";
import { buildNodes } from "./build-nodes";

export type CollectionFactory<C extends Collection<CollectionNode>> = (
  nodes: Iterable<CollectionNode>,
) => C;

export interface CreateCollectionProps<C extends Collection<CollectionNode>>
  extends CollectionBase {
  /** Builds the caller's collection type from the flattened nodes. */
  factory: CollectionFactory<C>;
}

/**
 * Builds a collection from a data source. It is a `computed`, so the result is
 * rebuilt only when one of the accessors it reads changes, and every item that
 * reads `collection()` sees the same value within a render.
 */
export function createCollection<C extends Collection<CollectionNode>>(
  props: CreateCollectionProps<C>,
): Accessor<C> {
  return computed(() => {
    const nodes = buildNodes({
      dataSource: props.dataSource(),
      getKey: props.getKey?.(),
      getTextValue: props.getTextValue?.(),
      getDisabled: props.getDisabled?.(),
      getSectionChildren: props.getSectionChildren?.(),
    });

    return props.factory(nodes);
  });
}
