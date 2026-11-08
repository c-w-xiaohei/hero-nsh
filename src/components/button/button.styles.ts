import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

/*
 * Button variant table (HeroUI 3.2.7, packages/styles/components/button.css).
 * Each class string is the NSH translation of the CSS rule named to its right.
 */
export const buttonVariants = tv({
  // R-001 base; R-002 duration/easing (the property list is the inline
  // transitionProperty in button-root.tsx); R-003 cursor; R-004 default
  // background; R-007 disabled look; R-009 pressed transform.
  base: [
    "relative inline-flex h-10 w-fit shrink origin-center items-center justify-center gap-2 rounded-3xl px-4 text-sm font-medium whitespace-nowrap outline-none select-none md:h-9",
    "duration-[250ms] ease-smooth cursor-pointer bg-transparent",
    "active:scale-[0.97]",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  ].join(" "),
  variants: {
    // R-012, R-013; R-015; R-016, R-017. Declared before isIconOnly so that
    // R-026's p-0 comes later in the class string than R-012's px-3.
    size: {
      sm: "h-9 px-3 md:h-8 active:scale-[0.98]",
      md: "",
      lg: "h-11 text-base md:h-10 active:scale-[0.96]",
    },
    // R-018 … R-025. The CSS custom properties disappear; every variant names
    // its background, foreground and hover / pressed backgrounds directly.
    variant: {
      // R-018
      primary: "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-hover",
      // R-019
      secondary:
        "bg-default text-accent-soft-foreground hover:bg-default-hover active:bg-default-hover",
      // R-020: no foreground class, so the text stays the inherited currentColor.
      tertiary: "bg-default hover:bg-default-hover active:bg-default-hover",
      // R-021
      ghost: "bg-transparent text-default-foreground hover:bg-default active:bg-default",
      // R-021 background / foreground; R-022 borders are written per logical
      // side; R-023 mixes the hover background the same 60% as the CSS
      // color-mix().
      outline:
        "bg-transparent text-default-foreground border-t border-b border-s border-e border-border hover:bg-default/60 active:bg-default",
      // R-024
      danger: "bg-danger text-danger-foreground hover:bg-danger-hover active:bg-danger-hover",
      // R-025
      "danger-soft":
        "bg-danger-soft text-danger-soft-foreground hover:bg-danger-soft-hover active:bg-danger-soft-hover",
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
    // R-029: `.button--full-width` is written after the icon-only rules.
    { fullWidth: true, isIconOnly: true, class: "w-full" },
  ],
  defaultVariants: {
    fullWidth: false,
    isIconOnly: false,
    size: "md",
    variant: "primary",
  },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export type ButtonVariant = NonNullable<ButtonVariants["variant"]>;

export type ButtonSize = NonNullable<ButtonVariants["size"]>;
