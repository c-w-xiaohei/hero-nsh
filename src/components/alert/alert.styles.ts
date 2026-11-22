import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `shadow.surface.both` of `src/tokens/geometry.ts` written out: the M2 class
// walker imports this file through Node ESM, which does not resolve
// extensionless relative specifiers, so the geometry module cannot be
// imported from a `.styles.ts`. Same pattern as `switch.styles.ts` /
// `radio.styles.ts`; keep in sync with `SHADOW_VALUES.surface`.
const SHADOW_SURFACE_BOTH =
  "shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_0_transparent_inset]";

/**
 * Alert's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/alert/alert.styles.ts` plus the declarations
 * of `packages/styles/components/alert.css`.
 *
 * HeroUI's table is a `tv({ slots, variants })` whose slots only emit BEM block
 * and element names; every declaration lives in the stylesheet. NSH has no BEM
 * CSS (D18), so each block of that stylesheet is expanded here into the
 * declarations it applied, one `R-xxx` per rule of port sheet §4:
 *
 * - the base block is `slots.base`, and the three element blocks are their
 *   slots;
 * - `status` is the only dimension, and upstream's ten descendant selectors
 *   (`.alert--<status> .alert__indicator` / `.alert__title`) become two slot
 *   overrides per status value.
 *
 * The status colors here and the default icon colors in `alert-indicator.tsx`
 * are the two halves of the same mapping: the icon is a Canvas and does not
 * inherit `currentColor`, so `status.danger` must write both
 * `text-danger-soft-foreground` and the icon's `danger-soft-foreground` token.
 * The pairs, in order: default → foreground, accent → accent-soft-foreground,
 * success → success-soft-foreground, warning → warning-soft-foreground,
 * danger → danger-soft-foreground.
 */
export const alertVariants = tv({
  slots: {
    // R-001: `.alert` → `flex w-full flex-row items-start justify-start gap-4`
    // (16 points). NSH's `View` defaults to a column flex container, so the
    // explicit `flex-row` is what keeps the indicator and the content side by
    // side; the `gap-4` itself lives in the `density` axis (A-001).
    // R-002: `.alert` → `bg-surface`; the semantic token switches with the
    // appearance by itself.
    // R-003: `.alert` → `px-4 py-3` (16 / 12 points), also in the `density`
    // axis (A-001).
    // R-004: `.alert` → `shadow-surface`; shadows cannot switch with the
    // appearance, so the dark pair is written next to it (theme notes).
    // R-005: `.alert` → `border-radius: min(32px, var(--radius-3xl))`; this
    // theme's `radius.3xl` is 24, so `min(32, 24)` is 24 and `rounded-3xl`
    // matches. A theme that raised 3xl above 32 would exceed upstream's cap
    // (port sheet §8).
    base: `flex w-full flex-row items-start justify-start bg-surface ${SHADOW_SURFACE_BOTH} rounded-3xl`,
    // R-006: `.alert__content` → `flex h-full grow flex-col items-start`.
    // NSH's `grow` leaves `flex-shrink` at 0; upstream keeps CSS's default 1, so
    // an Alert with a trailing action could not give the text any room at
    // narrow widths and the description was clipped. `flex-auto` writes grow
    // and shrink together and keeps the automatic basis (skill §1.2).
    content: "flex h-full flex-auto flex-col items-start",
    // R-007: `.alert__indicator` → `flex items-center justify-center p-1
    // select-none` (padding 4, in the `density` axis per A-001; `select-none`
    // is NSH's `userSelect: "none"` and reaches the texts inside).
    // R-008 is a structural rewrite, not a class here: upstream styles the
    // default `svg` with `box-content size-4`. The default icon is now an icon
    // component whose `h-4 w-4` is already `size-4`, and it has no padding or
    // border, so `box-content` has nothing to change (port sheet §4).
    indicator: "flex items-center justify-center select-none",
    // R-009: `.alert__title` → `text-sm leading-6 font-medium` (14 / 24 /
    // 500). The status foreground below lands on the same view and the text
    // inside inherits it (twref "Text styles inherit").
    title: "text-sm leading-6 font-medium",
    // R-010: `.alert__description` → `text-sm text-muted` (14 / 20). It
    // deliberately does not follow `status`.
    description: "text-sm text-muted",
  },
  variants: {
    status: {
      // R-011: `.alert--default .alert__indicator` → `text-foreground`.
      // R-012: `.alert--default .alert__title` → `text-foreground`.
      default: {
        indicator: "text-foreground",
        title: "text-foreground",
      },
      // R-013: `.alert--accent .alert__indicator` → `text-accent-soft-foreground`.
      // R-014: `.alert--accent .alert__title` → `text-accent-soft-foreground`.
      accent: {
        indicator: "text-accent-soft-foreground",
        title: "text-accent-soft-foreground",
      },
      // R-015: `.alert--success .alert__indicator` → `text-success-soft-foreground`.
      // R-016: `.alert--success .alert__title` → `text-success-soft-foreground`.
      success: {
        indicator: "text-success-soft-foreground",
        title: "text-success-soft-foreground",
      },
      // R-017: `.alert--warning .alert__indicator` → `text-warning-soft-foreground`.
      // R-018: `.alert--warning .alert__title` → `text-warning-soft-foreground`.
      warning: {
        indicator: "text-warning-soft-foreground",
        title: "text-warning-soft-foreground",
      },
      // R-019: `.alert--danger .alert__indicator` → `text-danger-soft-foreground`.
      // R-020: `.alert--danger .alert__title` → `text-danger-soft-foreground`.
      danger: {
        indicator: "text-danger-soft-foreground",
        title: "text-danger-soft-foreground",
      },
    },
    // A-001: the `density` axis carries the spacing literals of the base and
    // indicator slots (adapt-sheets/alert.md). `default` is byte-identical to
    // the ported values (gap 16, padding 16/12, indicator padding 4); `compact`
    // tightens each one step (gap-3, px-3.5 py-2.5, p-0.5). The axis lives in
    // this table, not in `src/tokens/density.ts`, because these are slot class
    // literals with no token-mapping exit — `densityKey` normalizes the preset
    // name and the cells below are the mapping, authored next to the slots
    // they vary. No `input` axis (A-003): none of the five parts is pressable,
    // so interaction usability has nothing to vary; and no text-/leading-
    // cell (A-002): the title/description sizes are a fixed upstream
    // contract, not spacing.
    density: {
      default: {
        base: "gap-4 px-4 py-3",
        indicator: "p-1",
      },
      compact: {
        base: "gap-3 px-3.5 py-2.5",
        indicator: "p-0.5",
      },
    },
  },
  defaultVariants: {
    status: "default",
    density: "default",
  },
});

export type AlertVariants = VariantProps<typeof alertVariants>;
