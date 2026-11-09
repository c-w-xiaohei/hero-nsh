import {
  ListBoxItemIndicator,
  ListBoxItemRoot,
  type ListBoxItemIndicatorProps,
  type ListBoxItemRenderProps,
  type ListBoxItemRootProps,
} from "./list-box-item";
import {
  ListBoxRoot,
  type ListBoxRenderProps,
  type ListBoxRootProps,
} from "./list-box-root";
import {
  ListBoxSectionRoot,
  type ListBoxSectionRootProps,
} from "./list-box-section";

/* -------------------------------------------------------------------------------------------------
 * Compound components
 * -----------------------------------------------------------------------------------------------*/
export const ListBox = Object.assign(ListBoxRoot, {
  Root: ListBoxRoot,
  Item: ListBoxItemRoot,
  ItemIndicator: ListBoxItemIndicator,
  Section: ListBoxSectionRoot,
});

export type ListBox<T = unknown> = {
  Props: ListBoxRootProps<T>;
  RootProps: ListBoxRootProps<T>;
  ItemProps: ListBoxItemRootProps;
  SectionProps: ListBoxSectionRootProps;
};

export const ListBoxItem = Object.assign(ListBoxItemRoot, {
  Root: ListBoxItemRoot,
  Indicator: ListBoxItemIndicator,
});

export type ListBoxItem = {
  Props: ListBoxItemRootProps;
  RootProps: ListBoxItemRootProps;
  IndicatorProps: ListBoxItemIndicatorProps;
};

/** Section is its own root upstream: there is no `Object.assign` here. */
export const ListBoxSection = ListBoxSectionRoot;

export type ListBoxSection = {
  Props: ListBoxSectionRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export { ListBoxRoot, ListBoxItemRoot, ListBoxItemIndicator, ListBoxSectionRoot };

export type {
  ListBoxRenderProps,
  ListBoxRootProps,
  ListBoxRootProps as ListBoxProps,
  ListBoxItemRenderProps,
  ListBoxItemRootProps,
  ListBoxItemRootProps as ListBoxItemProps,
  ListBoxItemIndicatorProps,
  ListBoxSectionRootProps,
  ListBoxSectionRootProps as ListBoxSectionProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export {
  listboxVariants,
  listboxItemVariants,
  listboxSectionVariants,
} from "./list-box.styles";

export type {
  ListBoxVariants,
  ListBoxItemVariants,
  ListBoxSectionVariants,
} from "./list-box.styles";
