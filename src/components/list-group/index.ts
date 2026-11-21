import {
  ListGroupItem,
  ListGroupRoot,
  type ListGroupItemProps,
  type ListGroupRootProps,
} from "./list-group";
import {
  ListGroupItemContent,
  ListGroupItemDescription,
  ListGroupItemPrefix,
  ListGroupItemSuffix,
  ListGroupItemTitle,
  type ListGroupItemContentProps,
  type ListGroupItemDescriptionProps,
  type ListGroupItemPrefixProps,
  type ListGroupItemSuffixProps,
  type ListGroupItemTitleProps,
} from "./list-group-parts";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/

/**
 * `ListGroup` is `Object.assign(ListGroupRoot, {Item, ItemPrefix, ItemContent,
 * ItemTitle, ItemDescription, ItemSuffix})` (sheet A-009): the Surface
 * container plus the pressable row and its five slots (upstream
 * `CompoundListGroup`, `list-group.tsx:198-211`). No collection, no
 * `selectionMode` — it is the navigation/action row set of the role boundary
 * table.
 */
export const ListGroup = Object.assign(ListGroupRoot, {
  Root: ListGroupRoot,
  Item: ListGroupItem,
  ItemPrefix: ListGroupItemPrefix,
  ItemContent: ListGroupItemContent,
  ItemTitle: ListGroupItemTitle,
  ItemDescription: ListGroupItemDescription,
  ItemSuffix: ListGroupItemSuffix,
});

export type ListGroup = {
  Props: ListGroupRootProps;
  RootProps: ListGroupRootProps;
  ItemProps: ListGroupItemProps;
  ItemPrefixProps: ListGroupItemPrefixProps;
  ItemContentProps: ListGroupItemContentProps;
  ItemTitleProps: ListGroupItemTitleProps;
  ItemDescriptionProps: ListGroupItemDescriptionProps;
  ItemSuffixProps: ListGroupItemSuffixProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export {
  ListGroupRoot,
  ListGroupItem,
  ListGroupItemPrefix,
  ListGroupItemContent,
  ListGroupItemTitle,
  ListGroupItemDescription,
  ListGroupItemSuffix,
};

export type {
  ListGroupRootProps,
  ListGroupRootProps as ListGroupProps,
  ListGroupItemProps,
  ListGroupItemPrefixProps,
  ListGroupItemContentProps,
  ListGroupItemTitleProps,
  ListGroupItemDescriptionProps,
  ListGroupItemSuffixProps,
};

export type { ListGroupIconProps } from "./list-group-parts";

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
export { ListGroupItemContext } from "./list-group-context";

export type { ListGroupItemContextValue } from "./list-group-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { listGroupVariants } from "./list-group.styles";

export type { ListGroupVariants } from "./list-group.styles";
