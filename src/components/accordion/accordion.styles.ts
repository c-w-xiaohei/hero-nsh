import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Accordion's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/accordion/accordion.styles.ts` plus the
 * declarations of `packages/styles/components/accordion.css` (port sheet §4).
 *
 * HeroUI's table has eight slots and one dimension (`variant`: `default` /
 * `surface`), with no `defaultVariants`: `surface` only changes the base slot,
 * and the rest of the surface rules are state the Item and the Trigger read
 * from the root's context (R-031 … R-035). BEM class names are not carried over
 * (D18), so each slot holds the declarations its block applied. Every colour
 * here is a theme token, so the light and dark appearances switch by themselves.
 */
export const accordionVariants = tv({
  slots: {
    // R-001: `.accordion` → `@apply w-full`.
    // R-002: `.accordion`'s `contain: layout style` is deleted: NSH has no CSS
    // contain and it is a performance hint with no visible effect.
    // R-030: `.accordion--surface` → `bg-surface` plus the root radius, on the
    // `variant` dimension below.
    base: "w-full",
    // R-003: `.accordion__body` → `@apply text-sm`.
    body: "text-sm",
    // R-004: `.accordion__body-inner` → `@apply px-4 pt-0 pb-4 text-muted`.
    bodyInner: "px-4 pt-0 pb-4 text-muted",
    // R-005: `.accordion__heading` → `@apply flex`.
    heading: "flex",
    // R-006: `.accordion__indicator` → `@apply ms-auto size-4 shrink-0
    // text-muted`.
    // R-007: its `@apply transition duration-250 motion-reduce:transition-none`
    // (only the transform changes; NSH's `transition` covers transform).
    // R-008 is the expanded `-rotate-180`, a `classList` entry in
    // `accordion-indicator.tsx`: the `data-expanded` attribute has no channel.
    indicator:
      "ms-auto size-4 shrink-0 text-muted transition duration-250 motion-reduce:transition-none",
    // R-009: `.accordion__item` → `@apply relative` (the separator's containing
    // block).
    // R-010: `border-style: none` is deleted: a View has no UA border to reset.
    item: "relative",
    // R-023: `.accordion__panel` → `opacity: 0`; the expanded `opacity: 1` is a
    // `classList` entry (R-029) in `accordion-panel.tsx`.
    // R-027: the transition's opacity half → `transition: opacity 200ms
    // ease-out` + `motion-reduce:transition-none`. The height half (R-026) is
    // the base panel's native reveal, registered in §8.
    // R-024 / R-025: `height: var(--disclosure-panel-height)` and
    // `overflow: clip` become the base `AccordionPanel`'s `reveal`, which
    // clips the content and springs its height (structural rewrite).
    // R-028: `will-change: height, opacity` is deleted: NSH has no
    // `will-change`, and it is a performance hint.
    panel:
      "opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none",
    // R-014: `.accordion__trigger`'s `cursor: var(--cursor-interactive)` →
    // `cursor-pointer`.
    // R-015: `.accordion__trigger` → `@apply flex flex-1 items-center
    // justify-between px-4 py-4 text-start text-sm font-medium`; `no-highlight`
    // is deleted (R-016, web-only tap highlight).
    // R-022: `:disabled, [aria-disabled="true"]` → `status-disabled` as
    // variants over the View's own `disabled` state (opacity .5, cursor
    // not-allowed). The `pointer-events: none` half is the host's own refusal
    // of presses on a disabled view.
    // R-017 is the inline transition property list in
    // `accordion-trigger.tsx`: only opacity and box-shadow transition, so a
    // plain `transition` (which would also fade the hover background) is wrong.
    // R-018 (the default hover background) and R-031 (the surface one) are
    // `classList` entries there, because they also need "not expanded".
    // R-019: the `@media (hover: hover)` wrapper is deleted; NSH reports hover
    // only where a pointer exists (desktop and the web).
    // R-020: the empty `[data-pressed="true"]` block is deleted: it declares
    // nothing.
    // R-021: the focus ring is a `classList` entry in `accordion-trigger.tsx`.
    // R-034 / R-035: the surface first / last trigger radii are computed there,
    // from the Item's registered position.
    trigger:
      "flex flex-1 items-center justify-between px-4 py-4 text-start text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
  },
  variants: {
    variant: {
      // R-001: the default variant adds nothing beyond the base slot.
      default: {},
      // R-030: `.accordion--surface` → `@apply bg-surface` plus
      // `border-radius: min(32px, var(--radius-3xl))`; the theme's `3xl` is 24,
      // so `min(32, 24)` is the theme's own `rounded-3xl`.
      surface: {
        base: "bg-surface rounded-3xl",
      },
    },
  },
});

export type AccordionVariants = VariantProps<typeof accordionVariants>;
