import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

/**
 * Pagination's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/components/pagination.css` plus the six BEM slots of
 * `paginationVariants`.
 *
 * HeroUI's table only produces BEM class names (`pagination`,
 * `pagination__link`, `pagination--sm`) and every declaration lives in the CSS
 * file. NSH has no BEM CSS (D18), so each block is expanded here into the
 * declarations it applied, in cascade order. The public surface stays 1:1: six
 * slots (`base` / `content` / `ellipsis` / `item` / `link` / `summary`), one
 * `size` dimension and the same default.
 *
 * R-030: the BEM block and element names (`pagination`,
 * `pagination__summary`, `pagination__content`, `pagination__item`,
 * `pagination__link`, `pagination__ellipsis`) are deleted; the slot keys and
 * their structure are kept.
 */
export const paginationVariants = tv({
  slots: {
    // R-001: `.pagination` → `flex w-full flex-col items-center
    // justify-between gap-4 sm:flex-row`.
    base: "flex w-full flex-col items-center justify-between gap-4 sm:flex-row",
    // R-002: `.pagination__summary` → `flex items-center gap-2 self-start
    // text-sm text-muted sm:self-center`. The size utilities inherit into the
    // `Text` the part places inside this view.
    summary: "flex items-center gap-2 self-start text-sm text-muted sm:self-center",
    // R-003: `.pagination__content` → `flex items-center gap-1 self-start
    // sm:self-center`.
    content: "flex items-center gap-1 self-start sm:self-center",
    // R-004: `.pagination__item` → `inline-flex`. NSH has no inline layout
    // context, so this is a block-level view (global difference).
    item: "inline-flex",
    /*
     * R-005: `.pagination__link` → `relative inline-flex size-9 origin-center
     * items-center justify-center rounded-3xl text-sm font-medium
     * whitespace-nowrap outline-none select-none md:size-8`, minus `isolate` /
     * `no-highlight` (R-006).
     * R-007: `cursor: var(--cursor-interactive)` → `cursor-pointer` (that token
     * is `pointer`).
     * R-008: duration and curve of the transition: `duration-[250ms]
     * ease-smooth`. Its property list is the one thing that cannot be a class
     * (NSH takes one list for the element), so it lives in the inline
     * `transitionProperty` of `pagination-button.tsx`. NSH has a single
     * duration and curve pair, so background and shadow move at 250ms
     * `ease-smooth` instead of upstream's 100ms `ease-out` (port sheet §8).
     * R-009: `transform-gpu` / `motion-reduce:transition-none` are deleted;
     * `transform-gpu` is accepted-no-effect and reduced motion is the inline
     * `"none"` (R-008), so a class would fight the same property.
     * R-010: the ghost token `--pagination-link-bg: transparent` and
     * `--pagination-link-fg: var(--default-foreground)` →
     * `bg-transparent text-default-foreground`.
     * R-013: the `@media (hover: hover)` block →
     * `hover:bg-default-hover`.
     * R-014: the pressed block → `active:bg-default-hover
     * active:scale-[0.97]`.
     */
    link: "relative inline-flex size-9 origin-center items-center justify-center rounded-3xl text-sm font-medium whitespace-nowrap outline-none select-none bg-transparent text-default-foreground cursor-pointer duration-[250ms] ease-smooth hover:bg-default-hover active:bg-default-hover active:scale-[0.97] md:size-8",
    // R-016: `.pagination__ellipsis` → `inline-flex size-9 items-center
    // justify-center text-sm text-muted select-none md:size-8`.
    ellipsis:
      "inline-flex size-9 items-center justify-center text-sm text-muted select-none md:size-8",
  },
  variants: {
    size: {
      // R-019: `.pagination--sm .pagination__link` → `size-8 text-xs
      // md:size-7`.
      // R-020: `.pagination--sm .pagination__link:active` → `scale(0.98)`.
      // R-022: `.pagination--sm .pagination__ellipsis` → `size-8 text-xs
      // md:size-7`.
      // R-023: `.pagination--sm .pagination__summary` → `text-xs`.
      sm: {
        link: "size-8 text-xs md:size-7 active:scale-[0.98]",
        ellipsis: "size-8 text-xs md:size-7",
        summary: "text-xs",
      },
      // R-024: `.pagination--md` is an empty block: the default size adds no
      // declaration.
      md: {},
      // R-025: `.pagination--lg .pagination__link` → `size-10 text-base
      // md:size-9`.
      // R-026: `.pagination--lg .pagination__link:active` → `scale(0.96)`.
      // R-028: `.pagination--lg .pagination__ellipsis` → `size-10 text-base
      // md:size-9`.
      // R-029: `.pagination--lg .pagination__summary` → `text-base`.
      lg: {
        link: "size-10 text-base md:size-9 active:scale-[0.96]",
        ellipsis: "size-10 text-base md:size-9",
        summary: "text-base",
      },
    },
  },
  // R-031: the `pagination--sm/md/lg` modifier classes are deleted; the `size`
  // dimension and its default stay, and the declarations of R-019 … R-029 live
  // in the same-named slot values above.
  defaultVariants: {
    size: "md",
  },
});

export type PaginationVariants = VariantProps<typeof paginationVariants>;

/** A resolved `size` value. */
export type PaginationSize = NonNullable<PaginationVariants["size"]>;

/**
 * The geometry `Previous` and `Next` add after the `link` slot. Upstream
 * appends the hand-written `pagination__link--nav` class (R-017) and overrides
 * its padding per size (R-021 / R-027); the port sheet §5 keeps that behaviour
 * out of the public variant table, which has exactly the six upstream slots, so
 * it is its own small table here and is not re-exported from the component
 * index.
 *
 * R-017: `.pagination__link--nav` → `w-auto gap-1.5 px-2.5`.
 * R-021: `.pagination--sm .pagination__link--nav` → `px-2` (the base
 * `gap-1.5` and `w-auto` stay, as in the CSS cascade).
 * R-027: `.pagination--lg .pagination__link--nav` → `px-3`.
 */
const paginationNavVariants = tv({
  // `md:w-auto` restates the plain `w-auto` at the breakpoint: the link slot
  // carries `md:size-8` (and `md:size-7` / `md:size-9` per size), and a variant
  // always outranks a plain class, so without it the nav button is pinned to
  // the icon square's width from 768 up and clips "Previous" / "Next"
  // (skill §3.2).
  base: "w-auto gap-1.5 px-2.5 md:w-auto",
  variants: {
    size: {
      sm: "px-2",
      md: "",
      lg: "px-3",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

/** The nav geometry for a size; `md` when the root carries none. */
export function paginationNavClasses(size: PaginationSize | undefined): string {
  return paginationNavVariants({ size });
}
