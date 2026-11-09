import { context } from "nsh";
import type { Accessor } from "nsh";

import type { TypographyVariants } from "./typography.styles";

/** The `weight` dimension of the variant table, as the context carries it. */
export type TypographyResolvedWeight = NonNullable<TypographyVariants["weight"]>;

/** What the nearest Typography part hands to the Typography parts under it. */
export interface TypographyWeightContextValue {
  /**
   * The weight the part itself resolved: its own `weight`, or the
   * `font-semibold` its heading type carries, or `undefined` for normal text.
   * An accessor so a changing prop reaches the descendants.
   */
  weight: Accessor<TypographyResolvedWeight | undefined>;
}

/**
 * The weight a Typography part paints its own text with, published to the
 * parts nested under it.
 *
 * Upstream needs no such channel: every part renders one element and CSS
 * inherits `font-weight` down the tree, so a `<code>` inside a bold `<p>` or a
 * semibold `<h1>` (`typography.css:81-119` gives neither a weight of its own) is
 * painted with the paragraph's / heading's weight. NSH inherits text styles
 * through nested `Text`s — a plain nested `Text` inside a bold one resolves to
 * 700 (measured) — but the code chip's characters live inside an inline `View`
 * attachment, and a `View` starts a fresh text style: the enclosing weight does
 * not reach it (measured: 400 inside a 700 paragraph, 400 inside a 600
 * heading). The context restores the lost inheritance for the chip alone;
 * nothing else consumes it.
 */
export const TypographyWeightContext = context<TypographyWeightContextValue | null>(null);
