import type { JSX } from "nsh";

import { renderTypography } from "./typography-root";
import type { TypographyRootProps, TypographyType } from "./typography-root";

/* -------------------------------------------------------------------------------------------------
 * Typography Heading
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Typography.Heading`: HeroUI 3.2.7's `HeadingProps`, which is
 * `TypographyRootProps` without `type` plus `level`.
 */
export interface TypographyHeadingProps extends Omit<TypographyRootProps, "type"> {
  /** The heading level, 1 to 6, default 1; it selects `type = h{level}`. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * `Typography.Heading`: HeroUI's `Heading`, a `TypographyRoot` whose `type` is
 * `h{level}`. The level also becomes `role="header"` plus `accessibilityLevel`
 * on the root `Text` (port sheet §3, §8).
 *
 * The type is derived inside an accessor so a changing `level` re-resolves the
 * variant classes instead of freezing the first value.
 */
export function TypographyHeading(props: TypographyHeadingProps): JSX.Element {
  return renderTypography(props, () => `h${props.level ?? 1}` as TypographyType);
}

/* -------------------------------------------------------------------------------------------------
 * Typography Paragraph
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Typography.Paragraph`: HeroUI 3.2.7's `ParagraphProps`, which is
 * `TypographyRootProps` without `type` plus `size`.
 */
export interface TypographyParagraphProps extends Omit<TypographyRootProps, "type"> {
  /** `"base"` (16 / 28, default), `"sm"` (14 / 24) or `"xs"` (12 / 20). */
  size?: "base" | "sm" | "xs";
}

/**
 * `Typography.Paragraph`: HeroUI's `Paragraph`, a `TypographyRoot` whose `type`
 * is `body`, `body-sm` or `body-xs`; `size="base"` keeps upstream's `--body`
 * variant (port sheet §1).
 */
export function TypographyParagraph(props: TypographyParagraphProps): JSX.Element {
  return renderTypography(props, () => {
    const size = props.size ?? "base";

    return (size === "base" ? "body" : `body-${size}`) as TypographyType;
  });
}

/* -------------------------------------------------------------------------------------------------
 * Typography Code
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Typography.Code`: HeroUI 3.2.7's `CodeProps`, which is
 * `TypographyRootProps` without `type`. It has no dimension of its own.
 */
export interface TypographyCodeProps extends Omit<TypographyRootProps, "type"> {}

/**
 * `Typography.Code`: HeroUI's `Code`, a `TypographyRoot` with `type="code"`.
 * The code declarations sit on a nested inline `Text`: upstream `<code>` is an
 * inline element, so its background, radius and padding cover the characters
 * rather than the paragraph's row (port sheet §6.5). Nested in a `Paragraph` it
 * is an inline span of the same paragraph, as the upstream `<code>` is inside
 * `<p>`.
 */
export function TypographyCode(props: TypographyCodeProps): JSX.Element {
  return renderTypography(props, () => "code");
}
