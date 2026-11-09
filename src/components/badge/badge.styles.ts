import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

/**
 * Badge's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/badge/badge.styles.ts` plus the declarations
 * of `packages/styles/components/badge.css`.
 *
 * HeroUI's table has three BEM slots and one class per variant value; the
 * declarations live in CSS. NSH has no BEM class names (D18), so every slot
 * carries the declarations its selector applied. HeroUI's `--badge-bg` /
 * `--badge-fg` / `--badge-border` custom properties disappear: the base slot
 * names the default background, foreground and border directly, and the
 * compound entries below restate background and foreground per
 * `variant × color` in the same cascade order (later wins).
 */
export const badgeVariants = tv({
  slots: {
    /*
     * R-001: `.badge` → `inline-flex shrink-0 items-center justify-center
     * gap-0.5 font-medium`. `inline-flex` keeps HeroUI's own token and becomes
     * a row with content-based sizing; `w-fit` writes out the shrink-to-content
     * width an inline box has on the web, where NSH has no inline layout
     * context (port sheet §8).
     * R-002: `.badge` → `min-h-7 min-w-7 rounded-3xl text-xs leading-[1.34]`,
     * the md default: 28pt minimum box, 24pt radius, 12pt text, 1.34 line
     * height.
     * R-003: `.badge` → `--badge-bg: var(--default)` consumed by
     * `background-color` → `bg-default`.
     * R-004: `.badge` → `--badge-fg: var(--default-foreground)` consumed by
     * `color` → `text-default-foreground`.
     * R-005: `.badge` → `--badge-border: var(--background)` → the border color.
     * R-006: `.badge` → `border: 1px solid var(--badge-border)` → `border`
     * (bare width 1pt; NSH borders are solid).
     * R-007 is deleted: `background-clip: padding-box` has no NSH counterpart,
     * and the opaque `--background` border keeps the background from showing
     * underneath it (visually equivalent).
     */
    base: "inline-flex w-fit shrink-0 items-center justify-center gap-0.5 font-medium min-h-7 min-w-7 rounded-3xl text-xs leading-[1.34] bg-default text-default-foreground border border-background",
    /*
     * R-008: `.badge__label` → `px-0.5` (2pt). The `View` carries the padding
     * and its child `Text` draws the characters, so a caller's icon is simply
     * another child of this view.
     *
     * The span is inline upstream, so its children sit on one line on the text
     * baseline (an icon beside the text, two text runs beside each other). A
     * bare NSH view is a column, so the slot states the row and the baseline
     * itself; `flex-row` also makes the view a flex container, which a column
     * default otherwise is not (nsh_twref, "How classes combine").
     */
    label: "px-0.5 flex-row items-baseline",
    /*
     * R-009: `.badge-anchor` → `relative inline-flex shrink-0`; `relative` is
     * what the absolutely positioned badge lines up against. `w-fit` writes out
     * the inline box's shrink-to-content width (port sheet §8).
     */
    anchor: "relative inline-flex w-fit shrink-0",
  },
  variants: {
    /*
     * R-013: `.badge--accent` → `--badge-fg: var(--accent-soft-foreground)`.
     * R-014: `.badge--default` → `--badge-fg: var(--default-foreground)`
     * (the base value, kept so `color` always restates the foreground).
     * R-015: `.badge--success` → `--badge-fg: var(--success-soft-foreground)`.
     * R-016: `.badge--warning` → `--badge-fg: var(--warning-soft-foreground)`.
     * R-017: `.badge--danger` → `--badge-fg: var(--danger-soft-foreground)`.
     */
    color: {
      accent: { base: "text-accent-soft-foreground" },
      danger: { base: "text-danger-soft-foreground" },
      default: { base: "text-default-foreground" },
      success: { base: "text-success-soft-foreground" },
      warning: { base: "text-warning-soft-foreground" },
    },
    /*
     * R-021: `.badge--top-right` → `absolute top-0 right-0` plus
     * `transform: translate(25%, -25%)`; the fraction is relative to the
     * badge's own size, like the CSS percentage.
     * R-022: `.badge--top-left` → `absolute top-0 left-0` with
     * `translate(-25%, -25%)`.
     * R-023: `.badge--bottom-right` → `absolute right-0 bottom-0` with
     * `translate(25%, 25%)`.
     * R-024: `.badge--bottom-left` → `absolute bottom-0 left-0` with
     * `translate(-25%, 25%)`.
     */
    placement: {
      "bottom-left": { base: "absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4" },
      "bottom-right": { base: "absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4" },
      "top-left": { base: "absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4" },
      "top-right": { base: "absolute top-0 right-0 translate-x-1/4 -translate-y-1/4" },
    },
    /*
     * R-010: `.badge--lg` → `min-h-8 min-w-8 rounded-2xl text-sm
     * leading-[1.43]` (32pt box, 16pt radius, 14pt text).
     * R-011 is empty: `.badge--md` declares nothing, because the base block
     * already is md; the variant stays so the surface matches HeroUI's.
     * R-012: `.badge--sm` → `min-h-4 min-w-4 rounded-xl text-[10px]
     * leading-[1.34]` (16pt box, 12pt radius, 10pt text).
     */
    size: {
      lg: { base: "min-h-8 min-w-8 rounded-2xl text-sm leading-[1.43]" },
      md: { base: "" },
      sm: { base: "min-h-4 min-w-4 rounded-xl text-[10px] leading-[1.34]" },
    },
    /*
     * R-018 is empty: `.badge--primary` declares nothing; the compound entries
     * below paint background and foreground.
     * R-019 is empty: `.badge--secondary` keeps the base background and the
     * color variant's foreground.
     * R-020 is empty: `.badge--soft` declares nothing; the compound entries
     * below paint background and foreground.
     */
    variant: {
      primary: { base: "" },
      secondary: { base: "" },
      soft: { base: "" },
    },
  },
  compoundVariants: [
    /*
     * R-025: `.badge--primary.badge--accent` → `--badge-bg: var(--accent)`,
     * `--badge-fg: var(--accent-foreground)`.
     * R-026: `.badge--primary.badge--default` → the default background and
     * foreground.
     * R-027: `.badge--primary.badge--success` → the success pair.
     * R-028: `.badge--primary.badge--warning` → the warning pair.
     * R-029: `.badge--primary.badge--danger` → the danger pair.
     *
     * tailwind-variants emits these after the ordinary variant classes, so
     * their background and foreground win exactly as the later CSS rules do.
     */
    { variant: "primary", color: "accent", class: { base: "bg-accent text-accent-foreground" } },
    {
      variant: "primary",
      color: "default",
      class: { base: "bg-default text-default-foreground" },
    },
    {
      variant: "primary",
      color: "success",
      class: { base: "bg-success text-success-foreground" },
    },
    {
      variant: "primary",
      color: "warning",
      class: { base: "bg-warning text-warning-foreground" },
    },
    {
      variant: "primary",
      color: "danger",
      class: { base: "bg-danger text-danger-foreground" },
    },
    /*
     * R-030: `.badge--soft.badge--accent` → `--badge-bg: var(--accent-soft)`,
     * `--badge-fg: var(--accent-soft-foreground)`.
     * R-031: `.badge--soft.badge--default` → the default soft pair.
     * R-032: `.badge--soft.badge--success` → the success soft pair.
     * R-033: `.badge--soft.badge--warning` → the warning soft pair.
     * R-034: `.badge--soft.badge--danger` → the danger soft pair.
     */
    {
      variant: "soft",
      color: "accent",
      class: { base: "bg-accent-soft text-accent-soft-foreground" },
    },
    {
      variant: "soft",
      color: "default",
      class: { base: "bg-default-soft text-default-soft-foreground" },
    },
    {
      variant: "soft",
      color: "success",
      class: { base: "bg-success-soft text-success-soft-foreground" },
    },
    {
      variant: "soft",
      color: "warning",
      class: { base: "bg-warning-soft text-warning-soft-foreground" },
    },
    {
      variant: "soft",
      color: "danger",
      class: { base: "bg-danger-soft text-danger-soft-foreground" },
    },
  ],
  defaultVariants: {
    color: "default",
    placement: "top-right",
    size: "md",
    variant: "primary",
  },
});

export type BadgeVariants = VariantProps<typeof badgeVariants>;
