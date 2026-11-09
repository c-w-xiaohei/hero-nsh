import type { Accessor } from "nsh";
import { context } from "nsh";

import type { accordionVariants } from "./accordion.styles";
import type { AccordionVariants } from "./accordion.styles";
import type { AccordionKey } from "./accordion-key";
import type { ReactStatelyDisclosureState } from "./accordion-types";
import type { AccordionGroupState } from "./create-accordion-group-state";

/** The slot functions of the variant table, for the resolved variant. */
export type AccordionSlots = ReturnType<typeof accordionVariants>;

/** What the Accordion root hands every part (port sheet §2). */
export interface AccordionContextValue {
  /** The variant table's slot functions for the resolved variant. */
  slots: Accessor<AccordionSlots>;

  /** `props.variant ?? "default"`. */
  variant: Accessor<NonNullable<AccordionVariants["variant"]>>;

  /** `props.hideSeparator ?? false`. */
  hideSeparator: Accessor<boolean>;

  /** The group-level `isDisabled`. */
  isDisabled: Accessor<boolean>;

  /** The expanded set and its two transitions. */
  state: AccordionGroupState;

  /** Whether the rendered set holds `key`. */
  isExpanded: (key: AccordionKey) => boolean;

  /** Registers an item's key in written (creation) order, for first / last. */
  registerItem: (key: AccordionKey) => void;

  /** Releases a registration on unmount. */
  unregisterItem: (key: AccordionKey) => void;

  /** A fresh, stable key for an Item that was given no `id`. */
  createItemKey: () => AccordionKey;

  /** The item registered first still mounted. */
  isFirstItem: (key: AccordionKey) => boolean;

  /** The item registered last still mounted. */
  isLastItem: (key: AccordionKey) => boolean;
}

/** What an Accordion Item hands its Heading, Trigger, Panel and Indicator. */
export interface AccordionItemContextValue {
  /** The item's key in the root's expanded set. */
  itemKey: AccordionKey;

  /** Whether the item is open, read from the root's rendered set. */
  isExpanded: Accessor<boolean>;

  /** The group's `isDisabled` or the item's own. */
  isDisabled: Accessor<boolean>;

  /** The item is the first registered one (surface trigger radius, R-034). */
  isFirst: Accessor<boolean>;

  /** The item is the last registered one (separator R-012, radius R-035). */
  isLast: Accessor<boolean>;

  /** The Trigger holds a keyboard focus (RAC's `isFocusVisibleWithin`). */
  isFocusVisibleWithin: Accessor<boolean>;

  /** The Disclosure state facade handed to render props (port sheet §1). */
  state: ReactStatelyDisclosureState;

  /** One activation: toggles the group and reports the item's own callback. */
  toggle: () => void;

  /**
   * The Trigger reports its `isFocusVisible` here, the port's stand-in for
   * `useFocusRing({ within: true })` (port sheet §8).
   */
  registerTriggerFocusVisible: (value: Accessor<boolean>) => void;

  /**
   * The Trigger registers its accessible name here; the Panel uses it as its
   * `accessibilityLabel`, since NSH has no `aria-labelledby` (port sheet §8).
   */
  registerTriggerLabel: (value: Accessor<string | undefined>) => void;

  /** The name the Trigger registered, if any. */
  triggerLabel: Accessor<string | undefined>;
}

/** The root's context. Outside an Accordion it is `undefined`; parts render nothing. */
export const AccordionContext = context<AccordionContextValue | undefined>(undefined);

/** The item's context. Outside an Accordion Item it is `undefined`. */
export const AccordionItemContext = context<AccordionItemContextValue | undefined>(undefined);
