import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Separator's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/separator/separator.styles.ts`.
 *
 * Upstream's table only names BEM blocks (`separator`, `separator--horizontal`,
 * …); the declarations live in `packages/styles/components/separator.css`.
 * NSH has no BEM CSS (D18), so every declaration of that stylesheet is expanded
 * here, one `R-xxx` per rule of port sheet §4.
 *
 * The rule order is upstream's: the base block first, then `orientation`, then
 * `variant`, so later classes win exactly where the upstream cascade did.
 */
export const separatorVariants = tv({
  base: [
    // R-001: `.separator` → `shrink-0`. NSH's `View` already shrinks by 0 by
    // default; kept so the base block stays line-for-line with upstream.
    "shrink-0",
    // R-002: `.separator` → `rounded-sm` (4 points; upstream `0.25rem`).
    "rounded-sm",
    // R-003: `.separator` → `border-t-0` is deleted. It only cancelled the
    // `hr` user-agent border, and NSH's host views have no default border.
    // R-004: `.separator` → `border-b-0` is deleted for the same reason.
    // R-005: `.separator` → `bg-separator`; the theme token carries a light and
    // a dark value, so the color follows the appearance by itself.
    "bg-separator",
    // R-006: `.separator` → `h-px` (1 point).
    "h-px",
    // R-007: `.separator` → `w-full`.
    "w-full",
  ].join(" "),
  variants: {
    orientation: {
      // R-008: `.separator--horizontal` → `h-px`; the same value as the base,
      // kept because upstream repeats it in the orientation block.
      // R-009: `.separator--horizontal` → `w-full`, likewise repeated.
      horizontal: "h-px w-full",
      // R-010: `.separator--vertical` → `h-auto`; after the base `h-px` in the
      // class string, so it wins and the height comes from `self-stretch` /
      // `min-h-2`.
      // R-011: `.separator--vertical` → `min-h-2` (8 points; upstream `0.5rem`).
      // R-012: `.separator--vertical` → `w-px` (1 point), over the base `w-full`.
      // R-013: `.separator--vertical` → `self-stretch`; in a row parent it
      // stretches to the row's height, as upstream's `align-self: stretch`.
      vertical: "h-auto min-h-2 w-px self-stretch",
    },
    variant: {
      // R-014: `.separator--default` → `bg-separator`; same as the base, kept
      // because upstream repeats it in the variant block.
      default: "bg-separator",
      // R-015: `.separator--secondary` → `bg-separator-secondary`; the token
      // mixes `surface` 85% with `surface-foreground` 15%, so it follows
      // `surface` automatically.
      secondary: "bg-separator-secondary",
      // R-016: `.separator--tertiary` → `bg-separator-tertiary`; 81% / 19%.
      tertiary: "bg-separator-tertiary",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    variant: "default",
  },
});

export type SeparatorVariants = VariantProps<typeof separatorVariants>;
