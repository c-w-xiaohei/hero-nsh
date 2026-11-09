/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/primitives/create-collection/get-item-count.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/22cb32d329e66c60f55d4fc4025d1d44bb015d71/packages/@react-stately/collections/src/getItemCount.ts
 */

import type { CollectionNode } from "./types";

const cache = new WeakMap<Iterable<unknown>, number>();

/** The number of `"item"` nodes (sections do not count) in a built collection. */
export function getItemCount(collection: Iterable<CollectionNode>): number {
  let count = cache.get(collection);
  if (count != null) {
    return count;
  }

  count = 0;
  for (const item of collection) {
    if (item.type === "item") {
      count++;
    }
  }

  cache.set(collection, count);
  return count;
}
