import { context } from "nsh";
import type { Accessor } from "nsh";

/**
 * A disclosure's identity inside a group: React Aria's `Key`, the value its
 * `id` prop and the group's `expandedKeys` set are keyed by.
 */
export type DisclosureGroupKey = string | number;

/**
 * React Stately's `DisclosureGroupState`
 * (`react-stately/useDisclosureGroupState`), with accessors (research D17).
 *
 * HeroUI's group is no accordion: it owns one `expandedKeys` set and nothing
 * else. There is no item registry, no roving focus and no arrow-key handling,
 * so no Kobalte `createListState` / `createSelectableList` is involved (port
 * sheet §3, criteria B1 / B3 / B4).
 */
export interface DisclosureGroupState {
  /**
   * The keys of the expanded disclosures, in insertion order. In single mode
   * it never holds more than one key (React Stately normalizes the set).
   */
  expandedKeys: Accessor<Set<DisclosureGroupKey>>;

  /**
   * Replaces the expanded-key set, as React Stately's
   * `DisclosureGroupState.setExpandedKeys` does; `onExpandedChange` receives the
   * resulting set. In single mode a set of several keys collapses to its first
   * key.
   */
  setExpandedKeys: (keys: Set<DisclosureGroupKey>) => void;

  /** Whether more than one disclosure may be open at once. */
  allowsMultipleExpanded: Accessor<boolean>;

  /** Whether every trigger inside the group is disabled. */
  isDisabled: Accessor<boolean>;

  /**
   * Flips one key. Single mode replaces the set with `{key}`, or empties it
   * when the key is already there — the opposite of Kobalte's
   * `collapsible={false}` accordion, and HeroUI wins (port sheet §5).
   */
  toggleKey: (key: DisclosureGroupKey) => void;
}

/**
 * What `DisclosureGroup.Root` hands to the disclosures inside it. Internal:
 * not exported from the public entry, as HeroUI's own
 * `DisclosureGroupStateContext` is not.
 */
export type DisclosureGroupContextValue = DisclosureGroupState;

export const DisclosureGroupContext = context<DisclosureGroupContextValue | undefined>(
  undefined,
);
