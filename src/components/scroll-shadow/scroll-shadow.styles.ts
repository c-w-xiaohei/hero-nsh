import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ScrollShadow's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/scroll-shadow/scroll-shadow.styles.ts` plus
 * the declarations of `packages/styles/components/scroll-shadow.css`.
 *
 * Upstream's table has one slot (`base`) and three dimensions. The BEM block
 * names are not carried over (D18), so each block and modifier expands to the
 * declarations it applied. Most of the stylesheet is not a class at all in
 * NSH: the orientation and `hideScrollBar` blocks are structural (`Scroll`'s
 * `horizontal` / `scrollbar` props) and the fade is a computed `maskImage`
 * (port sheet §4). Only the base block leaves a class, which is why the table
 * keeps the three dimensions with what each one maps to here.
 */
export const scrollShadowVariants = tv({
  slots: {
    // R-001: `.scroll-shadow` → `@apply relative`; it makes the scroll box the
    // containing block of absolutely positioned children, as upstream's
    // positioned `div` is.
    // R-002, R-004: `--scroll-shadow-size` / `--scroll-shadow-offset` are
    // deleted; `size` and `offset` are props of `createScrollShadow`.
    // R-003: `--scroll-shadow-scrollbar-size` is deleted too: NSH draws the
    // scroll indicator outside the view's own mask, so there is no lane to keep
    // clear (port sheet §8).
    // R-005: `@property --scroll-shadow-start-fade` is deleted; the start fade
    // length is the primitive's accessor, not an animatable custom property.
    // R-006: `@property --scroll-shadow-end-fade` is deleted for the same
    // reason; the end fade length is an accessor too.
    base: "relative",
  },
  variants: {
    hideScrollBar: {
      // R-019: `.scroll-shadow--hide-scrollbar` → `@apply scrollbar-none`
      // plus a zero scrollbar lane; realized as `<Scroll scrollbar={false}>`
      // in `scroll-shadow.tsx`.
      true: { base: "" },
      false: { base: "" },
    },
    orientation: {
      // R-009: `.scroll-shadow--vertical` → `@apply scrollbar overflow-y-auto`;
      // realized as the default `<Scroll>` in `scroll-shadow.tsx`.
      vertical: { base: "" },
      // R-010: `.scroll-shadow--horizontal` → `@apply scrollbar overflow-x-auto`;
      // realized as `<Scroll horizontal>`. The `.scrollbar` coloring is an
      // application-level `Scrollbar.setTheme` in NSH, not a component class.
      horizontal: { base: "" },
    },
    variant: {
      // R-020, R-021, R-022: `.scroll-shadow--fade` carries no declaration of
      // its own; the fade is the computed `maskImage` of `createScrollShadow`
      // (R-011 through R-018), so this dimension only has to stay in the type
      // the way HeroUI keeps it.
      fade: { base: "" },
    },
  },
  defaultVariants: {
    hideScrollBar: false,
    orientation: "vertical",
    variant: "fade",
  },
});

export type ScrollShadowVariants = VariantProps<typeof scrollShadowVariants>;
