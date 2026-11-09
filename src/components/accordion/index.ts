import { AccordionBody, type AccordionBodyProps } from "./accordion-body";
import { AccordionHeading, type AccordionHeadingProps } from "./accordion-heading";
import { AccordionIndicator, type AccordionIndicatorProps } from "./accordion-indicator";
import { AccordionItem, type AccordionItemProps } from "./accordion-item";
import { AccordionPanel, type AccordionPanelProps } from "./accordion-panel";
import { AccordionRoot, type AccordionRootProps } from "./accordion-root";
import { AccordionTrigger, type AccordionTriggerProps } from "./accordion-trigger";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Accordion` is HeroUI's compound: the root plus the six parts, each reachable
 * as `Accordion.Part` and also exported by name.
 */
export const Accordion = Object.assign(AccordionRoot, {
  Root: AccordionRoot,
  Item: AccordionItem,
  Heading: AccordionHeading,
  Trigger: AccordionTrigger,
  Panel: AccordionPanel,
  Indicator: AccordionIndicator,
  Body: AccordionBody,
});

export type Accordion = {
  Props: AccordionRootProps;
  RootProps: AccordionRootProps;
  ItemProps: AccordionItemProps;
  HeadingProps: AccordionHeadingProps;
  TriggerProps: AccordionTriggerProps;
  PanelProps: AccordionPanelProps;
  IndicatorProps: AccordionIndicatorProps;
  BodyProps: AccordionBodyProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  AccordionRoot,
  AccordionItem,
  AccordionHeading,
  AccordionTrigger,
  AccordionPanel,
  AccordionIndicator,
  AccordionBody,
};

export type {
  AccordionRootProps,
  AccordionRootProps as AccordionProps,
  AccordionItemProps,
  AccordionHeadingProps,
  AccordionTriggerProps,
  AccordionPanelProps,
  AccordionIndicatorProps,
  AccordionBodyProps,
};

export type {
  AccordionItemRenderProps,
  AccordionRenderProps,
  ReactStatelyDisclosureGroupState,
  ReactStatelyDisclosureState,
} from "./accordion-types";

export type { AccordionTriggerRenderProps } from "./accordion-trigger";

export type { AccordionKey } from "./accordion-key";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { accordionVariants } from "./accordion.styles";

export type { AccordionVariants } from "./accordion.styles";
