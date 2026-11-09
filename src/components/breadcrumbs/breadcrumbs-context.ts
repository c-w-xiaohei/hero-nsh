import type { Accessor, JSX } from "nsh";
import { context } from "nsh";

import type { breadcrumbsVariants } from "./breadcrumbs.styles";

/** React Aria's `Key`: the item's identity and the `onAction` payload. */
export type BreadcrumbsKey = string | number;

/**
 * What `Breadcrumbs.Root` hands down to every `Breadcrumbs.Item`.
 *
 * HeroUI reads the same facts from React Aria's collection (`node.key`,
 * `node.nextKey`); NSH has no collection introspection, so the Root keeps an
 * ordered registry of the items that mounted under it and the last entry is
 * the current page (port sheet section 2).
 */
export interface BreadcrumbsContextValue {
  /** The root instance's variant table result; each Item reads its own slot. */
  slots: ReturnType<typeof breadcrumbsVariants>;

  /** The separator node, or a falsy value for the default chevron. */
  separator: Accessor<JSX.Element>;

  /** The root's `isDisabled`, shared by every item. */
  isDisabled: Accessor<boolean>;

  /** The root's `onAction`, called with the item's key on every press. */
  onAction: (key: BreadcrumbsKey) => void;

  /** The last registered item: RAC's `node.nextKey == null`. */
  lastKey: Accessor<BreadcrumbsKey | undefined>;

  /**
   * Registers one item in mount order; the returned function unregisters it.
   * Called from the item body, as the registration snippet of research 4.2.
   */
  register: (key: BreadcrumbsKey) => () => void;

  /** A fresh key for an item written without `id`: its registration index. */
  createKey: () => BreadcrumbsKey;
}

/**
 * Optional at the type level: an Item rendered outside a Root has no
 * registration point and no separator upstream either.
 */
export const BreadcrumbsContext = context<BreadcrumbsContextValue | undefined>(
  undefined,
);
