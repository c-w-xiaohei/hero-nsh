import { DisclosureBody, type DisclosureBodyProps } from "./disclosure-body";
import { DisclosureContent, type DisclosureContentProps } from "./disclosure-content";
import { DisclosureHeading, type DisclosureHeadingProps } from "./disclosure-heading";
import { DisclosureIndicator, type DisclosureIndicatorProps } from "./disclosure-indicator";
import { DisclosureRoot, type DisclosureRootProps } from "./disclosure-root";
import { DisclosureTrigger, type DisclosureTriggerProps } from "./disclosure-trigger";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
export const Disclosure = Object.assign(DisclosureRoot, {
  Root: DisclosureRoot,
  Heading: DisclosureHeading,
  Trigger: DisclosureTrigger,
  Content: DisclosureContent,
  Body: DisclosureBody,
  Indicator: DisclosureIndicator,
});

export type Disclosure = {
  Props: DisclosureRootProps;
  RootProps: DisclosureRootProps;
  HeadingProps: DisclosureHeadingProps;
  TriggerProps: DisclosureTriggerProps;
  ContentProps: DisclosureContentProps;
  BodyProps: DisclosureBodyProps;
  IndicatorProps: DisclosureIndicatorProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export {
  DisclosureBody,
  DisclosureContent,
  DisclosureHeading,
  DisclosureIndicator,
  DisclosureRoot,
  DisclosureTrigger,
};

export type {
  DisclosureRootProps,
  DisclosureRootProps as DisclosureProps,
  DisclosureRenderProps,
} from "./disclosure-root";

export type { DisclosureHeadingProps } from "./disclosure-heading";

export type {
  DisclosureTriggerProps,
  DisclosureTriggerRenderProps,
} from "./disclosure-trigger";

export type {
  DisclosureContentProps,
  DisclosureContentRenderProps,
} from "./disclosure-content";

export type { DisclosureBodyProps, DisclosureBodyProps as DisclosureBodyContentProps } from "./disclosure-body";

export type { DisclosureIndicatorProps } from "./disclosure-indicator";

export type { DisclosureState } from "./disclosure-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { disclosureVariants } from "./disclosure.styles";

export type { DisclosureVariants } from "./disclosure.styles";
