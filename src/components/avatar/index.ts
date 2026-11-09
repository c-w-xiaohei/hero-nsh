import { AvatarFallback } from "./avatar-fallback";
import type { AvatarFallbackProps } from "./avatar-fallback";
import { AvatarGroupCount } from "./avatar-group-count";
import type { AvatarGroupCountProps } from "./avatar-group-count";
import { AvatarGroupRoot } from "./avatar-group-root";
import type { AvatarGroupRootProps } from "./avatar-group-root";
import { AvatarImage } from "./avatar-image";
import type { AvatarImageProps } from "./avatar-image";
import { AvatarRoot } from "./avatar-root";
import type { AvatarRootProps } from "./avatar-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Avatar` is a three-part compound as in HeroUI 3.2.7: the root is the whole
 * component and also reachable as `Avatar.Root`; `Avatar.Image` and
 * `Avatar.Fallback` are real parts that resolve `AvatarContext` and throw when
 * used outside a root, exactly like Radix's parts.
 */
export const Avatar = Object.assign(AvatarRoot, {
  Fallback: AvatarFallback,
  Image: AvatarImage,
  Root: AvatarRoot,
});

export type Avatar = {
  FallbackProps: AvatarFallbackProps;
  ImageProps: AvatarImageProps;
  Props: AvatarRootProps;
  RootProps: AvatarRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { AvatarRoot, AvatarImage, AvatarFallback };

export type {
  AvatarRootProps,
  AvatarRootProps as AvatarProps,
  AvatarImageProps,
  AvatarFallbackProps,
};

/* -------------------------------------------------------------------------------------------------
 * Compound Component (AvatarGroup)
 * -----------------------------------------------------------------------------------------------*/
/**
 * `AvatarGroup` is a two-part compound as in HeroUI 3.2.7. `Root` stacks the
 * avatars (or lays them out in a grid) and appends an automatic `+N` count when
 * `max` hides some; `Count` is a real part carrying the group's dimensions into
 * an Avatar whose fallback shows the caller's content.
 */
export const AvatarGroup = Object.assign(AvatarGroupRoot, {
  Count: AvatarGroupCount,
  Root: AvatarGroupRoot,
});

export type AvatarGroup = {
  CountProps: AvatarGroupCountProps;
  Props: AvatarGroupRootProps;
  RootProps: AvatarGroupRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component (AvatarGroup)
 * -----------------------------------------------------------------------------------------------*/
export { AvatarGroupRoot, AvatarGroupCount };

export type {
  AvatarGroupRootProps,
  AvatarGroupRootProps as AvatarGroupProps,
  AvatarGroupCountProps,
};

/* -------------------------------------------------------------------------------------------------
 * Context and internals
 * -----------------------------------------------------------------------------------------------*/
/**
 * HeroUI exports the group context and its child marker; the marker is accepted
 * on Avatar.Root but has no runtime effect in NSH, where membership is decided
 * by the nearest group context (port sheet §1, §8).
 */
export { AvatarGroupContext, AVATAR_GROUP_CHILD } from "./avatar-group-context";

export type { AvatarGroupContextValue } from "./avatar-group-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { avatarVariants, avatarGroupVariants } from "./avatar.styles";

export type { AvatarVariants, AvatarGroupVariants } from "./avatar.styles";
