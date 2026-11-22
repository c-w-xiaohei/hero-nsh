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

// A-001 … A-013: adapt sheet typography.md keeps every 落点 as 保留 — text
// scaling, wrapping and truncation are already carried by the inherited
// `TextProps` passthrough (`allowFontScaling`/`maxFontSizeMultiplier`/
// `adjustsFontSizeToFit`/`minimumFontScale`, `style.numberOfLines`/
// `textOverflow`) plus the `truncate` variant, so no `input`/`density`
// axis lands in `typography.styles.ts` and no prop is added (the sheet's
// "不新增 Native Text 重复出口" ruling). The two harness-side 接轴 spots
// (A-011 fixtures, A-012 tests) are realized outside this directory —
// `harness/typography.fixtures.tsx` (`host.params.case` dispatch plus
// `ScopedMobile` feeding `input`/`density` into `EnvironmentScope`) and
// `harness/tests/components/typography/typography.mobile.test.tsx` (the
// desktop-pinned, dual-environment M-001…M-010 assertions). The gate's
// marker scan only sees `src/components/typography/`, so the record lives
// here. Every spot they probe — the parts this file exports — is
// environment-invariant: typography is a pure display compound.

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
