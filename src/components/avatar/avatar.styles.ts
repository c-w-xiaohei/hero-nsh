import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

/**
 * Avatar's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/avatar/avatar.styles.ts` plus the
 * declarations of `packages/styles/components/avatar.css`.
 *
 * HeroUI's table carries three BEM slots (`avatar`, `avatar__fallback`,
 * `avatar__image`) whose declarations live in CSS. NSH has no BEM classes
 * (D18), so each slot carries the declarations its selectors applied, in
 * cascade order: base block, size modifier, color modifier, compound
 * `variant × color` entries.
 *
 * The two shape custom properties disappear: `--avatar-size` and
 * `--avatar-radius` only existed so AvatarGroup's clip mask could trace the
 * silhouette (R-001, R-002, R-008, R-012), and that mask is not ported
 * (R-034). Size and radius are written as utilities instead.
 */
export const avatarVariants = tv({
  slots: {
    /*
     * R-003: `.avatar` → `relative flex size-10 shrink-0 items-center
     * justify-center overflow-hidden bg-default`. Upstream is a `<span>` with
     * `flex`, so it is block-level flex already; `inline` participation is
     * lost in NSH and registered in port sheet §5.
     * R-004: `.avatar` → `border-radius: var(--avatar-radius)` →
     * `rounded-3xl` (radius 24); `size.sm` overrides it with `rounded-2xl`.
     */
    base: "relative flex size-10 shrink-0 items-center justify-center overflow-hidden bg-default rounded-3xl",
    /*
     * R-005: `.avatar__fallback` → `flex size-full items-center
     * justify-center bg-default text-sm font-medium`. Text utilities inherit
     * to the `Text` the part places inside this view.
     */
    fallback:
      "flex size-full items-center justify-center bg-default text-sm font-medium",
    /*
     * R-006: `.avatar__image` → `absolute inset-0 aspect-square size-full`,
     * plus `object-fill` because NSH's `<Image>` defaults to `cover` while
     * upstream's `<img>` has no `object-fit` and therefore stretches.
     * R-007: `.avatar__image` → `transition-opacity duration-250
     * motion-reduce:transition-none`. Upstream mounts the image only after it
     * loads, so the transition never actually runs; it is kept for a
     * line-by-line match.
     */
    image:
      "absolute inset-0 aspect-square size-full object-fill transition-opacity duration-250 motion-reduce:transition-none",
  },
  variants: {
    /*
     * R-015: `.avatar__fallback--accent` → `text-accent-soft-foreground`.
     * R-016: `.avatar__fallback--default` → `text-default-soft-foreground`.
     * R-017: `.avatar__fallback--success` → `text-success-soft-foreground`.
     * R-018: `.avatar__fallback--warning` → `text-warning-soft-foreground`.
     * R-019: `.avatar__fallback--danger` → `text-danger-soft-foreground`.
     */
    color: {
      accent: { fallback: "text-accent-soft-foreground" },
      danger: { fallback: "text-danger-soft-foreground" },
      default: { fallback: "text-default-soft-foreground" },
      success: { fallback: "text-success-soft-foreground" },
      warning: { fallback: "text-warning-soft-foreground" },
    },
    /*
     * R-009: `.avatar--sm` → `@apply size-8`, and the sm block's own
     * `--avatar-radius: calc(var(--radius) * 2)` → `rounded-2xl` (R-004
     * override).
     * R-010: `.avatar--sm .avatar__fallback` → `@apply text-xs`.
     * R-008 is deleted: the `--avatar-size` / `--avatar-radius` pair has no
     * consumer once the clip mask is gone.
     */
    size: {
      lg: {
        base: "size-12",
        // R-013: `.avatar--lg` → `@apply size-12`; its radius stays 3xl.
        // R-014: `.avatar--lg .avatar__fallback` → `@apply text-base`.
        fallback: "text-base",
      },
      // R-011 is deleted: `.avatar--md` declares nothing; the base block is md.
      md: {},
      sm: {
        base: "size-8 rounded-2xl",
        fallback: "text-xs",
      },
    },
    /*
     * R-020: `.avatar--soft` → `@apply bg-transparent`.
     * R-021…R-025: the `variant: "soft"` compound entries below repaint the
     * fallback per color.
     * `default` stays an empty variant so the table's dimensions match
     * HeroUI's, where `defaultVariants` has no `variant` and omitting it means
     * no `avatar--soft` class.
     */
    variant: {
      default: {},
      soft: { base: "bg-transparent" },
    },
  },
  compoundVariants: [
    /*
     * R-021: `.avatar--soft .avatar__fallback--accent` → `bg-accent-soft
     * text-accent-soft-foreground`.
     * R-022: `.avatar--soft .avatar__fallback--default` → `bg-default-soft
     * text-default-soft-foreground`.
     * R-023: `.avatar--soft .avatar__fallback--success` → `bg-success-soft
     * text-success-soft-foreground`.
     * R-024: `.avatar--soft .avatar__fallback--warning` → `bg-warning-soft
     * text-warning-soft-foreground`.
     * R-025: `.avatar--soft .avatar__fallback--danger` → `bg-danger-soft
     * text-danger-soft-foreground`.
     */
    {
      variant: "soft",
      color: "accent",
      class: { fallback: "bg-accent-soft text-accent-soft-foreground" },
    },
    {
      variant: "soft",
      color: "default",
      class: { fallback: "bg-default-soft text-default-soft-foreground" },
    },
    {
      variant: "soft",
      color: "success",
      class: { fallback: "bg-success-soft text-success-soft-foreground" },
    },
    {
      variant: "soft",
      color: "warning",
      class: { fallback: "bg-warning-soft text-warning-soft-foreground" },
    },
    {
      variant: "soft",
      color: "danger",
      class: { fallback: "bg-danger-soft text-danger-soft-foreground" },
    },
  ],
  defaultVariants: {
    color: "default",
    size: "md",
  },
});

/**
 * AvatarGroup's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/avatar-group/avatar-group.styles.ts` plus the
 * declarations of `packages/styles/components/avatar-group.css`.
 *
 * The overlapping geometry is not in this table: HeroUI writes it as CSS
 * child rules whose values depend on the rendered order, which NSH can only
 * express through the group context (R-029, R-030, R-032, R-033) and the
 * fallback nudge (R-036). Both `overlap` entries therefore stay empty, exactly
 * as the source table's only role is to emit a BEM modifier.
 *
 * R-034 is deleted: `.avatar-group--clip > .avatar:not(:last-child)`'s
 * seven-layer `mask` has no NSH counterpart (no `mask`, no `clip-path`, no
 * arbitrary properties). clip uses the same 2pt background ring as
 * `overlap="ring"`; the approximation is registered in §8.
 * R-035 is deleted with it: the `:dir(rtl)` variant only rewrites a mask
 * variable, and logical margin / padding keep RTL layout correct on their own.
 */
export const avatarGroupVariants = tv({
  slots: {
    /*
     * R-027: `.avatar-group` → `inline-flex items-center`, plus `w-fit` for
     * the shrink-to-content width an inline box has on the web (NSH has no
     * inline layout context; port sheet §5).
     * R-026 is deleted: `--avatar-group-overlap: 0.5rem` and
     * `--avatar-group-seam: 2px` are written directly as `-ms-2`, `ring-2`
     * and the `pe-[2.8px]` nudge, because NSH has no custom properties.
     */
    base: "inline-flex items-center w-fit",
    /*
     * R-031: `.avatar-group__count` → `@apply shrink-0`. The `-ms-2` and ring
     * of R-030 / R-033 arrive through the group context.
     */
    count: "shrink-0",
  },
  variants: {
    isGrid: {
      false: {},
      /*
       * R-028: `.avatar-group--grid` → `@apply flex-wrap gap-3`: no overlap,
       * no ring, no optical nudge.
       */
      true: { base: "flex-wrap gap-3" },
    },
    overlap: {
      // R-029 / R-032: clip and ring both reach the avatars through context.
      clip: {},
      ring: {},
    },
  },
  defaultVariants: {
    isGrid: false,
    overlap: "clip",
  },
});

export type AvatarVariants = VariantProps<typeof avatarVariants>;

export type AvatarGroupVariants = VariantProps<typeof avatarGroupVariants>;
