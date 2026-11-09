import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Typography's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/typography/typography.styles.ts` plus the
 * declarations of `packages/styles/components/typography.css`.
 *
 * The table is 1:1 with upstream: two slots (`base` for the four text parts,
 * `prose` for the standalone container) and five dimensions (`align`, `color`,
 * `truncate`, `type`, `weight`), and `type.code` targets `base` as it does
 * there. HeroUI's CSS carries the blocks as BEM names (`typography`,
 * `typography-prose`, `typography--h1`) whose rules apply the Tailwind
 * declarations; D18 drops the BEM names and each rule becomes the declarations
 * it applies.
 *
 * Upstream applies every variant class to the single element a part renders,
 * so the class order in the string is the CSS cascade: `typography.css` declares
 * the `type` rules (81–119) before align / color / truncate / weight
 * (121–163), and a later class wins. The dimensions are declared in that same
 * order here — `type`, `align`, `color`, `truncate`, `weight` — so the merged
 * string resolves conflicts the way upstream's stylesheet does. The code box is
 * the case that matters: its `text-foreground` is followed by a resolved
 * `color="muted"` (`text-muted`), which wins, exactly as
 * `.typography--color-muted` wins over `.typography--code` upstream.
 *
 * Every rule of port sheet §4 has its destination here. The eight structural
 * rewrites (R-003–R-008, R-010) live in the `type` dimension, because Prose no
 * longer reaches descendant elements: each Heading / Code part carries the same
 * declarations its upstream element rule would have applied.
 *
 * Deleted rules, kept here as a record of the decision (port sheet §4, §5):
 * R-011 (`a`: no element or descendant selector), R-012 (`blockquote`),
 * R-013 (`ul`), R-014 (`ol`), R-016 (`hr`), R-017 (`pre`), R-018 (`strong`),
 * R-019 (`em`), R-020 (`img`). Callers write those classes on `Text` / `View` /
 * `Image` themselves; `Scroll` replaces `overflow-x-auto`.
 */
export const typographyVariants = tv({
  slots: {
    // R-001: `.typography` → `text-foreground`; the semantic color follows the
    // appearance by itself. D18 drops the BEM name.
    // R-002: `.typography-prose` → `text-foreground`, the only visible effect
    // of the block itself.
    base: "text-foreground",
    // R-009: `.typography-prose p` → `text-base leading-7` is lifted onto the
    // Prose root, where the child `Text` elements inherit it (16 / 28).
    // R-015: `.typography-prose li` → `text-base leading-7`, lifted to the same
    // place: there is no list item element to reach.
    prose: "text-foreground text-base leading-7",
  },
  defaultVariants: {
    align: "start",
    color: "default",
    type: "body",
  },
  variants: {
    type: {
      // R-027: `.typography--body` → `text-base leading-7` (16 / 28).
      body: "text-base leading-7",
      // R-028: `.typography--body-sm` → `text-sm leading-6` (14 / 24).
      "body-sm": "text-sm leading-6",
      // R-029: `.typography--body-xs` → `text-xs leading-5` (12 / 20).
      "body-xs": "text-xs leading-5",
      // R-010 / R-030: `.typography-prose code` and `.typography--code` share
      // the same declarations. This keeps its upstream target, `base`; the
      // renderer puts that slot's output on the nested inline box (NSH's root
      // `Text` is a block, and an upstream `<code>` is inline), so the
      // background, radius and padding cover the characters rather than the
      // row. `rounded-md` is 6, `px-1.5` 6, `py-0.5` 2.
      code: "rounded-md bg-default px-1.5 py-0.5 font-mono text-sm text-foreground",
      // R-003 / R-021: `.typography-prose h1` / `.typography--h1` →
      // `text-4xl font-semibold tracking-tight` (36 / 40, letter-spacing
      // −0.025em).
      h1: "text-4xl font-semibold tracking-tight",
      // R-004 / R-022: `text-3xl font-semibold tracking-tight` (30 / 36).
      h2: "text-3xl font-semibold tracking-tight",
      // R-005 / R-023: `text-2xl font-semibold tracking-tight` (24 / 32).
      h3: "text-2xl font-semibold tracking-tight",
      // R-006 / R-024: `text-xl font-semibold tracking-tight` (20 / 28).
      h4: "text-xl font-semibold tracking-tight",
      // R-007 / R-025: `text-lg font-semibold tracking-tight` (18 / 28).
      h5: "text-lg font-semibold tracking-tight",
      // R-008 / R-026: `text-base font-semibold tracking-tight` (16 / 24).
      h6: "text-base font-semibold tracking-tight",
    },
    // R-031: `.typography--align-start` → `text-start`.
    // R-032: `.typography--align-center` → `text-center`.
    // R-033: `.typography--align-end` → `text-end`.
    // R-034: `.typography--align-justify` → `text-justify`.
    align: {
      start: "text-start",
      center: "text-center",
      end: "text-end",
      justify: "text-justify",
    },
    // R-035: `.typography--color-default` → `text-foreground` (same value as
    // R-001; kept so the variant surface stays 1:1).
    // R-036: `.typography--color-muted` → `text-muted`.
    color: {
      default: "text-foreground",
      muted: "text-muted",
    },
    // R-037: `.typography--truncate` → `truncate` (one line, tail ellipsis, no
    // wrapping). Upstream's `block` is not written: an NSH `Text` is already a
    // block-level paragraph.
    truncate: {
      true: "truncate",
    },
    // R-038: `.typography--weight-normal` → `font-normal`.
    // R-039: `.typography--weight-medium` → `font-medium`.
    // R-040: `.typography--weight-semibold` → `font-semibold`.
    // R-041: `.typography--weight-bold` → `font-bold`.
    // Declared after `type`, as in the stylesheet, so a weight wins over a
    // heading's `font-semibold` when both apply (later class wins).
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
  },
});

export type TypographyVariants = VariantProps<typeof typographyVariants>;
