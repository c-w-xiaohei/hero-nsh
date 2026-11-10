import { FieldsetRoot } from "./fieldset";
import type { FieldsetRootProps } from "./fieldset";
import { FieldsetActions } from "./actions";
import type { FieldsetActionsProps } from "./actions";
import { FieldGroup } from "./group";
import type { FieldGroupProps } from "./group";
import { FieldsetLegend } from "./legend";
import type { FieldsetLegendProps } from "./legend";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Fieldset` is the compound HeroUI 3.2.7 exports: the root carries the same
 * four parts as `.Root` / `.Legend` / `.Group` / `.Actions`, and the named
 * exports below keep their upstream names (`FieldGroup`, not
 * `FieldsetGroup`).
 */
export const Fieldset = Object.assign(FieldsetRoot, {
  Root: FieldsetRoot,
  Legend: FieldsetLegend,
  Group: FieldGroup,
  Actions: FieldsetActions,
});

export type Fieldset = {
  Props: FieldsetRootProps;
  RootProps: FieldsetRootProps;
  LegendProps: FieldsetLegendProps;
  GroupProps: FieldGroupProps;
  ActionsProps: FieldsetActionsProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { FieldsetRoot, FieldsetLegend, FieldGroup, FieldsetActions };

export type {
  FieldsetRootProps,
  FieldsetRootProps as FieldsetProps,
  FieldsetLegendProps,
  FieldGroupProps,
  FieldsetActionsProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { fieldsetVariants } from "./fieldset.styles";

export type { FieldsetVariants } from "./fieldset.styles";
