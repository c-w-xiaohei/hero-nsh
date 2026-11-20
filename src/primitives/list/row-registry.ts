/*
 * f-collection, mounted side: the registry of the rows that exist right now.
 * The data side (`toListItemData` → `createListState`) holds the complete
 * collection; this side holds only what needs a mounted view — activation,
 * the ref a screen reader focus lands on, and the `children` a Select value
 * re-places. The registry deliberately does not know those fields: `D` is the
 * row's own contract, keyed on the same domain as collection node keys.
 *
 * It is reactive on purpose: the merged data source subscribes to `keys()`
 * (a mounted row can override its datum) and unmounting a row rebuilds the
 * collection with the override dropped, while the datum itself stays.
 */

import { signal } from "nsh";

/**
 * A keyed store of mounted-row handles. `register` returns the unregister
 * function; registering the same key again replaces the earlier handle, and
 * the earlier unregister then does nothing (it must not remove the newer
 * handle).
 */
export interface RowRegistry<D extends { key: string }> {
  /** Puts `handle` under `handle.key`; returns the function that removes it. */
  register: (handle: D) => () => void;

  /** The handle mounted under `key`, or `undefined` while it is not. */
  get: (key: string) => D | undefined;

  /** Whether a handle is mounted under `key`. */
  has: (key: string) => boolean;

  /** Every mounted key, in registration order. */
  keys: () => string[];

  /** How many rows are mounted. */
  size: () => number;
}

/** Creates the mounted-row store one collection-owning root keeps. */
export function createRowRegistry<D extends { key: string }>(): RowRegistry<D> {
  const rows = signal<ReadonlyMap<string, D>>(new Map());

  const register = (handle: D) => {
    const next = new Map(rows());
    next.set(handle.key, handle);
    rows.set(next);

    return () => {
      // Only the same handle unregisters: a later register() under this key
      // replaced it, and this stale unregister must not remove the new row.
      if (rows().get(handle.key) !== handle) {
        return;
      }

      const remaining = new Map(rows());
      remaining.delete(handle.key);
      rows.set(remaining);
    };
  };

  return {
    register,
    get: (key) => rows().get(key),
    has: (key) => rows().has(key),
    keys: () => [...rows().keys()],
    size: () => rows().size,
  };
}
