import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { shadow } from "../../tokens/geometry";

/**
 * Toolbar's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/toolbar/toolbar.styles.ts` plus every
 * declaration of `packages/styles/components/toolbar.css`.
 *
 * Upstream's table only names BEM blocks (`toolbar`, `toolbar--horizontal`,
 * `toolbar--vertical`, `toolbar--attached`); the 19 declarations live in the
 * stylesheet, including two descendant blocks. NSH has no BEM CSS (D18), so
 * they are expanded here, one `R-xxx` per rule of port sheet §4.
 *
 * The descendant rules (R-006 … R-010 for Separator, R-015 for ButtonGroup) do
 * not belong to the toolbar's own box: the toolbar hands them down through
 * context, so they are written where that decision is made, not here.
 *
 * Rule order is upstream's: base first, then `orientation`, then `isAttached`,
 * so later classes win exactly where the upstream cascade did. The one place
 * where the order carries weight is `orientation.vertical` overriding the base
 * `grid-flow-col` (R-012).
 */
export const toolbarVariants = tv({
  base: [
    // R-001: `.toolbar` → `display: grid`.
    "grid",
    // R-002: `.toolbar` → `width: fit-content`; NSH's `w-fit` is Taffy's
    // `fit-content`, the shrink-to-content width the browser computed.
    "w-fit",
    // R-003: `.toolbar` → `grid-auto-flow: column`; horizontal is the default
    // axis, `orientation.vertical` overrides it with `grid-flow-row`.
    "grid-flow-col",
    // R-004: `.toolbar` → `align-items: center`; vertical overrides it.
    "items-center",
    // R-005: `.toolbar` → `gap: 0.5rem` (8 points).
    "gap-2",
  ].join(" "),
  variants: {
    orientation: {
      // R-011: `.toolbar--horizontal` is an empty block upstream. The empty
      // string keeps the dimension with the same two values upstream has.
      horizontal: "",
      // R-012: `.toolbar--vertical` → `grid-auto-flow: row`, after the base
      // `grid-flow-col` in the class string, so it wins.
      // R-013: `.toolbar--vertical` → `align-items: flex-start`.
      // R-014: `.toolbar--vertical` → `justify-content: flex-start`.
      vertical: "grid-flow-row items-start justify-start",
    },
    isAttached: {
      false: "",
      // R-016: `.toolbar--attached` → `border-radius: var(--radius-3xl)`;
      // `nsh.json` carries `radius.3xl = 24`.
      // R-017: `.toolbar--attached` → `background: var(--surface)`; the token
      // has a light and a dark value, so it follows the appearance by itself.
      // R-018: `.toolbar--attached` → `padding: 0.25rem` (4 points).
      // R-019: `.toolbar--attached` → `box-shadow: var(--overlay-shadow)`.
      // A shadow cannot switch with the appearance here, so both halves come
      // from `shadow.overlay` in `src/tokens/geometry.ts`.
      true: `rounded-3xl bg-surface p-1 ${shadow.overlay.both}`,
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    isAttached: false,
  },
});

export type ToolbarVariants = VariantProps<typeof toolbarVariants>;

export type ToolbarOrientation = NonNullable<ToolbarVariants["orientation"]>;
