import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Toast's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/toast/toast.styles.ts` plus every declaration
 * of `packages/styles/components/toast.css` that survives NSH's CSS model.
 *
 * Upstream's `tv()` only emits BEM block/element names; the stylesheet carries
 * the declarations. NSH has no BEM CSS (research D18), so each rule of port
 * sheet §4 is expanded here into the classes it applied:
 *
 * - `region`, `toast`, `content`, `indicator`, `title`, `description`,
 *   `action`, `close` are the eight blocks that end up on a view;
 * - `placement` writes the region's corner and the toast's stacking side;
 * - `variant` writes the title's (and, for the three status variants, the
 *   indicator's) foreground colour. `accent` deliberately has no indicator
 *   rule, exactly as the stylesheet (port sheet §4 note under R-054).
 *
 * The five stacking numbers upstream keeps in CSS custom properties
 * (`--offset-collapsed`, `--offset-expanded`, `--scale-collapsed`,
 * `--front-height`, `--toast-height`) are computed as numbers in
 * `toast-root.tsx`, because NSH's `style` has no custom-property channel
 * (port sheet §4 R-015 … R-031).
 */
export const toastVariants = tv({
  slots: {
    // R-001: `.toast-region` → `pointer-events-none fixed outline-none`. A
    // `fixed` view draws above the root view's children, which is what the
    // missing z-index below stands in for.
    // R-002: `.toast-region` → `w-[calc(100vw-2rem)] sm:w-auto`. NSH has no
    // `calc()` length, so the width below `sm` is a number computed from
    // `windowSize()` and written inline; only `sm:w-auto` stays a class.
    // R-004: `.toast-region` → `display: block`.
    // R-012: `.toast-region:focus-visible` → `outline-2 outline-offset-2
    // outline-focus`; NSH's `focus:` is already the keyboard-focus ring.
    region:
      "pointer-events-none fixed outline-none block sm:w-auto focus:outline-2 focus:outline-offset-2 focus:outline-focus",

    // R-013: `.toast` → `absolute start-0 end-0`.
    // R-014: `.toast` → `border-radius: min(32px, var(--radius-3xl))`; this
    // theme's 3xl is 24, so `rounded-3xl` matches (port sheet §8).
    // R-016: `.toast` → `pointer-events-auto grid
    // grid-cols-[auto_minmax(0,1fr)] items-start justify-start gap-x-1.5
    // gap-y-2 bg-surface px-4 py-3`.
    // R-017: `.toast` → `shadow-overlay`; shadows cannot switch with the
    // appearance, so the dark pair is written next to it.
    // R-018: `.toast` → `sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-y-0`.
    // R-019: the timing block → one transition over transform, height and
    // opacity at 350ms with the fluid curve, off under reduced motion. NSH has
    // no arbitrary transition property list (`transition-[…]` is unsupported),
    // so `transitionProperty` and the per-state duration are written inline by
    // `toast-root.tsx`; the curve stays here. NSH gives an element one
    // duration, so the 150ms opacity half is registered in §8.
    // R-033: `.toast:focus-visible` → `outline-2 outline-offset-2 outline-focus`.
    toast:
      "absolute start-0 end-0 rounded-3xl pointer-events-auto grid grid-cols-[auto_minmax(0,1fr)] items-start justify-start gap-x-1.5 gap-y-2 bg-surface px-4 py-3 shadow-overlay dark:shadow-overlay-dark sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-y-0 ease-out-fluid focus:outline-2 focus:outline-offset-2 focus:outline-focus",

    // R-023: `.toast > :not([data-slot="toast-close"])` → `transition: opacity
    // 200ms`; the descendant selector becomes the same three classes on the
    // content, indicator and action slots.
    // R-034: `.toast__content` → `col-start-2 row-start-1 flex min-w-0
    // flex-col items-start self-center`.
    content:
      "col-start-2 row-start-1 flex min-w-0 flex-col items-start self-center transition-opacity duration-200 ease-out-fluid motion-reduce:transition-none",

    // R-035: `.toast__indicator` → `col-start-1 row-start-1 flex shrink-0
    // items-center justify-center p-1 text-overlay-foreground select-none`.
    // R-023 again for the indicator slot.
    // R-039: the swapped-icon keyframes become a transition pair on the
    // indicator's child; the class pair is applied by the indicator itself.
    indicator:
      "col-start-1 row-start-1 flex shrink-0 items-center justify-center p-1 text-overlay-foreground select-none transition-opacity duration-200 ease-out-fluid motion-reduce:transition-none",

    // R-040: `.toast__title` → `text-sm leading-5 font-medium
    // text-overlay-foreground`.
    title: "text-sm leading-5 font-medium text-overlay-foreground",

    // R-041: `.toast__description` → `text-sm text-muted`.
    description: "text-sm text-muted",

    // R-048: `.toast__action` → `col-start-2 row-start-2 justify-self-start
    // sm:col-start-3 sm:row-start-1`.
    // R-023 again for the action slot.
    action:
      "col-start-2 row-start-2 justify-self-start sm:col-start-3 sm:row-start-1 transition-opacity duration-200 ease-out-fluid motion-reduce:transition-none",

    // R-042: `.toast__close-button` → `pointer-events-none absolute -end-1
    // -top-1 size-5 border-border bg-default opacity-0 sm:border sm:bg-overlay`;
    // `p-0` and `size-5` restate the CloseButton's own base so the toast's box
    // wins.
    // R-043: the 150ms opacity transition with the smooth curve, off under
    // reduced motion.
    // R-045: `@media (hover: hover) &:hover` → `hover:bg-default`.
    close:
      "pointer-events-none absolute -end-1 -top-1 size-5 p-0 border-border bg-default opacity-0 sm:border sm:bg-overlay transition-opacity duration-150 ease-smooth motion-reduce:transition-none hover:bg-default",
  },
  variants: {
    placement: {
      // R-006: `.toast-region--bottom` → `bottom-4 left-1/2 -translate-x-1/2`.
      // R-021: `.toast--bottom*` → `bottom: 0`, `transform-origin: bottom
      // center`; the `--dir: -1` half is a number in `toast-root.tsx`.
      bottom: {
        region: "bottom-4 left-1/2 -translate-x-1/2",
        toast: "bottom-0 origin-bottom",
      },
      // R-007: `.toast-region--bottom-start` → `start-4 bottom-4`.
      "bottom start": {
        region: "start-4 bottom-4",
        toast: "bottom-0 origin-bottom",
      },
      // R-008: `.toast-region--bottom-end` → `end-4 bottom-4`.
      "bottom end": {
        region: "end-4 bottom-4",
        toast: "bottom-0 origin-bottom",
      },
      // R-009: `.toast-region--top` → `top-4 left-1/2 -translate-x-1/2`.
      // R-021: `.toast--top*` → `top: 0`, `transform-origin: top center`
      // (`--dir: 1` in `toast-root.tsx`).
      top: {
        region: "top-4 left-1/2 -translate-x-1/2",
        toast: "top-0 origin-top",
      },
      // R-010: `.toast-region--top-start` → `start-4 top-4`.
      "top start": {
        region: "start-4 top-4",
        toast: "top-0 origin-top",
      },
      // R-011: `.toast-region--top-end` → `end-4 top-4`.
      "top end": {
        region: "end-4 top-4",
        toast: "top-0 origin-top",
      },
    },
    variant: {
      // `toast--default` writes no descendant rule upstream.
      default: {},
      // R-052: `.toast--accent .toast__title` → `text-accent-soft-foreground`.
      // The indicator keeps `overlay-foreground`, as upstream does.
      accent: {
        title: "text-accent-soft-foreground",
      },
      // R-053: `.toast--success .toast__title` → `text-success-soft-foreground`.
      // R-054: `.toast--success .toast__indicator` → the same colour. The
      // default icon is a Canvas and does not inherit it, so
      // `toast-indicator.tsx` writes the token a second time.
      success: {
        indicator: "text-success-soft-foreground",
        title: "text-success-soft-foreground",
      },
      // R-055: `.toast--warning .toast__title` → `text-warning-soft-foreground`.
      // R-056: `.toast--warning .toast__indicator` → the same colour.
      warning: {
        indicator: "text-warning-soft-foreground",
        title: "text-warning-soft-foreground",
      },
      // R-057: `.toast--danger .toast__title` → `text-danger-soft-foreground`.
      // R-058: `.toast--danger .toast__indicator` → the same colour.
      danger: {
        indicator: "text-danger-soft-foreground",
        title: "text-danger-soft-foreground",
      },
    },
  },
  defaultVariants: {
    placement: "bottom",
    variant: "default",
  },
});

export type ToastVariants = VariantProps<typeof toastVariants>;

/*
 * Where the rules this table does not own are realized, so the sheet's ids
 * stay traceable from the styles file:
 *
 * - R-005 (region z-index): deleted. A `fixed` view already draws above the
 *   root view's children, and HeroUI's 100001 has no token here (port sheet §8:
 *   a later Dialog covers the toast).
 * - R-026 (close button hidden while the content is hidden or the toast is
 *   exiting) and R-047 (exiting always hides it): `toast-close-button.tsx`,
 *   through `ToastItemContext.contentHidden` / `isExiting`.
 * - R-036 / R-037 / R-038 (default icon and spinner sizes): structural, in
 *   `toast-indicator.tsx` — the icons carry `h-4 w-4` and the spinner's `sm`
 *   is 16 points.
 * - R-039 / R-059 / R-060 (indicator swap animation): structural, the two
 *   transitions on the indicator's child in `toast-indicator.tsx`.
 * - R-044 (close icon size): deleted; `CloseButton` fixes its own icon size
 *   (port sheet §8).
 * - R-046 (reveal the close button on hover): `group-hover:` classes on the
 *   close slot, applied by `toast-close-button.tsx` from the item context.
 * - R-050 / R-051 (single-track grid without an indicator): the content and
 *   action slots append `col-start-1` / `sm:col-start-2` in their own files
 *   when `hasIndicator()` is false.
 * - R-061 (iOS Safari fixed-box workaround): deleted; NSH's fixed view is laid
 *   out by the host, not by the iOS toolbar's plate rule.
 */
