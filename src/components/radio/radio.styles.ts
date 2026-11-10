import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Radio's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/radio/radio.styles.ts` plus the declarations
 * of `packages/styles/components/radio.css`.
 *
 * HeroUI's table names four BEM slots and no dimension; the visible dimensions
 * (`variant`, `orientation`) belong to `RadioGroup` (`radio-group` unit) and
 * reach the item through its `RadioGroupContext`. NSH has no BEM CSS and no descendant selectors (D18), so the
 * static declarations of each slot live here, while every rule whose appearance
 * depends on a state (selected, hover, pressed, focus-visible, invalid,
 * disabled, the group's variant) is a `classList` in the part that owns it
 * (port sheet §4).
 */
export const radioVariants = tv({
  slots: {
    // R-001: `.radio` → `flex flex-col items-start gap-1 outline-none`.
    // R-003: `.radio` → `cursor: var(--cursor-interactive)` →
    // `cursor-pointer` (the Description and FieldError override it with
    // `cursor-default` through their context class, R-006).
    // R-002: `no-highlight` (`-webkit-tap-highlight-color: transparent`) is
    // dropped: NSH native views have no tap highlight.
    base: "flex flex-col items-start gap-1 outline-none cursor-pointer",
    // R-009: `.radio__content` → `relative inline-flex items-center gap-3
    // text-sm font-medium text-foreground outline-none select-none`.
    // `cursor-[inherit]` has no NSH class: the part writes `cursor-pointer`
    // itself (and `cursor-not-allowed` when disabled). `no-highlight` dropped
    // as in R-002. `group` is kept as the marker class so a caller's own
    // `group-*` variants keep working, exactly as the port sheet asks.
    // R-004: `.radio [data-slot="label"] { select-none }` is already in this
    // string. R-005: `.radio__content [data-slot="label"] { cursor:
    // var(--cursor-interactive) }` is dropped: the cursor inherits from this
    // view, so a Label inside the face already shows the pointer.
    content:
      "group relative inline-flex items-center gap-3 text-sm font-medium text-foreground outline-none select-none",
    // R-010: `.radio__control` → `relative inline-flex size-4 shrink-0
    // items-center justify-center rounded-lg border
    // [border-width:var(--border-width-field)] border-field-border bg-field
    // shadow-field outline-none no-highlight`. The default theme's
    // `--field-border-width` is 0, so the circle has no visible border at rest;
    // `border` (1px) would add a line upstream never draws, hence `border-0`
    // (the precedent of Select R-004 / TextField R-006). The colour class stays
    // for the hover state of R-014.
    // R-011: `transition: background-color 200ms var(--ease-out), border-color
    // 200ms var(--ease-out), transform 100ms var(--ease-out)` → one NSH
    // transition: `duration-200 ease-out` (the press scale becomes 200ms too,
    // §8).
    // R-012: `motion-reduce:transition-none`.
    control:
      "relative inline-flex size-4 shrink-0 items-center justify-center rounded-lg border-0 border-field-border bg-field shadow-field dark:shadow-field-dark outline-none cursor-pointer transition duration-200 ease-out motion-reduce:transition-none",
    // R-021: `.radio__indicator` → `absolute inset-0 flex items-center
    // justify-center; pointer-events: none`.
    indicator: "absolute inset-0 flex items-center justify-center pointer-events-none",
  },
});

export type RadioVariants = VariantProps<typeof radioVariants>;
