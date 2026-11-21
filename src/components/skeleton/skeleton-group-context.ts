import type { Accessor } from "nsh";
import { context } from "nsh";

import type { SkeletonRootAnimation } from "./skeleton";
import type { SkeletonVariants } from "./skeleton.styles";

/**
 * What `SkeletonGroup` hands to every `SkeletonGroup.Item` inside it
 * (`skeleton-group.types.ts:23`, upstream): the group's default `isLoading`,
 * `variant`/`animationType` and `animation`, as accessors. An item's own prop
 * wins over each member — context is the default, not the owner.
 *
 * Upstream also shares `progress`/`componentWidth`/`screenWidth` so every
 * item's shimmer sweeps together; this port deliberately does not share an
 * animation clock (action-list §3.4: the group's value is shared defaults and
 * whole-group gating), so the context carries only the prop defaults.
 */
export interface SkeletonGroupContextValue {
  isLoading: Accessor<boolean | undefined>;
  animationType: Accessor<SkeletonVariants["animationType"] | undefined>;
  variant: Accessor<SkeletonVariants["animationType"] | undefined>;
  animation: Accessor<SkeletonRootAnimation | undefined>;
}

export const SkeletonGroupContext = context<
  SkeletonGroupContextValue | undefined
>(undefined);
