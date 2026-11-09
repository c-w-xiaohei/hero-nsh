import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Switch's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/switch/switch.styles.ts` plus the
 * declarations of `packages/styles/components/switch.css`.
 *
 * HeroUI's table has one dimension (`size`) and five BEM slots. NSH has no BEM
 * CSS and no descendant selectors (D18), so every rule of the stylesheet that
 * depended on `.switch--sm .switch__control` becomes a per-slot value of the
 * `size` variant here, and every rule that depends on a state (checked, hover,
 * pressed, focused, disabled) is a `computed` class string in the part that
 * owns it (port sheet §4).
 */
export const switchVariants = tv({
  slots: {
    // R-001: `.switch` → `flex flex-col items-start gap-1 no-highlight`; NSH
    // native views have no tap highlight, so `no-highlight` is dropped.
    // R-002: `.switch` → `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    base: "flex flex-col items-start gap-1 cursor-pointer",
    // R-032: `.switch__content` → the same string as upstream minus
    // `no-highlight` and `cursor-[inherit]` (NSH has no `inherit` cursor; the
    // part sets `cursor-pointer` in `switch-content.tsx` instead). `group` is
    // the runtime addition the port sheet asks for, so a caller's descendant
    // state variants keep working.
    content:
      "group relative inline-flex items-center gap-3 text-sm font-medium text-foreground outline-none select-none",
    // R-021: `.switch__control` → `relative flex shrink-0 items-center
    // overflow-hidden rounded-xl`.
    // R-022 is the md size below (`h-5 w-10`).
    // R-023: `.switch__control` → `background-color: var(--switch-control-bg)`,
    // whose default is `bg-default`; the state overrides live in the part.
    // R-024: `transition: background-color 250ms var(--ease-smooth), box-shadow
    // 150ms var(--ease-out)`; NSH takes one duration and one curve, so the whole
    // shorthand is 250ms `ease-smooth` (port sheet §8, R-024).
    // R-025: `motion-reduce:transition-none`.
    control:
      "relative flex shrink-0 items-center overflow-hidden rounded-xl bg-default transition duration-[250ms] ease-smooth motion-reduce:transition-none",
    // R-036: `.switch__thumb` → `relative ms-0.5 flex origin-center
    // transform-gpu rounded-lg bg-white text-black shadow-field`; `transform-gpu`
    // does nothing in NSH, and the dark shadow variant follows the theme notes.
    // R-039 is the md size below (`h-4 w-[1.375rem]`).
    // R-040: the property list is the inline `transitionProperty` in
    // `switch-thumb.tsx`; the class carries duration and curve (300ms,
    // `ease-out-fluid`). R-041: `motion-reduce:transition-none`.
    thumb:
      "relative ms-0.5 flex origin-center rounded-lg bg-white text-black shadow-field dark:shadow-field-dark duration-300 ease-out-fluid motion-reduce:transition-none",
    // R-046: `.switch__thumb > *` → `flex size-full items-center justify-center`.
    icon: "flex h-full w-full items-center justify-center",
  },
  variants: {
    // R-018 / R-019 / R-020: `.switch--sm` / `.switch--md` / `.switch--lg` are
    // empty blocks upstream; the dimensions they scope onto the control and the
    // thumb are the values below.
    size: {
      // R-033: `.switch--sm .switch__control` → `rounded-lg h-4 w-8`.
      // R-044: `.switch--sm .switch__thumb` → `rounded-md h-3 w-[1.03125rem]`.
      sm: {
        control: "rounded-lg h-4 w-8",
        thumb: "rounded-md h-3 w-[1.03125rem]",
      },
      // R-022: `.switch__control` default → `h-5 w-10`.
      // R-039: `.switch__thumb` default → `h-4 w-[1.375rem]`.
      md: {
        control: "h-5 w-10",
        thumb: "h-4 w-[1.375rem]",
      },
      // R-035: `.switch--lg .switch__control` → `h-6 w-12`.
      // R-045: `.switch--lg .switch__thumb` → `rounded-xl h-5 w-[1.71875rem]`.
      lg: {
        control: "h-6 w-12",
        thumb: "rounded-xl h-5 w-[1.71875rem]",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type SwitchVariants = VariantProps<typeof switchVariants>;

export type SwitchSize = NonNullable<SwitchVariants["size"]>;
