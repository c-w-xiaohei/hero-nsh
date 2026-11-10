import type { Accessor, Bounds, Size } from "nsh";
import { context } from "nsh";

import type { ListCollection } from "../../primitives/list";
import type { SelectionManager } from "../../primitives/selection";
import type { tabsVariants } from "./tabs.styles";

/** The slot functions of the variant table, shared by every part (R-042). */
export type TabsSlots = ReturnType<typeof tabsVariants>;

/** HeroUI's `orientation`, default `"horizontal"`. */
export type TabsOrientation = "horizontal" | "vertical";

/** HeroUI's `keyboardActivation`, default `"automatic"`. */
export type TabsKeyboardActivation = "automatic" | "manual";

/** HeroUI's `variant`, default `"primary"`. */
export type TabsVariant = "primary" | "secondary";

/** HeroUI's `align`, default `"center"`. */
export type TabsAlign = "center" | "start" | "end";

/** One tab as the root's registry knows it (Kobalte's collected DOM item). */
export interface TabsTabDescriptor {
  /** The encoded key (see `tabs-key.ts`). */
  key: string;

  /** The tab's own `isDisabled`; the root's flags are folded in when the collection is built. */
  isDisabled: Accessor<boolean>;
}

/** What the root provides to every part. */
export interface TabsContextValue {
  /** R-042: the variant table with this instance's `align` / `variant` / `orientation`. */
  slots: Accessor<TabsSlots>;

  orientation: Accessor<TabsOrientation>;

  variant: Accessor<TabsVariant>;

  align: Accessor<TabsAlign>;

  /**
   * The root's `dir`, when the caller named one. NSH cannot read an inherited
   * layout direction, so `undefined` means "unknown" and the parts fall back to
   * left to right (port sheet §8).
   */
  dir: Accessor<"ltr" | "rtl" | undefined>;

  /** The whole group is disabled (`Tabs.Root`'s `isDisabled`). */
  isDisabled: Accessor<boolean>;

  /** `automatic` selects while the focus moves; `manual` waits for Return / Space. */
  keyboardActivation: Accessor<TabsKeyboardActivation>;

  /** The selected key, encoded; `undefined` before the first-tab fallback runs. */
  selectedKey: Accessor<string | undefined>;

  /** Selects an encoded key (the controlled prop still wins). */
  setSelectedKey: (key: string) => void;

  /** Whether the tab registered before `key` is selected (R-035). */
  isPreviousTabSelected: (key: string) => boolean;

  collection: Accessor<ListCollection>;

  selectionManager: Accessor<SelectionManager>;

  /** Registers a tab; the returned function unregisters it (research 4.2). */
  registerTab: (descriptor: TabsTabDescriptor) => () => void;

  /** Hands out a key for a `Tabs.Tab` written without `id`. */
  createTabKey: () => string;

  /** The tab's frame in the tab list, reported by its `onLayout`. */
  bounds: (key: string) => Bounds | undefined;

  /** Reports a tab's frame; called from `Tabs.Tab`'s `onLayout`. */
  registerBounds: (key: string, bounds: Bounds) => void;

  /** Forgets a tab's frame when that tab unmounts. */
  unregisterBounds: (key: string) => void;

  /**
   * The tab selected before the current one, which the newly mounted indicator
   * uses as its starting position (R-056). It changes once per selection.
   */
  transitionSource: Accessor<string | undefined>;

  /**
   * HeroUI's `isIndicatorReady`: false until the first frame after mount, so
   * the first indicator paints at its final place without an animation
   * (R-055).
   */
  isIndicatorReady: Accessor<boolean>;

  /** The tab list's own frame, i.e. the scroll content's size (R-020, R-021). */
  contentSize: Accessor<Size>;

  /** Reports the tab list's frame; called from `Tabs.List`'s `onLayout`. */
  setContentSize: (size: Size) => void;

  /**
   * The scroller's viewport, measured by the list container. `Tabs.List` uses
   * it for R-024's `min-width: 100%`, which a percentage cannot express inside
   * NSH's content-sized scroll box.
   */
  viewportSize: Accessor<Size>;

  /** Reports the scroller's viewport; called from the list container. */
  setViewportSize: (size: Size) => void;

  /**
   * Registers the list container's "bring this tab into view" function, which
   * the list calls when the keyboard focus moves to a tab that is scrolled out
   * of view. The container owns the scroller and the scroll geometry.
   */
  registerScrollToKey: (scrollToKey: ((key: string) => void) | undefined) => void;

  /** Scrolls the tab of an encoded key into view. */
  scrollToKey: (key: string) => void;
}

/** The sidebar of one tab, for the parts that live inside it. */
export interface TabContextValue {
  /** The encoded key. */
  key: string;

  /** Whether this tab is selected. */
  isSelected: Accessor<boolean>;

  /** Whether this tab is disabled by its own prop or the root's flags. */
  isDisabled: Accessor<boolean>;
}

/** The root's context; `null` outside a `Tabs.Root`. */
export const TabsContext = context<TabsContextValue | null>(null);

/** The tab's context; `null` outside a `Tabs.Tab`. */
export const TabContext = context<TabContextValue | null>(null);
