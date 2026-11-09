import type { Accessor } from "nsh";

import type { AccordionKey } from "./accordion-key";

/**
 * The render prop values HeroUI hands an Accordion's `children`, `className`
 * and `style` (React Aria's `DisclosureGroupRenderProps` /
 * `DisclosureRenderProps`, port sheet §1). Every boolean is an accessor, as
 * research D17 fixes for Solid.
 */
export interface AccordionRenderProps {
  /** The group's `isDisabled`. */
  isDisabled: Accessor<boolean>;

  /** The group state, as React Stately's `DisclosureGroupState` facade. */
  state: ReactStatelyDisclosureGroupState;
}

/** The render prop values an Item hands its own `children`, `className` and `style`. */
export interface AccordionItemRenderProps {
  isExpanded: Accessor<boolean>;
  isFocusVisibleWithin: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  state: ReactStatelyDisclosureState;
}

/**
 * React Stately's `DisclosureGroupState`, reduced to what an Accordion can
 * express here: the set and its two transitions. The methods are the root's
 * own, so a caller driving the group from a render prop reaches the same state
 * the Trigger does.
 */
export interface ReactStatelyDisclosureGroupState {
  /** The open keys, trimmed for the single-open mode. */
  expandedKeys: Accessor<Set<AccordionKey>>;

  /** Whether several items may stay open. */
  allowsMultipleExpanded: Accessor<boolean>;

  /** Whether the rendered set holds `key`. */
  isExpanded: (key: AccordionKey) => boolean;

  /** Replaces the set and reports it through `onExpandedChange`. */
  setExpandedKeys: (keys: Iterable<AccordionKey>) => void;

  /** Toggles one key, in the single / multiple semantics. */
  toggleKey: (key: AccordionKey) => void;
}

/**
 * React Stately's `DisclosureState`, reduced to what a part can drive. The
 * full object also carries the collection and the item id; NSH has neither, so
 * these three members are the facade the port sheet §8 registers.
 */
export interface ReactStatelyDisclosureState {
  isExpanded: Accessor<boolean>;
  setExpanded: (isExpanded: boolean) => void;
  toggle: () => void;
}
