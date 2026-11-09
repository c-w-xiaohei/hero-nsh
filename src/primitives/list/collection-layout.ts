/*
 * The NSH replacement for Kobalte's `createDomCollection` layout side: Kobalte
 * reads item frames straight from the DOM (`offsetTop`, `offsetHeight`,
 * `scrollHeight`, `querySelector`). NSH has no DOM and no element queries, so
 * frames are reported in by the rendered views themselves:
 *
 *   <View onLayout={(e) => list.registerItemLayout(key, e.bounds)} />
 *
 * The registry is a primitive-owned store: each call replaces a signal value,
 * so a component that reads `containerHeight()` follows it, and the keyboard
 * delegate that reads it inside a key handler sees the latest frames.
 *
 * Coordinates are the ones `onLayout` gives: `bounds.origin` is measured in the
 * item's parent. Items of one collection must be laid out in one parent (the
 * item stack inside the scroller), because page up/down compares their `y`.
 */

import { type Accessor, computed, signal } from "nsh";
import type { Bounds } from "nsh";

import type { ItemLayout } from "../collection";

export interface CollectionLayout {
  /** Reports one item's frame from its view's `onLayout`. */
  setItemLayout(key: string, bounds: Bounds): void;

  /** Forgets an item's frame when its view goes away. */
  removeItemLayout(key: string): void;

  /** Reports the collection viewport's frame from the collection view's `onLayout`. */
  setContainerLayout(bounds: Bounds): void;

  /** The latest frame of one item, if it has one. */
  getItemLayout(key: string): ItemLayout | undefined;

  /** The viewport's height: how much fits on one page. */
  containerHeight: Accessor<number | undefined>;

  /** The bottom of the lowest reported item: how far the content reaches. */
  contentHeight: Accessor<number | undefined>;
}

function toItemLayout(bounds: Bounds): ItemLayout {
  return {
    x: bounds.origin.x,
    y: bounds.origin.y,
    width: bounds.size.width,
    height: bounds.size.height,
  };
}

/** Creates the frame store a keyboard delegate reads page up/down from. */
export function createCollectionLayout(): CollectionLayout {
  const items = signal<ReadonlyMap<string, ItemLayout>>(new Map());
  const container = signal<ItemLayout | undefined>(undefined);

  const setItemLayout = (key: string, bounds: Bounds) => {
    const next = new Map(items());
    next.set(key, toItemLayout(bounds));
    items.set(next);
  };

  const removeItemLayout = (key: string) => {
    if (!items().has(key)) {
      return;
    }

    const next = new Map(items());
    next.delete(key);
    items.set(next);
  };

  const setContainerLayout = (bounds: Bounds) => {
    container.set(toItemLayout(bounds));
  };

  const getItemLayout = (key: string) => items().get(key);

  const containerHeight = computed(() => container()?.height);

  const contentHeight = computed(() => {
    let bottom: number | undefined;

    for (const item of items().values()) {
      const itemBottom = item.y + item.height;

      if (bottom == null || itemBottom > bottom) {
        bottom = itemBottom;
      }
    }

    return bottom;
  });

  return {
    setItemLayout,
    removeItemLayout,
    setContainerLayout,
    getItemLayout,
    containerHeight,
    contentHeight,
  };
}
