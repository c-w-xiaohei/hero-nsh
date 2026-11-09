import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Spinner's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/spinner/spinner.styles.ts` plus the
 * declarations of `packages/styles/components/spinner.css`.
 *
 * HeroUI's table has two dimensions (`color`, `size`) and one BEM block. NSH
 * has no BEM CSS (D18), so every modifier is expanded to the declarations its
 * block applies. The part of R-001 that cannot be a class (the 750 ms turn)
 * lives in the root's inline style; see `spinner.tsx`.
 */
export const spinnerVariants = tv({
  // R-001: `.spinner` → `pointer-events-none inline-flex size-6 shrink-0
  // animate-spin-fast motion-reduce:animate-none`. `animate-spin-fast` is
  // `spin 0.75s linear infinite` in HeroUI's theme; NSH's `animate-spin` owns
  // the name, timing and iteration count and is fixed at 1 s, so the duration
  // is the root's inline `animationDuration: 750` and the class keeps the rest.
  base: "pointer-events-none inline-flex size-6 shrink-0 animate-spin motion-reduce:animate-none",
  defaultVariants: {
    color: "accent",
    size: "md",
  },
  variants: {
    // R-006: `.spinner--current` → `color: inherit`; NSH's text color already
    // inherits, so the variant has no class. The icon reads the inherited
    // color through the theme's foreground token (port sheet §5).
    // R-007 … R-010: the semantic text colors follow the appearance by
    // themselves.
    color: {
      accent: "text-accent", // R-007
      current: "", // R-006
      danger: "text-danger", // R-008
      success: "text-success", // R-009
      warning: "text-warning", // R-010
    },
    // R-002: `.spinner--md` is an empty block; `size-6` in the base already
    // makes it 24 pt, as upstream treats `md` as the default.
    // R-003 … R-005: the remaining sizes.
    size: {
      sm: "size-4", // R-003
      md: "", // R-002
      lg: "size-8", // R-004
      xl: "size-10", // R-005
    },
  },
});

export type SpinnerVariants = VariantProps<typeof spinnerVariants>;
