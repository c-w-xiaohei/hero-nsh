import { context } from "nsh";
import type { Accessor } from "nsh";

import type { KbdVariants } from "./kbd.styles";

/**
 * What `Kbd.Root` tells the Abbr and Content parts: the root's `variant`.
 *
 * HeroUI's Kbd context carries the slot class functions from `kbdVariants`;
 * NSH has no BEM CSS (D18), so the parts need the variant value and look their
 * own slot up in the same table (the Switch pattern: the dimension travels
 * through context, the class string still comes from the variant table).
 *
 * Optional at the type level because a part rendered outside a `Kbd` has no
 * slot classes upstream either, only the caller's `className`. This context is
 * internal and is not exported from the package entry.
 */
export interface KbdContextValue {
  /** The root's `variant`; each part resolves its own slot from it. */
  variant: Accessor<KbdVariants["variant"]>;
}

export const KbdContext = context<KbdContextValue | undefined>(undefined);
