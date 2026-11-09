import { SwitchGroupRoot } from "./switch-group";
import type { SwitchGroupRootProps } from "./switch-group";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `SwitchGroup` is a single-part compound: the root is the whole component, as
 * in HeroUI 3.2.7, and `SwitchGroup.Root` names the same component. There is no
 * separate `Items` part upstream, so none is added here.
 */
export const SwitchGroup = Object.assign(SwitchGroupRoot, {
  Root: SwitchGroupRoot,
});

export type SwitchGroup = {
  Props: SwitchGroupRootProps;
  RootProps: SwitchGroupRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { SwitchGroupRoot };

export type { SwitchGroupRootProps, SwitchGroupRootProps as SwitchGroupProps } from "./switch-group";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { switchGroupVariants } from "./switch-group.styles";

export type { SwitchGroupVariants } from "./switch-group.styles";
