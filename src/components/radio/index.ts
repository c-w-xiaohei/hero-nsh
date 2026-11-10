import { RadioContent, type RadioContentProps } from "./radio-content";
import { RadioControl, type RadioControlProps } from "./radio-control";
import { RadioGroupRoot, type RadioGroupRootProps } from "./radio-group-root";
import { RadioIndicator, type RadioIndicatorProps } from "./radio-indicator";
import { RadioRoot, type RadioRootProps } from "./radio-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Components
 * -----------------------------------------------------------------------------------------------*/
export const Radio = Object.assign(RadioRoot, {
  Root: RadioRoot,
  Content: RadioContent,
  Control: RadioControl,
  Indicator: RadioIndicator,
});

export type Radio = {
  Props: RadioRootProps;
  RootProps: RadioRootProps;
  ContentProps: RadioContentProps;
  ControlProps: RadioControlProps;
  IndicatorProps: RadioIndicatorProps;
};

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Root: RadioGroupRoot,
});

export type RadioGroup = {
  Props: RadioGroupRootProps;
  RootProps: RadioGroupRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export { RadioContent, RadioControl, RadioGroupRoot, RadioIndicator, RadioRoot };

export type {
  RadioRootProps,
  RadioRootProps as RadioProps,
  RadioFieldRenderProps,
  RadioButtonRenderProps,
} from "./radio-root";

export type { RadioContentProps } from "./radio-content";

export type { RadioControlProps } from "./radio-control";

export type { RadioIndicatorProps } from "./radio-indicator";

export type {
  RadioGroupRootProps,
  RadioGroupRootProps as RadioGroupProps,
  RadioGroupRenderProps,
} from "./radio-group-root";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { radioGroupVariants, radioVariants } from "./radio.styles";

export type {
  RadioGroupOrientation,
  RadioGroupVariant,
  RadioGroupVariants,
  RadioVariants,
} from "./radio.styles";
