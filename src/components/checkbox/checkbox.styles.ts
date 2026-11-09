import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Checkbox's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/checkbox/checkbox.styles.ts` plus the
 * declarations of `packages/styles/components/checkbox.css`.
 *
 * HeroUI's table names five BEM slots and one dimension (`variant`), with every
 * declaration in the CSS file. NSH has no BEM CSS and no descendant selectors
 * (D18), so the static declarations of each slot live here, while every rule
 * whose appearance depends on a state (selected, indeterminate, hover, pressed,
 * focus-visible, invalid, disabled, the group's variant) is a `classList` in
 * the part that owns it (port sheet §4). `variant` therefore carries no class
 * of its own: its two visible effects (R-035, R-038) are read from the context
 * by `Checkbox.Control`.
 */
export const checkboxVariants = tv({
  slots: {
    // R-001: `.checkbox` → `flex flex-col items-start gap-1 outline-none`.
    // R-003: `.checkbox` → `cursor: var(--cursor-interactive)` →
    // `cursor-pointer` (the Description and FieldError override it with
    // `cursor-default` through their context class, R-004 / R-005).
    // R-002: `no-highlight` (`-webkit-tap-highlight-color: transparent`) is
    // dropped: NSH native views have no tap highlight.
    base: "flex flex-col items-start gap-1 outline-none cursor-pointer",
    // R-037: `.checkbox__content` → `relative inline-flex items-center gap-3
    // text-sm font-medium text-foreground outline-none select-none`.
    // `cursor-[inherit]` has no NSH class: the part writes `cursor-pointer`
    // itself (and `cursor-not-allowed` when disabled). `no-highlight` dropped
    // as in R-002. `group` is kept as the marker class so a caller's own
    // `group-*` variants keep working, exactly as the port sheet asks.
    content:
      "group relative inline-flex items-center gap-3 text-sm font-medium text-foreground outline-none select-none",
    // R-017: `.checkbox__control` → `relative inline-flex size-4 shrink-0
    // items-center justify-center overflow-hidden rounded-md border
    // [border-width:var(--border-width-field)] border-field-border bg-field
    // shadow-field outline-none no-highlight`. The default theme's
    // `--field-border-width` is 0, so the square has no visible border at rest;
    // `border` (1px) would add a line upstream never draws, hence `border-0`
    // (the precedent of Select R-004 / TextField R-006 / Radio R-010). The
    // colour class stays for the hover state of R-024.
    // R-018: `transition: background-color 200ms var(--ease-out), border-color
    // 200ms var(--ease-out), transform 100ms var(--ease-out)` → one NSH
    // transition: `duration-200 ease-out` (the press scale becomes 200ms too,
    // §5).
    // R-019: `motion-reduce:transition-none`.
    // R-020: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    control:
      "relative inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-md border-0 border-field-border bg-field shadow-field dark:shadow-field-dark outline-none cursor-pointer transition duration-200 ease-out motion-reduce:transition-none",
    // R-032: `.checkbox__indicator` → `relative z-10 flex size-3
    // items-center justify-center`.
    // R-033: `.checkbox__indicator svg` → `size-full transform-gpu`; both
    // default canvases take `size-full` (see `checkbox-indicator.tsx`), which
    // is also what wins upstream, where the descendant selector outranks the
    // checkmark's own `size-2.5`.
    indicator: "relative z-10 flex size-3 items-center justify-center",
  },
  variants: {
    variant: {
      // R-034: `.checkbox--primary` is an empty block: the default look is the
      // base slot's, and the BEM name is not ported (D18).
      primary: {},
      // R-035 / R-036 / R-038 / R-039 / R-040: `.checkbox--secondary` and its
      // descendant rules only restate values the Control's state branches
      // already produce (`shadow-none bg-default`, the hover border, the
      // accent fill), so the modifier itself carries no class.
      secondary: {},
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

export type CheckboxVariants = VariantProps<typeof checkboxVariants>;

export type CheckboxVariant = NonNullable<CheckboxVariants["variant"]>;

/**
 * CheckboxGroup's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/checkbox-group/checkbox-group.styles.ts` plus
 * `packages/styles/components/checkbox-group.css`.
 *
 * The stylesheet has two rules: the column layout (R-041) and the `mt-4` every
 * item inside the group takes (R-042). The second is a descendant selector, so
 * it travels through the group context as `itemClass` and is appended by each
 * item's root (see `checkbox-group-root.tsx`). The stylesheet's own `gap` is
 * not set upstream, so the group deliberately has none.
 */
export const checkboxGroupVariants = tv({
  // R-041: `.checkbox-group` → `flex flex-col`.
  base: "flex flex-col",
  variants: {
    variant: {
      // R-043: `.checkbox-group--primary` is an empty block (the default).
      primary: "",
      // R-044: `.checkbox-group--secondary` produces a BEM class only; the CSS
      // has no declaration. D18 drops it, and the visible secondary effect is
      // carried to each item's Control by the group context (R-035,
      // R-038—R-040).
      secondary: "",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

export type CheckboxGroupVariants = VariantProps<typeof checkboxGroupVariants>;

export type CheckboxGroupVariant = NonNullable<CheckboxGroupVariants["variant"]>;
