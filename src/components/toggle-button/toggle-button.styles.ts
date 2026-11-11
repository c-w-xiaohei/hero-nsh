import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

import { ease } from "../../tokens/geometry";

/*
 * ToggleButton variant table (HeroUI 3.2.7,
 * packages/styles/components/toggle-button.css). Each class string is the NSH
 * translation of the CSS rule named to its right; the rule ids are written out
 * one by one so the gate can find them.
 */
export const toggleButtonVariants = tv({
  base: [
    // R-001: `.toggle-button` base box. `w-fit` writes out the width an
    // inline-flex box shrinks to on the web; `shrink` restores CSS's default
    // flex-shrink of 1, which NSH sets to 0.
    // R-002: `isolate` and `no-highlight` are dropped: NSH has no stacking
    // context and no web tap highlight.
    // R-015, R-017: the `& svg` descendant selector cannot be expressed, so no
    // icon size is imposed here; an icon carries its own classes (port sheet
    // §8). `size="sm"` icons use `size-4`, `md` / `lg` use `size-5 sm:size-4`.
    "relative flex h-10 w-fit shrink origin-center items-center justify-center gap-2 rounded-3xl px-4 text-sm font-medium whitespace-nowrap outline-none select-none md:h-9",
    // R-003: one duration and one curve (the property list is the inline
    // `transitionProperty` in toggle-button-root.tsx).
    `duration-[250ms] ${ease.smooth} motion-reduce:transition-none`,
    // R-004: `cursor: var(--cursor-interactive)`, written as the literal class
    // because the theme has no cursor token.
    "cursor-pointer",
    // R-005, R-006, R-007: the four `--toggle-button-*` custom properties
    // disappear (R-005 / R-006 below), the background defaults to
    // `var(--default)` and the foreground stays `currentColor`.
    "bg-default",
    // R-009: `@apply status-disabled` → opacity .5, not-allowed cursor, no
    // pointer events. Literal values: the theme has no such variables.
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    // R-011: the held pointer scales and darkens.
    "active:bg-default-hover active:scale-[0.97]",
    // R-006, R-012: `--toggle-button-bg-selected` / `-fg-selected` become the
    // ARIA state. A member writes only `pressed` (button) or `checked`
    // (radio), so one group of classes covers both modes and the other never
    // matches.
    "aria-pressed:bg-accent-soft aria-pressed:text-accent-soft-foreground aria-checked:bg-accent-soft aria-checked:text-accent-soft-foreground",
    // R-013: the selected hover background. Compound variants sort after the
    // single-state one, so it wins over R-012.
    "aria-pressed:hover:bg-accent-soft-hover aria-checked:hover:bg-accent-soft-hover",
    // R-014: the selected pressed background; `active:` is a lower-ranked
    // variant than `aria-pressed:` / `aria-checked:`, so the pair wins.
    "aria-pressed:active:bg-accent-soft-hover aria-checked:active:bg-accent-soft-hover",
  ].join(" "),
  variants: {
    // R-016, R-018; R-019; R-020, R-021. Declared before `isIconOnly` so that
    // R-024's `p-0` comes later in the class string than a size's padding.
    size: {
      sm: "h-9 px-3 md:h-8 active:scale-[0.98]",
      md: "",
      lg: "h-11 text-base md:h-10 active:scale-[0.96]",
    },
    // R-022, R-023: the CSS custom properties disappear; each variant names
    // its background, foreground and hover / pressed backgrounds directly.
    // R-010: the hover declaration of each variant is `hover:bg-default-hover`
    // (default) / `hover:bg-default` (ghost).
    variant: {
      default: "bg-default hover:bg-default-hover active:bg-default-hover",
      ghost: "bg-transparent text-default-foreground hover:bg-default active:bg-default",
    },
    // R-024. After size so `p-0` beats `px-4` / `px-3`.
    isIconOnly: {
      true: "w-10 p-0 md:w-9",
    },
  },
  compoundVariants: [
    // R-025
    { isIconOnly: true, size: "sm", class: "w-9 md:w-8" },
    // R-026
    { isIconOnly: true, size: "lg", class: "w-11 md:w-10" },
  ],
  defaultVariants: {
    isIconOnly: false,
    size: "md",
    variant: "default",
  },
});

export type ToggleButtonVariants = VariantProps<typeof toggleButtonVariants>;

export type ToggleButtonSize = NonNullable<ToggleButtonVariants["size"]>;

export type ToggleButtonVariant = NonNullable<ToggleButtonVariants["variant"]>;
