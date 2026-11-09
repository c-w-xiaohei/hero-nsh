/*
 * The NSH replacement for Kobalte's `createDomCollection` layout side: Kobalte
 * reads item frames straight from the DOM (`offsetTop`, `offsetHeight`,
 * `scrollHeight`, `querySelector`). NSH has no DOM and no element queries, so
 * frames are reported in by the rendered views themselves:
 *
 *   <View onLayout={(e) => list.registerItemLayout(key, e.bounds, sectionKey)} />
 *
 * `Bounds.origin` is relative to the view's parent, and a section is a parent
 * of its items. An item inside a section therefore starts again at `y = 0`,
 * so page up/down would compare unrelated coordinates (and usually do
 * nothing). A section reports its own frame with `registerSectionLayout`; the
 * item's `sectionKey` composes the two into a collection-relative position:
 *
 *   <View onLayout={(e) => list.registerSectionLayout(section.key, e.bounds)}>
 *     <View onLayout={(e) => list.registerItemLayout(item.key, e.bounds, section.key)} />
 *   </View>
 *
 * One level is composed: item frame + its section's frame. The section frame
 * itself is relative to the collection content (the section's parent), which
 * is the coordinate space page up/down compares against. If the views nest
 * deeper, the component reports each item with the section whose frame is
 * measured directly above the item stack.
 *
 * The registry is a primitive-owned store: each call replaces a signal value,
 * so a component that reads `containerHeight()` follows it, and the keyboard
 * delegate that reads it inside a key handler sees the latest frames.
 */

import { type Accessor, computed, signal } from "nsh";
import type { Bounds } from "nsh";

import type { ItemLayout } from "../collection";

/** One reported item and the section it was measured in, if any. */
interface RegisteredItem {
  layout: ItemLayout;
  sectionKey?: string;
}

export interface CollectionLayout {
  /**
   * Reports one item's frame from its view's `onLayout`. Pass the section key
   * when the item sits inside a registered section.
   */
  setItemLayout(key: string, bounds: Bounds, sectionKey?: string): void;

  /** Forgets an item's frame when its view goes away. */
  removeItemLayout(key: string): void;

  /** Reports a section's frame from its view's `onLayout`. */
  setSectionLayout(sectionKey: string, bounds: Bounds): void;

  /** Forgets a section's frame when its view goes away. */
  removeSectionLayout(sectionKey: string): void;

  /** Reports the collection viewport's frame (its height is one page). */
  setContainerLayout(bounds: Bounds): void;

  /** The latest frame of one item, in collection coordinates. */
  getItemLayout(key: string): ItemLayout | undefined;

  /** The viewport's height: how much fits on one page. */
  containerHeight: Accessor<number | undefined>;

  /** The bottom of the lowest reported item or section. */
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
  const items = signal<ReadonlyMap<string, RegisteredItem>>(new Map());
  const sections = signal<ReadonlyMap<string, ItemLayout>>(new Map());
  const container = signal<ItemLayout | undefined>(undefined);

  const setItemLayout = (
    key: string,
    bounds: Bounds,
    sectionKey?: string,
  ) => {
    const next = new Map(items());
    next.set(key, { layout: toItemLayout(bounds), sectionKey });
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

  const setSectionLayout = (sectionKey: string, bounds: Bounds) => {
    const next = new Map(sections());
    next.set(sectionKey, toItemLayout(bounds));
    sections.set(next);
  };

  const removeSectionLayout = (sectionKey: string) => {
    if (!sections().has(sectionKey)) {
      return;
    }

    const next = new Map(sections());
    next.delete(sectionKey);
    sections.set(next);
  };

  const setContainerLayout = (bounds: Bounds) => {
    container.set(toItemLayout(bounds));
  };

  const getItemLayout = (key: string) => {
    const entry = items().get(key);

    if (!entry) {
      return undefined;
    }

    const offset = entry.sectionKey
      ? sections().get(entry.sectionKey)
      : undefined;

    if (!offset) {
      return entry.layout;
    }

    return {
      x: entry.layout.x + offset.x,
      y: entry.layout.y + offset.y,
      width: entry.layout.width,
      height: entry.layout.height,
    };
  };

  const containerHeight = computed(() => container()?.height);

  const contentHeight = computed(() => {
    let bottom: number | undefined;

    const itemEntries = items();
    const sectionEntries = sections();

    for (const entry of itemEntries.values()) {
      const offset = entry.sectionKey
        ? sectionEntries.get(entry.sectionKey)
        : undefined;
      const itemBottom =
        entry.layout.y + (offset?.y ?? 0) + entry.layout.height;

      if (bottom == null || itemBottom > bottom) {
        bottom = itemBottom;
      }
    }

    for (const section of sectionEntries.values()) {
      const sectionBottom = section.y + section.height;

      if (bottom == null || sectionBottom > bottom) {
        bottom = sectionBottom;
      }
    }

    return bottom;
  });

  return {
    setItemLayout,
    removeItemLayout,
    setSectionLayout,
    removeSectionLayout,
    setContainerLayout,
    getItemLayout,
    containerHeight,
    contentHeight,
  };
}
