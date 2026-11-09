import { AlertContent } from "./alert-content";
import type { AlertContentProps } from "./alert-content";
import { AlertDescription } from "./alert-description";
import type { AlertDescriptionProps } from "./alert-description";
import { AlertIndicator } from "./alert-indicator";
import type { AlertIndicatorProps } from "./alert-indicator";
import { AlertRoot } from "./alert-root";
import type { AlertRootProps } from "./alert-root";
import { AlertTitle } from "./alert-title";
import type { AlertTitleProps } from "./alert-title";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Alert` is a single-root, five-part compound as in HeroUI 3.2.7: the root is
 * the whole component and also reachable as `Alert.Root`; `Indicator`, `Content`,
 * `Title` and `Description` are real parts. Every part resolves its slot from
 * the root's context, so a part can sit anywhere inside the root and also be
 * rendered on its own, where it has no slot class exactly as upstream.
 */
export const Alert = Object.assign(AlertRoot, {
  Content: AlertContent,
  Description: AlertDescription,
  Indicator: AlertIndicator,
  Root: AlertRoot,
  Title: AlertTitle,
});

export type Alert = {
  Props: AlertRootProps;
  RootProps: AlertRootProps;
  IndicatorProps: AlertIndicatorProps;
  ContentProps: AlertContentProps;
  TitleProps: AlertTitleProps;
  DescriptionProps: AlertDescriptionProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { AlertRoot, AlertIndicator, AlertContent, AlertTitle, AlertDescription };

export type {
  AlertRootProps,
  AlertRootProps as AlertProps,
  AlertIndicatorProps,
  AlertContentProps,
  AlertTitleProps,
  AlertDescriptionProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { alertVariants } from "./alert.styles";

export type { AlertVariants } from "./alert.styles";
