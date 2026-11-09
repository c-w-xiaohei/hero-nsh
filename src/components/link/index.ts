import { LinkIcon } from "./link-icon";
import type { LinkIconProps } from "./link-icon";
import { LinkRoot } from "./link-root";
import type { LinkRootProps } from "./link-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Link` is a single-root compound as in HeroUI 3.2.7: the root is the whole
 * component and also reachable as `Link.Root`; `Link.Icon` is a real part that
 * resolves its slot and focus state from the root's context.
 */
export const Link = Object.assign(LinkRoot, {
  Root: LinkRoot,
  Icon: LinkIcon,
});

export type Link = {
  Props: LinkRootProps;
  RootProps: LinkRootProps;
  IconProps: LinkIconProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { LinkRoot, LinkIcon };

export type { LinkRootProps, LinkRenderProps, LinkRootProps as LinkProps } from "./link-root";
export type { LinkIconProps } from "./link-icon";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { linkVariants } from "./link.styles";

export type { LinkVariants } from "./link.styles";
