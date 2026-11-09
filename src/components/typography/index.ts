import { TypographyProse } from "./typography-prose";
import type { TypographyProseProps } from "./typography-prose";
import { TypographyRoot } from "./typography-root";
import type { TypographyRootProps } from "./typography-root";
import {
  TypographyCode,
  TypographyHeading,
  TypographyParagraph,
} from "./typography-text-parts";
import type {
  TypographyCodeProps,
  TypographyHeadingProps,
  TypographyParagraphProps,
} from "./typography-text-parts";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Typography` is HeroUI 3.2.7's one root plus three convenience parts and one
 * standalone container: `Typography = Object.assign(TypographyRoot, { Code,
 * Heading, Paragraph, Prose, Root: TypographyRoot })`. All five are real
 * components that can be placed anywhere; `Typography.Root` is the root itself.
 */
export const Typography = Object.assign(TypographyRoot, {
  Code: TypographyCode,
  Heading: TypographyHeading,
  Paragraph: TypographyParagraph,
  Prose: TypographyProse,
  Root: TypographyRoot,
});

export type Typography = {
  Props: TypographyRootProps;
  RootProps: TypographyRootProps;
  CodeProps: TypographyCodeProps;
  HeadingProps: TypographyHeadingProps;
  ParagraphProps: TypographyParagraphProps;
  ProseProps: TypographyProseProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
/**
 * HeroUI exports the parts under their bare names (`TypographyRoot`, `Code`,
 * `Heading`, `Paragraph`, `Prose`), which are aliases of the same functions
 * kept under the `Typography*` names for `XPart` usage.
 */
export { TypographyRoot, TypographyCode, TypographyHeading, TypographyParagraph, TypographyProse };

export { TypographyCode as Code } from "./typography-text-parts";
export { TypographyHeading as Heading } from "./typography-text-parts";
export { TypographyParagraph as Paragraph } from "./typography-text-parts";
export { TypographyProse as Prose } from "./typography-prose";

export type { TypographyRootProps, TypographyRootProps as TypographyProps } from "./typography-root";

export type {
  TypographyCodeProps,
  TypographyCodeProps as CodeProps,
} from "./typography-text-parts";
export type {
  TypographyHeadingProps,
  TypographyHeadingProps as HeadingProps,
} from "./typography-text-parts";
export type {
  TypographyParagraphProps,
  TypographyParagraphProps as ParagraphProps,
} from "./typography-text-parts";
export type { TypographyProseProps, TypographyProseProps as ProseProps } from "./typography-prose";

export type {
  TypographyAlign,
  TypographyColor,
  TypographyTextProps,
  TypographyType,
  TypographyWeight,
} from "./typography-root";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { typographyVariants } from "./typography.styles";

export type { TypographyVariants } from "./typography.styles";
