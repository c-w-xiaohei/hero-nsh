import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * SwitchGroup's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/switch-group/switch-group.styles.ts` plus the
 * declarations of `packages/styles/components/switch-group.css`.
 *
 * Upstream's table only names BEM blocks (`switch-group`, `switch-group__items`
 * and the two orientation modifiers), with the declarations in the CSS file and
 * the orientation attached to the root block. NSH has no BEM CSS and no
 * descendant selectors (D18), so every declaration is expanded here and the
 * orientation rule lands on the `items` slot directly: upstream's
 * `.switch-group--horizontal .switch-group__items` becomes
 * `variants.orientation.horizontal.items`, and the root keeps no orientation
 * class at all. That is the same treatment the port sheet §4 prescribes for
 * R-006 / R-007.
 */
export const switchGroupVariants = tv({
  slots: {
    // R-001: `.switch-group` → `@apply flex` (display: flex).
    // R-002: `.switch-group` → `flex-direction: column`; NSH's `flex` is a row,
    // so the direction must be written out for the column to survive.
    // R-003: `.switch-group` → `gap: 1.5rem` (`gap-6`, 24pt). The root has a
    // single `items` child, so the gap has no observable result; it is kept so
    // the base block stays line-for-line with upstream.
    base: "flex flex-col gap-6",
    // R-004: `.switch-group__items` → `@apply flex`; a row is `flex`'s default
    // direction in NSH, which is exactly upstream's horizontal base.
    // R-005: `.switch-group__items` → `gap: 1rem` (`gap-4`, 16pt); the single
    // owner of "two switches in one row are 16pt apart".
    items: "flex gap-4",
  },
  variants: {
    orientation: {
      // R-006: `.switch-group--horizontal .switch-group__items` → `flex-row`.
      // Upstream hangs the modifier on the root and points a descendant
      // selector at `items`; NSH has no descendant selectors, so the direction
      // class is written on the `items` view instead (port sheet §5).
      horizontal: {
        items: "flex-row",
      },
      // R-007: `.switch-group--vertical .switch-group__items` → `flex-col`;
      // `defaultVariants.orientation` makes this the default branch.
      vertical: {
        items: "flex-col",
      },
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

export type SwitchGroupVariants = VariantProps<typeof switchGroupVariants>;
