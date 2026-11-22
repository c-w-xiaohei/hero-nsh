import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * FieldError's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/field-error/field-error.styles.ts`.
 *
 * HeroUI's table has no dimensions: `tv({ base: "field-error" })`, with every
 * declaration in the BEM block's CSS. NSH has no BEM CSS (D18), so the block's
 * declarations live in `base` or in the component's `classList` where they
 * depend on the field (port sheet §4).
 *
 * Mobile adaptation (adapt-sheets/field-error.md): the environment adds one
 * variant axis the Root feeds from `createDensity()`.
 *
 * - `text-xs` stays in `base` (A-001): the 12/16 font is the upstream
 *   typography contract, not a spacing literal, so the density axis does not
 *   reach it — `compact` tightens spacing only and 12 pt is already the
 *   typography floor. The `heroui-native` `text-sm` counterpart is the
 *   registered difference proposal (sheet §8), not adapted here.
 * - `density` owns the block's spacing literal (A-002): the non-toggle
 *   `px-1` moves out of the component's `classList` into the `default` cell
 *   so a `compact` preset tightens it one step (`px-1` → `px-0.5`). The
 *   toggle field keeps zero inline padding through the `classList` `px-0`
 *   override (see `field-error.tsx`), so the cell is safe for both field
 *   kinds. `src/tokens/density.ts` registers only the preset names — the
 *   cell values are the per-component mapping, authored next to the base.
 * - No `input` axis (A-003): a non-interactive text part has no hit area,
 *   hover dependency or touch feedback for that axis to own.
 */
export const fieldErrorVariants = tv({
  // R-003: `.field-error` → `font-size: 12px; line-height: 16px` (`text-xs`).
  base: "text-xs",
  variants: {
    // A-002: the `density` axis carries the block's spacing literal. The
    // default cell keeps the current `px-1`; `compact` tightens one step.
    // The toggle field's zero padding survives through the `px-0` classList
    // override at the call site, which NSH resolves after this class.
    density: {
      default: "px-1",
      compact: "px-0.5",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

export type FieldErrorVariants = VariantProps<typeof fieldErrorVariants>;
