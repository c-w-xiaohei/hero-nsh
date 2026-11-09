import { context } from "nsh";
import type { Accessor } from "nsh";

import type { linkVariants } from "./link.styles";

/**
 * What `Link.Root` hands down to `Link.Icon`: the root's resolved variant table
 * and whether the link is currently focus-visible.
 *
 * HeroUI's context carries `slots` alone (`LinkContext = { slots? }`); the icon
 * gets its focus appearance from the CSS `:focus-visible` descendant selector.
 * NSH has no descendant selectors (D18) and `group-focus-visible:` equals
 * `group-focus:`, which would leave the icon lit after a pointer click moves the
 * focus back; the root therefore publishes the same `isFocusVisible` the focus
 * ring uses (R-010 / R-011).
 *
 * Optional at the type level because a `Link.Icon` rendered outside a `Link`
 * has no slot classes upstream either, only the caller's `className`.
 */
export interface LinkContextValue {
  /** The root instance's variant table result; the icon reads its own slot. */
  slots: ReturnType<typeof linkVariants>;

  /** Whether the link currently shows its keyboard focus ring. */
  isFocusVisible: Accessor<boolean>;
}

export const LinkContext = context<LinkContextValue | undefined>(undefined);
