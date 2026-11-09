import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Typography's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/typography/typography.styles.ts` plus the
 * declarations of `packages/styles/components/typography.css`.
 *
 * Upstream has two slots (`base` for the four text parts, `prose` for the
 * standalone container) and five dimensions (`align`, `color`, `truncate`,
 * `type`, `weight`). HeroUI's CSS carries the blocks as BEM names
 * (`typography`, `typography-prose`, `typography--h1`) whose rules apply the
 * Tailwind declarations; D18 drops the BEM names and each rule becomes the
 * declarations it applies.
 *
 * A third slot, `inlineCode`, holds the declarations of the code box. Upstream
 * has no such slot because `<code>` is an inline element; NSH's root `Text` is
 * a block, so the code box must be a nested inline `Text` to keep the
 * background, radius and padding around the characters and to let
 * `app.spanStyle` report that background. The four text parts still use `base`.
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
    // R-010 / R-030: the code box is an inline span, not the paragraph root.
    // Upstream `<code>` is an inline element: its background, padding and
    // radius cover the characters, not the whole line. An NSH root `Text` is a
    // block, so the declarations of `.typography-prose code` /
    // `.typography--code` live on this nested `Text` instead of `base`; the
    // root keeps the shared `text-foreground` plus align / color / truncate /
    // weight, and the span inherits them.
    inlineCode: "",
  },
  defaultVariants: {
    align: "start",
    color: "default",
    type: "body",
  },
  variants: {
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
    type: {
      // R-027: `.typography--body` → `text-base leading-7` (16 / 28).
      body: "text-base leading-7",
      // R-028: `.typography--body-sm` → `text-sm leading-6` (14 / 24).
      "body-sm": "text-sm leading-6",
      // R-029: `.typography--body-xs` → `text-xs leading-5` (12 / 20).
      "body-xs": "text-xs leading-5",
      // R-010 / R-030: `.typography-prose code` and `.typography--code` share
      // the same declarations; `Typography.Code` carries them on its inline
      // span (`inlineCode` above). `rounded-md` is 6, `px-1.5` 6, `py-0.5` 2.
      code: {
        inlineCode: "rounded-md bg-default px-1.5 py-0.5 font-mono text-sm text-foreground",
      },
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
