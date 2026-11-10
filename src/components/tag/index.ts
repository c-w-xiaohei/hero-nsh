import { TagGroupList } from "./tag-group-list";
import type { TagGroupListProps } from "./tag-group-list";
import { TagGroupRoot } from "./tag-group-root";
import type { TagGroupRootProps } from "./tag-group-root";
import { TagRemoveButton } from "./tag-remove-button";
import type { TagRemoveButtonProps } from "./tag-remove-button";
import { TagRoot } from "./tag-root";
import type { TagRootProps } from "./tag-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/

/**
 * `Tag` is `Object.assign(TagRoot, { Root, RemoveButton })`, as in HeroUI
 * 3.2.7: the root is the tag itself and the remove button is a real part that
 * can be placed anywhere inside it.
 */
export const Tag = Object.assign(TagRoot, {
  Root: TagRoot,
  RemoveButton: TagRemoveButton,
});

export type Tag = {
  Props: TagRootProps;
  RootProps: TagRootProps;
  RemoveButtonProps: TagRemoveButtonProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { TagRoot, TagRemoveButton };

export type { TagRootProps, TagRemoveButtonProps };

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { tagVariants } from "./tag.styles";

export type { TagVariants } from "./tag.styles";

/* -------------------------------------------------------------------------------------------------
 * TagGroup compound
 * -----------------------------------------------------------------------------------------------*/

/**
 * `TagGroup` is `Object.assign(TagGroupRoot, { Root, List })`, as in HeroUI
 * 3.2.7: a `role="grid"` collection of `Tag` rows with its own keyboard model.
 */
export const TagGroup = Object.assign(TagGroupRoot, {
  Root: TagGroupRoot,
  List: TagGroupList,
});

export type TagGroup = {
  Props: TagGroupRootProps;
  RootProps: TagGroupRootProps;
  ListProps: TagGroupListProps<object>;
};

export { TagGroupRoot, TagGroupList };

export type {
  TagGroupRootProps,
  TagGroupRootProps as TagGroupProps,
  TagGroupListProps,
};

/* -------------------------------------------------------------------------------------------------
 * Context and variants
 * -----------------------------------------------------------------------------------------------*/
export { TagGroupContext } from "./tag-context";

export type { TagGroupContextValue } from "./tag-context";

export { tagGroupVariants } from "./tag.styles";

export type { TagGroupVariants } from "./tag.styles";
