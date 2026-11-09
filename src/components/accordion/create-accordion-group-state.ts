import type { Accessor } from "nsh";
import { computed } from "nsh";

import { createControllableSetSignal } from "../../primitives/create-controllable-signal";

import type { AccordionKey } from "./accordion-key";

/**
 * The accordion's expanded set, as React Stately's `useDisclosureGroupState`
 * keeps it (`react-stately@3.51.0`, `disclosure/src/useDisclosureGroupState.ts`,
 * the reference the port sheet makes authoritative over Kobalte's
 * `createListState`):
 *
 * - controlled through `expandedKeys`, otherwise `defaultExpandedKeys`;
 * - `allowsMultipleExpanded` decides whether a toggle adds or replaces;
 * - with one open item allowed, pressing the open item closes it (RAC's
 *   `toggleKey`: `new Set(prev.has(key) ? [] : [key])`), which is where
 *   Kobalte's default "cannot collapse" differs (§8).
 *
 * This file lives in the component's own directory on purpose: the batch rule
 * (`_common` §54) forbids new shared primitives from a unit.
 */
export interface AccordionGroupState {
  /** The open keys the accordion renders; the single-open trim already applied. */
  expandedKeys: Accessor<Set<AccordionKey>>;

  /** Whether several items may stay open. */
  allowsMultipleExpanded: Accessor<boolean>;

  /** Whether the rendered set holds `key`. */
  isExpanded: (key: AccordionKey) => boolean;

  /** Replaces the set, reporting it through `onExpandedChange`. */
  setExpandedKeys: (keys: Iterable<AccordionKey>) => void;

  /** One toggle of `key`, in React Stately's single / multiple semantics. */
  toggleKey: (key: AccordionKey) => void;
}

export interface CreateAccordionGroupStateProps {
  /** The controlled open keys. */
  expandedKeys?: Accessor<Iterable<AccordionKey> | undefined>;

  /** The initial open keys when uncontrolled (the empty set by default). */
  defaultExpandedKeys?: Accessor<Iterable<AccordionKey> | undefined>;

  /** Several items open at once. */
  allowsMultipleExpanded?: Accessor<boolean | undefined>;

  /** Called with a fresh `Set` whenever the user changes the set. */
  onExpandedChange?: (keys: Set<AccordionKey>) => void;
}

function toKeySet(
  keys: Iterable<AccordionKey> | undefined,
): Set<AccordionKey> | undefined {
  return keys === undefined ? undefined : new Set(keys);
}

export function createAccordionGroupState(
  props: CreateAccordionGroupStateProps,
): AccordionGroupState {
  const [expandedKeysState, setExpandedKeysState] = createControllableSetSignal<AccordionKey>({
    value: () => toKeySet(props.expandedKeys?.()),
    defaultValue: () => toKeySet(props.defaultExpandedKeys?.()) ?? new Set(),
    onChange: (keys) => props.onExpandedChange?.(new Set(keys)),
  });

  const allowsMultipleExpanded = () => props.allowsMultipleExpanded?.() ?? false;

  // The single-open trim: React Aria's `useDisclosureGroupState` keeps one key
  // with an effect that also calls `onExpandedChange` again; this port trims in
  // the render (port sheet §8: display-only, no second callback). The first key
  // in iteration order is the one RAC keeps.
  const renderedExpandedKeys = computed<Set<AccordionKey>>(() => {
    const keys = expandedKeysState();

    if (allowsMultipleExpanded() || keys.size <= 1) {
      return keys;
    }

    const [first] = keys;

    return new Set(first === undefined ? [] : [first]);
  });

  const isExpanded = (key: AccordionKey) => renderedExpandedKeys().has(key);

  const setExpandedKeys = (keys: Iterable<AccordionKey>) => {
    setExpandedKeysState(new Set(keys));
  };

  const toggleKey = (key: AccordionKey) => {
    const current = renderedExpandedKeys();
    const next: Set<AccordionKey> = allowsMultipleExpanded()
      ? current.has(key)
        ? new Set([...current].filter((entry) => entry !== key))
        : new Set([...current, key])
      : current.has(key)
        ? new Set()
        : new Set([key]);

    setExpandedKeysState(next);
  };

  return {
    expandedKeys: renderedExpandedKeys,
    allowsMultipleExpanded,
    isExpanded,
    setExpandedKeys,
    toggleKey,
  };
}
