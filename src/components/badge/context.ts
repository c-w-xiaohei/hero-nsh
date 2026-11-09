import { context } from "nsh";
import type { Accessor } from "nsh";

import type { badgeVariants } from "./badge.styles";

/**
 * What the root hands to `Badge.Label`: the slot table it resolved from its
 * four variant dimensions, exactly like HeroUI's `BadgeContext` (`{ slots }`).
 * It is an accessor, so a runtime change of `color`, `placement`, `size` or
 * `variant` re-resolves every part's class string.
 *
 * Not exported from the package entry: HeroUI does not export its context
 * either (port sheet §2).
 */
export interface BadgeContextValue {
  slots: Accessor<ReturnType<typeof badgeVariants>>;
}

export const BadgeContext = context<BadgeContextValue | undefined>(undefined);
