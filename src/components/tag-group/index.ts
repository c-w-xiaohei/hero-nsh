import { TagRoot } from "../tag/tag-root";
import type { TagRootProps } from "../tag/tag-root";
import {
  TagGroupItemBackground,
  TagGroupItemLabel,
  TagGroupItemRemoveButton,
  type TagGroupItemBackgroundProps,
  type TagGroupItemLabelProps,
  type TagGroupItemRemoveButtonProps,
} from "./tag-group-parts";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/

/**
 * `TagGroupItem` is `Object.assign(TagRoot, { Root, Label, Background,
 * RemoveButton })`: the port's existing `TagRoot` (registration, selection and
 * keyboard model unchanged) carrying the convenience parts upstream hangs on
 * `TagGroup.Item*` (`tag-group.tsx:381-385`). Only the new names export —
 * `Tag`/`TagGroup` keep their own barrel (sheet A-014).
 */
export const TagGroupItem = Object.assign(TagRoot, {
  Root: TagRoot,
  Label: TagGroupItemLabel,
  Background: TagGroupItemBackground,
  RemoveButton: TagGroupItemRemoveButton,
});

export type TagGroupItem = {
  Props: TagRootProps;
  RootProps: TagRootProps;
  LabelProps: TagGroupItemLabelProps;
  BackgroundProps: TagGroupItemBackgroundProps;
  RemoveButtonProps: TagGroupItemRemoveButtonProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export {
  TagGroupItemLabel,
  TagGroupItemBackground,
  TagGroupItemRemoveButton,
};

export type {
  TagRootProps as TagGroupItemProps,
  TagGroupItemLabelProps,
  TagGroupItemBackgroundProps,
  TagGroupItemRemoveButtonProps,
};

export type { TagRemoveButtonIconProps } from "./tag-group-parts";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { tagGroupItemVariants } from "./tag-group.styles";

export type { TagGroupItemVariants } from "./tag-group.styles";
