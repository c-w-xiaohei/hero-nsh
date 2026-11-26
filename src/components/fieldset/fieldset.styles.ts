import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Fieldset's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/fieldset/fieldset.styles.ts` expanded with
 * `packages/styles/components/fieldset.css`.
 *
 * Upstream has no variant dimensions at all: the table is four BEM slots
 * (`fieldset`, `fieldset__legend`, `fieldset__field-group`, `fieldset__actions`)
 * plus one dead slot (`description`, R-007). The declarations are expanded here
 * because NSH has no BEM class names (D18).
 *
 * R-007 is deleted with no replacement: `fieldset.styles.ts` declares a
 * `description` slot that `fieldset.css` never styles and no part or prop ever
 * reaches, so there is no visible effect to carry over; a Description inside a
 * Fieldset is styled by the Description unit itself.
 *
 * R-009 is deleted as well: the UA defaults of `fieldset` / `legend` (margin,
 * padding, border, `min-inline-size`) are already zeroed by Tailwind preflight
 * upstream, and NSH's views have no UA box model to reset.
 */
export const fieldsetVariants = tv({
  slots: {
    // R-001: `.fieldset` → `@apply flex flex-col gap-6` (column flex, 24 between
    // the legend, the description, the group and the actions).
    // R-002: `.fieldset` → `@apply shrink grow basis-0`. The upstream comment
    // explains it as the Safari flexbox fix for a fieldset with a legend, but
    // the three declarations also take part in the parent flex container's
    // sizing here, so they are kept as they are.
    base: "flex flex-col shrink grow basis-0",
    // R-003: `.fieldset__legend` → `@apply text-base font-medium text-foreground`
    // (16 / 24, weight 500, the semantic foreground color, which follows the
    // appearance through the theme tokens). A-005: the type scale is the
    // upstream typography contract, so the legend keeps 16pt under `compact`
    // — the density axis carries spacing only.
    legend: "text-base font-medium text-foreground",
    // R-004: `.fieldset__field-group` → `@apply w-full space-y-4` (full width,
    // 16 between the fields; NSH's `space-y-*` adds a bottom margin to every
    // child but the last, as Tailwind CSS does). The spacing literal moved to
    // the `density` axis (A-002).
    fieldGroup: "w-full",
    // R-005: `.fieldset__actions` → `@apply flex items-center gap-2` (row flex,
    // centered vertically, 8 between the actions).
    // R-006: `.fieldset__actions` → `@apply pt-1` (4 above). Both literals
    // moved to the `density` axis (A-003).
    actions: "flex items-center",
  },
  /*
   * A-001…A-004 (adapt sheet §2): the `density` axis carries the three
   * spacing literals of the base stack gap, the group row spacing and the
   * actions' gap/top padding — the only spacing literals this table had.
   * `default` is the untouched upstream value, `compact` tightens each one
   * step (24→16, 16→8, 8+4→6+2). `src/tokens/density.ts` registers only the
   * preset names; the per-component mapping is authored here, next to the
   * slots it varies. There is no `input` axis (A-009): a fieldset has no
   * hover dependency, no hit area, nothing interaction-usable to vary.
   */
  variants: {
    density: {
      default: {
        base: "gap-6",
        fieldGroup: "space-y-4",
        actions: "gap-2 pt-1",
      },
      compact: {
        base: "gap-4",
        fieldGroup: "space-y-2",
        actions: "gap-1.5 pt-0.5",
      },
    },
  },
  defaultVariants: {
    density: "default",
  },
});

export type FieldsetVariants = VariantProps<typeof fieldsetVariants>;
