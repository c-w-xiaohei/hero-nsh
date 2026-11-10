import { CardContent } from "./card-content";
import type { CardContentProps } from "./card-content";
import { CardDescription } from "./card-description";
import type { CardDescriptionProps } from "./card-description";
import { CardFooter } from "./card-footer";
import type { CardFooterProps } from "./card-footer";
import { CardHeader } from "./card-header";
import type { CardHeaderProps } from "./card-header";
import { CardRoot } from "./card-root";
import type { CardRootProps } from "./card-root";
import { CardTitle } from "./card-title";
import type { CardTitleProps } from "./card-title";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Card` is a single-root, five-part compound as in HeroUI 3.2.7: the root is
 * the whole component and also reachable as `Card.Root`; `Header`, `Title`,
 * `Description`, `Content` and `Footer` are real parts. Each part resolves its
 * slot from the root's context, so it can sit anywhere inside the root and can
 * also be rendered on its own, where it carries no slot class exactly as
 * upstream.
 */
export const Card = Object.assign(CardRoot, {
  Content: CardContent,
  Description: CardDescription,
  Footer: CardFooter,
  Header: CardHeader,
  Root: CardRoot,
  Title: CardTitle,
});

export type Card = {
  Props: CardRootProps;
  RootProps: CardRootProps;
  HeaderProps: CardHeaderProps;
  TitleProps: CardTitleProps;
  DescriptionProps: CardDescriptionProps;
  ContentProps: CardContentProps;
  FooterProps: CardFooterProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { CardRoot, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

export type {
  CardRootProps,
  CardRootProps as CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { cardVariants } from "./card.styles";

export type { CardVariants } from "./card.styles";
