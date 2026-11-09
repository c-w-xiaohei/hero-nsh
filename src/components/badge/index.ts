import { BadgeAnchor } from "./badge-anchor";
import type { BadgeAnchorProps } from "./badge-anchor";
import { BadgeLabel } from "./badge-label";
import type { BadgeLabelProps } from "./badge-label";
import { BadgeRoot } from "./badge-root";
import type { BadgeRootProps } from "./badge-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Badge` is a single-root, three-part compound as in HeroUI 3.2.7: the root is
 * the whole component and also reachable as `Badge.Root`; `Badge.Anchor` and
 * `Badge.Label` are real parts. `Badge.Label` resolves its slot from the root's
 * context, so it can be placed anywhere inside the root and also rendered on
 * its own (with no slot class, exactly as upstream).
 */
export const Badge = Object.assign(BadgeRoot, {
  Anchor: BadgeAnchor,
  Label: BadgeLabel,
  Root: BadgeRoot,
});

export type Badge = {
  AnchorProps: BadgeAnchorProps;
  LabelProps: BadgeLabelProps;
  Props: BadgeRootProps;
  RootProps: BadgeRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { BadgeRoot, BadgeLabel, BadgeAnchor };

export type {
  BadgeRootProps,
  BadgeRootProps as BadgeProps,
  BadgeLabelProps,
  BadgeAnchorProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { badgeVariants } from "./badge.styles";

export type { BadgeVariants } from "./badge.styles";
