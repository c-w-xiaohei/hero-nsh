import type { Accessor } from "nsh";
import { computed } from "nsh";

import type { DisclosureGroupKey } from "./disclosure-context";

const EMPTY_ITEM_IDS: string[] = [];
const EMPTY_KEYS: Set<DisclosureGroupKey> = new Set();

/**
 * A value the caller may pass as a plain value or as an accessor. HeroUI's hook
 * takes plain values; a Solid component body runs once, so a plain value would
 * freeze (research D17). Accessors are the documented form and a plain value is
 * still accepted, so the upstream call shape keeps working.
 */
export type DisclosureGroupNavigationValue<T> = T | Accessor<T>;

function read<T>(value: DisclosureGroupNavigationValue<T> | undefined, fallback: T): T {
  if (value === undefined) {
    return fallback;
  }

  return typeof value === "function" ? (value as Accessor<T>)() : value;
}

/**
 * HeroUI 3.2.7 `UseDisclosureGroupNavigationProps`
 * (`packages/react/src/components/disclosure-group/use-disclosure-group-navigation.ts`),
 * with the state inputs as accessors (D17).
 */
export interface UseDisclosureGroupNavigationProps {
  /** The expanded keys; the earliest expanded item decides the index. */
  expandedKeys: DisclosureGroupNavigationValue<Set<DisclosureGroupKey>>;

  /** The item keys, in render order. */
  itemIds?: DisclosureGroupNavigationValue<string[]>;

  /** Called with the next set when a direction moves the expanded item. */
  onExpandedChange: (keys: Set<DisclosureGroupKey>) => void;

  /** Whether a move adds to the set instead of replacing it. @default false */
  allowsMultipleExpanded?: DisclosureGroupNavigationValue<boolean>;
}

/** HeroUI's `UseDisclosureGroupNavigationReturn`, with accessors (D17). */
export interface UseDisclosureGroupNavigationReturn {
  /** The index of the first expanded item, else of the first item; `-1` with no items. */
  currentIndex: Accessor<number>;

  /** Whether Previous has nowhere to go. */
  isPrevDisabled: Accessor<boolean>;

  /** Whether Next has nowhere to go. */
  isNextDisabled: Accessor<boolean>;

  /** Expands the item before the current one. */
  onPrevious: () => void;

  /** Expands the item after the current one. */
  onNext: () => void;
}

/**
 * The keyboard-free navigation HeroUI pairs with a DisclosureGroup: Previous /
 * Next buttons move the expanded item along `itemIds`, without touching focus
 * or the DOM. Kobalte has no counterpart, so the 30-line computation is ported
 * straight from HeroUI 3.2.7 — `useMemo` / `useCallback` become `computed` and
 * closures, and nothing here touches a view.
 *
 * The three upstream rules are kept exactly: keys that are not in `itemIds` are
 * ignored, the earliest expanded item wins when several are open, and an empty
 * set falls back to the first item. In multiple mode a move **adds** the target
 * key to the existing set; in single mode it replaces the set with `{target}`.
 */
export function useDisclosureGroupNavigation(
  props: UseDisclosureGroupNavigationProps,
): UseDisclosureGroupNavigationReturn {
  const items = () => read(props.itemIds, EMPTY_ITEM_IDS);
  const expandedKeys = () => read(props.expandedKeys, EMPTY_KEYS);
  const allowsMultipleExpanded = () => read(props.allowsMultipleExpanded, false);

  const currentIndex = computed(() => {
    const itemIds = items();

    if (itemIds.length === 0) {
      return -1;
    }

    const expandedItems = itemIds.filter((id) => expandedKeys().has(id));
    const currentItem = expandedItems.length > 0 ? expandedItems[0] : itemIds[0];

    if (!currentItem) {
      return -1;
    }

    return itemIds.indexOf(currentItem);
  });

  const move = (offset: -1 | 1) => {
    const itemIds = items();
    const index = currentIndex();
    const target = itemIds[index + offset];

    if (index < 0 || !target) {
      return;
    }

    if (allowsMultipleExpanded()) {
      const next = new Set(expandedKeys());

      next.add(target);
      props.onExpandedChange(next);

      return;
    }

    props.onExpandedChange(new Set([target]));
  };

  const onPrevious = () => {
    if (currentIndex() <= 0) {
      return;
    }

    move(-1);
  };

  const onNext = () => {
    if (currentIndex() >= items().length - 1) {
      return;
    }

    move(1);
  };

  return {
    currentIndex,
    isPrevDisabled: computed(() => currentIndex() <= 0),
    isNextDisabled: computed(() => currentIndex() >= items().length - 1),
    onPrevious,
    onNext,
  };
}
