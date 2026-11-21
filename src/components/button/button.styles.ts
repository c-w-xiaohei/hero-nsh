import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

import { ease } from "../../tokens/geometry";

/*
 * Button variant table (HeroUI 3.2.7, packages/styles/components/button.css).
 * Each class string is the NSH translation of the CSS rule named to its right.
 */
export const buttonVariants = tv({
  // R-001 base; R-002 duration/easing (the property list is the inline
  // transitionProperty in button-root.tsx); R-003 cursor; R-004 default
  // background; R-007 disabled look. A-001: `overflow-hidden` clips the
  // press-feedback overlays the touch environment mounts (upstream's
  // pressable-feedback.css root rule); R-009's `active:scale-[0.97]` moves
  // into the `input: "pointer"` compound below — on touch the `scale`
  // AnimatedValue owns the transform and two writers may not share it.
  base: [
    "relative inline-flex h-10 w-fit shrink origin-center items-center justify-center gap-2 overflow-hidden rounded-3xl px-4 text-sm font-medium whitespace-nowrap outline-none select-none md:h-9",
    `duration-[250ms] ${ease.smooth} cursor-pointer bg-transparent`,
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  ].join(" "),
  variants: {
    // R-012, R-013; R-015; R-016, R-017. Declared before isIconOnly so that
    // R-026's p-0 comes later in the class string than R-012's px-3. A-001:
    // each size's `active:scale-*` moves into the `input: "pointer"`
    // compound below for the same two-writers reason as the base's.
    size: {
      sm: "h-9 px-3 md:h-8",
      md: "",
      lg: "h-11 text-base md:h-10",
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
    // R-018 … R-025. The CSS custom properties disappear; every variant names
    // its background and foreground directly. A-001: the `hover:`/`active:`
    // backgrounds move into the `input: "pointer"` compound below — the
    // touch press visual is the feedback seam's scale + overlay, not a
    // second background writer.
    variant: {
      // R-018
      primary: "bg-accent text-accent-foreground",
      // R-019
      secondary: "bg-default text-accent-soft-foreground",
      // R-020: upstream keeps the inherited currentColor; an NSH Text defaults to
      // black, so the foreground is written out to match the document colour.
      tertiary: "bg-default text-foreground",
      // R-021
      ghost: "bg-transparent text-default-foreground",
      // R-021 background / foreground; R-022 borders are written per logical
      // side; R-023 mixes the hover background the same 60% as the CSS
      // color-mix().
      outline:
        "bg-transparent text-default-foreground border-t border-b border-s border-e border-border",
      // R-024
      danger: "bg-danger text-danger-foreground",
      // R-025
      "danger-soft": "bg-danger-soft text-danger-soft-foreground",
    },
    // R-026. After size so p-0 wins over a size's horizontal padding.
    isIconOnly: {
      true: "w-10 p-0 md:w-9",
    },
    // R-029. After isIconOnly so a full-width button wins on width; the
    // compound below restores it over the icon-only widths of R-027 / R-028.
    fullWidth: {
      false: "",
      true: "w-full",
    },
  },
  compoundVariants: [
    // R-027
    { isIconOnly: true, size: "sm", class: "w-9 md:w-8" },
    // R-028
    { isIconOnly: true, size: "lg", class: "w-11 md:w-10" },

    // A-001 — pointer cell: the pseudo-state classes the base, size and
    // variant cells carried before the `input` axis existed. Under `input`
    // "pointer" the output is unchanged: `active:` sits after the base
    // `bg-*`, a size's deeper scale follows the base's shallower one, and
    // the variant's `hover:`/`active:` pair lands on its variant cell.
    { input: "pointer", class: "active:scale-[0.97]" },
    { input: "pointer", size: "sm", class: "active:scale-[0.98]" },
    { input: "pointer", size: "lg", class: "active:scale-[0.96]" },
    {
      input: "pointer",
      variant: "primary",
      class: "hover:bg-accent-hover active:bg-accent-hover",
    },
    {
      input: "pointer",
      variant: "secondary",
      class: "hover:bg-default-hover active:bg-default-hover",
    },
    {
      input: "pointer",
      variant: "tertiary",
      class: "hover:bg-default-hover active:bg-default-hover",
    },
    {
      input: "pointer",
      variant: "ghost",
      class: "hover:bg-default active:bg-default",
    },
    {
      input: "pointer",
      variant: "outline",
      class: "hover:bg-default/60 active:bg-default",
    },
    {
      input: "pointer",
      variant: "danger",
      class: "hover:bg-danger-hover active:bg-danger-hover",
    },
    {
      input: "pointer",
      variant: "danger-soft",
      class: "hover:bg-danger-soft-hover active:bg-danger-soft-hover",
    },

    // A-001 — touch cell: the upstream touch sizes
    // (`N/styles/components/button.css` sm 40 / md 48 / lg 56 pt), the
    // icon-only widths squaring them (upstream's `aspect-ratio: 1`), each
    // written with `md:` so the `md:` heights and widths of the default
    // cells cannot win their layer.
    { input: "touch", size: "sm", class: "h-10 md:h-10" },
    { input: "touch", size: "md", class: "h-12 md:h-12" },
    { input: "touch", size: "lg", class: "h-14 md:h-14" },
    { input: "touch", isIconOnly: true, class: "w-12 md:w-12" },
    { input: "touch", isIconOnly: true, size: "sm", class: "w-10 md:w-10" },
    { input: "touch", isIconOnly: true, size: "lg", class: "w-14 md:w-14" },

    // R-029: `.button--full-width` is written after the icon-only rules —
    // and now after the touch icon-only widths too, so a full-width
    // icon-only button still fills its row in either environment.
    { fullWidth: true, isIconOnly: true, class: "w-full" },
  ],
  defaultVariants: {
    fullWidth: false,
    isIconOnly: false,
    // A-001: callers that never learned the axis still get the pointer cell,
    // byte for byte what the table produced before it existed.
    input: "pointer",
    size: "md",
    variant: "primary",
  },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export type ButtonVariant = NonNullable<ButtonVariants["variant"]>;

export type ButtonSize = NonNullable<ButtonVariants["size"]>;
