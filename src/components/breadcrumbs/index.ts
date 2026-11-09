import { BreadcrumbsItem } from "./breadcrumbs-item";
import type {
  BreadcrumbsItemProps,
  BreadcrumbsItemRenderProps,
} from "./breadcrumbs-item";
import { BreadcrumbsRoot } from "./breadcrumbs-root";
import type { BreadcrumbsRootProps } from "./breadcrumbs-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Breadcrumbs` is a two-part compound as in HeroUI 3.2.7: the root is the
 * whole component and also reachable as `Breadcrumbs.Root`; `Breadcrumbs.Item`
 * is a real part that registers itself with the root and reads its state from
 * the root's context.
 */
export const Breadcrumbs = Object.assign(BreadcrumbsRoot, {
  Root: BreadcrumbsRoot,
  Item: BreadcrumbsItem,
});

export type Breadcrumbs = {
  Props: BreadcrumbsRootProps;
  RootProps: BreadcrumbsRootProps;
  ItemProps: BreadcrumbsItemProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { BreadcrumbsRoot, BreadcrumbsItem };

export type {
  BreadcrumbsRootProps,
  BreadcrumbsRootProps as BreadcrumbsProps,
  BreadcrumbsItemProps,
  BreadcrumbsItemRenderProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { breadcrumbsVariants } from "./breadcrumbs.styles";

export type { BreadcrumbsVariants } from "./breadcrumbs.styles";

/* The item key, React Aria's `Key`. */
export type { BreadcrumbsKey } from "./breadcrumbs-context";
