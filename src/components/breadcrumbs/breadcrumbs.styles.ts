import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

/*
 * Breadcrumbs variant table (HeroUI 3.2.7, packages/styles/components/
 * breadcrumbs.css). HeroUI's table has no variant dimensions and four slots
 * whose values are BEM hooks (`breadcrumbs`, `breadcrumbs__link`,
 * `breadcrumbs__item`, `breadcrumbs__separator`); the declarations live in
 * CSS. NSH has no BEM class names (D18), so each slot carries the declarations
 * its selector applied. The table keeps `tv({ slots })` so it is still the
 * same four-slot shape.
 *
 * Mobile adaptation (encapsulation.md §1, 样式管线): the environment adds two
 * variant axes the Root feeds from `createInput()` / `createDensity()`.
 *
 * - `input` owns interaction usability only (adapt sheet A-001): the link's
 *   `hover:underline` is a hover dependency, so it lives in the `pointer`
 *   cell and a touch environment resolves it away — web's sticky hover would
 *   otherwise keep it after a press. The `touch` cell stays empty: the
 *   visible hit size does not grow here because the navigation item's hit
 *   area is the inner Link's `hitSlop`, which belongs to the link unit.
 * - `density` owns visual density (adapt sheet A-002): the gap / separator
 *   literals move out of the base slots into `density` cells so a `compact`
 *   preset tightens them one step. `src/tokens/density.ts` registers only
 *   the preset names, not a per-component mapping — the cell values are the
 *   mapping, authored next to the slots it varies.
 */
export const breadcrumbsVariants = tv({
  slots: {
    /*
     * R-001: `.breadcrumbs` → `display:flex; align-items:center; gap:.375rem`
     * → `flex flex-row items-center` + the gap in the `density` axis
     * (`gap-1.5` default, A-002). `flex-row` is written out because an NSH
     * View lays its children in a column by default, while CSS `flex` is a
     * row.
     */
    base: "flex flex-row items-center",
    /*
     * R-002: `.breadcrumbs .breadcrumbs__link` → `position:relative;
     * font-size:.875rem; line-height:1.25rem; font-weight:500;
     * color:var(--muted); text-decoration-line:none; opacity:1` →
     * `relative text-sm leading-5 font-medium text-muted no-underline
     * opacity-100`. It reaches the inner `Link` as its `className`, after the
     * Link's own base, so the later `text-muted` wins over Link's `text-link`;
     * `relative` has no positioned child and is kept for a line-by-line match.
     * R-003: `.breadcrumbs__link:hover, .breadcrumbs__link[data-hovered="true"]`
     * → `text-decoration-line:underline` → `hover:underline`, now in the
     * `input: "pointer"` cell (A-001): CSS `:hover` and RAC's `data-hovered`
     * are the same state, NSH's `hover:` is pointer-only, and on a touch
     * input the effect must not resolve at all so a held press leaves no
     * sticky hover behind.
     */
    link: "relative text-sm leading-5 font-medium text-muted no-underline opacity-100",
    /*
     * R-005: `.breadcrumbs__item` → `display:flex; flex-shrink:0;
     * align-items:center; justify-content:center; gap:.25rem` → `flex
     * flex-row shrink-0 items-center justify-center` + the gap in the
     * `density` axis (`gap-1` default, A-002). `flex-row` again writes out
     * CSS `flex`'s row direction.
     */
    item: "flex flex-row shrink-0 items-center justify-center",
    /*
     * R-006: `.breadcrumbs__separator` → `width:.75rem; height:.75rem` → the
     * size in the `density` axis (`size-3` default, A-002). It follows the
     * icon's default `h-4 w-4`, so the variant size wins; a custom element
     * separator carries it on the wrapper View instead.
     * R-008: `.breadcrumbs__separator { rtl:rotate-180 }` → `rtl:rotate-180`.
     * NSH has the variant (twref:449, "the layout direction"), so the mirror
     * is written here, on the slot upstream applies it to: the default
     * chevron's `className` and the custom separator's wrapper both take it.
     */
    separator: "rtl:rotate-180",
  },
  variants: {
    // A-001: the `input` axis carries interaction usability. Only the link's
    // hover dependency moves here; no cell adds a visible size (the hit area
    // is the inner Link's hitSlop, see the header comment).
    input: {
      pointer: {
        link: "hover:underline",
      },
      touch: {},
    },
    // A-002: the `density` axis carries the spacing/size literals of the
    // base, item and separator slots. `default` is the current value;
    // `compact` tightens each one step (gap-1.5→gap-1, gap-1→gap-0.5,
    // size-3→size-2.5). NSH resolves conflicting utilities by string order
    // and variant classes apply after the base slot, so the cell's class
    // wins without a merge helper.
    density: {
      default: {
        base: "gap-1.5",
        item: "gap-1",
        separator: "size-3",
      },
      compact: {
        base: "gap-1",
        item: "gap-0.5",
        separator: "size-2.5",
      },
    },
  },
  defaultVariants: {
    input: "pointer",
    density: "default",
  },
});

/**
 * Upstream's table has no variant dimensions; the two axes here are the
 * environment's (`input`, `density`), fed by the Root from `createInput()` /
 * `createDensity()` — callers do not set them.
 */
export type BreadcrumbsVariants = VariantProps<typeof breadcrumbsVariants>;
