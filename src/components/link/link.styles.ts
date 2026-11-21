import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

/*
 * Link variant table (HeroUI 3.2.7, packages/styles/src/components/link/
 * link.styles.ts plus the declarations of packages/styles/components/link.css).
 *
 * HeroUI's table has two slots whose values are BEM hooks (`link` /
 * `link__icon`); the declarations live in CSS. NSH has no BEM class names
 * (D18), so each slot carries the declarations its selector applied. The table
 * keeps `tv({ slots })` so it is still the same two-slot shape.
 */
export const linkVariants = tv({
  slots: {
    /*
     * R-001: `.link` → `relative inline-flex h-fit w-fit items-center
     * rounded-xl font-medium text-link no-underline decoration-separator-tertiary
     * decoration-[1.5px] underline-offset-4`. `inline-flex` keeps HeroUI's own
     * token and becomes a row with content-based sizing (NSH has no inline
     * layout context, so a flex parent computes it as a block); `h-fit` /
     * `w-fit` write out the shrink-to-content box the inline element had.
     * R-002: `.link` → `transition: color 100ms, background-color 150ms,
     * box-shadow 150ms, opacity 100ms`. NSH takes one list, one duration and
     * one curve, so `duration-150 ease-smooth` live here and the property list
     * is the inline `transitionProperty` in link-root.tsx.
     * R-004: `.link` → `cursor: var(--cursor-interactive)` → `cursor-pointer`.
     * R-005: `no-highlight` (`-webkit-tap-highlight-color: transparent`) is
     * deleted: it is web-only and has no NSH counterpart.
     * R-006: `@media (hover: hover) { .link:hover }` → `underline
     * decoration-muted/50`; the `hover:` variant is pointer-only, as the media
     * query was, so it lives in the `input: "pointer"` cell below (A-001) —
     * under `touch` it cannot linger as a sticky hover. `group` marks the
     * root for its icon (R-007 / R-009) and moves with it.
     * R-008: `.link:active` → `underline decoration-muted`; `active:` comes
     * after `hover:` in NSH's fixed variant order (twref: variant order, not
     * class order, decides), so a press wins over the hover decoration in
     * both cells and `active:` / `disabled:` stay in the base for both.
     * R-012: `.link[aria-disabled="true"]` → `status-disabled`, i.e.
     * `opacity-50 cursor-not-allowed pointer-events-none` (the sheet fixes the
     * disabled opacity at the non-token literal 0.5). `disabled:` also comes
     * after `hover:` / `active:`, so no underline appears while disabled.
     */
    base: [
      "relative inline-flex h-fit w-fit items-center rounded-xl font-medium text-link no-underline decoration-separator-tertiary decoration-[1.5px] underline-offset-4",
      // `ease.smooth` (`ease-[cubic-bezier(0.25,0.1,0.25,1)]`,
      // `src/tokens/geometry.ts`) written out: a `.styles.ts` imports only
      // `tailwind-variants` — the M2 class walker loads this file with plain
      // Node, which cannot resolve an extensionless `.ts` import.
      "cursor-pointer duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
      "active:underline active:decoration-muted",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:no-underline",
    ].join(" "),
    /*
     * R-013: `.link__icon` → `pointer-events-none inline-flex size-[0.75em]
     * shrink-0 items-center justify-center text-current opacity-60`. NSH
     * arbitrary lengths have no `em`; the default font size is 16 pt, so
     * `0.75em` is 12 pt and the box is written as `h-[12px] w-[12px]` (sheet
     * §8 registers that a caller's `text-sm` no longer shrinks it).
     * `text-current` is not an NSH color value and is dropped: text color
     * already inherits.
     * R-014: `.link__icon` → `transition: opacity 150ms var(--ease-out)` plus
     * `motion-reduce:transition-none`.
     * R-007 / R-009: the parent's hover and press raise the icon to full
     * opacity through `group-hover:` / `group-active:` in the `input:
     * "pointer"` cell below (A-001 — same pointer-only gating as R-006), which
     * follow the plain `opacity-60` in the variant order. Focus uses the
     * context instead (R-011 in link-icon.tsx).
     * R-015: `.link__icon svg { transform-gpu }` is deleted: `transform-gpu`
     * is an accepted no-op hint in NSH and the default icon is a Canvas, not
     * an svg descendant.
     * R-017: `.link.button { gap-0 no-underline }` is deleted: NSH class
     * strings cannot select "also has `.button`". `no-underline` is already in
     * the base; HeroUI's own story writes `gap-0` at the call site, and so must
     * a caller (sheet §8).
     * R-018: the slot values `"link"` / `"link__icon"` themselves are deleted:
     * BEM class names are not ported (D18); their declarations are R-001 /
     * R-013 above, inside the same `tv({ slots })` structure.
     */
    icon: [
      "pointer-events-none inline-flex h-[12px] w-[12px] shrink-0 items-center justify-center",
      "opacity-60 transition-opacity duration-150 ease-out motion-reduce:transition-none",
    ].join(" "),
  },
  variants: {
    // A-001: the hover/group pair is the `input` axis's only content. Under
    // `touch` the root keeps `active:` / `disabled:` from the base and drops
    // `group` plus every `hover:` class, so a touch press leaves no sticky
    // hover; the visible box stays `h-fit w-fit` — the touch hit area is
    // A-003's `hitSlop`, not a minimum row height (sheet §2, action-list
    // §5.2). `pointer` is byte-identical to the pre-axis output: variant
    // order, not class order, decides `hover:` < `active:` (twref §51).
    input: {
      pointer: {
        base: [
          "group",
          "hover:underline hover:decoration-muted/50",
        ].join(" "),
        icon: "group-hover:opacity-100 group-active:opacity-100",
      },
      touch: {},
    },
  },
});

/** Upstream's table has no variant dimensions, so this is an empty object. */
export type LinkVariants = VariantProps<typeof linkVariants>;
