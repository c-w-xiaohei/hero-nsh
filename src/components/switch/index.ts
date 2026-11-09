import { SwitchContent, type SwitchContentProps } from "./switch-content";
import { SwitchControl, type SwitchControlProps } from "./switch-control";
import { SwitchIcon, type SwitchIconProps } from "./switch-icon";
import { SwitchRoot, type SwitchRootProps } from "./switch-root";
import { SwitchThumb, type SwitchThumbProps } from "./switch-thumb";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
export const Switch = Object.assign(SwitchRoot, {
  Root: SwitchRoot,
  Content: SwitchContent,
  Control: SwitchControl,
  Thumb: SwitchThumb,
  Icon: SwitchIcon,
});

export type Switch = {
  Props: SwitchRootProps;
  RootProps: SwitchRootProps;
  ContentProps: SwitchContentProps;
  ControlProps: SwitchControlProps;
  ThumbProps: SwitchThumbProps;
  IconProps: SwitchIconProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export { SwitchContent, SwitchControl, SwitchIcon, SwitchRoot, SwitchThumb };

export type {
  SwitchRootProps,
  SwitchRootProps as SwitchProps,
  SwitchFieldRenderProps,
  /** @deprecated Use {@link SwitchFieldRenderProps} for the root render prop, or {@link SwitchButtonRenderProps} for the content. */
  SwitchFieldRenderProps as SwitchRenderProps,
} from "./switch-root";

export type { SwitchContentProps, SwitchButtonRenderProps } from "./switch-content";

export type { SwitchControlProps } from "./switch-control";

export type { SwitchThumbProps } from "./switch-thumb";

export type { SwitchIconProps } from "./switch-icon";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { switchVariants } from "./switch.styles";

export type { SwitchVariants } from "./switch.styles";
