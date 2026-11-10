import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/*
 * The two variant tables of `@heroui/styles` 3.2.7
 * (`packages/styles/src/components/tag/tag.styles.ts` and
 * `packages/styles/src/components/tag-group/tag-group.styles.ts`) expanded to
 * the declarations their BEM blocks apply (D18: BEM class names are not
 * carried over; port sheet section 4 lists every rule).
 */

export const tagVariants = tv({
  slots: {
    // R-001: `--optical-offset: 0.031em` is dropped: nothing in HeroUI (or the
    // vendored packages) reads that variable, so the declaration has no effect.
    // R-002: `.tag` → `relative inline-flex items-center rounded-xl font-medium
    // select-none`.
    // R-003: `gap-1` moves to the row's cell (`tag-root.tsx`): NSH has no
    // `display: contents`, so the one child of the row is a real cell box and
    // the gap between the tag's pieces belongs to it (R-026).
    // R-004: `no-highlight` is dropped; NSH has no tap-highlight concept.
    // R-005: the default size `px-2 py-1 text-xs` (`.tag--md` is empty, R-016).
    // R-007: `origin-center` and the reduced-motion reset; `transform-gpu` is
    // accepted by NSH and changes nothing.
    // R-008: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    // R-006: the transition's duration and curve live here; the property list
    // is the only thing NSH must take as an inline style and is set in
    // `tag-root.tsx` (one element, one list/duration/curve).
    base: [
      "relative inline-flex items-center rounded-xl px-2 py-1 text-xs font-medium select-none",
      "origin-center transform-gpu motion-reduce:transition-none duration-[100ms] ease-smooth",
      "cursor-pointer",
    ].join(" "),
    // R-022: `.tag__remove-button` → `size-3`; the visible box is 12 × 12 and
    // takes over `CloseButton`'s `h-6 w-6`. `overflow-visible` keeps the 12 pt
    // glyph inside the 4 pt content box, as upstream's `svg` does.
    // `text-inherit` is dropped: NSH has no `inherit` color value, so the
    // button's color is computed from the tag's variant and selection state in
    // `tag-root.tsx` (port sheet section 8).
    removeButton: "size-3 overflow-visible",
  },
  variants: {
    size: {
      // R-015: `.tag--sm` → `px-2 py-0.5 text-xs`.
      sm: { base: "px-2 py-0.5 text-xs" },
      // R-016: `.tag--md` is an empty block ("this is the default size"); the
      // dimension and its default stay, no declaration is written.
      md: { base: "" },
      // R-017: `.tag--lg` → `rounded-2xl px-2.5 py-1.5 text-sm`.
      lg: { base: "rounded-2xl px-2.5 py-1.5 text-sm" },
    },
    variant: {
      // R-018: `.tag--default` → `bg-default text-default-foreground`.
      // R-019: its hover block is a `classList` branch in `tag-root.tsx`
      // (`hover:bg-default-hover`, unselected only).
      default: { base: "bg-default text-default-foreground" },
      // R-020: `.tag--surface` → `bg-surface text-surface-foreground`.
      // R-021: its hover block is the same `classList` branch, keyed by the
      // variant (`hover:bg-surface-hover`, unselected only).
      surface: { base: "bg-surface text-surface-foreground" },
    },
  },
  defaultVariants: {
    size: "md",
    variant: "default",
  },
});

export type TagVariants = VariantProps<typeof tagVariants>;
export type TagSize = NonNullable<TagVariants["size"]>;
export type TagVariant = NonNullable<TagVariants["variant"]>;

export const tagGroupVariants = tv({
  slots: {
    // R-028: `.tag-group` → `relative flex flex-col gap-1`.
    base: "relative flex flex-col gap-1",
    // R-029: `.tag-group__list` → `relative flex flex-wrap gap-1.5`; the role,
    // the focus and the keymap are structural duties, not classes.
    list: "relative flex flex-wrap gap-1.5",
  },
});

export type TagGroupVariants = VariantProps<typeof tagGroupVariants>;
