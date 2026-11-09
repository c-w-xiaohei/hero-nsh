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
 */
export const breadcrumbsVariants = tv({
  slots: {
    /*
     * R-001: `.breadcrumbs` → `display:flex; align-items:center; gap:.375rem`
     * → `flex flex-row items-center gap-1.5`. `flex-row` is written out
     * because an NSH View lays its children in a column by default, while
     * CSS `flex` is a row.
     */
    base: "flex flex-row items-center gap-1.5",
    /*
     * R-002: `.breadcrumbs .breadcrumbs__link` → `position:relative;
     * font-size:.875rem; line-height:1.25rem; font-weight:500;
     * color:var(--muted); text-decoration-line:none; opacity:1` →
     * `relative text-sm leading-5 font-medium text-muted no-underline
     * opacity-100`. It reaches the inner `Link` as its `className`, after the
     * Link's own base, so the later `text-muted` wins over Link's `text-link`;
     * `relative` has no positioned child and is kept for a line-by-line match.
     * R-003: `.breadcrumbs__link:hover, .breadcrumbs__link[data-hovered="true"]`
     * → `text-decoration-line:underline` → `hover:underline`. CSS `:hover` and
     * RAC's `data-hovered` are the same state, and NSH's `hover:` is
     * pointer-only, so one class covers both upstream selectors.
     */
    link: "relative text-sm leading-5 font-medium text-muted no-underline opacity-100 hover:underline",
    /*
     * R-005: `.breadcrumbs__item` → `display:flex; flex-shrink:0;
     * align-items:center; justify-content:center; gap:.25rem` → `flex
     * flex-row shrink-0 items-center justify-center gap-1`. `flex-row` again
     * writes out CSS `flex`'s row direction.
     */
    item: "flex flex-row shrink-0 items-center justify-center gap-1",
    /*
     * R-006: `.breadcrumbs__separator` → `width:.75rem; height:.75rem` →
     * `size-3`. It follows the icon's default `h-4 w-4`, so `size-3` wins; a
     * custom element separator carries it on the wrapper View instead.
     * R-008 is deleted: `.breadcrumbs__separator { rtl:rotate-180 }` has no
     * host channel, NSH has no writing direction and no `dir` attribute
     * (port sheet §5).
     */
    separator: "size-3",
  },
});

/** Upstream's table has no variant dimensions, so this is an empty object. */
export type BreadcrumbsVariants = VariantProps<typeof breadcrumbsVariants>;
