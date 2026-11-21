import { ControlFieldIndicator, type ControlFieldIndicatorProps } from "./control-field-indicator";
import { ControlFieldRoot, type ControlFieldRootProps } from "./control-field";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/

/**
 * `ControlField` is `Object.assign(ControlFieldRoot, { Root, Indicator })`
 * (sheet A-005): the pressable settings row plus the control slot that mounts
 * a default checkbox / radio / switch under the row's state.
 */
export const ControlField = Object.assign(ControlFieldRoot, {
  Root: ControlFieldRoot,
  Indicator: ControlFieldIndicator,
});

export type ControlField = {
  Props: ControlFieldRootProps;
  RootProps: ControlFieldRootProps;
  IndicatorProps: ControlFieldIndicatorProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export { ControlFieldRoot, ControlFieldIndicator };

export type {
  ControlFieldRootProps,
  ControlFieldRootProps as ControlFieldProps,
  ControlFieldIndicatorProps,
};

export type { ControlFieldIndicatorVariant } from "./control-field-indicator";

/* -------------------------------------------------------------------------------------------------
 * Context and render props
 * -----------------------------------------------------------------------------------------------*/
export { ControlFieldContext } from "./control-field-context";

export type {
  ControlFieldContextValue,
  ControlFieldRenderProps,
} from "./control-field-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { controlFieldVariants } from "./control-field.styles";

export type { ControlFieldVariants } from "./control-field.styles";
