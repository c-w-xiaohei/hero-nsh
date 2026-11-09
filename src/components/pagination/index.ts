import { PaginationContent } from "./pagination-content";
import { PaginationEllipsis } from "./pagination-ellipsis";
import { PaginationNextIcon, PaginationPreviousIcon } from "./pagination-icons";
import { PaginationItem } from "./pagination-item";
import { PaginationLink } from "./pagination-link";
import { PaginationNext } from "./pagination-next";
import { PaginationPrevious } from "./pagination-previous";
import { PaginationRoot } from "./pagination-root";
import { PaginationSummary } from "./pagination-summary";

import type { PaginationContentProps } from "./pagination-content";
import type { PaginationEllipsisProps } from "./pagination-ellipsis";
import type {
  PaginationNextIconProps,
  PaginationPreviousIconProps,
} from "./pagination-icons";
import type { PaginationItemProps } from "./pagination-item";
import type { PaginationLinkProps } from "./pagination-button-props";
import type { PaginationNextProps, PaginationPreviousProps } from "./pagination-button-props";
import type { PaginationRootProps } from "./pagination-root";
import type { PaginationSummaryProps } from "./pagination-summary";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Pagination` is the compound HeroUI 3.2.7 exports: ten parts under one
 * object, with the root also reachable as `Pagination.Root` and as
 * `PaginationRoot`. Every part is a real component, so `Pagination.Link` and
 * `PaginationLink` are the same function.
 */
export const Pagination = Object.assign(PaginationRoot, {
  Root: PaginationRoot,
  Summary: PaginationSummary,
  Content: PaginationContent,
  Item: PaginationItem,
  Link: PaginationLink,
  Previous: PaginationPrevious,
  PreviousIcon: PaginationPreviousIcon,
  Next: PaginationNext,
  NextIcon: PaginationNextIcon,
  Ellipsis: PaginationEllipsis,
});

export type Pagination = {
  Props: PaginationRootProps;
  RootProps: PaginationRootProps;
  SummaryProps: PaginationSummaryProps;
  ContentProps: PaginationContentProps;
  ItemProps: PaginationItemProps;
  LinkProps: PaginationLinkProps;
  PreviousProps: PaginationPreviousProps;
  PreviousIconProps: PaginationPreviousIconProps;
  NextProps: PaginationNextProps;
  NextIconProps: PaginationNextIconProps;
  EllipsisProps: PaginationEllipsisProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export {
  PaginationRoot,
  PaginationSummary,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationPreviousIcon,
  PaginationNext,
  PaginationNextIcon,
  PaginationEllipsis,
};

export type {
  PaginationRootProps,
  PaginationRootProps as PaginationProps,
  PaginationSummaryProps,
  PaginationContentProps,
  PaginationItemProps,
  PaginationLinkProps,
  PaginationPreviousProps,
  PaginationPreviousIconProps,
  PaginationNextProps,
  PaginationNextIconProps,
  PaginationEllipsisProps,
};

/** The accessor object a render-prop `children` / `className` / `style` receives (D17). */
export type { PaginationRenderProps } from "./create-pagination-pressable";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { paginationVariants } from "./pagination.styles";

export type { PaginationVariants } from "./pagination.styles";
