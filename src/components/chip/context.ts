import { context } from "nsh";
import type { Accessor } from "nsh";

import type { chipVariants } from "./chip.styles";

/**
 * What `Chip.Root` tells `Chip.Label`: the root's resolved variant table, so
 * the label reads its own slot from the same result the root's base came from.
 *
 * HeroUI's context carries `slots` the same way (`ChipContext = { slots? }`);
 * NSH has no BEM CSS (D18), so the value here is the whole `tv()` result, not a
 * class name. It stays an accessor so a runtime change of `color` / `size` /
 * `variant` re-resolves both slots.
 *
 * Optional at the type level because a `Chip.Label` rendered outside a `Chip`
 * has no slot classes upstream either, only the caller's `className`. This
 * context is internal and is not exported from the package entry.
 */
export interface ChipContextValue {
  /** The root instance's variant table result. */
  slots: Accessor<ReturnType<typeof chipVariants>>;
}

export const ChipContext = context<ChipContextValue | undefined>(undefined);
