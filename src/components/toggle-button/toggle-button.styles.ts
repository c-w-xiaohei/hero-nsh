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
    // R-011: the held pointer scales and darkens. A-001: it moves into the
    // `input: "pointer"` compound below — on touch the press-feedback seam's
    // `scale` AnimatedValue owns the transform and two writers may not share
    // it, and a web touch press would otherwise pin the active background.
    // R-006, R-012: `--toggle-button-bg-selected` / `-fg-selected` become the
    // ARIA state. A member writes only `pressed` (button) or `checked`
    // (radio), so one group of classes covers both modes and the other never
    // matches.
    "aria-pressed:bg-accent-soft aria-pressed:text-accent-soft-foreground aria-checked:bg-accent-soft aria-checked:text-accent-soft-foreground",
  ].join(" "),
  variants: {
    // R-016, R-018; R-019; R-020, R-021. Declared before `isIconOnly` so that
    // R-024's `p-0` comes later in the class string than a size's padding.
    // A-001: each size's `active:scale-*` moves into the `input: "pointer"`
    // compound below for the same two-writers reason as the base's.
    size: {
      sm: "h-9 px-3 md:h-8",
      md: "",
      lg: "h-11 text-base md:h-10",
    },
    // R-022, R-023: the CSS custom properties disappear; each variant names
    // its background, foreground and hover / pressed backgrounds directly.
    // A-001: the `hover:`/`active:` pairs move into `input: "pointer"`
    // compounds — the touch press visual is the feedback seam's scale, not a
    // second background writer (upstream styles them on `@media (hover:
    // hover)`, so a touch host never showed them anyway).
    variant: {
      default: "bg-default",
      ghost: "bg-transparent text-default-foreground",
    },
    // R-024. After size so `p-0` beats `px-4` / `px-3`.
    isIconOnly: {
      true: "w-10 p-0 md:w-9",
    },
    // A-001: the `input` axis of the encapsulation model. Both cells are
    // empty — the environment-specific classes are compounds — but the axis
    // must exist for the compounds to match. `pointer` keeps every
    // `hover:`/`active:` pseudo-class it always had (a touch host has no
    // hover, and on web the sticky-hover residue would otherwise pin the
    // hover background after a press); `touch` gains only real geometry —
    // the upstream touch sizes and their icon-only widths.
    input: {
      pointer: "",
      touch: "",
    },
  },
  compoundVariants: [
    // R-025
    { isIconOnly: true, size: "sm", class: "w-9 md:w-8" },
    // R-026
    { isIconOnly: true, size: "lg", class: "w-11 md:w-10" },

    // A-001 — pointer cell: the pseudo-state classes the base, size and
    // variant cells carried before the `input` axis existed, in the same
    // order they appeared: base (R-011), the selected hover/pressed pair
    // (R-013/R-014 — after the single-state `aria-*` so they still win),
    // the size scales, then each variant's `hover:`/`active:` pair.
    { input: "pointer", class: "active:bg-default-hover active:scale-[0.97]" },
    {
      input: "pointer",
      class:
        "aria-pressed:hover:bg-accent-soft-hover aria-checked:hover:bg-accent-soft-hover",
    },
    {
      input: "pointer",
      class:
        "aria-pressed:active:bg-accent-soft-hover aria-checked:active:bg-accent-soft-hover",
    },
    { input: "pointer", size: "sm", class: "active:scale-[0.98]" },
    { input: "pointer", size: "lg", class: "active:scale-[0.96]" },
    {
      input: "pointer",
      variant: "default",
      class: "hover:bg-default-hover active:bg-default-hover",
    },
    {
      input: "pointer",
      variant: "ghost",
      class: "hover:bg-default active:bg-default",
    },

    // A-001 — touch cell: the upstream touch sizes (sm 40 / md 48 / lg 56 pt,
    // the same mapping the button unit verified), the icon-only widths
    // squaring them (upstream's `aspect-ratio: 1`), each written with `md:`
    // so the `md:` heights and widths of the default cells cannot win their
    // layer. A touch class string carries no `hover:`/`active:` classes at
    // all — the seam's scale owns the press visual.
    { input: "touch", size: "sm", class: "h-10 md:h-10" },
    { input: "touch", size: "md", class: "h-12 md:h-12" },
    { input: "touch", size: "lg", class: "h-14 md:h-14" },
    { input: "touch", isIconOnly: true, class: "w-12 md:w-12" },
    { input: "touch", isIconOnly: true, size: "sm", class: "w-10 md:w-10" },
    { input: "touch", isIconOnly: true, size: "lg", class: "w-14 md:w-14" },
  ],
  defaultVariants: {
    isIconOnly: false,
    // A-001: callers that never learned the axis still get the pointer cell,
    // what the table produced before it existed.
    input: "pointer",
    size: "md",
    variant: "default",
  },
});

export type ToggleButtonVariants = VariantProps<typeof toggleButtonVariants>;

export type ToggleButtonSize = NonNullable<ToggleButtonVariants["size"]>;

export type ToggleButtonVariant = NonNullable<ToggleButtonVariants["variant"]>;
