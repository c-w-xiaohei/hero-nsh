import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

import { ease } from "../../tokens/geometry";

/*
 * CloseButton's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/components/close-button.css`.
 *
 * HeroUI's table only produces BEM class names (`close-button`,
 * `close-button--default`) and every declaration lives in the CSS file. NSH has
 * no BEM CSS (D18), so each block is expanded here into the declarations it
 * applied. The public variant dimension stays: one value, `default`, and
 * `defaultVariants.variant` keeps it the default (R-017).
 */
export const closeButtonVariants = tv({
  // R-001: `.close-button` → `relative inline-flex h-6 w-6 shrink-0
  // origin-center items-center justify-center rounded-xl p-1 select-none`. The
  // geometry is 24 × 24, radius 12 and padding 4.
  // A-003: `h-6 w-6 p-1` stays in `base` — the 24 pt box keeps its visible
  // size under touch; the hit-area expansion all goes through the `hitSlop`
  // half of the path (`createPressFeedback`, gated in the root), not through
  // a bigger visible box and not a `density` axis (the decorative chrome has
  // no density preset to point at).
  // R-003: `cursor: var(--cursor-interactive)` → `cursor-pointer` (that token
  // is `pointer`).
  // R-004: the transition's duration and curve. The property list is the only
  // part that cannot be a class (NSH takes one list for the whole element), so
  // it lives in the inline `transitionProperty` of
  // `close-button-root.tsx`; `ease-out-quart` is the theme's
  // `--ease-out-quart`.
  base: `relative inline-flex h-6 w-6 shrink-0 origin-center items-center justify-center rounded-xl p-1 select-none cursor-pointer duration-[250ms] ${ease.outQuart}`,
  variants: {
    variant: {
      // R-012: `.close-button--default` → `bg-default text-muted`.
      // R-015: the pressed block → `active:scale-[0.93]` — the touch press
      // feedback too, since action B binds no `scale`/`highlightOpacity`
      // channel (adapt sheet A-002: same `active:` family as Button's preset).
      default: "bg-default text-muted active:scale-[0.93]",
    },
    // A-001: the `input` axis. R-014's `@media (hover: hover)` block lives
    // only on `pointer`: under `input: "touch"` the `hover:` class is never
    // produced, so web's sticky hover cannot linger after a touch press. The
    // class set under pointer is unchanged — `hover:bg-default-hover` moved
    // here from `variant.default`, not added.
    input: {
      pointer: "hover:bg-default-hover",
      touch: "",
    },
  },
  defaultVariants: {
    // R-017: the BEM modifier class is deleted, its dimension and default stay.
    variant: "default",
  },
});

export type CloseButtonVariants = VariantProps<typeof closeButtonVariants>;
