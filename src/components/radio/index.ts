import { RadioContent, type RadioContentProps } from "./radio-content";
import { RadioControl, type RadioControlProps } from "./radio-control";
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

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export { RadioContent, RadioControl, RadioIndicator, RadioRoot };

export type {
  RadioRootProps,
  RadioRootProps as RadioProps,
  RadioFieldRenderProps,
  RadioButtonRenderProps,
} from "./radio-root";

export type { RadioContentProps } from "./radio-content";

export type { RadioControlProps } from "./radio-control";

export type { RadioIndicatorProps } from "./radio-indicator";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { radioVariants } from "./radio.styles";

export type { RadioVariants } from "./radio.styles";
