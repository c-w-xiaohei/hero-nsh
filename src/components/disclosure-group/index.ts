import { DisclosureGroupRoot, type DisclosureGroupRootProps } from "./disclosure-group-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
export const DisclosureGroup = Object.assign(DisclosureGroupRoot, {
  Root: DisclosureGroupRoot,
});

export type DisclosureGroup = {
  Props: DisclosureGroupRootProps;
  RootProps: DisclosureGroupRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { DisclosureGroupRoot };

export type {
  DisclosureGroupRootProps,
  DisclosureGroupRootProps as DisclosureGroupProps,
  DisclosureGroupRenderProps,
} from "./disclosure-group-root";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { disclosureGroupVariants } from "./disclosure-group.styles";

export type { DisclosureGroupVariants } from "./disclosure-group.styles";

/* -------------------------------------------------------------------------------------------------
 * Hooks
 * -----------------------------------------------------------------------------------------------*/
export { useDisclosureGroupNavigation } from "./use-disclosure-group-navigation";

export type {
  DisclosureGroupNavigationValue,
  UseDisclosureGroupNavigationProps,
  UseDisclosureGroupNavigationReturn,
} from "./use-disclosure-group-navigation";

/* -------------------------------------------------------------------------------------------------
 * Key type
 * -----------------------------------------------------------------------------------------------*/
export type { DisclosureGroupKey, DisclosureGroupState } from "./disclosure-context";
