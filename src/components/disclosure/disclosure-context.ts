import { context } from "nsh";
import type { Accessor } from "nsh";

/**
 * React Stately's `DisclosureState`
 * (`react-stately/useDisclosureState`), with accessors instead of plain values
 * (research D17). `Disclosure.Root`'s render props hand this object to callers,
 * so the names are the upstream ones.
 */
export interface DisclosureState {
  /** Whether the disclosure is expanded right now. */
  isExpanded: Accessor<boolean>;

  /** Sets the expanded state; in a group the group's set hears it. */
  setExpanded: (isExpanded: boolean) => void;

  /** Expands the panel. */
  expand: () => void;

  /** Collapses the panel. */
  collapse: () => void;

  /** Flips the expanded state. */
  toggle: () => void;
}

/**
 * What one `Disclosure.Root` hands to its parts.
 *
 * HeroUI reaches the same information through React context
 * (`DisclosureStateContext`) and CSS descendant selectors
 * (`[data-expanded="true"] .disclosure__indicator`). NSH has neither `data-*`
 * projection nor descendant selectors, so the state and the expanded flag
 * travel through this context: the root owns them, the Trigger writes the
 * interaction signals it observes, and the Content / Indicator read them (port
 * sheet §2 and §4).
 *
 * Internal: not exported from the public entry, exactly as HeroUI's own
 * `DisclosureStateContext` is not.
 */
export interface DisclosureContextValue {
  /** The effective expanded state: the group's key set, else `isExpanded`. */
  isExpanded: Accessor<boolean>;

  /** The effective disabled state: the group's, or the root's own. */
  isDisabled: Accessor<boolean>;

  /**
   * Whether the keyboard focus is inside the disclosure, as
   * `useFocusRing({ within: true })` reports it. Only the Trigger can register
   * (a view has no `focus-within` event), so links inside the panel are not
   * covered (port sheet §8).
   */
  isFocusVisibleWithin: Accessor<boolean>;

  /** The render-prop form of React Stately's `DisclosureState`. */
  state: DisclosureState;

  /** Flips the expanded state; the Trigger's press runs this first. */
  toggle: () => void;

  /** A part registers its focus-visible signal; the returned function removes it. */
  registerFocusVisible: (focusVisible: Accessor<boolean>) => () => void;
}

/**
 * What a part sees when it is rendered outside a `Disclosure.Root`. HeroUI's
 * parts read the state context unconditionally and would throw; NSH keeps the
 * tree rendering, so a lone part shows the collapsed resting state instead. It
 * holds no mutable value, so sharing it between instances cannot leak state.
 */
export const FALLBACK_DISCLOSURE_CONTEXT: DisclosureContextValue = {
  isExpanded: () => false,
  isDisabled: () => false,
  isFocusVisibleWithin: () => false,
  state: {
    isExpanded: () => false,
    setExpanded: () => {},
    expand: () => {},
    collapse: () => {},
    toggle: () => {},
  },
  toggle: () => {},
  registerFocusVisible: () => () => {},
};

export const DisclosureContext = context<DisclosureContextValue | undefined>(undefined);
